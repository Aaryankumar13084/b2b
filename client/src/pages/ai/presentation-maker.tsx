import { useState } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Presentation, ArrowLeft, CheckCircle, Sparkles, Download, AlertCircle, FileUp } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

type GenerateState = "idle" | "uploading" | "processing" | "complete" | "error";

interface PresentationResult {
  downloadUrl: string;
  filename: string;
  slidesCount: number;
  title: string;
}

const SLIDE_COUNTS = [
  { value: "5", label: "5 slides - Quick overview" },
  { value: "10", label: "10 slides - Standard presentation" },
  { value: "15", label: "15 slides - Detailed presentation" },
  { value: "20", label: "20 slides - Comprehensive" },
];

const THEMES = [
  { value: "professional", label: "Professional - Clean and corporate" },
  { value: "modern", label: "Modern - Bold and contemporary" },
  { value: "minimal", label: "Minimal - Simple and elegant" },
  { value: "creative", label: "Creative - Colorful and dynamic" },
];

export default function AIPresentationMaker() {
  const [file, setFile] = useState<File | null>(null);
  const [textContent, setTextContent] = useState("");
  const [title, setTitle] = useState("");
  const [slideCount, setSlideCount] = useState("10");
  const [theme, setTheme] = useState("professional");
  const [generateState, setGenerateState] = useState<GenerateState>("idle");
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<PresentationResult | null>(null);
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
      setTextContent("");
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
      setTextContent("");
    }
  };

  const handleGenerate = async () => {
    if (!file && !textContent.trim()) return;
    if (!title.trim()) {
      toast({
        title: "Title required",
        description: "Please enter a presentation title",
        variant: "destructive",
      });
      return;
    }

    setGenerateState("uploading");
    setProgress(10);

    try {
      let fileId = null;
      
      if (file) {
        const formData = new FormData();
        formData.append("file", file);
        
        setProgress(30);
        
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
      
      setProgress(50);
      setGenerateState("processing");
      
      const response = await apiRequest("POST", "/api/ai/presentation-maker", {
        fileId,
        text: textContent || undefined,
        title: title.trim(),
        slideCount: parseInt(slideCount),
        theme,
      });
      
      setProgress(90);
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || "Failed to generate presentation");
      }
      
      setProgress(100);
      setGenerateState("complete");
      setResult({
        downloadUrl: data.downloadUrl,
        filename: data.filename,
        slidesCount: data.slidesCount,
        title: title.trim(),
      });
    } catch (error: any) {
      setGenerateState("error");
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
      description: "Your presentation is downloading",
    });
  };

  const resetGenerator = () => {
    setFile(null);
    setTextContent("");
    setTitle("");
    setGenerateState("idle");
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
            <div className="w-12 h-12 rounded-lg bg-orange-500/10 flex items-center justify-center">
              <Presentation className="w-6 h-6 text-orange-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold" data-testid="text-page-title">AI Presentation Maker</h1>
              <p className="text-muted-foreground">Transform content into professional PowerPoint presentations</p>
            </div>
            <Badge variant="secondary" className="ml-auto">
              <Sparkles className="w-3 h-3 mr-1" />
              3 Credits/presentation
            </Badge>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Create Presentation</CardTitle>
            <CardDescription>
              Upload a document or paste content to generate a PPT
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {(generateState === "idle" || generateState === "error") && !result && (
              <>
                <div>
                  <label className="text-sm font-medium mb-2 block">Presentation Title *</label>
                  <Input
                    placeholder="Enter your presentation title..."
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    data-testid="input-title"
                  />
                </div>

                <Textarea
                  placeholder="Paste content here, or upload a document below..."
                  value={textContent}
                  onChange={(e) => {
                    setTextContent(e.target.value);
                    setFile(null);
                  }}
                  className="min-h-[150px]"
                  data-testid="input-content"
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
                  className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors hover:border-primary/50 hover:bg-muted/50"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                  onClick={() => document.getElementById("file-input")?.click()}
                  data-testid="dropzone-upload"
                >
                  {file ? (
                    <div className="flex items-center justify-center gap-3">
                      <FileUp className="w-8 h-8 text-muted-foreground" />
                      <div className="text-left">
                        <p className="font-medium">{file.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFile(null);
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                  ) : (
                    <>
                      <FileUp className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="font-medium mb-1">Drop your document here</p>
                      <p className="text-sm text-muted-foreground">PDF, Word, or text files</p>
                    </>
                  )}
                  <input
                    id="file-input"
                    type="file"
                    accept=".pdf,.doc,.docx,.txt"
                    className="hidden"
                    onChange={handleFileSelect}
                    data-testid="input-file"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Number of Slides</label>
                    <Select value={slideCount} onValueChange={setSlideCount}>
                      <SelectTrigger data-testid="select-slides">
                        <SelectValue placeholder="Select slide count" />
                      </SelectTrigger>
                      <SelectContent>
                        {SLIDE_COUNTS.map((s) => (
                          <SelectItem key={s.value} value={s.value}>
                            {s.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Theme</label>
                    <Select value={theme} onValueChange={setTheme}>
                      <SelectTrigger data-testid="select-theme">
                        <SelectValue placeholder="Select theme" />
                      </SelectTrigger>
                      <SelectContent>
                        {THEMES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button
                  onClick={handleGenerate}
                  className="w-full gap-2"
                  disabled={(!textContent.trim() && !file) || !title.trim()}
                  data-testid="button-generate"
                >
                  <Sparkles className="w-4 h-4" />
                  Generate Presentation
                </Button>
              </>
            )}

            {(generateState === "uploading" || generateState === "processing") && (
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                  <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                    <Presentation className="w-5 h-5 text-orange-500 animate-pulse" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">
                      {generateState === "uploading" ? "Uploading content..." : "Creating your presentation..."}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      AI is designing slides with your content
                    </p>
                  </div>
                </div>
                <Progress value={progress} className="h-2" data-testid="progress-generate" />
                <p className="text-sm text-center text-muted-foreground">
                  This may take up to a minute...
                </p>
              </div>
            )}

            {generateState === "complete" && result && (
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-green-500/10 rounded-lg">
                  <CheckCircle className="w-10 h-10 text-green-500" />
                  <div className="flex-1">
                    <p className="font-medium text-green-600 dark:text-green-400">
                      Presentation Ready!
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {result.slidesCount} slides created for "{result.title}"
                    </p>
                  </div>
                  <Button variant="outline" onClick={resetGenerator} data-testid="button-create-another">
                    Create Another
                  </Button>
                </div>

                <Card className="bg-gradient-to-br from-orange-500/5 to-red-500/5">
                  <CardContent className="p-6 text-center">
                    <Presentation className="w-16 h-16 mx-auto mb-4 text-orange-500" />
                    <h3 className="font-semibold text-lg mb-1" data-testid="text-presentation-title">
                      {result.title}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      {result.slidesCount} slides - {result.filename}
                    </p>
                    <Button onClick={handleDownload} className="gap-2" data-testid="button-download">
                      <Download className="w-4 h-4" />
                      Download Presentation
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}

            {generateState === "error" && (
              <div className="flex items-center gap-4 p-4 bg-red-500/10 rounded-lg">
                <AlertCircle className="w-10 h-10 text-red-500" />
                <div className="flex-1">
                  <p className="font-medium text-red-600 dark:text-red-400">
                    Generation Failed
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Could not create presentation. Please try again.
                  </p>
                </div>
                <Button variant="outline" onClick={resetGenerator} data-testid="button-try-again">
                  Try Again
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
