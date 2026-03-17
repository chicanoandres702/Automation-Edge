import { doc, setDoc, getDoc, collection, getDocs, deleteDoc } from "firebase/firestore";
import { Firestore } from "firebase/firestore";

import { callGemini, AUTOMATION_SYSTEM_PROMPT, SURVEY_SYSTEM_PROMPT, getAIKey } from "@/lib/ai-client";
import { executeAction } from "@/lib/dom-actions";

export async function fetchAIPlan(goal: string, apiKey: string | null, sharedToolHostnames: string[] = []) {
    const key = apiKey || await getAIKey();
    if (!key) throw new Error("API Key required for standalone execution. Please check the 'Integrations' tab in Settings.");

    console.log('[Mission-Service] Generating Standalone Plan...');
    const prompt = `Objective: ${goal}\nShared Tools: ${sharedToolHostnames.join(', ')}`;
    return await callGemini(prompt, key, AUTOMATION_SYSTEM_PROMPT);
}

export async function fetchAISurvey(input: any) {
    const apiKey = await getAIKey();
    if (!apiKey) throw new Error("API Key required for standalone execution. Please check the 'Integrations' tab in Settings.");

    console.log('[Mission-Service] Performing Standalone Contextual Survey...');
    const prompt = JSON.stringify(input);
    return await callGemini(prompt, apiKey, SURVEY_SYSTEM_PROMPT);
}

export async function getSharedToolHostnames(db: Firestore) {
    const toolsSnap = await getDocs(collection(db, "tools"));
    return toolsSnap.docs.map(d => d.data().hostname);
}

export async function purgeMission(db: Firestore, missionId: string) {
    await deleteDoc(doc(db, "missions", missionId));
}

export async function updateMissionMemory(db: Firestore, missionId: string, entry: any) {
    const ref = doc(db, "missions", missionId);
    await setDoc(ref, {
        memory: entry,
        updatedAt: Date.now()
    }, { merge: true });
}
