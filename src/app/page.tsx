"use client";

import { useState, useEffect } from "react";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, Sparkles, Wand2, Globe, ShieldCheck, AlertTriangle, RefreshCw, Terminal, History } from "lucide-react";
import { AutomationTask, AutomationStep } from "@/lib/types";
import { generateAutomationFromPrompt } from "@/ai/flows/generate-automation-from-prompt";
import { AutomationHistoryLog } from "@/components/automation/history-log";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [activeTask, setActiveTask] = useState<AutomationTask | null>(null);
  const [history, setHistory] = useState<AutomationTask[]>(MOCK_TASKS);
  const [tabSynced, setTabSynced] = useState(false);
  const { toast } = useToast();

  const handleSyncTab = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      setTabSynced(true);
      toast({
        title: "Tab Context Captured",
        description: "DOM structure analyzed. Ready for automation.",
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
        description: "Could not generate workflow.",
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
            <h2 className="text-xs font-bold tracking-tight uppercase">Agent Panel</h2>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-accent/10 border border-accent/20">
            <ShieldCheck className="w-3 h-3 text-accent" />
            <span className="text-[9px] font-bold text-accent uppercase">Live</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Tab Sync Section */}
          <section>
            <Card className="p-3 border-dashed border-primary/20 bg-primary/5">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  <Globe className="w-3 h-3" />
                  Active Tab
                </div>
                {tabSynced && <Badge variant="outline" className="text-[8px] h-4 bg-accent/10 text-accent border-accent/20">Synced</Badge>}
              </div>
              <p className="text-[11px] text-muted-foreground mb-3 leading-relaxed">
                Connect the agent to the current browser tab to analyze DOM structure and forms.
              </p>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full text-xs h-8 border-primary/20 hover:bg-primary/10"
                onClick={handleSyncTab}
                disabled={isSyncing}
              >
                {isSyncing ? (
                  <RefreshCw className="w-3 h-3 animate-spin mr-2" />
                ) : (
                  <RefreshCw className="w-3 h-3 mr-2" />
                )}
                {tabSynced ? "Refresh Sync" : "Sync Current Tab"}
              </Button>
            </Card>
          </section>

          {/* Prompt Section */}
          <section className="space-y-3">
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-primary to-accent rounded-xl blur opacity-10 group-focus-within:opacity-25 transition" />
              <div className="relative bg-card border border-border p-1.5 rounded-xl shadow-sm">
                <Input 
                  placeholder="Task description..."
                  className="bg-transparent border-none focus-visible:ring-0 text-sm h-10 placeholder:text-muted-foreground/50"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleStartAutomation()}
                  suppressHydrationWarning
                />
                <Button 
                  size="sm"
                  onClick={handleStartAutomation}
                  disabled={isGenerating || !prompt.trim() || !tabSynced}
                  className="w-full h-9 mt-1.5 rounded-lg bg-accent text-background font-bold text-xs"
                >
                  {isGenerating ? (
                    <span className="flex items-center gap-2">
                      <Wand2 className="w-3 h-3 animate-pulse" />
                      Thinking...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Send className="w-3 h-3" />
                      Execute Task
                    </span>
                  )}
                </Button>
              </div>
            </div>
            {!tabSynced && (
              <p className="text-[9px] text-center text-muted-foreground animate-pulse">
                * Please sync tab before executing tasks
              </p>
            )}
          </section>

          {/* Quick Actions */}
          <section className="grid grid-cols-2 gap-2">
            <button 
              onClick={() => setPrompt("Extract all prices")}
              className="p-2 rounded-lg border border-border bg-card/50 text-[9px] font-bold uppercase hover:bg-muted transition-colors text-center"
              suppressHydrationWarning
            >
              Scrape Data
            </button>
            <button 
              onClick={() => setPrompt("Fill survey form")}
              className="p-2 rounded-lg border border-border bg-card/50 text-[9px] font-bold uppercase hover:bg-muted transition-colors text-center"
              suppressHydrationWarning
            >
              Auto-Survey
            </button>
          </section>

          {/* Small Status Visualizer */}
          {activeTask && (
            <section className="pt-2 border-t border-border">
               <div className="flex items-center gap-2 mb-3">
                <Terminal className="w-3 h-3 text-accent" />
                <h3 className="text-[10px] font-bold uppercase tracking-widest">Active Process</h3>
              </div>
              <div className="bg-card/40 border border-border rounded-lg p-3">
                <p className="text-[11px] font-medium truncate mb-2">{activeTask.prompt}</p>
                <div className="space-y-2">
                  {activeTask.steps.slice(0, 3).map((step, i) => (
                    <div key={i} className="flex items-center gap-2 text-[10px]">
                      <div className={`w-1.5 h-1.5 rounded-full ${i <= activeTask.currentStepIndex ? 'bg-accent' : 'bg-muted'}`} />
                      <span className={i === activeTask.currentStepIndex ? 'text-foreground font-bold' : 'text-muted-foreground'}>
                        {step.description}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* History */}
          <section className="pt-4 border-t border-border">
            <div className="flex items-center gap-2 mb-3">
              <History className="w-3 h-3 text-primary" />
              <h3 className="text-[10px] font-bold uppercase tracking-widest">Recent Ops</h3>
            </div>
            <div className="space-y-2">
              {history.map(task => (
                <div key={task.id} className="text-[10px] p-2 rounded bg-muted/30 border border-border/50 truncate">
                  {task.prompt}
                </div>
              ))}
            </div>
          </section>

          {/* Footer Warning */}
          <section className="pb-4">
            <Alert className="bg-destructive/5 border-destructive/20 p-2">
              <AlertTriangle className="h-3 w-3 text-destructive" />
              <AlertDescription className="text-[9px] text-muted-foreground ml-1">
                Automation must adhere to site terms.
              </AlertDescription>
            </Alert>
          </section>
        </main>
      </SidebarInset>
    </>
  );
}
