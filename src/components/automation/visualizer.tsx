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
  Search,
  Eye
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";

interface VisualizerProps {
  steps: AutomationStep[];
  currentStepIndex: number;
  status: string;
  onIntervene?: (index: number) => void;
}

export function AgentVisualizer({ steps, currentStepIndex, status, onIntervene }: VisualizerProps) {
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
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground/30 text-[10px] border-2 border-dashed rounded-2xl border-white/5 p-6 text-center">
        <PlayCircle className="w-10 h-10 mb-4 opacity-10" />
        <p className="font-bold uppercase tracking-widest leading-relaxed">
          System Initialized.<br/>Awaiting Fleet Objective...
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-4 h-full">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div className="w-1 h-3 bg-primary rounded-full" />
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-foreground/80">Workflow_Matrix</h3>
        </div>
        <span className={cn(
          "text-[8px] px-2 py-0.5 rounded-full font-black uppercase border transition-all",
          status === 'running' ? "bg-accent/10 text-accent border-accent/20 animate-pulse" : 
          status === 'intervention_required' ? "bg-destructive/10 text-destructive border-destructive/20" :
          "bg-white/5 text-muted-foreground border-white/5"
        )}>
          {status}
        </span>
      </div>
      
      <ScrollArea className="flex-1 pr-4 -mr-4">
        <div className="space-y-4 relative">
          {/* Vertical Path Line */}
          <div className="absolute left-[14px] top-6 bottom-6 w-[1px] bg-white/5" />
          
          {steps.map((step, index) => {
            const isActive = index === currentStepIndex && (status === 'running' || status === 'intervention_required');
            const isCompleted = index < currentStepIndex || (index === currentStepIndex && status === 'completed');
            const isPending = index > currentStepIndex;
            const needsReview = step.status === 'needs_review' || (isActive && status === 'intervention_required');

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
                  "absolute left-0 top-1 w-7 h-7 rounded-full border bg-background flex items-center justify-center transition-all z-20",
                  needsReview ? "border-destructive text-destructive shadow-[0_0_10px_rgba(255,0,0,0.3)]" :
                  isActive ? "border-primary text-primary shadow-[0_0_10px_hsla(190,100%,50%,0.3)]" : 
                  isCompleted ? "border-accent/40 text-accent/60 bg-accent/5" : 
                  "border-white/10 text-muted-foreground/30"
                )}>
                  {needsReview ? (
                    <AlertCircle className="w-4 h-4 animate-pulse" />
                  ) : isActive ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : isCompleted ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    getActionIcon(step.type)
                  )}
                </div>

                <div className={cn(
                  "p-3 rounded-xl border transition-all duration-200 backdrop-blur-sm",
                  needsReview ? "bg-destructive/5 border-destructive/30 shadow-[inset_0_0_20px_rgba(255,0,0,0.05)]" :
                  isActive ? "bg-primary/5 border-primary/40" : "bg-card/20 border-white/5",
                  isPending && "opacity-30"
                )}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[7px] font-black uppercase text-muted-foreground/50 tracking-tighter">Step {index + 1}</span>
                      <div className="px-1.5 py-0.5 rounded-sm bg-white/5 text-[6px] uppercase font-black text-muted-foreground border border-white/5">{step.type}</div>
                    </div>
                    {needsReview && onIntervene && (
                       <Button 
                         variant="ghost" 
                         size="sm" 
                         className="h-5 px-2 text-[7px] font-black uppercase bg-destructive/20 text-destructive hover:bg-destructive/30"
                         onClick={() => onIntervene(index)}
                       >
                         <Eye className="w-2.5 h-2.5 mr-1" />
                         Manual Action
                       </Button>
                    )}
                  </div>
                  
                  <p className={cn(
                    "text-[10px] font-bold leading-tight tracking-tight",
                    needsReview ? "text-destructive-foreground" :
                    isActive ? "text-foreground" : "text-muted-foreground"
                  )}>
                    {step.description}
                  </p>
                  
                  {isActive && !needsReview && (
                    <div className="mt-3 space-y-1.5">
                       <div className="h-[2px] w-full bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-primary animate-[loading_2s_ease-in-out_infinite]" />
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[8px] font-mono text-primary/70 animate-pulse tracking-widest uppercase">Executing_Stream</span>
                        <div className="flex gap-1">
                          <div className="w-1 h-1 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]" />
                          <div className="w-1 h-1 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]" />
                          <div className="w-1 h-1 bg-primary rounded-full animate-bounce" />
                        </div>
                      </div>
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
