import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import {
  Users,
  FileText,
  Bot,
  DollarSign,
  TrendingUp,
  ArrowRight,
  Activity,
  Shield,
  AlertTriangle,
} from "lucide-react";

interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  filesProcessedToday: number;
  filesProcessedTotal: number;
  aiCreditsUsedToday: number;
  aiCreditsUsedTotal: number;
  proSubscribers: number;
  enterpriseSubscribers: number;
  revenueThisMonth: number;
  storageUsed: number;
}

export default function AdminDashboard() {
  const { data: stats, isLoading } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
  });

  if (isLoading) {
    return (
      <div className="p-8 space-y-8">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(8)].map((_, i) => (
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
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-4xl font-bold tracking-tight">Admin Panel</h1>
            <Badge variant="destructive" className="gap-1">
              <Shield className="w-3 h-3" />
              Admin
            </Badge>
          </div>
          <p className="text-muted-foreground text-lg">
            Monitor and manage your platform.
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Users"
          value={stats?.totalUsers || 0}
          icon={Users}
          trend="+12%"
          trendUp
        />
        <StatCard
          title="Active Today"
          value={stats?.activeUsers || 0}
          icon={Activity}
          subtitle="users active"
        />
        <StatCard
          title="Files Processed"
          value={stats?.filesProcessedToday || 0}
          icon={FileText}
          subtitle="today"
        />
        <StatCard
          title="AI Credits Used"
          value={stats?.aiCreditsUsedToday || 0}
          icon={Bot}
          subtitle="today"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <CardTitle>Revenue Overview</CardTitle>
            <Link href="/admin/analytics">
              <Button variant="ghost" size="sm" data-testid="button-view-analytics">
                View Details
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 sm:grid-cols-3">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">This Month</p>
                <p className="text-3xl font-bold tabular-nums">
                  ${(stats?.revenueThisMonth || 0).toLocaleString()}
                </p>
                <div className="flex items-center gap-1 text-xs text-green-600">
                  <TrendingUp className="w-3 h-3" />
                  <span>+8% from last month</span>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Pro Subscribers</p>
                <p className="text-3xl font-bold tabular-nums">
                  {stats?.proSubscribers || 0}
                </p>
                <p className="text-xs text-muted-foreground">
                  ${((stats?.proSubscribers || 0) * 19).toLocaleString()}/mo
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Enterprise</p>
                <p className="text-3xl font-bold tabular-nums">
                  {stats?.enterpriseSubscribers || 0}
                </p>
                <p className="text-xs text-muted-foreground">
                  ${((stats?.enterpriseSubscribers || 0) * 99).toLocaleString()}/mo
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/admin/users">
              <Button variant="outline" className="w-full justify-start" data-testid="button-manage-users">
                <Users className="w-4 h-4 mr-2" />
                Manage Users
              </Button>
            </Link>
            <Link href="/admin/analytics">
              <Button variant="outline" className="w-full justify-start" data-testid="button-view-reports">
                <Activity className="w-4 h-4 mr-2" />
                View Analytics
              </Button>
            </Link>
            <Button variant="outline" className="w-full justify-start" data-testid="button-system-health">
              <Shield className="w-4 h-4 mr-2" />
              System Health
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <CardTitle>Platform Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <MetricRow
                label="Total Files Processed"
                value={(stats?.filesProcessedTotal || 0).toLocaleString()}
              />
              <MetricRow
                label="Total AI Credits Used"
                value={(stats?.aiCreditsUsedTotal || 0).toLocaleString()}
              />
              <MetricRow
                label="Storage Used"
                value={formatBytes(stats?.storageUsed || 0)}
              />
              <MetricRow
                label="Free Users"
                value={(
                  (stats?.totalUsers || 0) -
                  (stats?.proSubscribers || 0) -
                  (stats?.enterpriseSubscribers || 0)
                ).toLocaleString()}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-yellow-500/10">
                <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">High API Usage</p>
                  <p className="text-xs text-muted-foreground">
                    3 users approaching daily limits
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <Activity className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">System Status</p>
                  <p className="text-xs text-muted-foreground">
                    All systems operational
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  trendUp,
  subtitle,
}: {
  title: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  trend?: string;
  trendUp?: boolean;
  subtitle?: string;
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
        <div className="text-3xl font-bold tabular-nums">{value.toLocaleString()}</div>
        {trend && (
          <div
            className={`flex items-center gap-1 mt-1 text-xs ${
              trendUp ? "text-green-600" : "text-red-600"
            }`}
          >
            <TrendingUp className="w-3 h-3" />
            <span>{trend}</span>
          </div>
        )}
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}
