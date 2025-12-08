import { useState } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileImage, Upload, Download, ArrowLeft, CheckCircle, X, GripVertical } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

type UploadState = "idle" | "uploading" | "processing" | "complete" | "error";

export default function ImageToPdf() {
  const [files, setFiles] = useState<File[]>([]);
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [progress, setProgress] = useState(0);
  const [pageSize, setPageSize] = useState("a4");
  const [orientation, setOrientation] = useState("portrait");
  const [result, setResult] = useState<any>(null);
  const { toast } = useToast();

  const validImageTypes = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/bmp"];

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    const validFiles = selectedFiles.filter(f => validImageTypes.includes(f.type));
    
    if (validFiles.length !== selectedFiles.length) {
      toast({
        title: "Some files skipped",
        description: "Only image files (JPG, PNG, GIF, WebP) are supported",
        variant: "destructive",
      });
    }
    
    if (validFiles.length > 0) {
      setFiles(prev => [...prev, ...validFiles]);
      setUploadState("idle");
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files);
    const validFiles = droppedFiles.filter(f => validImageTypes.includes(f.type));
    
    if (validFiles.length !== droppedFiles.length) {
      toast({
        title: "Some files skipped",
        description: "Only image files (JPG, PNG, GIF, WebP) are supported",
        variant: "destructive",
      });
    }
    
    if (validFiles.length > 0) {
      setFiles(prev => [...prev, ...validFiles]);
      setUploadState("idle");
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const moveFile = (from: number, to: number) => {
    if (to < 0 || to >= files.length) return;
    const newFiles = [...files];
    const [removed] = newFiles.splice(from, 1);
    newFiles.splice(to, 0, removed);
    setFiles(newFiles);
  };

  const handleConvert = async () => {
    if (files.length === 0) {
      toast({
        title: "No images selected",
        description: "Please add at least one image",
        variant: "destructive",
      });
      return;
    }
    
    setUploadState("uploading");
    setProgress(20);

    try {
      const formData = new FormData();
      files.forEach((file) => {
        formData.append("files", file);
      });
      formData.append("pageSize", pageSize);
      formData.append("orientation", orientation);

      setProgress(50);
      setUploadState("processing");

      const response = await fetch("/api/tools/image-to-pdf", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      setProgress(100);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create PDF");
      }

      const data = await response.json();
      setResult(data);
      setUploadState("complete");
      toast({
        title: "PDF Created",
        description: `Combined ${files.length} image(s) into a PDF`,
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

  const totalSize = files.reduce((sum, f) => sum + f.size, 0);

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
            <div className="w-12 h-12 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <FileImage className="w-6 h-6 text-emerald-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold" data-testid="text-page-title">Images to PDF</h1>
              <p className="text-muted-foreground">Combine multiple images into a single PDF document</p>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Upload your images</CardTitle>
            <CardDescription>
              Drag and drop images to reorder them. They will appear in the PDF in the same order.
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
                  <p className="text-lg font-medium mb-1">Drop images here</p>
                  <p className="text-sm text-muted-foreground mb-3">or click to browse (JPG, PNG, GIF, WebP)</p>
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
                      <div className="flex items-center justify-between">
                        <Label>{files.length} image(s) selected</Label>
                        <span className="text-sm text-muted-foreground">
                          Total: {formatFileSize(totalSize)}
                        </span>
                      </div>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {files.map((file, index) => (
                          <div key={index} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                            <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
                            <div className="w-10 h-10 bg-muted rounded overflow-hidden flex-shrink-0">
                              <img
                                src={URL.createObjectURL(file)}
                                alt={file.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate" data-testid={`text-filename-${index}`}>
                                {file.name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {formatFileSize(file.size)}
                              </p>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => moveFile(index, index - 1)}
                                disabled={index === 0}
                                data-testid={`button-move-up-${index}`}
                              >
                                <span className="text-xs">Up</span>
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => moveFile(index, index + 1)}
                                disabled={index === files.length - 1}
                                data-testid={`button-move-down-${index}`}
                              >
                                <span className="text-xs">Down</span>
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeFile(index)}
                                data-testid={`button-remove-${index}`}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Page Size</Label>
                        <Select value={pageSize} onValueChange={setPageSize}>
                          <SelectTrigger data-testid="select-page-size">
                            <SelectValue placeholder="Select size" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="a4">A4</SelectItem>
                            <SelectItem value="letter">Letter</SelectItem>
                            <SelectItem value="legal">Legal</SelectItem>
                            <SelectItem value="fit">Fit to Image</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Orientation</Label>
                        <Select value={orientation} onValueChange={setOrientation}>
                          <SelectTrigger data-testid="select-orientation">
                            <SelectValue placeholder="Select orientation" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="portrait">Portrait</SelectItem>
                            <SelectItem value="landscape">Landscape</SelectItem>
                            <SelectItem value="auto">Auto (per image)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <Button onClick={handleConvert} className="flex-1" data-testid="button-convert">
                        Create PDF
                      </Button>
                      <Button variant="outline" onClick={resetUpload} data-testid="button-clear-all">
                        Clear All
                      </Button>
                    </div>
                  </>
                )}
              </div>
            )}

            {(uploadState === "uploading" || uploadState === "processing") && (
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                  <FileImage className="w-10 h-10 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="font-medium">{files.length} images</p>
                    <p className="text-sm text-muted-foreground">
                      {uploadState === "uploading" ? "Uploading..." : "Creating PDF..."}
                    </p>
                  </div>
                </div>
                <Progress value={progress} className="h-2" data-testid="progress-conversion" />
                <p className="text-sm text-center text-muted-foreground">
                  {uploadState === "uploading" 
                    ? "Uploading your images..." 
                    : "Combining images into PDF..."}
                </p>
              </div>
            )}

            {uploadState === "complete" && (
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-green-500/10 rounded-lg">
                  <CheckCircle className="w-10 h-10 text-green-500" />
                  <div className="flex-1">
                    <p className="font-medium text-green-600 dark:text-green-400">
                      PDF Created!
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Combined {files.length} image(s) into a single PDF
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button onClick={handleDownload} className="flex-1 gap-2" data-testid="button-download">
                    <Download className="w-4 h-4" />
                    Download PDF
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
