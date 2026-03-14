
"use client";

import { AutomationStep } from "@/lib/types";
import { 
  CheckCircle2, 
  Circle, 
  Loader2, 
  PlayCircle, 
  AlertCircle,
  MousePointer2,
  Keyboard,
  Fingerprint,
  RefreshCw,
  Navigation,
  Search
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

interface VisualizerProps {
  steps: AutomationStep[];
  currentStepIndex: number;
  status: string;
}

export function AgentVisualizer({ steps, currentStepIndex, status }: VisualizerProps) {
  const getActionIcon = (type: string) => {
    switch (type) {
      case 'click': return <MousePointer2 className="w-3.5 h-3.5" />;
      case 'type': return <Keyboard className="w-3.5 h-3.5" />;
      case 'touch': return <Fingerprint className="w-3.5 h-3.5" />;
      case 'navigate': return <Navigation className="w-3.5 h-3.5" />;
      case 'wait': return <RefreshCw className="w-3.5 h-3.5" />;
      case 'extract': return <Search className="w-3.5 h-3.5" />;
      default: return <Circle className="w-3.5 h-3.5" />;
    }
  };

  if (steps.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground/30 text-[10px] border-2 border-dashed rounded-2xl border-border/50 p-6 text-center">
        <PlayCircle className="w-10 h-10 mb-4 opacity-10" />
        <p className="font-bold uppercase tracking-widest leading-relaxed">
          System Initialized.<br/>Awaiting Prompt...
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-4 h-full">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground">Workflow Core</h3>
        <span className={cn(
          "text-[8px] px-2 py-0.5 rounded-full font-black uppercase border",
          status === 'running' ? "bg-accent/10 text-accent border-accent/20 animate-pulse" : "bg-muted/30 text-muted-foreground border-border"
        )}>
          {status}
        </span>
      </div>
      
      <ScrollArea className="flex-1 pr-4 -mr-4">
        <div className="space-y-4 relative">
          {/* Vertical Path Line */}
          <div className="absolute left-[14px] top-6 bottom-6 w-[1px] bg-border" />
          
          {steps.map((step, index) => {
            const isActive = index === currentStepIndex && status === 'running';
            const isCompleted = index < currentStepIndex || (index === currentStepIndex && status === 'completed');
            const isPending = index > currentStepIndex;

            return (
              <div 
                key={step.id} 
                className={cn(
                  "relative pl-8 transition-all duration-300",
                  isActive ? "scale-[1.02] z-10" : "scale-100 opacity-60"
                )}
              >
                {/* Status Dot/Icon */}
                <div className={cn(
                  "absolute left-0 top-1 w-7 h-7 rounded-full border bg-background flex items-center justify-center transition-all",
                  isActive ? "border-accent text-accent shadow-[0_0_10px_rgba(67,249,31,0.3)]" : 
                  isCompleted ? "border-accent/40 text-accent/60 bg-accent/5" : 
                  "border-border text-muted-foreground/30"
                )}>
                  {isActive ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : isCompleted ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    getActionIcon(step.type)
                  )}
                </div>

                <div className={cn(
                  "p-3 rounded-xl border transition-all duration-200",
                  isActive ? "bg-accent/5 border-accent/50" : "bg-card/20 border-border/50",
                  isPending && "opacity-30"
                )}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[7px] font-black uppercase text-muted-foreground/50 tracking-tighter">Step {index + 1}</span>
                    <Badge variant="outline" className="text-[6px] h-3 px-1 border-border/50 uppercase font-black">{step.type}</Badge>
                  </div>
                  <p className={cn(
                    "text-[10px] font-bold leading-tight",
                    isActive ? "text-foreground" : "text-muted-foreground"
                  )}>
                    {step.description}
                  </p>
                  
                  {isActive && (
                    <div className="mt-2 flex items-center gap-2">
                       <div className="h-0.5 flex-1 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-accent animate-[loading_2s_ease-in-out_infinite]" />
                      </div>
                      <span className="text-[8px] font-mono text-accent animate-pulse">EXECUTING</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
