import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  FileText,
  Bot,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Activity,
  Clock,
} from "lucide-react";

export default function AdminAnalytics() {
  const stats = [
    {
      title: "Total Users",
      value: "1,234",
      change: "+12.5%",
      trend: "up",
      icon: Users,
    },
    {
      title: "Files Processed",
      value: "45,678",
      change: "+8.2%",
      trend: "up",
      icon: FileText,
    },
    {
      title: "AI Requests",
      value: "23,456",
      change: "+15.3%",
      trend: "up",
      icon: Bot,
    },
    {
      title: "Revenue (MRR)",
      value: "$12,345",
      change: "-2.1%",
      trend: "down",
      icon: DollarSign,
    },
  ];

  const topTools = [
    { name: "PDF to Word", usage: 12453, percentage: 28 },
    { name: "PDF Compress", usage: 9876, percentage: 22 },
    { name: "AI Summary", usage: 7654, percentage: 17 },
    { name: "PDF Merge", usage: 5432, percentage: 12 },
    { name: "AI Chat", usage: 4321, percentage: 10 },
  ];

  const recentActivity = [
    { action: "New user registered", user: "john@example.com", time: "2 minutes ago" },
    { action: "Pro subscription started", user: "jane@company.com", time: "15 minutes ago" },
    { action: "1000 files processed", user: "System", time: "1 hour ago" },
    { action: "Enterprise upgrade", user: "corp@business.com", time: "3 hours ago" },
    { action: "Support ticket resolved", user: "admin", time: "5 hours ago" },
  ];

  const subscriptionBreakdown = [
    { tier: "Free", count: 892, percentage: 72 },
    { tier: "Pro", count: 287, percentage: 23 },
    { tier: "Enterprise", count: 55, percentage: 5 },
  ];

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Analytics Dashboard</h1>
          <p className="text-muted-foreground">Monitor platform performance and user activity</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <stat.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid={`stat-${stat.title.toLowerCase().replace(/\s/g, "-")}`}>
                  {stat.value}
                </div>
                <div className="flex items-center gap-1 text-xs mt-1">
                  {stat.trend === "up" ? (
                    <TrendingUp className="h-3 w-3 text-green-500" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-red-500" />
                  )}
                  <span className={stat.trend === "up" ? "text-green-500" : "text-red-500"}>
                    {stat.change}
                  </span>
                  <span className="text-muted-foreground">vs last month</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="tools" className="w-full">
          <TabsList>
            <TabsTrigger value="tools" data-testid="tab-tools">Tool Usage</TabsTrigger>
            <TabsTrigger value="subscriptions" data-testid="tab-subscriptions">Subscriptions</TabsTrigger>
            <TabsTrigger value="activity" data-testid="tab-activity">Recent Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="tools" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Top Tools by Usage</CardTitle>
                <CardDescription>Most popular tools in the last 30 days</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {topTools.map((tool, index) => (
                    <div key={tool.name} className="flex items-center gap-4" data-testid={`tool-row-${index}`}>
                      <div className="w-8 text-center font-medium text-muted-foreground">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium">{tool.name}</span>
                          <span className="text-sm text-muted-foreground">
                            {tool.usage.toLocaleString()} uses
                          </span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full"
                            style={{ width: `${tool.percentage}%` }}
                          />
                        </div>
                      </div>
                      <div className="w-12 text-right text-sm font-medium">{tool.percentage}%</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="subscriptions" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Subscription Breakdown</CardTitle>
                <CardDescription>Current distribution of user subscriptions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  {subscriptionBreakdown.map((sub) => (
                    <Card key={sub.tier} className="bg-muted/50">
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between mb-2">
                          <Badge
                            variant={
                              sub.tier === "Enterprise"
                                ? "default"
                                : sub.tier === "Pro"
                                ? "secondary"
                                : "outline"
                            }
                          >
                            {sub.tier}
                          </Badge>
                          <span className="text-2xl font-bold">{sub.count}</span>
                        </div>
                        <div className="h-2 bg-background rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              sub.tier === "Enterprise"
                                ? "bg-primary"
                                : sub.tier === "Pro"
                                ? "bg-blue-500"
                                : "bg-muted-foreground"
                            }`}
                            style={{ width: `${sub.percentage}%` }}
                          />
                        </div>
                        <p className="text-sm text-muted-foreground mt-2">
                          {sub.percentage}% of total users
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest platform events and actions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentActivity.map((activity, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-4 p-3 rounded-lg bg-muted/50"
                      data-testid={`activity-row-${index}`}
                    >
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Activity className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{activity.action}</p>
                        <p className="text-sm text-muted-foreground">{activity.user}</p>
                      </div>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {activity.time}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
