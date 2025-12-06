import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Check,
  Crown,
  Zap,
  ArrowRight,
  Building2,
  Users,
  Shield,
  Clock,
} from "lucide-react";
import { CREDIT_LIMITS } from "@shared/schema";

const plans = [
  {
    id: "free",
    name: "Free",
    price: 0,
    description: "Perfect for occasional use",
    features: [
      "10 AI credits per day",
      "Basic document tools",
      "5MB file size limit",
      "1 hour file retention",
      "Community support",
    ],
    limitations: ["Limited AI features", "No bulk processing", "No API access"],
  },
  {
    id: "pro",
    name: "Pro",
    price: 19,
    description: "For professionals who need more",
    popular: true,
    features: [
      "500 AI credits per month",
      "All document tools",
      "50MB file size limit",
      "24 hour file retention",
      "Priority processing",
      "Email support",
      "Advanced AI features",
    ],
    limitations: ["No API access", "Single user only"],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: 99,
    description: "For teams and organizations",
    features: [
      "Unlimited AI credits",
      "All features included",
      "No file size limits",
      "Custom file retention",
      "API access",
      "Dedicated support",
      "Team management",
      "Audit logs",
      "Custom integrations",
      "SSO support",
    ],
    limitations: [],
  },
];

export default function Subscription() {
  const { user } = useAuth();
  const currentTier = user?.subscriptionTier || "free";
  const tierLabel = currentTier.charAt(0).toUpperCase() + currentTier.slice(1);

  const creditLimit = CREDIT_LIMITS[currentTier as keyof typeof CREDIT_LIMITS];
  const dailyCreditsUsed = user?.aiCreditsUsedToday || 0;
  const monthlyCreditsUsed = user?.aiCreditsUsedMonth || 0;
  const isUnlimited = creditLimit.daily === -1;

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">Subscription</h1>
        <p className="text-muted-foreground text-lg">
          Manage your subscription and view usage.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-primary" />
              Current Plan
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between gap-4 p-4 rounded-lg bg-muted/50">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold">{tierLabel}</span>
                  <Badge>{tierLabel}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {currentTier === "free" && "You're on the free plan"}
                  {currentTier === "pro" && "Professional features unlocked"}
                  {currentTier === "enterprise" && "Full enterprise access"}
                </p>
              </div>
              {currentTier !== "enterprise" && (
                <Button data-testid="button-upgrade">
                  Upgrade
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Daily Credits Used</span>
                  <span className="font-medium">
                    {dailyCreditsUsed} / {isUnlimited ? "Unlimited" : creditLimit.daily}
                  </span>
                </div>
                {!isUnlimited && (
                  <Progress
                    value={(dailyCreditsUsed / creditLimit.daily) * 100}
                    className="h-2"
                  />
                )}
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Monthly Credits Used</span>
                  <span className="font-medium">
                    {monthlyCreditsUsed} / {isUnlimited ? "Unlimited" : creditLimit.monthly}
                  </span>
                </div>
                {!isUnlimited && (
                  <Progress
                    value={(monthlyCreditsUsed / creditLimit.monthly) * 100}
                    className="h-2"
                  />
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              Quick Stats
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <Clock className="w-5 h-5 text-muted-foreground" />
              <div>
                <div className="text-sm font-medium">Files Processed</div>
                <div className="text-2xl font-bold">{user?.totalFilesProcessed || 0}</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <Shield className="w-5 h-5 text-muted-foreground" />
              <div>
                <div className="text-sm font-medium">Storage Used</div>
                <div className="text-2xl font-bold">
                  {formatBytes(user?.totalStorageUsed || 0)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <h2 className="text-2xl font-semibold">Available Plans</h2>
        <div className="grid gap-6 md:grid-cols-3">
          {plans.map((plan) => {
            const isCurrent = plan.id === currentTier;
            return (
              <Card
                key={plan.id}
                className={`relative flex flex-col ${
                  plan.popular ? "border-primary" : ""
                } ${isCurrent ? "bg-muted/30" : ""}`}
              >
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                    Most Popular
                  </Badge>
                )}
                <CardHeader>
                  <div className="space-y-2">
                    <CardTitle className="flex items-center gap-2">
                      {plan.name}
                      {isCurrent && (
                        <Badge variant="secondary">Current</Badge>
                      )}
                    </CardTitle>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold">${plan.price}</span>
                      <span className="text-muted-foreground">/month</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {plan.description}
                    </p>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 space-y-4">
                  <ul className="space-y-2">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-sm">
                        <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  {plan.limitations.length > 0 && (
                    <ul className="space-y-2 pt-2 border-t">
                      {plan.limitations.map((limitation) => (
                        <li
                          key={limitation}
                          className="flex items-start gap-2 text-sm text-muted-foreground"
                        >
                          <span className="w-4 h-4 flex items-center justify-center shrink-0">
                            -
                          </span>
                          <span>{limitation}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
                <div className="p-6 pt-0 mt-auto">
                  {isCurrent ? (
                    <Button variant="secondary" className="w-full" disabled>
                      Current Plan
                    </Button>
                  ) : plan.id === "enterprise" ? (
                    <Button variant="outline" className="w-full" data-testid={`button-plan-${plan.id}`}>
                      Contact Sales
                    </Button>
                  ) : (
                    <Button
                      className="w-full"
                      variant={plan.popular ? "default" : "outline"}
                      data-testid={`button-plan-${plan.id}`}
                    >
                      {currentTier === "free" ? "Upgrade" : "Switch"} to {plan.name}
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
        <CardContent className="p-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Building2 className="w-6 h-6 text-primary" />
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold text-lg">Need a Custom Plan?</h3>
              <p className="text-sm text-muted-foreground">
                Contact us for custom pricing, volume discounts, and enterprise features.
              </p>
            </div>
          </div>
          <Button variant="outline" data-testid="button-contact-sales">
            <Users className="w-4 h-4 mr-2" />
            Contact Sales
          </Button>
        </CardContent>
      </Card>
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
