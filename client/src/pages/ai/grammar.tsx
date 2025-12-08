import { useState } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { SpellCheck, Upload, ArrowLeft, CheckCircle, Sparkles, FileText, Copy, AlertCircle, AlertTriangle, Check } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

type UploadState = "idle" | "uploading" | "processing" | "complete" | "error";

interface GrammarIssue {
  type: "grammar" | "spelling" | "punctuation" | "style";
  original: string;
  suggestion: string;
  explanation: string;
  position?: number;
}

interface GrammarResult {
  originalText: string;
  correctedText: string;
  issues: GrammarIssue[];
  score: number;
  wordCount: number;
}

export default function AIGrammar() {
  const [file, setFile] = useState<File | null>(null);
  const [textInput, setTextInput] = useState("");
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<GrammarResult | null>(null);
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
      setTextInput("");
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
      setTextInput("");
      setUploadState("idle");
      setResult(null);
    }
  };

  const handleCheck = async () => {
    if (!file && !textInput.trim()) return;

    setUploadState("uploading");
    setProgress(20);

    try {
      let fileId = null;
      
      if (file) {
        const formData = new FormData();
        formData.append("file", file);
        
        setProgress(40);
        
        const uploadResponse = await fetch("/api/files/upload", {
          method: "POST",
          body: formData,
          credentials: "include",
        });
        
        if (!uploadResponse.ok) {
          const uploadError = await uploadResponse.json();
          throw new Error(uploadError.message || "Failed to upload file");
        }
        
        const uploadData = await uploadResponse.json();
        fileId = uploadData.id || uploadData.file?.id;
      }
      
      setProgress(60);
      setUploadState("processing");
      
      const response = await apiRequest("POST", "/api/ai/grammar", {
        fileId: fileId,
        text: textInput || undefined,
      });
      
      setProgress(90);
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || "Failed to check grammar");
      }
      
      setProgress(100);
      setUploadState("complete");
      setResult({
        originalText: data.originalText || textInput,
        correctedText: data.correctedText,
        issues: data.issues || [],
        score: data.score || 100,
        wordCount: data.wordCount || textInput.split(/\s+/).filter((w: string) => w.length > 0).length,
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

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description: "The corrected text has been copied",
    });
  };

  const resetUpload = () => {
    setFile(null);
    setTextInput("");
    setUploadState("idle");
    setProgress(0);
    setResult(null);
  };

  const getIssueColor = (type: string) => {
    switch (type) {
      case "grammar": return "text-red-500 bg-red-500/10";
      case "spelling": return "text-orange-500 bg-orange-500/10";
      case "punctuation": return "text-yellow-500 bg-yellow-500/10";
      case "style": return "text-blue-500 bg-blue-500/10";
      default: return "text-muted-foreground bg-muted";
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-500";
    if (score >= 70) return "text-yellow-500";
    return "text-red-500";
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
            <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center">
              <SpellCheck className="w-6 h-6 text-green-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold" data-testid="text-page-title">AI Grammar Checker</h1>
              <p className="text-muted-foreground">Check and fix grammar, spelling, and style issues</p>
            </div>
            <Badge variant="secondary" className="ml-auto">
              <Sparkles className="w-3 h-3 mr-1" />
              1 Credit/check
            </Badge>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Check Your Writing</CardTitle>
            <CardDescription>
              Upload a document or paste text to check for grammar and spelling errors
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {uploadState === "idle" && !file && !result && (
              <>
                <Textarea
                  placeholder="Paste or type text to check for grammar issues..."
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  className="min-h-[200px]"
                  data-testid="input-text"
                />
                
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">or upload a document</span>
                  </div>
                </div>

                <div
                  className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors hover:border-primary/50 hover:bg-muted/50"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                  onClick={() => document.getElementById("file-input")?.click()}
                  data-testid="dropzone-upload"
                >
                  <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
                  <p className="font-medium mb-1">Drop your document here</p>
                  <p className="text-sm text-muted-foreground">PDF, Word, or text files</p>
                  <input
                    id="file-input"
                    type="file"
                    accept=".pdf,.doc,.docx,.txt"
                    className="hidden"
                    onChange={handleFileSelect}
                    data-testid="input-file"
                  />
                </div>

                <Button
                  onClick={handleCheck}
                  className="w-full gap-2"
                  disabled={!textInput.trim()}
                  data-testid="button-check"
                >
                  <Sparkles className="w-4 h-4" />
                  Check Grammar
                </Button>
              </>
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
                <Button onClick={handleCheck} className="w-full gap-2" data-testid="button-check-file">
                  <Sparkles className="w-4 h-4" />
                  Check Document
                </Button>
              </div>
            )}

            {(uploadState === "uploading" || uploadState === "processing") && (
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                  <SpellCheck className="w-10 h-10 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="font-medium">{file?.name || "Text input"}</p>
                    <p className="text-sm text-muted-foreground">
                      {uploadState === "uploading" ? "Uploading..." : "Checking grammar..."}
                    </p>
                  </div>
                </div>
                <Progress value={progress} className="h-2" data-testid="progress-grammar" />
                <p className="text-sm text-center text-muted-foreground">
                  {uploadState === "uploading"
                    ? "Uploading your content..."
                    : "AI is analyzing your writing..."}
                </p>
              </div>
            )}

            {uploadState === "error" && (
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-red-500/10 rounded-lg">
                  <AlertCircle className="w-10 h-10 text-red-500" />
                  <div className="flex-1">
                    <p className="font-medium text-red-600 dark:text-red-400">
                      Error occurred
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Could not check grammar. Please try again.
                    </p>
                  </div>
                  <Button variant="outline" onClick={resetUpload} data-testid="button-try-again">
                    Try Again
                  </Button>
                </div>
              </div>
            )}

            {uploadState === "complete" && result && (
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-green-500/10 rounded-lg">
                  <CheckCircle className="w-10 h-10 text-green-500" />
                  <div className="flex-1">
                    <p className="font-medium text-green-600 dark:text-green-400">
                      Grammar Check Complete!
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {result.issues.length === 0 
                        ? "No issues found" 
                        : `${result.issues.length} issue${result.issues.length === 1 ? "" : "s"} found`}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className={`text-2xl font-bold ${getScoreColor(result.score)}`} data-testid="text-score">
                      {result.score}%
                    </p>
                    <p className="text-xs text-muted-foreground">Score</p>
                  </div>
                  <Button variant="outline" onClick={resetUpload} data-testid="button-check-another">
                    Check Another
                  </Button>
                </div>

                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="text-base">Corrected Text</CardTitle>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopy(result.correctedText)}
                        data-testid="button-copy-corrected"
                      >
                        <Copy className="w-4 h-4 mr-2" />
                        Copy
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="max-h-[300px] overflow-y-auto">
                      <p className="text-sm leading-relaxed whitespace-pre-wrap" data-testid="text-corrected">
                        {result.correctedText}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {result.issues.length > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Issues Found</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-3">
                        {result.issues.map((issue, index) => (
                          <li
                            key={index}
                            className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
                            data-testid={`text-issue-${index}`}
                          >
                            <div className={`p-1.5 rounded ${getIssueColor(issue.type)}`}>
                              {issue.type === "grammar" && <AlertTriangle className="w-4 h-4" />}
                              {issue.type === "spelling" && <SpellCheck className="w-4 h-4" />}
                              {issue.type === "punctuation" && <AlertCircle className="w-4 h-4" />}
                              {issue.type === "style" && <Check className="w-4 h-4" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="secondary" className="text-xs capitalize">
                                  {issue.type}
                                </Badge>
                              </div>
                              <p className="text-sm">
                                <span className="line-through text-red-500/70">{issue.original}</span>
                                <span className="mx-2">→</span>
                                <span className="text-green-500 font-medium">{issue.suggestion}</span>
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">{issue.explanation}</p>
                            </div>
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
