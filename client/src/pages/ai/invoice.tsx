import { useState } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Receipt, Upload, ArrowLeft, CheckCircle, Sparkles, FileText, Copy, Download, Building2, Calendar, DollarSign, Hash } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

type UploadState = "idle" | "uploading" | "processing" | "complete" | "error";

interface InvoiceData {
  invoiceNumber: string;
  date: string;
  dueDate: string;
  vendor: {
    name: string;
    address: string;
    gst?: string;
  };
  buyer: {
    name: string;
    address: string;
    gst?: string;
  };
  items: {
    description: string;
    quantity: number;
    rate: number;
    amount: number;
  }[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  currency: string;
}

export default function AIInvoice() {
  const [file, setFile] = useState<File | null>(null);
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<InvoiceData | null>(null);
  const { toast } = useToast();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const validTypes = [
        "application/pdf",
        "image/jpeg",
        "image/png",
        "image/webp",
      ];
      if (!validTypes.includes(selectedFile.type)) {
        toast({
          title: "Invalid file type",
          description: "Please select a PDF or image file (JPG, PNG, WebP)",
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
        "image/jpeg",
        "image/png",
        "image/webp",
      ];
      if (!validTypes.includes(droppedFile.type)) {
        toast({
          title: "Invalid file type",
          description: "Please select a PDF or image file (JPG, PNG, WebP)",
          variant: "destructive",
        });
        return;
      }
      setFile(droppedFile);
      setUploadState("idle");
      setResult(null);
    }
  };

  const handleExtract = async () => {
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
            setResult({
              invoiceNumber: "INV-2024-00847",
              date: "2024-12-01",
              dueDate: "2024-12-31",
              vendor: {
                name: "TechSolutions Pvt. Ltd.",
                address: "123 Business Park, Tech City, TC 500001",
                gst: "29AABCT1234N1ZG",
              },
              buyer: {
                name: "ABC Enterprises",
                address: "456 Commerce Street, Trade Zone, TZ 400001",
                gst: "27AABCE5678M1ZH",
              },
              items: [
                { description: "Software License - Annual", quantity: 5, rate: 12000, amount: 60000 },
                { description: "Implementation Services", quantity: 1, rate: 25000, amount: 25000 },
                { description: "Support & Maintenance", quantity: 12, rate: 2500, amount: 30000 },
              ],
              subtotal: 115000,
              taxRate: 18,
              taxAmount: 20700,
              total: 135700,
              currency: "INR",
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

  const handleExportJson = () => {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "invoice-data.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({
      title: "Exported successfully",
      description: "Invoice data has been exported as JSON",
    });
  };

  const resetUpload = () => {
    setFile(null);
    setUploadState("idle");
    setProgress(0);
    setResult(null);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: result?.currency || "INR",
      maximumFractionDigits: 0,
    }).format(amount);
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
              <Receipt className="w-6 h-6 text-green-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold" data-testid="text-page-title">Invoice Reader</h1>
              <p className="text-muted-foreground">Extract invoice data automatically using AI</p>
            </div>
            <Badge variant="secondary" className="ml-auto">
              <Sparkles className="w-3 h-3 mr-1" />
              3 Credits/invoice
            </Badge>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Upload an invoice</CardTitle>
            <CardDescription>
              Upload a PDF or image of your invoice to extract data
            </CardDescription>
          </CardHeader>
          <CardContent>
            {uploadState === "idle" && !file && (
              <div
                className="border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors hover:border-primary/50 hover:bg-muted/50"
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => document.getElementById("invoice-input")?.click()}
                data-testid="dropzone-upload"
              >
                <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-lg font-medium mb-2">Drop your invoice here</p>
                <p className="text-muted-foreground mb-4">PDF or image files (JPG, PNG, WebP)</p>
                <input
                  id="invoice-input"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
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
                <Button onClick={handleExtract} className="w-full gap-2" data-testid="button-extract">
                  <Sparkles className="w-4 h-4" />
                  Extract Invoice Data
                </Button>
              </div>
            )}

            {(uploadState === "uploading" || uploadState === "processing") && (
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                  <Receipt className="w-10 h-10 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="font-medium">{file?.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {uploadState === "uploading" ? "Uploading..." : "Extracting data..."}
                    </p>
                  </div>
                </div>
                <Progress value={progress} className="h-2" data-testid="progress-extract" />
                <p className="text-sm text-center text-muted-foreground">
                  {uploadState === "uploading"
                    ? "Uploading your invoice..."
                    : "AI is analyzing and extracting invoice data..."}
                </p>
              </div>
            )}

            {uploadState === "complete" && result && (
              <div className="space-y-6">
                <div className="flex items-center gap-4 p-4 bg-green-500/10 rounded-lg">
                  <CheckCircle className="w-10 h-10 text-green-500" />
                  <div className="flex-1">
                    <p className="font-medium text-green-600 dark:text-green-400">
                      Extraction Complete!
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Found {result.items.length} line items
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleExportJson} data-testid="button-export-json">
                      <Download className="w-4 h-4 mr-2" />
                      Export JSON
                    </Button>
                    <Button variant="outline" size="sm" onClick={resetUpload} data-testid="button-extract-another">
                      Extract Another
                    </Button>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        <Hash className="w-4 h-4 text-muted-foreground" />
                        <CardTitle className="text-base">Invoice Details</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Invoice Number</span>
                        <span className="text-sm font-medium" data-testid="text-invoice-number">{result.invoiceNumber}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Date</span>
                        <span className="text-sm font-medium" data-testid="text-invoice-date">{result.date}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Due Date</span>
                        <span className="text-sm font-medium" data-testid="text-due-date">{result.dueDate}</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-muted-foreground" />
                        <CardTitle className="text-base">Totals</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Subtotal</span>
                        <span className="text-sm font-medium" data-testid="text-subtotal">{formatCurrency(result.subtotal)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Tax ({result.taxRate}%)</span>
                        <span className="text-sm font-medium" data-testid="text-tax">{formatCurrency(result.taxAmount)}</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t">
                        <span className="text-sm font-semibold">Total</span>
                        <span className="text-sm font-bold text-green-600 dark:text-green-400" data-testid="text-total">{formatCurrency(result.total)}</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-muted-foreground" />
                          <CardTitle className="text-base">Vendor</CardTitle>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopy(`${result.vendor.name}\n${result.vendor.address}\nGST: ${result.vendor.gst || "N/A"}`)}
                          data-testid="button-copy-vendor"
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <p className="font-medium" data-testid="text-vendor-name">{result.vendor.name}</p>
                      <p className="text-sm text-muted-foreground" data-testid="text-vendor-address">{result.vendor.address}</p>
                      {result.vendor.gst && (
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs" data-testid="text-vendor-gst">
                            GST: {result.vendor.gst}
                          </Badge>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-muted-foreground" />
                          <CardTitle className="text-base">Buyer</CardTitle>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopy(`${result.buyer.name}\n${result.buyer.address}\nGST: ${result.buyer.gst || "N/A"}`)}
                          data-testid="button-copy-buyer"
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <p className="font-medium" data-testid="text-buyer-name">{result.buyer.name}</p>
                      <p className="text-sm text-muted-foreground" data-testid="text-buyer-address">{result.buyer.address}</p>
                      {result.buyer.gst && (
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs" data-testid="text-buyer-gst">
                            GST: {result.buyer.gst}
                          </Badge>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="text-base">Line Items</CardTitle>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopy(result.items.map(item => `${item.description}: ${formatCurrency(item.amount)}`).join("\n"))}
                        data-testid="button-copy-items"
                      >
                        <Copy className="w-4 h-4 mr-2" />
                        Copy
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[200px]">
                      <div className="space-y-3">
                        <div className="grid grid-cols-12 gap-4 text-xs font-medium text-muted-foreground pb-2 border-b">
                          <div className="col-span-6">Description</div>
                          <div className="col-span-2 text-right">Qty</div>
                          <div className="col-span-2 text-right">Rate</div>
                          <div className="col-span-2 text-right">Amount</div>
                        </div>
                        {result.items.map((item, index) => (
                          <div
                            key={index}
                            className="grid grid-cols-12 gap-4 text-sm py-2 border-b border-border/50 last:border-0"
                            data-testid={`row-item-${index}`}
                          >
                            <div className="col-span-6">{item.description}</div>
                            <div className="col-span-2 text-right text-muted-foreground">{item.quantity}</div>
                            <div className="col-span-2 text-right text-muted-foreground">{formatCurrency(item.rate)}</div>
                            <div className="col-span-2 text-right font-medium">{formatCurrency(item.amount)}</div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
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
