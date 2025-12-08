import { useState } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Languages, Upload, ArrowLeft, CheckCircle, Sparkles, FileText, Copy, AlertCircle, ArrowRightLeft } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

type UploadState = "idle" | "uploading" | "processing" | "complete" | "error";

interface TranslationResult {
  originalText: string;
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
  wordCount: number;
}

const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "it", label: "Italian" },
  { value: "pt", label: "Portuguese" },
  { value: "ru", label: "Russian" },
  { value: "zh", label: "Chinese" },
  { value: "ja", label: "Japanese" },
  { value: "ko", label: "Korean" },
  { value: "ar", label: "Arabic" },
  { value: "hi", label: "Hindi" },
  { value: "nl", label: "Dutch" },
  { value: "pl", label: "Polish" },
  { value: "tr", label: "Turkish" },
  { value: "vi", label: "Vietnamese" },
  { value: "th", label: "Thai" },
  { value: "sv", label: "Swedish" },
  { value: "da", label: "Danish" },
  { value: "fi", label: "Finnish" },
];

export default function AITranslation() {
  const [file, setFile] = useState<File | null>(null);
  const [textInput, setTextInput] = useState("");
  const [sourceLanguage, setSourceLanguage] = useState("auto");
  const [targetLanguage, setTargetLanguage] = useState("en");
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<TranslationResult | null>(null);
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

  const handleTranslate = async () => {
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
      
      const response = await apiRequest("POST", "/api/ai/translation", {
        fileId: fileId,
        text: textInput || undefined,
        sourceLanguage: sourceLanguage === "auto" ? undefined : sourceLanguage,
        targetLanguage: targetLanguage,
      });
      
      setProgress(90);
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || "Failed to translate");
      }
      
      setProgress(100);
      setUploadState("complete");
      setResult({
        originalText: data.originalText || textInput,
        translatedText: data.translatedText,
        sourceLanguage: data.sourceLanguage || sourceLanguage,
        targetLanguage: data.targetLanguage || targetLanguage,
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
      description: "The translation has been copied",
    });
  };

  const swapLanguages = () => {
    if (sourceLanguage !== "auto" && result) {
      const temp = sourceLanguage;
      setSourceLanguage(targetLanguage);
      setTargetLanguage(temp);
      setTextInput(result.translatedText);
      setResult(null);
    }
  };

  const resetUpload = () => {
    setFile(null);
    setTextInput("");
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
              <Languages className="w-6 h-6 text-purple-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold" data-testid="text-page-title">AI Translation</h1>
              <p className="text-muted-foreground">Translate documents and text to any language</p>
            </div>
            <Badge variant="secondary" className="ml-auto">
              <Sparkles className="w-3 h-3 mr-1" />
              2 Credits/translation
            </Badge>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Translate Content</CardTitle>
            <CardDescription>
              Upload a document or paste text to translate
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">From</label>
                <Select value={sourceLanguage} onValueChange={setSourceLanguage}>
                  <SelectTrigger data-testid="select-source-language">
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Auto-detect</SelectItem>
                    {LANGUAGES.map((lang) => (
                      <SelectItem key={lang.value} value={lang.value}>
                        {lang.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="mt-6"
                onClick={swapLanguages}
                disabled={sourceLanguage === "auto" || !result}
                data-testid="button-swap-languages"
              >
                <ArrowRightLeft className="w-4 h-4" />
              </Button>
              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">To</label>
                <Select value={targetLanguage} onValueChange={setTargetLanguage}>
                  <SelectTrigger data-testid="select-target-language">
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map((lang) => (
                      <SelectItem key={lang.value} value={lang.value}>
                        {lang.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {uploadState === "idle" && !file && !result && (
              <>
                <Textarea
                  placeholder="Paste or type text to translate..."
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  className="min-h-[150px]"
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
                  onClick={handleTranslate}
                  className="w-full gap-2"
                  disabled={!textInput.trim()}
                  data-testid="button-translate"
                >
                  <Sparkles className="w-4 h-4" />
                  Translate
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
                <Button onClick={handleTranslate} className="w-full gap-2" data-testid="button-translate-file">
                  <Sparkles className="w-4 h-4" />
                  Translate Document
                </Button>
              </div>
            )}

            {(uploadState === "uploading" || uploadState === "processing") && (
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                  <Languages className="w-10 h-10 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="font-medium">{file?.name || "Text input"}</p>
                    <p className="text-sm text-muted-foreground">
                      {uploadState === "uploading" ? "Uploading..." : "Translating..."}
                    </p>
                  </div>
                </div>
                <Progress value={progress} className="h-2" data-testid="progress-translation" />
                <p className="text-sm text-center text-muted-foreground">
                  {uploadState === "uploading"
                    ? "Uploading your content..."
                    : "AI is translating your content..."}
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
                      Could not translate. Please try again.
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
                      Translation Complete!
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {result.wordCount.toLocaleString()} words translated
                    </p>
                  </div>
                  <Button variant="outline" onClick={resetUpload} data-testid="button-translate-another">
                    Translate Another
                  </Button>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between gap-2">
                        <CardTitle className="text-base">Original</CardTitle>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopy(result.originalText)}
                          data-testid="button-copy-original"
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="max-h-[300px] overflow-y-auto">
                        <p className="text-sm leading-relaxed whitespace-pre-wrap" data-testid="text-original">
                          {result.originalText}
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between gap-2">
                        <CardTitle className="text-base">Translation</CardTitle>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopy(result.translatedText)}
                          data-testid="button-copy-translation"
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="max-h-[300px] overflow-y-auto">
                        <p className="text-sm leading-relaxed whitespace-pre-wrap" data-testid="text-translation">
                          {result.translatedText}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
