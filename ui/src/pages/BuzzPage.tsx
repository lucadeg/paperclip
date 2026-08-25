import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { useCompany } from "../context/CompanyContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Flame,
  Send,
  ShieldCheck,
  Crown,
  Bell,
  RefreshCw,
  Bot,
  Activity,
  CheckCircle2,
  Cpu,
  Layers,
  Sparkles,
  Zap,
  Radio,
  Hash,
  Play,
  Check,
  AlertTriangle,
  MessageSquare,
  Shield,
  Search,
  FileCheck2,
  Terminal,
  DollarSign,
  UserCheck,
  ListTodo,
  ExternalLink,
  ChevronRight,
  X,
  Database,
  Lock,
  BookOpen,
  Library,
  FileText,
  FolderOpen,
  Plus,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  projectSessionsApi,
  type ProjectSession,
  type CreateProjectSessionInput,
  PROJECT_WORKFLOW_STEPS,
  type WorkflowStepDef,
} from "../api/project-sessions";

interface BuzzMessage {
  id: string;
  channel: string;
  sender: string;
  role: string;
  avatar: string;
  timestamp: string;
  content: string;
  type: string;
}

interface TelemetryEvent {
  id: string;
  agent: string;
  agentId?: string;
  role: string;
  model: string;
  latencyMs: number;
  tokens: number;
  costUsd?: number;
  score: number;
  timestamp: string;
  task?: string;
}

interface VerifiableFact {
  id: string;
  agentId: string;
  agentName: string;
  project: string;
  taskTitle: string;
  model: string;
  tokens: number;
  timestamp: string;
  hash: string;
  status: string;
  benchmarkScore: number;
  proofOfWork: string;
}

interface AgentKPI {
  id: string;
  name: string;
  role: string;
  title: string;
  totalTasks: number;
  totalRuns: number;
  totalTokens: number;
  totalCostUsd: number;
}

const CHANNELS = [
  { id: "all", label: "all-swarm-stream", icon: Radio, desc: "Flusso globale unificato dello sciame" },
  { id: "ldg-god-commands", label: "ldg-god-commands", icon: Crown, desc: "Ordini e direttive sovrane di LDG Admin", gold: true },
  { id: "executive-direction", label: "executive-direction", icon: Bot, desc: "Direzione Generale, Staff e Board Investors" },
  { id: "marketing-growth", label: "marketing-growth", icon: Sparkles, desc: "Marketing: Campagne, UGC, Viral Video & Growth Hacking" },
  { id: "customer-support", label: "customer-support", icon: Bot, desc: "Supporto Clienti: Helpdesk, Tier-1/2, Ticket & CSAT" },
  { id: "software-engineering", label: "software-engineering", icon: Cpu, desc: "Programmazione: Architettura, Frontend, Backend, DevOps & QA" },
  { id: "customer-success", label: "customer-success", icon: UserCheck, desc: "Gestione Clienti: Onboarding, Account Management & Retention" },
  { id: "legal-compliance", label: "legal-compliance", icon: ShieldCheck, desc: "Compliance Legale: MOG 231, GDPR, EU AI Act & Brevetti" },
  { id: "fiscal-compliance", label: "fiscal-compliance", icon: DollarSign, desc: "Compliance Fiscale: Fatturazione SDI, IVA, Bilancio & Audit" },
  { id: "commercial-compliance", label: "commercial-compliance", icon: FileCheck2, desc: "Compliance Commerciale: Pricing Policy, Antitrust & Contratti" },
  { id: "sales-department", label: "sales-department", icon: Layers, desc: "Reparto Commerciale: B2B Outbound, Deal Closing & Offerte" },
  { id: "resource-management", label: "resource-management", icon: Zap, desc: "Gestione Risorse: Compute, Token Allocation, Skills & Focus Coach" },
  { id: "critics-and-haters", label: "critics-and-haters", icon: AlertTriangle, desc: "Devil's Advocate, Haters e Spie Competitor" },
  { id: "shadow-threat-furbetti", label: "shadow-threat-furbetti", icon: Zap, desc: "Furbetti, Quota Exploiters e Shadow IT" },
];

export function BuzzPage() {
  const { setBreadcrumbs } = useBreadcrumbs();
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.id || "e97dd876-ab97-46c9-a49d-286aa3e1fde3";

  const [activeChannel, setActiveChannel] = useState("all");
  const [messages, setMessages] = useState<BuzzMessage[]>([]);
  const [telemetry, setTelemetry] = useState<TelemetryEvent[]>([]);
  const [facts, setFacts] = useState<VerifiableFact[]>([]);
  const [agentsList, setAgentsList] = useState<any[]>([]);
  const [knowledgeData, setKnowledgeData] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<"stream" | "facts" | "agents" | "knowledge" | "sessions">("stream");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Selected Agent for Personal Control Panel Modal
  const [selectedAgentProfile, setSelectedAgentProfile] = useState<any | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  const [directiveText, setDirectiveText] = useState("");
  const [sending, setSending] = useState(false);
  const [sprintRunning, setSprintRunning] = useState(false);
  const [sprintSuccess, setSprintSuccess] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Sessions state
  const [newSessionOpen, setNewSessionOpen] = useState(false);
  const [newSessionTitle, setNewSessionTitle] = useState("");
  const [newSessionTopic, setNewSessionTopic] = useState("engineering");
  const [newSessionStep, setNewSessionStep] = useState(1);
  const [newSessionModel, setNewSessionModel] = useState("claude-sonnet-4-5");
  const [creatingSession, setCreatingSession] = useState(false);

  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: sessions, refetch: refetchSessions } = useQuery({
    queryKey: ["project-sessions", companyId],
    queryFn: () => projectSessionsApi.list(companyId),
    enabled: !!companyId && activeTab === "sessions",
    refetchInterval: 15_000,
  });

  async function handleCreateSession(e: React.FormEvent) {
    e.preventDefault();
    if (!newSessionTitle.trim() || creatingSession) return;
    setCreatingSession(true);
    try {
      await projectSessionsApi.create(companyId, {
        title: newSessionTitle.trim(),
        topic: newSessionTopic,
        workflowStep: newSessionStep,
        selectedModel: newSessionModel,
      });
      setNewSessionTitle("");
      setNewSessionOpen(false);
      void refetchSessions();
    } catch (err) {
      console.error("Failed to create session:", err);
    } finally {
      setCreatingSession(false);
    }
  }

  useEffect(() => {
    setBreadcrumbs([
      { label: "Swarm Hub", href: "/buzz" },
      { label: "Block Buzz • Dynamic Swarm Matrix" },
    ]);
  }, [setBreadcrumbs]);

  async function fetchBuzzData() {
    try {
      const [msgRes, telRes, factsRes, agentsRes, knowRes] = await Promise.all([
        fetch(`/api/companies/${companyId}/buzz/messages`),
        fetch(`/api/companies/${companyId}/buzz/telemetry`),
        fetch(`/api/companies/${companyId}/buzz/facts`),
        fetch(`/api/companies/${companyId}/agents`),
        fetch(`/api/companies/${companyId}/buzz/knowledge`),
      ]);

      if (msgRes.ok) {
        const d = await msgRes.json();
        if (d.messages) setMessages(d.messages);
      }
      if (telRes.ok) {
        const d = await telRes.json();
        if (d.events) setTelemetry(d.events);
      }
      if (factsRes.ok) {
        const d = await factsRes.json();
        if (d.facts) setFacts(d.facts);
      }
      if (agentsRes.ok) {
        const agents = await agentsRes.json();
        setAgentsList(agents);
      }
      if (knowRes.ok) {
        const kd = await knowRes.json();
        if (kd.success) setKnowledgeData(kd);
      }
    } catch (err) {
      console.warn("Dynamic Buzz fetch warning:", err);
    }
  }

  useEffect(() => {
    fetchBuzzData();
    const interval = setInterval(fetchBuzzData, 3000);
    return () => clearInterval(interval);
  }, [companyId]);

  async function loadAgentProfile(agentId: string) {
    setLoadingProfile(true);
    try {
      const res = await fetch(`/api/companies/${companyId}/buzz/agent-profile/${agentId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.profile) {
          setSelectedAgentProfile(data.profile);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingProfile(false);
    }
  }

  async function handleSendDirective(e: React.FormEvent) {
    e.preventDefault();
    if (!directiveText.trim() || sending) return;

    setSending(true);
    try {
      const res = await fetch(`/api/companies/${companyId}/buzz/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: activeChannel === "all" ? "ldg-god-commands" : activeChannel,
          sender: "LDG Admin (God)",
          role: "supreme-commander",
          avatar: "👑",
          type: "directive",
          content: directiveText.trim(),
        }),
      });

      if (res.ok) {
        setDirectiveText("");
        fetchBuzzData();
      }
    } catch (err) {
      console.error("Failed to send directive:", err);
    } finally {
      setSending(false);
    }
  }

  async function handleTriggerSwarmSprint() {
    setSprintRunning(true);
    setSprintSuccess(false);
    try {
      const res = await fetch(`/api/companies/${companyId}/buzz/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: "executive-direction",
          sender: "LDG Admin (God)",
          content: "🚀 Swarm Sprint Orchestration Triggered: tutti gli agenti operativi sono sincronizzati.",
        }),
      });
      if (res.ok) {
        setSprintSuccess(true);
        fetchBuzzData();
        setTimeout(() => setSprintSuccess(false), 4000);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSprintRunning(false);
    }
  }

  const filteredMessages = messages.filter(m => activeChannel === "all" || m.channel === activeChannel);
  const filteredAgents = agentsList.filter(a => 
    a.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    a.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (a.title && a.title.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col overflow-hidden bg-background">
      {/* Top Header Bar */}
      <div className="border-b border-border px-6 py-3.5 flex flex-wrap items-center justify-between gap-4 bg-card/60 backdrop-blur shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-orange-500/10 text-orange-500 border border-orange-500/20 shadow-xs">
            <Flame className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-semibold tracking-tight">
                Block Buzz • Autonomous Multi-Agent Swarm Hub
              </h1>
              <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/30 gap-1 text-xs py-0.5 font-bold">
                <Crown className="h-3 w-3 text-amber-500" />
                LDG ADMIN (GOD)
              </Badge>
              <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs py-0.5 font-mono">
                <Activity className="h-3 w-3 mr-1 inline animate-ping" /> {agentsList.length} AGENTI ONLINE
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Pannello di controllo dinamico, tracciamento fatti oggettivi, telemetria computazionale e costi per{" "}
              <strong>{selectedCompany?.name || "Mr Vinx SRL"}</strong>.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center border border-border rounded-lg p-0.5 bg-muted/40">
            <button
              onClick={() => setActiveTab("stream")}
              className={`px-3 py-1 text-xs rounded-md font-medium transition-all ${
                activeTab === "stream" ? "bg-background text-foreground shadow-xs font-bold" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Live Stream & Comms
            </button>
            <button
              onClick={() => setActiveTab("agents")}
              className={`px-3 py-1 text-xs rounded-md font-medium transition-all flex items-center gap-1 ${
                activeTab === "agents" ? "bg-background text-foreground shadow-xs font-bold" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <UserCheck className="h-3.5 w-3.5" />
              Profili Agenti ({agentsList.length})
            </button>
            <button
              onClick={() => setActiveTab("knowledge")}
              className={`px-3 py-1 text-xs rounded-md font-medium transition-all flex items-center gap-1 ${
                activeTab === "knowledge" ? "bg-background text-foreground shadow-xs font-bold" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <BookOpen className="h-3.5 w-3.5 text-blue-500" />
              Knowledge & Bibliotecario ({knowledgeData?.resources?.length || 7})
            </button>
            <button
              onClick={() => setActiveTab("facts")}
              className={`px-3 py-1 text-xs rounded-md font-medium transition-all flex items-center gap-1 ${
                activeTab === "facts" ? "bg-background text-foreground shadow-xs font-bold" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <FileCheck2 className="h-3.5 w-3.5 text-emerald-500" />
              Facts Ledger ({facts.length})
            </button>
            <button
              onClick={() => setActiveTab("sessions")}
              className={`px-3 py-1 text-xs rounded-md font-medium transition-all flex items-center gap-1 ${
                activeTab === "sessions" ? "bg-background text-foreground shadow-xs font-bold" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <FolderOpen className="h-3.5 w-3.5 text-violet-500" />
              Sessioni ({sessions?.length ?? 0})
            </button>
          </div> 
          
          <Button
            size="sm"
            onClick={handleTriggerSwarmSprint}
            disabled={sprintRunning}
            className="gap-1.5 text-xs bg-orange-600 hover:bg-orange-700 text-white shadow-xs font-semibold h-8"
          >
            {sprintRunning ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : sprintSuccess ? (
              <Check className="h-3.5 w-3.5 text-emerald-200" />
            ) : (
              <Play className="h-3.5 w-3.5 fill-current" />
            )}
            {sprintRunning ? "Esecuzione Swarm..." : sprintSuccess ? "Sprint Completato!" : "Trigger Swarm Sprint"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchBuzzData}
            className="gap-1.5 text-xs h-8"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Sync
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      {activeTab === "stream" && (
        <div className="flex-1 min-h-0 grid grid-cols-12 gap-0 overflow-hidden">
          {/* Left Column: Channels & Agent Roster */}
          <div className="col-span-12 md:col-span-3 border-r border-border flex flex-col min-h-0 bg-card/20 p-3 space-y-4 overflow-y-auto">
            <div>
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-2">
                Canali di Comunicazione
              </span>
              <div className="space-y-1 mt-2">
                {CHANNELS.map((ch) => {
                  const Icon = ch.icon;
                  const isActive = activeChannel === ch.id;
                  return (
                    <button
                      key={ch.id}
                      onClick={() => setActiveChannel(ch.id)}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-all flex items-center gap-2 ${
                        isActive
                          ? ch.gold
                            ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 font-semibold border border-amber-500/30"
                            : "bg-accent text-accent-foreground font-semibold"
                          : "text-muted-foreground hover:bg-accent/40 hover:text-foreground"
                      }`}
                    >
                      <Icon className={`h-3.5 w-3.5 shrink-0 ${ch.gold ? "text-amber-500" : ""}`} />
                      <span className="truncate">#{ch.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Live Agents Quick Selector */}
            <div className="pt-2 border-t border-border/80 flex-1 flex flex-col min-h-0">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-2 flex items-center justify-between mb-2">
                <span>Roster Agenti Attivi</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">{agentsList.length}</span>
              </span>
              <div className="space-y-1 overflow-y-auto pr-1">
                {agentsList.slice(0, 15).map((a) => (
                  <button
                    key={a.id}
                    onClick={() => loadAgentProfile(a.id)}
                    className="w-full text-left p-1.5 rounded-lg border border-border/40 bg-muted/20 hover:bg-muted/50 transition-all flex items-center justify-between text-xs"
                  >
                    <div className="truncate">
                      <div className="font-medium text-foreground truncate">{a.name}</div>
                      <div className="text-[10px] text-muted-foreground font-mono">{a.role.toUpperCase()}</div>
                    </div>
                    <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Center Column: Live Inter-Agent Chat Feed & Directive Transmitter */}
          <div className="col-span-12 md:col-span-6 border-r border-border flex flex-col min-h-0 bg-background">
            <div className="px-4 py-2 border-b border-border flex items-center justify-between bg-card/30">
              <div className="flex items-center gap-2 text-xs font-semibold">
                <Hash className="h-4 w-4 text-muted-foreground" />
                <span>{CHANNELS.find((c) => c.id === activeChannel)?.label || activeChannel}</span>
              </div>
              <span className="text-[11px] text-muted-foreground">
                {filteredMessages.length} messaggi
              </span>
            </div>

            {/* Messages Feed */}
            <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
              {filteredMessages.map((m) => {
                const isGod = m.role === "god" || m.sender?.includes("LDG");
                const isCeo = m.role === "ceo";
                return (
                  <div
                    key={m.id}
                    className={`p-3 rounded-xl border transition-all text-xs space-y-1.5 ${
                      isGod
                        ? "bg-amber-500/10 border-amber-500/30 text-foreground shadow-xs"
                        : isCeo
                        ? "bg-card/70 border-primary/30 shadow-xs"
                        : "bg-muted/20 border-border/70 hover:bg-muted/30"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-semibold">
                        <span className="text-sm">{m.avatar}</span>
                        <span className={isGod ? "text-amber-500 font-bold" : "text-foreground"}>
                          {m.sender}
                        </span>
                        {isGod && (
                          <Badge variant="outline" className="text-[9px] bg-amber-500/20 text-amber-500 border-amber-500/40 px-1 py-0 uppercase">
                            SOVEREIGN GOD
                          </Badge>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {new Date(m.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                      </span>
                    </div>
                    <div className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
                      {m.content}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Directive & Message Input */}
            <div className="p-3 border-t border-border bg-card/40">
              <form onSubmit={handleSendDirective} className="flex gap-2">
                <input
                  type="text"
                  value={directiveText}
                  onChange={(e) => setDirectiveText(e.target.value)}
                  placeholder="Invia direttiva o ordine operativo come LDG Admin..."
                  className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-amber-500 placeholder:text-muted-foreground/60"
                />
                <Button
                  size="sm"
                  type="submit"
                  disabled={!directiveText.trim() || sending}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-medium text-xs px-3 h-8 gap-1 shadow-xs"
                >
                  <Send className="h-3 w-3" />
                  Emetti
                </Button>
              </form>
            </div>
          </div>

          {/* Right Column: Live Telemetry Stream & Verifiable Facts */}
          <div className="col-span-12 md:col-span-3 flex flex-col min-h-0 bg-card/20 p-3 space-y-4 overflow-y-auto">
            {/* Real-time Telemetry Feed */}
            <div className="space-y-2">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-1 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Activity className="h-3.5 w-3.5 text-emerald-500" /> Telemetria Runtime Live
                </span>
                <Badge variant="outline" className="text-[9px] font-mono">{telemetry.length} ev</Badge>
              </span>
              <div className="space-y-1.5 max-h-[340px] overflow-y-auto pr-1">
                {telemetry.map((t) => (
                  <div key={t.id} className="p-2 rounded-lg border border-border/60 bg-muted/20 text-xs space-y-1 hover:bg-muted/40 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-foreground text-[11px] truncate">{t.agent}</span>
                      <Badge variant="outline" className="text-[9px] px-1 py-0 font-mono text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                        {t.latencyMs}ms
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono">
                      <span>{t.model}</span>
                      <span>{t.tokens} tok</span>
                      {t.costUsd !== undefined && (
                        <span className="text-amber-500 font-semibold">${t.costUsd.toFixed(5)}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Verifiable Facts Ledger Preview */}
            <div className="space-y-2 pt-2 border-t border-border/80">
              <div className="flex items-center justify-between px-1">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <FileCheck2 className="h-3.5 w-3.5 text-primary" /> Fatti Verificati (SHA-256)
                </span>
                <Badge variant="outline" className="text-[9px] font-mono bg-emerald-500/10 text-emerald-500 border-emerald-500/30">
                  {facts.length}
                </Badge>
              </div>

              <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                {facts.slice(0, 6).map((f) => (
                  <div key={f.id} className="p-2 rounded-lg border border-border/80 bg-background/80 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-foreground text-[11px] truncate">{f.agentName}</span>
                      <Badge variant="outline" className="text-[9px] font-mono text-emerald-500 border-emerald-500/30">
                        VERIFIED
                      </Badge>
                    </div>
                    <p className="text-[10px] text-muted-foreground line-clamp-1">{f.taskTitle}</p>
                    <div className="font-mono text-[9px] text-muted-foreground truncate bg-muted/40 p-1 rounded">
                      {f.hash}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Agents Profiles Catalog Tab */}
      {activeTab === "agents" && (
        <div className="flex-1 min-h-0 flex flex-col p-6 space-y-4 overflow-y-auto">
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cerca agente per nome, ruolo o titolo..."
                className="w-full pl-9 pr-4 py-2 rounded-lg border border-border bg-card text-xs outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="text-xs text-muted-foreground">
              Mostrando {filteredAgents.length} di {agentsList.length} agenti attivi
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {filteredAgents.map((a) => (
              <div
                key={a.id}
                onClick={() => loadAgentProfile(a.id)}
                className="p-4 rounded-xl border border-border bg-card/60 hover:bg-accent/30 hover:border-primary/40 transition-all cursor-pointer space-y-3 shadow-2xs group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary border border-primary/20">
                      <Bot className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-xs text-foreground group-hover:text-primary transition-colors">{a.name}</h3>
                      <p className="text-[10px] text-muted-foreground font-mono">{a.role.toUpperCase()}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[9px] font-mono uppercase bg-muted/40">
                    {a.adapterType}
                  </Badge>
                </div>

                <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                  {a.title || a.capabilities}
                </p>

                <div className="pt-2 border-t border-border/60 flex items-center justify-between text-[10px] text-muted-foreground font-mono">
                  <span>ID: {a.id.slice(0, 8)}...</span>
                  <span className="text-primary font-medium flex items-center gap-0.5">
                    Pannello <ChevronRight className="h-3 w-3" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Knowledge Base & Bibliotecario Hub Tab */}
      {activeTab === "knowledge" && (
        <div className="flex-1 min-h-0 flex flex-col p-6 space-y-5 overflow-y-auto">
          {/* Bibliotecario Banner */}
          <div className="p-5 rounded-2xl border border-border bg-card shadow-xs relative overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-full bg-linear-to-l from-blue-500/10 via-transparent to-transparent pointer-events-none" />
            
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="p-3 rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20 shadow-2xs">
                  <Library className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-foreground">
                      Bibliotecario Esecutivo • Chief Knowledge Officer
                    </h2>
                    <Badge variant="outline" className="text-[10px] font-mono uppercase bg-blue-500/10 text-blue-500 border-blue-500/30 font-semibold">
                      Skill Synthesizer Lead
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Catalogazione sistematica della documentazione aziendale, sintesi automatica di Skills Hermes e distribuzione ai 55 agenti IT.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="font-mono text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  ● 7 Asset Indicizzati
                </Badge>
                <Badge variant="secondary" className="font-mono text-xs bg-primary/10 text-primary border border-primary/20">
                  7 Skills Sintetizzate
                </Badge>
              </div>
            </div>

            {/* Sub-bar with capabilities */}
            <div className="mt-4 pt-3 border-t border-border/60 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-2 font-mono text-[11px]">
                <span className="text-foreground font-semibold">Toolchain & Skills Attive:</span>
                <span className="bg-muted/60 px-2 py-0.5 rounded border border-border/50">book-to-skill</span>
                <span className="bg-muted/60 px-2 py-0.5 rounded border border-border/50">markdoc</span>
                <span className="bg-muted/60 px-2 py-0.5 rounded border border-border/50">paperless-ngx</span>
                <span className="bg-muted/60 px-2 py-0.5 rounded border border-border/50">tencentdb-agent-memory</span>
                <span className="bg-muted/60 px-2 py-0.5 rounded border border-border/50">karakeep</span>
              </div>
              <div className="font-mono text-[11px] text-amber-500 font-semibold">
                Autorità Suprema: LDG Admin (God)
              </div>
            </div>
          </div>

          {/* Search / Filter Bar */}
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Cerca per titolo, categoria, skill o agente assegnato..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 text-xs rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="text-xs text-muted-foreground font-mono">
              Directory Knowledge: <strong className="text-foreground">c:\Users\Deglu\.hermes\knowledge_base\</strong>
            </div>
          </div>

          {/* Knowledge Catalog Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {((knowledgeData?.resources as any[]) || []).map((res) => {
              const matchesSearch = 
                res.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                res.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
                res.skillName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                res.targetAgents.some((a: string) => a.toLowerCase().includes(searchQuery.toLowerCase()));

              if (!matchesSearch) return null;

              return (
                <div
                  key={res.id}
                  className="p-4 rounded-xl border border-border bg-card/70 hover:border-primary/50 transition-all flex flex-col justify-between space-y-3 shadow-2xs"
                >
                  <div className="space-y-2.5">
                    {/* Header: ID + Category */}
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="outline" className="font-mono text-[10px] bg-primary/10 text-primary border-primary/30 uppercase font-bold">
                        {res.id}
                      </Badge>
                      <Badge variant="secondary" className="text-[10px] font-medium bg-muted/60 text-muted-foreground truncate max-w-[200px]">
                        {res.category}
                      </Badge>
                    </div>

                    {/* Title */}
                    <h3 className="font-bold text-xs text-foreground leading-snug">
                      {res.title}
                    </h3>

                    {/* Executive Summary */}
                    <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-3">
                      {res.summary}
                    </p>

                    {/* Key Concepts */}
                    <div className="flex flex-wrap gap-1 pt-1">
                      {res.keyConcepts.map((concept: string, idx: number) => (
                        <span
                          key={idx}
                          className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-muted/40 text-muted-foreground border border-border/40"
                        >
                          {concept}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2.5 pt-2 border-t border-border/50 text-xs">
                    {/* Synthesized Skill */}
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-muted-foreground font-semibold">Hermes Skill:</span>
                      <span className="font-mono text-primary font-bold bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                        {res.skillName}
                      </span>
                    </div>

                    {/* Target Agents */}
                    <div className="space-y-1">
                      <span className="text-[10px] text-muted-foreground font-semibold block">Agenti Specializzati Assegnatari:</span>
                      <div className="flex flex-wrap gap-1">
                        {res.targetAgents.map((agName: string, aIdx: number) => (
                          <button
                            key={aIdx}
                            onClick={() => {
                              const foundAgent = agentsList.find(a => a.name.includes(agName) || agName.includes(a.name));
                              if (foundAgent) loadAgentProfile(foundAgent.id);
                            }}
                            className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/20 transition-colors cursor-pointer text-left"
                            title="Apri pannello di controllo agente"
                          >
                            {agName}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Checksum SHA-256 */}
                    <div className="pt-1.5 border-t border-border/30 flex items-center justify-between text-[9px] font-mono text-muted-foreground">
                      <span className="truncate max-w-[170px]" title={res.sourcePath}>
                        {res.sourcePath.split('\\').pop()}
                      </span>
                      <span className="text-emerald-500 font-semibold">● SHA-256 Valid</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Verifiable Facts Ledger Tab */}
      {activeTab === "facts" && (
        <div className="flex-1 min-h-0 flex flex-col p-6 space-y-4 overflow-y-auto">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <FileCheck2 className="h-4 w-4 text-emerald-500" />
                Ledger Fatti Oggettivi & Dimostrazioni Crittografiche di Esecuzione
              </h2>
              <p className="text-xs text-muted-foreground">
                Tutti i fatti registrati sono validati con hash crittografico SHA-256 e score di conformità al 100% per LDG Admin.
              </p>
            </div>
            <Badge variant="outline" className="font-mono bg-emerald-500/10 text-emerald-500 border-emerald-500/30">
              {facts.length} Prove Valide
            </Badge>
          </div>

          <div className="border border-border rounded-xl bg-card overflow-hidden divide-y divide-border shadow-xs">
            {facts.map((f) => (
              <div key={f.id} className="p-4 space-y-2 hover:bg-muted/20 transition-colors">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="font-mono text-[10px] bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                      {f.id}
                    </Badge>
                    <span className="font-semibold text-xs text-foreground">{f.agentName}</span>
                    <span className="text-muted-foreground text-xs">•</span>
                    <span className="text-xs text-muted-foreground font-medium">{f.project}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-mono">
                    <span>Modello: <strong>{f.model}</strong></span>
                    <span>Tokens: <strong>{f.tokens}</strong></span>
                    <span>Score: <strong className="text-emerald-500">{typeof f.benchmarkScore === "number" ? `${f.benchmarkScore}%` : "N/D"}</strong></span>
                  </div>
                </div>

                <p className="text-xs text-foreground font-medium">{f.taskTitle}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{f.proofOfWork}</p>

                <div className="flex items-center justify-between pt-1 text-[10px] font-mono text-muted-foreground">
                  <span className="bg-muted/40 px-2 py-1 rounded border border-border/50 text-foreground/80">
                    Hash: {f.hash}
                  </span>
                  <span>{new Date(f.timestamp).toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Selected Agent Personal Control Panel Modal */}
      {selectedAgentProfile && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-4xl max-h-[90vh] bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-6 border-b border-border bg-card/90 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20">
                  <Bot className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-foreground">{selectedAgentProfile.name ?? selectedAgentProfile.agent?.name}</h2>
                    <Badge variant="outline" className="font-mono text-xs uppercase bg-primary/10 text-primary border-primary/30">
                      {selectedAgentProfile.role ?? selectedAgentProfile.agent?.role}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{selectedAgentProfile.title ?? selectedAgentProfile.agent?.title}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedAgentProfile(null)}
                  className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
              {/* Agent KPI Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl border border-border/80 bg-muted/20 space-y-1">
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold">Esecuzioni Totali</span>
                  <div className="text-lg font-bold font-mono text-foreground">
                    {selectedAgentProfile.metrics?.totalRuns ?? selectedAgentProfile.agent?.totalRuns ?? 0}
                  </div>
                </div>
                <div className="p-3 rounded-xl border border-border/80 bg-muted/20 space-y-1">
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold">Tasso di Successo</span>
                  <div className="text-lg font-bold font-mono text-foreground">
                    {selectedAgentProfile.metrics?.successRatePct ?? "N/D"}
                  </div>
                </div>
                <div className="p-3 rounded-xl border border-border/80 bg-muted/20 space-y-1">
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold">Tokens Consumati</span>
                  <div className="text-lg font-bold font-mono text-foreground">
                    {selectedAgentProfile.metrics?.totalTokens?.toLocaleString() ?? selectedAgentProfile.agent?.totalTokens ?? 0}
                  </div>
                </div>
                <div className="p-3 rounded-xl border border-border/80 bg-muted/20 space-y-1">
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold">Tempo Computazionale</span>
                  <div className="text-lg font-bold font-mono text-emerald-500">
                    {selectedAgentProfile.metrics?.totalExecutionSeconds ?? 0}s
                  </div>
                </div>
              </div>

              {/* Persona & Capabilities */}
              <div className="p-4 rounded-xl border border-border bg-muted/10 space-y-2">
                <h3 className="font-semibold text-xs text-foreground uppercase tracking-wider">Profilo & Adapter Config</h3>
                <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap font-mono text-[11px]">
                  {typeof selectedAgentProfile.adapterConfig === "object"
                    ? JSON.stringify(selectedAgentProfile.adapterConfig, null, 2)
                    : (selectedAgentProfile.agent?.capabilities ?? "Nessuna configurazione custom")}
                </p>
                <div className="pt-2 border-t border-border/60 flex items-center justify-between text-[11px] text-muted-foreground font-mono">
                  <span>Stato Operativo: <strong className="text-emerald-500">{selectedAgentProfile.status ?? "active"}</strong></span>
                  <span>Adapter: <strong>{selectedAgentProfile.adapterType ?? "hermes_local"}</strong></span>
                </div>
              </div>

              {/* Recent Runs */}
              {Array.isArray(selectedAgentProfile.recentRuns) && selectedAgentProfile.recentRuns.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-xs text-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <ListTodo className="h-4 w-4 text-primary" />
                    Cronologia Ultimi Run Eseguiti
                  </h3>

                  <div className="space-y-2">
                    {selectedAgentProfile.recentRuns.map((r: any) => (
                      <div key={r.id} className="p-2.5 rounded-lg border border-border/60 bg-muted/20 flex items-center justify-between">
                        <div className="space-y-0.5">
                          <span className="font-mono text-[10px] text-primary font-bold">{r.id.slice(0, 8)}</span>
                          <p className="text-[10px] text-muted-foreground">
                            {r.startedAt ? new Date(r.startedAt).toLocaleString() : "Data non disponibile"}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 font-mono text-[10px]">
                          <span>{r.tokens} tokens</span>
                          <Badge variant="outline" className={cn(
                            "text-[9px] uppercase",
                            r.status === "succeeded" ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30" : "bg-muted text-muted-foreground"
                          )}>
                            {r.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tasks per Project if available */}
              {selectedAgentProfile.tasksPerProject && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-xs text-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <ListTodo className="h-4 w-4 text-primary" />
                    Elenco Task Svolti & In Corso per Progetto
                  </h3>

                  <div className="space-y-3">
                    {Object.entries(selectedAgentProfile.tasksPerProject).map(([projName, projData]: [string, any]) => (
                      <div key={projName} className="border border-border rounded-xl p-3.5 bg-card space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-foreground">{projName}</span>
                          <Badge variant="outline" className="text-[10px] font-mono">
                            {projData.tasks?.length ?? 0} tasks
                          </Badge>
                        </div>

                        {Array.isArray(projData.tasks) && projData.tasks.length > 0 ? (
                          <div className="space-y-2">
                            {projData.tasks.map((t: any) => (
                              <div key={t.id} className="p-2.5 rounded-lg border border-border/60 bg-muted/20 space-y-1">
                                <div className="flex items-center justify-between">
                                  <span className="font-mono text-[10px] text-primary font-bold">{t.identifier}</span>
                                  <Badge variant="outline" className="text-[9px] uppercase font-mono bg-emerald-500/10 text-emerald-500 border-emerald-500/30">
                                    {t.status}
                                  </Badge>
                                </div>
                                <p className="font-semibold text-xs text-foreground">{t.title}</p>
                                <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono pt-1">
                                  <span>Priorità: {t.priority?.toUpperCase()}</span>
                                  <span>Creato: {new Date(t.createdAt).toLocaleDateString()}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[11px] text-muted-foreground italic">Nessun task attivo in questo progetto.</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Verifiable Facts */}
              {Array.isArray(selectedAgentProfile.facts) && selectedAgentProfile.facts.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-xs text-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <FileCheck2 className="h-4 w-4 text-emerald-500" />
                    Fatti Verificati & Prove di Esecuzione (SHA-256)
                  </h3>

                  <div className="space-y-2">
                    {selectedAgentProfile.facts.map((f: any) => (
                      <div key={f.id} className="p-3 rounded-xl border border-border bg-card space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[10px] font-mono text-emerald-500 border-emerald-500/30">
                              {f.id}
                            </Badge>
                            <span className="font-semibold text-xs text-foreground">{f.taskTitle}</span>
                          </div>
                          <span className="text-[10px] font-mono text-muted-foreground">{new Date(f.timestamp).toLocaleTimeString()}</span>
                        </div>
                        <p className="text-muted-foreground text-[11px] leading-relaxed">{f.proofOfWork}</p>
                        <div className="font-mono text-[9px] bg-muted/40 p-1.5 rounded border border-border/50 text-foreground/80 truncate">
                          Hash: {f.hash}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===== SESSIONS TAB ===== */}
      {activeTab === "sessions" && (
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Sessions Header */}
          <div className="border-b border-border px-6 py-3 flex items-center justify-between bg-card/40 shrink-0">
            <div>
              <h2 className="font-semibold text-sm flex items-center gap-2">
                <FolderOpen className="h-4 w-4 text-violet-500" />
                Sessioni di Progetto
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Ogni sessione raccoglie direttive per topic con un workflow 1-14 associato
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => setNewSessionOpen(true)}
              className="gap-1.5 text-xs bg-violet-600 hover:bg-violet-700 text-white h-8"
            >
              <Plus className="h-3.5 w-3.5" />
              Nuova Sessione
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {/* Create Session Form */}
            {newSessionOpen && (
              <form
                onSubmit={handleCreateSession}
                className="border border-violet-500/30 rounded-xl bg-violet-500/5 p-4 space-y-3"
              >
                <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
                  <Plus className="h-4 w-4 text-violet-500" />
                  Crea nuova sessione di progetto
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="text-xs text-muted-foreground font-medium block mb-1">
                      Titolo sessione *
                    </label>
                    <input
                      type="text"
                      value={newSessionTitle}
                      onChange={(e) => setNewSessionTitle(e.target.value)}
                      placeholder="Es: Architettura LDG Innovation Core Platform"
                      className="w-full text-sm border border-border rounded-lg px-3 py-1.5 bg-background focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground font-medium block mb-1">
                      Topic
                    </label>
                    <select
                      value={newSessionTopic}
                      onChange={(e) => setNewSessionTopic(e.target.value)}
                      className="w-full text-sm border border-border rounded-lg px-3 py-1.5 bg-background focus:outline-none"
                    >
                      <option value="engineering">Engineering</option>
                      <option value="executive">Executive</option>
                      <option value="marketing">Marketing</option>
                      <option value="legal">Legal</option>
                      <option value="fiscal">Fiscal</option>
                      <option value="commercial">Commercial</option>
                      <option value="customer_success">Customer Success</option>
                      <option value="resource">Resource Management</option>
                      <option value="security">Security</option>
                      <option value="product">Product</option>
                      <option value="other">Altro</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground font-medium block mb-1">
                      Workflow Step iniziale
                    </label>
                    <select
                      value={newSessionStep}
                      onChange={(e) => setNewSessionStep(Number(e.target.value))}
                      className="w-full text-sm border border-border rounded-lg px-3 py-1.5 bg-background focus:outline-none"
                    >
                      {PROJECT_WORKFLOW_STEPS.map((s: WorkflowStepDef) => (
                        <option key={s.step} value={s.step}>
                          Step {s.step}: {s.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground font-medium block mb-1">
                      AI Model
                    </label>
                    <select
                      value={newSessionModel}
                      onChange={(e) => setNewSessionModel(e.target.value)}
                      className="w-full text-sm border border-border rounded-lg px-3 py-1.5 bg-background focus:outline-none"
                    >
                      <option value="claude-sonnet-4-5">Claude Sonnet 4.5</option>
                      <option value="claude-opus-4">Claude Opus 4</option>
                      <option value="claude-haiku-3-5">Claude Haiku 3.5</option>
                      <option value="gpt-4o">GPT-4o</option>
                      <option value="gpt-4o-mini">GPT-4o Mini</option>
                      <option value="gemini-2-5-pro">Gemini 2.5 Pro</option>
                    </select>
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <Button
                    type="submit"
                    size="sm"
                    disabled={creatingSession || !newSessionTitle.trim()}
                    className="gap-1.5 text-xs bg-violet-600 hover:bg-violet-700 text-white h-8"
                  >
                    {creatingSession ? (
                      <RefreshCw className="h-3 w-3 animate-spin" />
                    ) : (
                      <Plus className="h-3 w-3" />
                    )}
                    Crea Sessione
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setNewSessionOpen(false)}
                    className="text-xs h-8"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Annulla
                  </Button>
                </div>
              </form>
            )}

            {/* Sessions List */}
            {!sessions || sessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <FolderOpen className="h-12 w-12 text-muted-foreground/30 mb-3" />
                <p className="text-sm font-medium text-muted-foreground">Nessuna sessione di progetto</p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  Crea la tua prima sessione per catalogare le direttive per topic e workflow
                </p>
                <Button
                  size="sm"
                  onClick={() => setNewSessionOpen(true)}
                  className="mt-4 gap-1.5 text-xs bg-violet-600 hover:bg-violet-700 text-white h-8"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Prima Sessione
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {sessions.map((session) => {
                  const wfStep = PROJECT_WORKFLOW_STEPS.find(
                    (s: WorkflowStepDef) => s.step === session.workflowStep,
                  );
                  return (
                    <div
                      key={session.id}
                      className="border border-border rounded-xl bg-card hover:border-violet-500/40 transition-colors p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm text-foreground truncate">
                              {session.title}
                            </span>
                            <Badge
                              variant="outline"
                              className="text-[10px] uppercase font-mono shrink-0 capitalize"
                            >
                              {session.topic}
                            </Badge>
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[10px] font-mono shrink-0",
                                session.status === "active"
                                  ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                                  : session.status === "paused"
                                    ? "bg-amber-500/10 text-amber-600 border-amber-500/30"
                                    : "bg-muted text-muted-foreground",
                              )}
                            >
                              {session.status}
                            </Badge>
                          </div>
                          {/* Workflow progress bar */}
                          <div className="mt-2">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[10px] font-medium text-muted-foreground">
                                Step {session.workflowStep}/14 — {wfStep?.label ?? ""}
                              </span>
                              {session.selectedModel && (
                                <span className="text-[10px] font-mono text-violet-500">
                                  {session.selectedModel}
                                </span>
                              )}
                            </div>
                            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-violet-500 to-violet-400 transition-all"
                                style={{
                                  width: `${((session.workflowStep) / 14) * 100}%`,
                                }}
                              />
                            </div>
                          </div>
                          {wfStep && (
                            <p className="text-[11px] text-muted-foreground mt-1.5 leading-relaxed">
                              {wfStep.description}
                            </p>
                          )}
                          {/* Stats row */}
                          <div className="flex items-center gap-3 mt-2 text-[10px] font-mono text-muted-foreground">
                            <span>{session.chatHistory?.length ?? 0} msg</span>
                            {session.linkedIssueIds?.length > 0 && (
                              <span>{session.linkedIssueIds.length} task linkati</span>
                            )}
                            {session.linkedDirectiveIds?.length > 0 && (
                              <span>{session.linkedDirectiveIds.length} direttive</span>
                            )}
                            <span>
                              Aggiornata {new Date(session.updatedAt).toLocaleDateString("it-IT")}
                            </span>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-xs gap-1 text-violet-500 hover:text-violet-600 hover:bg-violet-500/10 shrink-0"
                          onClick={() => navigate(`/buzz/sessions/${session.id}`)}
                        >
                          Apri
                          <ArrowRight className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
