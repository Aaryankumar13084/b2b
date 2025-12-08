import { useState } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Mail, Upload, ArrowLeft, CheckCircle, Sparkles, FileText, Copy, AlertCircle, Download } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

type UploadState = "idle" | "uploading" | "processing" | "complete" | "error";

interface EmailResult {
  emails: Array<{ email: string; context: string }>;
  totalFound: number;
  uniqueCount: number;
  domains: Array<{ domain: string; count: number }>;
}

export default function AIEmailExtractor() {
  const [file, setFile] = useState<File | null>(null);
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<EmailResult | null>(null);
  const { toast } = useToast();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setUploadState("idle");
      setResult(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      setFile(droppedFile);
      setUploadState("idle");
      setResult(null);
    }
  };

  const handleExtract = async () => {
    if (!file) return;

    setUploadState("uploading");
    setProgress(30);

    try {
      const formData = new FormData();
      formData.append("file", file);

      setProgress(60);
      setUploadState("processing");

      const response = await fetch("/api/ai/email-extractor", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      setProgress(90);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to extract emails");
      }

      setProgress(100);
      setUploadState("complete");
      setResult(data.result);
    } catch (error: any) {
      setUploadState("error");
      toast({
        title: "Error",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    }
  };

  const handleCopy = () => {
    if (result) {
      const emailList = result.emails.map((e) => e.email).join("\n");
      navigator.clipboard.writeText(emailList);
      toast({
        title: "Copied to clipboard",
        description: `${result.uniqueCount} emails copied`,
      });
    }
  };

  const handleDownload = () => {
    if (result) {
      const emailList = result.emails.map((e) => e.email).join("\n");
      const blob = new Blob([emailList], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "extracted-emails.txt";
      a.click();
      URL.revokeObjectURL(url);
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
          <Link href="/ai">
            <Button variant="ghost" size="sm" className="gap-2 mb-4" data-testid="button-back">
              <ArrowLeft className="w-4 h-4" />
              Back to AI Features
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <Mail className="w-6 h-6 text-purple-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold" data-testid="text-page-title">Email Extractor</h1>
              <p className="text-muted-foreground">Extract email addresses from documents</p>
            </div>
            <Badge variant="secondary" className="ml-auto">
              <Sparkles className="w-3 h-3 mr-1" />
              1 Credit/document
            </Badge>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Upload a document</CardTitle>
            <CardDescription>
              Upload a PDF, Word, or text document to extract email addresses
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
                <p className="text-lg font-medium mb-2">Drop your document here</p>
                <p className="text-muted-foreground mb-4">PDF, Word, or text files supported</p>
                <input
                  id="file-input"
                  type="file"
                  accept=".pdf,.doc,.docx,.txt,.csv,.xlsx"
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
                <Button onClick={handleExtract} className="w-full gap-2" data-testid="button-extract">
                  <Sparkles className="w-4 h-4" />
                  Extract Emails
                </Button>
              </div>
            )}

            {(uploadState === "uploading" || uploadState === "processing") && (
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                  <Mail className="w-10 h-10 text-muted-foreground animate-pulse" />
                  <div className="flex-1">
                    <p className="font-medium">{file?.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {uploadState === "uploading" ? "Uploading..." : "Extracting emails..."}
                    </p>
                  </div>
                </div>
                <Progress value={progress} className="h-2" data-testid="progress-extract" />
              </div>
            )}

            {uploadState === "error" && (
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-red-500/10 rounded-lg">
                  <AlertCircle className="w-10 h-10 text-red-500" />
                  <div className="flex-1">
                    <p className="font-medium text-red-600 dark:text-red-400">Error occurred</p>
                    <p className="text-sm text-muted-foreground">
                      Could not extract emails. Please try again.
                    </p>
                  </div>
                  <Button variant="outline" onClick={resetUpload} data-testid="button-try-again">
                    Try Again
                  </Button>
                </div>
              </div>
            )}

            {uploadState === "complete" && result && (
              <div className="space-y-6">
                <div className="flex items-center gap-4 p-4 bg-green-500/10 rounded-lg">
                  <CheckCircle className="w-10 h-10 text-green-500" />
                  <div className="flex-1">
                    <p className="font-medium text-green-600 dark:text-green-400">
                      Extraction Complete!
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Found {result.uniqueCount} unique emails
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleCopy} data-testid="button-copy">
                      <Copy className="w-4 h-4 mr-1" />
                      Copy
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleDownload} data-testid="button-download">
                      <Download className="w-4 h-4 mr-1" />
                      Download
                    </Button>
                    <Button variant="outline" size="sm" onClick={resetUpload} data-testid="button-extract-another">
                      New
                    </Button>
                  </div>
                </div>

                {result.domains && result.domains.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium mb-2">Domains Found</h3>
                    <div className="flex flex-wrap gap-2">
                      {result.domains.map((d, i) => (
                        <Badge key={i} variant="secondary" data-testid={`badge-domain-${i}`}>
                          {d.domain} ({d.count})
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <h3 className="text-sm font-medium mb-2">Extracted Emails</h3>
                  <div className="max-h-[300px] overflow-y-auto rounded-lg bg-muted/50 p-4 space-y-2">
                    {result.emails.map((item, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 rounded bg-background"
                        data-testid={`email-row-${index}`}
                      >
                        <span className="font-mono text-sm">{item.email}</span>
                        {item.context && (
                          <span className="text-xs text-muted-foreground">{item.context}</span>
                        )}
                      </div>
                    ))}
                    {result.emails.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No emails found in this document
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
