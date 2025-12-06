import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { CREDIT_LIMITS, TOOL_CREDITS } from "@shared/schema";
import {
  MessageSquare,
  FileSearch,
  Receipt,
  FileCheck,
  Scale,
  Sparkles,
  Zap,
  Mic,
  TableProperties,
} from "lucide-react";

interface AiTool {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  credits: number;
  badge?: string;
}

const aiTools: AiTool[] = [
  {
    id: "ai-chat",
    title: "Document Chat",
    description: "Ask questions and get answers from your uploaded documents",
    icon: MessageSquare,
    href: "/ai/chat",
    credits: TOOL_CREDITS.ai_chat,
  },
  {
    id: "ai-summary",
    title: "Document Summary",
    description: "Get instant summaries in short, bullet, or detailed formats",
    icon: FileSearch,
    href: "/ai/summary",
    credits: TOOL_CREDITS.ai_summary,
  },
  {
    id: "ai-invoice",
    title: "Invoice Reader",
    description: "Extract totals, GST numbers, company info, and due dates",
    icon: Receipt,
    href: "/ai/invoice",
    credits: TOOL_CREDITS.ai_invoice,
    badge: "Coming Soon",
  },
  {
    id: "ai-resume",
    title: "Resume Analyzer",
    description: "Get resume scores, skill gaps, and job matching percentages",
    icon: FileCheck,
    href: "/ai/resume",
    credits: TOOL_CREDITS.ai_resume,
    badge: "Coming Soon",
  },
  {
    id: "ai-legal",
    title: "Legal Risk Detector",
    description: "Identify risk clauses, hidden penalties, and one-sided terms",
    icon: Scale,
    href: "/ai/legal",
    credits: TOOL_CREDITS.ai_legal,
    badge: "Coming Soon",
  },
  {
    id: "ai-data-clean",
    title: "Data Cleaner",
    description: "Find duplicate rows, invalid emails, and phone numbers",
    icon: TableProperties,
    href: "/ai/data-clean",
    credits: TOOL_CREDITS.ai_data_clean,
    badge: "Coming Soon",
  },
  {
    id: "voice-to-doc",
    title: "Voice to Document",
    description: "Convert speech to text and export as PDF or Word",
    icon: Mic,
    href: "/ai/voice",
    credits: TOOL_CREDITS.voice_to_doc,
    badge: "Coming Soon",
  },
];

export default function AiFeatures() {
  const { user } = useAuth();
  const tier = user?.subscriptionTier || "free";
  const creditLimit = CREDIT_LIMITS[tier as keyof typeof CREDIT_LIMITS]?.daily || 10;
  const creditsUsed = user?.aiCreditsUsedToday || 0;
  const isUnlimited = creditLimit === -1;
  const percentage = isUnlimited ? 0 : Math.min((creditsUsed / creditLimit) * 100, 100);

  return (
    <div className="p-8 space-y-8">
      <div className="flex flex-col lg:flex-row gap-8 items-start justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-4xl font-bold tracking-tight">AI Features</h1>
            <Badge className="gap-1">
              <Sparkles className="w-3 h-3" />
              Powered by AI
            </Badge>
          </div>
          <p className="text-muted-foreground text-lg">
            Leverage artificial intelligence to analyze and extract insights from your documents.
          </p>
        </div>

        <Card className="w-full lg:w-80 shrink-0">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">AI Credits Today</span>
              </div>
              <Badge variant="secondary">{tier.charAt(0).toUpperCase() + tier.slice(1)}</Badge>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold tabular-nums">{creditsUsed}</span>
              <span className="text-sm text-muted-foreground">
                / {isUnlimited ? "Unlimited" : creditLimit}
              </span>
            </div>
            {!isUnlimited && <Progress value={percentage} className="h-2" />}
            <p className="text-xs text-muted-foreground">
              {isUnlimited
                ? "You have unlimited AI credits"
                : `${Math.max(creditLimit - creditsUsed, 0)} credits remaining today`}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {aiTools.map((tool) => (
          <AiToolCard key={tool.id} tool={tool} />
        ))}
      </div>

      <Card className="bg-gradient-to-r from-purple-500/5 to-blue-500/5 border-purple-500/20">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <h3 className="font-semibold">How AI Credits Work</h3>
              <p className="text-sm text-muted-foreground">
                Each AI feature uses credits based on complexity
              </p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1">
              <div className="text-sm font-medium">Free Plan</div>
              <div className="text-2xl font-bold text-muted-foreground">10</div>
              <div className="text-xs text-muted-foreground">credits per day</div>
            </div>
            <div className="space-y-1">
              <div className="text-sm font-medium">Pro Plan</div>
              <div className="text-2xl font-bold">500</div>
              <div className="text-xs text-muted-foreground">credits per month</div>
            </div>
            <div className="space-y-1">
              <div className="text-sm font-medium">Enterprise</div>
              <div className="text-2xl font-bold text-primary">Unlimited</div>
              <div className="text-xs text-muted-foreground">no restrictions</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function AiToolCard({ tool }: { tool: AiTool }) {
  const isComingSoon = tool.badge === "Coming Soon";

  const content = (
    <Card className={`p-6 h-full ${!isComingSoon ? "hover-elevate cursor-pointer" : "opacity-60"}`}>
      <CardContent className="p-0 space-y-4">
        <div className="flex items-start justify-between gap-2">
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center shrink-0">
            <tool.icon className="w-6 h-6 text-purple-500" />
          </div>
          <div className="flex flex-wrap items-center gap-2 justify-end">
            <Badge variant="outline" className="text-xs gap-1">
              <Zap className="w-3 h-3" />
              {tool.credits} credits
            </Badge>
            {tool.badge && (
              <Badge variant="secondary" className="text-xs shrink-0">
                {tool.badge}
              </Badge>
            )}
          </div>
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
    return <div data-testid={`card-ai-${tool.id}`}>{content}</div>;
  }

  return (
    <Link href={tool.href} data-testid={`card-ai-${tool.id}`}>
      {content}
    </Link>
  );
}
