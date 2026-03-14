"use client";

import { useState, useEffect } from "react";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Send, Sparkles, Wand2, Globe, ShieldCheck, AlertTriangle } from "lucide-react";
import { AutomationTask, AutomationStep } from "@/lib/types";
import { generateAutomationFromPrompt } from "@/ai/flows/generate-automation-from-prompt";
import { AutomationHistoryLog } from "@/components/automation/history-log";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Static mock data with fixed timestamps for hydration consistency
const MOCK_TASKS: AutomationTask[] = [
  {
    id: "1",
    prompt: "Complete the tech usage survey on marketinsights.com",
    status: "completed",
    steps: [
      { id: "s1", description: "Navigate to marketinsights.com", status: "completed" },
      { id: "s2", description: "Identify tech survey form", status: "completed" },
      { id: "s3", description: "Enter profile details", status: "completed" }
    ],
    currentStepIndex: 3,
    createdAt: 1739000000000,
    updatedAt: 1739003600000
  },
  {
    id: "2",
    prompt: "Monitor retail prices for graphics cards on major outlets",
    status: "error",
    steps: [
      { id: "s4", description: "Scan amazon.com search results", status: "completed" },
      { id: "s5", description: "Verify pricing on bestbuy.com", status: "failed" }
    ],
    currentStepIndex: 1,
    createdAt: 1738913600000,
    updatedAt: 1738915000000
  }
];

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTask, setActiveTask] = useState<AutomationTask | null>(null);
  const [history, setHistory] = useState<AutomationTask[]>(MOCK_TASKS);
  const { toast } = useToast();

  const handleStartAutomation = async () => {
    if (!prompt.trim()) return;

    setIsGenerating(true);
    try {
      const result = await generateAutomationFromPrompt(prompt);
      
      const now = Date.now();
      const newSteps: AutomationStep[] = result.workflowSteps.map((s, idx) => ({
        id: `step-${now}-${idx}`,
        description: s,
        status: 'pending'
      }));

      const newTask: AutomationTask = {
        id: `task-${now}`,
        prompt,
        status: 'running',
        steps: newSteps,
        currentStepIndex: 0,
        createdAt: now,
        updatedAt: now
      };

      setActiveTask(newTask);
      setPrompt("");
      toast({
        title: "Agent Initialized",
        description: "Executing browser automation workflow...",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Initialization Failed",
        description: "Could not generate automation workflow.",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Simulated agent execution
  useEffect(() => {
    if (activeTask && activeTask.status === 'running') {
      const timer = setTimeout(() => {
        if (activeTask.currentStepIndex < activeTask.steps.length - 1) {
          setActiveTask(prev => {
            if (!prev) return null;
            return {
              ...prev,
              currentStepIndex: prev.currentStepIndex + 1,
              updatedAt: Date.now()
            };
          });
        } else {
          const completedTask = { ...activeTask, status: 'completed' as const };
          setActiveTask(completedTask);
          setHistory(prev => [completedTask, ...prev]);
          toast({
            title: "Task Completed",
            description: "Agent successfully finished all automation steps.",
          });
        }
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [activeTask, toast]);

  return (
    <>
      <AppSidebar 
        activeTask={activeTask}
        onStart={() => activeTask && setActiveTask({...activeTask, status: 'running'})}
        onPause={() => activeTask && setActiveTask({...activeTask, status: 'paused'})}
        onStop={() => activeTask && setActiveTask({...activeTask, status: 'idle'})}
      />
      
      <SidebarInset className="bg-background">
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-2 border-b border-border/50 bg-background/80 px-4 backdrop-blur-md">
          <SidebarTrigger className="-ml-1" />
          <div className="flex-1" />
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/10 border border-accent/20">
              <ShieldCheck className="w-3.5 h-3.5 text-accent" />
              <span className="text-[10px] font-bold text-accent uppercase tracking-wider">Edge Secure</span>
            </div>
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
              <Globe className="h-5 w-5" />
            </Button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-8 space-y-12">
          {/* Security Context Alert */}
          <section className="max-w-4xl mx-auto w-full">
            <Alert className="bg-primary/5 border-primary/20">
              <AlertTriangle className="h-4 w-4 text-primary" />
              <AlertTitle className="text-sm font-bold">Automation Sandbox</AlertTitle>
              <AlertDescription className="text-xs text-muted-foreground">
                This dashboard operates in a secure sandbox. Due to browser security restrictions (Same-Origin Policy), 
                the agent can only interact with DOM content explicitly provided to it. Cross-tab scraping 
                is simulated for visualization.
              </AlertDescription>
            </Alert>
          </section>

          {/* Hero Section with Prompt Input */}
          <section className="max-w-4xl mx-auto w-full pt-4 pb-8 text-center space-y-10">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-widest mb-2">
                <Sparkles className="w-3.5 h-3.5" />
                AI-Driven Intelligence
              </div>
              <h1 className="text-4xl md:text-6xl font-headline font-bold tracking-tight bg-gradient-to-b from-foreground to-foreground/60 bg-clip-text text-transparent">
                Control your browser <br /> with <span className="text-accent">pure language.</span>
              </h1>
              <p className="text-muted-foreground text-lg max-w-xl mx-auto">
                Sophisticated browser automation for surveys, data mining, and anti-disqualification strategies.
              </p>
            </div>

            <div className="relative group max-w-3xl mx-auto">
              <div className="absolute -inset-1 bg-gradient-to-r from-primary via-accent to-primary rounded-2xl blur opacity-25 group-focus-within:opacity-50 transition duration-1000 group-focus-within:duration-200" />
              <div className="relative flex items-center bg-card border border-border p-2 rounded-2xl shadow-2xl glass-panel">
                <div className="pl-4 pr-2">
                  <Wand2 className="w-5 h-5 text-accent animate-pulse" />
                </div>
                <Input 
                  placeholder="Describe your browser task... (e.g., 'Complete the tech survey on Forbes.com')"
                  className="bg-transparent border-none focus-visible:ring-0 text-lg h-14 md:h-16 placeholder:text-muted-foreground/50"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleStartAutomation()}
                  suppressHydrationWarning
                />
                <Button 
                  size="lg"
                  onClick={handleStartAutomation}
                  disabled={isGenerating || !prompt.trim()}
                  className="h-12 md:h-14 px-8 rounded-xl bg-accent text-background font-bold hover:bg-accent/90 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  {isGenerating ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-background border-t-transparent rounded-full animate-spin" />
                      Initializing...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Send className="w-4 h-4" />
                      Deploy Agent
                    </div>
                  )}
                </Button>
              </div>
            </div>
            
            <div className="flex flex-wrap justify-center gap-4 mt-8 opacity-60">
              <button 
                onClick={() => setPrompt("Complete the daily rewards survey on Swagbucks")}
                className="px-3 py-1.5 rounded-full border border-border bg-card/50 text-[10px] font-bold uppercase tracking-wider hover:bg-muted transition-colors"
                suppressHydrationWarning
              >
                Survey Example
              </button>
              <button 
                onClick={() => setPrompt("Check stock for RTX 5090 on NVIDIA store every hour")}
                className="px-3 py-1.5 rounded-full border border-border bg-card/50 text-[10px] font-bold uppercase tracking-wider hover:bg-muted transition-colors"
                suppressHydrationWarning
              >
                Stock Monitor
              </button>
              <button 
                onClick={() => setPrompt("Analyze page logic for anti-bot measures")}
                className="px-3 py-1.5 rounded-full border border-border bg-card/50 text-[10px] font-bold uppercase tracking-wider hover:bg-muted transition-colors"
                suppressHydrationWarning
              >
                Site Analysis
              </button>
            </div>
          </section>

          {/* History Section */}
          <section className="max-w-5xl mx-auto w-full">
            <AutomationHistoryLog tasks={history} />
          </section>
        </main>
      </SidebarInset>
    </>
  );
}
