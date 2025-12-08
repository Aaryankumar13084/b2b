import { useState } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { FileUp, Presentation, ArrowLeft, CheckCircle, Download, AlertCircle, FileText } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

type UploadState = "idle" | "uploading" | "processing" | "complete" | "error";

interface ConversionResult {
  downloadUrl: string;
  filename: string;
  pageCount: number;
}

export default function PdfToPpt() {
  const [file, setFile] = useState<File | null>(null);
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ConversionResult | null>(null);
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
      setUploadState("idle");
      setResult(null);
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
      setResult(null);
    }
  };

  const handleConvert = async () => {
    if (!file) return;

    setUploadState("uploading");
    setProgress(20);

    try {
      const formData = new FormData();
      formData.append("file", file);
      
      setProgress(40);
      
      const response = await fetch("/api/tools/pdf-to-ppt", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      
      setProgress(70);
      setUploadState("processing");
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || "Failed to convert PDF");
      }
      
      setProgress(100);
      setUploadState("complete");
      setResult({
        downloadUrl: data.downloadUrl,
        filename: data.filename || file.name.replace(".pdf", ".pptx"),
        pageCount: data.pageCount || 1,
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

  const handleDownload = () => {
    if (!result?.downloadUrl) return;
    window.open(result.downloadUrl, "_blank");
    toast({
      title: "Download started",
      description: "Your PowerPoint is downloading",
    });
  };

  const resetUpload = () => {
    setFile(null);
    setUploadState("idle");
    setProgress(0);
    setResult(null);
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
              <Presentation className="w-6 h-6 text-orange-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold" data-testid="text-page-title">PDF to PowerPoint</h1>
              <p className="text-muted-foreground">Convert PDF documents to editable PowerPoint presentations</p>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Convert PDF to PPT</CardTitle>
            <CardDescription>
              Upload a PDF file to convert it to a PowerPoint presentation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {uploadState === "idle" && !result && (
              <>
                <div
                  className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors hover:border-primary/50 hover:bg-muted/50"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                  onClick={() => document.getElementById("file-input")?.click()}
                  data-testid="dropzone-upload"
                >
                  {file ? (
                    <div className="flex items-center justify-center gap-4">
                      <FileText className="w-10 h-10 text-muted-foreground" />
                      <div className="text-left">
                        <p className="font-medium" data-testid="text-filename">{file.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFile(null);
                        }}
                        data-testid="button-remove"
                      >
                        Remove
                      </Button>
                    </div>
                  ) : (
                    <>
                      <FileUp className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
                      <p className="font-medium mb-1">Drop your PDF here</p>
                      <p className="text-sm text-muted-foreground">or click to browse</p>
                    </>
                  )}
                  <input
                    id="file-input"
                    type="file"
                    accept=".pdf"
                    className="hidden"
                    onChange={handleFileSelect}
                    data-testid="input-file"
                  />
                </div>

                <Button
                  onClick={handleConvert}
                  className="w-full gap-2"
                  disabled={!file}
                  data-testid="button-convert"
                >
                  <Presentation className="w-4 h-4" />
                  Convert to PowerPoint
                </Button>
              </>
            )}

            {(uploadState === "uploading" || uploadState === "processing") && (
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                  <Presentation className="w-10 h-10 text-muted-foreground animate-pulse" />
                  <div className="flex-1">
                    <p className="font-medium">{file?.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {uploadState === "uploading" ? "Uploading..." : "Converting to PowerPoint..."}
                    </p>
                  </div>
                </div>
                <Progress value={progress} className="h-2" data-testid="progress-convert" />
              </div>
            )}

            {uploadState === "error" && (
              <div className="flex items-center gap-4 p-4 bg-red-500/10 rounded-lg">
                <AlertCircle className="w-10 h-10 text-red-500" />
                <div className="flex-1">
                  <p className="font-medium text-red-600 dark:text-red-400">
                    Conversion Failed
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Could not convert PDF. Please try again.
                  </p>
                </div>
                <Button variant="outline" onClick={resetUpload} data-testid="button-try-again">
                  Try Again
                </Button>
              </div>
            )}

            {uploadState === "complete" && result && (
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-green-500/10 rounded-lg">
                  <CheckCircle className="w-10 h-10 text-green-500" />
                  <div className="flex-1">
                    <p className="font-medium text-green-600 dark:text-green-400">
                      Conversion Complete!
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {result.pageCount} page{result.pageCount !== 1 ? "s" : ""} converted
                    </p>
                  </div>
                  <Button variant="outline" onClick={resetUpload} data-testid="button-convert-another">
                    Convert Another
                  </Button>
                </div>

                <Button onClick={handleDownload} className="w-full gap-2" data-testid="button-download">
                  <Download className="w-4 h-4" />
                  Download {result.filename}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
