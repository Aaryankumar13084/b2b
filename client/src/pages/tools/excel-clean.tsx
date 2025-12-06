import { useState } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ClipboardList, Upload, Download, ArrowLeft, CheckCircle, AlertTriangle } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

type UploadState = "idle" | "uploading" | "processing" | "complete" | "error";

export default function ExcelClean() {
  const [file, setFile] = useState<File | null>(null);
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<any>(null);
  const { toast } = useToast();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const validTypes = [".xlsx", ".xls", ".csv"];
      const isValid = validTypes.some((ext) => selectedFile.name.toLowerCase().endsWith(ext));
      if (!isValid) {
        toast({
          title: "Invalid file type",
          description: "Please select an Excel or CSV file",
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
      const validTypes = [".xlsx", ".xls", ".csv"];
      const isValid = validTypes.some((ext) => droppedFile.name.toLowerCase().endsWith(ext));
      if (!isValid) {
        toast({
          title: "Invalid file type",
          description: "Please select an Excel or CSV file",
          variant: "destructive",
        });
        return;
      }
      setFile(droppedFile);
      setUploadState("idle");
    }
  };

  const handleClean = async () => {
    if (!file) return;
    
    setUploadState("uploading");
    setProgress(20);

    try {
      const formData = new FormData();
      formData.append("file", file);

      setProgress(50);
      setUploadState("processing");

      const response = await fetch("/api/tools/excel-clean", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      setProgress(100);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to clean Excel file");
      }

      const data = await response.json();
      setResult(data);
      setUploadState("complete");
      toast({
        title: "Cleaning Complete",
        description: `Found ${data.metadata?.duplicates || 0} duplicates`,
      });
    } catch (error: any) {
      setUploadState("error");
      setUploadState("idle");
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
            <div className="w-12 h-12 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <ClipboardList className="w-6 h-6 text-amber-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold" data-testid="text-page-title">Excel Cleaner</h1>
              <p className="text-muted-foreground">Remove duplicates and validate data in spreadsheets</p>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Upload your spreadsheet</CardTitle>
            <CardDescription>
              Removes duplicates and validates emails/phone numbers
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
                <p className="text-lg font-medium mb-2">Drop your Excel/CSV file here</p>
                <p className="text-muted-foreground mb-4">or click to browse files</p>
                <input
                  id="file-input"
                  type="file"
                  accept=".xlsx,.xls,.csv"
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
                  <ClipboardList className="w-10 h-10 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="font-medium" data-testid="text-filename">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(file.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={resetUpload} data-testid="button-remove">
                    Remove
                  </Button>
                </div>

                <div className="p-4 bg-muted/30 rounded-lg space-y-2">
                  <p className="font-medium text-sm">This tool will:</p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>Remove duplicate rows</li>
                    <li>Validate email addresses</li>
                    <li>Validate phone numbers</li>
                    <li>Generate a cleaned report</li>
                  </ul>
                </div>

                <Button onClick={handleClean} className="w-full" data-testid="button-clean">
                  Clean Spreadsheet
                </Button>
              </div>
            )}

            {(uploadState === "uploading" || uploadState === "processing") && (
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                  <ClipboardList className="w-10 h-10 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="font-medium">{file?.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {uploadState === "uploading" ? "Uploading..." : "Analyzing and cleaning..."}
                    </p>
                  </div>
                </div>
                <Progress value={progress} className="h-2" data-testid="progress-clean" />
              </div>
            )}

            {uploadState === "complete" && result && (
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-green-500/10 rounded-lg">
                  <CheckCircle className="w-10 h-10 text-green-500" />
                  <div className="flex-1">
                    <p className="font-medium text-green-600 dark:text-green-400">
                      Cleaning Complete!
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {result.metadata?.cleanedRows || 0} rows in cleaned file
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-2">Duplicates Removed</p>
                    <p className="text-2xl font-bold" data-testid="text-duplicates">
                      {result.metadata?.duplicates || 0}
                    </p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-2">Cleaned Rows</p>
                    <p className="text-2xl font-bold" data-testid="text-cleaned-rows">
                      {result.metadata?.cleanedRows || 0}
                    </p>
                  </div>
                </div>

                {(result.metadata?.invalidEmails?.length > 0 || result.metadata?.invalidPhones?.length > 0) && (
                  <div className="p-4 bg-amber-500/10 rounded-lg space-y-3">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                      <p className="font-medium text-amber-600 dark:text-amber-400">Issues Found</p>
                    </div>
                    {result.metadata?.invalidEmails?.length > 0 && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Invalid Emails:</p>
                        <div className="flex flex-wrap gap-1">
                          {result.metadata.invalidEmails.slice(0, 5).map((email: string, i: number) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {email}
                            </Badge>
                          ))}
                          {result.metadata.invalidEmails.length > 5 && (
                            <Badge variant="secondary" className="text-xs">
                              +{result.metadata.invalidEmails.length - 5} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                    {result.metadata?.invalidPhones?.length > 0 && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Invalid Phones:</p>
                        <div className="flex flex-wrap gap-1">
                          {result.metadata.invalidPhones.slice(0, 5).map((phone: string, i: number) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {phone}
                            </Badge>
                          ))}
                          {result.metadata.invalidPhones.length > 5 && (
                            <Badge variant="secondary" className="text-xs">
                              +{result.metadata.invalidPhones.length - 5} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-3">
                  <Button onClick={handleDownload} className="flex-1 gap-2" data-testid="button-download">
                    <Download className="w-4 h-4" />
                    Download Cleaned File
                  </Button>
                  <Button variant="outline" onClick={resetUpload} data-testid="button-clean-another">
                    Clean Another
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
