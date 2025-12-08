import { useState } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScanText, Upload, ArrowLeft, CheckCircle, Sparkles, Image, Copy, AlertCircle, Download, FileText } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

type UploadState = "idle" | "uploading" | "processing" | "complete" | "error";

interface OCRResult {
  extractedText: string;
  confidence: number;
  wordCount: number;
  language?: string;
}

export default function AIOCR() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<OCRResult | null>(null);
  const { toast } = useToast();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const validTypes = [
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
        "image/bmp",
        "application/pdf",
      ];
      if (!validTypes.includes(selectedFile.type)) {
        toast({
          title: "Invalid file type",
          description: "Please select an image (JPG, PNG, GIF, WebP) or PDF",
          variant: "destructive",
        });
        return;
      }
      setFile(selectedFile);
      setUploadState("idle");
      setResult(null);
      
      if (selectedFile.type.startsWith("image/")) {
        const url = URL.createObjectURL(selectedFile);
        setPreviewUrl(url);
      } else {
        setPreviewUrl(null);
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      const validTypes = [
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
        "image/bmp",
        "application/pdf",
      ];
      if (!validTypes.includes(droppedFile.type)) {
        toast({
          title: "Invalid file type",
          description: "Please select an image (JPG, PNG, GIF, WebP) or PDF",
          variant: "destructive",
        });
        return;
      }
      setFile(droppedFile);
      setUploadState("idle");
      setResult(null);
      
      if (droppedFile.type.startsWith("image/")) {
        const url = URL.createObjectURL(droppedFile);
        setPreviewUrl(url);
      } else {
        setPreviewUrl(null);
      }
    }
  };

  const handleExtract = async () => {
    if (!file) return;

    setUploadState("uploading");
    setProgress(20);

    try {
      const formData = new FormData();
      formData.append("file", file);
      
      setProgress(40);
      
      const uploadResponse = await fetch("/api/files/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      
      if (!uploadResponse.ok) {
        const uploadError = await uploadResponse.json();
        throw new Error(uploadError.message || "Failed to upload file");
      }
      
      const uploadData = await uploadResponse.json();
      const fileId = uploadData.id || uploadData.file?.id;
      
      setProgress(60);
      setUploadState("processing");
      
      const response = await apiRequest("POST", "/api/ai/ocr", {
        fileId: fileId,
      });
      
      setProgress(90);
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || "Failed to extract text");
      }
      
      setProgress(100);
      setUploadState("complete");
      setResult({
        extractedText: data.extractedText,
        confidence: data.confidence || 95,
        wordCount: data.wordCount || data.extractedText.split(/\s+/).filter((w: string) => w.length > 0).length,
        language: data.language,
      });
    } catch (error: any) {
      setUploadState("error");
      toast({
        title: "Error",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    }
  };

  const handleCopy = () => {
    if (result) {
      navigator.clipboard.writeText(result.extractedText);
      toast({
        title: "Copied to clipboard",
        description: "The extracted text has been copied",
      });
    }
  };

  const handleDownload = () => {
    if (result) {
      const blob = new Blob([result.extractedText], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "extracted-text.txt";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const resetUpload = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setFile(null);
    setPreviewUrl(null);
    setUploadState("idle");
    setProgress(0);
    setResult(null);
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return "text-green-500";
    if (confidence >= 70) return "text-yellow-500";
    return "text-red-500";
  };

  return (
    <DashboardLayout>
      <div className="p-6 max-w-4xl mx-auto">
        <div className="mb-6">
          <Link href="/ai">
            <Button variant="ghost" size="sm" className="gap-2 mb-4" data-testid="button-back">
              <ArrowLeft className="w-4 h-4" />
              Back to AI Features
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-orange-500/10 flex items-center justify-center">
              <ScanText className="w-6 h-6 text-orange-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold" data-testid="text-page-title">AI OCR</h1>
              <p className="text-muted-foreground">Extract text from images and scanned documents</p>
            </div>
            <Badge variant="secondary" className="ml-auto">
              <Sparkles className="w-3 h-3 mr-1" />
              2 Credits/image
            </Badge>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Extract Text</CardTitle>
            <CardDescription>
              Upload an image or scanned PDF to extract text using AI
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {uploadState === "idle" && !file && (
              <div
                className="border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors hover:border-primary/50 hover:bg-muted/50"
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => document.getElementById("file-input")?.click()}
                data-testid="dropzone-upload"
              >
                <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-lg font-medium mb-2">Drop your image here</p>
                <p className="text-muted-foreground mb-4">JPG, PNG, GIF, WebP, or PDF supported</p>
                <input
                  id="file-input"
                  type="file"
                  accept="image/*,.pdf"
                  className="hidden"
                  onChange={handleFileSelect}
                  data-testid="input-file"
                />
                <Button variant="outline" data-testid="button-browse">
                  Browse Files
                </Button>
              </div>
            )}

            {file && uploadState === "idle" && (
              <div className="space-y-4">
                <div className="flex items-start gap-4 p-4 bg-muted/50 rounded-lg">
                  {previewUrl ? (
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="w-24 h-24 object-cover rounded-lg"
                      data-testid="img-preview"
                    />
                  ) : (
                    <div className="w-24 h-24 bg-muted rounded-lg flex items-center justify-center">
                      <FileText className="w-10 h-10 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="font-medium" data-testid="text-filename">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {file.type.startsWith("image/") ? "Image file" : "PDF document"}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={resetUpload} data-testid="button-remove">
                    Remove
                  </Button>
                </div>
                <Button onClick={handleExtract} className="w-full gap-2" data-testid="button-extract">
                  <Sparkles className="w-4 h-4" />
                  Extract Text
                </Button>
              </div>
            )}

            {(uploadState === "uploading" || uploadState === "processing") && (
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                  <ScanText className="w-10 h-10 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="font-medium">{file?.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {uploadState === "uploading" ? "Uploading..." : "Extracting text..."}
                    </p>
                  </div>
                </div>
                <Progress value={progress} className="h-2" data-testid="progress-ocr" />
                <p className="text-sm text-center text-muted-foreground">
                  {uploadState === "uploading"
                    ? "Uploading your image..."
                    : "AI is reading text from your image..."}
                </p>
              </div>
            )}

            {uploadState === "error" && (
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-red-500/10 rounded-lg">
                  <AlertCircle className="w-10 h-10 text-red-500" />
                  <div className="flex-1">
                    <p className="font-medium text-red-600 dark:text-red-400">
                      Error occurred
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Could not extract text. Please try again.
                    </p>
                  </div>
                  <Button variant="outline" onClick={resetUpload} data-testid="button-try-again">
                    Try Again
                  </Button>
                </div>
              </div>
            )}

            {uploadState === "complete" && result && (
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-green-500/10 rounded-lg">
                  <CheckCircle className="w-10 h-10 text-green-500" />
                  <div className="flex-1">
                    <p className="font-medium text-green-600 dark:text-green-400">
                      Text Extraction Complete!
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {result.wordCount.toLocaleString()} words extracted
                    </p>
                  </div>
                  <div className="text-center mr-4">
                    <p className={`text-2xl font-bold ${getConfidenceColor(result.confidence)}`} data-testid="text-confidence">
                      {result.confidence}%
                    </p>
                    <p className="text-xs text-muted-foreground">Confidence</p>
                  </div>
                  <Button variant="outline" onClick={resetUpload} data-testid="button-extract-another">
                    Extract Another
                  </Button>
                </div>

                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="text-base">Extracted Text</CardTitle>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleCopy}
                          data-testid="button-copy-text"
                        >
                          <Copy className="w-4 h-4 mr-2" />
                          Copy
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleDownload}
                          data-testid="button-download-text"
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Download
                        </Button>
                      </div>
                    </div>
                    {result.language && (
                      <p className="text-sm text-muted-foreground">
                        Detected language: {result.language}
                      </p>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="max-h-[400px] overflow-y-auto p-4 bg-muted/30 rounded-lg">
                      <p className="text-sm leading-relaxed whitespace-pre-wrap font-mono" data-testid="text-extracted">
                        {result.extractedText}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {previewUrl && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Original Image</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <img
                        src={previewUrl}
                        alt="Original"
                        className="max-w-full max-h-[300px] object-contain mx-auto rounded-lg"
                        data-testid="img-original"
                      />
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
