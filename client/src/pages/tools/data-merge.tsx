import { useState } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileUp, Merge, ArrowLeft, CheckCircle, Download, AlertCircle, FileSpreadsheet, X } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

type UploadState = "idle" | "uploading" | "processing" | "complete" | "error";

interface MergeResult {
  downloadUrl: string;
  filename: string;
  rowCount: number;
  columnCount: number;
}

const OUTPUT_FORMATS = [
  { value: "xlsx", label: "Excel (.xlsx)" },
  { value: "csv", label: "CSV (.csv)" },
  { value: "json", label: "JSON (.json)" },
];

export default function DataMerge() {
  const [files, setFiles] = useState<File[]>([]);
  const [outputFormat, setOutputFormat] = useState("xlsx");
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<MergeResult | null>(null);
  const { toast } = useToast();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    const validTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "text/csv",
      "application/json",
    ];
    
    const validFiles = selectedFiles.filter(file => 
      validTypes.includes(file.type) || 
      file.name.endsWith(".csv") || 
      file.name.endsWith(".xlsx") || 
      file.name.endsWith(".xls") ||
      file.name.endsWith(".json")
    );
    
    if (validFiles.length !== selectedFiles.length) {
      toast({
        title: "Some files skipped",
        description: "Only Excel, CSV, and JSON files are supported",
        variant: "destructive",
      });
    }
    
    if (validFiles.length > 0) {
      setFiles(prev => [...prev, ...validFiles]);
      setUploadState("idle");
      setResult(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files);
    const validTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "text/csv",
      "application/json",
    ];
    
    const validFiles = droppedFiles.filter(file => 
      validTypes.includes(file.type) || 
      file.name.endsWith(".csv") || 
      file.name.endsWith(".xlsx") || 
      file.name.endsWith(".xls") ||
      file.name.endsWith(".json")
    );
    
    if (validFiles.length > 0) {
      setFiles(prev => [...prev, ...validFiles]);
      setUploadState("idle");
      setResult(null);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleMerge = async () => {
    if (files.length < 2) {
      toast({
        title: "Not enough files",
        description: "Please add at least 2 files to merge",
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
      formData.append("outputFormat", outputFormat);
      
      setProgress(50);
      setUploadState("processing");
      
      const response = await fetch("/api/tools/data-merge", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      
      setProgress(80);
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || "Failed to merge files");
      }
      
      setProgress(100);
      setUploadState("complete");
      setResult({
        downloadUrl: data.downloadUrl,
        filename: data.filename || `merged_data.${outputFormat}`,
        rowCount: data.rowCount || 0,
        columnCount: data.columnCount || 0,
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
      description: "Your merged file is downloading",
    });
  };

  const resetUpload = () => {
    setFiles([]);
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
            <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Merge className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold" data-testid="text-page-title">Data Merge</h1>
              <p className="text-muted-foreground">Combine multiple data files into one</p>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Merge Data Files</CardTitle>
            <CardDescription>
              Upload Excel, CSV, or JSON files to merge them together
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {(uploadState === "idle" || uploadState === "error") && !result && (
              <>
                <div
                  className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors hover:border-primary/50 hover:bg-muted/50"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                  onClick={() => document.getElementById("file-input")?.click()}
                  data-testid="dropzone-upload"
                >
                  <FileUp className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
                  <p className="font-medium mb-1">Drop files here or click to browse</p>
                  <p className="text-sm text-muted-foreground">Excel (.xlsx, .xls), CSV, or JSON files</p>
                  <input
                    id="file-input"
                    type="file"
                    accept=".xlsx,.xls,.csv,.json"
                    multiple
                    className="hidden"
                    onChange={handleFileSelect}
                    data-testid="input-file"
                  />
                </div>

                {files.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Files to merge ({files.length}):</p>
                    <div className="space-y-2 max-h-[200px] overflow-y-auto">
                      {files.map((file, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
                          data-testid={`file-item-${index}`}
                        >
                          <FileSpreadsheet className="w-5 h-5 text-muted-foreground shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{file.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {(file.size / 1024).toFixed(1)} KB
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeFile(index);
                            }}
                            data-testid={`button-remove-${index}`}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium mb-2 block">Output Format</label>
                  <Select value={outputFormat} onValueChange={setOutputFormat}>
                    <SelectTrigger data-testid="select-format">
                      <SelectValue placeholder="Select output format" />
                    </SelectTrigger>
                    <SelectContent>
                      {OUTPUT_FORMATS.map((format) => (
                        <SelectItem key={format.value} value={format.value}>
                          {format.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={handleMerge}
                  className="w-full gap-2"
                  disabled={files.length < 2}
                  data-testid="button-merge"
                >
                  <Merge className="w-4 h-4" />
                  Merge {files.length} File{files.length !== 1 ? "s" : ""}
                </Button>
              </>
            )}

            {(uploadState === "uploading" || uploadState === "processing") && (
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                  <Merge className="w-10 h-10 text-muted-foreground animate-pulse" />
                  <div className="flex-1">
                    <p className="font-medium">Merging {files.length} files...</p>
                    <p className="text-sm text-muted-foreground">
                      {uploadState === "uploading" ? "Uploading files..." : "Combining data..."}
                    </p>
                  </div>
                </div>
                <Progress value={progress} className="h-2" data-testid="progress-merge" />
              </div>
            )}

            {uploadState === "error" && (
              <div className="flex items-center gap-4 p-4 bg-red-500/10 rounded-lg mt-4">
                <AlertCircle className="w-10 h-10 text-red-500" />
                <div className="flex-1">
                  <p className="font-medium text-red-600 dark:text-red-400">
                    Merge Failed
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Could not merge files. Please check file formats and try again.
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
                      Merge Complete!
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {result.rowCount.toLocaleString()} rows, {result.columnCount} columns
                    </p>
                  </div>
                  <Button variant="outline" onClick={resetUpload} data-testid="button-merge-another">
                    Merge More Files
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
