import { useState } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileCheck, Upload, ArrowLeft, CheckCircle, Sparkles, FileText, Copy, Download, Star, AlertTriangle, TrendingUp, Briefcase } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

type UploadState = "idle" | "uploading" | "processing" | "complete" | "error";

interface ResumeAnalysis {
  overallScore: number;
  sections: {
    name: string;
    score: number;
    feedback: string;
  }[];
  skills: {
    name: string;
    level: "beginner" | "intermediate" | "advanced" | "expert";
    inDemand: boolean;
  }[];
  improvements: string[];
  strengths: string[];
  jobMatches: {
    title: string;
    matchPercentage: number;
    company?: string;
  }[];
}

export default function AIResume() {
  const [file, setFile] = useState<File | null>(null);
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ResumeAnalysis | null>(null);
  const { toast } = useToast();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const validTypes = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ];
      if (!validTypes.includes(selectedFile.type)) {
        toast({
          title: "Invalid file type",
          description: "Please select a PDF or Word document",
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
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ];
      if (!validTypes.includes(droppedFile.type)) {
        toast({
          title: "Invalid file type",
          description: "Please select a PDF or Word document",
          variant: "destructive",
        });
        return;
      }
      setFile(droppedFile);
      setUploadState("idle");
      setResult(null);
    }
  };

  const handleAnalyze = async () => {
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
              overallScore: 78,
              sections: [
                { name: "Contact Information", score: 95, feedback: "Complete and professional" },
                { name: "Work Experience", score: 82, feedback: "Good detail, could add more metrics" },
                { name: "Education", score: 90, feedback: "Well formatted and complete" },
                { name: "Skills", score: 70, feedback: "Add more technical skills relevant to your field" },
                { name: "Summary", score: 65, feedback: "Consider making it more impactful and specific" },
              ],
              skills: [
                { name: "JavaScript", level: "advanced", inDemand: true },
                { name: "React", level: "advanced", inDemand: true },
                { name: "Node.js", level: "intermediate", inDemand: true },
                { name: "Python", level: "intermediate", inDemand: true },
                { name: "SQL", level: "intermediate", inDemand: false },
                { name: "TypeScript", level: "beginner", inDemand: true },
                { name: "Project Management", level: "intermediate", inDemand: false },
              ],
              improvements: [
                "Add quantifiable achievements with specific metrics (e.g., 'Increased sales by 25%')",
                "Include more industry-specific keywords for better ATS compatibility",
                "Add a professional summary that highlights your unique value proposition",
                "Consider adding relevant certifications or online courses",
                "Ensure consistent formatting throughout the document",
              ],
              strengths: [
                "Strong work history with progressive responsibility",
                "Good mix of technical and soft skills",
                "Clear and organized layout",
                "Relevant educational background",
              ],
              jobMatches: [
                { title: "Senior Frontend Developer", matchPercentage: 85, company: "Tech Corp" },
                { title: "Full Stack Engineer", matchPercentage: 78, company: "Startup Inc" },
                { title: "React Developer", matchPercentage: 92, company: "Digital Agency" },
                { title: "Software Engineer", matchPercentage: 75, company: "Enterprise Co" },
              ],
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

  const handleExportReport = () => {
    if (!result) return;
    const report = `Resume Analysis Report
=====================
Overall Score: ${result.overallScore}/100

Section Scores:
${result.sections.map(s => `- ${s.name}: ${s.score}/100 - ${s.feedback}`).join("\n")}

Skills Detected:
${result.skills.map(s => `- ${s.name} (${s.level})${s.inDemand ? " - In Demand" : ""}`).join("\n")}

Areas for Improvement:
${result.improvements.map(i => `- ${i}`).join("\n")}

Key Strengths:
${result.strengths.map(s => `- ${s}`).join("\n")}

Job Matches:
${result.jobMatches.map(j => `- ${j.title}${j.company ? ` at ${j.company}` : ""}: ${j.matchPercentage}% match`).join("\n")}
`;
    const blob = new Blob([report], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "resume-analysis.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({
      title: "Report exported",
      description: "Your resume analysis has been exported",
    });
  };

  const resetUpload = () => {
    setFile(null);
    setUploadState("idle");
    setProgress(0);
    setResult(null);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-500";
    if (score >= 60) return "text-yellow-500";
    return "text-red-500";
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case "expert": return "bg-purple-500/10 text-purple-500";
      case "advanced": return "bg-green-500/10 text-green-500";
      case "intermediate": return "bg-blue-500/10 text-blue-500";
      default: return "bg-muted text-muted-foreground";
    }
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
            <div className="w-12 h-12 rounded-lg bg-orange-500/10 flex items-center justify-center">
              <FileCheck className="w-6 h-6 text-orange-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold" data-testid="text-page-title">Resume Analyzer</h1>
              <p className="text-muted-foreground">Get AI-powered insights to improve your resume</p>
            </div>
            <Badge variant="secondary" className="ml-auto">
              <Sparkles className="w-3 h-3 mr-1" />
              4 Credits/analysis
            </Badge>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Upload your resume</CardTitle>
            <CardDescription>
              Upload a PDF or Word document to analyze your resume
            </CardDescription>
          </CardHeader>
          <CardContent>
            {uploadState === "idle" && !file && (
              <div
                className="border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors hover:border-primary/50 hover:bg-muted/50"
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => document.getElementById("resume-input")?.click()}
                data-testid="dropzone-upload"
              >
                <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-lg font-medium mb-2">Drop your resume here</p>
                <p className="text-muted-foreground mb-4">PDF or Word documents supported</p>
                <input
                  id="resume-input"
                  type="file"
                  accept=".pdf,.doc,.docx"
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
                <Button onClick={handleAnalyze} className="w-full gap-2" data-testid="button-analyze">
                  <Sparkles className="w-4 h-4" />
                  Analyze Resume
                </Button>
              </div>
            )}

            {(uploadState === "uploading" || uploadState === "processing") && (
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                  <FileCheck className="w-10 h-10 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="font-medium">{file?.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {uploadState === "uploading" ? "Uploading..." : "Analyzing resume..."}
                    </p>
                  </div>
                </div>
                <Progress value={progress} className="h-2" data-testid="progress-analyze" />
                <p className="text-sm text-center text-muted-foreground">
                  {uploadState === "uploading"
                    ? "Uploading your resume..."
                    : "AI is analyzing your resume for insights..."}
                </p>
              </div>
            )}

            {uploadState === "complete" && result && (
              <div className="space-y-6">
                <div className="flex items-center gap-4 p-4 bg-green-500/10 rounded-lg">
                  <CheckCircle className="w-10 h-10 text-green-500" />
                  <div className="flex-1">
                    <p className="font-medium text-green-600 dark:text-green-400">
                      Analysis Complete!
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Found {result.skills.length} skills and {result.improvements.length} suggestions
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleExportReport} data-testid="button-export">
                      <Download className="w-4 h-4 mr-2" />
                      Export
                    </Button>
                    <Button variant="outline" size="sm" onClick={resetUpload} data-testid="button-analyze-another">
                      Analyze Another
                    </Button>
                  </div>
                </div>

                <Card className="bg-gradient-to-r from-purple-500/5 to-blue-500/5">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between gap-4">
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Overall Resume Score</p>
                        <div className="flex items-baseline gap-2">
                          <span className={`text-4xl font-bold ${getScoreColor(result.overallScore)}`} data-testid="text-overall-score">
                            {result.overallScore}
                          </span>
                          <span className="text-muted-foreground">/100</span>
                        </div>
                      </div>
                      <div className="w-24 h-24 relative">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                          <path
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            fill="none"
                            stroke="currentColor"
                            strokeOpacity="0.1"
                            strokeWidth="3"
                          />
                          <path
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            fill="none"
                            stroke="currentColor"
                            className={getScoreColor(result.overallScore)}
                            strokeWidth="3"
                            strokeDasharray={`${result.overallScore}, 100`}
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Star className={`w-8 h-8 ${getScoreColor(result.overallScore)}`} />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Section Scores</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-[200px]">
                        <div className="space-y-4">
                          {result.sections.map((section, index) => (
                            <div key={index} className="space-y-2" data-testid={`section-${index}`}>
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-sm font-medium">{section.name}</span>
                                <span className={`text-sm font-bold ${getScoreColor(section.score)}`}>
                                  {section.score}
                                </span>
                              </div>
                              <Progress value={section.score} className="h-1.5" />
                              <p className="text-xs text-muted-foreground">{section.feedback}</p>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        <Briefcase className="w-4 h-4 text-muted-foreground" />
                        <CardTitle className="text-base">Job Matches</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-[200px]">
                        <div className="space-y-3">
                          {result.jobMatches.map((job, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between gap-2 p-2 rounded-lg bg-muted/50"
                              data-testid={`job-match-${index}`}
                            >
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">{job.title}</p>
                                {job.company && (
                                  <p className="text-xs text-muted-foreground">{job.company}</p>
                                )}
                              </div>
                              <Badge
                                variant={job.matchPercentage >= 80 ? "default" : "secondary"}
                                className="shrink-0"
                              >
                                {job.matchPercentage}%
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="text-base">Skills Detected</CardTitle>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopy(result.skills.map(s => s.name).join(", "))}
                        data-testid="button-copy-skills"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {result.skills.map((skill, index) => (
                        <Badge
                          key={index}
                          variant="outline"
                          className={`${getLevelColor(skill.level)}`}
                          data-testid={`skill-${index}`}
                        >
                          {skill.name}
                          {skill.inDemand && (
                            <TrendingUp className="w-3 h-3 ml-1" />
                          )}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-yellow-500" />
                        <CardTitle className="text-base">Areas for Improvement</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-[180px]">
                        <ul className="space-y-2">
                          {result.improvements.map((item, index) => (
                            <li
                              key={index}
                              className="flex items-start gap-2 text-sm"
                              data-testid={`improvement-${index}`}
                            >
                              <span className="w-5 h-5 rounded-full bg-yellow-500/10 text-yellow-500 text-xs flex items-center justify-center shrink-0 mt-0.5">
                                {index + 1}
                              </span>
                              {item}
                            </li>
                          ))}
                        </ul>
                      </ScrollArea>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        <Star className="w-4 h-4 text-green-500" />
                        <CardTitle className="text-base">Key Strengths</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-[180px]">
                        <ul className="space-y-2">
                          {result.strengths.map((item, index) => (
                            <li
                              key={index}
                              className="flex items-start gap-2 text-sm"
                              data-testid={`strength-${index}`}
                            >
                              <CheckCircle className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                              {item}
                            </li>
                          ))}
                        </ul>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
