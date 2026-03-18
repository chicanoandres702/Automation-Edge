"use client";

import { useState, useCallback, useEffect } from "react";
import { doc, arrayUnion, setDoc } from "firebase/firestore";
import { Firestore } from "firebase/firestore";
import { AutomationTask, ExecutionMemory, AutomationStep, ActionType } from "@/lib/types";
import { captureGlobalContext } from "@/lib/dom-traversal";
import { executeAction } from "@/lib/dom-actions";
import { updateBrowserOverlay } from "@/lib/dom-overlay";
import { fetchAISurvey } from "../services/mission.service";

// MAX_RETRIES: number of step failures before operator intervention is required
const MAX_RETRIES = 3;
const STEP_DELAY_MS = 1000;

export function useMissionExecution(
    activeTask: AutomationTask | null,
    setActiveTask: React.Dispatch<React.SetStateAction<AutomationTask | null>>,
    db: Firestore | null,
    addLog: (msg: string, type?: string) => void,
    manualMode: boolean
) {
    const [isInterventionOpen, setIsInterventionOpen] = useState(false);
    const [interventionQuestion, setInterventionQuestion] = useState("");
    const [pendingActionData, setPendingActionData] = useState<any>(null);

    useEffect(() => {
        const isMissionActive = activeTask && ['running', 'seeking', 'intervention_required'].includes(activeTask.status);
        
        if (isMissionActive && activeTask.steps.length) {
            const index = activeTask.currentStepIndex;
            const step = activeTask.steps[index] || activeTask.steps[index - 1]; // Use last step if index is at end
            if (step) {
                updateBrowserOverlay(step.description, activeTask.status);
            }
            
            if (activeTask.status === 'running' && !manualMode) {
                const timer = setTimeout(() => executeNextStep(), STEP_DELAY_MS);
                return () => clearTimeout(timer);
            }
        } else {
            updateBrowserOverlay(null);
        }
    }, [activeTask?.status, activeTask?.currentStepIndex, manualMode, activeTask?.id]);

    // Auto-open control modal when the AI signals strategic ambiguity
    useEffect(() => {
        if (activeTask?.status === 'seeking' && !isInterventionOpen) {
            setInterventionQuestion("Strategic ambiguity — please refine or confirm the mission objective.");
            setIsInterventionOpen(true);
        }
    }, [activeTask?.status]);

    const triggerIntervention = useCallback((question: string) => {
        setInterventionQuestion(question);
        setIsInterventionOpen(true);
        setActiveTask(prev => prev ? { ...prev, status: 'intervention_required' } : null);
    }, [setActiveTask]);

    const handleStepResult = useCallback((success: boolean, memory: ExecutionMemory, goalAchieved: boolean) => {
        setActiveTask(prev => {
            if (!prev) return null;
            const index = prev.currentStepIndex;
            const step = prev.steps[index];
            if (success) {
                return {
                    ...prev,
                    steps: prev.steps.map((s, i) => i === index ? { ...s, status: 'completed', detail: memory.reasoning } : s),
                    currentStepIndex: index + 1,
                    memory: [...prev.memory, memory],
                    status: goalAchieved ? 'completed' : 'running'
                };
            }
            const newRetryCount = (step.retryCount || 0) + 1;
            if (newRetryCount >= MAX_RETRIES) {
                addLog(`Step "${step.description}" failed ${MAX_RETRIES}x — intervention required.`, "warn");
                triggerIntervention(`The step "${step.description}" keeps failing. Skip it, retry, or guide me?`);
                return { 
                    ...prev, 
                    status: 'intervention_required', 
                    steps: prev.steps.map((s, i) => i === index ? { ...s, status: 'failed', retryCount: newRetryCount, detail: memory.reasoning } : s) 
                };
            }
            addLog(`Action failed — retrying (${newRetryCount}/${MAX_RETRIES}).`, "warn");
            return { ...prev, steps: prev.steps.map((s, i) => i === index ? { ...s, status: 'pending', retryCount: newRetryCount, detail: memory.reasoning } : s) };
        });
    }, [addLog, triggerIntervention, setActiveTask]);

    const executeNextStep = useCallback(async () => {
        if (!activeTask || !db) return;
        const index = activeTask.currentStepIndex;
        const step = activeTask.steps[index];

        if (!step) {
            addLog("All steps complete — verifying goal...", "system");
            const state = await captureGlobalContext();
            const res = await fetchAISurvey({ goal: activeTask.prompt, memory: activeTask.memory, surveyContent: state });
            if (res.isGoalAchieved) {
                setActiveTask(prev => prev ? { ...prev, status: 'completed' } : null);
                addLog("Mission Verified Complete", "success");
            } else { addLog("Incomplete — re-shaping plan.", "system"); }
            return;
        }

        try {
            setActiveTask(prev => prev ? { ...prev, steps: prev.steps.map((s, i) => i === index ? { ...s, status: 'active' } : s) } : null);
            const state = await captureGlobalContext();

            // Reflective Surveying: Passing the entire mission history to Gemini 3.0
            const surveyPrompt = {
                goal: activeTask.prompt,
                memory: activeTask.memory,
                currentStep: step.description,
                surveyContent: state
            };

            const result = await fetchAISurvey(surveyPrompt);

            // Update step detail with reasoning immediately
            setActiveTask(prev => {
                if (!prev) return null;
                return {
                    ...prev,
                    steps: prev.steps.map((s, i) => i === index ? { ...s, detail: result.reasoning } : s)
                };
            });

            // Tactical Pivot Logic
            if (result.tacticalUpdate?.newSteps) {
                addLog(`Strategic Adjustment: ${result.reasoning}`, "system");
                const now = Date.now();
                const portedSteps: AutomationStep[] = result.tacticalUpdate.newSteps.map((s, idx) => ({
                    id: `pivot-${now}-${idx}`,
                    description: s.description as string,
                    type: s.type as ActionType,
                    target: s.target,
                    value: s.value,
                    status: 'pending',
                    retryCount: 0,
                    maxRetries: 3
                } as AutomationStep));

                setActiveTask(prev => {
                    if (!prev) return null;
                    return {
                        ...prev,
                        steps: result.tacticalUpdate?.shouldResetIndex ? portedSteps : [...prev.steps.slice(0, index), ...portedSteps],
                        currentStepIndex: result.tacticalUpdate?.shouldResetIndex ? 0 : index
                    };
                });
                return; // Re-evaluate in next cycle
            }

            if (result.action === 'ASK_USER' && (result.confidence ?? 0) < 0.85) {
                return triggerIntervention(result.parameters?.question || "Ambiguity detected.");
            }

            const action = (step.target ? step.type : (result.action ?? "")) as string;
            const params = step.target ? { selector: step.target, value: step.value } : result.parameters;

            if (!action) {
                addLog("No action provided by AI or step; skipping.", "warn");
                return;
            }

            const success = await executeAction(action.toLowerCase(), params);
            const memory: ExecutionMemory = { step: step.description, result: success ? 'Success' : 'Failed', reasoning: result.reasoning };

            const missionRef = doc(db, "missions", activeTask.missionContext || "");
            await setDoc(missionRef, {
                memory: arrayUnion({ ...memory, timestamp: Date.now() }),
                updatedAt: Date.now()
            }, { merge: true });

            handleStepResult(success, memory, !!result.isGoalAchieved);
        } catch (e: any) {
            if (e?.name === 'AutonomyDisabledError') {
                // Operator approval required — open the intervention modal and
                // pause the mission so the human can approve the AI call.
                addLog('Autonomous AI blocked — operator approval required to continue.', 'warn');
                setInterventionQuestion(e?.message || 'Operator approval required to perform this AI action.');
                setIsInterventionOpen(true);
                setActiveTask(prev => prev ? { ...prev, status: 'intervention_required' } : null);
                return;
            }

            if (e.name === 'RateLimitError') {
                let waitSeconds = Math.ceil(e.retryAfter || 15);
                addLog(`⚠️ API Quota Exceeded. Cooldown initiated. Resuming in ${waitSeconds}s...`, "warn");
                
                // Temporarily pause the mission to prevent run-away loops
                setActiveTask(prev => prev ? { ...prev, status: 'paused' } : null);
                
                const countdownInterval = setInterval(() => {
                    waitSeconds -= 1;
                    if (waitSeconds <= 0) {
                        clearInterval(countdownInterval);
                        addLog(`Cooldown complete. Resuming mission...`, "success");
                        setActiveTask(prev => prev ? { ...prev, status: 'running' } : null);
                    } else if (waitSeconds % 5 === 0 || waitSeconds <= 3) {
                         // Only log every 5s or the last 3s to avoid spam
                         addLog(`⏳ Cooldown: ${waitSeconds}s remaining...`, "system");
                    }
                }, 1000);
                
            } else {
                addLog(`Error: ${e.message}`, "warn");
            }
        }
    }, [activeTask, db, addLog, handleStepResult, triggerIntervention]);

    const skipCurrentStep = useCallback(() => {
        if (!activeTask) return;
        addLog(`Skipping: ${activeTask.steps[activeTask.currentStepIndex]?.description}`, "info");
        setActiveTask(prev => prev ? { ...prev, currentStepIndex: prev.currentStepIndex + 1, status: 'running' } : null);
        setIsInterventionOpen(false);
    }, [activeTask, addLog, setActiveTask]);

    return {
        executeNextStep, isInterventionOpen, setIsInterventionOpen,
        interventionQuestion, pendingActionData, skipCurrentStep
    };
}
