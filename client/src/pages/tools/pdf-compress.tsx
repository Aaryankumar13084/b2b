import { useState } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Minimize2, Upload, Download, ArrowLeft, CheckCircle } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

type UploadState = "idle" | "uploading" | "processing" | "complete" | "error";

export default function PdfCompress() {
  const [file, setFile] = useState<File | null>(null);
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [progress, setProgress] = useState(0);
  const [compressionLevel, setCompressionLevel] = useState([50]);
  const [originalSize, setOriginalSize] = useState(0);
  const [compressedSize, setCompressedSize] = useState(0);
  const { toast } = useToast();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== "application/pdf") {
        toast({
          title: "Invalid file type",
          description: "Please select a PDF file",
          variant: "destructive",
        });
        return;
      }
      setFile(selectedFile);
      setOriginalSize(selectedFile.size);
      setUploadState("idle");
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      if (droppedFile.type !== "application/pdf") {
        toast({
          title: "Invalid file type",
          description: "Please select a PDF file",
          variant: "destructive",
        });
        return;
      }
      setFile(droppedFile);
      setOriginalSize(droppedFile.size);
      setUploadState("idle");
    }
  };

  const handleCompress = async () => {
    if (!file) return;
    
    setUploadState("uploading");
    setProgress(0);

    const uploadInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 40) {
          clearInterval(uploadInterval);
          return prev;
        }
        return prev + 10;
      });
    }, 200);

    setTimeout(() => {
      setUploadState("processing");
      const processInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            clearInterval(processInterval);
            setUploadState("complete");
            // Simulate compression result based on level
            const reduction = compressionLevel[0] / 100;
            setCompressedSize(Math.floor(originalSize * (1 - reduction * 0.7)));
            return 100;
          }
          return prev + 15;
        });
      }, 300);
    }, 1000);
  };

  const handleDownload = () => {
    toast({
      title: "Download started",
      description: "Your compressed PDF is being downloaded",
    });
  };

  const resetUpload = () => {
    setFile(null);
    setUploadState("idle");
    setProgress(0);
    setOriginalSize(0);
    setCompressedSize(0);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getCompressionLabel = () => {
    if (compressionLevel[0] < 30) return "Low (Better Quality)";
    if (compressionLevel[0] < 70) return "Medium (Balanced)";
    return "High (Smaller Size)";
  };

  return (
    <DashboardLayout>
      <div className="p-6 max-w-4xl mx-auto">
        <div className="mb-6">
          <Link href="/tools">
            <Button variant="ghost" size="sm" className="gap-2 mb-4" data-testid="button-back">
              <ArrowLeft className="w-4 h-4" />
              Back to Tools
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-orange-500/10 flex items-center justify-center">
              <Minimize2 className="w-6 h-6 text-orange-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold" data-testid="text-page-title">Compress PDF</h1>
              <p className="text-muted-foreground">Reduce PDF file size while maintaining quality</p>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Upload your PDF</CardTitle>
            <CardDescription>
              Choose compression level to balance between quality and file size
            </CardDescription>
          </CardHeader>
          <CardContent>
            {uploadState === "idle" && !file && (
              <div
                className="border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors hover:border-primary/50 hover:bg-muted/50"
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => document.getElementById("file-input")?.click()}
                data-testid="dropzone-upload"
              >
                <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-lg font-medium mb-2">Drop your PDF here</p>
                <p className="text-muted-foreground mb-4">or click to browse files</p>
                <input
                  id="file-input"
                  type="file"
                  accept=".pdf"
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
              <div className="space-y-6">
                <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                  <Minimize2 className="w-10 h-10 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="font-medium" data-testid="text-filename">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={resetUpload} data-testid="button-remove">
                    Remove
                  </Button>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Compression Level</Label>
                    <span className="text-sm text-muted-foreground" data-testid="text-compression-label">
                      {getCompressionLabel()}
                    </span>
                  </div>
                  <Slider
                    value={compressionLevel}
                    onValueChange={setCompressionLevel}
                    max={100}
                    step={1}
                    className="w-full"
                    data-testid="slider-compression"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Better Quality</span>
                    <span>Smaller Size</span>
                  </div>
                </div>

                <Button onClick={handleCompress} className="w-full" data-testid="button-compress">
                  Compress PDF
                </Button>
              </div>
            )}

            {(uploadState === "uploading" || uploadState === "processing") && (
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                  <Minimize2 className="w-10 h-10 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="font-medium">{file?.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {uploadState === "uploading" ? "Uploading..." : "Compressing..."}
                    </p>
                  </div>
                </div>
                <Progress value={progress} className="h-2" data-testid="progress-compression" />
                <p className="text-sm text-center text-muted-foreground">
                  {uploadState === "uploading" 
                    ? "Uploading your file..." 
                    : "Optimizing your PDF..."}
                </p>
              </div>
            )}

            {uploadState === "complete" && (
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-green-500/10 rounded-lg">
                  <CheckCircle className="w-10 h-10 text-green-500" />
                  <div className="flex-1">
                    <p className="font-medium text-green-600 dark:text-green-400">
                      Compression Complete!
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Reduced from {formatFileSize(originalSize)} to {formatFileSize(compressedSize)}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Original</p>
                    <p className="font-semibold" data-testid="text-original-size">
                      {formatFileSize(originalSize)}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Compressed</p>
                    <p className="font-semibold text-green-600 dark:text-green-400" data-testid="text-compressed-size">
                      {formatFileSize(compressedSize)}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Saved</p>
                    <p className="font-semibold text-primary" data-testid="text-saved">
                      {Math.round((1 - compressedSize / originalSize) * 100)}%
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button onClick={handleDownload} className="flex-1 gap-2" data-testid="button-download">
                    <Download className="w-4 h-4" />
                    Download Compressed PDF
                  </Button>
                  <Button variant="outline" onClick={resetUpload} data-testid="button-compress-another">
                    Compress Another
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
