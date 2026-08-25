import { useState } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  Plus,
  Search,
  CheckCircle2,
  Coins,
  Bot,
  ArrowUpRight,
  Ban,
  Activity,
  BarChart3,
  Zap,
  Network,
  GitBranch,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Link } from "@/lib/router";
import { useCompany } from "@/context/CompanyContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { directivesApi } from "@/api/directives";
import { agentsApi } from "@/api/agents";
import { useToastActions } from "@/context/ToastContext";
import { cn } from "@/lib/utils";
import type { DirectiveStatus, DirectivePriority, DirectiveScope } from "@paperclipai/shared";

type ViewTab = "list" | "analytics" | "feed";

const EVENT_TYPE_LABELS: Record<string, string> = {
  run_authorized: "Esecuzione Autorizzata",
  run_blocked: "Esecuzione Bloccata",
  action_executed: "Azione Eseguita",
  directive_certified: "Direttiva Certificata",
  directive_modified: "Direttiva Modificata",
  directive_revoked: "Direttiva Revocata",
};

const EVENT_TYPE_COLORS: Record<string, string> = {
  run_authorized: "text-emerald-500",
  run_blocked: "text-destructive",
  action_executed: "text-blue-500",
  directive_certified: "text-emerald-600",
  directive_modified: "text-amber-500",
  directive_revoked: "text-destructive",
};

const EVENT_TYPE_DOT: Record<string, string> = {
  run_authorized: "bg-emerald-500",
  run_blocked: "bg-destructive",
  action_executed: "bg-blue-500",
  directive_certified: "bg-emerald-600",
  directive_modified: "bg-amber-500",
  directive_revoked: "bg-destructive",
};

export function Directives() {
  const { selectedCompanyId } = useCompany();
  const { addToast } = useToastActions();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<ViewTab>("list");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<DirectivePriority>("high");
  const [scope, setScope] = useState<DirectiveScope>("global");
  const [targetAgentIds, setTargetAgentIds] = useState<string[]>([]);
  const [budgetLimitUsd, setBudgetLimitUsd] = useState("100.00");
  const [maxRunsAllowed, setMaxRunsAllowed] = useState(50);
  const [rawInstructions, setRawInstructions] = useState("");
  const [certifiedImmediately, setCertifiedImmediately] = useState(true);

  const { data: directives = [], isLoading } = useQuery({
    queryKey: ["directives", selectedCompanyId, statusFilter, searchQuery],
    queryFn: () =>
      directivesApi.list(selectedCompanyId!, {
        status: statusFilter === "all" ? undefined : (statusFilter as DirectiveStatus),
        search: searchQuery || undefined,
      }),
    enabled: !!selectedCompanyId,
  });

  const { data: stats } = useQuery({
    queryKey: ["directives-stats", selectedCompanyId],
    queryFn: () => directivesApi.getStats(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ["directives-analytics", selectedCompanyId],
    queryFn: () => directivesApi.getAnalytics(selectedCompanyId!),
    enabled: !!selectedCompanyId && activeTab === "analytics",
    refetchInterval: 30_000,
  });

  const { data: lineageFeed = [], isLoading: feedLoading } = useQuery({
    queryKey: ["directives-lineage-feed", selectedCompanyId],
    queryFn: () => directivesApi.getLineageFeed(selectedCompanyId!, 100),
    enabled: !!selectedCompanyId && activeTab === "feed",
    refetchInterval: 10_000,
  });

  const { data: companyAgents = [] } = useQuery({
    queryKey: ["agents", selectedCompanyId],
    queryFn: () => agentsApi.list(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!title.trim() || !rawInstructions.trim()) return;
      return directivesApi.create(selectedCompanyId!, {
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        scope,
        targetAgentIds,
        budgetLimitUsd,
        maxRunsAllowed,
        rawInstructions: rawInstructions.trim(),
        certifiedImmediately,
      });
    },
    onSuccess: () => {
      addToast({
        type: "success",
        title: certifiedImmediately ? "Direttiva Certificata & Attivata" : "Bozza Creata",
        message: "La direttiva Ã¨ stata registrata nel sistema di governance.",
      });
      setCreateDialogOpen(false);
      setTitle(""); setDescription(""); setRawInstructions("");
      void queryClient.invalidateQueries({ queryKey: ["directives", selectedCompanyId] });
      void queryClient.invalidateQueries({ queryKey: ["directives-stats", selectedCompanyId] });
    },
    onError: (err: any) => {
      addToast({ type: "danger", title: "Errore", message: err?.message || "Impossibile creare la direttiva." });
    },
  });

  const certifyMutation = useMutation({
    mutationFn: (id: string) => directivesApi.certify(id),
    onSuccess: () => {
      addToast({ type: "success", title: "Direttiva Certificata", message: "Attiva e autorizzata." });
      void queryClient.invalidateQueries({ queryKey: ["directives", selectedCompanyId] });
      void queryClient.invalidateQueries({ queryKey: ["directives-stats", selectedCompanyId] });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: (id: string) => directivesApi.revoke(id, "Revocata dall'operatore"),
    onSuccess: () => {
      addToast({ type: "warning", title: "Direttiva Revocata", message: "Disattivata." });
      void queryClient.invalidateQueries({ queryKey: ["directives", selectedCompanyId] });
      void queryClient.invalidateQueries({ queryKey: ["directives-stats", selectedCompanyId] });
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active": return "bg-emerald-500/10 text-emerald-600 border-emerald-500/30 dark:text-emerald-400";
      case "draft": return "bg-amber-500/10 text-amber-600 border-amber-500/30 dark:text-amber-400";
      case "revoked": return "bg-destructive/10 text-destructive border-destructive/30";
      case "completed": return "bg-blue-500/10 text-blue-600 border-blue-500/30 dark:text-blue-400";
      default: return "bg-muted text-muted-foreground border-border";
    }
  };

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case "critical": return "bg-red-500/10 text-red-600 font-bold border-red-500/30";
      case "high": return "bg-orange-500/10 text-orange-600 border-orange-500/30";
      case "medium": return "bg-blue-500/10 text-blue-600 border-blue-500/30";
      default: return "bg-muted text-muted-foreground border-border";
    }
  };

  // Build per-directive event breakdown from analytics
  const directiveBreakdownMap = new Map<string, {
    id: string; identifier: string; title: string; status: string; priority: string;
    authorized: number; blocked: number; modified: number; totalCost: number;
  }>();
  for (const row of (analytics?.eventBreakdown ?? [])) {
    if (!directiveBreakdownMap.has(row.directive_id)) {
      directiveBreakdownMap.set(row.directive_id, {
        id: row.directive_id, identifier: row.identifier, title: row.directive_title,
        status: row.status, priority: row.priority,
        authorized: 0, blocked: 0, modified: 0, totalCost: 0,
      });
    }
    const e = directiveBreakdownMap.get(row.directive_id)!;
    const n = parseInt(row.event_count) || 0;
    if (row.event_type === "run_authorized") { e.authorized += n; e.totalCost += parseFloat(row.total_cost_usd) || 0; }
    if (row.event_type === "run_blocked") e.blocked += n;
    if (row.event_type === "directive_modified") e.modified += n;
  }
  const directiveBreakdowns = Array.from(directiveBreakdownMap.values()).sort((a, b) => b.authorized - a.authorized);

  return (
    <div className="flex-1 space-y-5 p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-xs">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-bold text-xl text-foreground">Direttive &amp; Governance Swarm</h1>
            <p className="text-xs text-muted-foreground">Control plane autorizzativo per l'attivazione e il tracciamento capillare di tutti gli agenti AI.</p>
          </div>
        </div>
        <Button size="sm" className="gap-1.5 shadow-sm" onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4" />Nuova Direttiva
        </Button>
      </div>

      {/* KPI Metrics */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border/80 bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
            <span>Direttive Attive</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-bold text-foreground">{stats?.activeDirectives ?? 0}</span>
            <span className="text-2xs text-muted-foreground">/ {stats?.totalDirectives ?? 0} totali</span>
          </div>
          <span className="mt-1 block text-2xs text-emerald-600 dark:text-emerald-400 font-medium">
            {stats?.draftDirectives ?? 0} bozze Â· {stats?.revokedDirectives ?? 0} revocate
          </span>
        </div>

        <div className="rounded-xl border border-border/80 bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
            <span>Agenti Governati</span>
            <Bot className="h-4 w-4 text-blue-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-bold text-foreground">{stats?.governedAgentsCount ?? companyAgents.length}</span>
            <span className="text-2xs text-muted-foreground">nodi swarm</span>
          </div>
          <span className="mt-1 block text-2xs text-muted-foreground font-medium">Nessuna attivazione autonoma</span>
        </div>

        <div className="rounded-xl border border-border/80 bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
            <span>Budget Impegnato</span>
            <Coins className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-bold text-foreground">${(stats?.totalSpentBudgetUsd ?? 0).toFixed(2)}</span>
            <span className="text-2xs text-muted-foreground">/ ${(stats?.totalBudgetLimitUsd ?? 0).toFixed(2)}</span>
          </div>
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-amber-500 transition-all" style={{ width: `${Math.min(100, ((stats?.totalSpentBudgetUsd ?? 0) / Math.max(1, stats?.totalBudgetLimitUsd ?? 100)) * 100)}%` }} />
          </div>
        </div>

        <div className="rounded-xl border border-border/80 bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
            <span>Runs Auth vs Bloccati</span>
            <Activity className="h-4 w-4 text-purple-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-bold text-foreground">{stats?.totalRunsAuthorized ?? 0}</span>
            <span className="text-2xs text-destructive font-semibold">({stats?.totalRunsBlocked ?? 0} bloccati)</span>
          </div>
          <span className="mt-1 block text-2xs text-muted-foreground font-medium">Tracciamento lineage continuo</span>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex items-center gap-1 rounded-xl border border-border/70 bg-card p-1 shadow-xs w-fit">
        {([
          { id: "list" as const, label: "Direttive", icon: ShieldCheck },
          { id: "analytics" as const, label: "Analytics & Lineage", icon: BarChart3 },
          { id: "feed" as const, label: "Feed Esecuzioni", icon: Zap },
        ]).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
              activeTab === id ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="h-3.5 w-3.5" />{label}
          </button>
        ))}
      </div>

      {/* â”€â”€ LIST TAB â”€â”€ */}
      {activeTab === "list" && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/70 bg-card p-3 shadow-xs">
            <div className="flex flex-wrap items-center gap-2">
              {["all", "active", "draft", "completed", "revoked"].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                    statusFilter === st ? "bg-primary text-primary-foreground shadow-xs" : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  {st === "all" ? "Tutte" : st === "active" ? "Attive" : st === "draft" ? "Bozze" : st === "completed" ? "Completate" : "Revocate"}
                </button>
              ))}
            </div>
            <div className="relative min-w-48">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Cerca direttiva..." className="h-8 pl-8 text-xs bg-background" />
            </div>
          </div>

          {isLoading ? (
            <div className="flex h-40 items-center justify-center text-xs text-muted-foreground">Caricamento...</div>
          ) : directives.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/80 p-8 text-center">
              <ShieldAlert className="h-8 w-8 text-muted-foreground mb-2" />
              <h3 className="font-semibold text-sm text-foreground">Nessuna Direttiva Trovata</h3>
              <p className="text-xs text-muted-foreground max-w-sm mt-1 mb-4">Crea la tua prima direttiva certificata per autorizzare le esecuzioni dello swarm.</p>
              <Button size="sm" onClick={() => setCreateDialogOpen(true)}><Plus className="h-3.5 w-3.5 mr-1" />Crea Direttiva</Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {directives.map((dir) => (
                <div key={dir.id} className="group flex flex-col justify-between rounded-xl border border-border/80 bg-card p-4 hover:border-primary/40 transition-all shadow-xs">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono font-bold text-xs text-primary bg-primary/10 px-2 py-0.5 rounded">{dir.identifier}</span>
                        <Link to={`/directives/${dir.id}`} className="font-semibold text-sm text-foreground hover:text-primary transition-colors truncate">{dir.title}</Link>
                        <span className={cn("rounded border px-2 py-0.5 text-2xs font-medium uppercase tracking-wider", getStatusBadge(dir.status))}>{dir.status}</span>
                        <span className={cn("rounded border px-1.5 py-0.5 text-2xs font-medium capitalize", getPriorityBadge(dir.priority))}>{dir.priority}</span>
                      </div>
                      {dir.description && <p className="text-xs text-muted-foreground line-clamp-1">{dir.description}</p>}
                      <div className="rounded-md bg-muted/40 p-2 text-2xs font-mono text-muted-foreground line-clamp-2 mt-2">{dir.rawInstructions}</div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {dir.status === "draft" && (
                        <Button size="sm" className="h-8 gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white" disabled={certifyMutation.isPending} onClick={() => certifyMutation.mutate(dir.id)}>
                          <CheckCircle2 className="h-3.5 w-3.5" />Certifica
                        </Button>
                      )}
                      {dir.status === "active" && (
                        <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs border-destructive/40 text-destructive hover:bg-destructive/10" disabled={revokeMutation.isPending} onClick={() => revokeMutation.mutate(dir.id)}>
                          <Ban className="h-3.5 w-3.5" />Revoca
                        </Button>
                      )}
                      <Link to={`/directives/${dir.id}`} className="inline-flex h-8 items-center gap-1 rounded-md border border-border bg-background px-2.5 text-xs font-medium text-foreground hover:bg-accent transition-colors">
                        Dettaglio &amp; Lineage<ArrowUpRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-between border-t border-border/60 pt-3 text-xs text-muted-foreground gap-3">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1 font-medium">
                        <Bot className="h-3.5 w-3.5 text-primary" />
                        {dir.targetAgents && dir.targetAgents.length > 0 ? `${dir.targetAgents.length} agenti vincolati` : "Tutti gli agenti dello Swarm"}
                      </span>
                      <span>Â·</span>
                      <span className="font-mono">{dir.executedRunsCount} runs / max {dir.maxRunsAllowed}</span>
                    </div>
                    <div className="flex items-center gap-3 font-mono text-2xs">
                      <span>Speso: <strong className="text-foreground">${dir.spentBudgetUsd}</strong> / ${dir.budgetLimitUsd}</span>
                      <span>Â·</span>
                      <span>{new Date(dir.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* â”€â”€ ANALYTICS TAB â”€â”€ */}
      {activeTab === "analytics" && (
        <div className="space-y-6">
          {analyticsLoading ? (
            <div className="flex h-40 items-center justify-center text-xs text-muted-foreground">Aggregazione analytics in corso...</div>
          ) : (
            <>
              {/* Per-Directive Breakdown */}
              <div className="rounded-xl border border-border/80 bg-card shadow-xs">
                <div className="flex items-center gap-2 border-b border-border/60 p-4">
                  <GitBranch className="h-4 w-4 text-primary" />
                  <h2 className="font-semibold text-sm text-foreground">Breakdown Esecuzioni per Direttiva</h2>
                  <span className="ml-auto text-2xs text-muted-foreground">{directiveBreakdowns.length} direttive</span>
                </div>
                {directiveBreakdowns.length === 0 ? (
                  <div className="p-8 text-center text-xs text-muted-foreground">
                    Nessun evento lineage registrato. Crea e certifica direttive per iniziare il tracciamento.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border/60 bg-muted/30">
                          <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">ID</th>
                          <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">Direttiva</th>
                          <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">Stato</th>
                          <th className="px-4 py-2.5 text-right font-semibold text-emerald-600">Auth</th>
                          <th className="px-4 py-2.5 text-right font-semibold text-destructive">Bloccati</th>
                          <th className="px-4 py-2.5 text-right font-semibold text-muted-foreground">Modifiche</th>
                          <th className="px-4 py-2.5 text-right font-semibold text-amber-600">Costo $</th>
                          <th className="px-4 py-2.5"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {directiveBreakdowns.map((d) => (
                          <tr key={d.id} className="border-b border-border/40 hover:bg-muted/20 transition-colors">
                            <td className="px-4 py-2.5"><span className="font-mono font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded text-2xs">{d.identifier}</span></td>
                            <td className="px-4 py-2.5 max-w-48">
                              <span className="font-medium text-foreground truncate block">{d.title}</span>
                              <span className="text-2xs text-muted-foreground capitalize">{d.priority}</span>
                            </td>
                            <td className="px-4 py-2.5"><span className={cn("rounded border px-1.5 py-0.5 text-2xs font-medium uppercase tracking-wider", getStatusBadge(d.status))}>{d.status}</span></td>
                            <td className="px-4 py-2.5 text-right font-mono font-bold text-emerald-600">{d.authorized}</td>
                            <td className="px-4 py-2.5 text-right font-mono font-bold text-destructive">{d.blocked}</td>
                            <td className="px-4 py-2.5 text-right font-mono text-muted-foreground">{d.modified}</td>
                            <td className="px-4 py-2.5 text-right font-mono text-amber-600">${d.totalCost.toFixed(4)}</td>
                            <td className="px-4 py-2.5 text-right">
                              <Link to={`/directives/${d.id}`} className="inline-flex items-center gap-0.5 text-2xs text-primary hover:underline">
                                Dettaglio<ArrowUpRight className="h-3 w-3" />
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Agent Activity */}
                <div className="rounded-xl border border-border/80 bg-card shadow-xs">
                  <div className="flex items-center gap-2 border-b border-border/60 p-4">
                    <Users className="h-4 w-4 text-primary" />
                    <h2 className="font-semibold text-sm text-foreground">AttivitÃ  Agenti Swarm</h2>
                  </div>
                  <div className="p-4">
                    {!analytics?.agentActivity?.length ? (
                      <p className="text-xs text-muted-foreground text-center py-4">Nessun agente ha eseguito runs sotto direttive.</p>
                    ) : (
                      <div className="space-y-3">
                        {analytics.agentActivity.map((ag) => {
                          const total = parseInt(ag.total_runs) || 0;
                          const authorized = parseInt(ag.authorized_runs) || 0;
                          const blocked = parseInt(ag.blocked_runs) || 0;
                          const pct = total > 0 ? Math.round((authorized / total) * 100) : 0;
                          return (
                            <div key={ag.agent_id} className="space-y-1">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{ag.agent_name?.[0] ?? "?"}</span>
                                  <div>
                                    <span className="font-medium text-xs text-foreground block">{ag.agent_name}</span>
                                    <span className="text-2xs text-muted-foreground capitalize">{ag.agent_role}</span>
                                  </div>
                                </div>
                                <div className="text-right font-mono text-2xs">
                                  <span className="text-emerald-600 font-bold">{authorized}</span>
                                  {blocked > 0 && <span className="text-destructive"> / {blocked}âŒ</span>}
                                  <span className="text-muted-foreground"> runs</span>
                                </div>
                              </div>
                              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                                <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Heartbeat Runs linked to Directives */}
                <div className="rounded-xl border border-border/80 bg-card shadow-xs">
                  <div className="flex items-center gap-2 border-b border-border/60 p-4">
                    <Network className="h-4 w-4 text-primary" />
                    <h2 className="font-semibold text-sm text-foreground">Heartbeat Runs Collegati</h2>
                    <span className="ml-auto text-2xs text-muted-foreground">{analytics?.heartbeatRuns?.length ?? 0} runs</span>
                  </div>
                  <div className="divide-y divide-border/50 max-h-72 overflow-y-auto">
                    {!analytics?.heartbeatRuns?.length ? (
                      <p className="p-4 text-xs text-muted-foreground text-center">Nessun run con directiveId nel metadata ancora.</p>
                    ) : (
                      analytics.heartbeatRuns.map((run) => (
                        <div key={run.id} className="flex items-center justify-between px-4 py-2.5 text-xs hover:bg-muted/20">
                          <div className="min-w-0">
                            <span className="font-medium text-foreground block truncate">{run.agent_name ?? "Agent sconosciuto"}</span>
                            <span className="font-mono text-2xs text-muted-foreground">{run.model}</span>
                          </div>
                          <div className="flex items-center gap-3 text-2xs font-mono shrink-0">
                            <span className={cn("rounded px-1.5 py-0.5 font-medium", run.status === "success" ? "bg-emerald-500/10 text-emerald-600" : run.status === "failed" ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground")}>{run.status}</span>
                            <span className="text-muted-foreground">{(run.total_tokens ?? 0).toLocaleString()} tok</span>
                            <span className="text-amber-600">${parseFloat(run.cost_usd || "0").toFixed(4)}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* â”€â”€ FEED TAB â”€â”€ */}
      {activeTab === "feed" && (
        <div className="rounded-xl border border-border/80 bg-card shadow-xs">
          <div className="flex items-center gap-2 border-b border-border/60 p-4">
            <Zap className="h-4 w-4 text-primary" />
            <h2 className="font-semibold text-sm text-foreground">Feed Esecuzioni Swarm in Tempo Reale</h2>
            <span className="ml-auto text-2xs text-muted-foreground">{lineageFeed.length} eventi Â· aggiornamento ogni 10s</span>
          </div>

          {feedLoading ? (
            <div className="flex h-40 items-center justify-center text-xs text-muted-foreground">Caricamento feed...</div>
          ) : lineageFeed.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <Activity className="h-8 w-8 text-muted-foreground mb-3" />
              <h3 className="font-semibold text-sm text-foreground mb-1">Nessun Evento Ancora</h3>
              <p className="text-xs text-muted-foreground max-w-sm">Il feed si popolerÃ  quando gli agenti inizieranno a eseguire task sotto direttive certificate.</p>
            </div>
          ) : (
            <div className="divide-y divide-border/40 max-h-screen overflow-y-auto">
              {lineageFeed.map((ev) => (
                <div key={ev.id} className="flex items-start gap-3 px-4 py-3 hover:bg-muted/20 transition-colors">
                  <div className={cn("mt-2 h-2 w-2 shrink-0 rounded-full", EVENT_TYPE_DOT[ev.event_type] ?? "bg-muted-foreground")} />
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={cn("text-xs font-semibold", EVENT_TYPE_COLORS[ev.event_type] ?? "text-foreground")}>
                        {EVENT_TYPE_LABELS[ev.event_type] ?? ev.event_type.replace(/_/g, " ")}
                      </span>
                      <Link to={`/directives/${ev.directive_id}`} className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-2xs font-bold text-primary hover:underline">
                        {ev.directive_identifier}
                      </Link>
                      <span className="text-2xs text-muted-foreground truncate max-w-40">{ev.directive_title}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-2xs text-muted-foreground">
                      {ev.agent_name && (
                        <span className="flex items-center gap-1"><Bot className="h-3 w-3" />{ev.agent_name}{ev.agent_role && ` (${ev.agent_role})`}</span>
                      )}
                      {!ev.agent_name && ev.actor_user_id && <span>Operatore: {ev.actor_user_id}</span>}
                      {ev.details && Object.keys(ev.details).length > 0 && (
                        <span className="font-mono bg-muted/50 px-1.5 py-0.5 rounded">
                          {Object.entries(ev.details).slice(0, 2).map(([k, v]) => `${k}=${typeof v === "object" ? "â€¦" : v}`).join(" Â· ")}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="shrink-0 font-mono text-2xs text-muted-foreground tabular-nums">{new Date(ev.created_at).toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create Directive Modal */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Emana Nuova Direttiva di Governance
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3.5 py-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground">Titolo Direttiva *</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Es. Scansione Continua VulnerabilitÃ " className="text-xs" />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-foreground">Descrizione</label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Scopo generale..." className="text-xs" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-foreground">PrioritÃ </label>
                <select value={priority} onChange={(e) => setPriority(e.target.value as any)} className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs text-foreground">
                  <option value="low">Bassa</option>
                  <option value="medium">Media</option>
                  <option value="high">Alta</option>
                  <option value="critical">Critica</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-foreground">Cap Budget ($ USD)</label>
                <Input type="number" value={budgetLimitUsd} onChange={(e) => setBudgetLimitUsd(e.target.value)} className="text-xs font-mono" />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-foreground">Agenti Autorizzati (vuoto = tutto lo swarm)</label>
              <select multiple value={targetAgentIds} onChange={(e) => setTargetAgentIds(Array.from(e.target.selectedOptions, (o) => o.value))} className="w-full rounded-md border border-input bg-background p-2 text-xs text-foreground h-24">
                {companyAgents.map((ag) => <option key={ag.id} value={ag.id}>{ag.name} ({ag.role})</option>)}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-foreground">Istruzioni Operative *</label>
              <Textarea value={rawInstructions} onChange={(e) => setRawInstructions(e.target.value)} placeholder="Specifica i vincoli, le modalitÃ  operative e le direttive..." className="min-h-24 text-xs font-mono" />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input type="checkbox" id="certifyImmediately" checked={certifiedImmediately} onChange={(e) => setCertifiedImmediately(e.target.checked)} className="rounded border-border" />
              <label htmlFor="certifyImmediately" className="text-xs font-medium text-foreground cursor-pointer">Certifica e Attiva immediatamente</label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setCreateDialogOpen(false)}>Annulla</Button>
            <Button size="sm" disabled={!title.trim() || !rawInstructions.trim() || createMutation.isPending} onClick={() => createMutation.mutate()}>
              {createMutation.isPending ? "Creazione..." : "Salva Direttiva"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
