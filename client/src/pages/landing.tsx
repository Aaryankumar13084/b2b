import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { 
  FileText, 
  Image, 
  Database, 
  Shield, 
  Zap, 
  Lock,
  ArrowRight,
  Check,
  Bot,
  FileSearch,
  Sparkles
} from "lucide-react";

const features = [
  {
    icon: FileText,
    title: "Document Tools",
    description: "Convert, merge, compress, and transform PDFs and documents with ease.",
  },
  {
    icon: Image,
    title: "Image Tools",
    description: "Remove backgrounds, compress, resize, and convert images instantly.",
  },
  {
    icon: Database,
    title: "Data Tools",
    description: "Clean Excel data, format JSON, convert CSV files seamlessly.",
  },
  {
    icon: Bot,
    title: "AI Document Chat",
    description: "Ask questions and extract insights from your documents using AI.",
  },
  {
    icon: FileSearch,
    title: "AI Summary",
    description: "Get instant summaries of lengthy documents in multiple formats.",
  },
  {
    icon: Sparkles,
    title: "AI Analysis",
    description: "Analyze invoices, resumes, and legal documents automatically.",
  },
];

const securityFeatures = [
  { icon: Lock, text: "AES-256 Encryption" },
  { icon: Shield, text: "Zero-Log Policy" },
  { icon: Zap, text: "Auto File Deletion" },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <FileText className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-semibold text-lg tracking-tight">DocuTools AI</span>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <a href="/api/login">
              <Button data-testid="button-login">
                Get Started
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </a>
          </div>
        </div>
      </header>

      <main>
        <section className="py-24 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div className="space-y-8">
                <div className="space-y-4">
                  <Badge variant="secondary" className="text-sm">
                    AI-Powered Platform
                  </Badge>
                  <h1 className="text-4xl lg:text-5xl font-bold tracking-tight leading-tight">
                    Transform Your Documents with{" "}
                    <span className="text-primary">AI Power</span>
                  </h1>
                  <p className="text-lg text-muted-foreground leading-relaxed max-w-xl">
                    Convert, analyze, and extract insights from documents with enterprise-grade 
                    security. Process PDFs, images, and data files with powerful AI tools.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {securityFeatures.map((feature) => (
                    <div
                      key={feature.text}
                      className="flex items-center gap-2 text-sm text-muted-foreground"
                    >
                      <feature.icon className="w-4 h-4 text-primary" />
                      <span>{feature.text}</span>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap gap-4">
                  <a href="/api/login">
                    <Button size="lg" data-testid="button-hero-cta">
                      Start Free
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </a>
                  <a href="#pricing">
                    <Button size="lg" variant="outline" data-testid="button-view-pricing">
                      View Pricing
                    </Button>
                  </a>
                </div>
              </div>

              <div className="relative">
                <Card className="p-8 space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Bot className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">AI Document Analysis</h3>
                      <p className="text-sm text-muted-foreground">Upload and chat with your PDFs</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="p-4 rounded-lg bg-muted/50">
                      <p className="text-sm text-muted-foreground">
                        "What are the key terms in this contract?"
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-primary/5 border border-primary/10">
                      <p className="text-sm">
                        The key terms include: 90-day notice period, 
                        automatic renewal clause, liability cap of $50,000, 
                        and exclusive jurisdiction in Delaware courts.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <span>Powered by advanced AI</span>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </section>

        <section className="py-24 px-6 bg-muted/30">
          <div className="max-w-7xl mx-auto space-y-16">
            <div className="text-center space-y-4">
              <h2 className="text-3xl font-bold tracking-tight">
                Powerful Tools for Every Need
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                From simple file conversions to advanced AI-powered analysis, 
                we've got all the tools you need in one platform.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature) => (
                <Card key={feature.title} className="p-6 hover-elevate">
                  <CardContent className="p-0 space-y-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <feature.icon className="w-6 h-6 text-primary" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="font-semibold text-lg">{feature.title}</h3>
                      <p className="text-muted-foreground text-sm leading-relaxed">
                        {feature.description}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section id="pricing" className="py-24 px-6">
          <div className="max-w-7xl mx-auto space-y-16">
            <div className="text-center space-y-4">
              <h2 className="text-3xl font-bold tracking-tight">
                Simple, Transparent Pricing
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Start free and upgrade as you grow. No hidden fees.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              <Card className="p-6 flex flex-col">
                <div className="space-y-4 flex-1">
                  <div className="space-y-2">
                    <h3 className="font-semibold text-lg">Free</h3>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold">$0</span>
                      <span className="text-muted-foreground">/month</span>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Perfect for occasional use and trying out features.
                  </p>
                  <ul className="space-y-3">
                    {[
                      "10 AI credits per day",
                      "Basic document tools",
                      "5MB file size limit",
                      "1 hour file retention",
                    ].map((item) => (
                      <li key={item} className="flex items-center gap-2 text-sm">
                        <Check className="w-4 h-4 text-primary shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <a href="/api/login" className="mt-6">
                  <Button variant="outline" className="w-full" data-testid="button-plan-free">
                    Get Started
                  </Button>
                </a>
              </Card>

              <Card className="p-6 flex flex-col border-primary relative">
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                  Most Popular
                </Badge>
                <div className="space-y-4 flex-1">
                  <div className="space-y-2">
                    <h3 className="font-semibold text-lg">Pro</h3>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold">$19</span>
                      <span className="text-muted-foreground">/month</span>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    For professionals who need more power.
                  </p>
                  <ul className="space-y-3">
                    {[
                      "500 AI credits per month",
                      "All document tools",
                      "50MB file size limit",
                      "24 hour file retention",
                      "Priority processing",
                      "Email support",
                    ].map((item) => (
                      <li key={item} className="flex items-center gap-2 text-sm">
                        <Check className="w-4 h-4 text-primary shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <a href="/api/login" className="mt-6">
                  <Button className="w-full" data-testid="button-plan-pro">
                    Start Pro Trial
                  </Button>
                </a>
              </Card>

              <Card className="p-6 flex flex-col">
                <div className="space-y-4 flex-1">
                  <div className="space-y-2">
                    <h3 className="font-semibold text-lg">Enterprise</h3>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold">$99</span>
                      <span className="text-muted-foreground">/month</span>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    For teams and organizations at scale.
                  </p>
                  <ul className="space-y-3">
                    {[
                      "Unlimited AI credits",
                      "All features included",
                      "No file size limits",
                      "Custom file retention",
                      "API access",
                      "Dedicated support",
                      "Team management",
                      "Audit logs",
                    ].map((item) => (
                      <li key={item} className="flex items-center gap-2 text-sm">
                        <Check className="w-4 h-4 text-primary shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <a href="/api/login" className="mt-6">
                  <Button variant="outline" className="w-full" data-testid="button-plan-enterprise">
                    Contact Sales
                  </Button>
                </a>
              </Card>
            </div>
          </div>
        </section>

        <section className="py-24 px-6 bg-muted/30">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <h2 className="text-3xl font-bold tracking-tight">
              Ready to Transform Your Workflow?
            </h2>
            <p className="text-muted-foreground text-lg">
              Join thousands of professionals using DocuTools AI to work smarter.
            </p>
            <a href="/api/login">
              <Button size="lg" data-testid="button-final-cta">
                Start Free Today
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </a>
          </div>
        </section>
      </main>

      <footer className="border-t py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-primary flex items-center justify-center">
              <FileText className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-medium">DocuTools AI</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Enterprise-grade document processing with AI
          </p>
        </div>
      </footer>
    </div>
  );
}
