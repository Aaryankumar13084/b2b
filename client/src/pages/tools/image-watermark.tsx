import { useState } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Droplets, Upload, Download, ArrowLeft, CheckCircle } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

type UploadState = "idle" | "uploading" | "processing" | "complete" | "error";

const positions = [
  { value: "center", label: "Center" },
  { value: "top-left", label: "Top Left" },
  { value: "top-right", label: "Top Right" },
  { value: "bottom-left", label: "Bottom Left" },
  { value: "bottom-right", label: "Bottom Right" },
];

export default function ImageWatermark() {
  const [file, setFile] = useState<File | null>(null);
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [progress, setProgress] = useState(0);
  const [text, setText] = useState("");
  const [opacity, setOpacity] = useState([50]);
  const [position, setPosition] = useState("center");
  const [result, setResult] = useState<any>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const { toast } = useToast();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.type.startsWith("image/")) {
        toast({
          title: "Invalid file type",
          description: "Please select an image file",
          variant: "destructive",
        });
        return;
      }
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
      setUploadState("idle");
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      if (!droppedFile.type.startsWith("image/")) {
        toast({
          title: "Invalid file type",
          description: "Please select an image file",
          variant: "destructive",
        });
        return;
      }
      setFile(droppedFile);
      setPreview(URL.createObjectURL(droppedFile));
      setUploadState("idle");
    }
  };

  const handleAddWatermark = async () => {
    if (!file || !text.trim()) {
      toast({
        title: "Missing watermark text",
        description: "Please enter watermark text",
        variant: "destructive",
      });
      return;
    }
    
    setUploadState("uploading");
    setProgress(20);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("text", text);
      formData.append("opacity", String(opacity[0]));
      formData.append("position", position);

      setProgress(50);
      setUploadState("processing");

      const response = await fetch("/api/tools/image-watermark", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      setProgress(100);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to add watermark");
      }

      const data = await response.json();
      setResult(data);
      setUploadState("complete");
      toast({
        title: "Watermark Added",
        description: "Your watermark has been added to the image",
      });
    } catch (error: any) {
      setUploadState("error");
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

  const resetUpload = () => {
    setFile(null);
    setPreview(null);
    setUploadState("idle");
    setProgress(0);
    setResult(null);
    setText("");
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
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
            <div className="w-12 h-12 rounded-lg bg-cyan-500/10 flex items-center justify-center">
              <Droplets className="w-6 h-6 text-cyan-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold" data-testid="text-page-title">Image Watermark</h1>
              <p className="text-muted-foreground">Add text watermark to your images</p>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Upload your image</CardTitle>
            <CardDescription>
              Add a customizable text watermark to protect your images
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
                <p className="text-lg font-medium mb-2">Drop your image here</p>
                <p className="text-muted-foreground mb-4">or click to browse files</p>
                <input
                  id="file-input"
                  type="file"
                  accept="image/*"
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
              <div className="space-y-6">
                <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                  {preview && (
                    <img src={preview} alt="Preview" className="w-16 h-16 object-cover rounded" />
                  )}
                  <div className="flex-1">
                    <p className="font-medium" data-testid="text-filename">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={resetUpload} data-testid="button-remove">
                    Remove
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="watermark-text">Watermark Text</Label>
                  <Input
                    id="watermark-text"
                    placeholder="Enter watermark text"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    data-testid="input-watermark-text"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Opacity ({opacity[0]}%)</Label>
                    <Slider
                      value={opacity}
                      onValueChange={setOpacity}
                      min={10}
                      max={100}
                      step={5}
                      data-testid="slider-opacity"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Position</Label>
                    <Select value={position} onValueChange={setPosition}>
                      <SelectTrigger data-testid="select-position">
                        <SelectValue placeholder="Select position" />
                      </SelectTrigger>
                      <SelectContent>
                        {positions.map((p) => (
                          <SelectItem key={p.value} value={p.value}>
                            {p.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button onClick={handleAddWatermark} className="w-full" disabled={!text.trim()} data-testid="button-add-watermark">
                  Add Watermark
                </Button>
              </div>
            )}

            {(uploadState === "uploading" || uploadState === "processing") && (
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                  <Droplets className="w-10 h-10 text-muted-foreground animate-pulse" />
                  <div className="flex-1">
                    <p className="font-medium">{file?.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {uploadState === "uploading" ? "Uploading..." : "Adding watermark..."}
                    </p>
                  </div>
                </div>
                <Progress value={progress} className="h-2" data-testid="progress-watermark" />
              </div>
            )}

            {uploadState === "complete" && (
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-green-500/10 rounded-lg">
                  <CheckCircle className="w-10 h-10 text-green-500" />
                  <div className="flex-1">
                    <p className="font-medium text-green-600 dark:text-green-400">
                      Watermark Added!
                    </p>
                    <p className="text-sm text-muted-foreground">
                      "{text}" at {positions.find(p => p.value === position)?.label}
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button onClick={handleDownload} className="flex-1 gap-2" data-testid="button-download">
                    <Download className="w-4 h-4" />
                    Download Image
                  </Button>
                  <Button variant="outline" onClick={resetUpload} data-testid="button-watermark-another">
                    Watermark Another
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
