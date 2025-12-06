import { useState } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Layers, Upload, Download, ArrowLeft, CheckCircle, X, GripVertical } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

type UploadState = "idle" | "uploading" | "processing" | "complete" | "error";

interface FileItem {
  id: string;
  file: File;
}

export default function PdfMerge() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    const validFiles = selectedFiles.filter(f => f.type === "application/pdf");
    
    if (validFiles.length !== selectedFiles.length) {
      toast({
        title: "Some files skipped",
        description: "Only PDF files are accepted",
        variant: "destructive",
      });
    }

    const newFiles = validFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
    }));
    setFiles(prev => [...prev, ...newFiles]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files);
    const validFiles = droppedFiles.filter(f => f.type === "application/pdf");

    if (validFiles.length !== droppedFiles.length) {
      toast({
        title: "Some files skipped",
        description: "Only PDF files are accepted",
        variant: "destructive",
      });
    }

    const newFiles = validFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
    }));
    setFiles(prev => [...prev, ...newFiles]);
  };

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const handleMerge = async () => {
    if (files.length < 2) {
      toast({
        title: "Not enough files",
        description: "Please add at least 2 PDF files to merge",
        variant: "destructive",
      });
      return;
    }
    
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
      description: "Your merged PDF is being downloaded",
    });
  };

  const resetUpload = () => {
    setFiles([]);
    setUploadState("idle");
    setProgress(0);
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
            <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <Layers className="w-6 h-6 text-purple-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold" data-testid="text-page-title">Merge PDFs</h1>
              <p className="text-muted-foreground">Combine multiple PDF files into one document</p>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Upload your PDF files</CardTitle>
            <CardDescription>
              Add at least 2 PDF files. You can drag to reorder them before merging.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {uploadState === "idle" && (
              <>
                <div
                  className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors hover:border-primary/50 hover:bg-muted/50 mb-4"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                  onClick={() => document.getElementById("file-input")?.click()}
                  data-testid="dropzone-upload"
                >
                  <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
                  <p className="font-medium mb-1">Drop PDF files here</p>
                  <p className="text-sm text-muted-foreground">or click to browse</p>
                  <input
                    id="file-input"
                    type="file"
                    accept=".pdf"
                    multiple
                    className="hidden"
                    onChange={handleFileSelect}
                    data-testid="input-file"
                  />
                </div>

                {files.length > 0 && (
                  <div className="space-y-2 mb-4">
                    <p className="text-sm font-medium text-muted-foreground">
                      {files.length} file{files.length !== 1 ? "s" : ""} selected
                    </p>
                    {files.map((item, index) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
                        data-testid={`file-item-${index}`}
                      >
                        <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
                        <Layers className="w-5 h-5 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{item.file.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {(item.file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeFile(item.id)}
                          data-testid={`button-remove-${index}`}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {files.length >= 2 && (
                  <Button onClick={handleMerge} className="w-full" data-testid="button-merge">
                    Merge {files.length} PDFs
                  </Button>
                )}
              </>
            )}

            {(uploadState === "uploading" || uploadState === "processing") && (
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                  <Layers className="w-10 h-10 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="font-medium">Merging {files.length} files</p>
                    <p className="text-sm text-muted-foreground">
                      {uploadState === "uploading" ? "Uploading..." : "Merging..."}
                    </p>
                  </div>
                </div>
                <Progress value={progress} className="h-2" data-testid="progress-merge" />
                <p className="text-sm text-center text-muted-foreground">
                  {uploadState === "uploading" 
                    ? "Uploading your files..." 
                    : "Combining PDFs into one document..."}
                </p>
              </div>
            )}

            {uploadState === "complete" && (
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-green-500/10 rounded-lg">
                  <CheckCircle className="w-10 h-10 text-green-500" />
                  <div className="flex-1">
                    <p className="font-medium text-green-600 dark:text-green-400">
                      Merge Complete!
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Your merged PDF is ready for download
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button onClick={handleDownload} className="flex-1 gap-2" data-testid="button-download">
                    <Download className="w-4 h-4" />
                    Download Merged PDF
                  </Button>
                  <Button variant="outline" onClick={resetUpload} data-testid="button-merge-another">
                    Merge More
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
