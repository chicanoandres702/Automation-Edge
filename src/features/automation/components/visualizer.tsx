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
  GripVertical,
  XCircle,
  Undo2,
  MessageSquare,
  RotateCcw
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea, Button } from "@/ui";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";

interface VisualizerProps {
  steps: AutomationStep[];
  currentStepIndex: number;
  status: string;
  onIntervene?: (index: number) => void;
  onReorder?: (steps: AutomationStep[]) => void;
}

export function AgentVisualizer({ steps, currentStepIndex, status, onIntervene, onReorder }: VisualizerProps) {
  const getActionIcon = (type: string) => {
    switch (type) {
      case 'click': return <MousePointer2 className="w-3.5 h-3.5" />;
      case 'type': return <Keyboard className="w-3.5 h-3.5" />;
      case 'touch': return <Fingerprint className="w-3.5 h-3.5" />;
      case 'navigate': return <Navigation className="w-3.5 h-3.5" />;
      case 'wait': return <RefreshCw className="w-3.5 h-3.5" />;
      case 'extract': return <Search className="w-3.5 h-3.5" />;
      case 'ask-user': return <MessageSquare className="w-3.5 h-3.5" />;
      case 'close-tab': return <XCircle className="w-3.5 h-3.5" />;
      case 'refresh': return <RotateCcw className="w-3.5 h-3.5" />;
      case 'navigate-back': return <Undo2 className="w-3.5 h-3.5" />;
      default: return <Circle className="w-3.5 h-3.5" />;
    }
  };

  const handleOnDragEnd = (result: DropResult) => {
    if (!result.destination || !onReorder) return;
    const items = Array.from(steps);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    onReorder(items);
  };

  if (steps.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full border-2 border-dashed rounded-3xl border-white/5 p-12 text-center bg-white/[0.01] relative overflow-hidden">
        <div className="absolute inset-0 opacity-5 pointer-events-none">
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px]" />
        </div>
        
        <div className="w-20 h-20 rounded-3xl bg-primary/5 flex items-center justify-center mb-8 ring-1 ring-primary/20 shadow-inner">
          <PlayCircle className="w-10 h-10 text-primary opacity-30 animate-pulse" />
        </div>
        
        <div className="space-y-4 max-w-sm">
          <h3 className="font-black uppercase tracking-[0.3em] text-[12px] text-foreground">Mission Standby</h3>
          <p className="text-[10px] text-muted-foreground font-medium leading-relaxed uppercase tracking-widest opacity-60">
            Nexus Fleet is ready for tactical injection. Inject an objective to begin.
          </p>
          
          <div className="pt-8 grid grid-cols-1 gap-3">
             <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/[0.03] border border-white/5">
                <div className="w-6 h-6 rounded-lg bg-primary/20 flex items-center justify-center text-primary font-bold text-[10px]">1</div>
                <p className="text-[9px] font-black uppercase text-left opacity-40">Sync Identity</p>
             </div>
             <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/[0.03] border border-white/5">
                <div className="w-6 h-6 rounded-lg bg-primary/20 flex items-center justify-center text-primary font-bold text-[10px]">2</div>
                <p className="text-[9px] font-black uppercase text-left opacity-40">Enter Objective</p>
             </div>
             <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/[0.03] border border-white/5">
                <div className="w-6 h-6 rounded-lg bg-primary/20 flex items-center justify-center text-primary font-bold text-[10px]">3</div>
                <p className="text-[9px] font-black uppercase text-left opacity-40">Establish Neural Lock</p>
             </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background/40 backdrop-blur-sm rounded-3xl border border-white/5 overflow-hidden shadow-2xl">
      <div className="grid grid-cols-[50px_1fr_70px] gap-2 px-6 py-4 bg-white/[0.03] text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 border-b border-white/5">
        <div className="flex justify-center">Node</div>
        <div>Tactical Sequence</div>
        <div className="text-right">Sync</div>
      </div>
      
      <ScrollArea className="flex-1 custom-scrollbar">
        <DragDropContext onDragEnd={handleOnDragEnd}>
          <Droppable droppableId="operation-matrix">
            {(provided) => (
              <div 
                {...provided.droppableProps} 
                ref={provided.innerRef} 
                className="divide-y divide-white/5"
              >
                {steps.map((step, index) => {
                  const isCurrent = index === currentStepIndex;
                  const isActive = isCurrent && (status === 'running' || status === 'intervention_required' || status === 'retrying');
                  const isCompleted = index < currentStepIndex || (index === currentStepIndex && status === 'completed');
                  const isPending = index > currentStepIndex;
                  const isRetrying = isCurrent && status === 'retrying';
                  const needsReview = step.status === 'needs_review' || (isActive && status === 'intervention_required') || step.type === 'ask-user';

                  return (
                    <Draggable key={step.id} draggableId={step.id} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={cn(
                            "group relative grid grid-cols-[50px_1fr_70px] gap-2 px-6 py-5 items-start transition-all",
                            isActive ? "bg-primary/[0.03] ring-1 ring-inset ring-primary/20" : "hover:bg-white/[0.02]",
                            snapshot.isDragging && "bg-background/90 scale-[1.02] z-50 rounded-2xl border-primary/40 shadow-2xl ring-2 ring-primary/40",
                            isPending && "opacity-30 grayscale-[0.8]"
                          )}
                        >
                          <div 
                            {...provided.dragHandleProps}
                            className="absolute left-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-2 text-primary/40 cursor-grab"
                          >
                            <GripVertical className="w-4 h-4" />
                          </div>

                          <div className="flex flex-col items-center">
                            <span className={cn(
                              "text-xs font-mono font-bold",
                              isActive ? "text-primary" : "text-muted-foreground/40"
                            )}>
                              {(index + 1).toString().padStart(2, '0')}
                            </span>
                          </div>

                          <div className="space-y-2.5 min-w-0">
                              {isActive && (
                                <div className="absolute right-14 top-6 pointer-events-none">
                                  <MousePointer2 className={cn(
                                    "w-5 h-5 text-primary/80 pseudo-cursor",
                                    step.type === 'click' ? 'pseudo-cursor-click' : step.type === 'type' ? 'pseudo-cursor-type' : ''
                                  )} />
                                </div>
                              )}
                            <div className="flex items-center gap-2">
                              <div className={cn(
                                "flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[8px] font-black uppercase tracking-tight",
                                isActive ? "bg-primary/10 border-primary/20 text-primary" : "bg-white/5 border-white/5 text-muted-foreground/60"
                              )}>
                                {getActionIcon(step.type)}
                                {step.type}
                              </div>
                              {step.retryCount > 0 && (
                                <span className="text-[7px] font-black text-accent uppercase tracking-widest bg-accent/10 px-1.5 py-0.5 rounded-lg border border-accent/20">
                                  Recovery {step.retryCount}
                                </span>
                              )}
                            </div>
                            
                            <p className={cn(
                              "text-sm font-medium leading-relaxed pr-6",
                              isActive ? "text-foreground" : "text-muted-foreground"
                            )}>
                              {step.description}
                            </p>
                            {step.detail && (
                              <p className="text-[11px] font-mono text-muted-foreground/70 mt-1">{step.detail}</p>
                            )}
                            
                            {needsReview && isCurrent && onIntervene && (
                               <Button 
                                 variant="outline" 
                                 size="sm" 
                                 className="h-8 mt-2 w-full text-[9px] font-black uppercase bg-destructive/5 text-destructive border-destructive/20 hover:bg-destructive/10 rounded-xl"
                                 onClick={() => onIntervene(index)}
                                >
                                 Neural Response Required
                               </Button>
                            )}
                          </div>

                          <div className="flex justify-end pt-1">
                            <div className={cn(
                              "w-6 h-6 rounded-full flex items-center justify-center transition-colors",
                              isActive ? "bg-primary/10 text-primary" : isCompleted ? "bg-accent/10 text-accent" : "bg-white/5 text-muted-foreground/20"
                            )}>
                              {needsReview && isCurrent ? (
                                <AlertCircle className="w-4 h-4 text-destructive animate-pulse" />
                              ) : isRetrying ? (
                                <RotateCcw className="w-4 h-4 text-accent animate-spin" />
                              ) : isActive ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : isCompleted ? (
                                <CheckCircle2 className="w-4 h-4" />
                              ) : (
                                <Circle className="w-2.5 h-2.5" />
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  );
                })}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </ScrollArea>
    </div>
  );
}
