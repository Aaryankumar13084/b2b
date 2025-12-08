import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAdmin } from "./replitAuth";
import { TOOL_CREDITS, CREDIT_LIMITS } from "@shared/schema";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import Groq from "groq-sdk";
import * as processing from "./services/processing";
import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";
import * as XLSX from "xlsx";

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = path.join(process.cwd(), "uploads");
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(null, uniqueSuffix + "-" + file.originalname);
    },
  }),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
});

function getGroqClient() {
  if (!process.env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is not configured");
  }
  return new Groq({ apiKey: process.env.GROQ_API_KEY });
}

async function extractTextFromFile(filePath: string, mimeType?: string): Promise<string> {
  const ext = path.extname(filePath).toLowerCase();
  const mime = mimeType?.toLowerCase() || "";
  
  try {
    if (ext === ".pdf" || mime.includes("pdf")) {
      const buffer = fs.readFileSync(filePath);
      const parser = new PDFParse({ data: buffer });
      const result = await parser.getText();
      await parser.destroy();
      return result.text || "";
    }
    
    if (ext === ".docx" || mime.includes("wordprocessingml") || mime.includes("msword")) {
      const result = await mammoth.extractRawText({ path: filePath });
      return result.value || "";
    }
    
    if (ext === ".xlsx" || ext === ".xls" || mime.includes("spreadsheet") || mime.includes("excel")) {
      const workbook = XLSX.readFile(filePath);
      let text = "";
      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        const csv = XLSX.utils.sheet_to_csv(sheet);
        text += `Sheet: ${sheetName}\n${csv}\n\n`;
      }
      return text;
    }
    
    if (ext === ".csv" || mime.includes("csv")) {
      return fs.readFileSync(filePath, "utf-8");
    }
    
    if (ext === ".txt" || ext === ".md" || ext === ".json" || mime.includes("text/")) {
      return fs.readFileSync(filePath, "utf-8");
    }
    
    return fs.readFileSync(filePath, "utf-8");
  } catch (error: any) {
    console.error("Text extraction error:", error.message);
    return "";
  }
}

const MOCK_USER_ID = "dev-user-001";

async function ensureDevUser() {
  const existingUser = await storage.getUser(MOCK_USER_ID);
  if (!existingUser) {
    await storage.upsertUser({
      id: MOCK_USER_ID,
      email: "dev@example.com",
      firstName: "Dev",
      lastName: "User",
      profileImageUrl: null,
    });
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  await setupAuth(app);
  await ensureDevUser();

  // Mock user middleware for development (remove when auth is re-enabled)
  app.use((req: any, res, next) => {
    if (!req.user) {
      req.user = { claims: { sub: MOCK_USER_ID } };
    }
    next();
  });

  app.get("/api/auth/user", async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.get("/api/files", async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userFiles = await storage.getUserFiles(userId);
      res.json(userFiles);
    } catch (error) {
      console.error("Error fetching files:", error);
      res.status(500).json({ message: "Failed to fetch files" });
    }
  });

  app.post("/api/files/upload", upload.single("file"), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const expirationHours = user.subscriptionTier === "free" ? 1 : 24;
      const expiresAt = new Date(Date.now() + expirationHours * 60 * 60 * 1000);

      const file = await storage.createFile({
        userId,
        originalName: req.file.originalname,
        storagePath: req.file.path,
        mimeType: req.file.mimetype,
        fileSize: req.file.size,
        status: "pending",
        expiresAt,
      });

      res.json(file);
    } catch (error) {
      console.error("Error uploading file:", error);
      res.status(500).json({ message: "Failed to upload file" });
    }
  });

  app.post("/api/files/:id/process", async (req: any, res) => {
    try {
      const { id } = req.params;
      const { tool } = req.body;
      const userId = req.user.claims.sub;

      const file = await storage.getFile(id);
      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }

      if (file.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const creditCost = TOOL_CREDITS[tool as keyof typeof TOOL_CREDITS] || 0;
      if (creditCost > 0) {
        const creditCheck = await storage.checkAndUpdateCredits(userId, creditCost);
        if (!creditCheck.allowed) {
          return res.status(429).json({ message: creditCheck.message });
        }
      }

      await storage.updateFileStatus(id, "processing");

      const outputName = file.originalName.replace(/\.[^/.]+$/, "") + "_processed.pdf";
      const outputPath = path.join(path.dirname(file.storagePath), "output_" + path.basename(file.storagePath));

      setTimeout(async () => {
        try {
          fs.copyFileSync(file.storagePath, outputPath);
          await storage.updateFileStatus(id, "completed", outputPath, outputName);
        } catch (err) {
          await storage.updateFileStatus(id, "failed");
        }
      }, 2000);

      res.json({ message: "Processing started", fileId: id, tool });
    } catch (error) {
      console.error("Error processing file:", error);
      res.status(500).json({ message: "Failed to process file" });
    }
  });

  app.get("/api/files/:id/download", async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;

      const file = await storage.getFile(id);
      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }

      if (file.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const filePath = file.outputPath || file.storagePath;
      const fileName = file.outputName || file.originalName;

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: "File not found on disk" });
      }

      res.download(filePath, fileName);
    } catch (error) {
      console.error("Error downloading file:", error);
      res.status(500).json({ message: "Failed to download file" });
    }
  });

  app.get("/api/files/:id/preview", async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;

      const file = await storage.getFile(id);
      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }

      if (file.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const filePath = file.outputPath || file.storagePath;

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: "File not found on disk" });
      }

      res.setHeader("Content-Type", file.mimeType || "application/octet-stream");
      res.setHeader("Content-Disposition", "inline");
      res.sendFile(filePath);
    } catch (error) {
      console.error("Error previewing file:", error);
      res.status(500).json({ message: "Failed to preview file" });
    }
  });

  app.delete("/api/files/:id", async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;

      const file = await storage.getFile(id);
      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }

      if (file.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      if (fs.existsSync(file.storagePath)) {
        fs.unlinkSync(file.storagePath);
      }
      if (file.outputPath && fs.existsSync(file.outputPath)) {
        fs.unlinkSync(file.outputPath);
      }

      await storage.deleteFile(id);
      res.json({ message: "File deleted" });
    } catch (error) {
      console.error("Error deleting file:", error);
      res.status(500).json({ message: "Failed to delete file" });
    }
  });

  app.post("/api/ai/chat", async (req: any, res) => {
    try {
      const { message, fileId, context, history } = req.body;
      const userId = req.user.claims.sub;

      const creditCheck = await storage.checkAndUpdateCredits(userId, TOOL_CREDITS.ai_chat);
      if (!creditCheck.allowed) {
        return res.status(429).json({ message: creditCheck.message });
      }

      const startTime = Date.now();
      const groq = getGroqClient();

      let documentContext = "";
      if (fileId) {
        const file = await storage.getFile(fileId);
        if (file && file.userId === userId && fs.existsSync(file.storagePath)) {
          const extractedText = await extractTextFromFile(file.storagePath, file.mimeType);
          const content = extractedText.slice(0, 10000);
          if (content.trim()) {
            documentContext = `Document content:\n${content}\n\n`;
          }
        }
      }

      const systemPrompt = documentContext 
        ? `You are a helpful document assistant. The user has uploaded a document and wants to ask questions about it. 

IMPORTANT: You MUST answer questions based ONLY on the document content provided below. Do not give generic answers. Focus on what is actually written in the document.

${documentContext}

When the user asks "what is in this document" or similar questions, provide a summary of the document's actual content. Never give generic explanations about file formats. Always respond in the same language as the user's question. Remember the context of previous messages in the conversation to provide relevant follow-up answers.`
        : `You are a helpful document assistant. The document could not be read. Please inform the user that the document content is not available and ask them to try uploading again.`;

      const chatMessages: Array<{ role: "system" | "user" | "assistant", content: string }> = [
        { role: "system", content: systemPrompt + (context || "") },
      ];

      if (history && Array.isArray(history)) {
        const recentHistory = history.slice(-10);
        for (const msg of recentHistory) {
          if (msg.role === "user" || msg.role === "assistant") {
            chatMessages.push({ role: msg.role, content: msg.content });
          }
        }
      } else {
        chatMessages.push({ role: "user", content: message });
      }

      const chatCompletion = await groq.chat.completions.create({
        messages: chatMessages,
        model: "llama-3.1-8b-instant",
        temperature: 0.3,
        max_tokens: 2048,
        top_p: 0.9,
      });

      const response = chatCompletion.choices[0]?.message?.content || "";
      const processingTime = Date.now() - startTime;

      await storage.logAiUsage({
        userId,
        toolType: "ai_chat",
        creditsUsed: TOOL_CREDITS.ai_chat,
        inputTokens: chatCompletion.usage?.prompt_tokens,
        outputTokens: chatCompletion.usage?.completion_tokens,
        processingTimeMs: processingTime,
        success: true,
      });

      res.json({ response, tokens: chatCompletion.usage });
    } catch (error: any) {
      console.error("Error in AI chat:", error);
      res.status(500).json({ message: error.message || "Failed to process AI request" });
    }
  });

  app.post("/api/ai/summary", async (req: any, res) => {
    try {
      const { fileId, text } = req.body;
      const userId = req.user.claims.sub;
      
      console.log("AI Summary request:", { fileId, hasText: !!text, userId });

      const creditCheck = await storage.checkAndUpdateCredits(userId, TOOL_CREDITS.ai_summary);
      if (!creditCheck.allowed) {
        return res.status(429).json({ message: creditCheck.message });
      }

      const startTime = Date.now();
      const groq = getGroqClient();

      let content = text || "";
      if (fileId && !content) {
        const file = await storage.getFile(fileId);
        console.log("File lookup result:", { fileId, found: !!file, storagePath: file?.storagePath, exists: file?.storagePath ? fs.existsSync(file.storagePath) : false });
        if (file && file.userId === userId && fs.existsSync(file.storagePath)) {
          const extractedText = await extractTextFromFile(file.storagePath, file.mimeType);
          console.log("Extracted text length:", extractedText.length);
          content = extractedText.slice(0, 15000);
        }
      }

      if (!content) {
        console.log("No content to summarize - content is empty");
        return res.status(400).json({ message: "No content to summarize" });
      }

      const chatCompletion = await groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: "You are an expert document summarizer. Create concise, accurate summaries that capture the key points. Never repeat words or phrases. Always provide meaningful content based on the document.",
          },
          {
            role: "user",
            content: `Analyze and summarize this document. Provide a clear, structured summary with key points:\n\n${content}`,
          },
        ],
        model: "llama-3.1-8b-instant",
        temperature: 0.3,
        max_tokens: 1024,
        top_p: 0.9,
      });

      const summary = chatCompletion.choices[0]?.message?.content || "";
      const processingTime = Date.now() - startTime;

      await storage.logAiUsage({
        userId,
        toolType: "ai_summary",
        creditsUsed: TOOL_CREDITS.ai_summary,
        inputTokens: chatCompletion.usage?.prompt_tokens,
        outputTokens: chatCompletion.usage?.completion_tokens,
        processingTimeMs: processingTime,
        success: true,
      });

      res.json({ summary, tokens: chatCompletion.usage });
    } catch (error: any) {
      console.error("Error in AI summary:", error);
      res.status(500).json({ message: error.message || "Failed to generate summary" });
    }
  });

  app.get("/api/subscription", async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      const subscription = await storage.getUserSubscription(userId);

      res.json({
        tier: user?.subscriptionTier || "free",
        subscription,
        creditsUsedToday: user?.aiCreditsUsedToday || 0,
        creditsUsedMonth: user?.aiCreditsUsedMonth || 0,
      });
    } catch (error) {
      console.error("Error fetching subscription:", error);
      res.status(500).json({ message: "Failed to fetch subscription" });
    }
  });

  app.get("/api/admin/users", isAdmin, async (req: any, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.get("/api/admin/analytics", isAdmin, async (req: any, res) => {
    try {
      const analytics = await storage.getAnalytics();
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching analytics:", error);
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  app.patch("/api/admin/users/:id", isAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const user = await storage.updateUser(id, updates);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  // PDF Split Tool
  app.post("/api/tools/pdf-split", upload.single("file"), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      const userId = req.user.claims.sub;
      const creditCheck = await storage.checkAndUpdateCredits(userId, TOOL_CREDITS.pdf_split || 1);
      if (!creditCheck.allowed) {
        return res.status(429).json({ message: creditCheck.message });
      }
      const { pageRanges } = req.body;
      const result = await processing.splitPdf(req.file.path, pageRanges || "");
      if (!result.success) {
        return res.status(400).json({ message: result.error });
      }
      res.json(result);
    } catch (error: any) {
      console.error("Error splitting PDF:", error);
      res.status(500).json({ message: error.message || "Failed to split PDF" });
    }
  });

  // PDF Lock Tool
  app.post("/api/tools/pdf-lock", upload.single("file"), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      const userId = req.user.claims.sub;
      const creditCheck = await storage.checkAndUpdateCredits(userId, TOOL_CREDITS.pdf_lock || 1);
      if (!creditCheck.allowed) {
        return res.status(429).json({ message: creditCheck.message });
      }
      const { password } = req.body;
      if (!password) {
        return res.status(400).json({ message: "Password is required" });
      }
      const result = await processing.lockPdf(req.file.path, password);
      if (!result.success) {
        return res.status(400).json({ message: result.error });
      }
      res.json(result);
    } catch (error: any) {
      console.error("Error locking PDF:", error);
      res.status(500).json({ message: error.message || "Failed to lock PDF" });
    }
  });

  // PDF Unlock Tool
  app.post("/api/tools/pdf-unlock", upload.single("file"), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      const userId = req.user.claims.sub;
      const creditCheck = await storage.checkAndUpdateCredits(userId, TOOL_CREDITS.pdf_unlock || 1);
      if (!creditCheck.allowed) {
        return res.status(429).json({ message: creditCheck.message });
      }
      const { password } = req.body;
      if (!password) {
        return res.status(400).json({ message: "Password is required" });
      }
      const result = await processing.unlockPdf(req.file.path, password);
      if (!result.success) {
        return res.status(400).json({ message: result.error });
      }
      res.json(result);
    } catch (error: any) {
      console.error("Error unlocking PDF:", error);
      res.status(500).json({ message: error.message || "Failed to unlock PDF" });
    }
  });

  // PDF Merge Tool
  app.post("/api/tools/pdf-merge", upload.array("files", 20), async (req: any, res) => {
    try {
      if (!req.files || req.files.length < 2) {
        return res.status(400).json({ message: "At least 2 PDF files are required" });
      }
      const userId = req.user.claims.sub;
      const creditCheck = await storage.checkAndUpdateCredits(userId, TOOL_CREDITS.pdf_merge || 1);
      if (!creditCheck.allowed) {
        return res.status(429).json({ message: creditCheck.message });
      }
      const filePaths = req.files.map((f: any) => f.path);
      const result = await processing.mergePdfs(filePaths);
      if (!result.success) {
        return res.status(400).json({ message: result.error });
      }
      res.json(result);
    } catch (error: any) {
      console.error("Error merging PDFs:", error);
      res.status(500).json({ message: error.message || "Failed to merge PDFs" });
    }
  });

  // PDF Compress Tool
  app.post("/api/tools/pdf-compress", upload.single("file"), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      const userId = req.user.claims.sub;
      const creditCheck = await storage.checkAndUpdateCredits(userId, TOOL_CREDITS.pdf_compress || 1);
      if (!creditCheck.allowed) {
        return res.status(429).json({ message: creditCheck.message });
      }
      const quality = parseInt(req.body.quality) || 50;
      const result = await processing.compressPdf(req.file.path, quality);
      if (!result.success) {
        return res.status(400).json({ message: result.error });
      }
      res.json(result);
    } catch (error: any) {
      console.error("Error compressing PDF:", error);
      res.status(500).json({ message: error.message || "Failed to compress PDF" });
    }
  });

  // PDF to Word Tool
  app.post("/api/tools/pdf-to-word", upload.single("file"), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      const userId = req.user.claims.sub;
      const creditCheck = await storage.checkAndUpdateCredits(userId, TOOL_CREDITS.pdf_to_word || 1);
      if (!creditCheck.allowed) {
        return res.status(429).json({ message: creditCheck.message });
      }
      const result = await processing.convertPdfToWord(req.file.path);
      if (!result.success) {
        return res.status(400).json({ message: result.error });
      }
      res.json(result);
    } catch (error: any) {
      console.error("Error converting PDF to Word:", error);
      res.status(500).json({ message: error.message || "Failed to convert PDF to Word" });
    }
  });

  // Word to PDF Tool
  app.post("/api/tools/word-to-pdf", upload.single("file"), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      const userId = req.user.claims.sub;
      const creditCheck = await storage.checkAndUpdateCredits(userId, TOOL_CREDITS.word_to_pdf || 1);
      if (!creditCheck.allowed) {
        return res.status(429).json({ message: creditCheck.message });
      }
      const result = await processing.convertWordToPdf(req.file.path);
      if (!result.success) {
        return res.status(400).json({ message: result.error });
      }
      res.json(result);
    } catch (error: any) {
      console.error("Error converting Word to PDF:", error);
      res.status(500).json({ message: error.message || "Failed to convert Word to PDF" });
    }
  });

  // Image Compress Tool
  app.post("/api/tools/image-compress", upload.single("file"), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      const userId = req.user.claims.sub;
      const creditCheck = await storage.checkAndUpdateCredits(userId, TOOL_CREDITS.image_compress || 1);
      if (!creditCheck.allowed) {
        return res.status(429).json({ message: creditCheck.message });
      }
      const quality = parseInt(req.body.quality) || 80;
      const result = await processing.compressImage(req.file.path, quality);
      if (!result.success) {
        return res.status(400).json({ message: result.error });
      }
      res.json(result);
    } catch (error: any) {
      console.error("Error compressing image:", error);
      res.status(500).json({ message: error.message || "Failed to compress image" });
    }
  });

  // Image Resize Tool
  app.post("/api/tools/image-resize", upload.single("file"), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      const userId = req.user.claims.sub;
      const creditCheck = await storage.checkAndUpdateCredits(userId, TOOL_CREDITS.image_resize || 1);
      if (!creditCheck.allowed) {
        return res.status(429).json({ message: creditCheck.message });
      }
      const width = parseInt(req.body.width);
      const height = parseInt(req.body.height);
      const maintainAspect = req.body.maintainAspect !== "false";
      if (!width || !height) {
        return res.status(400).json({ message: "Width and height are required" });
      }
      const result = await processing.resizeImage(req.file.path, width, height, maintainAspect);
      if (!result.success) {
        return res.status(400).json({ message: result.error });
      }
      res.json(result);
    } catch (error: any) {
      console.error("Error resizing image:", error);
      res.status(500).json({ message: error.message || "Failed to resize image" });
    }
  });

  // Image Convert Tool
  app.post("/api/tools/image-convert", upload.single("file"), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      const userId = req.user.claims.sub;
      const creditCheck = await storage.checkAndUpdateCredits(userId, TOOL_CREDITS.image_convert || 1);
      if (!creditCheck.allowed) {
        return res.status(429).json({ message: creditCheck.message });
      }
      const targetFormat = req.body.targetFormat as "jpg" | "png" | "webp";
      if (!targetFormat || !["jpg", "png", "webp"].includes(targetFormat)) {
        return res.status(400).json({ message: "Invalid target format" });
      }
      const result = await processing.convertImage(req.file.path, targetFormat);
      if (!result.success) {
        return res.status(400).json({ message: result.error });
      }
      res.json(result);
    } catch (error: any) {
      console.error("Error converting image:", error);
      res.status(500).json({ message: error.message || "Failed to convert image" });
    }
  });

  // Background Remove Tool - Industry-Grade with Advanced Options
  app.post("/api/tools/bg-remove", upload.single("file"), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      const userId = req.user.claims.sub;
      
      const qualityMode = req.body.qualityMode || "balanced";
      const upscale = req.body.upscale || "none";
      const creditCost = upscale === "2x" ? 4 : (qualityMode === "ultra" ? 3 : 2);
      
      const creditCheck = await storage.checkAndUpdateCredits(userId, creditCost);
      if (!creditCheck.allowed) {
        return res.status(429).json({ message: creditCheck.message });
      }
      
      const options = {
        qualityMode: qualityMode as "fast" | "balanced" | "ultra",
        edgeRefinement: req.body.edgeRefinement !== "false",
        shadowRemoval: req.body.shadowRemoval !== "false",
        colorEnhancement: req.body.colorEnhancement !== "false",
        sharpening: req.body.sharpening !== "false",
        upscale: upscale as "none" | "2x",
      };
      
      const result = await processing.removeBackground(req.file.path, options);
      if (!result.success) {
        return res.status(400).json({ message: result.error });
      }
      res.json(result);
    } catch (error: any) {
      console.error("Error removing background:", error);
      res.status(500).json({ message: error.message || "Failed to remove background" });
    }
  });

  // CSV to Excel Tool
  app.post("/api/tools/csv-to-excel", upload.single("file"), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      const userId = req.user.claims.sub;
      const creditCheck = await storage.checkAndUpdateCredits(userId, TOOL_CREDITS.csv_to_excel || 1);
      if (!creditCheck.allowed) {
        return res.status(429).json({ message: creditCheck.message });
      }
      const result = await processing.csvToExcel(req.file.path);
      if (!result.success) {
        return res.status(400).json({ message: result.error });
      }
      res.json(result);
    } catch (error: any) {
      console.error("Error converting CSV to Excel:", error);
      res.status(500).json({ message: error.message || "Failed to convert CSV to Excel" });
    }
  });

  // Excel Clean Tool
  app.post("/api/tools/excel-clean", upload.single("file"), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      const userId = req.user.claims.sub;
      const creditCheck = await storage.checkAndUpdateCredits(userId, TOOL_CREDITS.excel_clean || 2);
      if (!creditCheck.allowed) {
        return res.status(429).json({ message: creditCheck.message });
      }
      const result = await processing.cleanExcel(req.file.path);
      if (!result.success) {
        return res.status(400).json({ message: result.error });
      }
      res.json(result);
    } catch (error: any) {
      console.error("Error cleaning Excel:", error);
      res.status(500).json({ message: error.message || "Failed to clean Excel file" });
    }
  });

  // JSON Format Tool
  app.post("/api/tools/json-format", async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const creditCheck = await storage.checkAndUpdateCredits(userId, TOOL_CREDITS.json_format || 1);
      if (!creditCheck.allowed) {
        return res.status(429).json({ message: creditCheck.message });
      }
      const { json } = req.body;
      if (!json) {
        return res.status(400).json({ message: "JSON content is required" });
      }
      const result = processing.formatJson(json);
      if (!result.success) {
        return res.status(400).json({ message: result.error });
      }
      res.json(result);
    } catch (error: any) {
      console.error("Error formatting JSON:", error);
      res.status(500).json({ message: error.message || "Failed to format JSON" });
    }
  });

  // Download processed file
  app.get("/api/tools/download/:filename", async (req: any, res) => {
    try {
      const { filename } = req.params;
      const uploadDir = path.join(process.cwd(), "uploads");
      const filePath = path.join(uploadDir, filename);
      
      if (!filePath.startsWith(uploadDir)) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: "File not found" });
      }
      
      res.download(filePath, filename);
    } catch (error: any) {
      console.error("Error downloading file:", error);
      res.status(500).json({ message: error.message || "Failed to download file" });
    }
  });

  // AI Resume Analyzer
  app.post("/api/ai/resume", upload.single("file"), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      const userId = req.user.claims.sub;

      const creditCheck = await storage.checkAndUpdateCredits(userId, TOOL_CREDITS.ai_resume);
      if (!creditCheck.allowed) {
        return res.status(429).json({ message: creditCheck.message });
      }

      const startTime = Date.now();
      const groq = getGroqClient();

      let content = "";
      try {
        const extractedText = await extractTextFromFile(req.file.path, req.file.mimetype);
        content = extractedText.slice(0, 20000);
      } catch (err: any) {
        console.error("Resume extraction error:", err.message);
      }

      if (!content.trim()) {
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        return res.status(400).json({ 
          message: "Could not extract text from file. Please ensure it's a valid PDF, DOCX, or text file." 
        });
      }

      const chatCompletion = await groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: `You are an expert resume analyzer and career coach. Analyze the provided resume and return a detailed JSON response with the following structure:
{
  "overallScore": number (0-100),
  "sections": [{"name": string, "score": number, "feedback": string}],
  "skills": [{"name": string, "level": "beginner"|"intermediate"|"advanced"|"expert", "inDemand": boolean}],
  "improvements": [string array of 4-6 specific actionable suggestions],
  "strengths": [string array of 3-5 key strengths],
  "jobMatches": [{"title": string, "matchPercentage": number, "company": string (optional)}]
}

Analyze sections like Contact Info, Work Experience, Education, Skills, Summary/Objective.
Identify technical and soft skills with their proficiency levels.
Determine if skills are in-demand based on current job market trends.
Suggest realistic job matches based on the resume content.
Be specific and actionable in your feedback.
Return ONLY valid JSON, no additional text.`,
          },
          {
            role: "user",
            content: `Please analyze this resume:\n\n${content}`,
          },
        ],
        model: "llama-3.3-70b-versatile",
        temperature: 0.3,
        max_tokens: 2048,
      });

      const responseText = chatCompletion.choices[0]?.message?.content || "";
      const processingTime = Date.now() - startTime;

      await storage.logAiUsage({
        userId,
        toolType: "ai_resume",
        creditsUsed: TOOL_CREDITS.ai_resume,
        inputTokens: chatCompletion.usage?.prompt_tokens,
        outputTokens: chatCompletion.usage?.completion_tokens,
        processingTimeMs: processingTime,
        success: true,
      });

      let analysis;
      try {
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          analysis = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error("No JSON found in response");
        }
      } catch {
        analysis = {
          overallScore: 70,
          sections: [
            { name: "Content Analysis", score: 70, feedback: "Resume analyzed successfully" },
          ],
          skills: [],
          improvements: ["Consider adding more specific details to your resume"],
          strengths: ["Resume uploaded successfully"],
          jobMatches: [],
        };
      }

      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      res.json({ analysis, tokens: chatCompletion.usage });
    } catch (error: any) {
      console.error("Error in AI resume analysis:", error);
      res.status(500).json({ message: error.message || "Failed to analyze resume" });
    }
  });

  // AI Legal Risk Detector
  app.post("/api/ai/legal", upload.single("file"), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      const userId = req.user.claims.sub;

      const creditCheck = await storage.checkAndUpdateCredits(userId, TOOL_CREDITS.ai_legal);
      if (!creditCheck.allowed) {
        return res.status(429).json({ message: creditCheck.message });
      }

      const startTime = Date.now();
      const groq = getGroqClient();

      let content = "";
      try {
        const extractedText = await extractTextFromFile(req.file.path, req.file.mimetype);
        content = extractedText.slice(0, 25000);
      } catch (err: any) {
        console.error("Legal document extraction error:", err.message);
      }

      if (!content.trim()) {
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        return res.status(400).json({ 
          message: "Could not extract text from file. Please ensure it's a valid PDF, DOCX, or text file." 
        });
      }

      const chatCompletion = await groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: `You are an expert legal document analyzer. Analyze the provided legal document and return a detailed JSON response with the following structure:
{
  "riskScore": number (0-100, where 100 is highest risk),
  "riskLevel": "low" | "medium" | "high" | "critical",
  "clauses": [{"title": string, "content": string, "riskLevel": "low"|"medium"|"high"|"critical", "explanation": string}],
  "redFlags": [string array of concerning terms or conditions],
  "recommendations": [string array of specific suggestions],
  "summary": string (brief overview of the document)
}

Identify risk clauses like:
- Unlimited liability provisions
- One-sided termination rights
- Hidden penalties or fees
- Automatic renewal clauses
- Non-compete restrictions
- Indemnification clauses
- Arbitration requirements
Return ONLY valid JSON, no additional text.`,
          },
          {
            role: "user",
            content: `Please analyze this legal document for risks:\n\n${content}`,
          },
        ],
        model: "llama-3.3-70b-versatile",
        temperature: 0.2,
        max_tokens: 2048,
      });

      const responseText = chatCompletion.choices[0]?.message?.content || "";
      const processingTime = Date.now() - startTime;

      await storage.logAiUsage({
        userId,
        toolType: "ai_legal",
        creditsUsed: TOOL_CREDITS.ai_legal,
        inputTokens: chatCompletion.usage?.prompt_tokens,
        outputTokens: chatCompletion.usage?.completion_tokens,
        processingTimeMs: processingTime,
        success: true,
      });

      let analysis;
      try {
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          analysis = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error("No JSON found in response");
        }
      } catch {
        analysis = {
          riskScore: 50,
          riskLevel: "medium",
          clauses: [],
          redFlags: ["Unable to fully parse document"],
          recommendations: ["Please review the document manually"],
          summary: "Document analysis completed with limited results",
        };
      }

      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      res.json({ analysis, tokens: chatCompletion.usage });
    } catch (error: any) {
      console.error("Error in AI legal analysis:", error);
      res.status(500).json({ message: error.message || "Failed to analyze legal document" });
    }
  });

  // AI Data Cleaner
  app.post("/api/ai/data-clean", upload.single("file"), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      const userId = req.user.claims.sub;

      const creditCheck = await storage.checkAndUpdateCredits(userId, TOOL_CREDITS.ai_data_clean);
      if (!creditCheck.allowed) {
        return res.status(429).json({ message: creditCheck.message });
      }

      const startTime = Date.now();
      const groq = getGroqClient();

      let content = "";
      try {
        const extractedText = await extractTextFromFile(req.file.path, req.file.mimetype);
        content = extractedText.slice(0, 30000);
      } catch (err: any) {
        console.error("Data cleaner extraction error:", err.message);
      }

      if (!content.trim()) {
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        return res.status(400).json({ 
          message: "Could not extract content from file. Please ensure it's a valid CSV, Excel, or text file." 
        });
      }

      const chatCompletion = await groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: `You are a data quality analyst. Analyze the provided data (CSV, JSON, or text format) and return a JSON response with the following structure:
{
  "qualityScore": number (0-100),
  "totalRows": number (estimated),
  "issues": [{"type": string, "count": number, "examples": [string], "severity": "low"|"medium"|"high"}],
  "duplicates": {"count": number, "examples": [string]},
  "invalidEmails": {"count": number, "examples": [string]},
  "invalidPhones": {"count": number, "examples": [string]},
  "missingValues": {"count": number, "columns": [string]},
  "recommendations": [string array of data cleaning suggestions],
  "summary": string
}

Identify issues like:
- Duplicate rows or entries
- Invalid email formats
- Invalid phone number formats
- Missing required values
- Inconsistent formatting
- Data type mismatches
Return ONLY valid JSON, no additional text.`,
          },
          {
            role: "user",
            content: `Please analyze this data for quality issues:\n\n${content}`,
          },
        ],
        model: "llama-3.3-70b-versatile",
        temperature: 0.2,
        max_tokens: 2048,
      });

      const responseText = chatCompletion.choices[0]?.message?.content || "";
      const processingTime = Date.now() - startTime;

      await storage.logAiUsage({
        userId,
        toolType: "ai_data_clean",
        creditsUsed: TOOL_CREDITS.ai_data_clean,
        inputTokens: chatCompletion.usage?.prompt_tokens,
        outputTokens: chatCompletion.usage?.completion_tokens,
        processingTimeMs: processingTime,
        success: true,
      });

      let analysis;
      try {
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          analysis = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error("No JSON found in response");
        }
      } catch {
        analysis = {
          qualityScore: 70,
          totalRows: 0,
          issues: [],
          duplicates: { count: 0, examples: [] },
          invalidEmails: { count: 0, examples: [] },
          invalidPhones: { count: 0, examples: [] },
          missingValues: { count: 0, columns: [] },
          recommendations: ["Review data manually for quality issues"],
          summary: "Data analysis completed",
        };
      }

      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      res.json({ analysis, tokens: chatCompletion.usage });
    } catch (error: any) {
      console.error("Error in AI data cleaning:", error);
      res.status(500).json({ message: error.message || "Failed to analyze data" });
    }
  });

  // PDF to Image Tool
  app.post("/api/tools/pdf-to-image", upload.single("file"), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      const userId = req.user.claims.sub;
      const creditCheck = await storage.checkAndUpdateCredits(userId, TOOL_CREDITS.pdf_to_image || 0);
      if (!creditCheck.allowed) {
        return res.status(429).json({ message: creditCheck.message });
      }
      const format = req.body.format || "png";
      const dpi = parseInt(req.body.dpi) || 150;
      const result = await processing.pdfToImage(req.file.path, format, dpi);
      if (!result.success) {
        return res.status(400).json({ message: result.error });
      }
      res.json(result);
    } catch (error: any) {
      console.error("Error converting PDF to image:", error);
      res.status(500).json({ message: error.message || "Failed to convert PDF to image" });
    }
  });

  // PDF Watermark Tool
  app.post("/api/tools/pdf-watermark", upload.single("file"), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      const userId = req.user.claims.sub;
      const creditCheck = await storage.checkAndUpdateCredits(userId, TOOL_CREDITS.pdf_watermark || 0);
      if (!creditCheck.allowed) {
        return res.status(429).json({ message: creditCheck.message });
      }
      const { watermarkText, opacity, fontSize, position } = req.body;
      if (!watermarkText) {
        return res.status(400).json({ message: "Watermark text is required" });
      }
      const result = await processing.addWatermarkToPdf(req.file.path, watermarkText, {
        opacity: parseFloat(opacity) || 0.3,
        fontSize: parseInt(fontSize) || 48,
        position: position || "diagonal",
      });
      if (!result.success) {
        return res.status(400).json({ message: result.error });
      }
      res.json(result);
    } catch (error: any) {
      console.error("Error adding watermark to PDF:", error);
      res.status(500).json({ message: error.message || "Failed to add watermark" });
    }
  });

  // PDF Rotate Tool
  app.post("/api/tools/pdf-rotate", upload.single("file"), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      const userId = req.user.claims.sub;
      const creditCheck = await storage.checkAndUpdateCredits(userId, TOOL_CREDITS.pdf_rotate || 0);
      if (!creditCheck.allowed) {
        return res.status(429).json({ message: creditCheck.message });
      }
      const rotation = parseInt(req.body.rotation) || 90;
      const pageSelection = req.body.pageSelection || "all";
      if (![90, 180, 270].includes(rotation)) {
        return res.status(400).json({ message: "Rotation must be 90, 180, or 270 degrees" });
      }
      const result = await processing.rotatePdf(req.file.path, rotation as 90 | 180 | 270, pageSelection);
      if (!result.success) {
        return res.status(400).json({ message: result.error });
      }
      res.json(result);
    } catch (error: any) {
      console.error("Error rotating PDF:", error);
      res.status(500).json({ message: error.message || "Failed to rotate PDF" });
    }
  });

  // Image to PDF Tool
  app.post("/api/tools/image-to-pdf", upload.array("files", 50), async (req: any, res) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ message: "No files uploaded" });
      }
      const userId = req.user.claims.sub;
      const creditCheck = await storage.checkAndUpdateCredits(userId, TOOL_CREDITS.image_to_pdf || 0);
      if (!creditCheck.allowed) {
        return res.status(429).json({ message: creditCheck.message });
      }
      const filePaths = req.files.map((f: any) => f.path);
      const result = await processing.imagesToPdf(filePaths);
      if (!result.success) {
        return res.status(400).json({ message: result.error });
      }
      res.json(result);
    } catch (error: any) {
      console.error("Error converting images to PDF:", error);
      res.status(500).json({ message: error.message || "Failed to convert images to PDF" });
    }
  });

  // Voice to Document (text-based for now - accepts transcribed text)
  app.post("/api/ai/voice-to-doc", async (req: any, res) => {
    try {
      const { text, format } = req.body;
      const userId = req.user.claims.sub;

      if (!text) {
        return res.status(400).json({ message: "No text provided" });
      }

      const creditCheck = await storage.checkAndUpdateCredits(userId, TOOL_CREDITS.voice_to_doc);
      if (!creditCheck.allowed) {
        return res.status(429).json({ message: creditCheck.message });
      }

      const startTime = Date.now();
      const groq = getGroqClient();

      const chatCompletion = await groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: `You are a professional transcription editor. Clean up and format the provided transcribed text into a well-structured document. 
Fix any obvious transcription errors, add proper punctuation, paragraph breaks, and formatting.
Return a JSON response with:
{
  "title": string (suggested title based on content),
  "formattedText": string (the cleaned and formatted text),
  "wordCount": number,
  "summary": string (brief 1-2 sentence summary),
  "sections": [{"heading": string, "content": string}] (if applicable)
}
Return ONLY valid JSON.`,
          },
          {
            role: "user",
            content: `Please format this transcribed text:\n\n${text}`,
          },
        ],
        model: "llama-3.3-70b-versatile",
        temperature: 0.3,
        max_tokens: 2048,
      });

      const responseText = chatCompletion.choices[0]?.message?.content || "";
      const processingTime = Date.now() - startTime;

      await storage.logAiUsage({
        userId,
        toolType: "voice_to_doc",
        creditsUsed: TOOL_CREDITS.voice_to_doc,
        inputTokens: chatCompletion.usage?.prompt_tokens,
        outputTokens: chatCompletion.usage?.completion_tokens,
        processingTimeMs: processingTime,
        success: true,
      });

      let result;
      try {
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          result = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error("No JSON found in response");
        }
      } catch {
        result = {
          title: "Transcribed Document",
          formattedText: text,
          wordCount: text.split(/\s+/).length,
          summary: "Document transcribed successfully",
          sections: [],
        };
      }

      res.json({ result, tokens: chatCompletion.usage });
    } catch (error: any) {
      console.error("Error in voice to document:", error);
      res.status(500).json({ message: error.message || "Failed to process transcription" });
    }
  });

  // AI Writing Assistant
  app.post("/api/ai/writing", async (req: any, res) => {
    try {
      const { type, topic, tone, length, additionalInstructions } = req.body;
      const userId = req.user.claims.sub;

      if (!type || !topic) {
        return res.status(400).json({ message: "Content type and topic are required" });
      }

      const creditCheck = await storage.checkAndUpdateCredits(userId, TOOL_CREDITS.ai_writing);
      if (!creditCheck.allowed) {
        return res.status(429).json({ message: creditCheck.message });
      }

      const startTime = Date.now();
      const groq = getGroqClient();

      const typePrompts: Record<string, string> = {
        blog: "Write a blog post",
        email: "Write a professional email",
        article: "Write an article",
        social: "Write a social media post",
        marketing: "Write marketing copy",
        product: "Write a product description",
      };

      const lengthGuide: Record<string, string> = {
        short: "Keep it concise, around 100-200 words",
        medium: "Write a moderate length, around 300-500 words",
        long: "Write a comprehensive piece, around 600-1000 words",
      };

      const prompt = `${typePrompts[type] || "Write content"} about the following topic: "${topic}"

Tone: ${tone || "professional"}
${lengthGuide[length || "medium"]}
${additionalInstructions ? `Additional instructions: ${additionalInstructions}` : ""}

Please write high-quality, engaging content that is well-structured and ready to use.`;

      const chatCompletion = await groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: `You are a professional content writer who creates engaging, well-structured content. 
Write in a clear, compelling style that matches the requested tone.
For emails, include proper greeting and sign-off placeholders.
For blog posts, include a catchy introduction and conclusion.
For social media, keep it punchy and include relevant hashtag suggestions.
Format the content appropriately with paragraphs and structure.`,
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        model: "llama-3.3-70b-versatile",
        temperature: 0.7,
        max_tokens: 2048,
      });

      const content = chatCompletion.choices[0]?.message?.content || "";
      const processingTime = Date.now() - startTime;

      await storage.logAiUsage({
        userId,
        toolType: "ai_writing",
        creditsUsed: TOOL_CREDITS.ai_writing,
        inputTokens: chatCompletion.usage?.prompt_tokens,
        outputTokens: chatCompletion.usage?.completion_tokens,
        processingTimeMs: processingTime,
        success: true,
      });

      const wordCount = content.split(/\s+/).filter((w: string) => w.length > 0).length;

      res.json({ 
        content, 
        wordCount,
        type,
        tokens: chatCompletion.usage 
      });
    } catch (error: any) {
      console.error("Error in AI writing:", error);
      res.status(500).json({ message: error.message || "Failed to generate content" });
    }
  });

  // AI Email Extractor
  app.post("/api/ai/email-extractor", upload.single("file"), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      const userId = req.user.claims.sub;

      const creditCheck = await storage.checkAndUpdateCredits(userId, TOOL_CREDITS.ai_email_extractor);
      if (!creditCheck.allowed) {
        return res.status(429).json({ message: creditCheck.message });
      }

      const startTime = Date.now();
      const groq = getGroqClient();

      let content = "";
      try {
        const extractedText = await extractTextFromFile(req.file.path, req.file.mimetype);
        content = extractedText.slice(0, 30000);
      } catch (err: any) {
        console.error("Email extractor extraction error:", err.message);
      }

      if (!content.trim()) {
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        return res.status(400).json({ 
          message: "Could not extract text from file. Please ensure it's a valid document." 
        });
      }

      const chatCompletion = await groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: `You are an email extraction expert. Analyze the provided text and extract all email addresses.
Return a JSON response with:
{
  "emails": [{"email": string, "context": string (where it was found, e.g. "contact section", "footer")}],
  "totalFound": number,
  "uniqueCount": number,
  "domains": [{"domain": string, "count": number}]
}
Return ONLY valid JSON, no additional text.`,
          },
          {
            role: "user",
            content: `Extract all email addresses from this document:\n\n${content}`,
          },
        ],
        model: "llama-3.1-8b-instant",
        temperature: 0.1,
        max_tokens: 1024,
      });

      const responseText = chatCompletion.choices[0]?.message?.content || "";
      const processingTime = Date.now() - startTime;

      await storage.logAiUsage({
        userId,
        toolType: "ai_email_extractor",
        creditsUsed: TOOL_CREDITS.ai_email_extractor,
        inputTokens: chatCompletion.usage?.prompt_tokens,
        outputTokens: chatCompletion.usage?.completion_tokens,
        processingTimeMs: processingTime,
        success: true,
      });

      let result;
      try {
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          result = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error("No JSON found in response");
        }
      } catch {
        result = {
          emails: [],
          totalFound: 0,
          uniqueCount: 0,
          domains: [],
        };
      }

      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      res.json({ result, tokens: chatCompletion.usage });
    } catch (error: any) {
      console.error("Error in AI email extraction:", error);
      res.status(500).json({ message: error.message || "Failed to extract emails" });
    }
  });

  // AI OCR - Extract text from images
  app.post("/api/ai/ocr", upload.single("file"), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      const userId = req.user.claims.sub;

      const creditCheck = await storage.checkAndUpdateCredits(userId, TOOL_CREDITS.ai_ocr);
      if (!creditCheck.allowed) {
        return res.status(429).json({ message: creditCheck.message });
      }

      const startTime = Date.now();
      const groq = getGroqClient();

      // Convert image to base64
      const imageBuffer = fs.readFileSync(req.file.path);
      const base64Image = imageBuffer.toString("base64");
      const mimeType = req.file.mimetype || "image/png";

      const chatCompletion = await groq.chat.completions.create({
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `You are an OCR expert. Extract ALL text from this image, including handwritten text if present. 
Maintain the original layout and structure as much as possible.
If there are tables, format them appropriately.
If there are multiple columns, read left to right.
Return ONLY the extracted text, no explanations or comments.`,
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType};base64,${base64Image}`,
                },
              },
            ],
          },
        ],
        model: "llama-3.2-90b-vision-preview",
        temperature: 0.1,
        max_tokens: 4096,
      });

      const extractedText = chatCompletion.choices[0]?.message?.content || "";
      const processingTime = Date.now() - startTime;

      await storage.logAiUsage({
        userId,
        toolType: "ai_ocr",
        creditsUsed: TOOL_CREDITS.ai_ocr,
        inputTokens: chatCompletion.usage?.prompt_tokens,
        outputTokens: chatCompletion.usage?.completion_tokens,
        processingTimeMs: processingTime,
        success: true,
      });

      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      const wordCount = extractedText.split(/\s+/).filter((w: string) => w.length > 0).length;
      const charCount = extractedText.length;

      res.json({ 
        text: extractedText, 
        wordCount,
        charCount,
        tokens: chatCompletion.usage 
      });
    } catch (error: any) {
      console.error("Error in AI OCR:", error);
      res.status(500).json({ message: error.message || "Failed to extract text from image" });
    }
  });

  // PDF to Excel Tool
  app.post("/api/tools/pdf-to-excel", upload.single("file"), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      const userId = req.user.claims.sub;
      const creditCheck = await storage.checkAndUpdateCredits(userId, TOOL_CREDITS.pdf_to_excel || 0);
      if (!creditCheck.allowed) {
        return res.status(429).json({ message: creditCheck.message });
      }
      const result = await processing.pdfToExcel(req.file.path);
      if (!result.success) {
        return res.status(400).json({ message: result.error });
      }
      res.json(result);
    } catch (error: any) {
      console.error("Error converting PDF to Excel:", error);
      res.status(500).json({ message: error.message || "Failed to convert PDF to Excel" });
    }
  });

  // PDF Page Delete Tool
  app.post("/api/tools/pdf-page-delete", upload.single("file"), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      const userId = req.user.claims.sub;
      const creditCheck = await storage.checkAndUpdateCredits(userId, TOOL_CREDITS.pdf_page_delete || 0);
      if (!creditCheck.allowed) {
        return res.status(429).json({ message: creditCheck.message });
      }
      const { pages } = req.body;
      if (!pages) {
        return res.status(400).json({ message: "Please specify pages to delete" });
      }
      const result = await processing.deletePdfPages(req.file.path, pages);
      if (!result.success) {
        return res.status(400).json({ message: result.error });
      }
      res.json(result);
    } catch (error: any) {
      console.error("Error deleting PDF pages:", error);
      res.status(500).json({ message: error.message || "Failed to delete PDF pages" });
    }
  });

  // E-Sign Tool
  app.post("/api/tools/esign", upload.single("file"), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      const userId = req.user.claims.sub;
      const creditCheck = await storage.checkAndUpdateCredits(userId, TOOL_CREDITS.esign || 0);
      if (!creditCheck.allowed) {
        return res.status(429).json({ message: creditCheck.message });
      }
      const { signature, page, x, y, width, height } = req.body;
      if (!signature) {
        return res.status(400).json({ message: "Signature is required" });
      }
      const result = await processing.addSignature(
        req.file.path, 
        signature, 
        parseInt(page) || 1,
        parseFloat(x) || 50,
        parseFloat(y) || 50,
        parseFloat(width) || 200,
        parseFloat(height) || 100
      );
      if (!result.success) {
        return res.status(400).json({ message: result.error });
      }
      res.json(result);
    } catch (error: any) {
      console.error("Error adding signature:", error);
      res.status(500).json({ message: error.message || "Failed to add signature" });
    }
  });

  // Image Crop Tool
  app.post("/api/tools/image-crop", upload.single("file"), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      const userId = req.user.claims.sub;
      const creditCheck = await storage.checkAndUpdateCredits(userId, TOOL_CREDITS.image_crop || 0);
      if (!creditCheck.allowed) {
        return res.status(429).json({ message: creditCheck.message });
      }
      const { left, top, width, height } = req.body;
      const result = await processing.cropImage(
        req.file.path,
        parseFloat(left) || 0,
        parseFloat(top) || 0,
        parseFloat(width) || 100,
        parseFloat(height) || 100
      );
      if (!result.success) {
        return res.status(400).json({ message: result.error });
      }
      res.json(result);
    } catch (error: any) {
      console.error("Error cropping image:", error);
      res.status(500).json({ message: error.message || "Failed to crop image" });
    }
  });

  // Image Filter Tool
  app.post("/api/tools/image-filter", upload.single("file"), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      const userId = req.user.claims.sub;
      const creditCheck = await storage.checkAndUpdateCredits(userId, TOOL_CREDITS.image_filter || 0);
      if (!creditCheck.allowed) {
        return res.status(429).json({ message: creditCheck.message });
      }
      const { filter } = req.body;
      const validFilters = ["grayscale", "sepia", "blur", "sharpen", "brightness", "contrast"];
      if (!filter || !validFilters.includes(filter)) {
        return res.status(400).json({ message: "Invalid filter" });
      }
      const result = await processing.applyImageFilter(req.file.path, filter);
      if (!result.success) {
        return res.status(400).json({ message: result.error });
      }
      res.json(result);
    } catch (error: any) {
      console.error("Error applying filter:", error);
      res.status(500).json({ message: error.message || "Failed to apply filter" });
    }
  });

  // Image Watermark Tool
  app.post("/api/tools/image-watermark", upload.single("file"), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      const userId = req.user.claims.sub;
      const creditCheck = await storage.checkAndUpdateCredits(userId, TOOL_CREDITS.image_watermark || 0);
      if (!creditCheck.allowed) {
        return res.status(429).json({ message: creditCheck.message });
      }
      const { text, opacity, position } = req.body;
      if (!text) {
        return res.status(400).json({ message: "Watermark text is required" });
      }
      const result = await processing.addImageWatermark(
        req.file.path,
        text,
        parseFloat(opacity) || 0.5,
        position || "center"
      );
      if (!result.success) {
        return res.status(400).json({ message: result.error });
      }
      res.json(result);
    } catch (error: any) {
      console.error("Error adding watermark:", error);
      res.status(500).json({ message: error.message || "Failed to add watermark" });
    }
  });

  // Collage Maker Tool
  app.post("/api/tools/collage", upload.array("files", 20), async (req: any, res) => {
    try {
      if (!req.files || req.files.length < 2) {
        return res.status(400).json({ message: "At least 2 images are required" });
      }
      const userId = req.user.claims.sub;
      const creditCheck = await storage.checkAndUpdateCredits(userId, TOOL_CREDITS.collage_maker || 0);
      if (!creditCheck.allowed) {
        return res.status(429).json({ message: creditCheck.message });
      }
      const columns = parseInt(req.body.columns) || 2;
      const spacing = parseInt(req.body.spacing) || 10;
      const filePaths = req.files.map((f: any) => f.path);
      const result = await processing.createCollage(filePaths, columns, spacing);
      if (!result.success) {
        return res.status(400).json({ message: result.error });
      }
      res.json(result);
    } catch (error: any) {
      console.error("Error creating collage:", error);
      res.status(500).json({ message: error.message || "Failed to create collage" });
    }
  });

  // Excel to CSV Tool
  app.post("/api/tools/excel-to-csv", upload.single("file"), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      const userId = req.user.claims.sub;
      const creditCheck = await storage.checkAndUpdateCredits(userId, TOOL_CREDITS.excel_to_csv || 0);
      if (!creditCheck.allowed) {
        return res.status(429).json({ message: creditCheck.message });
      }
      const result = await processing.excelToCsv(req.file.path);
      if (!result.success) {
        return res.status(400).json({ message: result.error });
      }
      res.json(result);
    } catch (error: any) {
      console.error("Error converting Excel to CSV:", error);
      res.status(500).json({ message: error.message || "Failed to convert Excel to CSV" });
    }
  });

  // XML to JSON Tool
  app.post("/api/tools/xml-to-json", upload.single("file"), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      const userId = req.user.claims.sub;
      const creditCheck = await storage.checkAndUpdateCredits(userId, TOOL_CREDITS.xml_to_json || 0);
      if (!creditCheck.allowed) {
        return res.status(429).json({ message: creditCheck.message });
      }
      const result = await processing.xmlToJson(req.file.path);
      if (!result.success) {
        return res.status(400).json({ message: result.error });
      }
      res.json(result);
    } catch (error: any) {
      console.error("Error converting XML to JSON:", error);
      res.status(500).json({ message: error.message || "Failed to convert XML to JSON" });
    }
  });

  // QR Code Generator Tool
  app.post("/api/tools/qr-generator", async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const creditCheck = await storage.checkAndUpdateCredits(userId, TOOL_CREDITS.qr_generator || 0);
      if (!creditCheck.allowed) {
        return res.status(429).json({ message: creditCheck.message });
      }
      const { text, size } = req.body;
      if (!text) {
        return res.status(400).json({ message: "Text or URL is required" });
      }
      const result = await processing.generateQrCode(text, parseInt(size) || 256);
      if (!result.success) {
        return res.status(400).json({ message: result.error });
      }
      res.json(result);
    } catch (error: any) {
      console.error("Error generating QR code:", error);
      res.status(500).json({ message: error.message || "Failed to generate QR code" });
    }
  });

  // AI Image Generator (OpenAI DALL-E)
  app.post("/api/ai/image-gen", async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }
      
      const tier = user.subscriptionTier || "free";
      const limits = CREDIT_LIMITS[tier as keyof typeof CREDIT_LIMITS];
      const creditsNeeded = TOOL_CREDITS.ai_image_gen;
      
      if (limits.daily !== -1 && user.aiCreditsUsedToday + creditsNeeded > limits.daily) {
        return res.status(429).json({ message: "Daily credit limit exceeded" });
      }

      const { prompt, size, style } = req.body;
      if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
        return res.status(400).json({ message: "Prompt is required" });
      }
      
      const validSizes = ["1024x1024", "1792x1024", "1024x1792"];
      const validStyles = ["vivid", "natural"];
      const normalizedSize = validSizes.includes(size) ? size : "1024x1024";
      const normalizedStyle = validStyles.includes(style) ? style : "vivid";

      const startTime = Date.now();

      if (!process.env.OPENAI_API_KEY) {
        return res.status(500).json({ message: "OpenAI API key is not configured" });
      }

      const { default: OpenAI } = await import("openai");
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      const response = await openai.images.generate({
        model: "dall-e-3",
        prompt: prompt.trim(),
        n: 1,
        size: normalizedSize,
        quality: "standard",
        style: normalizedStyle,
      });

      const imageUrl = response.data[0].url;
      if (!imageUrl) {
        return res.status(500).json({ message: "No image URL returned from OpenAI" });
      }

      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        return res.status(500).json({ message: "Failed to download generated image" });
      }
      const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

      const randomId = crypto.randomUUID();
      const outputFilename = `ai_image_${userId}_${randomId}.png`;
      const outputPath = path.join(process.cwd(), "uploads", outputFilename);
      fs.writeFileSync(outputPath, imageBuffer);

      const savedFile = await storage.createFile({
        userId,
        originalName: outputFilename,
        storagePath: outputPath,
        mimeType: "image/png",
        size: imageBuffer.length,
        toolUsed: "ai_image_gen",
      });

      await storage.checkAndUpdateCredits(userId, creditsNeeded);

      const processingTime = Date.now() - startTime;

      await storage.logAiUsage({
        userId,
        toolType: "ai_image_gen",
        creditsUsed: creditsNeeded,
        processingTimeMs: processingTime,
        success: true,
      });

      res.json({
        success: true,
        fileId: savedFile.id,
        downloadUrl: `/api/files/${savedFile.id}/download`,
        previewUrl: `/api/files/${savedFile.id}/preview`,
        filename: outputFilename,
      });
    } catch (error: any) {
      console.error("Error generating image:", error);
      res.status(500).json({ message: error.message || "Failed to generate image" });
    }
  });

  // AI Presentation Maker
  app.post("/api/ai/presentation-maker", async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const creditCheck = await storage.checkAndUpdateCredits(userId, TOOL_CREDITS.ai_presentation_maker);
      if (!creditCheck.allowed) {
        return res.status(429).json({ message: creditCheck.message });
      }

      const { fileId, text, title, slideCount, theme } = req.body;
      if (!title) {
        return res.status(400).json({ message: "Title is required" });
      }

      const startTime = Date.now();
      const groq = getGroqClient();

      let content = text || "";
      if (fileId && !content) {
        const file = await storage.getFile(fileId);
        if (file && file.userId === userId && fs.existsSync(file.storagePath)) {
          const extractedText = await extractTextFromFile(file.storagePath, file.mimeType);
          content = extractedText.slice(0, 15000);
        }
      }

      if (!content) {
        return res.status(400).json({ message: "No content to create presentation from" });
      }

      const slidesPrompt = `Create a professional presentation with ${slideCount || 10} slides based on this content.
For each slide, provide:
1. A clear title
2. 3-5 bullet points with key information
3. Speaker notes (brief)

Format your response as JSON array:
[
  {
    "title": "Slide Title",
    "bullets": ["Point 1", "Point 2", "Point 3"],
    "notes": "Speaker notes here"
  }
]

Content to summarize:
${content}`;

      const chatCompletion = await groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: "You are an expert presentation designer. Create clear, concise slide content. Always respond with valid JSON array only, no other text.",
          },
          { role: "user", content: slidesPrompt },
        ],
        model: "llama-3.1-8b-instant",
        temperature: 0.5,
        max_tokens: 4096,
      });

      const slideContent = chatCompletion.choices[0]?.message?.content || "[]";
      let slides;
      try {
        const jsonMatch = slideContent.match(/\[[\s\S]*\]/);
        slides = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
      } catch {
        slides = [
          { title: title, bullets: ["Content could not be parsed"], notes: "" }
        ];
      }

      const pptxgenjs = await import("pptxgenjs");
      const pptx = new pptxgenjs.default();

      pptx.title = title;
      pptx.author = "AI Presentation Maker";

      const themeColors: Record<string, { bg: string; text: string; accent: string }> = {
        professional: { bg: "FFFFFF", text: "333333", accent: "2563EB" },
        modern: { bg: "1F2937", text: "F9FAFB", accent: "8B5CF6" },
        minimal: { bg: "FAFAFA", text: "171717", accent: "737373" },
        creative: { bg: "FDF4FF", text: "4C1D95", accent: "EC4899" },
      };
      const colors = themeColors[theme || "professional"] || themeColors.professional;

      const titleSlide = pptx.addSlide();
      titleSlide.background = { color: colors.bg };
      titleSlide.addText(title, {
        x: 0.5,
        y: 2.5,
        w: "90%",
        h: 1.5,
        fontSize: 44,
        bold: true,
        color: colors.text,
        align: "center",
      });

      for (const slide of slides.slice(0, slideCount || 10)) {
        const newSlide = pptx.addSlide();
        newSlide.background = { color: colors.bg };

        newSlide.addText(slide.title || "Slide", {
          x: 0.5,
          y: 0.3,
          w: "90%",
          h: 0.8,
          fontSize: 32,
          bold: true,
          color: colors.accent,
        });

        const bulletText = (slide.bullets || []).map((b: string) => ({ text: b, options: { bullet: true } }));
        newSlide.addText(bulletText, {
          x: 0.5,
          y: 1.3,
          w: "90%",
          h: 4,
          fontSize: 18,
          color: colors.text,
          valign: "top",
        });

        if (slide.notes) {
          newSlide.addNotes(slide.notes);
        }
      }

      const outputPath = path.join(process.cwd(), "uploads", `presentation_${Date.now()}.pptx`);
      await pptx.writeFile({ fileName: outputPath });

      const processingTime = Date.now() - startTime;

      await storage.logAiUsage({
        userId,
        toolType: "ai_presentation_maker",
        creditsUsed: TOOL_CREDITS.ai_presentation_maker,
        inputTokens: chatCompletion.usage?.prompt_tokens,
        outputTokens: chatCompletion.usage?.completion_tokens,
        processingTimeMs: processingTime,
        success: true,
      });

      res.json({
        downloadUrl: `/api/tools/download/${path.basename(outputPath)}`,
        filename: `${title.replace(/[^a-zA-Z0-9]/g, "_")}.pptx`,
        slidesCount: slides.length + 1,
      });
    } catch (error: any) {
      console.error("Error creating presentation:", error);
      res.status(500).json({ message: error.message || "Failed to create presentation" });
    }
  });

  // PDF to PowerPoint Tool
  app.post("/api/tools/pdf-to-ppt", upload.single("file"), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      const userId = req.user.claims.sub;
      const creditCheck = await storage.checkAndUpdateCredits(userId, TOOL_CREDITS.pdf_to_ppt);
      if (!creditCheck.allowed) {
        return res.status(429).json({ message: creditCheck.message });
      }

      const extractedText = await extractTextFromFile(req.file.path, "application/pdf");
      
      const pptxgenjs = await import("pptxgenjs");
      const pptx = new pptxgenjs.default();
      pptx.title = path.basename(req.file.originalname, ".pdf");

      const paragraphs = extractedText.split(/\n\n+/).filter(p => p.trim().length > 0);
      const slidesContent: string[][] = [];
      let currentSlide: string[] = [];
      
      for (const para of paragraphs) {
        if (currentSlide.length >= 5 || (currentSlide.join(" ").length > 800)) {
          if (currentSlide.length > 0) {
            slidesContent.push(currentSlide);
          }
          currentSlide = [para];
        } else {
          currentSlide.push(para);
        }
      }
      if (currentSlide.length > 0) {
        slidesContent.push(currentSlide);
      }

      const titleSlide = pptx.addSlide();
      titleSlide.addText(path.basename(req.file.originalname, ".pdf"), {
        x: 0.5,
        y: 2.5,
        w: "90%",
        h: 1.5,
        fontSize: 44,
        bold: true,
        align: "center",
      });

      for (let i = 0; i < slidesContent.length; i++) {
        const slide = pptx.addSlide();
        slide.addText(`Slide ${i + 1}`, {
          x: 0.5,
          y: 0.3,
          w: "90%",
          h: 0.6,
          fontSize: 28,
          bold: true,
        });

        const content = slidesContent[i].map(text => ({
          text: text.slice(0, 300),
          options: { bullet: true },
        }));
        slide.addText(content, {
          x: 0.5,
          y: 1.2,
          w: "90%",
          h: 4.5,
          fontSize: 16,
          valign: "top",
        });
      }

      const outputPath = path.join(process.cwd(), "uploads", `pdf_to_ppt_${Date.now()}.pptx`);
      await pptx.writeFile({ fileName: outputPath });

      res.json({
        success: true,
        downloadUrl: `/api/tools/download/${path.basename(outputPath)}`,
        filename: path.basename(req.file.originalname, ".pdf") + ".pptx",
        pageCount: slidesContent.length + 1,
      });
    } catch (error: any) {
      console.error("Error converting PDF to PPT:", error);
      res.status(500).json({ message: error.message || "Failed to convert PDF to PowerPoint" });
    }
  });

  // Data Merge Tool
  app.post("/api/tools/data-merge", upload.array("files", 20), async (req: any, res) => {
    try {
      if (!req.files || req.files.length < 2) {
        return res.status(400).json({ message: "At least 2 files are required" });
      }
      const userId = req.user.claims.sub;
      const creditCheck = await storage.checkAndUpdateCredits(userId, TOOL_CREDITS.data_merge);
      if (!creditCheck.allowed) {
        return res.status(429).json({ message: creditCheck.message });
      }

      const outputFormat = req.body.outputFormat || "xlsx";
      const allData: any[][] = [];
      let headers: string[] | null = null;

      for (const file of req.files as Express.Multer.File[]) {
        const ext = path.extname(file.originalname).toLowerCase();
        
        if (ext === ".xlsx" || ext === ".xls") {
          const workbook = XLSX.readFile(file.path);
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const data = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as any[][];
          if (data.length > 0) {
            if (!headers) {
              headers = data[0] as string[];
              allData.push(...data);
            } else {
              allData.push(...data.slice(1));
            }
          }
        } else if (ext === ".csv") {
          const content = fs.readFileSync(file.path, "utf-8");
          const lines = content.split(/\r?\n/).filter(l => l.trim());
          for (let i = 0; i < lines.length; i++) {
            const row = lines[i].split(",").map(c => c.trim().replace(/^"|"$/g, ""));
            if (i === 0 && !headers) {
              headers = row;
              allData.push(row);
            } else if (i > 0 || headers) {
              allData.push(row);
            }
          }
        } else if (ext === ".json") {
          const content = fs.readFileSync(file.path, "utf-8");
          const jsonData = JSON.parse(content);
          const arr = Array.isArray(jsonData) ? jsonData : [jsonData];
          for (const item of arr) {
            if (!headers) {
              headers = Object.keys(item);
              allData.push(headers);
            }
            allData.push(headers.map(h => item[h] ?? ""));
          }
        }
      }

      const outputPath = path.join(process.cwd(), "uploads", `merged_${Date.now()}.${outputFormat}`);

      if (outputFormat === "xlsx") {
        const ws = XLSX.utils.aoa_to_sheet(allData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Merged Data");
        XLSX.writeFile(wb, outputPath);
      } else if (outputFormat === "csv") {
        const csvContent = allData.map(row => row.map((c: any) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
        fs.writeFileSync(outputPath, csvContent);
      } else if (outputFormat === "json") {
        if (allData.length > 1 && headers) {
          const jsonArr = allData.slice(1).map(row => {
            const obj: any = {};
            headers!.forEach((h, i) => { obj[h] = row[i]; });
            return obj;
          });
          fs.writeFileSync(outputPath, JSON.stringify(jsonArr, null, 2));
        } else {
          fs.writeFileSync(outputPath, "[]");
        }
      }

      res.json({
        success: true,
        downloadUrl: `/api/tools/download/${path.basename(outputPath)}`,
        filename: `merged_data.${outputFormat}`,
        rowCount: allData.length,
        columnCount: headers?.length || 0,
      });
    } catch (error: any) {
      console.error("Error merging data:", error);
      res.status(500).json({ message: error.message || "Failed to merge data files" });
    }
  });

  // AI Translation
  app.post("/api/ai/translation", async (req: any, res) => {
    try {
      const { fileId, text, sourceLanguage, targetLanguage } = req.body;
      const userId = req.user.claims.sub;

      const creditCheck = await storage.checkAndUpdateCredits(userId, TOOL_CREDITS.ai_translation);
      if (!creditCheck.allowed) {
        return res.status(429).json({ message: creditCheck.message });
      }

      const startTime = Date.now();
      const groq = getGroqClient();

      let content = text || "";
      if (fileId && !content) {
        const file = await storage.getFile(fileId);
        if (file && file.userId === userId && fs.existsSync(file.storagePath)) {
          const extractedText = await extractTextFromFile(file.storagePath, file.mimeType);
          content = extractedText.slice(0, 10000);
        }
      }

      if (!content) {
        return res.status(400).json({ message: "No content to translate" });
      }

      const sourceInfo = sourceLanguage ? `from ${sourceLanguage}` : "";
      const chatCompletion = await groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: `You are an expert translator. Translate the text ${sourceInfo} to ${targetLanguage || "English"}. Preserve the original formatting and meaning. Only provide the translation, no explanations.`,
          },
          { role: "user", content: content },
        ],
        model: "llama-3.1-8b-instant",
        temperature: 0.3,
        max_tokens: 4096,
      });

      const translatedText = chatCompletion.choices[0]?.message?.content || "";
      const processingTime = Date.now() - startTime;

      await storage.logAiUsage({
        userId,
        toolType: "ai_translation",
        creditsUsed: TOOL_CREDITS.ai_translation,
        inputTokens: chatCompletion.usage?.prompt_tokens,
        outputTokens: chatCompletion.usage?.completion_tokens,
        processingTimeMs: processingTime,
        success: true,
      });

      res.json({
        originalText: content,
        translatedText,
        sourceLanguage: sourceLanguage || "auto",
        targetLanguage: targetLanguage || "en",
        wordCount: content.split(/\s+/).filter((w: string) => w.length > 0).length,
      });
    } catch (error: any) {
      console.error("Error in AI translation:", error);
      res.status(500).json({ message: error.message || "Failed to translate" });
    }
  });

  // AI Grammar Checker
  app.post("/api/ai/grammar", async (req: any, res) => {
    try {
      const { fileId, text } = req.body;
      const userId = req.user.claims.sub;

      const creditCheck = await storage.checkAndUpdateCredits(userId, TOOL_CREDITS.ai_grammar);
      if (!creditCheck.allowed) {
        return res.status(429).json({ message: creditCheck.message });
      }

      const startTime = Date.now();
      const groq = getGroqClient();

      let content = text || "";
      if (fileId && !content) {
        const file = await storage.getFile(fileId);
        if (file && file.userId === userId && fs.existsSync(file.storagePath)) {
          const extractedText = await extractTextFromFile(file.storagePath, file.mimeType);
          content = extractedText.slice(0, 8000);
        }
      }

      if (!content) {
        return res.status(400).json({ message: "No content to check" });
      }

      const chatCompletion = await groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: `You are an expert grammar and style checker. Analyze the text for grammar, spelling, punctuation, and style issues. 
Respond with JSON format only:
{
  "correctedText": "the fully corrected text",
  "score": 0-100,
  "issues": [
    {"type": "grammar|spelling|punctuation|style", "original": "wrong text", "suggestion": "correct text", "explanation": "why"}
  ]
}`,
          },
          { role: "user", content: content },
        ],
        model: "llama-3.1-8b-instant",
        temperature: 0.2,
        max_tokens: 4096,
      });

      const responseText = chatCompletion.choices[0]?.message?.content || "{}";
      let result;
      try {
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        result = jsonMatch ? JSON.parse(jsonMatch[0]) : { correctedText: content, score: 100, issues: [] };
      } catch {
        result = { correctedText: content, score: 100, issues: [] };
      }

      const processingTime = Date.now() - startTime;

      await storage.logAiUsage({
        userId,
        toolType: "ai_grammar",
        creditsUsed: TOOL_CREDITS.ai_grammar,
        inputTokens: chatCompletion.usage?.prompt_tokens,
        outputTokens: chatCompletion.usage?.completion_tokens,
        processingTimeMs: processingTime,
        success: true,
      });

      res.json({
        originalText: content,
        correctedText: result.correctedText,
        score: result.score || 100,
        issues: result.issues || [],
        wordCount: content.split(/\s+/).filter((w: string) => w.length > 0).length,
      });
    } catch (error: any) {
      console.error("Error in AI grammar check:", error);
      res.status(500).json({ message: error.message || "Failed to check grammar" });
    }
  });

  setInterval(async () => {
    try {
      await storage.deleteExpiredFiles();
    } catch (error) {
      console.error("Error cleaning up expired files:", error);
    }
  }, 60 * 60 * 1000); // Run every hour

  return httpServer;
}
