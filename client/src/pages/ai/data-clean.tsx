import { useState } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TableProperties, Upload, ArrowLeft, CheckCircle, Sparkles, FileText, AlertTriangle, Mail, Phone, Copy as CopyIcon } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

type UploadState = "idle" | "uploading" | "processing" | "complete" | "error";

interface DataAnalysis {
  qualityScore: number;
  totalRows: number;
  issues: {
    type: string;
    count: number;
    examples: string[];
    severity: "low" | "medium" | "high";
  }[];
  duplicates: { count: number; examples: string[] };
  invalidEmails: { count: number; examples: string[] };
  invalidPhones: { count: number; examples: string[] };
  missingValues: { count: number; columns: string[] };
  recommendations: string[];
  summary: string;
}

export default function AIDataClean() {
  const [file, setFile] = useState<File | null>(null);
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<DataAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const validTypes = [
        "text/csv",
        "application/json",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "text/plain",
      ];
      const validExtensions = [".csv", ".json", ".xlsx", ".xls", ".txt"];
      const hasValidExt = validExtensions.some(ext => selectedFile.name.toLowerCase().endsWith(ext));
      
      if (!validTypes.includes(selectedFile.type) && !hasValidExt) {
        toast({
          title: "Invalid file type",
          description: "Please select a CSV, JSON, Excel, or text file",
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
      const validExtensions = [".csv", ".json", ".xlsx", ".xls", ".txt"];
      const hasValidExt = validExtensions.some(ext => droppedFile.name.toLowerCase().endsWith(ext));
      
      if (!hasValidExt) {
        toast({
          title: "Invalid file type",
          description: "Please select a CSV, JSON, Excel, or text file",
          variant: "destructive",
        });
        return;
      }
      setFile(droppedFile);
      setUploadState("idle");
      setResult(null);
    }
  };

  const handleAnalyze = async () => {
    if (!file) return;

    setUploadState("uploading");
    setProgress(0);
    setError(null);

    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return prev;
        return prev + 5;
      });
    }, 300);

    try {
      setProgress(30);
      setUploadState("processing");

      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/ai/data-clean", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to analyze data");
      }

      const data = await response.json();
      setProgress(100);
      setUploadState("complete");
      setResult(data.analysis);
    } catch (err: any) {
      clearInterval(progressInterval);
      setUploadState("error");
      setError(err.message || "An error occurred while analyzing your data");
      toast({
        title: "Analysis failed",
        description: err.message || "Failed to analyze data",
        variant: "destructive",
      });
    }
  };

  const resetUpload = () => {
    setFile(null);
    setUploadState("idle");
    setProgress(0);
    setResult(null);
    setError(null);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-500";
    if (score >= 60) return "text-yellow-500";
    return "text-red-500";
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high": return "bg-red-500/10 text-red-500";
      case "medium": return "bg-yellow-500/10 text-yellow-500";
      default: return "bg-green-500/10 text-green-500";
    }
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
            <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <TableProperties className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold" data-testid="text-page-title">Data Cleaner</h1>
              <p className="text-muted-foreground">AI-powered data quality analysis and validation</p>
            </div>
            <Badge variant="secondary" className="ml-auto">
              <Sparkles className="w-3 h-3 mr-1" />
              2 Credits/analysis
            </Badge>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Upload your data file</CardTitle>
            <CardDescription>
              Upload a CSV, JSON, or Excel file to analyze for data quality issues
            </CardDescription>
          </CardHeader>
          <CardContent>
            {uploadState === "idle" && !file && (
              <div
                className="border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors hover:border-primary/50 hover:bg-muted/50"
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => document.getElementById("data-input")?.click()}
                data-testid="dropzone-upload"
              >
                <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-lg font-medium mb-2">Drop your data file here</p>
                <p className="text-muted-foreground mb-4">CSV, JSON, Excel, or text files supported</p>
                <input
                  id="data-input"
                  type="file"
                  accept=".csv,.json,.xlsx,.xls,.txt"
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
                <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                  <FileText className="w-10 h-10 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="font-medium" data-testid="text-filename">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={resetUpload} data-testid="button-remove">
                    Remove
                  </Button>
                </div>
                <Button onClick={handleAnalyze} className="w-full gap-2" data-testid="button-analyze">
                  <TableProperties className="w-4 h-4" />
                  Analyze Data Quality
                </Button>
              </div>
            )}

            {(uploadState === "uploading" || uploadState === "processing") && (
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                  <TableProperties className="w-10 h-10 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="font-medium">{file?.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {uploadState === "uploading" ? "Uploading..." : "Analyzing data..."}
                    </p>
                  </div>
                </div>
                <Progress value={progress} className="h-2" data-testid="progress-analyze" />
                <p className="text-sm text-center text-muted-foreground">
                  AI is scanning for duplicates, invalid formats, and data issues...
                </p>
              </div>
            )}

            {uploadState === "error" && (
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-red-500/10 rounded-lg">
                  <AlertTriangle className="w-10 h-10 text-red-500" />
                  <div className="flex-1">
                    <p className="font-medium text-red-600 dark:text-red-400">Analysis Failed</p>
                    <p className="text-sm text-muted-foreground">
                      {error || "An error occurred while analyzing your data"}
                    </p>
                  </div>
                </div>
                <Button onClick={resetUpload} className="w-full" data-testid="button-try-again">
                  Try Again
                </Button>
              </div>
            )}

            {uploadState === "complete" && result && (
              <div className="space-y-6">
                <div className="flex items-center gap-4 p-4 bg-green-500/10 rounded-lg">
                  <CheckCircle className="w-10 h-10 text-green-500" />
                  <div className="flex-1">
                    <p className="font-medium text-green-600 dark:text-green-400">Analysis Complete!</p>
                    <p className="text-sm text-muted-foreground">
                      Analyzed {result.totalRows || "unknown"} rows, found {result.issues?.length || 0} issue types
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={resetUpload} data-testid="button-analyze-another">
                    Analyze Another
                  </Button>
                </div>

                <Card className="bg-gradient-to-r from-blue-500/5 to-purple-500/5">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between gap-4">
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Data Quality Score</p>
                        <div className="flex items-baseline gap-2">
                          <span className={`text-4xl font-bold ${getScoreColor(result.qualityScore)}`} data-testid="text-quality-score">
                            {result.qualityScore}
                          </span>
                          <span className="text-muted-foreground">/100</span>
                        </div>
                      </div>
                      <div className="text-right text-sm text-muted-foreground">
                        <p>{result.totalRows || 0} rows analyzed</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {result.summary && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground" data-testid="text-summary">{result.summary}</p>
                    </CardContent>
                  </Card>
                )}

                <div className="grid gap-4 md:grid-cols-3">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <CopyIcon className="w-5 h-5 text-yellow-500" />
                        <div>
                          <p className="text-2xl font-bold" data-testid="text-duplicates">{result.duplicates?.count || 0}</p>
                          <p className="text-sm text-muted-foreground">Duplicates</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <Mail className="w-5 h-5 text-red-500" />
                        <div>
                          <p className="text-2xl font-bold" data-testid="text-invalid-emails">{result.invalidEmails?.count || 0}</p>
                          <p className="text-sm text-muted-foreground">Invalid Emails</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <Phone className="w-5 h-5 text-orange-500" />
                        <div>
                          <p className="text-2xl font-bold" data-testid="text-invalid-phones">{result.invalidPhones?.count || 0}</p>
                          <p className="text-sm text-muted-foreground">Invalid Phones</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {result.issues && result.issues.length > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Issues Detected</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-[200px]">
                        <div className="space-y-3">
                          {result.issues.map((issue, index) => (
                            <div key={index} className="p-3 rounded-lg bg-muted/50" data-testid={`issue-${index}`}>
                              <div className="flex items-center justify-between gap-2 mb-2">
                                <span className="font-medium">{issue.type}</span>
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline">{issue.count} found</Badge>
                                  <Badge variant="outline" className={getSeverityColor(issue.severity)}>
                                    {issue.severity}
                                  </Badge>
                                </div>
                              </div>
                              {issue.examples && issue.examples.length > 0 && (
                                <p className="text-sm text-muted-foreground">
                                  Examples: {issue.examples.slice(0, 3).join(", ")}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                )}

                {result.recommendations && result.recommendations.length > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Recommendations</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {result.recommendations.map((rec, index) => (
                          <li key={index} className="flex items-start gap-2 text-sm" data-testid={`recommendation-${index}`}>
                            <CheckCircle className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                            {rec}
                          </li>
                        ))}
                      </ul>
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
