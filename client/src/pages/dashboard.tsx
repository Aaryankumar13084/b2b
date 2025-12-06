import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import {
  FileText,
  Bot,
  Zap,
  History,
  ArrowRight,
  TrendingUp,
  Clock,
  File,
  Sparkles,
} from "lucide-react";
import { CREDIT_LIMITS } from "@shared/schema";
import type { File as FileType, AiUsageLog } from "@shared/schema";

interface DashboardStats {
  filesProcessedToday: number;
  filesProcessedTotal: number;
  aiCreditsUsed: number;
  aiCreditsLimit: number;
  recentFiles: FileType[];
  recentAiUsage: AiUsageLog[];
}

const quickActions = [
  { title: "PDF to Word", href: "/tools/pdf-to-word", icon: FileText, color: "bg-blue-500/10 text-blue-500" },
  { title: "Merge PDFs", href: "/tools/pdf-merge", icon: File, color: "bg-green-500/10 text-green-500" },
  { title: "AI Chat", href: "/ai/chat", icon: Bot, color: "bg-purple-500/10 text-purple-500" },
  { title: "AI Summary", href: "/ai/summary", icon: Sparkles, color: "bg-amber-500/10 text-amber-500" },
];

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold tabular-nums">{value}</div>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        )}
        {trend && (
          <div className="flex items-center gap-1 mt-2 text-xs text-green-600">
            <TrendingUp className="w-3 h-3" />
            <span>{trend}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CreditUsageCard({ used, limit, tier }: { used: number; limit: number; tier: string }) {
  const isUnlimited = limit === -1;
  const percentage = isUnlimited ? 0 : Math.min((used / limit) * 100, 100);
  const remaining = isUnlimited ? "Unlimited" : Math.max(limit - used, 0);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          AI Credits Today
        </CardTitle>
        <Zap className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-3xl font-bold tabular-nums">{used}</span>
          <span className="text-sm text-muted-foreground">
            / {isUnlimited ? "Unlimited" : limit}
          </span>
        </div>
        {!isUnlimited && (
          <Progress value={percentage} className="h-2" />
        )}
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            {isUnlimited ? "Unlimited usage" : `${remaining} credits remaining`}
          </span>
          <Badge variant="secondary" className="text-xs">
            {tier.charAt(0).toUpperCase() + tier.slice(1)}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { user } = useAuth();

  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  const tier = user?.subscriptionTier || "free";
  const creditLimit = CREDIT_LIMITS[tier as keyof typeof CREDIT_LIMITS]?.daily || 10;

  if (isLoading) {
    return (
      <div className="p-8 space-y-8">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight" data-testid="text-welcome">
          Welcome back, {user?.firstName || "there"}
        </h1>
        <p className="text-muted-foreground text-lg">
          Here's an overview of your document processing activity.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Files Today"
          value={stats?.filesProcessedToday || 0}
          icon={FileText}
          subtitle="Files processed today"
        />
        <StatCard
          title="Total Files"
          value={stats?.filesProcessedTotal || user?.totalFilesProcessed || 0}
          icon={File}
          subtitle="All time"
        />
        <CreditUsageCard
          used={stats?.aiCreditsUsed || user?.aiCreditsUsedToday || 0}
          limit={creditLimit}
          tier={tier}
        />
        <StatCard
          title="Storage Used"
          value={formatBytes(user?.totalStorageUsed || 0)}
          icon={History}
          subtitle="Temporary files"
        />
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <CardTitle>Quick Actions</CardTitle>
            <Link href="/tools">
              <Button variant="ghost" size="sm" data-testid="button-view-all-tools">
                View All
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              {quickActions.map((action) => (
                <Link key={action.href} href={action.href}>
                  <Card className="p-4 hover-elevate cursor-pointer">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${action.color}`}>
                        <action.icon className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-medium">{action.title}</h3>
                        <p className="text-sm text-muted-foreground">Quick access</p>
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <CardTitle>Recent Activity</CardTitle>
            <Link href="/history">
              <Button variant="ghost" size="sm" data-testid="button-view-history">
                View All
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {stats?.recentFiles && stats.recentFiles.length > 0 ? (
              <div className="space-y-4">
                {stats.recentFiles.slice(0, 5).map((file) => (
                  <div key={file.id} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-muted flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{file.originalName}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatRelativeTime(file.createdAt)}
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-xs shrink-0">
                      {file.status}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No recent activity</p>
                <Link href="/tools">
                  <Button variant="link" size="sm" className="mt-2">
                    Start processing files
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {tier === "free" && (
        <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="p-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="font-semibold text-lg">Upgrade to Pro</h3>
              <p className="text-sm text-muted-foreground">
                Get 500 AI credits per month, larger file limits, and priority processing.
              </p>
            </div>
            <Link href="/subscription">
              <Button data-testid="button-upgrade-cta">
                Upgrade Now
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
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

function formatRelativeTime(date: Date | string | null): string {
  if (!date) return "Unknown";
  const now = new Date();
  const then = new Date(date);
  const diff = now.getTime() - then.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}
