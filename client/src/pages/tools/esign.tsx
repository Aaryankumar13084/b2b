import { useState, useRef } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PenTool, Upload, Download, ArrowLeft, CheckCircle } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

type UploadState = "idle" | "uploading" | "processing" | "complete" | "error";

export default function ESign() {
  const [file, setFile] = useState<File | null>(null);
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [progress, setProgress] = useState(0);
  const [signature, setSignature] = useState("");
  const [page, setPage] = useState("1");
  const [xPos, setXPos] = useState("100");
  const [yPos, setYPos] = useState("100");
  const [result, setResult] = useState<any>(null);
  const { toast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

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
      setUploadState("idle");
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 2;
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      setSignature(canvas.toDataURL());
    }
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setSignature("");
      }
    }
  };

  const handleSign = async () => {
    if (!file || !signature) {
      toast({
        title: "Missing signature",
        description: "Please draw your signature",
        variant: "destructive",
      });
      return;
    }
    
    setUploadState("uploading");
    setProgress(20);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("signature", signature);
      formData.append("page", page);
      formData.append("x", xPos);
      formData.append("y", yPos);
      formData.append("width", "150");
      formData.append("height", "50");

      setProgress(50);
      setUploadState("processing");

      const response = await fetch("/api/tools/esign", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      setProgress(100);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to add signature");
      }

      const data = await response.json();
      setResult(data);
      setUploadState("complete");
      toast({
        title: "Document Signed",
        description: "Your signature has been added to the PDF",
      });
    } catch (error: any) {
      setUploadState("error");
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDownload = () => {
    if (result?.outputPath) {
      const filename = result.outputPath.split("/").pop();
      window.open(`/api/tools/download/${filename}`, "_blank");
    }
  };

  const resetUpload = () => {
    setFile(null);
    setUploadState("idle");
    setProgress(0);
    setResult(null);
    clearSignature();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
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
            <div className="w-12 h-12 rounded-lg bg-indigo-500/10 flex items-center justify-center">
              <PenTool className="w-6 h-6 text-indigo-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold" data-testid="text-page-title">E-Sign Document</h1>
              <p className="text-muted-foreground">Add your digital signature to PDF documents</p>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Upload and Sign</CardTitle>
            <CardDescription>
              Draw your signature and place it on your PDF
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
                  <PenTool className="w-10 h-10 text-muted-foreground" />
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

                <div className="space-y-2">
                  <Label>Draw Your Signature</Label>
                  <div className="border rounded-lg p-2 bg-white">
                    <canvas
                      ref={canvasRef}
                      width={400}
                      height={150}
                      className="border rounded cursor-crosshair w-full"
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      data-testid="canvas-signature"
                    />
                  </div>
                  <Button variant="outline" size="sm" onClick={clearSignature} data-testid="button-clear-signature">
                    Clear Signature
                  </Button>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="page">Page Number</Label>
                    <Input
                      id="page"
                      type="number"
                      min="1"
                      value={page}
                      onChange={(e) => setPage(e.target.value)}
                      data-testid="input-page"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="x">X Position</Label>
                    <Input
                      id="x"
                      type="number"
                      min="0"
                      value={xPos}
                      onChange={(e) => setXPos(e.target.value)}
                      data-testid="input-x"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="y">Y Position</Label>
                    <Input
                      id="y"
                      type="number"
                      min="0"
                      value={yPos}
                      onChange={(e) => setYPos(e.target.value)}
                      data-testid="input-y"
                    />
                  </div>
                </div>

                <Button onClick={handleSign} className="w-full" disabled={!signature} data-testid="button-sign">
                  Sign Document
                </Button>
              </div>
            )}

            {(uploadState === "uploading" || uploadState === "processing") && (
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                  <PenTool className="w-10 h-10 text-muted-foreground animate-pulse" />
                  <div className="flex-1">
                    <p className="font-medium">{file?.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {uploadState === "uploading" ? "Uploading..." : "Adding signature..."}
                    </p>
                  </div>
                </div>
                <Progress value={progress} className="h-2" data-testid="progress-sign" />
              </div>
            )}

            {uploadState === "complete" && (
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-green-500/10 rounded-lg">
                  <CheckCircle className="w-10 h-10 text-green-500" />
                  <div className="flex-1">
                    <p className="font-medium text-green-600 dark:text-green-400">
                      Document Signed!
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Your signature has been added
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button onClick={handleDownload} className="flex-1 gap-2" data-testid="button-download">
                    <Download className="w-4 h-4" />
                    Download Signed PDF
                  </Button>
                  <Button variant="outline" onClick={resetUpload} data-testid="button-sign-another">
                    Sign Another
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
