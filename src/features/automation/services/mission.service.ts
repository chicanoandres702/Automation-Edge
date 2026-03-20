import { doc, setDoc, collection, getDocs, deleteDoc } from "firebase/firestore";
import { Firestore } from "firebase/firestore";

export async function fetchAIPlan(goal: string, apiKey: string | null, sharedToolHostnames: string[] = []) {
    const payload = { prompt: goal, apiKey, sharedToolHostnames };
    const resp = await fetch('http://localhost:9002/api/generate-automation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    if (!resp.ok) throw new Error('AI planner failed');
    return await resp.json();
}

export async function fetchAISurvey(input: any) {
    const resp = await fetch('http://localhost:9002/api/contextual-survey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
    });
    if (!resp.ok) throw new Error('AI search failed');
    return await resp.json();
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
