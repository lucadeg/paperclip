import { useState } from "react";
import {
  GitFork,
  FolderTree,
  Plus,
  ArrowUpRight,
  ShieldCheck,
  Bot,
  CircleDot,
  CheckCircle2,
  AlertCircle,
  Clock,
  ChevronRight,
  Layers,
  Sparkles,
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
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { issuesApi } from "@/api/issues";
import { useToastActions } from "@/context/ToastContext";
import { queryKeys } from "@/lib/queryKeys";
import { cn } from "@/lib/utils";

interface SwarmNode {
  id: string;
  identifier?: string | null;
  title: string;
  status: string;
  assigneeAgentId?: string | null;
  assigneeUserId?: string | null;
  priority?: string | null;
  createdAt?: string | Date;
}

interface IssueSwarmHierarchyProps {
  currentIssue: {
    id: string;
    companyId: string;
    identifier?: string | null;
    title: string;
    status: string;
    parentId?: string | null;
    assigneeAgentId?: string | null;
    projectId?: string | null;
  };
  parentIssue?: SwarmNode | null;
  childIssues?: SwarmNode[];
  agentMap?: Map<string, { id: string; name: string; icon?: string | null; role?: string }>;
  onRefresh?: () => void;
}

export function IssueSwarmHierarchy({
  currentIssue,
  parentIssue,
  childIssues = [],
  agentMap = new Map(),
  onRefresh,
}: IssueSwarmHierarchyProps) {
  const { addToast } = useToastActions();
  const queryClient = useQueryClient();
  const [addSubtaskOpen, setAddSubtaskOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newAgentId, setNewAgentId] = useState(currentIssue.assigneeAgentId || "");
  const [newPriority, setNewPriority] = useState("medium");

  const createSubtaskMutation = useMutation({
    mutationFn: async () => {
      if (!newTitle.trim()) return;
      return issuesApi.create(currentIssue.companyId, {
        title: newTitle.trim(),
        description: newDesc.trim() || undefined,
        parentId: currentIssue.id,
        assigneeAgentId: newAgentId || undefined,
        projectId: currentIssue.projectId || undefined,
        priority: newPriority as any,
        status: "todo",
      });
    },
    onSuccess: () => {
      addToast({
        type: "success",
        title: "Sub-task / Nodo Swarm Creato",
        message: "Il nuovo nodo swarm è stato collegato alla gerarchia.",
      });
      setNewTitle("");
      setNewDesc("");
      setAddSubtaskOpen(false);
      void queryClient.invalidateQueries({ queryKey: queryKeys.issues.detail(currentIssue.id) });
      onRefresh?.();
    },
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "done":
        return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />;
      case "in_progress":
        return <Clock className="h-3.5 w-3.5 text-blue-500 animate-pulse" />;
      case "blocked":
        return <AlertCircle className="h-3.5 w-3.5 text-destructive" />;
      default:
        return <CircleDot className="h-3.5 w-3.5 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "done":
        return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
      case "in_progress":
        return "bg-blue-500/10 text-blue-600 border-blue-500/20";
      case "blocked":
        return "bg-destructive/10 text-destructive border-destructive/20";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  const completedChildren = childIssues.filter((c) => c.status === "done").length;
  const progressPercent = childIssues.length > 0
    ? Math.round((completedChildren / childIssues.length) * 100)
    : 0;

  return (
    <div className="rounded-xl border border-border/80 bg-card p-4 shadow-xs">
      <div className="flex items-center justify-between border-b border-border/60 pb-3 mb-3">
        <div className="flex items-center gap-2">
          <FolderTree className="h-4 w-4 text-primary" />
          <span className="font-semibold text-sm text-foreground">
            Gerarchia & Diramazione Swarm
          </span>
          {childIssues.length > 0 && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-mono font-medium text-primary">
              {completedChildren}/{childIssues.length} completati ({progressPercent}%)
            </span>
          )}
        </div>

        <Button
          size="sm"
          variant="outline"
          className="h-7 gap-1 text-xs"
          onClick={() => setAddSubtaskOpen(true)}
        >
          <Plus className="h-3.5 w-3.5" />
          Aggiungi Nodo Swarm
        </Button>
      </div>

      {/* Parent Task Card */}
      <div className="mb-3 space-y-1">
        <span className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
          Task Genitore (Parent Directive):
        </span>
        {parentIssue ? (
          <Link
            to={`/issues/${parentIssue.identifier || parentIssue.id}`}
            className="flex items-center justify-between rounded-lg border border-border/70 bg-accent/30 p-2.5 hover:bg-accent/60 transition-colors"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <GitFork className="h-4 w-4 text-muted-foreground shrink-0 rotate-180" />
              <span className="font-mono text-xs font-bold text-primary shrink-0">
                {parentIssue.identifier || parentIssue.id.slice(0, 8)}
              </span>
              <span className="truncate text-xs font-medium text-foreground">
                {parentIssue.title}
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {parentIssue.assigneeAgentId && (
                <span className="flex items-center gap-1 text-2xs text-muted-foreground">
                  <Bot className="h-3 w-3" />
                  {agentMap.get(parentIssue.assigneeAgentId)?.name || "Agente"}
                </span>
              )}
              <span className={cn("rounded border px-1.5 py-0.5 text-2xs font-medium capitalize", getStatusBadge(parentIssue.status))}>
                {parentIssue.status}
              </span>
              <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
          </Link>
        ) : (
          <div className="rounded-lg border border-dashed border-border/80 px-3 py-2 text-xs text-muted-foreground">
            Nessun task genitore (Root Task)
          </div>
        )}
      </div>

      {/* Current Task Node Marker */}
      <div className="relative pl-6 py-1 my-1 border-l-2 border-primary/40">
        <div className="absolute -left-[5px] top-2.5 h-2 w-2 rounded-full bg-primary" />
        <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
          <span className="font-mono text-primary">{currentIssue.identifier || currentIssue.id.slice(0, 8)}</span>
          <span className="truncate">{currentIssue.title}</span>
          <span className="rounded bg-primary/10 px-1.5 py-0.5 text-2xs font-medium text-primary uppercase">
            Nodo Corrente
          </span>
        </div>
      </div>

      {/* Child Sub-Tasks (Swarm Diramazione) */}
      <div className="mt-2 space-y-1">
        <span className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
          Sub-Tasks & Swarm Child Nodes ({childIssues.length}):
        </span>

        {childIssues.length > 0 ? (
          <div className="space-y-1.5 pl-3 border-l-2 border-dashed border-border/80 mt-1">
            {childIssues.map((child) => {
              const childAgent = child.assigneeAgentId ? agentMap.get(child.assigneeAgentId) : null;
              return (
                <Link
                  key={child.id}
                  to={`/issues/${child.identifier || child.id}`}
                  className="flex items-center justify-between rounded-lg border border-border/60 bg-background/80 p-2 text-xs hover:border-primary/50 hover:bg-accent/40 transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {getStatusIcon(child.status)}
                    <span className="font-mono font-bold text-xs text-muted-foreground shrink-0">
                      {child.identifier || child.id.slice(0, 8)}
                    </span>
                    <span className="truncate font-medium text-foreground">
                      {child.title}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {childAgent && (
                      <span className="flex items-center gap-1 rounded bg-muted/60 px-1.5 py-0.5 text-2xs font-medium text-muted-foreground">
                        <Bot className="h-3 w-3 text-primary" />
                        {childAgent.name}
                      </span>
                    )}
                    <span className={cn("rounded border px-1.5 py-0.5 text-2xs font-medium capitalize", getStatusBadge(child.status))}>
                      {child.status}
                    </span>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border/80 px-3 py-3 text-center text-xs text-muted-foreground">
            Nessun sub-task attivo. Clicca su "Aggiungi Nodo Swarm" per diramare l'esecuzione su agenti paralleli.
          </div>
        )}
      </div>

      {/* Add Subtask Dialog */}
      <Dialog open={addSubtaskOpen} onOpenChange={setAddSubtaskOpen}>
        <DialogContent className="sm:max-w-(--sz-500px)">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Crea Nuovo Sub-Task / Diramazione Swarm
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground">
                Titolo del Sub-Task *
              </label>
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Es. Esegui fuzzing avanzato porte o genera report CVSS"
                className="text-xs"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-foreground">
                Assegna ad Agente dello Swarm
              </label>
              <select
                value={newAgentId}
                onChange={(e) => setNewAgentId(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">Seleziona un agente...</option>
                {Array.from(agentMap.values()).map((ag) => (
                  <option key={ag.id} value={ag.id}>
                    {ag.name} ({ag.role || "agent"})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-foreground">
                Priorità
              </label>
              <select
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="low">Bassa (Low)</option>
                <option value="medium">Media (Medium)</option>
                <option value="high">Alta (High)</option>
                <option value="critical">Critica (Critical)</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-foreground">
                Istruzioni Operative
              </label>
              <Textarea
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Istruzioni specifiche per questo sub-agente..."
                className="min-h-(--sz-80px) text-xs"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setAddSubtaskOpen(false)}>
              Annulla
            </Button>
            <Button
              size="sm"
              disabled={!newTitle.trim() || createSubtaskMutation.isPending}
              onClick={() => createSubtaskMutation.mutate()}
            >
              {createSubtaskMutation.isPending ? "Creazione..." : "Crea Sub-Task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
