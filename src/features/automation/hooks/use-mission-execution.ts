import { useState, useCallback } from "react";
import { doc, getDoc, arrayUnion, setDoc } from "firebase/firestore";
import { Firestore } from "firebase/firestore";
import { AutomationTask, ExecutionMemory } from "@/lib/types";
import { captureGlobalContext, executeAction } from "@/lib/dom-traversal";
import { fetchAISurvey } from "../services/mission.service";

export function useMissionExecution(
    activeTask: AutomationTask | null,
    setActiveTask: React.Dispatch<React.SetStateAction<AutomationTask | null>>,
    db: Firestore | null,
    addLog: (msg: string, type?: any) => void,
    manualMode: boolean
) {
    const [isInterventionOpen, setIsInterventionOpen] = useState(false);
    const [interventionQuestion, setInterventionQuestion] = useState("");
    const [pendingActionData, setPendingActionData] = useState<any>(null);

    const executeNextStep = useCallback(async () => {
        if (!activeTask || !db) return;
        const index = activeTask.currentStepIndex;
        const step = activeTask.steps[index];

        if (!step) {
            addLog("Verifying Finality...", "system");
            return verifyGoalCompletion();
        }

        try {
            updateStepStatus(index, 'active');
            const state = await captureGlobalContext();
            const missionId = activeTask.missionContext || "";
            const missionRef = doc(db, "missions", missionId);

            const result = await fetchAISurvey({
                goal: activeTask.prompt,
                memory: activeTask.memory,
                surveyContent: state,
            });

            if (result.action === 'ASK_USER' && result.confidence < 0.85) {
                return triggerIntervention(result);
            }

            const action = step.target ? step.type : result.action;
            const params = step.target ? { selector: step.target, value: step.value } : result.parameters;

            const success = await executeAction(action.toLowerCase(), params);
            const memory: ExecutionMemory = { step: step.description, result: success ? 'Success' : 'Failed' };

            await recordStep(missionRef, memory);
            handleStepResult(success, memory, result.isGoalAchieved);
        } catch (e: any) {
            addLog(`Error: ${e.message}`, "warn");
        }
    }, [activeTask, db, addLog]);

    const verifyGoalCompletion = async () => {
        if (!activeTask) return;
        const state = await captureGlobalContext();
        const res = await fetchAISurvey({ goal: activeTask.prompt, memory: activeTask.memory, surveyContent: state });
        if (res.isGoalAchieved) {
            setActiveTask(prev => prev ? { ...prev, status: 'completed' } : null);
            addLog("Mission Verified Complete", "success");
        } else {
            addLog("Incomplete state — re-shaping plan.", "system");
            return false; // Signal to re-plan
        }
    };

    const updateStepStatus = (idx: number, status: any) => {
        setActiveTask(prev => prev ? {
            ...prev,
            steps: prev.steps.map((s, i) => i === idx ? { ...s, status } : s)
        } : null);
    };

    const triggerIntervention = (result: any) => {
        setInterventionQuestion(result.parameters.question || "Strategic ambiguity.");
        setPendingActionData(result);
        setIsInterventionOpen(true);
        setActiveTask(prev => prev ? { ...prev, status: 'intervention_required' } : null);
    };

    const recordStep = async (ref: any, memory: ExecutionMemory) => {
        await setDoc(ref, {
            memory: arrayUnion({ ...memory, timestamp: Date.now() }),
            updatedAt: Date.now()
        }, { merge: true });
    };

    const handleStepResult = (success: boolean, memory: ExecutionMemory, goalAchieved: boolean) => {
        if (success) {
            setActiveTask(prev => prev ? {
                ...prev,
                steps: prev.steps.map((s, i) => i === prev.currentStepIndex ? { ...s, status: 'completed' } : s),
                currentStepIndex: prev.currentStepIndex + 1,
                memory: [...prev.memory, memory],
                status: goalAchieved ? 'completed' : 'running'
            } : null);
        } else {
            addLog("Action failed — retrying.", "warn");
        }
    };

    return {
        executeNextStep, verifyGoalCompletion,
        isInterventionOpen, setIsInterventionOpen,
        interventionQuestion, pendingActionData
    };
}
