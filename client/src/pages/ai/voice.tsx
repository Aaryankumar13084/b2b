import { useState, useRef, useEffect } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Mic, ArrowLeft, CheckCircle, Sparkles, FileText, AlertTriangle, Download, Copy, StopCircle } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

type RecordingState = "idle" | "recording" | "processing" | "complete" | "error";

interface DocumentResult {
  title: string;
  formattedText: string;
  wordCount: number;
  summary: string;
  sections: { heading: string; content: string }[];
}

export default function AIVoice() {
  const [recordingState, setRecordingState] = useState<RecordingState>("idle");
  const [transcribedText, setTranscribedText] = useState("");
  const [result, setResult] = useState<DocumentResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = "en-US";

        recognitionRef.current.onresult = (event: any) => {
          let transcript = "";
          for (let i = 0; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
          }
          setTranscribedText(transcript);
        };

        recognitionRef.current.onerror = (event: any) => {
          console.error("Speech recognition error:", event.error);
          setIsListening(false);
          setRecordingState("idle");
          if (event.error !== "aborted") {
            toast({
              title: "Recording error",
              description: "An error occurred during speech recognition",
              variant: "destructive",
            });
          }
        };

        recognitionRef.current.onend = () => {
          setIsListening(false);
        };
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [toast]);

  const startRecording = () => {
    if (!recognitionRef.current) {
      toast({
        title: "Not supported",
        description: "Speech recognition is not supported in your browser. Please use Chrome or Edge.",
        variant: "destructive",
      });
      return;
    }

    setRecordingState("recording");
    setIsListening(true);
    setTranscribedText("");
    setResult(null);
    setError(null);

    try {
      recognitionRef.current.start();
    } catch (err) {
      console.error("Failed to start recording:", err);
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
    setRecordingState("idle");
  };

  const handleConvert = async () => {
    if (!transcribedText.trim()) {
      toast({
        title: "No text",
        description: "Please record or type some text first",
        variant: "destructive",
      });
      return;
    }

    setRecordingState("processing");
    setError(null);

    try {
      const response = await fetch("/api/ai/voice-to-doc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ text: transcribedText }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to convert to document");
      }

      const data = await response.json();
      setRecordingState("complete");
      setResult(data.result);
    } catch (err: any) {
      setRecordingState("error");
      setError(err.message || "An error occurred while converting to document");
      toast({
        title: "Conversion failed",
        description: err.message || "Failed to convert to document",
        variant: "destructive",
      });
    }
  };

  const resetAll = () => {
    setRecordingState("idle");
    setTranscribedText("");
    setResult(null);
    setError(null);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description: "The text has been copied",
    });
  };

  const handleDownload = () => {
    if (!result) return;
    
    const content = `${result.title}\n${"=".repeat(result.title.length)}\n\n${result.formattedText}`;
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${result.title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Document downloaded",
      description: "Your document has been saved",
    });
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
              <Mic className="w-6 h-6 text-green-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold" data-testid="text-page-title">Voice to Document</h1>
              <p className="text-muted-foreground">Convert speech to formatted documents with AI</p>
            </div>
            <Badge variant="secondary" className="ml-auto">
              <Sparkles className="w-3 h-3 mr-1" />
              2 Credits/document
            </Badge>
          </div>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Record or Type</CardTitle>
              <CardDescription>
                Use your microphone to dictate or type text directly
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                {!isListening ? (
                  <Button
                    onClick={startRecording}
                    className="gap-2"
                    variant="outline"
                    data-testid="button-start-recording"
                  >
                    <Mic className="w-4 h-4" />
                    Start Recording
                  </Button>
                ) : (
                  <Button
                    onClick={stopRecording}
                    className="gap-2"
                    variant="destructive"
                    data-testid="button-stop-recording"
                  >
                    <StopCircle className="w-4 h-4" />
                    Stop Recording
                  </Button>
                )}
                {isListening && (
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                    <span className="text-sm text-muted-foreground">Recording...</span>
                  </div>
                )}
              </div>

              <Textarea
                placeholder="Your transcribed text will appear here, or you can type directly..."
                value={transcribedText}
                onChange={(e) => setTranscribedText(e.target.value)}
                className="min-h-[200px]"
                data-testid="textarea-transcription"
              />

              <div className="flex items-center justify-between gap-4">
                <p className="text-sm text-muted-foreground">
                  {transcribedText.split(/\s+/).filter(Boolean).length} words
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={resetAll} data-testid="button-clear">
                    Clear
                  </Button>
                  <Button
                    onClick={handleConvert}
                    disabled={!transcribedText.trim() || recordingState === "processing"}
                    className="gap-2"
                    data-testid="button-convert"
                  >
                    <Sparkles className="w-4 h-4" />
                    {recordingState === "processing" ? "Converting..." : "Convert to Document"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {recordingState === "error" && (
            <Card className="border-red-500/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <AlertTriangle className="w-10 h-10 text-red-500" />
                  <div className="flex-1">
                    <p className="font-medium text-red-600 dark:text-red-400">Conversion Failed</p>
                    <p className="text-sm text-muted-foreground">
                      {error || "An error occurred while converting to document"}
                    </p>
                  </div>
                  <Button variant="outline" onClick={() => setRecordingState("idle")} data-testid="button-try-again">
                    Try Again
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {recordingState === "complete" && result && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <CardTitle className="text-base">Formatted Document</CardTitle>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopy(result.formattedText)}
                      data-testid="button-copy"
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Copy
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDownload}
                      data-testid="button-download"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </div>
                <CardDescription>
                  {result.wordCount} words | {result.title}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {result.summary && (
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-sm font-medium mb-1">Summary</p>
                    <p className="text-sm text-muted-foreground" data-testid="text-summary">{result.summary}</p>
                  </div>
                )}

                <div className="p-4 rounded-lg border bg-background">
                  <h3 className="font-semibold mb-3" data-testid="text-title">{result.title}</h3>
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <p className="whitespace-pre-wrap" data-testid="text-content">{result.formattedText}</p>
                  </div>
                </div>

                {result.sections && result.sections.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-sm font-medium">Document Sections</p>
                    {result.sections.map((section, index) => (
                      <div key={index} className="p-3 rounded-lg bg-muted/50" data-testid={`section-${index}`}>
                        <p className="font-medium text-sm">{section.heading}</p>
                        <p className="text-sm text-muted-foreground mt-1">{section.content}</p>
                      </div>
                    ))}
                  </div>
                )}

                <Button onClick={resetAll} variant="outline" className="w-full" data-testid="button-new-document">
                  <FileText className="w-4 h-4 mr-2" />
                  Create New Document
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
