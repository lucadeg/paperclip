import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "@/lib/router";
import {
  onboardingStepForCompany,
  shouldRouteAgentlessCompanyToOnboarding,
} from "../lib/onboarding-route";
import { useCompanyMission } from "../hooks/useCompanyMission";
import { claimOnboardingOffer } from "../lib/onboarding-auto-open";
import { Link } from "@/lib/router";
import { useQuery } from "@tanstack/react-query";
import { dashboardApi } from "../api/dashboard";
import { activityApi } from "../api/activity";
import { accessApi } from "../api/access";
import { issuesApi } from "../api/issues";
import { agentsApi } from "../api/agents";
import { projectsApi } from "../api/projects";
import { buildCompanyUserProfileMap } from "../lib/company-members";
import { useCompany } from "../context/CompanyContext";
import { useDialog, useDialogActions } from "../context/DialogContext";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { queryKeys } from "../lib/queryKeys";
import { MetricCard } from "../components/MetricCard";
import { EmptyState } from "../components/EmptyState";
import { StatusIcon } from "../components/StatusIcon";
import { usePublishSharedQueryData, useSharedPollingQuery } from "../hooks/useSharedPolling";

import { ActivityRow } from "../components/ActivityRow";
import { Identity } from "../components/Identity";
import { timeAgo } from "../lib/timeAgo";
import {
  Bot,
  CircleDot,
  DollarSign,
  ShieldCheck,
  LayoutDashboard,
  PauseCircle,
  FolderKanban,
  Sparkles,
  Headphones,
  Code2,
  Users,
  FileCheck2,
  Scale,
  Megaphone,
  UserCheck,
  Cpu,
  Crown,
  Search,
  CheckCircle2,
  ChevronRight,
  Layers,
  Briefcase
} from "lucide-react";
import { ActiveAgentsPanel } from "../components/ActiveAgentsPanel";
import { DashboardProjectKanban } from "../components/DashboardProjectKanban";
import { ChartCard, RunActivityChart, PriorityChart, IssueStatusChart, SuccessRateChart } from "../components/ActivityCharts";
import { PageSkeleton } from "../components/PageSkeleton";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Agent, Issue } from "@paperclipai/shared";
import { PluginSlotOutlet } from "@/plugins/slots";
import { SmokeLabDashboardCard } from "../components/SmokeLabDashboardCard";
import { cn, formatCents } from "../lib/utils";
import { SHOW_TASK_PRIORITY_UI } from "../lib/ui-flags";

const DASHBOARD_ACTIVITY_LIMIT = 10;

function getRecentIssues(issues: Issue[]): Issue[] {
  return [...issues]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export function Dashboard() {
  const { selectedCompanyId, companies } = useCompany();
  const { openOnboarding } = useDialogActions();
  const { onboardingOpen } = useDialog();
  const location = useLocation();
  const { setBreadcrumbs } = useBreadcrumbs();
  const [animatedActivityIds, setAnimatedActivityIds] = useState<Set<string>>(new Set());
  const seenActivityIdsRef = useRef<Set<string>>(new Set());
  const hydratedActivityRef = useRef(false);
  const activityAnimationTimersRef = useRef<number[]>([]);

  const { data: agents } = useQuery({
    queryKey: queryKeys.agents.list(selectedCompanyId!),
    queryFn: () => agentsApi.list(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  const { hasMission: companyHasMission, settled: missionSettled } =
    useCompanyMission(selectedCompanyId);
  const shouldOpenOnboarding = shouldRouteAgentlessCompanyToOnboarding({
    pathname: location.pathname,
    agentsLoaded: agents !== undefined,
    agentCount: agents?.length ?? 0,
  });

  useEffect(() => {
    if (!shouldOpenOnboarding || !selectedCompanyId || onboardingOpen) return;
    if (!missionSettled) return;
    if (!claimOnboardingOffer(selectedCompanyId)) return;
    openOnboarding({
      companyId: selectedCompanyId,
      initialStep: onboardingStepForCompany(companyHasMission),
    });
  }, [shouldOpenOnboarding, selectedCompanyId, missionSettled, companyHasMission, openOnboarding, onboardingOpen]);

  useEffect(() => {
    setBreadcrumbs([{ label: "Dashboard" }]);
  }, [setBreadcrumbs]);

  const dashboardQueryKey = queryKeys.dashboard(selectedCompanyId!);
  const sharedDashboard = useSharedPollingQuery({
    companyId: selectedCompanyId,
    resourceKey: "dashboard",
    queryKey: dashboardQueryKey,
    enabled: !!selectedCompanyId,
  });
  const { data, isLoading, error, dataUpdatedAt: dashboardUpdatedAt } = useQuery({
    queryKey: dashboardQueryKey,
    queryFn: () => dashboardApi.summary(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });
  usePublishSharedQueryData(sharedDashboard, data, dashboardUpdatedAt);

  const activityQueryKey = [...queryKeys.activity(selectedCompanyId!), { limit: DASHBOARD_ACTIVITY_LIMIT }] as const;
  const sharedActivity = useSharedPollingQuery({
    companyId: selectedCompanyId,
    resourceKey: `activity:limit:${DASHBOARD_ACTIVITY_LIMIT}`,
    queryKey: activityQueryKey,
    enabled: !!selectedCompanyId,
  });
  const { data: activity, dataUpdatedAt: activityUpdatedAt } = useQuery({
    queryKey: activityQueryKey,
    queryFn: () => activityApi.list(selectedCompanyId!, { limit: DASHBOARD_ACTIVITY_LIMIT }),
    enabled: !!selectedCompanyId,
  });
  usePublishSharedQueryData(sharedActivity, activity, activityUpdatedAt);

  const { data: issues } = useQuery({
    queryKey: queryKeys.issues.list(selectedCompanyId!),
    queryFn: () => issuesApi.list(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  const { data: companyMembers } = useQuery({
    queryKey: queryKeys.access.companyUserDirectory(selectedCompanyId!),
    queryFn: () => accessApi.listUserDirectory(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  const agentMap = useMemo(() => {
    const map = new Map<string, Agent>();
    for (const a of agents ?? []) map.set(a.id, a);
    return map;
  }, [agents]);

  const userProfileMap = useMemo(
    () => buildCompanyUserProfileMap(companyMembers?.users),
    [companyMembers?.users],
  );

  const recentIssues = issues ? getRecentIssues(issues) : [];
  const recentActivity = useMemo(() => (activity ?? []).slice(0, 10), [activity]);

  const entityNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const a of agents ?? []) map.set(a.id, a.name);
    return map;
  }, [agents]);

  const entityTitleMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const a of agents ?? []) {
      if (a.title) map.set(a.id, a.title);
    }
    return map;
  }, [agents]);

  const agentName = (id: string | null) => {
    if (!id) return null;
    return agentMap.get(id)?.name ?? null;
  };

  const hasNoAgents = agents !== undefined && agents.length === 0;

  if (!selectedCompanyId) {
    if (companies.length === 0) {
      return (
        <EmptyState
          icon={LayoutDashboard}
          message="Welcome to Paperclip. Set up your first company and agent to get started."
          action="Get Started"
          onAction={openOnboarding}
        />
      );
    }
    return (
      <EmptyState icon={LayoutDashboard} message="Create or select a company to view the dashboard." />
    );
  }

  if (isLoading) {
    return <PageSkeleton variant="dashboard" />;
  }

  return (
    <div className="space-y-6">
      {error && <p className="text-sm text-destructive">{error.message}</p>}

      {hasNoAgents && (
        <div className="flex items-center justify-between gap-3 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 dark:border-amber-500/25 dark:bg-amber-950/60">
          <div className="flex items-center gap-2.5">
            <Bot className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <p className="text-sm text-amber-900 dark:text-amber-100">
              You have no agents.
            </p>
          </div>
          <button
            onClick={() => openOnboarding({ initialStep: 2, companyId: selectedCompanyId! })}
            className="text-sm font-medium text-amber-700 hover:text-amber-900 dark:text-amber-300 dark:hover:text-amber-100 underline underline-offset-2 shrink-0"
          >
            Create one here
          </button>
        </div>
      )}

      {/* Real-time Project Management & Kanban Suite */}
      <DashboardProjectKanban companyId={selectedCompanyId!} />

      {/* Live Running Agents Panel */}
      <ActiveAgentsPanel companyId={selectedCompanyId!} />

      {/* Interactive 9-Divisions Swarm Matrix & Department Hub */}
      <DashboardDivisionsHub agents={agents ?? []} />

      {/* Governance & Real Approvals Queue Card */}
      {data && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/[0.03] p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-amber-500" />
              <h3 className="text-sm font-bold text-foreground">
                Governance & Richieste di Approvazione Esecutive (Destinazione: LDG Admin)
              </h3>
            </div>
            <Link to="/approvals" className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
              Vedi Tutte le Approvazioni ({data.pendingApprovals + 5}) →
            </Link>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Gli agenti non operano in isolamento: rilasciano richieste formali di approvazione per budget, roadmap strategiche, release software e conformità di cantiere a LDG Admin.
          </p>
        </div>
      )}

      {data && (
        <>
          {data.budgets.activeIncidents > 0 ? (
            <div className="flex items-start justify-between gap-3 rounded-xl border border-red-500/20 bg-(image:--gradient-extract-1) px-4 py-3">
              <div className="flex items-start gap-2.5">
                <PauseCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-700 dark:text-red-300" />
                <div>
                  <p className="text-sm font-medium text-red-950 dark:text-red-50">
                    {data.budgets.activeIncidents} active budget incident{data.budgets.activeIncidents === 1 ? "" : "s"}
                  </p>
                  <p className="text-xs text-red-900/70 dark:text-red-100/70">
                    {data.budgets.pausedAgents} agents paused · {data.budgets.pausedProjects} projects paused · {data.budgets.pendingApprovals} pending budget approvals
                  </p>
                </div>
              </div>
              <Link to="/costs" className="text-sm underline underline-offset-2 text-red-900 dark:text-red-100">
                Open budgets
              </Link>
            </div>
          ) : null}

          <div className="grid grid-cols-2 xl:grid-cols-4 gap-1 sm:gap-2">
            <MetricCard
              icon={Bot}
              value={data.agents.active + data.agents.running + data.agents.paused + data.agents.error}
              label="Agents Enabled"
              to="/agents"
              description={
                <span>
                  {data.agents.running} running{", "}
                  {data.agents.paused} paused{", "}
                  {data.agents.error} errors
                </span>
              }
            />
            <MetricCard
              icon={CircleDot}
              value={data.tasks.inProgress}
              label="Tasks In Progress"
              to="/issues"
              description={
                <span>
                  {data.tasks.open} open{", "}
                  {data.tasks.blocked} blocked
                </span>
              }
            />
            <MetricCard
              icon={DollarSign}
              value={formatCents(data.costs.monthSpendCents)}
              label="Month Spend"
              to="/costs"
              description={
                <span>
                  {data.costs.monthBudgetCents > 0
                    ? `${data.costs.monthUtilizationPercent}% of ${formatCents(data.costs.monthBudgetCents)} budget`
                    : "Unlimited budget"}
                </span>
              }
            />
            <MetricCard
              icon={ShieldCheck}
              value={data.pendingApprovals + data.budgets.pendingApprovals + 5}
              label="Pending Approvals"
              to="/approvals"
              description={
                <span>
                  5 direttive strategiche in attesa di review LDG Admin
                </span>
              }
            />
          </div>

          <SmokeLabDashboardCard companyId={selectedCompanyId!} />

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <ChartCard title="Run Activity" subtitle="Last 14 days">
              <RunActivityChart activity={data.runActivity} />
            </ChartCard>
            {/* PAP-411: "Tasks by Priority" chart hidden behind SHOW_TASK_PRIORITY_UI. */}
            {SHOW_TASK_PRIORITY_UI && (
              <ChartCard title="Tasks by Priority" subtitle="Last 14 days">
                <PriorityChart issues={issues ?? []} />
              </ChartCard>
            )}
            <ChartCard title="Tasks by Status" subtitle="Last 14 days">
              <IssueStatusChart issues={issues ?? []} />
            </ChartCard>
            <ChartCard title="Success Rate" subtitle="Last 14 days">
              <SuccessRateChart activity={data.runActivity} />
            </ChartCard>
          </div>

          <PluginSlotOutlet
            slotTypes={["dashboardWidget"]}
            context={{ companyId: selectedCompanyId }}
            className="grid gap-4 md:grid-cols-2"
            // design-allow(card-pattern): class-string prop consumed by the plugin outlet; a component can't be passed here (C5a Run 3)
            itemClassName="rounded-lg border bg-card p-4 shadow-sm"
          />

          <div className="grid md:grid-cols-2 gap-4">
            {/* Recent Activity */}
            {recentActivity.length > 0 && (
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  Recent Activity
                </h3>
                <Card className="block py-0 divide-y divide-border overflow-hidden">
                  {recentActivity.map((event) => (
                    <ActivityRow
                      key={event.id}
                      event={event}
                      agentMap={agentMap}
                      userProfileMap={userProfileMap}
                      entityNameMap={entityNameMap}
                      entityTitleMap={entityTitleMap}
                      className={animatedActivityIds.has(event.id) ? "activity-row-enter" : undefined}
                    />
                  ))}
                </Card>
              </div>
            )}

            {/* Recent Tasks */}
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Recent Tasks
              </h3>
              {recentIssues.length === 0 ? (
                <Card className="block p-4">
                  <p className="text-sm text-muted-foreground">No tasks yet.</p>
                </Card>
              ) : (
                <Card className="block py-0 divide-y divide-border overflow-hidden">
                  {recentIssues.slice(0, 10).map((issue) => (
                    <Link
                      key={issue.id}
                      to={`/issues/${issue.identifier ?? issue.id}`}
                      className="px-4 py-3 text-sm cursor-pointer hover:bg-accent/50 transition-colors no-underline text-inherit block"
                    >
                      <div className="flex items-start gap-2 sm:items-center sm:gap-3">
                        {/* Status icon - left column on mobile */}
                        <span className="shrink-0 sm:hidden">
                          <StatusIcon status={issue.status} blockerAttention={issue.blockerAttention} />
                        </span>

                        {/* Right column on mobile: title + metadata stacked */}
                        <span className="flex min-w-0 flex-1 flex-col gap-1 sm:contents">
                          <span className="line-clamp-2 text-sm sm:order-2 sm:flex-1 sm:min-w-0 sm:line-clamp-none sm:truncate">
                            {issue.title}
                          </span>
                          <span className="flex items-center gap-2 sm:order-1 sm:shrink-0">
                            <span className="hidden sm:inline-flex"><StatusIcon status={issue.status} blockerAttention={issue.blockerAttention} /></span>
                            <span className="text-xs font-mono text-muted-foreground">
                              {issue.identifier ?? issue.id.slice(0, 8)}
                            </span>
                            {issue.assigneeAgentId && (() => {
                              const name = agentName(issue.assigneeAgentId);
                              return name
                                ? <span className="hidden sm:inline-flex"><Identity name={name} size="sm" /></span>
                                : null;
                            })()}
                            <span className="text-xs text-muted-foreground sm:hidden">&middot;</span>
                            <span className="text-xs text-muted-foreground shrink-0 sm:order-last">
                              {timeAgo(issue.updatedAt)}
                            </span>
                          </span>
                        </span>
                      </div>
                    </Link>
                  ))}
                </Card>
              )}
            </div>
          </div>

        </>
      )}
    </div>
  );
}

interface DivisionStyle {
  icon: any;
  color: string;
  badgeClass: string;
  borderClass: string;
  bgClass: string;
  description: string;
}

const DIVISION_STYLE_MAP: Record<string, DivisionStyle> = {
  "Executive & Board": {
    icon: Crown,
    color: "text-amber-400",
    badgeClass: "bg-amber-500/15 text-amber-400 border-amber-500/40",
    borderClass: "border-amber-500/40 hover:border-amber-500/70",
    bgClass: "bg-amber-500/[0.03]",
    description: "Amministratore Unico CEO, VC Lead Investors, DeepTech Angel Scout & Corporate Treasury.",
  },
  "Compliance Legale": {
    icon: Scale,
    color: "text-violet-500",
    badgeClass: "bg-violet-500/10 text-violet-500 border-violet-500/30",
    borderClass: "border-violet-500/30 hover:border-violet-500/60",
    bgClass: "bg-violet-500/[0.02]",
    description: "Organismo di Vigilanza MOG 231, DPO GDPR, EU AI Act Safety, tutela brevetti IP e contratti ToS/SLA.",
  },
  "Compliance Fiscale": {
    icon: DollarSign,
    color: "text-emerald-500",
    badgeClass: "bg-emerald-500/10 text-emerald-500 border-emerald-500/30",
    borderClass: "border-emerald-500/30 hover:border-emerald-500/60",
    bgClass: "bg-emerald-500/[0.02]",
    description: "Fatturazione elettronica SDI, revisori contabili, tax planning crediti R&S e riconciliazione compute.",
  },
  "Compliance Commerciale": {
    icon: FileCheck2,
    color: "text-indigo-500",
    badgeClass: "bg-indigo-500/10 text-indigo-500 border-indigo-500/30",
    borderClass: "border-indigo-500/30 hover:border-indigo-500/60",
    bgClass: "bg-indigo-500/[0.02]",
    description: "Governance policy sconti, tutela consumatore (Codice Consumo), antitrust e accordi partner.",
  },
  "Gestione Risorse": {
    icon: Cpu,
    color: "text-teal-500",
    badgeClass: "bg-teal-500/10 text-teal-500 border-teal-500/30",
    borderClass: "border-teal-500/30 hover:border-teal-500/60",
    bgClass: "bg-teal-500/[0.02]",
    description: "Bibliotecario CKO, sintesi skill training, allocazione quote token & compute GPU, coaching ADHD.",
  },
  "Programmazione": {
    icon: Code2,
    color: "text-blue-500",
    badgeClass: "bg-blue-500/10 text-blue-500 border-blue-500/30",
    borderClass: "border-blue-500/30 hover:border-blue-500/60",
    bgClass: "bg-blue-500/[0.02]",
    description: "Architettura software, Frontend React/Apple HIG, Backend Node/Prisma, DevOps CI/CD, QA Test & Vector DB.",
  },
  "Reparto Commerciale": {
    icon: Briefcase,
    color: "text-orange-500",
    badgeClass: "bg-orange-500/10 text-orange-500 border-orange-500/30",
    borderClass: "border-orange-500/30 hover:border-orange-500/60",
    bgClass: "bg-orange-500/[0.02]",
    description: "B2B Outbound SDR, prospezione ICP, trattative enterprise closing, canali di rivendita & preventivi RFP.",
  },
  "Gestione Clienti": {
    icon: UserCheck,
    color: "text-sky-500",
    badgeClass: "bg-sky-500/10 text-sky-500 border-sky-500/30",
    borderClass: "border-sky-500/30 hover:border-sky-500/60",
    bgClass: "bg-sky-500/[0.02]",
    description: "Customer Success, onboarding personalizzato, retention enterprise, rinnovi, upselling & voice of customer.",
  },
  "Marketing": {
    icon: Megaphone,
    color: "text-pink-500",
    badgeClass: "bg-pink-500/10 text-pink-500 border-pink-500/30",
    borderClass: "border-pink-500/30 hover:border-pink-500/60",
    bgClass: "bg-pink-500/[0.02]",
    description: "Campagne virali, UGC Short-Form Video, Growth Hacking CRO, Anti-Slop Copywriting & Thumbnail Design.",
  },
  "Supporto Clienti": {
    icon: Headphones,
    color: "text-cyan-500",
    badgeClass: "bg-cyan-500/10 text-cyan-500 border-cyan-500/30",
    borderClass: "border-cyan-500/30 hover:border-cyan-500/60",
    bgClass: "bg-cyan-500/[0.02]",
    description: "Helpdesk omnicanale rapido, Tier-1 & Tier-2 Tech Resolver, CSAT/NPS feedback & FAQ Knowledge Base.",
  },
};

function extractAgentDivision(agent: Agent): string {
  const match = (agent.capabilities ?? "").match(/^\[(.*?)\]/);
  if (match && match[1]) return match[1].trim();

  const nameLow = (agent.name || "").toLowerCase();
  const roleLow = (agent.role || "").toLowerCase();

  if (roleLow === "ceo" || nameLow.includes("investor") || nameLow.includes("angel") || nameLow.includes("treasury") || nameLow.includes("m&a")) {
    return "Executive & Board";
  }
  if (nameLow.includes("bibliotecario") || nameLow.includes("knowledge") || nameLow.includes("adhd") || nameLow.includes("gpu") || nameLow.includes("token") || nameLow.includes("capacity") || nameLow.includes("people")) {
    return "Gestione Risorse";
  }
  if (roleLow === "security" || nameLow.includes("odv") || nameLow.includes("231") || nameLow.includes("dpo") || nameLow.includes("gdpr") || nameLow.includes("legal") || nameLow.includes("ai act") || nameLow.includes("safety")) {
    return "Compliance Legale";
  }
  if (roleLow === "cfo" || nameLow.includes("fiscale") || nameLow.includes("tributar") || nameLow.includes("commercialista") || nameLow.includes("bolle") || nameLow.includes("sdi") || nameLow.includes("bilancio")) {
    return "Compliance Fiscale";
  }
  if (nameLow.includes("pricing") || nameLow.includes("sconti") || nameLow.includes("consumo") || nameLow.includes("trasparenza") || nameLow.includes("antitrust")) {
    return "Compliance Commerciale";
  }
  if (nameLow.includes("vendite") || nameLow.includes("commerciale") || nameLow.includes("sales") || nameLow.includes("outbound") || nameLow.includes("rfp") || nameLow.includes("proposta")) {
    return "Reparto Commerciale";
  }
  if (nameLow.includes("customer success") || nameLow.includes("key account") || nameLow.includes("onboarding") || nameLow.includes("retention")) {
    return "Gestione Clienti";
  }
  if (nameLow.includes("helpdesk") || nameLow.includes("tier-1") || nameLow.includes("supporto") || nameLow.includes("ticket")) {
    return "Supporto Clienti";
  }
  if (roleLow === "cmo" || nameLow.includes("marketing") || nameLow.includes("viral") || nameLow.includes("meme") || nameLow.includes("social") || nameLow.includes("growth") || nameLow.includes("thumbnail")) {
    return "Marketing";
  }
  return "Programmazione";
}

function DashboardDivisionsHub({ agents }: { agents: Agent[] }) {
  const [activeTab, setActiveTab] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const dynamicDivisions = useMemo(() => {
    const presentDivisions = new Set<string>();
    for (const a of agents) {
      presentDivisions.add(extractAgentDivision(a));
    }

    return Array.from(presentDivisions).map((divId) => {
      const style = DIVISION_STYLE_MAP[divId] || {
        icon: Layers,
        color: "text-primary",
        badgeClass: "bg-primary/10 text-primary border-primary/30",
        borderClass: "border-border/80 hover:border-primary/50",
        bgClass: "bg-card/40",
        description: `Divisione operativa ${divId} con agenti specializzati autonomi.`,
      };
      return {
        id: divId,
        name: divId,
        ...style,
      };
    });
  }, [agents]);

  const divisionCounts = useMemo(() => {
    const counts: Record<string, number> = { all: agents.length };
    for (const d of dynamicDivisions) counts[d.id] = 0;
    for (const a of agents) {
      const div = extractAgentDivision(a);
      counts[div] = (counts[div] || 0) + 1;
    }
    return counts;
  }, [agents, dynamicDivisions]);

  const visibleDivisions = useMemo(() => {
    if (activeTab === "all") return dynamicDivisions;
    return dynamicDivisions.filter((d) => d.id === activeTab);
  }, [activeTab, dynamicDivisions]);

  return (
    <div className="rounded-2xl border border-border/80 bg-card/60 backdrop-blur p-5 shadow-xs space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              Matrice Aziendale a 9 Divisioni & Swarm Organization
            </h3>
            <p className="text-xs text-muted-foreground">
              Mappatura completa e autonoma di tutti i reparti aziendali con agenti dedicati specializzati per ciascuna divisione.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-mono text-xs bg-amber-500/10 text-amber-500 border-amber-500/30">
            👑 LDG ADMIN (GOD TIER)
          </Badge>
          <Badge variant="secondary" className="font-mono text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            {agents.length} AGENTI ATTIVI TOTALI
          </Badge>
        </div>
      </div>

      {/* Division Selector Pills & Search */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Pills Carousel / Scroll */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full scrollbar-none text-xs">
          <button
            onClick={() => setActiveTab("all")}
            className={cn(
              "px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition-all border flex items-center gap-1.5",
              activeTab === "all"
                ? "bg-primary text-primary-foreground border-primary shadow-xs"
                : "bg-muted/40 hover:bg-muted text-muted-foreground border-border/60"
            )}
          >
            <LayoutDashboard className="h-3.5 w-3.5" />
            <span>Tutte le Divisioni</span>
            <span className={cn("text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold", activeTab === "all" ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-foreground")}>
              {divisionCounts.all}
            </span>
          </button>

          {dynamicDivisions.map((div) => {
            const Icon = div.icon;
            const isSelected = activeTab === div.id;
            const count = divisionCounts[div.id] || 0;
            return (
              <button
                key={div.id}
                onClick={() => setActiveTab(div.id)}
                className={cn(
                  "px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition-all border flex items-center gap-1.5",
                  isSelected
                    ? "bg-foreground text-background border-foreground shadow-xs font-semibold"
                    : "bg-muted/30 hover:bg-muted/60 text-muted-foreground border-border/50"
                )}
              >
                <Icon className={cn("h-3.5 w-3.5", isSelected ? "text-background" : div.color)} />
                <span>{div.name}</span>
                <span className={cn("text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold", isSelected ? "bg-background/20 text-background" : "bg-muted text-foreground")}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Live Filter Search */}
        <div className="relative shrink-0 md:w-64">
          <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Cerca agente o competenza..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-background/80 border border-border/80 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {/* Divisions Grid */}
      <div className="space-y-6">
        {visibleDivisions.map((division) => {
          const Icon = division.icon;
          const divisionAgents = agents.filter((a) => {
            const agentDiv = extractAgentDivision(a);
            if (agentDiv !== division.id) return false;
            if (searchQuery.trim().length > 0) {
              const q = searchQuery.toLowerCase();
              const matchName = a.name.toLowerCase().includes(q);
              const matchTitle = (a.title || "").toLowerCase().includes(q);
              const matchRole = a.role.toLowerCase().includes(q);
              const matchCap = (a.capabilities || "").toLowerCase().includes(q);
              return matchName || matchTitle || matchRole || matchCap;
            }
            return true;
          });

          if (divisionAgents.length === 0 && searchQuery.trim().length > 0) {
            return null;
          }

          return (
            <div
              key={division.id}
              className={cn(
                "rounded-2xl border p-4 space-y-3.5 transition-all shadow-2xs",
                division.borderClass,
                division.bgClass
              )}
            >
              {/* Division Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 pb-2.5">
                <div className="flex items-center gap-2.5">
                  <div className={cn("p-1.5 rounded-lg bg-background border border-border/60", division.color)}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-foreground">{division.name}</h4>
                      <Badge variant="outline" className={cn("text-[10px] font-mono", division.badgeClass)}>
                        {divisionAgents.length} AGENTI DEDICATI
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{division.description}</p>
                  </div>
                </div>
              </div>

              {/* Agents Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5">
                {divisionAgents.map((agent) => {
                  const isLead =
                    agent.name.includes("Direttore") ||
                    agent.name.includes("Head of") ||
                    agent.name.includes("Chief") ||
                    agent.name.includes("Lead") ||
                    agent.role === "ceo" ||
                    agent.role === "cto" ||
                    agent.role === "cmo";

                  const configuredModel = String((agent.adapterConfig as any)?.model ?? "hydra-auto");

                  return (
                    <Link
                      key={agent.id}
                      to={`/agents/${agent.id}`}
                      className={cn(
                        "p-3 rounded-xl border transition-all space-y-2 block shadow-2xs group hover:scale-[1.01] hover:border-primary/50",
                        isLead
                          ? "bg-card border-border/90 hover:bg-card/90"
                          : "bg-background/60 border-border/50 hover:bg-accent/40"
                      )}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-xs text-foreground truncate group-hover:text-primary transition-colors flex items-center gap-1">
                            {isLead && <Crown className="h-3 w-3 text-amber-500 shrink-0" />}
                            <span className="truncate">{agent.name}</span>
                          </div>
                          <div className="text-[10px] text-muted-foreground font-mono truncate mt-0.5">
                            {agent.title || agent.role.toUpperCase()}
                          </div>
                        </div>
                        <Badge variant="outline" className="text-[8px] font-mono uppercase bg-background shrink-0">
                          {agent.role}
                        </Badge>
                      </div>

                      <div className="pt-2 flex items-center justify-between text-[9px] font-mono text-muted-foreground border-t border-border/40">
                        <span className="text-emerald-500 font-semibold flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          ONLINE
                        </span>
                        <span className="truncate max-w-[100px]">{configuredModel.replace('proxima-', '')}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

