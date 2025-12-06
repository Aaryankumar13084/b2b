import { useState } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileSearch, Upload, ArrowLeft, CheckCircle, Sparkles, List, FileText, Copy } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

type UploadState = "idle" | "uploading" | "processing" | "complete" | "error";

interface SummaryResult {
  summary: string;
  keyPoints: string[];
  wordCount: number;
  readingTime: string;
}

export default function AISummary() {
  const [file, setFile] = useState<File | null>(null);
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<SummaryResult | null>(null);
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

  const handleSummarize = async () => {
    if (!file) return;

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
            // Simulated result
            setResult({
              summary:
                "This document provides a comprehensive overview of the subject matter, covering key concepts and practical applications. The main focus is on delivering actionable insights while maintaining clarity and accessibility for readers of varying expertise levels. Throughout the document, several important themes emerge that are worth noting for future reference.",
              keyPoints: [
                "Introduction to core concepts and fundamental principles",
                "Analysis of current trends and market dynamics",
                "Detailed breakdown of implementation strategies",
                "Case studies demonstrating real-world applications",
                "Recommendations for best practices and optimization",
                "Future outlook and emerging opportunities",
              ],
              wordCount: 2847,
              readingTime: "12 min",
            });
            return 100;
          }
          return prev + 15;
        });
      }, 400);
    }, 1000);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description: "The content has been copied",
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
          <Link href="/ai">
            <Button variant="ghost" size="sm" className="gap-2 mb-4" data-testid="button-back">
              <ArrowLeft className="w-4 h-4" />
              Back to AI Features
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <FileSearch className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold" data-testid="text-page-title">Document Summary</h1>
              <p className="text-muted-foreground">Get instant AI-powered summaries of your documents</p>
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
              Upload a PDF, Word, or text document to generate a summary
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
                <Button onClick={handleSummarize} className="w-full gap-2" data-testid="button-summarize">
                  <Sparkles className="w-4 h-4" />
                  Generate Summary
                </Button>
              </div>
            )}

            {(uploadState === "uploading" || uploadState === "processing") && (
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                  <FileSearch className="w-10 h-10 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="font-medium">{file?.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {uploadState === "uploading" ? "Uploading..." : "Analyzing document..."}
                    </p>
                  </div>
                </div>
                <Progress value={progress} className="h-2" data-testid="progress-summary" />
                <p className="text-sm text-center text-muted-foreground">
                  {uploadState === "uploading"
                    ? "Uploading your document..."
                    : "AI is reading and summarizing your document..."}
                </p>
              </div>
            )}

            {uploadState === "complete" && result && (
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-green-500/10 rounded-lg">
                  <CheckCircle className="w-10 h-10 text-green-500" />
                  <div className="flex-1">
                    <p className="font-medium text-green-600 dark:text-green-400">
                      Summary Complete!
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {result.wordCount.toLocaleString()} words analyzed
                    </p>
                  </div>
                  <Button variant="outline" onClick={resetUpload} data-testid="button-summarize-another">
                    Summarize Another
                  </Button>
                </div>

                <Tabs defaultValue="summary" className="w-full">
                  <TabsList className="w-full">
                    <TabsTrigger value="summary" className="flex-1 gap-2" data-testid="tab-summary">
                      <FileText className="w-4 h-4" />
                      Summary
                    </TabsTrigger>
                    <TabsTrigger value="keypoints" className="flex-1 gap-2" data-testid="tab-keypoints">
                      <List className="w-4 h-4" />
                      Key Points
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="summary" className="mt-4">
                    <Card>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">Document Summary</CardTitle>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCopy(result.summary)}
                            data-testid="button-copy-summary"
                          >
                            <Copy className="w-4 h-4 mr-2" />
                            Copy
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <ScrollArea className="h-[200px]">
                          <p className="text-sm leading-relaxed" data-testid="text-summary">
                            {result.summary}
                          </p>
                        </ScrollArea>
                      </CardContent>
                    </Card>
                  </TabsContent>
                  <TabsContent value="keypoints" className="mt-4">
                    <Card>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">Key Points</CardTitle>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCopy(result.keyPoints.join("\n"))}
                            data-testid="button-copy-keypoints"
                          >
                            <Copy className="w-4 h-4 mr-2" />
                            Copy
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          {result.keyPoints.map((point, index) => (
                            <li
                              key={index}
                              className="flex items-start gap-2 text-sm"
                              data-testid={`text-keypoint-${index}`}
                            >
                              <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center shrink-0 mt-0.5">
                                {index + 1}
                              </span>
                              {point}
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
