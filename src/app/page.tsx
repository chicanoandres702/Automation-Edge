"use client";

import { useState, useEffect } from "react";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, Wand2, Globe, ShieldCheck, AlertTriangle, RefreshCw, Terminal, History } from "lucide-react";
import { AutomationTask, AutomationStep } from "@/lib/types";
import { generateAutomationFromPrompt } from "@/ai/flows/generate-automation-from-prompt";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const MOCK_TASKS: AutomationTask[] = [
  {
    id: "1",
    prompt: "Complete tech survey",
    status: "completed",
    steps: [
      { id: "s1", description: "Navigate to survey", status: "completed" },
      { id: "s2", description: "Fill form", status: "completed" }
    ],
    currentStepIndex: 2,
    createdAt: 1739000000000,
    updatedAt: 1739003600000
  }
];

export default function ExtensionPage() {
  const [mounted, setMounted] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [activeTask, setActiveTask] = useState<AutomationTask | null>(null);
  const [history, setHistory] = useState<AutomationTask[]>(MOCK_TASKS);
  const [tabSynced, setTabSynced] = useState(false);
  const { toast } = useToast();

  // UseEffect to prevent hydration errors from browser extension interference
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSyncTab = () => {
    setIsSyncing(true);
    // Simulation of seeking DOM from active tab and frames
    setTimeout(() => {
      setIsSyncing(false);
      setTabSynced(true);
      toast({
        title: "Deep DOM Sync Complete",
        description: "Successfully captured DOM from main window and 2 nested frames.",
      });
    }, 1500);
  };

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
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Agent Error",
        description: "Could not generate workflow. AI backend might be required.",
      });
    } finally {
      setIsGenerating(false);
    }
  };

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
        }
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [activeTask]);

  if (!mounted) return null;

  return (
    <>
      <AppSidebar 
        activeTask={activeTask}
        onStart={() => activeTask && setActiveTask({...activeTask, status: 'running'})}
        onPause={() => activeTask && setActiveTask({...activeTask, status: 'paused'})}
        onStop={() => activeTask && setActiveTask({...activeTask, status: 'idle'})}
      />
      
      <SidebarInset className="bg-background max-w-full overflow-hidden">
        <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center justify-between border-b border-border/50 bg-background/95 px-4 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1 h-8 w-8" />
            <h2 className="text-[10px] font-bold tracking-tight uppercase">Agent Panel</h2>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-accent/10 border border-accent/20">
            <ShieldCheck className="w-3 h-3 text-accent" />
            <span className="text-[8px] font-bold text-accent uppercase">Active Tab</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 space-y-5">
          {/* Tab Sync Section */}
          <section>
            <Card className="p-3 border-dashed border-primary/20 bg-primary/5">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
                  <Globe className="w-3 h-3" />
                  Context Awareness
                </div>
                {tabSynced && <Badge variant="outline" className="text-[7px] h-3.5 bg-accent/10 text-accent border-accent/20">Synced</Badge>}
              </div>
              <p className="text-[10px] text-muted-foreground mb-3 leading-tight">
                Connect the agent to the current window to analyze DOM, including nested frames/iframes.
              </p>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full text-xs h-8 border-primary/20 hover:bg-primary/10"
                onClick={handleSyncTab}
                disabled={isSyncing}
                suppressHydrationWarning
              >
                {isSyncing ? (
                  <RefreshCw className="w-3 h-3 animate-spin mr-2" />
                ) : (
                  <RefreshCw className="w-3 h-3 mr-2" />
                )}
                {tabSynced ? "Re-scan Context" : "Sync Tab Context"}
              </Button>
            </Card>
          </section>

          {/* Prompt Section */}
          <section className="space-y-2">
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-primary to-accent rounded-xl blur opacity-10 group-focus-within:opacity-25 transition" />
              <div className="relative bg-card border border-border p-1.5 rounded-xl shadow-sm">
                <Input 
                  placeholder="Task description..."
                  className="bg-transparent border-none focus-visible:ring-0 text-xs h-9 placeholder:text-muted-foreground/50"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleStartAutomation()}
                  suppressHydrationWarning
                />
                <Button 
                  size="sm"
                  onClick={handleStartAutomation}
                  disabled={isGenerating || !prompt.trim() || !tabSynced}
                  className="w-full h-8 mt-1.5 rounded-lg bg-accent text-background font-bold text-[10px]"
                  suppressHydrationWarning
                >
                  {isGenerating ? (
                    <span className="flex items-center gap-2">
                      <Wand2 className="w-3 h-3 animate-pulse" />
                      Interpreting...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Send className="w-3 h-3" />
                      Execute Agent
                    </span>
                  )}
                </Button>
              </div>
            </div>
            {!tabSynced && (
              <p className="text-[8px] text-center text-muted-foreground">
                * Sync tab context to enable agent execution
              </p>
            )}
          </section>

          {/* Quick Shortcuts */}
          <section className="grid grid-cols-2 gap-2">
            <button 
              onClick={() => setPrompt("Extract all table data")}
              className="p-2 rounded-lg border border-border bg-card/50 text-[9px] font-bold uppercase hover:bg-muted transition-colors text-center"
              suppressHydrationWarning
            >
              Scrape DOM
            </button>
            <button 
              onClick={() => setPrompt("Auto-fill survey")}
              className="p-2 rounded-lg border border-border bg-card/50 text-[9px] font-bold uppercase hover:bg-muted transition-colors text-center"
              suppressHydrationWarning
            >
              Survey Mode
            </button>
          </section>

          {/* Active Process status */}
          {activeTask && (
            <section className="pt-2 border-t border-border">
               <div className="flex items-center gap-2 mb-2">
                <Terminal className="w-3 h-3 text-accent" />
                <h3 className="text-[9px] font-bold uppercase tracking-widest">Running Operation</h3>
              </div>
              <div className="bg-card/40 border border-border rounded-lg p-2.5">
                <p className="text-[10px] font-medium truncate mb-2">{activeTask.prompt}</p>
                <div className="space-y-1.5">
                  {activeTask.steps.slice(0, 3).map((step, i) => (
                    <div key={i} className="flex items-center gap-2 text-[9px]">
                      <div className={`w-1 h-1 rounded-full ${i <= activeTask.currentStepIndex ? 'bg-accent shadow-[0_0_5px_rgba(67,249,31,0.5)]' : 'bg-muted'}`} />
                      <span className={i === activeTask.currentStepIndex ? 'text-foreground font-bold' : 'text-muted-foreground'}>
                        {step.description}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Activity Log */}
          <section className="pt-3 border-t border-border">
            <div className="flex items-center gap-2 mb-2">
              <History className="w-3 h-3 text-primary" />
              <h3 className="text-[9px] font-bold uppercase tracking-widest">History</h3>
            </div>
            <div className="space-y-1.5">
              {history.slice(0, 3).map(task => (
                <div key={task.id} className="text-[9px] p-1.5 rounded bg-muted/30 border border-border/50 truncate flex justify-between items-center">
                  <span className="truncate flex-1 pr-2">{task.prompt}</span>
                  <Badge variant="outline" className="text-[7px] h-3 px-1">Done</Badge>
                </div>
              ))}
            </div>
          </section>

          <section className="pb-2">
            <Alert className="bg-destructive/5 border-destructive/20 p-2 flex items-center gap-2">
              <AlertTriangle className="h-3 w-3 text-destructive shrink-0" />
              <AlertDescription className="text-[8px] text-muted-foreground leading-tight">
                Ensure compliance with site terms during automated sessions.
              </AlertDescription>
            </Alert>
          </section>
        </main>
      </SidebarInset>
    </>
  );
}