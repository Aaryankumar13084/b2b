import { useState } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Scale, Upload, ArrowLeft, CheckCircle, Sparkles, FileText, AlertTriangle, Shield, AlertCircle } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

type UploadState = "idle" | "uploading" | "processing" | "complete" | "error";

interface LegalAnalysis {
  riskScore: number;
  riskLevel: "low" | "medium" | "high" | "critical";
  clauses: {
    title: string;
    content: string;
    riskLevel: "low" | "medium" | "high" | "critical";
    explanation: string;
  }[];
  redFlags: string[];
  recommendations: string[];
  summary: string;
}

export default function AILegal() {
  const [file, setFile] = useState<File | null>(null);
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<LegalAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const validTypes = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "text/plain",
      ];
      if (!validTypes.includes(selectedFile.type)) {
        toast({
          title: "Invalid file type",
          description: "Please select a PDF, Word, or text document",
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
      const validTypes = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "text/plain",
      ];
      if (!validTypes.includes(droppedFile.type)) {
        toast({
          title: "Invalid file type",
          description: "Please select a PDF, Word, or text document",
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

      const response = await fetch("/api/ai/legal", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to analyze document");
      }

      const data = await response.json();
      setProgress(100);
      setUploadState("complete");
      setResult(data.analysis);
    } catch (err: any) {
      clearInterval(progressInterval);
      setUploadState("error");
      setError(err.message || "An error occurred while analyzing your document");
      toast({
        title: "Analysis failed",
        description: err.message || "Failed to analyze document",
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

  const getRiskColor = (level: string) => {
    switch (level) {
      case "critical": return "text-red-600 dark:text-red-400";
      case "high": return "text-orange-500";
      case "medium": return "text-yellow-500";
      default: return "text-green-500";
    }
  };

  const getRiskBadgeVariant = (level: string) => {
    switch (level) {
      case "critical": return "bg-red-500/10 text-red-500";
      case "high": return "bg-orange-500/10 text-orange-500";
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
            <div className="w-12 h-12 rounded-lg bg-red-500/10 flex items-center justify-center">
              <Scale className="w-6 h-6 text-red-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold" data-testid="text-page-title">Legal Risk Detector</h1>
              <p className="text-muted-foreground">AI-powered analysis of legal documents for risk clauses</p>
            </div>
            <Badge variant="secondary" className="ml-auto">
              <Sparkles className="w-3 h-3 mr-1" />
              3 Credits/analysis
            </Badge>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Upload your legal document</CardTitle>
            <CardDescription>
              Upload a contract, agreement, or legal document to analyze for risks
            </CardDescription>
          </CardHeader>
          <CardContent>
            {uploadState === "idle" && !file && (
              <div
                className="border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors hover:border-primary/50 hover:bg-muted/50"
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => document.getElementById("legal-input")?.click()}
                data-testid="dropzone-upload"
              >
                <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-lg font-medium mb-2">Drop your document here</p>
                <p className="text-muted-foreground mb-4">PDF, Word, or text files supported</p>
                <input
                  id="legal-input"
                  type="file"
                  accept=".pdf,.doc,.docx,.txt"
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
                  <Scale className="w-4 h-4" />
                  Analyze for Risks
                </Button>
              </div>
            )}

            {(uploadState === "uploading" || uploadState === "processing") && (
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                  <Scale className="w-10 h-10 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="font-medium">{file?.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {uploadState === "uploading" ? "Uploading..." : "Analyzing document..."}
                    </p>
                  </div>
                </div>
                <Progress value={progress} className="h-2" data-testid="progress-analyze" />
                <p className="text-sm text-center text-muted-foreground">
                  AI is scanning for risk clauses and hidden terms...
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
                      {error || "An error occurred while analyzing your document"}
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
                      Found {result.clauses?.length || 0} clauses and {result.redFlags?.length || 0} red flags
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={resetUpload} data-testid="button-analyze-another">
                    Analyze Another
                  </Button>
                </div>

                <Card className={`${getRiskBadgeVariant(result.riskLevel)}`}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between gap-4">
                      <div className="space-y-1">
                        <p className="text-sm opacity-75">Overall Risk Score</p>
                        <div className="flex items-baseline gap-2">
                          <span className="text-4xl font-bold" data-testid="text-risk-score">
                            {result.riskScore}
                          </span>
                          <span className="opacity-75">/100</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline" className={getRiskBadgeVariant(result.riskLevel)}>
                          {result.riskLevel?.toUpperCase()} RISK
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {result.summary && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Document Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground" data-testid="text-summary">{result.summary}</p>
                    </CardContent>
                  </Card>
                )}

                {result.redFlags && result.redFlags.length > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-red-500" />
                        <CardTitle className="text-base">Red Flags</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {result.redFlags.map((flag, index) => (
                          <li key={index} className="flex items-start gap-2 text-sm" data-testid={`red-flag-${index}`}>
                            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                            {flag}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {result.clauses && result.clauses.length > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Risk Clauses Detected</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-[300px]">
                        <div className="space-y-4">
                          {result.clauses.map((clause, index) => (
                            <div key={index} className="p-3 rounded-lg bg-muted/50 space-y-2" data-testid={`clause-${index}`}>
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-medium">{clause.title}</span>
                                <Badge variant="outline" className={getRiskBadgeVariant(clause.riskLevel)}>
                                  {clause.riskLevel}
                                </Badge>
                              </div>
                              {clause.content && (
                                <p className="text-sm text-muted-foreground italic">"{clause.content}"</p>
                              )}
                              <p className="text-sm">{clause.explanation}</p>
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
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-green-500" />
                        <CardTitle className="text-base">Recommendations</CardTitle>
                      </div>
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
