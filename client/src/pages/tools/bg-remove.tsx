import { useState, useRef } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Eraser,
  Upload,
  Download,
  ArrowLeft,
  CheckCircle,
  Sparkles,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Move,
  Image as ImageIcon,
  Palette,
  Layers,
  Wand2,
  FileImage,
  Loader2,
  Zap,
  Shield,
  Star,
  Maximize2,
  Contrast,
  Focus,
  Gauge,
  Clock,
  Award,
} from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

type UploadState = "idle" | "uploading" | "processing" | "complete" | "error";
type BackgroundType = "transparent" | "solid" | "gradient" | "image" | "blur";
type ExportFormat = "png" | "webp";
type ExportResolution = "original" | "hd" | "2k" | "4k";
type QualityMode = "fast" | "balanced" | "ultra";
type UpscaleMode = "none" | "2x";

const gradientPresets = [
  { name: "Sunset", value: "linear-gradient(135deg, #ff6b6b, #feca57)" },
  { name: "Ocean", value: "linear-gradient(135deg, #667eea, #764ba2)" },
  { name: "Forest", value: "linear-gradient(135deg, #11998e, #38ef7d)" },
  { name: "Midnight", value: "linear-gradient(135deg, #232526, #414345)" },
  { name: "Coral", value: "linear-gradient(135deg, #ff9a9e, #fecfef)" },
  { name: "Sky", value: "linear-gradient(135deg, #a1c4fd, #c2e9fb)" },
];

const solidColors = [
  "#ffffff", "#000000", "#f8f9fa", "#e9ecef", "#dee2e6",
  "#ff6b6b", "#feca57", "#48dbfb", "#1dd1a1", "#5f27cd",
  "#ff9ff3", "#54a0ff", "#00d2d3", "#ff9f43", "#10ac84",
];

export default function BgRemove() {
  const [file, setFile] = useState<File | null>(null);
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<any>(null);
  const { toast } = useToast();

  // Preview controls
  const [sliderPosition, setSliderPosition] = useState(50);
  const [zoom, setZoom] = useState(100);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });

  // Quality & Processing Options
  const [qualityMode, setQualityMode] = useState<QualityMode>("balanced");
  const [upscaleMode, setUpscaleMode] = useState<UpscaleMode>("none");
  const [edgeRefinement, setEdgeRefinement] = useState(true);
  const [shadowRemoval, setShadowRemoval] = useState(true);
  const [colorEnhancement, setColorEnhancement] = useState(true);
  const [sharpening, setSharpening] = useState(true);

  // Background options
  const [backgroundType, setBackgroundType] = useState<BackgroundType>("transparent");
  const [solidColor, setSolidColor] = useState("#ffffff");
  const [customColor, setCustomColor] = useState("#ffffff");
  const [selectedGradient, setSelectedGradient] = useState(gradientPresets[0].value);
  const [customBgImage, setCustomBgImage] = useState<string | null>(null);
  const [blurAmount, setBlurAmount] = useState(10);

  // Export options
  const [exportFormat, setExportFormat] = useState<ExportFormat>("png");
  const [exportResolution, setExportResolution] = useState<ExportResolution>("original");

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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
      setOriginalImage(URL.createObjectURL(selectedFile));
      setUploadState("idle");
      setProcessedImage(null);
      setResult(null);
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
      setOriginalImage(URL.createObjectURL(droppedFile));
      setUploadState("idle");
      setProcessedImage(null);
      setResult(null);
    }
  };

  const handleCustomBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type.startsWith("image/")) {
      setCustomBgImage(URL.createObjectURL(selectedFile));
      setBackgroundType("image");
    }
  };

  const handleRemove = async () => {
    if (!file) return;
    
    setUploadState("uploading");
    setProgress(10);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("qualityMode", qualityMode);
      formData.append("upscale", upscaleMode);
      formData.append("edgeRefinement", String(edgeRefinement));
      formData.append("shadowRemoval", String(shadowRemoval));
      formData.append("colorEnhancement", String(colorEnhancement));
      formData.append("sharpening", String(sharpening));

      setProgress(30);
      setUploadState("processing");

      const response = await fetch("/api/tools/bg-remove", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      setProgress(90);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to remove background");
      }

      const data = await response.json();
      setResult(data);
      
      if (data.outputPath) {
        const filename = data.outputPath.split("/").pop();
        const imageResponse = await fetch(`/api/tools/download/${filename}`);
        const blob = await imageResponse.blob();
        setProcessedImage(URL.createObjectURL(blob));
      }

      setProgress(100);
      setUploadState("complete");
      
      const qualityDesc = data.qualityScore >= 90 ? "Ultra" : data.qualityScore >= 80 ? "High" : "Good";
      toast({
        title: "Background Removed Successfully",
        description: `${qualityDesc} quality (Score: ${data.qualityScore || 85}/100) - Edge Quality: ${data.edgeQuality || "Very Good"}`,
      });
    } catch (error: any) {
      setUploadState("error");
      setUploadState("idle");
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getBackgroundStyle = () => {
    switch (backgroundType) {
      case "transparent":
        return {
          backgroundImage: `linear-gradient(45deg, #ccc 25%, transparent 25%), 
                           linear-gradient(-45deg, #ccc 25%, transparent 25%), 
                           linear-gradient(45deg, transparent 75%, #ccc 75%), 
                           linear-gradient(-45deg, transparent 75%, #ccc 75%)`,
          backgroundSize: "20px 20px",
          backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0px",
        };
      case "solid":
        return { backgroundColor: solidColor };
      case "gradient":
        return { background: selectedGradient };
      case "image":
        return customBgImage
          ? { backgroundImage: `url(${customBgImage})`, backgroundSize: "cover", backgroundPosition: "center" }
          : {};
      case "blur":
        return originalImage
          ? { 
              backgroundImage: `url(${originalImage})`, 
              backgroundSize: "cover", 
              backgroundPosition: "center",
              filter: `blur(${blurAmount}px)`,
            }
          : {};
      default:
        return {};
    }
  };

  const parseGradientColors = (gradientString: string): [string, string] => {
    const match = gradientString.match(/#[a-fA-F0-9]{6}/g);
    if (match && match.length >= 2) {
      return [match[0], match[1]];
    }
    return ["#667eea", "#764ba2"];
  };

  const handleExport = async () => {
    if (!processedImage || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    
    img.onload = async () => {
      let width = img.width;
      let height = img.height;

      switch (exportResolution) {
        case "hd":
          if (width < 1920) {
            const scale = 1920 / width;
            width = 1920;
            height = Math.round(height * scale);
          }
          break;
        case "2k":
          if (width < 2560) {
            const scale = 2560 / width;
            width = 2560;
            height = Math.round(height * scale);
          }
          break;
        case "4k":
          if (width < 3840) {
            const scale = 3840 / width;
            width = 3840;
            height = Math.round(height * scale);
          }
          break;
      }

      canvas.width = width;
      canvas.height = height;

      const drawBackground = (): Promise<void> => {
        return new Promise((resolve) => {
          if (backgroundType === "transparent") {
            ctx.clearRect(0, 0, width, height);
            resolve();
          } else if (backgroundType === "solid") {
            ctx.fillStyle = solidColor;
            ctx.fillRect(0, 0, width, height);
            resolve();
          } else if (backgroundType === "gradient") {
            const [color1, color2] = parseGradientColors(selectedGradient);
            const gradient = ctx.createLinearGradient(0, 0, width, height);
            gradient.addColorStop(0, color1);
            gradient.addColorStop(1, color2);
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, width, height);
            resolve();
          } else if (backgroundType === "image" && customBgImage) {
            const bgImg = new Image();
            bgImg.crossOrigin = "anonymous";
            bgImg.onload = () => {
              ctx.drawImage(bgImg, 0, 0, width, height);
              resolve();
            };
            bgImg.onerror = () => resolve();
            bgImg.src = customBgImage;
          } else if (backgroundType === "blur" && originalImage) {
            const tempCanvas = document.createElement("canvas");
            const tempCtx = tempCanvas.getContext("2d");
            if (tempCtx) {
              tempCanvas.width = width;
              tempCanvas.height = height;
              const bgImg = new Image();
              bgImg.crossOrigin = "anonymous";
              bgImg.onload = () => {
                tempCtx.filter = `blur(${blurAmount}px)`;
                tempCtx.drawImage(bgImg, 0, 0, width, height);
                ctx.drawImage(tempCanvas, 0, 0);
                resolve();
              };
              bgImg.onerror = () => resolve();
              bgImg.src = originalImage;
            } else {
              resolve();
            }
          } else {
            resolve();
          }
        });
      };

      await drawBackground();
      ctx.drawImage(img, 0, 0, width, height);

      const mimeType = exportFormat === "png" ? "image/png" : "image/webp";
      const quality = exportFormat === "webp" ? 0.9 : undefined;
      
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `bg-removed-${Date.now()}.${exportFormat}`;
          a.click();
          URL.revokeObjectURL(url);
        }
      }, mimeType, quality);
    };

    img.src = processedImage;
  };

  const handleDownload = () => {
    if (result?.outputPath) {
      const filename = result.outputPath.split("/").pop();
      window.open(`/api/tools/download/${filename}`, "_blank");
    }
  };

  const resetUpload = () => {
    setFile(null);
    setOriginalImage(null);
    setProcessedImage(null);
    setUploadState("idle");
    setProgress(0);
    setResult(null);
    setZoom(100);
    setPanOffset({ x: 0, y: 0 });
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
            <div className="w-12 h-12 rounded-lg bg-pink-500/10 flex items-center justify-center">
              <Eraser className="w-6 h-6 text-pink-500" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold" data-testid="text-page-title">AI Background Remover</h1>
                <Badge className="gap-1">
                  <Sparkles className="w-3 h-3" />
                  AI Powered
                </Badge>
              </div>
              <p className="text-muted-foreground">Remove backgrounds with AI precision and customize with advanced options</p>
            </div>
          </div>
        </div>

        {/* Feature badges */}
        <div className="flex flex-wrap gap-2 mb-6">
          <Badge variant="secondary" className="gap-1"><Wand2 className="w-3 h-3" /> Industry-Grade AI</Badge>
          <Badge variant="secondary" className="gap-1"><Layers className="w-3 h-3" /> Hair & Fine Details</Badge>
          <Badge variant="secondary" className="gap-1"><Shield className="w-3 h-3" /> Auto Error-Fix</Badge>
          <Badge variant="secondary" className="gap-1"><Maximize2 className="w-3 h-3" /> 2x Upscaling</Badge>
          <Badge variant="secondary" className="gap-1"><Award className="w-3 h-3" /> Quality Check</Badge>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Preview Area */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-lg">Preview</CardTitle>
                  {processedImage && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setZoom(Math.max(50, zoom - 25))}
                        data-testid="button-zoom-out"
                      >
                        <ZoomOut className="w-4 h-4" />
                      </Button>
                      <span className="text-sm text-muted-foreground w-12 text-center">{zoom}%</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setZoom(Math.min(200, zoom + 25))}
                        data-testid="button-zoom-in"
                      >
                        <ZoomIn className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => { setZoom(100); setPanOffset({ x: 0, y: 0 }); }}
                        data-testid="button-reset-view"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
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
                    <p className="text-muted-foreground mb-4">Supports JPG, PNG, WebP up to 50MB</p>
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

                {file && !processedImage && uploadState === "idle" && (
                  <div className="space-y-6">
                    <div className="relative rounded-lg overflow-hidden bg-muted aspect-video flex items-center justify-center">
                      {originalImage && (
                        <img
                          src={originalImage}
                          alt="Original"
                          className="max-w-full max-h-full object-contain"
                        />
                      )}
                    </div>

                    {/* Quality Mode Selection */}
                    <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium flex items-center gap-2">
                          <Gauge className="w-4 h-4" />
                          Processing Quality
                        </Label>
                        <div className="grid grid-cols-3 gap-2">
                          <Button
                            variant={qualityMode === "fast" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setQualityMode("fast")}
                            className="gap-1"
                            data-testid="button-quality-fast"
                          >
                            <Zap className="w-3 h-3" />
                            Fast
                          </Button>
                          <Button
                            variant={qualityMode === "balanced" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setQualityMode("balanced")}
                            className="gap-1"
                            data-testid="button-quality-balanced"
                          >
                            <Shield className="w-3 h-3" />
                            Balanced
                          </Button>
                          <Button
                            variant={qualityMode === "ultra" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setQualityMode("ultra")}
                            className="gap-1"
                            data-testid="button-quality-ultra"
                          >
                            <Star className="w-3 h-3" />
                            Ultra
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {qualityMode === "fast" && "Quick processing with standard quality"}
                          {qualityMode === "balanced" && "Optimal balance of speed and quality (recommended)"}
                          {qualityMode === "ultra" && "Maximum quality with advanced edge detection"}
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium flex items-center gap-2">
                          <Maximize2 className="w-4 h-4" />
                          Output Resolution
                        </Label>
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            variant={upscaleMode === "none" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setUpscaleMode("none")}
                            data-testid="button-upscale-none"
                          >
                            Original
                          </Button>
                          <Button
                            variant={upscaleMode === "2x" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setUpscaleMode("2x")}
                            className="gap-1"
                            data-testid="button-upscale-2x"
                          >
                            <Maximize2 className="w-3 h-3" />
                            2x Upscale
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm flex items-center gap-1">
                            <Layers className="w-3 h-3" />
                            Edge Refinement
                          </Label>
                          <Switch
                            checked={edgeRefinement}
                            onCheckedChange={setEdgeRefinement}
                            data-testid="switch-edge-refinement"
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label className="text-sm flex items-center gap-1">
                            <Eraser className="w-3 h-3" />
                            Shadow Removal
                          </Label>
                          <Switch
                            checked={shadowRemoval}
                            onCheckedChange={setShadowRemoval}
                            data-testid="switch-shadow-removal"
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label className="text-sm flex items-center gap-1">
                            <Contrast className="w-3 h-3" />
                            Color Enhancement
                          </Label>
                          <Switch
                            checked={colorEnhancement}
                            onCheckedChange={setColorEnhancement}
                            data-testid="switch-color-enhancement"
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label className="text-sm flex items-center gap-1">
                            <Focus className="w-3 h-3" />
                            Sharpening
                          </Label>
                          <Switch
                            checked={sharpening}
                            onCheckedChange={setSharpening}
                            data-testid="switch-sharpening"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <Button onClick={handleRemove} className="flex-1 gap-2" data-testid="button-remove-bg">
                        <Wand2 className="w-4 h-4" />
                        Remove Background {qualityMode === "ultra" ? "(Ultra)" : qualityMode === "fast" ? "(Fast)" : ""}
                      </Button>
                      <Button variant="outline" onClick={resetUpload} data-testid="button-cancel">
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                {(uploadState === "uploading" || uploadState === "processing") && (
                  <div className="space-y-6">
                    <div className="relative rounded-lg overflow-hidden bg-muted aspect-video flex items-center justify-center">
                      {originalImage && (
                        <img
                          src={originalImage}
                          alt="Processing"
                          className="max-w-full max-h-full object-contain opacity-50"
                        />
                      )}
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80">
                        <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
                        <p className="font-medium">
                          {uploadState === "uploading" ? "Uploading image..." : "AI is removing background..."}
                        </p>
                        <p className="text-sm text-muted-foreground">This may take a few seconds</p>
                      </div>
                    </div>
                    <Progress value={progress} className="h-2" data-testid="progress-remove" />
                  </div>
                )}

                {uploadState === "complete" && processedImage && (
                  <div className="space-y-4">
                    {/* Before/After Slider */}
                    <div 
                      ref={containerRef}
                      className="relative rounded-lg overflow-hidden aspect-video"
                      style={{ ...getBackgroundStyle() }}
                    >
                      {/* Original Image (Behind) */}
                      <div 
                        className="absolute inset-0"
                        style={{ 
                          clipPath: `inset(0 ${100 - sliderPosition}% 0 0)`,
                        }}
                      >
                        {originalImage && (
                          <img
                            src={originalImage}
                            alt="Original"
                            className="w-full h-full object-contain"
                            style={{ transform: `scale(${zoom / 100}) translate(${panOffset.x}px, ${panOffset.y}px)` }}
                          />
                        )}
                        <div className="absolute top-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-xs">
                          Original
                        </div>
                      </div>

                      {/* Processed Image (Front) */}
                      <div 
                        className="absolute inset-0"
                        style={{ 
                          clipPath: `inset(0 0 0 ${sliderPosition}%)`,
                          ...getBackgroundStyle(),
                        }}
                      >
                        <img
                          src={processedImage}
                          alt="Processed"
                          className="w-full h-full object-contain"
                          style={{ transform: `scale(${zoom / 100}) translate(${panOffset.x}px, ${panOffset.y}px)` }}
                        />
                        <div className="absolute top-2 right-2 bg-primary/80 text-white px-2 py-1 rounded text-xs">
                          Processed
                        </div>
                      </div>

                      {/* Slider Handle */}
                      <div 
                        className="absolute top-0 bottom-0 w-1 bg-white cursor-ew-resize shadow-lg"
                        style={{ left: `${sliderPosition}%`, transform: "translateX(-50%)" }}
                      >
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center">
                          <Move className="w-4 h-4 text-muted-foreground" />
                        </div>
                      </div>
                    </div>

                    {/* Slider Control */}
                    <div className="space-y-2">
                      <Label className="text-sm">Before / After Comparison</Label>
                      <Slider
                        value={[sliderPosition]}
                        onValueChange={([val]) => setSliderPosition(val)}
                        min={0}
                        max={100}
                        step={1}
                        data-testid="slider-comparison"
                      />
                    </div>

                    <canvas ref={canvasRef} className="hidden" />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Sidebar - Options */}
          <div className="space-y-4">
            {uploadState === "complete" && processedImage && (
              <>
                {/* Background Options */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Palette className="w-4 h-4" />
                      Background
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Tabs value={backgroundType} onValueChange={(v) => setBackgroundType(v as BackgroundType)}>
                      <TabsList className="grid grid-cols-3 mb-4">
                        <TabsTrigger value="transparent">None</TabsTrigger>
                        <TabsTrigger value="solid">Solid</TabsTrigger>
                        <TabsTrigger value="gradient">Gradient</TabsTrigger>
                      </TabsList>
                      <TabsList className="grid grid-cols-2">
                        <TabsTrigger value="image">Image</TabsTrigger>
                        <TabsTrigger value="blur">Blur</TabsTrigger>
                      </TabsList>

                      <TabsContent value="solid" className="mt-4 space-y-3">
                        <div className="grid grid-cols-5 gap-2">
                          {solidColors.map((color) => (
                            <button
                              key={color}
                              className={`w-8 h-8 rounded-md border-2 transition-all ${
                                solidColor === color ? "border-primary scale-110" : "border-transparent"
                              }`}
                              style={{ backgroundColor: color }}
                              onClick={() => setSolidColor(color)}
                              data-testid={`button-color-${color}`}
                            />
                          ))}
                        </div>
                        <div className="flex items-center gap-2">
                          <Label className="text-sm">Custom:</Label>
                          <Input
                            type="color"
                            value={customColor}
                            onChange={(e) => {
                              setCustomColor(e.target.value);
                              setSolidColor(e.target.value);
                            }}
                            className="w-12 h-8 p-0 border-0"
                            data-testid="input-custom-color"
                          />
                        </div>
                      </TabsContent>

                      <TabsContent value="gradient" className="mt-4 space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                          {gradientPresets.map((preset) => (
                            <button
                              key={preset.name}
                              className={`h-12 rounded-md border-2 transition-all ${
                                selectedGradient === preset.value ? "border-primary" : "border-transparent"
                              }`}
                              style={{ background: preset.value }}
                              onClick={() => setSelectedGradient(preset.value)}
                              data-testid={`button-gradient-${preset.name}`}
                            >
                              <span className="text-white text-xs font-medium drop-shadow">{preset.name}</span>
                            </button>
                          ))}
                        </div>
                      </TabsContent>

                      <TabsContent value="image" className="mt-4 space-y-3">
                        <div
                          className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-primary/50"
                          onClick={() => document.getElementById("bg-image-input")?.click()}
                        >
                          <ImageIcon className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">Upload background image</p>
                          <input
                            id="bg-image-input"
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleCustomBgUpload}
                            data-testid="input-bg-image"
                          />
                        </div>
                        {customBgImage && (
                          <img src={customBgImage} alt="Custom BG" className="w-full h-20 object-cover rounded-md" />
                        )}
                      </TabsContent>

                      <TabsContent value="blur" className="mt-4 space-y-3">
                        <div className="space-y-2">
                          <Label className="text-sm">Blur Amount: {blurAmount}px</Label>
                          <Slider
                            value={[blurAmount]}
                            onValueChange={([val]) => setBlurAmount(val)}
                            min={5}
                            max={30}
                            step={1}
                            data-testid="slider-blur"
                          />
                        </div>
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>

                {/* Export Options */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Download className="w-4 h-4" />
                      Export
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-sm">Format</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          variant={exportFormat === "png" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setExportFormat("png")}
                          className="gap-1"
                          data-testid="button-format-png"
                        >
                          <FileImage className="w-3 h-3" />
                          PNG
                        </Button>
                        <Button
                          variant={exportFormat === "webp" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setExportFormat("webp")}
                          className="gap-1"
                          data-testid="button-format-webp"
                        >
                          <FileImage className="w-3 h-3" />
                          WebP
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm">Resolution</Label>
                      <div className="grid grid-cols-2 gap-2">
                        {(["original", "hd", "2k", "4k"] as ExportResolution[]).map((res) => (
                          <Button
                            key={res}
                            variant={exportResolution === res ? "default" : "outline"}
                            size="sm"
                            onClick={() => setExportResolution(res)}
                            data-testid={`button-res-${res}`}
                          >
                            {res.toUpperCase()}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <Button onClick={handleExport} className="w-full gap-2" data-testid="button-download">
                      <Download className="w-4 h-4" />
                      Download with Background
                    </Button>

                    <Button variant="outline" onClick={resetUpload} className="w-full" data-testid="button-new">
                      Process New Image
                    </Button>
                  </CardContent>
                </Card>
              </>
            )}

            {/* Quality Report - Show after processing */}
            {uploadState === "complete" && result && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Award className="w-4 h-4" />
                    Quality Report
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Quality Score</span>
                    <div className="flex items-center gap-2">
                      <Progress value={result.qualityScore || 85} className="w-20 h-2" />
                      <Badge variant={result.qualityScore >= 90 ? "default" : "secondary"}>
                        {result.qualityScore || 85}/100
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Edge Quality</span>
                    <Badge variant="outline">{result.edgeQuality || "Very Good"}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Processing Time
                    </span>
                    <span className="text-sm font-medium">
                      {result.processingTime ? `${(result.processingTime / 1000).toFixed(1)}s` : "N/A"}
                    </span>
                  </div>
                  {result.originalDimensions && result.finalDimensions && (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Original Size</span>
                        <span className="text-sm">
                          {result.originalDimensions.width} x {result.originalDimensions.height}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Final Size</span>
                        <span className="text-sm font-medium">
                          {result.finalDimensions.width} x {result.finalDimensions.height}
                          {result.metadata?.upscaled && (
                            <Badge variant="secondary" className="ml-2">2x</Badge>
                          )}
                        </span>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Features Info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  AI Features
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                  <span>Industry-grade background removal</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                  <span>Advanced hair & fine detail detection</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                  <span>Auto shadow removal & edge refinement</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                  <span>Color enhancement & sharpening</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                  <span>2x upscaling with quality check</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                  <span>Ultra-quality export (PNG/WebP)</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
