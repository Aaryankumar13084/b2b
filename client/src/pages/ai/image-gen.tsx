import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, CheckCircle, Sparkles, Download, AlertCircle, Wand2 } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { usePollinationsImage } from "@pollinations/react";

type GenerateState = "idle" | "generating" | "complete" | "error";

const SIZES = [
  { value: "1024x1024", label: "Square (1024x1024)", width: 1024, height: 1024 },
  { value: "1792x1024", label: "Landscape (1792x1024)", width: 1792, height: 1024 },
  { value: "1024x1792", label: "Portrait (1024x1792)", width: 1024, height: 1792 },
];

const STYLES = [
  { value: "vivid", label: "Vivid - Hyper-real and dramatic" },
  { value: "natural", label: "Natural - More natural, less hyper-real" },
];

function ImageGenerator({ 
  prompt, 
  width, 
  height, 
  style,
  onComplete, 
  onError 
}: { 
  prompt: string; 
  width: number; 
  height: number;
  style: string;
  onComplete: (url: string) => void; 
  onError: () => void;
}) {
  const fullPrompt = style === "vivid" 
    ? `${prompt}, hyper-realistic, dramatic lighting, vivid colors, high detail`
    : `${prompt}, natural lighting, realistic, soft colors`;
    
  const imageUrl = usePollinationsImage(fullPrompt, {
    width,
    height,
    seed: Math.floor(Math.random() * 1000000),
    model: 'flux',
    nologo: true
  });

  useEffect(() => {
    if (imageUrl) {
      onComplete(imageUrl);
    }
  }, [imageUrl, onComplete]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!imageUrl) {
        onError();
      }
    }, 60000);
    return () => clearTimeout(timeout);
  }, [imageUrl, onError]);

  return null;
}

export default function AIImageGen() {
  const [prompt, setPrompt] = useState("");
  const [size, setSize] = useState("1024x1024");
  const [style, setStyle] = useState("vivid");
  const [generateState, setGenerateState] = useState<GenerateState>("idle");
  const [progress, setProgress] = useState(0);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [activePrompt, setActivePrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const selectedSize = SIZES.find(s => s.value === size) || SIZES[0];

  useEffect(() => {
    if (generateState === "generating") {
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) return prev;
          return prev + 5;
        });
      }, 500);
      return () => clearInterval(interval);
    }
  }, [generateState]);

  const handleGenerate = () => {
    if (!prompt.trim()) return;
    setActivePrompt(prompt.trim());
    setGenerateState("generating");
    setProgress(10);
    setIsGenerating(true);
  };

  const handleComplete = (url: string) => {
    setProgress(100);
    setGenerateState("complete");
    setGeneratedUrl(url);
    setIsGenerating(false);
  };

  const handleError = () => {
    setGenerateState("error");
    setIsGenerating(false);
    toast({
      title: "Error",
      description: "Failed to generate image. Please try again.",
      variant: "destructive",
    });
  };

  const handleDownload = () => {
    if (!generatedUrl) return;
    
    const a = document.createElement("a");
    a.href = generatedUrl;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast({
      title: "Opening Image",
      description: "Right-click on the image and select 'Save Image As' to download",
    });
  };

  const resetGenerator = () => {
    setPrompt("");
    setGenerateState("idle");
    setProgress(0);
    setGeneratedUrl(null);
    setActivePrompt("");
    setIsGenerating(false);
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
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
              <Wand2 className="w-6 h-6 text-purple-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold" data-testid="text-page-title">AI Image Generator</h1>
              <p className="text-muted-foreground">Generate stunning images from text descriptions</p>
            </div>
            <Badge variant="secondary" className="ml-auto">
              <Sparkles className="w-3 h-3 mr-1" />
              Free with Pollinations
            </Badge>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Create an Image</CardTitle>
            <CardDescription>
              Describe what you want to see and AI will generate it for you using Pollinations AI
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isGenerating && (
              <ImageGenerator
                prompt={activePrompt}
                width={selectedSize.width}
                height={selectedSize.height}
                style={style}
                onComplete={handleComplete}
                onError={handleError}
              />
            )}

            {generateState === "idle" && !generatedUrl && (
              <>
                <Textarea
                  placeholder="Describe the image you want to generate... Be specific about style, colors, composition, and mood."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="min-h-[120px]"
                  data-testid="input-prompt"
                />
                
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Size</label>
                    <Select value={size} onValueChange={setSize}>
                      <SelectTrigger data-testid="select-size">
                        <SelectValue placeholder="Select size" />
                      </SelectTrigger>
                      <SelectContent>
                        {SIZES.map((s) => (
                          <SelectItem key={s.value} value={s.value}>
                            {s.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Style</label>
                    <Select value={style} onValueChange={setStyle}>
                      <SelectTrigger data-testid="select-style">
                        <SelectValue placeholder="Select style" />
                      </SelectTrigger>
                      <SelectContent>
                        {STYLES.map((s) => (
                          <SelectItem key={s.value} value={s.value}>
                            {s.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button
                  onClick={handleGenerate}
                  className="w-full gap-2"
                  disabled={!prompt.trim()}
                  data-testid="button-generate"
                >
                  <Sparkles className="w-4 h-4" />
                  Generate Image
                </Button>
              </>
            )}

            {generateState === "generating" && (
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                  <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                    <Wand2 className="w-5 h-5 text-purple-500 animate-pulse" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">Creating your masterpiece...</p>
                    <p className="text-sm text-muted-foreground">
                      AI is generating your image with Pollinations
                    </p>
                  </div>
                </div>
                <Progress value={progress} className="h-2" data-testid="progress-generate" />
                <p className="text-sm text-center text-muted-foreground">
                  This may take up to 30 seconds...
                </p>
              </div>
            )}

            {generateState === "error" && (
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-red-500/10 rounded-lg">
                  <AlertCircle className="w-10 h-10 text-red-500" />
                  <div className="flex-1">
                    <p className="font-medium text-red-600 dark:text-red-400">
                      Generation Failed
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Could not generate image. Please try again.
                    </p>
                  </div>
                  <Button variant="outline" onClick={resetGenerator} data-testid="button-try-again">
                    Try Again
                  </Button>
                </div>
              </div>
            )}

            {generateState === "complete" && generatedUrl && (
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-green-500/10 rounded-lg">
                  <CheckCircle className="w-10 h-10 text-green-500" />
                  <div className="flex-1">
                    <p className="font-medium text-green-600 dark:text-green-400">
                      Image Generated!
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Your AI-generated image is ready
                    </p>
                  </div>
                  <Button variant="outline" onClick={resetGenerator} data-testid="button-generate-another">
                    Generate Another
                  </Button>
                </div>

                <div className="relative rounded-lg overflow-hidden border">
                  <img
                    src={generatedUrl}
                    alt={activePrompt}
                    className="w-full h-auto"
                    data-testid="img-generated"
                  />
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleDownload} className="flex-1 gap-2" data-testid="button-download">
                    <Download className="w-4 h-4" />
                    Download Image
                  </Button>
                </div>

                <Card className="bg-muted/50">
                  <CardContent className="p-4">
                    <p className="text-sm font-medium mb-1">Prompt Used:</p>
                    <p className="text-sm text-muted-foreground" data-testid="text-prompt-used">
                      {activePrompt}
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
