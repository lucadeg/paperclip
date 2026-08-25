import { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "@/lib/router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { approvalsApi } from "../api/approvals";
import { agentsApi } from "../api/agents";
import { useCompany } from "../context/CompanyContext";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { queryKeys } from "../lib/queryKeys";
import { cn } from "../lib/utils";
import { PageTabBar } from "../components/PageTabBar";
import { Tabs } from "@/components/ui/tabs";
import {
  ShieldCheck,
  ShieldAlert,
  Search,
  Users,
  DollarSign,
  Cpu,
  Layers,
  Sparkles,
  Filter,
} from "lucide-react";
import { ApprovalCard } from "../components/ApprovalCard";
import { PageSkeleton } from "../components/PageSkeleton";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { Approval } from "@paperclipai/shared";

type StatusFilter = "pending" | "all" | "approved";

export function Approvals() {
  const { selectedCompanyId } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const pathSegment = location.pathname.split("/").pop() ?? "pending";
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(
    pathSegment === "all" ? "all" : pathSegment === "approved" ? "approved" : "pending",
  );
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    setBreadcrumbs([{ label: "Approvals" }]);
  }, [setBreadcrumbs]);

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.approvals.list(selectedCompanyId!),
    queryFn: () => approvalsApi.list(selectedCompanyId!),
    enabled: !!selectedCompanyId,
    refetchInterval: 30_000,
  });

  const { data: agents } = useQuery({
    queryKey: queryKeys.agents.list(selectedCompanyId!),
    queryFn: () => agentsApi.list(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => approvalsApi.approve(id),
    onSuccess: (_approval, id) => {
      setActionError(null);
      queryClient.invalidateQueries({ queryKey: queryKeys.approvals.list(selectedCompanyId!) });
      navigate(`/approvals/${id}?resolved=approved`);
    },
    onError: (err) => {
      setActionError(err instanceof Error ? err.message : "Failed to approve");
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => approvalsApi.reject(id),
    onSuccess: () => {
      setActionError(null);
      queryClient.invalidateQueries({ queryKey: queryKeys.approvals.list(selectedCompanyId!) });
    },
    onError: (err) => {
      setActionError(err instanceof Error ? err.message : "Failed to reject");
    },
  });

  // Calculate real metrics from the database results
  const allApprovals = data ?? [];
  const pendingApprovals = allApprovals.filter(
    (a) => a.status === "pending" || a.status === "revision_requested",
  );
  const approvedApprovals = allApprovals.filter((a) => a.status === "approved");

  const pendingCount = pendingApprovals.length;
  const totalCount = allApprovals.length;

  const distinctAgentsCount = useMemo(() => {
    const set = new Set<string>();
    for (const a of pendingApprovals) {
      if (a.requestedByAgentId) set.add(a.requestedByAgentId);
    }
    return set.size;
  }, [pendingApprovals]);

  const totalValueUnderReview = useMemo(() => {
    let total = 0;
    for (const a of pendingApprovals) {
      const payload = (a.payload as Record<string, unknown>) || {};
      const amount = Number(payload.amountUsd || 0);
      total += amount;
    }
    return total;
  }, [pendingApprovals]);

  const filtered = useMemo(() => {
    return allApprovals
      .filter((a) => {
        // Status filter
        if (statusFilter === "pending") {
          if (a.status !== "pending" && a.status !== "revision_requested") return false;
        } else if (statusFilter === "approved") {
          if (a.status !== "approved") return false;
        }

        // Category filter
        if (categoryFilter !== "all" && a.type !== categoryFilter) {
          return false;
        }

        // Text search filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const payload = (a.payload as Record<string, unknown>) || {};
          const title = String(payload.title ?? "").toLowerCase();
          const summary = String(payload.summary ?? "").toLowerCase();
          const proposedBy = String(payload.proposedBy ?? "").toLowerCase();
          const agentName = (a.agentDetails?.name ?? "").toLowerCase();
          const model = (a.agentDetails?.model ?? "").toLowerCase();

          if (
            !title.includes(q) &&
            !summary.includes(q) &&
            !proposedBy.includes(q) &&
            !agentName.includes(q) &&
            !model.includes(q) &&
            !a.type.toLowerCase().includes(q)
          ) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [allApprovals, statusFilter, categoryFilter, searchQuery]);

  if (!selectedCompanyId) {
    return <p className="text-sm text-muted-foreground">Select a company first.</p>;
  }

  if (isLoading) {
    return <PageSkeleton variant="approvals" />;
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* EXECUTIVE GOVERNANCE STATS HEADER */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <Card className="p-4 border-amber-500/30 bg-amber-500/[0.04] space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
            <span>In Attesa di Delibera</span>
            <ShieldCheck className="h-4 w-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-foreground font-mono">{pendingCount}</p>
          <p className="text-(length:--text-nano) text-muted-foreground">Richieste esecutive in sospeso</p>
        </Card>

        <Card className="p-4 border-blue-500/30 bg-blue-500/[0.04] space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
            <span>Agenti Richiedenti</span>
            <Users className="h-4 w-4 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-foreground font-mono">{distinctAgentsCount}</p>
          <p className="text-(length:--text-nano) text-muted-foreground">Specialisti con proposte attive</p>
        </Card>

        <Card className="p-4 border-green-500/30 bg-green-500/[0.04] space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
            <span>Budget / Valore in Esame</span>
            <DollarSign className="h-4 w-4 text-green-500" />
          </div>
          <p className="text-2xl font-bold text-foreground font-mono">
            {totalValueUnderReview > 0 ? `$${totalValueUnderReview.toLocaleString()} USD` : "$0.00 USD"}
          </p>
          <p className="text-(length:--text-nano) text-muted-foreground">
            {totalValueUnderReview > 0 ? "Budget straordinario richiesto" : "Nessun budget straordinario"}
          </p>
        </Card>

        <Card className="p-4 border-primary/30 bg-primary/[0.04] space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
            <span>Policy di Sicurezza</span>
            <Cpu className="h-4 w-4 text-primary" />
          </div>
          <p className="text-sm font-bold text-primary truncate">Zero-Trust Active</p>
          <p className="text-(length:--text-nano) text-muted-foreground">Approvazione manuale obbligatoria</p>
        </Card>
      </div>

      {/* FILTER & SEARCH CONTROLS */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-muted/20 p-3 rounded-2xl border border-border/80">
        {/* Status Tab Chips */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setStatusFilter("pending")}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5",
              statusFilter === "pending"
                ? "bg-amber-500 text-black shadow-xs"
                : "bg-background/80 text-muted-foreground hover:text-foreground border border-border/60",
            )}
          >
            In Attesa
            <Badge variant="secondary" className="px-1.5 py-0 text-(length:--text-nano) font-mono">
              {pendingCount}
            </Badge>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter("approved")}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5",
              statusFilter === "approved"
                ? "bg-green-600 text-white shadow-xs"
                : "bg-background/80 text-muted-foreground hover:text-foreground border border-border/60",
            )}
          >
            Approvate
            <Badge variant="secondary" className="px-1.5 py-0 text-(length:--text-nano) font-mono">
              {approvedApprovals.length}
            </Badge>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter("all")}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5",
              statusFilter === "all"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "bg-background/80 text-muted-foreground hover:text-foreground border border-border/60",
            )}
          >
            Tutte
            <Badge variant="secondary" className="px-1.5 py-0 text-(length:--text-nano) font-mono">
              {totalCount}
            </Badge>
          </button>
        </div>

        {/* Search Input */}
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cerca per titolo, agente, modello AI o motivazione..."
              className="pl-8 text-xs bg-background/80 border-border/80 h-9"
            />
          </div>

          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="text-xs text-muted-foreground hover:text-foreground underline px-1"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {error && <p className="text-sm text-destructive font-bold">{error.message}</p>}
      {actionError && <p className="text-sm text-destructive font-bold">{actionError}</p>}

      {/* EMPTY STATE */}
      {filtered.length === 0 && (
        <Card className="flex flex-col items-center justify-center py-16 text-center border-dashed border-border/80">
          <ShieldCheck className="h-10 w-10 text-muted-foreground/30 mb-3" />
          <p className="text-base font-bold text-foreground">
            {statusFilter === "pending" ? "Nessuna approvazione in sospeso." : "Nessuna approvazione trovata."}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {searchQuery
              ? "Nessun risultato corrisponde ai criteri di ricerca impostati."
              : "Tutte le richieste di governance sono state elaborate da LDG Admin."}
          </p>
        </Card>
      )}

      {/* APPROVALS CARDS LIST */}
      {filtered.length > 0 && (
        <div className="grid gap-4">
          {filtered.map((approval) => (
            <ApprovalCard
              key={approval.id}
              approval={approval}
              requesterAgent={
                approval.requestedByAgentId
                  ? (agents ?? []).find((a) => a.id === approval.requestedByAgentId) ?? null
                  : null
              }
              onApprove={() => approveMutation.mutate(approval.id)}
              onReject={() => rejectMutation.mutate(approval.id)}
              detailLink={`/approvals/${approval.id}`}
              isPending={approveMutation.isPending || rejectMutation.isPending}
              pendingAction={
                approveMutation.isPending ? "approve" : rejectMutation.isPending ? "reject" : null
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
