import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "wouter";
import { useState } from "react";
import {
  FileText,
  Image,
  Database,
  Search,
  FileUp,
  FileMinus,
  FileOutput,
  Lock,
  Unlock,
  Scissors,
  ImageMinus,
  Maximize2,
  RefreshCw,
  TableProperties,
  Braces,
  FileSpreadsheet,
  Layers,
  FileImage,
  Droplets,
  RotateCw,
  ImagePlus,
} from "lucide-react";

interface Tool {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  category: "document" | "image" | "data";
  href: string;
  badge?: string;
}

const tools: Tool[] = [
  {
    id: "pdf-to-word",
    title: "PDF to Word",
    description: "Convert PDF documents to editable Word files",
    icon: FileOutput,
    category: "document",
    href: "/tools/pdf-to-word",
  },
  {
    id: "word-to-pdf",
    title: "Word to PDF",
    description: "Convert Word documents to PDF format",
    icon: FileUp,
    category: "document",
    href: "/tools/word-to-pdf",
  },
  {
    id: "pdf-merge",
    title: "PDF Merge",
    description: "Combine multiple PDF files into one",
    icon: Layers,
    category: "document",
    href: "/tools/pdf-merge",
  },
  {
    id: "pdf-compress",
    title: "PDF Compress",
    description: "Reduce PDF file size while maintaining quality",
    icon: FileMinus,
    category: "document",
    href: "/tools/pdf-compress",
  },
  {
    id: "pdf-split",
    title: "PDF Split",
    description: "Split PDF into separate pages or sections",
    icon: Scissors,
    category: "document",
    href: "/tools/pdf-split",
  },
  {
    id: "pdf-lock",
    title: "PDF Lock",
    description: "Password protect your PDF documents",
    icon: Lock,
    category: "document",
    href: "/tools/pdf-lock",
  },
  {
    id: "pdf-unlock",
    title: "PDF Unlock",
    description: "Remove password from protected PDFs",
    icon: Unlock,
    category: "document",
    href: "/tools/pdf-unlock",
  },
  {
    id: "pdf-to-image",
    title: "PDF to Image",
    description: "Convert PDF pages to PNG or JPG images",
    icon: FileImage,
    category: "document",
    href: "/tools/pdf-to-image",
  },
  {
    id: "pdf-watermark",
    title: "PDF Watermark",
    description: "Add text watermark to your PDF documents",
    icon: Droplets,
    category: "document",
    href: "/tools/pdf-watermark",
  },
  {
    id: "pdf-rotate",
    title: "PDF Rotate",
    description: "Rotate PDF pages by 90, 180, or 270 degrees",
    icon: RotateCw,
    category: "document",
    href: "/tools/pdf-rotate",
  },
  {
    id: "image-to-pdf",
    title: "Image to PDF",
    description: "Convert multiple images into a single PDF",
    icon: ImagePlus,
    category: "document",
    href: "/tools/image-to-pdf",
  },
  {
    id: "image-compress",
    title: "Image Compress",
    description: "Reduce image file size without losing quality",
    icon: ImageMinus,
    category: "image",
    href: "/tools/image-compress",
  },
  {
    id: "image-resize",
    title: "Image Resize",
    description: "Resize images to specific dimensions",
    icon: Maximize2,
    category: "image",
    href: "/tools/image-resize",
  },
  {
    id: "image-convert",
    title: "Image Convert",
    description: "Convert between JPG, PNG, WEBP formats",
    icon: RefreshCw,
    category: "image",
    href: "/tools/image-convert",
  },
  {
    id: "bg-remove",
    title: "Background Remover",
    description: "Remove backgrounds from images using AI",
    icon: Image,
    category: "image",
    href: "/tools/bg-remove",
  },
  {
    id: "csv-to-excel",
    title: "CSV to Excel",
    description: "Convert CSV files to Excel spreadsheets",
    icon: FileSpreadsheet,
    category: "data",
    href: "/tools/csv-to-excel",
  },
  {
    id: "excel-clean",
    title: "Excel Cleaner",
    description: "Clean and format Excel data automatically",
    icon: TableProperties,
    category: "data",
    href: "/tools/excel-clean",
  },
  {
    id: "json-format",
    title: "JSON Formatter",
    description: "Format and validate JSON data",
    icon: Braces,
    category: "data",
    href: "/tools/json-format",
  },
];

const categories = [
  { id: "all", label: "All Tools", icon: Search },
  { id: "document", label: "Document", icon: FileText },
  { id: "image", label: "Image", icon: Image },
  { id: "data", label: "Data", icon: Database },
];

export default function Tools() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");

  const filteredTools = tools.filter((tool) => {
    const matchesSearch =
      tool.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      activeCategory === "all" || tool.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="p-8 space-y-8">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">Tools Library</h1>
        <p className="text-muted-foreground text-lg">
          Powerful tools to transform your documents, images, and data.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search tools..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="input-search-tools"
          />
        </div>

        <Tabs value={activeCategory} onValueChange={setActiveCategory}>
          <TabsList>
            {categories.map((cat) => (
              <TabsTrigger
                key={cat.id}
                value={cat.id}
                className="gap-2"
                data-testid={`tab-${cat.id}`}
              >
                <cat.icon className="w-4 h-4" />
                <span className="hidden sm:inline">{cat.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredTools.map((tool) => (
          <ToolCard key={tool.id} tool={tool} />
        ))}
      </div>

      {filteredTools.length === 0 && (
        <div className="text-center py-16">
          <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium">No tools found</h3>
          <p className="text-muted-foreground mt-1">
            Try adjusting your search or filter criteria.
          </p>
        </div>
      )}
    </div>
  );
}

function ToolCard({ tool }: { tool: Tool }) {
  const isComingSoon = tool.badge === "Coming Soon";

  const content = (
    <Card className={`p-6 h-full ${!isComingSoon ? "hover-elevate cursor-pointer" : "opacity-60"}`}>
      <CardContent className="p-0 space-y-4">
        <div className="flex items-start justify-between gap-2">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <tool.icon className="w-6 h-6 text-primary" />
          </div>
          {tool.badge && (
            <Badge variant="secondary" className="text-xs shrink-0">
              {tool.badge}
            </Badge>
          )}
        </div>
        <div className="space-y-1">
          <h3 className="font-semibold">{tool.title}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {tool.description}
          </p>
        </div>
      </CardContent>
    </Card>
  );

  if (isComingSoon) {
    return <div data-testid={`card-tool-${tool.id}`}>{content}</div>;
  }

  return (
    <Link href={tool.href} data-testid={`card-tool-${tool.id}`}>
      {content}
    </Link>
  );
}
