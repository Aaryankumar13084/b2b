import { useState } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PenTool, ArrowLeft, CheckCircle, Sparkles, Copy, AlertCircle, RefreshCw } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

type ProcessState = "idle" | "processing" | "complete" | "error";

interface WritingResult {
  content: string;
  wordCount: number;
  type: string;
}

const contentTypes = [
  { value: "blog", label: "Blog Post" },
  { value: "email", label: "Professional Email" },
  { value: "article", label: "Article" },
  { value: "social", label: "Social Media Post" },
  { value: "marketing", label: "Marketing Copy" },
  { value: "product", label: "Product Description" },
];

const toneOptions = [
  { value: "professional", label: "Professional" },
  { value: "casual", label: "Casual" },
  { value: "friendly", label: "Friendly" },
  { value: "formal", label: "Formal" },
  { value: "persuasive", label: "Persuasive" },
  { value: "informative", label: "Informative" },
];

const lengthOptions = [
  { value: "short", label: "Short (100-200 words)" },
  { value: "medium", label: "Medium (300-500 words)" },
  { value: "long", label: "Long (600-1000 words)" },
];

export default function AIWriting() {
  const [contentType, setContentType] = useState("blog");
  const [topic, setTopic] = useState("");
  const [tone, setTone] = useState("professional");
  const [length, setLength] = useState("medium");
  const [additionalInstructions, setAdditionalInstructions] = useState("");
  const [processState, setProcessState] = useState<ProcessState>("idle");
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<WritingResult | null>(null);
  const { toast } = useToast();

  const handleGenerate = async () => {
    if (!topic.trim()) {
      toast({
        title: "Topic required",
        description: "Please enter a topic for your content",
        variant: "destructive",
      });
      return;
    }

    setProcessState("processing");
    setProgress(30);

    try {
      setProgress(60);

      const response = await apiRequest("POST", "/api/ai/writing", {
        type: contentType,
        topic: topic.trim(),
        tone,
        length,
        additionalInstructions: additionalInstructions.trim() || undefined,
      });

      setProgress(90);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to generate content");
      }

      setProgress(100);
      setProcessState("complete");
      setResult({
        content: data.content,
        wordCount: data.wordCount,
        type: data.type,
      });
    } catch (error: any) {
      setProcessState("error");
      toast({
        title: "Error",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    }
  };

  const handleCopy = () => {
    if (result) {
      navigator.clipboard.writeText(result.content);
      toast({
        title: "Copied to clipboard",
        description: "The content has been copied",
      });
    }
  };

  const resetForm = () => {
    setTopic("");
    setAdditionalInstructions("");
    setProcessState("idle");
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
              <PenTool className="w-6 h-6 text-purple-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold" data-testid="text-page-title">AI Writing Assistant</h1>
              <p className="text-muted-foreground">Generate blog posts, emails, and content with AI</p>
            </div>
            <Badge variant="secondary" className="ml-auto">
              <Sparkles className="w-3 h-3 mr-1" />
              2 Credits/generation
            </Badge>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Content Settings</CardTitle>
              <CardDescription>
                Configure your content preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="content-type">Content Type</Label>
                <Select value={contentType} onValueChange={setContentType}>
                  <SelectTrigger id="content-type" data-testid="select-content-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {contentTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="topic">Topic</Label>
                <Input
                  id="topic"
                  placeholder="e.g., Benefits of remote work, Product launch announcement"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  data-testid="input-topic"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="tone">Tone</Label>
                  <Select value={tone} onValueChange={setTone}>
                    <SelectTrigger id="tone" data-testid="select-tone">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {toneOptions.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="length">Length</Label>
                  <Select value={length} onValueChange={setLength}>
                    <SelectTrigger id="length" data-testid="select-length">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {lengthOptions.map((l) => (
                        <SelectItem key={l.value} value={l.value}>
                          {l.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="instructions">Additional Instructions (Optional)</Label>
                <Textarea
                  id="instructions"
                  placeholder="Any specific requirements or points to include..."
                  value={additionalInstructions}
                  onChange={(e) => setAdditionalInstructions(e.target.value)}
                  className="resize-none"
                  rows={3}
                  data-testid="input-instructions"
                />
              </div>

              <Button
                onClick={handleGenerate}
                disabled={processState === "processing" || !topic.trim()}
                className="w-full gap-2"
                data-testid="button-generate"
              >
                {processState === "processing" ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Generate Content
                  </>
                )}
              </Button>

              {processState === "processing" && (
                <Progress value={progress} className="h-2" data-testid="progress-generate" />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <div>
                  <CardTitle>Generated Content</CardTitle>
                  <CardDescription>
                    Your AI-generated content will appear here
                  </CardDescription>
                </div>
                {result && (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleCopy} data-testid="button-copy">
                      <Copy className="w-4 h-4 mr-1" />
                      Copy
                    </Button>
                    <Button variant="outline" size="sm" onClick={resetForm} data-testid="button-new">
                      New
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {processState === "idle" && !result && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <PenTool className="w-12 h-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    Configure your settings and click Generate to create content
                  </p>
                </div>
              )}

              {processState === "processing" && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <RefreshCw className="w-12 h-12 text-primary mb-4 animate-spin" />
                  <p className="text-muted-foreground">AI is writing your content...</p>
                </div>
              )}

              {processState === "error" && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
                  <p className="text-red-600 dark:text-red-400 font-medium">Error occurred</p>
                  <p className="text-muted-foreground text-sm mt-1">
                    Could not generate content. Please try again.
                  </p>
                  <Button variant="outline" onClick={resetForm} className="mt-4" data-testid="button-try-again">
                    Try Again
                  </Button>
                </div>
              )}

              {processState === "complete" && result && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 p-3 bg-green-500/10 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span className="text-sm font-medium text-green-600 dark:text-green-400">
                      Content generated successfully
                    </span>
                    <Badge variant="secondary" className="ml-auto">
                      {result.wordCount} words
                    </Badge>
                  </div>
                  <div className="max-h-[400px] overflow-y-auto rounded-lg bg-muted/50 p-4">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap" data-testid="text-content">
                      {result.content}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
