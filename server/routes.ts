import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, isAdmin } from "./replitAuth";
import { TOOL_CREDITS } from "@shared/schema";
import multer from "multer";
import path from "path";
import fs from "fs";
import Groq from "groq-sdk";
import * as processing from "./services/processing";

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

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  await setupAuth(app);

  app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
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

  app.get("/api/files", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userFiles = await storage.getUserFiles(userId);
      res.json(userFiles);
    } catch (error) {
      console.error("Error fetching files:", error);
      res.status(500).json({ message: "Failed to fetch files" });
    }
  });

  app.post("/api/files/upload", isAuthenticated, upload.single("file"), async (req: any, res) => {
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

  app.post("/api/files/:id/process", isAuthenticated, async (req: any, res) => {
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

  app.get("/api/files/:id/download", isAuthenticated, async (req: any, res) => {
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

  app.delete("/api/files/:id", isAuthenticated, async (req: any, res) => {
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

  app.post("/api/ai/chat", isAuthenticated, async (req: any, res) => {
    try {
      const { message, fileId, context } = req.body;
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
          const content = fs.readFileSync(file.storagePath, "utf-8").slice(0, 10000);
          documentContext = `Document content:\n${content}\n\n`;
        }
      }

      const chatCompletion = await groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: `You are a helpful document assistant. ${documentContext}${context || ""}`,
          },
          { role: "user", content: message },
        ],
        model: "llama-3.3-70b-versatile",
        temperature: 0.7,
        max_tokens: 2048,
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

  app.post("/api/ai/summary", isAuthenticated, async (req: any, res) => {
    try {
      const { fileId, text } = req.body;
      const userId = req.user.claims.sub;

      const creditCheck = await storage.checkAndUpdateCredits(userId, TOOL_CREDITS.ai_summary);
      if (!creditCheck.allowed) {
        return res.status(429).json({ message: creditCheck.message });
      }

      const startTime = Date.now();
      const groq = getGroqClient();

      let content = text || "";
      if (fileId && !content) {
        const file = await storage.getFile(fileId);
        if (file && file.userId === userId && fs.existsSync(file.storagePath)) {
          content = fs.readFileSync(file.storagePath, "utf-8").slice(0, 15000);
        }
      }

      if (!content) {
        return res.status(400).json({ message: "No content to summarize" });
      }

      const chatCompletion = await groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: "You are an expert document summarizer. Create concise, accurate summaries that capture the key points.",
          },
          {
            role: "user",
            content: `Please summarize the following document:\n\n${content}`,
          },
        ],
        model: "llama-3.3-70b-versatile",
        temperature: 0.5,
        max_tokens: 1024,
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

  app.get("/api/subscription", isAuthenticated, async (req: any, res) => {
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

  app.get("/api/admin/users", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.get("/api/admin/analytics", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const analytics = await storage.getAnalytics();
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching analytics:", error);
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  app.patch("/api/admin/users/:id", isAuthenticated, isAdmin, async (req: any, res) => {
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
  app.post("/api/tools/pdf-split", isAuthenticated, upload.single("file"), async (req: any, res) => {
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
  app.post("/api/tools/pdf-lock", isAuthenticated, upload.single("file"), async (req: any, res) => {
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
  app.post("/api/tools/pdf-unlock", isAuthenticated, upload.single("file"), async (req: any, res) => {
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

  // Image Compress Tool
  app.post("/api/tools/image-compress", isAuthenticated, upload.single("file"), async (req: any, res) => {
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
  app.post("/api/tools/image-resize", isAuthenticated, upload.single("file"), async (req: any, res) => {
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
  app.post("/api/tools/image-convert", isAuthenticated, upload.single("file"), async (req: any, res) => {
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

  // Background Remove Tool
  app.post("/api/tools/bg-remove", isAuthenticated, upload.single("file"), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      const userId = req.user.claims.sub;
      const creditCheck = await storage.checkAndUpdateCredits(userId, TOOL_CREDITS.bg_remove || 2);
      if (!creditCheck.allowed) {
        return res.status(429).json({ message: creditCheck.message });
      }
      const result = await processing.removeBackground(req.file.path);
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
  app.post("/api/tools/csv-to-excel", isAuthenticated, upload.single("file"), async (req: any, res) => {
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
  app.post("/api/tools/excel-clean", isAuthenticated, upload.single("file"), async (req: any, res) => {
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
  app.post("/api/tools/json-format", isAuthenticated, async (req: any, res) => {
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
  app.get("/api/tools/download/:filename", isAuthenticated, async (req: any, res) => {
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

  setInterval(async () => {
    try {
      await storage.deleteExpiredFiles();
    } catch (error) {
      console.error("Error cleaning up expired files:", error);
    }
  }, 60 * 60 * 1000); // Run every hour

  return httpServer;
}
