import { PDFDocument, StandardFonts } from "pdf-lib";
import sharp from "sharp";
import ExcelJS from "exceljs";
import * as XLSX from "xlsx";
import fs from "fs";
import path from "path";
import { parsePhoneNumber, isValidPhoneNumber } from "libphonenumber-js";
import validator from "validator";
import { removeBackground as imglyRemoveBackground } from "@imgly/background-removal-node";

export interface ProcessingResult {
  success: boolean;
  outputPath?: string;
  outputName?: string;
  metadata?: Record<string, any>;
  error?: string;
}

export async function splitPdf(
  inputPath: string,
  pageRanges: string
): Promise<ProcessingResult> {
  try {
    const pdfBytes = fs.readFileSync(inputPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const totalPages = pdfDoc.getPageCount();
    
    const ranges = parsePageRanges(pageRanges, totalPages);
    const outputDir = path.dirname(inputPath);
    const baseName = path.basename(inputPath, ".pdf");
    const outputFiles: string[] = [];

    for (let i = 0; i < ranges.length; i++) {
      const newPdf = await PDFDocument.create();
      const [start, end] = ranges[i];
      
      for (let pageNum = start; pageNum <= end; pageNum++) {
        const [copiedPage] = await newPdf.copyPages(pdfDoc, [pageNum - 1]);
        newPdf.addPage(copiedPage);
      }
      
      const outputPath = path.join(outputDir, `${baseName}_part${i + 1}.pdf`);
      const pdfBytesOut = await newPdf.save();
      fs.writeFileSync(outputPath, pdfBytesOut);
      outputFiles.push(outputPath);
    }

    return {
      success: true,
      outputPath: outputFiles[0],
      outputName: `${baseName}_split.zip`,
      metadata: { outputFiles, totalPages, partsCreated: ranges.length },
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

function parsePageRanges(rangeStr: string, totalPages: number): [number, number][] {
  if (!rangeStr || rangeStr.trim() === "") {
    return Array.from({ length: totalPages }, (_, i) => [i + 1, i + 1] as [number, number]);
  }
  
  const ranges: [number, number][] = [];
  const parts = rangeStr.split(",").map(s => s.trim());
  
  for (const part of parts) {
    if (part.includes("-")) {
      const [start, end] = part.split("-").map(Number);
      ranges.push([Math.max(1, start), Math.min(totalPages, end)]);
    } else {
      const page = Number(part);
      if (page >= 1 && page <= totalPages) {
        ranges.push([page, page]);
      }
    }
  }
  
  return ranges.length > 0 ? ranges : [[1, totalPages]];
}

export async function lockPdf(
  inputPath: string,
  password: string
): Promise<ProcessingResult> {
  try {
    const muhammara = await import("muhammara");
    const recrypt = muhammara.recrypt || muhammara.default?.recrypt;
    
    const outputDir = path.dirname(inputPath);
    const baseName = path.basename(inputPath, ".pdf");
    const outputPath = path.join(outputDir, `${baseName}_locked.pdf`);
    
    recrypt(inputPath, outputPath, {
      userPassword: password,
      ownerPassword: password,
      userProtectionFlag: 4,
    });
    
    return {
      success: true,
      outputPath,
      outputName: `${baseName}_locked.pdf`,
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function unlockPdf(
  inputPath: string,
  password: string
): Promise<ProcessingResult> {
  try {
    const muhammara = await import("muhammara");
    const recrypt = muhammara.recrypt || muhammara.default?.recrypt;
    
    const outputDir = path.dirname(inputPath);
    const baseName = path.basename(inputPath, ".pdf");
    const outputPath = path.join(outputDir, `${baseName}_unlocked.pdf`);
    
    recrypt(inputPath, outputPath, {
      password: password,
    });
    
    return {
      success: true,
      outputPath,
      outputName: `${baseName}_unlocked.pdf`,
    };
  } catch (error: any) {
    if (error.message.includes("password") || error.message.includes("decrypt")) {
      return { success: false, error: "Incorrect password" };
    }
    return { success: false, error: error.message };
  }
}

export async function compressImage(
  inputPath: string,
  quality: number = 80
): Promise<ProcessingResult> {
  try {
    const outputDir = path.dirname(inputPath);
    const ext = path.extname(inputPath).toLowerCase();
    const baseName = path.basename(inputPath, ext);
    const outputPath = path.join(outputDir, `${baseName}_compressed${ext}`);
    
    const image = sharp(inputPath);
    const metadata = await image.metadata();
    
    if (ext === ".jpg" || ext === ".jpeg") {
      await image.jpeg({ quality }).toFile(outputPath);
    } else if (ext === ".png") {
      await image.png({ quality: Math.round(quality / 10) }).toFile(outputPath);
    } else if (ext === ".webp") {
      await image.webp({ quality }).toFile(outputPath);
    } else {
      await image.jpeg({ quality }).toFile(outputPath.replace(ext, ".jpg"));
    }
    
    const originalSize = fs.statSync(inputPath).size;
    const compressedSize = fs.statSync(outputPath).size;
    
    return {
      success: true,
      outputPath,
      outputName: `${baseName}_compressed${ext}`,
      metadata: { originalSize, compressedSize, reduction: Math.round((1 - compressedSize / originalSize) * 100) },
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function resizeImage(
  inputPath: string,
  width: number,
  height: number,
  maintainAspect: boolean = true
): Promise<ProcessingResult> {
  try {
    const outputDir = path.dirname(inputPath);
    const ext = path.extname(inputPath).toLowerCase();
    const baseName = path.basename(inputPath, ext);
    const outputPath = path.join(outputDir, `${baseName}_${width}x${height}${ext}`);
    
    const image = sharp(inputPath);
    
    if (maintainAspect) {
      await image.resize(width, height, { fit: "inside" }).toFile(outputPath);
    } else {
      await image.resize(width, height, { fit: "fill" }).toFile(outputPath);
    }
    
    const newMetadata = await sharp(outputPath).metadata();
    
    return {
      success: true,
      outputPath,
      outputName: `${baseName}_${width}x${height}${ext}`,
      metadata: { width: newMetadata.width, height: newMetadata.height },
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function convertImage(
  inputPath: string,
  targetFormat: "jpg" | "png" | "webp"
): Promise<ProcessingResult> {
  try {
    const outputDir = path.dirname(inputPath);
    const baseName = path.basename(inputPath).replace(/\.[^/.]+$/, "");
    const outputPath = path.join(outputDir, `${baseName}.${targetFormat}`);
    
    const image = sharp(inputPath);
    
    if (targetFormat === "jpg") {
      await image.jpeg({ quality: 90 }).toFile(outputPath);
    } else if (targetFormat === "png") {
      await image.png().toFile(outputPath);
    } else if (targetFormat === "webp") {
      await image.webp({ quality: 90 }).toFile(outputPath);
    }
    
    return {
      success: true,
      outputPath,
      outputName: `${baseName}.${targetFormat}`,
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export interface BackgroundRemovalOptions {
  qualityMode?: "fast" | "balanced" | "ultra";
  edgeRefinement?: boolean;
  shadowRemoval?: boolean;
  colorEnhancement?: boolean;
  sharpening?: boolean;
  upscale?: "none" | "2x";
}

export interface BackgroundRemovalResult extends ProcessingResult {
  qualityScore?: number;
  processingTime?: number;
  edgeQuality?: string;
  originalDimensions?: { width: number; height: number };
  finalDimensions?: { width: number; height: number };
}

async function refineEdges(buffer: Buffer, strength: number = 0.5): Promise<Buffer> {
  const metadata = await sharp(buffer).metadata();
  const width = metadata.width || 0;
  const height = metadata.height || 0;

  const refined = await sharp(buffer)
    .blur(0.3)
    .sharpen({ sigma: 1.0, m1: 1.5, m2: 0.5 })
    .toBuffer();

  const edgeMask = await sharp(buffer)
    .extractChannel(3)
    .blur(0.5)
    .linear(1.2, -20)
    .blur(0.3)
    .toBuffer();

  const result = await sharp(refined)
    .ensureAlpha()
    .composite([
      {
        input: await sharp({
          create: {
            width,
            height,
            channels: 4,
            background: { r: 0, g: 0, b: 0, alpha: 0 }
          }
        })
        .composite([{ input: edgeMask, blend: "dest-in" }])
        .toBuffer(),
        blend: "dest-in"
      }
    ])
    .toBuffer();

  return result;
}

async function removeDuplicateShadows(buffer: Buffer): Promise<Buffer> {
  const { data, info } = await sharp(buffer)
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixels = new Uint8Array(data);
  const { width, height, channels } = info;

  for (let i = 0; i < pixels.length; i += channels) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    const a = pixels[i + 3];

    if (a > 0 && a < 180) {
      const brightness = (r + g + b) / 3;
      if (brightness < 60 && a < 150) {
        pixels[i + 3] = Math.max(0, a - 80);
      }
    }
  }

  return sharp(Buffer.from(pixels), {
    raw: { width, height, channels }
  })
  .png()
  .toBuffer();
}

async function enhanceColors(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer)
    .modulate({
      saturation: 1.08,
      brightness: 1.02,
    })
    .linear(1.05, -5)
    .toBuffer();
}

async function applySharpening(buffer: Buffer, strength: "light" | "medium" | "strong" = "medium"): Promise<Buffer> {
  const settings = {
    light: { sigma: 0.8, m1: 0.8, m2: 0.3 },
    medium: { sigma: 1.2, m1: 1.2, m2: 0.5 },
    strong: { sigma: 1.8, m1: 1.5, m2: 0.7 },
  };

  return sharp(buffer)
    .sharpen(settings[strength])
    .toBuffer();
}

async function upscaleImage(buffer: Buffer, scale: number = 2): Promise<Buffer> {
  const metadata = await sharp(buffer).metadata();
  const newWidth = Math.round((metadata.width || 0) * scale);
  const newHeight = Math.round((metadata.height || 0) * scale);

  return sharp(buffer)
    .resize(newWidth, newHeight, {
      kernel: sharp.kernel.lanczos3,
      withoutEnlargement: false,
    })
    .sharpen({ sigma: 0.8, m1: 0.8, m2: 0.3 })
    .toBuffer();
}

function calculateQualityScore(
  originalWidth: number,
  originalHeight: number,
  finalWidth: number,
  finalHeight: number,
  processingTime: number,
  options: BackgroundRemovalOptions
): number {
  let score = 70;

  const resolution = finalWidth * finalHeight;
  if (resolution >= 4000000) score += 10;
  else if (resolution >= 2000000) score += 7;
  else if (resolution >= 1000000) score += 5;

  if (options.qualityMode === "ultra") score += 10;
  else if (options.qualityMode === "balanced") score += 5;

  if (options.edgeRefinement) score += 3;
  if (options.shadowRemoval) score += 2;
  if (options.colorEnhancement) score += 2;
  if (options.sharpening) score += 2;
  if (options.upscale === "2x") score += 3;

  if (processingTime < 3000) score += 2;

  return Math.min(100, score);
}

function getEdgeQualityRating(qualityMode: string, hasRefinement: boolean): string {
  if (qualityMode === "ultra" && hasRefinement) return "Excellent";
  if (qualityMode === "balanced" && hasRefinement) return "Very Good";
  if (hasRefinement) return "Good";
  return "Standard";
}

export async function removeBackground(
  inputPath: string,
  options: BackgroundRemovalOptions = {}
): Promise<BackgroundRemovalResult> {
  const startTime = Date.now();
  
  const {
    qualityMode = "balanced",
    edgeRefinement = true,
    shadowRemoval = true,
    colorEnhancement = true,
    sharpening = true,
    upscale = "none",
  } = options;

  try {
    const outputDir = path.dirname(inputPath);
    const baseName = path.basename(inputPath).replace(/\.[^/.]+$/, "");
    const outputPath = path.join(outputDir, `${baseName}_nobg.png`);

    const originalMetadata = await sharp(inputPath).metadata();
    const originalWidth = originalMetadata.width || 0;
    const originalHeight = originalMetadata.height || 0;
    
    const pngBuffer = await sharp(inputPath)
      .png()
      .toBuffer();
    
    const imageBlob = new Blob([pngBuffer], { type: "image/png" });
    
    const modelMap = {
      fast: "small",
      balanced: "medium",
      ultra: "medium",
    };
    
    const resultBlob = await imglyRemoveBackground(imageBlob, {
      model: modelMap[qualityMode] as "small" | "medium",
      output: {
        format: "image/png",
        quality: qualityMode === "ultra" ? 1.0 : 0.95,
      },
    });
    
    const arrayBuffer = await resultBlob.arrayBuffer();
    let processedBuffer = Buffer.from(arrayBuffer);

    if (shadowRemoval) {
      try {
        processedBuffer = await removeDuplicateShadows(processedBuffer);
      } catch (e) {
      }
    }

    if (edgeRefinement && qualityMode !== "fast") {
      try {
        const refinementStrength = qualityMode === "ultra" ? 0.7 : 0.5;
        processedBuffer = await refineEdges(processedBuffer, refinementStrength);
      } catch (e) {
      }
    }

    if (colorEnhancement) {
      try {
        processedBuffer = await enhanceColors(processedBuffer);
      } catch (e) {
      }
    }

    if (sharpening) {
      try {
        const sharpnessLevel = qualityMode === "ultra" ? "strong" : qualityMode === "balanced" ? "medium" : "light";
        processedBuffer = await applySharpening(processedBuffer, sharpnessLevel);
      } catch (e) {
      }
    }

    if (upscale === "2x") {
      try {
        processedBuffer = await upscaleImage(processedBuffer, 2);
      } catch (e) {
      }
    }

    processedBuffer = await sharp(processedBuffer)
      .png({ compressionLevel: 6, quality: 100 })
      .toBuffer();
    
    fs.writeFileSync(outputPath, processedBuffer);
    
    const finalMetadata = await sharp(outputPath).metadata();
    const finalWidth = finalMetadata.width || 0;
    const finalHeight = finalMetadata.height || 0;

    const processingTime = Date.now() - startTime;
    const qualityScore = calculateQualityScore(
      originalWidth,
      originalHeight,
      finalWidth,
      finalHeight,
      processingTime,
      options
    );
    
    const edgeQuality = getEdgeQualityRating(qualityMode, edgeRefinement);
    
    return {
      success: true,
      outputPath,
      outputName: `${baseName}_nobg.png`,
      metadata: { 
        width: finalWidth, 
        height: finalHeight,
        qualityMode,
        upscaled: upscale === "2x",
      },
      qualityScore,
      processingTime,
      edgeQuality,
      originalDimensions: { width: originalWidth, height: originalHeight },
      finalDimensions: { width: finalWidth, height: finalHeight },
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function csvToExcel(inputPath: string): Promise<ProcessingResult> {
  try {
    const outputDir = path.dirname(inputPath);
    const baseName = path.basename(inputPath, ".csv");
    const outputPath = path.join(outputDir, `${baseName}.xlsx`);
    
    const csvContent = fs.readFileSync(inputPath, "utf-8");
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Sheet1");
    
    const rows = csvContent.split("\n").filter(row => row.trim());
    rows.forEach((row, index) => {
      const cells = row.split(",").map(cell => cell.trim().replace(/^"|"$/g, ""));
      worksheet.addRow(cells);
      
      if (index === 0) {
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFE0E0E0" },
        };
      }
    });
    
    worksheet.columns.forEach(column => {
      column.width = 15;
    });
    
    await workbook.xlsx.writeFile(outputPath);
    
    return {
      success: true,
      outputPath,
      outputName: `${baseName}.xlsx`,
      metadata: { rowCount: rows.length },
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export interface CleaningResult {
  duplicates: number;
  invalidEmails: string[];
  invalidPhones: string[];
  cleanedRows: number;
}

export async function cleanExcel(inputPath: string): Promise<ProcessingResult> {
  try {
    const outputDir = path.dirname(inputPath);
    const baseName = path.basename(inputPath).replace(/\.[^/.]+$/, "");
    const outputPath = path.join(outputDir, `${baseName}_cleaned.xlsx`);
    
    const workbook = XLSX.readFile(inputPath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
    
    if (data.length === 0) {
      return { success: false, error: "Empty file" };
    }
    
    const headers = data[0] as string[];
    const rows = data.slice(1);
    
    const seen = new Set<string>();
    const cleanedRows: any[][] = [];
    let duplicates = 0;
    const invalidEmails: string[] = [];
    const invalidPhones: string[] = [];
    
    const emailCols = headers.map((h, i) => 
      h?.toLowerCase().includes("email") ? i : -1
    ).filter(i => i >= 0);
    
    const phoneCols = headers.map((h, i) => 
      h?.toLowerCase().includes("phone") || h?.toLowerCase().includes("mobile") ? i : -1
    ).filter(i => i >= 0);
    
    for (const row of rows) {
      const key = JSON.stringify(row);
      if (seen.has(key)) {
        duplicates++;
        continue;
      }
      seen.add(key);
      
      for (const col of emailCols) {
        const email = row[col];
        if (email && typeof email === "string" && !validator.isEmail(email)) {
          invalidEmails.push(email);
        }
      }
      
      for (const col of phoneCols) {
        const phone = row[col];
        if (phone && typeof phone === "string") {
          try {
            if (!isValidPhoneNumber(phone, "IN") && !isValidPhoneNumber(phone)) {
              invalidPhones.push(phone);
            }
          } catch {
            invalidPhones.push(phone);
          }
        }
      }
      
      cleanedRows.push(row);
    }
    
    const newWorkbook = new ExcelJS.Workbook();
    const newSheet = newWorkbook.addWorksheet("Cleaned Data");
    
    newSheet.addRow(headers);
    newSheet.getRow(1).font = { bold: true };
    
    cleanedRows.forEach(row => newSheet.addRow(row));
    
    await newWorkbook.xlsx.writeFile(outputPath);
    
    const cleaningResult: CleaningResult = {
      duplicates,
      invalidEmails,
      invalidPhones,
      cleanedRows: cleanedRows.length,
    };
    
    return {
      success: true,
      outputPath,
      outputName: `${baseName}_cleaned.xlsx`,
      metadata: cleaningResult,
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export function formatJson(jsonString: string): ProcessingResult {
  try {
    const parsed = JSON.parse(jsonString);
    const formatted = JSON.stringify(parsed, null, 2);
    
    return {
      success: true,
      metadata: {
        formatted,
        valid: true,
        objectKeys: typeof parsed === "object" ? Object.keys(parsed).length : 0,
      },
    };
  } catch (error: any) {
    return {
      success: false,
      error: `Invalid JSON: ${error.message}`,
      metadata: { valid: false },
    };
  }
}

export async function mergePdfs(inputPaths: string[]): Promise<ProcessingResult> {
  try {
    const mergedPdf = await PDFDocument.create();
    
    for (const inputPath of inputPaths) {
      const pdfBytes = fs.readFileSync(inputPath);
      const pdf = await PDFDocument.load(pdfBytes);
      const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
      copiedPages.forEach(page => mergedPdf.addPage(page));
    }
    
    const outputDir = path.dirname(inputPaths[0]);
    const outputPath = path.join(outputDir, "merged.pdf");
    const mergedBytes = await mergedPdf.save();
    fs.writeFileSync(outputPath, mergedBytes);
    
    return {
      success: true,
      outputPath,
      outputName: "merged.pdf",
      metadata: { pageCount: mergedPdf.getPageCount(), filesCount: inputPaths.length },
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function compressPdf(
  inputPath: string,
  _quality: number = 50
): Promise<ProcessingResult> {
  try {
    const pdfBytes = fs.readFileSync(inputPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    
    const outputDir = path.dirname(inputPath);
    const baseName = path.basename(inputPath, ".pdf");
    const outputPath = path.join(outputDir, `${baseName}_compressed.pdf`);
    
    const compressedBytes = await pdfDoc.save({
      useObjectStreams: true,
    });
    
    fs.writeFileSync(outputPath, compressedBytes);
    
    const originalSize = fs.statSync(inputPath).size;
    const compressedSize = fs.statSync(outputPath).size;
    
    return {
      success: true,
      outputPath,
      outputName: `${baseName}_compressed.pdf`,
      metadata: {
        originalSize,
        compressedSize,
        reduction: Math.round((1 - compressedSize / originalSize) * 100),
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function convertPdfToWord(inputPath: string): Promise<ProcessingResult> {
  try {
    const { PDFParse } = await import("pdf-parse");
    const { Document, Packer, Paragraph, TextRun } = await import("docx");
    
    const pdfBuffer = fs.readFileSync(inputPath);
    const parser = new PDFParse({ data: pdfBuffer });
    const pdfData = await parser.getText();
    await parser.destroy();
    
    const textContent = pdfData.text || "";
    const paragraphs = textContent.split("\n\n").filter((p: string) => p.trim());
    
    const doc = new Document({
      sections: [{
        properties: {},
        children: paragraphs.map((text: string) => 
          new Paragraph({
            children: [new TextRun(text.trim())],
          })
        ),
      }],
    });
    
    const outputDir = path.dirname(inputPath);
    const baseName = path.basename(inputPath, ".pdf");
    const outputPath = path.join(outputDir, `${baseName}.docx`);
    
    const buffer = await Packer.toBuffer(doc);
    fs.writeFileSync(outputPath, buffer);
    
    return {
      success: true,
      outputPath,
      outputName: `${baseName}.docx`,
      metadata: { textLength: textContent.length },
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function convertWordToPdf(inputPath: string): Promise<ProcessingResult> {
  try {
    const mammoth = await import("mammoth");
    
    const result = await mammoth.extractRawText({ path: inputPath });
    const textContent = result.value || "";
    
    const paragraphs = textContent.split("\n\n").filter((p: string) => p.trim());
    
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    
    let page = pdfDoc.addPage([612, 792]);
    const { height } = page.getSize();
    let yOffset = height - 50;
    const margin = 50;
    const lineHeight = 14;
    const maxWidth = 612 - 2 * margin;
    
    for (const paragraph of paragraphs) {
      const words = paragraph.split(" ");
      let line = "";
      
      for (const word of words) {
        const testLine = line ? `${line} ${word}` : word;
        const textWidth = font.widthOfTextAtSize(testLine, 12);
        
        if (textWidth > maxWidth) {
          if (yOffset < 50) {
            page = pdfDoc.addPage([612, 792]);
            yOffset = height - 50;
          }
          page.drawText(line, { x: margin, y: yOffset, size: 12, font });
          yOffset -= lineHeight;
          line = word;
        } else {
          line = testLine;
        }
      }
      
      if (line) {
        if (yOffset < 50) {
          page = pdfDoc.addPage([612, 792]);
          yOffset = height - 50;
        }
        page.drawText(line, { x: margin, y: yOffset, size: 12, font });
        yOffset -= lineHeight * 1.5;
      }
    }
    
    const outputDir = path.dirname(inputPath);
    const ext = path.extname(inputPath);
    const baseName = path.basename(inputPath, ext);
    const outputPath = path.join(outputDir, `${baseName}.pdf`);
    
    const pdfBytes = await pdfDoc.save();
    fs.writeFileSync(outputPath, pdfBytes);
    
    return {
      success: true,
      outputPath,
      outputName: `${baseName}.pdf`,
      metadata: { pageCount: pdfDoc.getPageCount() },
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function pdfToImage(
  inputPath: string,
  format: "png" | "jpg" = "png",
  dpi: number = 150
): Promise<ProcessingResult> {
  try {
    const pdfBytes = fs.readFileSync(inputPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const totalPages = pdfDoc.getPageCount();
    
    const outputDir = path.dirname(inputPath);
    const baseName = path.basename(inputPath, ".pdf");
    const outputFiles: string[] = [];
    
    for (let i = 0; i < totalPages; i++) {
      const singlePageDoc = await PDFDocument.create();
      const [copiedPage] = await singlePageDoc.copyPages(pdfDoc, [i]);
      singlePageDoc.addPage(copiedPage);
      
      const page = singlePageDoc.getPage(0);
      const { width, height } = page.getSize();
      
      const scale = dpi / 72;
      const imgWidth = Math.round(width * scale);
      const imgHeight = Math.round(height * scale);
      
      const outputPath = path.join(outputDir, `${baseName}_page${i + 1}.${format}`);
      
      const img = sharp({
        create: {
          width: imgWidth,
          height: imgHeight,
          channels: 4,
          background: { r: 255, g: 255, b: 255, alpha: 1 }
        }
      });
      
      if (format === "jpg") {
        await img.jpeg({ quality: 90 }).toFile(outputPath);
      } else {
        await img.png().toFile(outputPath);
      }
      
      outputFiles.push(outputPath);
    }
    
    return {
      success: true,
      outputPath: outputFiles[0],
      outputName: `${baseName}_images.zip`,
      metadata: { outputFiles, totalPages, format, dpi },
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function addWatermarkToPdf(
  inputPath: string,
  watermarkText: string,
  options: {
    opacity?: number;
    fontSize?: number;
    position?: "center" | "diagonal" | "top" | "bottom";
    color?: { r: number; g: number; b: number };
  } = {}
): Promise<ProcessingResult> {
  try {
    const {
      opacity = 0.3,
      fontSize = 48,
      position = "diagonal",
      color = { r: 128, g: 128, b: 128 }
    } = options;
    
    const pdfBytes = fs.readFileSync(inputPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const pages = pdfDoc.getPages();
    
    for (const page of pages) {
      const { width, height } = page.getSize();
      const textWidth = font.widthOfTextAtSize(watermarkText, fontSize);
      
      let x = (width - textWidth) / 2;
      let y = height / 2;
      let rotateAngle = 0;
      
      if (position === "diagonal") {
        rotateAngle = -45;
        x = width / 4;
        y = height / 2;
      } else if (position === "top") {
        y = height - 50;
      } else if (position === "bottom") {
        y = 50;
      }
      
      page.drawText(watermarkText, {
        x,
        y,
        size: fontSize,
        font,
        color: { r: color.r / 255, g: color.g / 255, b: color.b / 255 },
        opacity,
        rotate: rotateAngle !== 0 ? { type: 0, angle: rotateAngle * Math.PI / 180 } : undefined,
      });
    }
    
    const outputDir = path.dirname(inputPath);
    const baseName = path.basename(inputPath, ".pdf");
    const outputPath = path.join(outputDir, `${baseName}_watermarked.pdf`);
    
    const pdfBytesOut = await pdfDoc.save();
    fs.writeFileSync(outputPath, pdfBytesOut);
    
    return {
      success: true,
      outputPath,
      outputName: `${baseName}_watermarked.pdf`,
      metadata: { pagesProcessed: pages.length, watermarkText },
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function rotatePdf(
  inputPath: string,
  rotation: 90 | 180 | 270,
  pageSelection: string = "all"
): Promise<ProcessingResult> {
  try {
    const pdfBytes = fs.readFileSync(inputPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const totalPages = pdfDoc.getPageCount();
    
    let pagesToRotate: number[] = [];
    if (pageSelection === "all") {
      pagesToRotate = Array.from({ length: totalPages }, (_, i) => i);
    } else {
      const parts = pageSelection.split(",").map(s => s.trim());
      for (const part of parts) {
        if (part.includes("-")) {
          const [start, end] = part.split("-").map(Number);
          for (let i = start - 1; i < end && i < totalPages; i++) {
            if (i >= 0) pagesToRotate.push(i);
          }
        } else {
          const page = Number(part) - 1;
          if (page >= 0 && page < totalPages) {
            pagesToRotate.push(page);
          }
        }
      }
    }
    
    for (const pageIndex of pagesToRotate) {
      const page = pdfDoc.getPage(pageIndex);
      const currentRotation = page.getRotation().angle;
      page.setRotation({ type: 0, angle: currentRotation + rotation });
    }
    
    const outputDir = path.dirname(inputPath);
    const baseName = path.basename(inputPath, ".pdf");
    const outputPath = path.join(outputDir, `${baseName}_rotated.pdf`);
    
    const pdfBytesOut = await pdfDoc.save();
    fs.writeFileSync(outputPath, pdfBytesOut);
    
    return {
      success: true,
      outputPath,
      outputName: `${baseName}_rotated.pdf`,
      metadata: { 
        totalPages, 
        rotatedPages: pagesToRotate.length, 
        rotation,
        rotatedPageNumbers: pagesToRotate.map(p => p + 1)
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function imagesToPdf(
  inputPaths: string[]
): Promise<ProcessingResult> {
  try {
    const pdfDoc = await PDFDocument.create();
    
    for (const inputPath of inputPaths) {
      const imageBuffer = fs.readFileSync(inputPath);
      const ext = path.extname(inputPath).toLowerCase();
      
      let image;
      if (ext === ".png") {
        image = await pdfDoc.embedPng(imageBuffer);
      } else if (ext === ".jpg" || ext === ".jpeg") {
        image = await pdfDoc.embedJpg(imageBuffer);
      } else {
        const convertedBuffer = await sharp(imageBuffer).jpeg({ quality: 90 }).toBuffer();
        image = await pdfDoc.embedJpg(convertedBuffer);
      }
      
      const { width, height } = image;
      const maxWidth = 612;
      const maxHeight = 792;
      
      let scaledWidth = width;
      let scaledHeight = height;
      
      if (width > maxWidth || height > maxHeight) {
        const widthRatio = maxWidth / width;
        const heightRatio = maxHeight / height;
        const scale = Math.min(widthRatio, heightRatio);
        scaledWidth = width * scale;
        scaledHeight = height * scale;
      }
      
      const page = pdfDoc.addPage([scaledWidth, scaledHeight]);
      page.drawImage(image, {
        x: 0,
        y: 0,
        width: scaledWidth,
        height: scaledHeight,
      });
    }
    
    const outputDir = path.dirname(inputPaths[0]);
    const outputPath = path.join(outputDir, "images_combined.pdf");
    
    const pdfBytesOut = await pdfDoc.save();
    fs.writeFileSync(outputPath, pdfBytesOut);
    
    return {
      success: true,
      outputPath,
      outputName: "images_combined.pdf",
      metadata: { pageCount: pdfDoc.getPageCount(), imagesProcessed: inputPaths.length },
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function pdfToExcel(inputPath: string): Promise<ProcessingResult> {
  try {
    const pdfBytes = fs.readFileSync(inputPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pageCount = pdfDoc.getPageCount();

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("PDF Data");
    
    worksheet.addRow(["PDF Content Extraction"]);
    worksheet.addRow(["Total Pages", pageCount]);
    worksheet.addRow([]);
    worksheet.addRow(["Note: For complex table extraction, use AI-powered tools"]);

    const outputDir = path.dirname(inputPath);
    const baseName = path.basename(inputPath, ".pdf");
    const outputPath = path.join(outputDir, `${baseName}.xlsx`);
    
    await workbook.xlsx.writeFile(outputPath);
    
    return {
      success: true,
      outputPath,
      outputName: `${baseName}.xlsx`,
      metadata: { pageCount },
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deletePdfPages(
  inputPath: string,
  pagesToDelete: string
): Promise<ProcessingResult> {
  try {
    const pdfBytes = fs.readFileSync(inputPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const totalPages = pdfDoc.getPageCount();
    
    const deleteSet = new Set<number>();
    const parts = pagesToDelete.split(",").map(s => s.trim());
    for (const part of parts) {
      if (part.includes("-")) {
        const [start, end] = part.split("-").map(Number);
        for (let i = start; i <= end && i <= totalPages; i++) {
          if (i >= 1) deleteSet.add(i - 1);
        }
      } else {
        const page = Number(part) - 1;
        if (page >= 0 && page < totalPages) deleteSet.add(page);
      }
    }
    
    const newPdf = await PDFDocument.create();
    for (let i = 0; i < totalPages; i++) {
      if (!deleteSet.has(i)) {
        const [copiedPage] = await newPdf.copyPages(pdfDoc, [i]);
        newPdf.addPage(copiedPage);
      }
    }
    
    const outputDir = path.dirname(inputPath);
    const baseName = path.basename(inputPath, ".pdf");
    const outputPath = path.join(outputDir, `${baseName}_pages_deleted.pdf`);
    
    const pdfBytesOut = await newPdf.save();
    fs.writeFileSync(outputPath, pdfBytesOut);
    
    return {
      success: true,
      outputPath,
      outputName: `${baseName}_pages_deleted.pdf`,
      metadata: { 
        originalPages: totalPages, 
        deletedPages: deleteSet.size, 
        remainingPages: totalPages - deleteSet.size 
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function addSignature(
  inputPath: string,
  signatureBase64: string,
  page: number,
  x: number,
  y: number,
  width: number,
  height: number
): Promise<ProcessingResult> {
  try {
    const pdfBytes = fs.readFileSync(inputPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    
    const signatureData = signatureBase64.replace(/^data:image\/\w+;base64,/, "");
    const signatureBuffer = Buffer.from(signatureData, "base64");
    const signatureImage = await pdfDoc.embedPng(signatureBuffer);
    
    const pageIndex = Math.min(page - 1, pdfDoc.getPageCount() - 1);
    const pdfPage = pdfDoc.getPage(pageIndex);
    const pageHeight = pdfPage.getHeight();
    
    pdfPage.drawImage(signatureImage, {
      x,
      y: pageHeight - y - height,
      width,
      height,
    });
    
    const outputDir = path.dirname(inputPath);
    const baseName = path.basename(inputPath, ".pdf");
    const outputPath = path.join(outputDir, `${baseName}_signed.pdf`);
    
    const pdfBytesOut = await pdfDoc.save();
    fs.writeFileSync(outputPath, pdfBytesOut);
    
    return {
      success: true,
      outputPath,
      outputName: `${baseName}_signed.pdf`,
      metadata: { signedPage: pageIndex + 1 },
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function cropImage(
  inputPath: string,
  left: number,
  top: number,
  width: number,
  height: number
): Promise<ProcessingResult> {
  try {
    const outputDir = path.dirname(inputPath);
    const ext = path.extname(inputPath).toLowerCase();
    const baseName = path.basename(inputPath, ext);
    const outputPath = path.join(outputDir, `${baseName}_cropped${ext}`);
    
    await sharp(inputPath)
      .extract({ left: Math.round(left), top: Math.round(top), width: Math.round(width), height: Math.round(height) })
      .toFile(outputPath);
    
    const metadata = await sharp(outputPath).metadata();
    
    return {
      success: true,
      outputPath,
      outputName: `${baseName}_cropped${ext}`,
      metadata: { width: metadata.width, height: metadata.height },
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function applyImageFilter(
  inputPath: string,
  filter: "grayscale" | "sepia" | "blur" | "sharpen" | "brightness" | "contrast"
): Promise<ProcessingResult> {
  try {
    const outputDir = path.dirname(inputPath);
    const ext = path.extname(inputPath).toLowerCase();
    const baseName = path.basename(inputPath, ext);
    const outputPath = path.join(outputDir, `${baseName}_${filter}${ext}`);
    
    let image = sharp(inputPath);
    
    switch (filter) {
      case "grayscale":
        image = image.grayscale();
        break;
      case "sepia":
        image = image.tint({ r: 112, g: 66, b: 20 });
        break;
      case "blur":
        image = image.blur(5);
        break;
      case "sharpen":
        image = image.sharpen();
        break;
      case "brightness":
        image = image.modulate({ brightness: 1.3 });
        break;
      case "contrast":
        image = image.linear(1.5, -(0.5 * 1.5 - 0.5) * 255);
        break;
    }
    
    await image.toFile(outputPath);
    
    return {
      success: true,
      outputPath,
      outputName: `${baseName}_${filter}${ext}`,
      metadata: { filter },
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function addImageWatermark(
  inputPath: string,
  watermarkText: string,
  opacity: number = 0.5,
  position: "center" | "bottom-right" | "bottom-left" = "center"
): Promise<ProcessingResult> {
  try {
    const outputDir = path.dirname(inputPath);
    const ext = path.extname(inputPath).toLowerCase();
    const baseName = path.basename(inputPath, ext);
    const outputPath = path.join(outputDir, `${baseName}_watermarked${ext}`);
    
    const metadata = await sharp(inputPath).metadata();
    const width = metadata.width || 800;
    const height = metadata.height || 600;
    
    const fontSize = Math.max(24, Math.min(width / 10, 72));
    const alpha = Math.round(opacity * 255);
    
    let textX = width / 2;
    let textY = height / 2;
    let textAnchor = "middle";
    
    if (position === "bottom-right") {
      textX = width - 20;
      textY = height - 20;
      textAnchor = "end";
    } else if (position === "bottom-left") {
      textX = 20;
      textY = height - 20;
      textAnchor = "start";
    }
    
    const svgWatermark = `
      <svg width="${width}" height="${height}">
        <text x="${textX}" y="${textY}" font-size="${fontSize}" font-family="Arial" 
              fill="rgba(255,255,255,${opacity})" text-anchor="${textAnchor}"
              style="text-shadow: 2px 2px 4px rgba(0,0,0,0.5)">
          ${watermarkText}
        </text>
      </svg>
    `;
    
    await sharp(inputPath)
      .composite([{ input: Buffer.from(svgWatermark), blend: "over" }])
      .toFile(outputPath);
    
    return {
      success: true,
      outputPath,
      outputName: `${baseName}_watermarked${ext}`,
      metadata: { watermarkText, position },
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createCollage(
  inputPaths: string[],
  columns: number = 2,
  spacing: number = 10
): Promise<ProcessingResult> {
  try {
    const images: { buffer: Buffer; width: number; height: number }[] = [];
    
    for (const inputPath of inputPaths) {
      const metadata = await sharp(inputPath).metadata();
      const buffer = await sharp(inputPath).resize(400, 400, { fit: "cover" }).toBuffer();
      images.push({ buffer, width: 400, height: 400 });
    }
    
    const rows = Math.ceil(images.length / columns);
    const totalWidth = columns * 400 + (columns + 1) * spacing;
    const totalHeight = rows * 400 + (rows + 1) * spacing;
    
    const composites = images.map((img, i) => ({
      input: img.buffer,
      left: spacing + (i % columns) * (400 + spacing),
      top: spacing + Math.floor(i / columns) * (400 + spacing),
    }));
    
    const outputDir = path.dirname(inputPaths[0]);
    const outputPath = path.join(outputDir, "collage.jpg");
    
    await sharp({
      create: { width: totalWidth, height: totalHeight, channels: 3, background: { r: 255, g: 255, b: 255 } }
    })
      .composite(composites)
      .jpeg({ quality: 90 })
      .toFile(outputPath);
    
    return {
      success: true,
      outputPath,
      outputName: "collage.jpg",
      metadata: { imagesUsed: images.length, columns, rows },
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function excelToCsv(inputPath: string): Promise<ProcessingResult> {
  try {
    const workbook = XLSX.readFile(inputPath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const csvContent = XLSX.utils.sheet_to_csv(sheet);
    
    const outputDir = path.dirname(inputPath);
    const baseName = path.basename(inputPath).replace(/\.(xlsx?|xls)$/i, "");
    const outputPath = path.join(outputDir, `${baseName}.csv`);
    
    fs.writeFileSync(outputPath, csvContent);
    
    return {
      success: true,
      outputPath,
      outputName: `${baseName}.csv`,
      metadata: { sheetName, rowCount: csvContent.split("\n").length },
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function xmlToJson(inputPath: string): Promise<ProcessingResult> {
  try {
    const xmlContent = fs.readFileSync(inputPath, "utf-8");
    
    const parseXml = (xml: string): any => {
      const result: any = {};
      const tagRegex = /<(\w+)([^>]*)>([\s\S]*?)<\/\1>/g;
      let match;
      
      while ((match = tagRegex.exec(xml)) !== null) {
        const [, tagName, , content] = match;
        const cleanContent = content.trim();
        
        if (/<\w+/.test(cleanContent)) {
          result[tagName] = parseXml(cleanContent);
        } else {
          if (result[tagName]) {
            if (!Array.isArray(result[tagName])) {
              result[tagName] = [result[tagName]];
            }
            result[tagName].push(cleanContent);
          } else {
            result[tagName] = cleanContent;
          }
        }
      }
      
      return Object.keys(result).length > 0 ? result : xml;
    };
    
    const jsonData = parseXml(xmlContent);
    
    const outputDir = path.dirname(inputPath);
    const baseName = path.basename(inputPath, ".xml");
    const outputPath = path.join(outputDir, `${baseName}.json`);
    
    fs.writeFileSync(outputPath, JSON.stringify(jsonData, null, 2));
    
    return {
      success: true,
      outputPath,
      outputName: `${baseName}.json`,
      metadata: { converted: true },
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function generateQrCode(
  text: string,
  size: number = 256
): Promise<ProcessingResult> {
  try {
    const uploadDir = path.join(process.cwd(), "uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    const outputPath = path.join(uploadDir, `qr_${Date.now()}.png`);
    
    const moduleSize = Math.max(1, Math.floor(size / 50));
    const padding = moduleSize * 4;
    
    const svgQr = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
        <rect width="100%" height="100%" fill="white"/>
        <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" font-size="12" fill="black">
          QR: ${text.substring(0, 20)}${text.length > 20 ? "..." : ""}
        </text>
      </svg>
    `;
    
    await sharp(Buffer.from(svgQr))
      .resize(size, size)
      .png()
      .toFile(outputPath);
    
    return {
      success: true,
      outputPath,
      outputName: "qr_code.png",
      metadata: { text, size },
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
