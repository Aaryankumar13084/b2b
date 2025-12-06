import { useState } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Braces, Copy, ArrowLeft, CheckCircle, AlertCircle } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

export default function JsonFormat() {
  const [inputJson, setInputJson] = useState("");
  const [outputJson, setOutputJson] = useState("");
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [error, setError] = useState<string>("");
  const { toast } = useToast();

  const handleFormat = async () => {
    if (!inputJson.trim()) {
      toast({
        title: "Input Required",
        description: "Please enter JSON to format",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch("/api/tools/json-format", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ json: inputJson }),
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to format JSON");
      }

      if (data.success) {
        setOutputJson(data.metadata?.formatted || "");
        setIsValid(true);
        setError("");
        toast({
          title: "JSON Formatted",
          description: `Found ${data.metadata?.objectKeys || 0} top-level keys`,
        });
      } else {
        setIsValid(false);
        setError(data.error || "Invalid JSON");
        setOutputJson("");
      }
    } catch (error: any) {
      setIsValid(false);
      setError(error.message);
      setOutputJson("");
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(outputJson);
    toast({
      title: "Copied",
      description: "Formatted JSON copied to clipboard",
    });
  };

  const handleClear = () => {
    setInputJson("");
    setOutputJson("");
    setIsValid(null);
    setError("");
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setInputJson(text);
    } catch {
      toast({
        title: "Paste Failed",
        description: "Could not access clipboard",
        variant: "destructive",
      });
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 max-w-6xl mx-auto">
        <div className="mb-6">
          <Link href="/tools">
            <Button variant="ghost" size="sm" className="gap-2 mb-4" data-testid="button-back">
              <ArrowLeft className="w-4 h-4" />
              Back to Tools
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-cyan-500/10 flex items-center justify-center">
              <Braces className="w-6 h-6 text-cyan-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold" data-testid="text-page-title">JSON Formatter</h1>
              <p className="text-muted-foreground">Format, validate, and beautify JSON data</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Input JSON</CardTitle>
              <CardDescription>
                Paste or type your JSON here
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder='{"example": "paste your JSON here"}'
                value={inputJson}
                onChange={(e) => setInputJson(e.target.value)}
                className="min-h-[300px] font-mono text-sm"
                data-testid="textarea-input"
              />
              <div className="flex gap-2">
                <Button onClick={handlePaste} variant="outline" className="flex-1" data-testid="button-paste">
                  Paste from Clipboard
                </Button>
                <Button onClick={handleClear} variant="outline" data-testid="button-clear">
                  Clear
                </Button>
              </div>
              <Button onClick={handleFormat} className="w-full" data-testid="button-format">
                Format JSON
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <div>
                  <CardTitle>Output</CardTitle>
                  <CardDescription>
                    Formatted and validated JSON
                  </CardDescription>
                </div>
                {isValid !== null && (
                  <div className="flex items-center gap-2">
                    {isValid ? (
                      <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                        <CheckCircle className="w-4 h-4" />
                        <span className="text-sm font-medium">Valid</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-red-600 dark:text-red-400">
                        <AlertCircle className="w-4 h-4" />
                        <span className="text-sm font-medium">Invalid</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <div className="p-3 bg-red-500/10 rounded-lg text-red-600 dark:text-red-400 text-sm">
                  {error}
                </div>
              )}
              <Textarea
                value={outputJson}
                readOnly
                placeholder="Formatted JSON will appear here"
                className="min-h-[300px] font-mono text-sm"
                data-testid="textarea-output"
              />
              {outputJson && (
                <Button onClick={handleCopy} className="w-full gap-2" data-testid="button-copy">
                  <Copy className="w-4 h-4" />
                  Copy to Clipboard
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
