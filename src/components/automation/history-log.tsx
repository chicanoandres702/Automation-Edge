"use client";

import { AutomationTask } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Terminal, Clock, ExternalLink, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";

interface HistoryLogProps {
  tasks: AutomationTask[];
}

export function AutomationHistoryLog({ tasks }: HistoryLogProps) {
  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <Terminal className="w-12 h-12 mb-4 opacity-10" />
        <p className="text-sm">No automation history found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold font-headline flex items-center gap-2">
          <Terminal className="w-5 h-5 text-accent" />
          Operation History
        </h2>
        <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-destructive">
          Clear All
        </Button>
      </div>
      
      <ScrollArea className="h-[500px] pr-4">
        <div className="space-y-3">
          {tasks.map((task) => (
            <Card key={task.id} className="bg-card/30 border-border hover:border-primary/50 transition-colors group">
              <CardContent className="p-4">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground mb-1 truncate">
                      {task.prompt}
                    </p>
                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDistanceToNow(task.createdAt, { addSuffix: true })}
                      </span>
                      <span className="flex items-center gap-1">
                        <Terminal className="w-3 h-3" />
                        {task.steps.length} steps
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge variant={task.status === 'completed' ? 'default' : task.status === 'error' ? 'destructive' : 'secondary'} className="text-[10px] px-1.5 py-0">
                      {task.status}
                    </Badge>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-6 w-6">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive/70 hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}