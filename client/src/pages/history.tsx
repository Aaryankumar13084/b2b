import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FileText,
  Download,
  Trash2,
  Clock,
  File,
  Bot,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
} from "lucide-react";
import type { File as FileType, AiUsageLog } from "@shared/schema";

interface HistoryData {
  files: FileType[];
  aiUsage: AiUsageLog[];
}

const statusConfig = {
  pending: { icon: Clock, color: "text-yellow-500", label: "Pending" },
  processing: { icon: Loader2, color: "text-blue-500", label: "Processing" },
  completed: { icon: CheckCircle, color: "text-green-500", label: "Completed" },
  failed: { icon: XCircle, color: "text-red-500", label: "Failed" },
  deleted: { icon: Trash2, color: "text-muted-foreground", label: "Deleted" },
};

export default function History() {
  const { data, isLoading } = useQuery<HistoryData>({
    queryKey: ["/api/history"],
  });

  if (isLoading) {
    return (
      <div className="p-8 space-y-8">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const files = data?.files || [];
  const aiUsage = data?.aiUsage || [];

  return (
    <div className="p-8 space-y-8">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">History</h1>
        <p className="text-muted-foreground text-lg">
          View your file processing and AI usage history.
        </p>
      </div>

      <Tabs defaultValue="files" className="space-y-6">
        <TabsList>
          <TabsTrigger value="files" className="gap-2" data-testid="tab-files">
            <File className="w-4 h-4" />
            Files
            {files.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {files.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="ai" className="gap-2" data-testid="tab-ai-usage">
            <Bot className="w-4 h-4" />
            AI Usage
            {aiUsage.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {aiUsage.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="files">
          <Card>
            <CardHeader>
              <CardTitle>File Processing History</CardTitle>
            </CardHeader>
            <CardContent>
              {files.length === 0 ? (
                <EmptyState
                  icon={FileText}
                  title="No files processed yet"
                  description="Start using our tools to see your file history here."
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>File Name</TableHead>
                      <TableHead>Tool Used</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Processed</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {files.map((file) => {
                      const status = statusConfig[file.status as keyof typeof statusConfig] || statusConfig.pending;
                      const StatusIcon = status.icon;

                      return (
                        <TableRow key={file.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                              <span className="truncate max-w-48">{file.originalName}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">
                              {file.toolUsed?.replace(/_/g, " ") || "Unknown"}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatBytes(file.fileSize)}</TableCell>
                          <TableCell>
                            <div className={`flex items-center gap-1.5 ${status.color}`}>
                              <StatusIcon className="w-4 h-4" />
                              <span className="text-sm">{status.label}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatDate(file.createdAt)}
                          </TableCell>
                          <TableCell className="text-right">
                            {file.status === "completed" && file.outputPath && (
                              <Button
                                size="icon"
                                variant="ghost"
                                data-testid={`button-download-${file.id}`}
                              >
                                <Download className="w-4 h-4" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai">
          <Card>
            <CardHeader>
              <CardTitle>AI Usage History</CardTitle>
            </CardHeader>
            <CardContent>
              {aiUsage.length === 0 ? (
                <EmptyState
                  icon={Bot}
                  title="No AI usage yet"
                  description="Start using AI features to see your usage history here."
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Feature</TableHead>
                      <TableHead>Credits</TableHead>
                      <TableHead>Tokens</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {aiUsage.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <Bot className="w-4 h-4 text-purple-500 shrink-0" />
                            <span className="capitalize">
                              {log.toolType?.replace(/_/g, " ") || "Unknown"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{log.creditsUsed}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {log.inputTokens && log.outputTokens
                            ? `${log.inputTokens} / ${log.outputTokens}`
                            : "-"}
                        </TableCell>
                        <TableCell>
                          {log.success ? (
                            <div className="flex items-center gap-1.5 text-green-500">
                              <CheckCircle className="w-4 h-4" />
                              <span className="text-sm">Success</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 text-red-500">
                              <XCircle className="w-4 h-4" />
                              <span className="text-sm">Failed</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(log.createdAt)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="text-center py-12">
      <Icon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
      <h3 className="text-lg font-medium">{title}</h3>
      <p className="text-muted-foreground mt-1 max-w-sm mx-auto">{description}</p>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function formatDate(date: Date | string | null): string {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
