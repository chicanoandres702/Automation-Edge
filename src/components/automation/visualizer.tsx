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
  Eye,
  ArrowRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
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
      case 'click': return <MousePointer2 className="w-3 h-3" />;
      case 'type': return <Keyboard className="w-3 h-3" />;
      case 'touch': return <Fingerprint className="w-3 h-3" />;
      case 'navigate': return <Navigation className="w-3 h-3" />;
      case 'wait': return <RefreshCw className="w-3 h-3" />;
      case 'extract': return <Search className="w-3 h-3" />;
      default: return <Circle className="w-3 h-3" />;
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
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground/30 border-2 border-dashed rounded-3xl border-white/5 p-8 text-center animate-in fade-in zoom-in duration-700">
        <div className="relative mb-6">
          <PlayCircle className="w-16 h-16 opacity-5 animate-pulse" />
          <div className="absolute inset-0 bg-primary/10 blur-2xl rounded-full" />
        </div>
        <p className="font-black uppercase tracking-[0.4em] leading-relaxed text-[10px] text-primary/40">
          Nexus_Standby<br/>Awaiting_Mission_Inject
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-black/20 rounded-3xl border border-white/5 overflow-hidden shadow-2xl backdrop-blur-sm">
      {/* Table Header */}
      <div className="grid grid-cols-[30px_1fr_60px] gap-2 px-4 py-3 bg-white/5 border-b border-white/5 text-[8px] font-black uppercase tracking-[0.2em] text-muted-foreground/50">
        <div className="flex justify-center">#</div>
        <div>Objective_Operation</div>
        <div className="text-right">Status</div>
      </div>
      
      <ScrollArea className="flex-1">
        <DragDropContext onDragEnd={handleOnDragEnd}>
          <Droppable droppableId="operation-matrix">
            {(provided) => (
              <div 
                {...provided.droppableProps} 
                ref={provided.innerRef} 
                className="divide-y divide-white/5"
              >
                {steps.map((step, index) => {
                  const isActive = index === currentStepIndex && (status === 'running' || status === 'intervention_required');
                  const isCompleted = index < currentStepIndex || (index === currentStepIndex && status === 'completed');
                  const isPending = index > currentStepIndex;
                  const needsReview = step.status === 'needs_review' || (isActive && status === 'intervention_required');

                  return (
                    <Draggable key={step.id} draggableId={step.id} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={cn(
                            "group relative grid grid-cols-[30px_1fr_60px] gap-2 px-4 py-4 transition-all duration-500 items-start",
                            isActive ? "bg-primary/5 shadow-[inset_0_0_30px_rgba(0,255,255,0.03)]" : "hover:bg-white/[0.02]",
                            snapshot.isDragging && "bg-white/10 scale-[1.02] rotate-1 shadow-2xl z-50",
                            isPending && "opacity-40"
                          )}
                        >
                          {/* Drag Handle (Hover only) */}
                          <div 
                            {...provided.dragHandleProps}
                            className="absolute -left-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-2 text-primary/30 cursor-grab active:cursor-grabbing"
                          >
                            <GripVertical className="w-3.5 h-3.5" />
                          </div>

                          {/* Index / Counter */}
                          <div className="flex flex-col items-center pt-0.5">
                            <span className={cn(
                              "text-[8px] font-mono transition-colors",
                              isActive ? "text-primary font-black" : "text-muted-foreground/30"
                            )}>
                              {index.toString().padStart(2, '0')}
                            </span>
                            {isActive && (
                              <div className="w-1 h-1 bg-primary rounded-full mt-2 animate-ping" />
                            )}
                          </div>

                          {/* Step Content */}
                          <div className="space-y-1.5 min-w-0">
                            <div className="flex items-center gap-2">
                              <div className={cn(
                                "flex items-center gap-1.5 px-1.5 py-0.5 rounded border text-[7px] font-black uppercase tracking-widest transition-all",
                                isActive ? "bg-primary/20 border-primary/40 text-primary shadow-[0_0_10px_rgba(0,255,255,0.1)]" : "bg-white/5 border-white/10 text-muted-foreground/50"
                              )}>
                                {getActionIcon(step.type)}
                                {step.type}
                              </div>
                              {needsReview && (
                                <div className="flex items-center gap-1 text-[7px] font-black text-destructive uppercase animate-pulse">
                                  <AlertCircle className="w-2.5 h-2.5" />
                                  Review_Needed
                                </div>
                              )}
                            </div>
                            <p className={cn(
                              "text-[10px] font-bold leading-relaxed tracking-tight break-words transition-colors",
                              isActive ? "text-foreground" : isCompleted ? "text-muted-foreground/40" : "text-muted-foreground"
                            )}>
                              {step.description}
                            </p>
                            
                            {isActive && (
                              <div className="flex items-center gap-2 pt-1 animate-in fade-in slide-in-from-left-2">
                                <ArrowRight className="w-2.5 h-2.5 text-primary animate-pulse" />
                                <span className="text-[7px] font-black text-primary/60 uppercase tracking-[0.2em] animate-pulse">
                                  Executing_Protocol_V3
                                </span>
                              </div>
                            )}

                            {needsReview && onIntervene && (
                               <Button 
                                 variant="ghost" 
                                 size="sm" 
                                 className="h-7 mt-2 w-full text-[8px] font-black uppercase bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20 rounded-xl"
                                 onClick={() => onIntervene(index)}
                               >
                                 <Eye className="w-3 h-3 mr-2" />
                                 Manual_Action_Required
                               </Button>
                            )}
                          </div>

                          {/* Status Column */}
                          <div className="flex justify-end pt-0.5">
                            <div className={cn(
                              "w-5 h-5 rounded-full flex items-center justify-center transition-all",
                              isActive ? "text-primary" : 
                              isCompleted ? "text-accent/40" : 
                              "text-muted-foreground/20"
                            )}>
                              {needsReview ? (
                                <AlertCircle className="w-4 h-4 text-destructive animate-bounce" />
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
      
      {/* Table Footer / Summary */}
      <div className="p-3 bg-white/5 border-t border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse shadow-[0_0_8px_hsl(var(--accent))]" />
          <span className="text-[8px] font-black text-accent uppercase tracking-widest">Runtime_Stable</span>
        </div>
        <div className="text-[8px] font-mono text-muted-foreground/30 uppercase">
          {steps.filter(s => s.status === 'completed').length}/{steps.length} OPS_RESOLVED
        </div>
      </div>
    </div>
  );
}
