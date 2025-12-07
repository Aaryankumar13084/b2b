import { PDFDocument } from "pdf-lib";
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
    const pdfBytes = fs.readFileSync(inputPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    
    const outputDir = path.dirname(inputPath);
    const baseName = path.basename(inputPath, ".pdf");
    const outputPath = path.join(outputDir, `${baseName}_locked.pdf`);
    
    const encryptedBytes = await pdfDoc.save({
      userPassword: password,
      ownerPassword: password,
    });
    
    fs.writeFileSync(outputPath, encryptedBytes);
    
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
    const pdfBytes = fs.readFileSync(inputPath);
    const pdfDoc = await PDFDocument.load(pdfBytes, { password });
    
    const outputDir = path.dirname(inputPath);
    const baseName = path.basename(inputPath, ".pdf");
    const outputPath = path.join(outputDir, `${baseName}_unlocked.pdf`);
    
    const unlockedBytes = await pdfDoc.save();
    fs.writeFileSync(outputPath, unlockedBytes);
    
    return {
      success: true,
      outputPath,
      outputName: `${baseName}_unlocked.pdf`,
    };
  } catch (error: any) {
    if (error.message.includes("password")) {
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

export async function removeBackground(
  inputPath: string
): Promise<ProcessingResult> {
  try {
    const outputDir = path.dirname(inputPath);
    const baseName = path.basename(inputPath).replace(/\.[^/.]+$/, "");
    const outputPath = path.join(outputDir, `${baseName}_nobg.png`);
    
    // First convert to PNG using sharp for consistent format
    const pngBuffer = await sharp(inputPath)
      .png()
      .toBuffer();
    
    const imageBlob = new Blob([pngBuffer], { type: "image/png" });
    
    const resultBlob = await imglyRemoveBackground(imageBlob, {
      model: "small",
      output: {
        format: "image/png",
        quality: 0.9,
      },
    });
    
    const arrayBuffer = await resultBlob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    fs.writeFileSync(outputPath, buffer);
    
    const metadata = await sharp(outputPath).metadata();
    
    return {
      success: true,
      outputPath,
      outputName: `${baseName}_nobg.png`,
      metadata: { width: metadata.width, height: metadata.height },
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
