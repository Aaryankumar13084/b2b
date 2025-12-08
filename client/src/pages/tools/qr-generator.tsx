import { useState } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { QrCode, Download, ArrowLeft, CheckCircle } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

type GenerateState = "idle" | "generating" | "complete" | "error";

const sizes = [
  { value: "128", label: "Small (128px)" },
  { value: "256", label: "Medium (256px)" },
  { value: "512", label: "Large (512px)" },
  { value: "1024", label: "Extra Large (1024px)" },
];

export default function QrGenerator() {
  const [text, setText] = useState("");
  const [size, setSize] = useState("256");
  const [generateState, setGenerateState] = useState<GenerateState>("idle");
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<any>(null);
  const { toast } = useToast();

  const handleGenerate = async () => {
    if (!text.trim()) {
      toast({
        title: "Missing content",
        description: "Please enter text or URL to encode",
        variant: "destructive",
      });
      return;
    }
    
    setGenerateState("generating");
    setProgress(30);

    try {
      const response = await fetch("/api/tools/qr-generator", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text, size: parseInt(size) }),
        credentials: "include",
      });

      setProgress(100);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to generate QR code");
      }

      const data = await response.json();
      setResult(data);
      setGenerateState("complete");
      toast({
        title: "QR Code Generated",
        description: "Your QR code is ready to download",
      });
    } catch (error: any) {
      setGenerateState("error");
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDownload = () => {
    if (result?.outputPath) {
      const filename = result.outputPath.split("/").pop();
      window.open(`/api/tools/download/${filename}`, "_blank");
    }
  };

  const resetGenerator = () => {
    setText("");
    setGenerateState("idle");
    setProgress(0);
    setResult(null);
  };

  return (
    <DashboardLayout>
      <div className="p-6 max-w-4xl mx-auto">
        <div className="mb-6">
          <Link href="/tools">
            <Button variant="ghost" size="sm" className="gap-2 mb-4" data-testid="button-back">
              <ArrowLeft className="w-4 h-4" />
              Back to Tools
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-slate-500/10 flex items-center justify-center">
              <QrCode className="w-6 h-6 text-slate-600 dark:text-slate-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold" data-testid="text-page-title">QR Code Generator</h1>
              <p className="text-muted-foreground">Generate QR codes from text or URLs</p>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Create QR Code</CardTitle>
            <CardDescription>
              Enter text or URL to generate a scannable QR code
            </CardDescription>
          </CardHeader>
          <CardContent>
            {generateState === "idle" && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="qr-text">Text or URL</Label>
                  <Input
                    id="qr-text"
                    placeholder="Enter text, URL, or any content"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    data-testid="input-qr-text"
                  />
                </div>

                <div className="space-y-2">
                  <Label>QR Code Size</Label>
                  <Select value={size} onValueChange={setSize}>
                    <SelectTrigger data-testid="select-size">
                      <SelectValue placeholder="Select size" />
                    </SelectTrigger>
                    <SelectContent>
                      {sizes.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button onClick={handleGenerate} className="w-full" disabled={!text.trim()} data-testid="button-generate">
                  Generate QR Code
                </Button>
              </div>
            )}

            {generateState === "generating" && (
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                  <QrCode className="w-10 h-10 text-muted-foreground animate-pulse" />
                  <div className="flex-1">
                    <p className="font-medium">Generating QR Code</p>
                    <p className="text-sm text-muted-foreground">
                      Creating your QR code...
                    </p>
                  </div>
                </div>
                <Progress value={progress} className="h-2" data-testid="progress-generate" />
              </div>
            )}

            {generateState === "complete" && (
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-green-500/10 rounded-lg">
                  <CheckCircle className="w-10 h-10 text-green-500" />
                  <div className="flex-1">
                    <p className="font-medium text-green-600 dark:text-green-400">
                      QR Code Generated!
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {size}x{size} pixels
                    </p>
                  </div>
                </div>

                {result?.outputPath && (
                  <div className="flex justify-center p-4 bg-white rounded-lg">
                    <img 
                      src={`/api/tools/download/${result.outputPath.split("/").pop()}`}
                      alt="Generated QR Code"
                      className="max-w-[256px]"
                      data-testid="img-qr-preview"
                    />
                  </div>
                )}

                <div className="flex gap-3">
                  <Button onClick={handleDownload} className="flex-1 gap-2" data-testid="button-download">
                    <Download className="w-4 h-4" />
                    Download QR Code
                  </Button>
                  <Button variant="outline" onClick={resetGenerator} data-testid="button-generate-another">
                    Generate Another
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
