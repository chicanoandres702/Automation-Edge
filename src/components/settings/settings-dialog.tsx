
"use client";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
   Settings,
   Globe,
   Trash2,
   Shield,
   Zap,
   Database,
   Fingerprint,
   RefreshCw,
} from "lucide-react";
import { useFirebase, useMemoFirebase, useCollection, initiateAnonymousSignIn, initiateGoogleSignIn } from "@/firebase";
import { useToast } from "@/hooks/use-toast";
import { collection, deleteDoc, doc, updateDoc, arrayRemove } from "firebase/firestore";
import { Slider } from "@/components/ui/slider";
import { useState, useEffect, useRef, useId } from "react";
import { setTheme } from '@/lib/theme';
import { Copy, Eye, EyeOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";

interface SettingsDialogProps {
   open: boolean;
   onOpenChange: (open: boolean) => void;
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
   // Title/description handled via DialogContent `title`/`description` props
   const { firestore: db, user, isUserLoading, auth } = useFirebase();
   const { toast } = useToast();

   const toolsRef = useMemoFirebase(() => {
      if (isUserLoading || !user || !db) return null;
      return collection(db, "tools");
   }, [db, user, isUserLoading]);

   const missionsRef = useMemoFirebase(() => {
      if (isUserLoading || !user || !db) return null;
      return collection(db, "missions");
   }, [db, user, isUserLoading]);

   const { data: tools, isLoading: toolsLoading } = useCollection<any>(toolsRef);
   const { data: missions, isLoading: missionsLoading } = useCollection<any>(missionsRef);

   const [autonomyThreshold, setAutonomyThreshold] = useState([0.85]);
      const [autonomyEnabled, setAutonomyEnabled] = useState<boolean>(false);
         const [manifestClientId, setManifestClientId] = useState<string | null>(null);
   const [activeTab, setActiveTab] = useState("autonomy");
   const [identityMode, setIdentityMode] = useState(true);
   const [aiKey, setAiKey] = useState("");
   const [showKey, setShowKey] = useState(false);
   const [actionDelay, setActionDelay] = useState(1200);
   const [smartMaxIterations, setSmartMaxIterations] = useState<number>(30);
   const [smartScrollFactor, setSmartScrollFactor] = useState<number>(0.8);
   const [smartWaitBaseMs, setSmartWaitBaseMs] = useState<number>(300);
   const [telemetryEnabled, setTelemetryEnabled] = useState<boolean>(true);
      const [uiTheme, setUiTheme] = useState<'default'|'black-red'>('default');

   useEffect(() => {
      try {
         // Prefer an explicit client-exposed env var for dev seeding when storage is empty.
         const envKey = (process.env.NEXT_PUBLIC_AI_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_API_KEY) as string | undefined;

         if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            chrome.storage.local.get(['ai_api_key', 'actionDelayMs', 'smart_max_iterations', 'smart_scroll_factor', 'smart_wait_base_ms', 'telemetry_enabled', 'ui_theme', 'ai_autonomy_enabled'], (res: any) => {
               const storedKey = res.ai_api_key || '';
               const storedDelay = res.actionDelayMs || 1200;
               const storedMax = Number(res.smart_max_iterations) || 30;
               const storedFactor = typeof res.smart_scroll_factor !== 'undefined' ? Number(res.smart_scroll_factor) : 0.8;
               const storedWait = Number(res.smart_wait_base_ms) || 300;
               const storedTelemetry = typeof res.telemetry_enabled === 'undefined' ? true : !!res.telemetry_enabled;
               const storedTheme = res.ui_theme || 'default';
               const storedAutonomy = typeof res.ai_autonomy_enabled === 'undefined' ? false : !!res.ai_autonomy_enabled;

               if (!storedKey && envKey) {
                  setAiKey(envKey);
                  try { chrome.storage.local.set({ ai_api_key: envKey, actionDelayMs: storedDelay }); } catch (e) { }
               } else {
                  setAiKey(storedKey);
               }

               setActionDelay(storedDelay);
               setSmartMaxIterations(storedMax);
               setSmartScrollFactor(storedFactor);
               setSmartWaitBaseMs(storedWait);
               setTelemetryEnabled(storedTelemetry);
               setUiTheme(storedTheme as 'default'|'black-red');
                  setAutonomyEnabled(storedAutonomy);
               try { setTheme(storedTheme as 'default'|'black-red'); } catch (e) {}
            });
               // Collect manifest oauth2 client id (useful to show guidance to operator)
               try {
                  const man = (typeof chrome !== 'undefined' && chrome.runtime && typeof chrome.runtime.getManifest === 'function') ? chrome.runtime.getManifest() : null;
                  const mid = man?.oauth2?.client_id;
                  setManifestClientId(mid || null);
               } catch (e) { /* ignore */ }
         } else {
            const storedKey = localStorage.getItem('ai_api_key') || '';
            const storedDelay = Number(localStorage.getItem('actionDelayMs')) || 1200;
            const storedMax = Number(localStorage.getItem('smart_max_iterations')) || 30;
            const storedFactor = Number(localStorage.getItem('smart_scroll_factor')) || 0.8;
            const storedWait = Number(localStorage.getItem('smart_wait_base_ms')) || 300;
            const storedTelemetry = localStorage.getItem('telemetry_enabled') !== 'false';
            const storedTheme = (localStorage.getItem('ui_theme') as ('default'|'black-red')) || 'default';
            const storedAutonomy = localStorage.getItem('ai_autonomy_enabled') === 'true';
            if (!storedKey && envKey) {
               setAiKey(envKey);
               try { localStorage.setItem('ai_api_key', envKey); localStorage.setItem('actionDelayMs', String(storedDelay)); } catch (e) { }
            } else {
               setAiKey(storedKey);
            }
            setActionDelay(storedDelay);
            setSmartMaxIterations(storedMax);
            setSmartScrollFactor(storedFactor);
            setSmartWaitBaseMs(storedWait);
            setTelemetryEnabled(storedTelemetry);
            setUiTheme(storedTheme);
               setAutonomyEnabled(storedAutonomy);
            try { setTheme(storedTheme); } catch (e) {}
               try {
                  const man = (typeof chrome !== 'undefined' && chrome.runtime && typeof chrome.runtime.getManifest === 'function') ? chrome.runtime.getManifest() : null;
                  const mid = man?.oauth2?.client_id;
                  setManifestClientId(mid || null);
               } catch (e) { /* ignore */ }
         }
      } catch (e) {
         // ignore
      }
   }, []);

   // Save integration settings to storage. By default close the dialog after save
   // (Save button). For auto-save we call persistIntegration() which doesn't close.
   const saveIntegration = (close = true) => {
         try {
            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                  chrome.storage.local.set({ ai_api_key: aiKey, actionDelayMs: actionDelay, smart_max_iterations: smartMaxIterations, smart_scroll_factor: smartScrollFactor, smart_wait_base_ms: smartWaitBaseMs, telemetry_enabled: telemetryEnabled, ui_theme: uiTheme, ai_autonomy_enabled: autonomyEnabled });
               } else {
                  localStorage.setItem('ai_api_key', aiKey);
                  localStorage.setItem('actionDelayMs', String(actionDelay));
                  localStorage.setItem('smart_max_iterations', String(smartMaxIterations));
                  localStorage.setItem('smart_scroll_factor', String(smartScrollFactor));
                  localStorage.setItem('smart_wait_base_ms', String(smartWaitBaseMs));
                  localStorage.setItem('telemetry_enabled', telemetryEnabled ? 'true' : 'false');
                  localStorage.setItem('ui_theme', uiTheme);
                  localStorage.setItem('ai_autonomy_enabled', autonomyEnabled ? 'true' : 'false');
               }
         if (close) {
            try { onOpenChange(false); } catch (e) { /* ignore */ }
         }
      } catch (e) {
         // ignore
      }
   };

   const persistIntegration = () => {
      // Same as saveIntegration but don't close the dialog (used for debounced autosave)
      try {
         if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            chrome.storage.local.set({ ai_api_key: aiKey, actionDelayMs: actionDelay, smart_max_iterations: smartMaxIterations, smart_scroll_factor: smartScrollFactor, smart_wait_base_ms: smartWaitBaseMs, telemetry_enabled: telemetryEnabled, ui_theme: uiTheme, ai_autonomy_enabled: autonomyEnabled });
         } else {
            localStorage.setItem('ai_api_key', aiKey);
            localStorage.setItem('actionDelayMs', String(actionDelay));
            localStorage.setItem('smart_max_iterations', String(smartMaxIterations));
            localStorage.setItem('smart_scroll_factor', String(smartScrollFactor));
            localStorage.setItem('smart_wait_base_ms', String(smartWaitBaseMs));
            localStorage.setItem('telemetry_enabled', telemetryEnabled ? 'true' : 'false');
            localStorage.setItem('ui_theme', uiTheme);
            localStorage.setItem('ai_autonomy_enabled', autonomyEnabled ? 'true' : 'false');
         }
      } catch (e) {
         // ignore
      }
   };

   const _didMountRef = useRef(false);

   useEffect(() => {
      // skip autosave on first mount which loads stored values
      if (!_didMountRef.current) { _didMountRef.current = true; return; }
      const t = window.setTimeout(() => {
         try { persistIntegration(); } catch (e) { }
      }, 800);
      return () => window.clearTimeout(t);
   }, [aiKey, actionDelay]);

   const handleDeleteTool = async (id: string) => {
      if (!db) return;
      await deleteDoc(doc(db, "tools", id));
   };

   const handleDeletePattern = async (missionId: string, pattern: any) => {
      if (!db) return;
      const missionRef = doc(db, "missions", missionId);
      await updateDoc(missionRef, {
         learnedPatterns: arrayRemove(pattern)
      });
   };

   return (
      <Dialog open={open} onOpenChange={onOpenChange}>
         <DialogContent
            srTitle="Nexus Fleet Settings"
            srDescription="Configure Nexus agent autonomy, shared tool infrastructure, and learned success patterns."
            className="max-w-2xl bg-background/95 backdrop-blur-3xl border-white/10 rounded-3xl p-0 overflow-hidden ring-1 ring-white/10 shadow-2xl"
         >
            <div className="flex h-[550px]">
               <div className="w-52 border-r border-white/5 bg-white/[0.02] p-5 flex flex-col gap-6">
                  <div className="flex items-center gap-3 px-2">
                     <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center border border-primary/30">
                        <Settings className="w-4 h-4 text-primary" />
                     </div>
                     <span className="text-[10px] font-black uppercase tracking-widest text-foreground/90">
                        Nexus Settings
                     </span>
                  </div>

                  <div className="flex flex-col gap-1.5">
                     {[
                        { id: 'autonomy', icon: Zap, label: 'Autonomy' },
                        { id: 'integration', icon: Shield, label: 'Integrations' },
                        { id: 'tools', icon: Globe, label: 'Shared Tools' },
                        { id: 'memory', icon: Database, label: 'Pattern Registry' }
                     ].map((item) => (
                        <button
                           key={item.id}
                           onClick={() => setActiveTab(item.id)}
                           className={cn(
                              "flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-300 group",
                              activeTab === item.id
                                 ? "bg-primary/10 text-primary shadow-[inset_0_0_10px_rgba(0,100,255,0.05)]"
                                 : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                           )}
                        >
                           <div className="flex items-center gap-3">
                              <item.icon className={cn("w-3.5 h-3.5", activeTab === item.id ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
                              <span className="text-[10px] font-bold uppercase tracking-tight">{item.label}</span>
                           </div>
                           {activeTab === item.id && <div className="w-1 h-1 rounded-full bg-primary" />}
                        </button>
                     ))}
                  </div>

                  <div className="mt-auto p-4 rounded-2xl bg-accent/5 border border-accent/10">
                     <div className="flex items-center gap-2 mb-2">
                        <Shield className="w-3 h-3 text-accent" />
                        <span className="text-[8px] font-black uppercase tracking-widest text-accent">Security Active</span>
                     </div>
                     <p className="text-[8px] text-muted-foreground leading-relaxed">Neural persistence is encrypted and siloed per mission.</p>
                  </div>
               </div>

                              {/* Theme selector moved into main panel to avoid layout shift */}

               <div className="flex-1 p-8 flex flex-col min-h-0 bg-gradient-to-br from-transparent to-primary/5">
                  <div className="mb-4">
                     <label className="text-[9px] font-black uppercase tracking-widest">Theme</label>
                     <div className="flex items-center gap-3 mt-2">
                        <select
                           aria-label="UI Theme"
                           className="w-44 bg-black/10 px-2 py-2 rounded-lg text-xs border border-white/5"
                           value={uiTheme}
                           onChange={(e) => {
                              const v = (e.target.value as 'default'|'black-red');
                              setUiTheme(v);
                              try { setTheme(v); } catch (err) { }
                           }}
                        >
                           <option value="default">Default</option>
                           <option value="black-red">Black / Red</option>
                        </select>
                        <span className="text-[9px] text-muted-foreground">Select UI theme.</span>
                     </div>
                  </div>
                  <ScrollArea className="flex-1 pr-4">
                     {activeTab === 'autonomy' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-right-2 duration-500">
                           <div className="space-y-2">
                              <h3 className="text-[12px] font-black uppercase tracking-widest text-primary">Autonomy Protocols</h3>
                              <p className="text-[10px] text-muted-foreground leading-relaxed">Configure how the agent handles environmental ambiguity.</p>
                           </div>

                           <div className="space-y-6">
                              <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-5">
                                 <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                       <Zap className="w-4 h-4 text-primary" />
                                       <span className="text-[10px] font-black uppercase tracking-tight">Confidence Bypass Threshold</span>
                                    </div>
                                    <Badge variant="outline" className="text-[10px] font-mono border-primary/20 text-primary bg-primary/5">{(autonomyThreshold[0] * 100).toFixed(0)}%</Badge>
                                 </div>
                                 <p className="text-[9px] text-muted-foreground">The AI must meet this certainty score to proceed without an Operator Sync request.</p>
                                 <Slider
                                    value={autonomyThreshold}
                                    onValueChange={setAutonomyThreshold}
                                    max={1}
                                    step={0.01}
                                    min={0.5}
                                    className="py-2"
                                 />
                              </div>

                              <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-between">
                                 <div className="flex items-center gap-3">
                                    <Fingerprint className="w-4 h-4 text-accent" />
                                    <div className="flex flex-col">
                                       <span className="text-[10px] font-black uppercase tracking-tight">Persistent Identity Mode</span>
                                       <span className="text-[8px] text-muted-foreground">Maintains consistent browser fingerprint across tabs.</span>
                                    </div>
                                 </div>
                                 <Switch checked={identityMode} onCheckedChange={setIdentityMode} className="scale-75 data-[state=checked]:bg-accent" />
                              </div>
                                 <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
                                    <div className="flex items-center justify-between">
                                       <div className="flex items-center gap-3">
                                          <Zap className="w-4 h-4 text-primary" />
                                          <div className="flex flex-col">
                                             <span className="text-[10px] font-black uppercase tracking-tight">Enable Autonomous AI</span>
                                             <span className="text-[8px] text-muted-foreground">When enabled, the agent may perform background AI reasoning without explicit operator approval.</span>
                                          </div>
                                       </div>
                                       <Switch checked={autonomyEnabled} onCheckedChange={(v:boolean) => { setAutonomyEnabled(!!v); try { persistIntegration(); } catch(e){} }} className="scale-75 data-[state=checked]:bg-accent" />
                                    </div>

                                    <div className="flex items-center gap-3">
                                       <Button onClick={() => {
                                          try { sessionStorage.setItem('ai_user_override_ts', String(Date.now())); } catch (e) {}
                                          try { toast({ title: 'One-shot approved', description: 'One AI call is allowed for 30s.' }); } catch (e) {}
                                       }}>Allow one AI call</Button>
                                       <span className="text-[9px] text-muted-foreground">Use to approve a single AI request if autonomy is disabled (expires in 30s).</span>
                                    </div>
                                 </div>
                           </div>
                        </div>
                     )}

                     {activeTab === 'integration' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-2 duration-500">
                          {/* Account / Sign-in */}
                          <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4">
                             <div className="flex items-center justify-between">
                                <div>
                                   <h3 className="text-[12px] font-black uppercase tracking-widest text-primary">Account</h3>
                                   <p className="text-[10px] text-muted-foreground">Sign in to persist missions and access shared infrastructure.</p>
                                </div>
                                <div className="flex items-center gap-3">
                                   {isUserLoading ? (
                                      <span className="text-[10px] text-muted-foreground">Checking authentication…</span>
                                   ) : user ? (
                                      <>
                                         <span className="text-[10px] font-mono text-muted-foreground">Signed in: {user.email || user.uid || 'Anonymous'}</span>
                                         <Button variant="ghost" size="sm" onClick={async () => {
                                            if (!auth) { try { toast({ title: 'Sign out failed', description: 'Auth not available.' }); } catch (e) {} return; }
                                            try {
                                               const mod = await import('firebase/auth');
                                               await mod.signOut(auth);
                                               try { toast({ title: 'Signed out', description: 'You have been signed out.' }); } catch (e) {}
                                            } catch (e) { try { toast({ title: 'Sign out failed', description: 'Unable to sign out.' }); } catch (err) {} }
                                         }}>Sign out</Button>
                                      </>
                                   ) : (
                                      <div className="flex flex-col gap-3">
                                         {(!manifestClientId || String(manifestClientId).includes('YOUR_GOOGLE_CLIENT_ID')) && (
                                            <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-100 text-yellow-800 text-[10px]">
                                               <strong>Note:</strong> Extension OAuth client not configured. To enable Google sign-in via the extension, add a valid OAuth2 <code>client_id</code> to <code>public/manifest.json</code> and register the extension redirect URI in Google Cloud Console (chrome-extension://&lt;EXT_ID&gt;/). Using the web popup will still work without this, but background/identity flows require the manifest client.
                                            </div>
                                         )}
                                         <div className="flex items-center gap-2">
                                         <Button onClick={() => {
                                            if (!auth) { try { toast({ title: 'Sign in failed', description: 'Auth not available yet.' }); } catch (e) {} return; }
                                            try { initiateGoogleSignIn(auth); try { toast({ title: 'Signing in', description: 'Complete the Google sign-in popup to continue.' }); } catch (e) {} } catch (e) { try { toast({ title: 'Sign in failed', description: 'Unable to start Google sign-in.' }); } catch (err) {} }
                                         }}>Sign in with Google</Button>

                                         <Button variant="ghost" size="sm" onClick={() => {
                                            if (!auth) { try { toast({ title: 'Sign in failed', description: 'Auth not available yet.' }); } catch (e) {} return; }
                                            try { initiateAnonymousSignIn(auth); try { toast({ title: 'Signing in', description: 'Signing in anonymously...' }); } catch (e) {} } catch (e) { try { toast({ title: 'Sign in failed', description: 'Unable to sign in.' }); } catch (err) {} }
                                         }}>Anonymous</Button>
                                         </div>
                                      </div>
                                   )}
                                </div>
                             </div>
                          </div>
                           <div className="space-y-2">
                              <h3 className="text-[12px] font-black uppercase tracking-widest text-primary">Integrations</h3>
                              <p className="text-[10px] text-muted-foreground">Configure AI keys and runtime action speed.</p>
                           </div>

                           <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4">
                              <div className="space-y-2">
                                 <label className="text-[9px] font-black uppercase tracking-widest">AI API Key</label>
                                 <div className="flex items-center gap-2">
                                    <input
                                       aria-label="AI API Key"
                                       className="flex-1 bg-black/10 px-3 py-2 rounded-lg text-xs border border-white/5"
                                       value={aiKey}
                                       onChange={(e) => setAiKey(e.target.value)}
                                       placeholder="sk-..."
                                       type={showKey ? 'text' : 'password'}
                                    />
                                    <Button variant="ghost" size="icon" onClick={() => { try { navigator.clipboard.writeText(aiKey || ''); } catch (e) { } }}>
                                       <Copy className="w-4 h-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" onClick={() => setShowKey(s => !s)}>
                                       {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </Button>
                                    <Button onClick={() => saveIntegration(true)} className="text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-lg bg-primary text-primary-foreground">Save</Button>
                                 </div>
                              </div>

                              <div className="space-y-2">
                                 <label className="text-[9px] font-black uppercase tracking-widest">Action Delay (ms)</label>
                                 <div className="flex items-center gap-3">
                                    <input
                                       aria-label="Action Delay (ms)"
                                       type="number"
                                       className="w-32 bg-black/10 px-2 py-2 rounded-lg text-xs border border-white/5"
                                       value={actionDelay}
                                       onChange={(e) => setActionDelay(Number(e.target.value) || 900)}
                                    />
                                    <span className="text-[9px] text-muted-foreground">Delay between actions; increase to slow execution.</span>
                                 </div>
                              </div>

                                 <div className="space-y-2">
                                    <label className="text-[9px] font-black uppercase tracking-widest">Smart Scrolling</label>
                                    <div className="flex flex-col gap-2">
                                       <div className="flex items-center gap-3">
                                          <input
                                             aria-label="Max Scroll Iterations"
                                             type="number"
                                             className="w-32 bg-black/10 px-2 py-2 rounded-lg text-xs border border-white/5"
                                             value={smartMaxIterations}
                                             onChange={(e) => setSmartMaxIterations(Number(e.target.value) || 30)}
                                          />
                                          <span className="text-[9px] text-muted-foreground">Max viewport snapshots per page (increase for long pages).</span>
                                       </div>

                                       <div className="flex items-center gap-3">
                                          <input
                                             aria-label="Scroll Step Factor"
                                             type="number"
                                             step={0.05}
                                             min={0.2}
                                             max={1}
                                             className="w-32 bg-black/10 px-2 py-2 rounded-lg text-xs border border-white/5"
                                             value={smartScrollFactor}
                                             onChange={(e) => setSmartScrollFactor(Number(e.target.value) || 0.8)}
                                          />
                                          <span className="text-[9px] text-muted-foreground">Fraction of viewport to step during scanning (0.2–1.0).</span>
                                       </div>

                                       <div className="flex items-center gap-3">
                                          <input
                                             aria-label="Wait Base (ms)"
                                             type="number"
                                             className="w-32 bg-black/10 px-2 py-2 rounded-lg text-xs border border-white/5"
                                             value={smartWaitBaseMs}
                                             onChange={(e) => setSmartWaitBaseMs(Number(e.target.value) || 300)}
                                          />
                                          <span className="text-[9px] text-muted-foreground">Base wait time between scrolls for lazy content (ms).</span>
                                       </div>

                                       <div className="flex items-center gap-3">
                                          <label className="text-[9px] font-black uppercase tracking-widest">Telemetry</label>
                                          <div className="ml-auto">
                                             <Switch checked={telemetryEnabled} onCheckedChange={setTelemetryEnabled} />
                                          </div>
                                          <span className="text-[9px] text-muted-foreground ml-2">Enable selector heuristic telemetry (stored locally).</span>
                                       </div>
                                    </div>
                                 </div>
                           </div>
                        </div>
                     )}



                     {activeTab === 'tools' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-2 duration-500">
                           <div className="flex items-center justify-between">
                              <div className="space-y-1">
                                 <h3 className="text-[12px] font-black uppercase tracking-widest text-primary">Shared Infrastructure</h3>
                                 <p className="text-[10px] text-muted-foreground">Manage universal tool hostnames accessible across all missions.</p>
                              </div>
                           </div>

                           <div className="space-y-2">
                              {toolsLoading ? (
                                 <div className="flex justify-center py-10">
                                    <RefreshCw className="w-5 h-5 animate-spin text-primary/40" />
                                 </div>
                              ) : tools?.map((tool: any) => (
                                 <div key={tool.id} className="group flex items-center justify-between p-4 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-primary/20 transition-all">
                                    <div className="flex items-center gap-4">
                                       <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                                          <Globe className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                       </div>
                                       <div className="flex flex-col gap-0.5">
                                          <span className="text-[10px] font-black uppercase tracking-tight">{tool.toolId}</span>
                                          <span className="text-[9px] font-mono text-muted-foreground">{tool.hostname}</span>
                                       </div>
                                    </div>
                                    <Button
                                       variant="ghost"
                                       size="icon"
                                       className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all"
                                       onClick={() => handleDeleteTool(tool.id)}
                                    >
                                       <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                 </div>
                              ))}
                              {!toolsLoading && tools?.length === 0 && (
                                 <div className="py-20 flex flex-col items-center justify-center text-muted-foreground/30 border-2 border-dashed border-white/5 rounded-3xl">
                                    <Globe className="w-8 h-8 mb-4 opacity-10" />
                                    <p className="text-[10px] font-black uppercase tracking-widest">No shared nodes identified</p>
                                 </div>
                              )}
                           </div>
                        </div>
                     )}

                     {activeTab === 'memory' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-2 duration-500">
                           <div className="space-y-1">
                              <h3 className="text-[12px] font-black uppercase tracking-widest text-primary">Pattern Registry</h3>
                              <p className="text-[10px] text-muted-foreground">Audit and manage visual evidence patterns used for auto-verification.</p>
                           </div>

                           <div className="space-y-3">
                              {missionsLoading ? (
                                 <div className="flex justify-center py-10">
                                    <RefreshCw className="w-5 h-5 animate-spin text-primary/40" />
                                 </div>
                              ) : missions?.map((mission: any) => (
                                 mission.learnedPatterns?.map((pattern: any, idx: number) => (
                                    <div key={`${mission.id}-${idx}`} className="group flex items-center justify-between p-4 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-accent/20 transition-all">
                                       <div className="flex-1 min-w-0 pr-4">
                                          <div className="flex items-center gap-2 mb-1.5">
                                             <Badge variant="secondary" className="text-[8px] px-1.5 py-0 font-black bg-primary/10 text-primary border-primary/20">{mission.missionId}</Badge>
                                             <span className="text-[10px] font-black uppercase tracking-tighter text-foreground/80">{pattern.actionType} Logic</span>
                                          </div>
                                          <p className="text-[9px] font-mono text-muted-foreground italic truncate">Evidence: "{pattern.successIndicator}"</p>
                                       </div>
                                       <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all"
                                          onClick={() => handleDeletePattern(mission.id, pattern)}
                                       >
                                          <Trash2 className="w-3.5 h-3.5" />
                                       </Button>
                                    </div>
                                 ))
                              ))}
                              {!missionsLoading && missions?.every((m: any) => !m.learnedPatterns?.length) && (
                                 <div className="py-20 flex flex-col items-center justify-center text-muted-foreground/30 border-2 border-dashed border-white/5 rounded-3xl">
                                    <Database className="w-8 h-8 mb-4 opacity-10" />
                                    <p className="text-[10px] font-black uppercase tracking-widest">No patterns cached</p>
                                 </div>
                              )}
                           </div>
                        </div>
                     )}
                  </ScrollArea>
               </div>
            </div>
         </DialogContent>
      </Dialog>
   );
}
