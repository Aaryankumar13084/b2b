import { useState } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LayoutGrid, Upload, Download, ArrowLeft, CheckCircle, X } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

type UploadState = "idle" | "uploading" | "processing" | "complete" | "error";

export default function CollageMaker() {
  const [files, setFiles] = useState<File[]>([]);
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [progress, setProgress] = useState(0);
  const [columns, setColumns] = useState("2");
  const [spacing, setSpacing] = useState("10");
  const [result, setResult] = useState<any>(null);
  const { toast } = useToast();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    const imageFiles = selectedFiles.filter(f => f.type.startsWith("image/"));
    if (imageFiles.length !== selectedFiles.length) {
      toast({
        title: "Some files skipped",
        description: "Only image files are accepted",
        variant: "destructive",
      });
    }
    setFiles(prev => [...prev, ...imageFiles]);
    setUploadState("idle");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files);
    const imageFiles = droppedFiles.filter(f => f.type.startsWith("image/"));
    if (imageFiles.length !== droppedFiles.length) {
      toast({
        title: "Some files skipped",
        description: "Only image files are accepted",
        variant: "destructive",
      });
    }
    setFiles(prev => [...prev, ...imageFiles]);
    setUploadState("idle");
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleCreate = async () => {
    if (files.length < 2) {
      toast({
        title: "Need more images",
        description: "Please add at least 2 images to create a collage",
        variant: "destructive",
      });
      return;
    }
    
    setUploadState("uploading");
    setProgress(20);

    try {
      const formData = new FormData();
      files.forEach(file => {
        formData.append("files", file);
      });
      formData.append("columns", columns);
      formData.append("spacing", spacing);

      setProgress(50);
      setUploadState("processing");

      const response = await fetch("/api/tools/collage", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      setProgress(100);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create collage");
      }

      const data = await response.json();
      setResult(data);
      setUploadState("complete");
      toast({
        title: "Collage Created",
        description: `Created collage with ${files.length} images`,
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
    setFiles([]);
    setUploadState("idle");
    setProgress(0);
    setResult(null);
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
            <div className="w-12 h-12 rounded-lg bg-pink-500/10 flex items-center justify-center">
              <LayoutGrid className="w-6 h-6 text-pink-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold" data-testid="text-page-title">Collage Maker</h1>
              <p className="text-muted-foreground">Combine multiple images into a collage</p>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Upload your images</CardTitle>
            <CardDescription>
              Add multiple images to create a photo collage
            </CardDescription>
          </CardHeader>
          <CardContent>
            {uploadState === "idle" && (
              <div className="space-y-6">
                <div
                  className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors hover:border-primary/50 hover:bg-muted/50"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                  onClick={() => document.getElementById("file-input")?.click()}
                  data-testid="dropzone-upload"
                >
                  <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
                  <p className="font-medium mb-1">Drop images here</p>
                  <p className="text-sm text-muted-foreground mb-3">or click to browse</p>
                  <input
                    id="file-input"
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleFileSelect}
                    data-testid="input-file"
                  />
                  <Button variant="outline" size="sm" data-testid="button-browse">
                    Browse Files
                  </Button>
                </div>

                {files.length > 0 && (
                  <>
                    <div className="space-y-2">
                      <Label>Selected Images ({files.length})</Label>
                      <div className="grid grid-cols-4 gap-2">
                        {files.map((file, index) => (
                          <div key={index} className="relative group">
                            <img
                              src={URL.createObjectURL(file)}
                              alt={file.name}
                              className="w-full h-20 object-cover rounded"
                            />
                            <Button
                              size="icon"
                              variant="destructive"
                              className="absolute top-1 right-1 w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => removeFile(index)}
                              data-testid={`button-remove-${index}`}
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="columns">Columns</Label>
                        <Input
                          id="columns"
                          type="number"
                          min="1"
                          max="6"
                          value={columns}
                          onChange={(e) => setColumns(e.target.value)}
                          data-testid="input-columns"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="spacing">Spacing (px)</Label>
                        <Input
                          id="spacing"
                          type="number"
                          min="0"
                          max="50"
                          value={spacing}
                          onChange={(e) => setSpacing(e.target.value)}
                          data-testid="input-spacing"
                        />
                      </div>
                    </div>

                    <Button onClick={handleCreate} className="w-full" disabled={files.length < 2} data-testid="button-create">
                      Create Collage
                    </Button>
                  </>
                )}
              </div>
            )}

            {(uploadState === "uploading" || uploadState === "processing") && (
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                  <LayoutGrid className="w-10 h-10 text-muted-foreground animate-pulse" />
                  <div className="flex-1">
                    <p className="font-medium">{files.length} images</p>
                    <p className="text-sm text-muted-foreground">
                      {uploadState === "uploading" ? "Uploading..." : "Creating collage..."}
                    </p>
                  </div>
                </div>
                <Progress value={progress} className="h-2" data-testid="progress-collage" />
              </div>
            )}

            {uploadState === "complete" && (
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-green-500/10 rounded-lg">
                  <CheckCircle className="w-10 h-10 text-green-500" />
                  <div className="flex-1">
                    <p className="font-medium text-green-600 dark:text-green-400">
                      Collage Created!
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Combined {files.length} images
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button onClick={handleDownload} className="flex-1 gap-2" data-testid="button-download">
                    <Download className="w-4 h-4" />
                    Download Collage
                  </Button>
                  <Button variant="outline" onClick={resetUpload} data-testid="button-create-another">
                    Create Another
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
