import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  FileText,
  FilePlus,
  FileEdit,
  FileSearch,
  FileX,
  ArrowRightLeft,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  ExternalLink,
  ShieldCheck,
  FolderOpen,
} from "lucide-react";
import { companiesApi } from "../api/companies";
import { queryKeys } from "../lib/queryKeys";

interface FileActivityInspectorProps {
  companyId: string;
}

type OperationFilter = "ALL" | "CREATED" | "MODIFIED" | "ANALYZED" | "MOVED" | "DELETED";

export function FileActivityInspector({ companyId }: FileActivityInspectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<OperationFilter>("ALL");

  const { data: activities, isLoading } = useQuery({
    queryKey: queryKeys.companies.fileActivities(companyId),
    queryFn: () => companiesApi.getFileActivities(companyId),
    refetchInterval: 5000,
  });

  const filteredActivities = useMemo(() => {
    let list = activities ?? [];

    if (selectedFilter !== "ALL") {
      list = list.filter((item) => item.operationType === selectedFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (item) =>
          item.path.toLowerCase().includes(q) ||
          (item.agentName && item.agentName.toLowerCase().includes(q)) ||
          (item.details && item.details.toLowerCase().includes(q)),
      );
    }

    return list;
  }, [activities, selectedFilter, searchQuery]);

  const counts = useMemo(() => {
    const map = {
      ALL: activities?.length ?? 0,
      CREATED: 0,
      MODIFIED: 0,
      ANALYZED: 0,
      MOVED: 0,
      DELETED: 0,
    };
    for (const item of activities ?? []) {
      if (item.operationType in map) {
        map[item.operationType as keyof typeof map]++;
      }
    }
    return map;
  }, [activities]);

  const getOperationBadge = (type: string) => {
    switch (type) {
      case "CREATED":
        return {
          label: "CREATO",
          icon: FilePlus,
          className: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
        };
      case "MODIFIED":
        return {
          label: "MODIFICATO",
          icon: FileEdit,
          className: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
        };
      case "ANALYZED":
        return {
          label: "ANALIZZATO",
          icon: FileSearch,
          className: "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30",
        };
      case "MOVED":
        return {
          label: "SPOSTATO",
          icon: ArrowRightLeft,
          className: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
        };
      case "DELETED":
        return {
          label: "CANCELLATO",
          icon: FileX,
          className: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30",
        };
      default:
        return {
          label: "FILE",
          icon: FileText,
          className: "bg-secondary text-muted-foreground border-border",
        };
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-4 sm:p-5 border-b border-border/50 bg-secondary/20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
              <FolderOpen className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-foreground">
                  Tracciamento File & Asset In Chiaro
                </h3>
                <span className="rounded-full px-2 py-0.5 text-xs font-semibold bg-primary/10 text-primary">
                  {counts.ALL} operazioni registrate
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Audit in tempo reale di tutti i file analizzati, modificati, generati, spostati o cancellati nel workspace.
              </p>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cerca per path, file, agente o task..."
              className="w-full rounded-xl border border-border bg-background pl-9 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        {/* Filter Badges */}
        <div className="flex flex-wrap items-center gap-1.5 mt-3 pt-3 border-t border-border/40">
          <span className="text-xs text-muted-foreground font-medium flex items-center gap-1 mr-1">
            <Filter className="h-3 w-3" /> Filtra:
          </span>
          <button
            type="button"
            onClick={() => setSelectedFilter("ALL")}
            className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer ${
              selectedFilter === "ALL"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-secondary/60 hover:bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            Tutti ({counts.ALL})
          </button>
          <button
            type="button"
            onClick={() => setSelectedFilter("CREATED")}
            className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer ${
              selectedFilter === "CREATED"
                ? "bg-emerald-600 text-white shadow-sm"
                : "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
            }`}
          >
            Creati ({counts.CREATED})
          </button>
          <button
            type="button"
            onClick={() => setSelectedFilter("MODIFIED")}
            className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer ${
              selectedFilter === "MODIFIED"
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400"
            }`}
          >
            Modificati ({counts.MODIFIED})
          </button>
          <button
            type="button"
            onClick={() => setSelectedFilter("ANALYZED")}
            className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer ${
              selectedFilter === "ANALYZED"
                ? "bg-purple-600 text-white shadow-sm"
                : "bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400"
            }`}
          >
            Analizzati ({counts.ANALYZED})
          </button>
          <button
            type="button"
            onClick={() => setSelectedFilter("MOVED")}
            className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer ${
              selectedFilter === "MOVED"
                ? "bg-amber-600 text-white shadow-sm"
                : "bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400"
            }`}
          >
            Spostati ({counts.MOVED})
          </button>
          <button
            type="button"
            onClick={() => setSelectedFilter("DELETED")}
            className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer ${
              selectedFilter === "DELETED"
                ? "bg-red-600 text-white shadow-sm"
                : "bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400"
            }`}
          >
            Cancellati ({counts.DELETED})
          </button>
        </div>
      </div>

      {/* List content */}
      <div className="divide-y divide-border/40 max-h-[420px] overflow-y-auto">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-muted-foreground">
            Caricamento attività file in corso...
          </div>
        ) : filteredActivities.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground">
            Nessuna operazione su file trovata con i filtri correnti.
          </div>
        ) : (
          filteredActivities.map((item) => {
            const badge = getOperationBadge(item.operationType);
            const Icon = badge.icon;
            const formattedDate = new Date(item.timestamp).toLocaleString("it-IT", {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            });

            return (
              <div
                key={item.id}
                className="p-3.5 sm:px-5 hover:bg-secondary/30 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                {/* Left side: Badge & Path */}
                <div className="flex items-start sm:items-center gap-3 min-w-0">
                  <span
                    className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-bold shrink-0 ${badge.className}`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {badge.label}
                  </span>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-foreground truncate select-all">
                        {item.path}
                      </span>
                    </div>
                    {item.details && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5 max-w-xl">
                        {item.details}
                      </p>
                    )}
                  </div>
                </div>

                {/* Right side: Metadata, Agent, Task Link & Status */}
                <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                  {item.issueId && (
                    <Link
                      to={`/issues/${item.issueId}`}
                      className="inline-flex items-center gap-1 rounded-md bg-secondary/80 hover:bg-secondary px-2 py-0.5 text-xs font-medium text-primary transition-colors"
                    >
                      <span>Task</span>
                      <ExternalLink className="h-2.5 w-2.5" />
                    </Link>
                  )}

                  <span className="text-xs text-muted-foreground flex items-center gap-1 font-mono">
                    <Clock className="h-3 w-3" />
                    {formattedDate}
                  </span>

                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-2 py-0.5 text-xs font-semibold">
                    <ShieldCheck className="h-3 w-3" />
                    Audit OK
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
