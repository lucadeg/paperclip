import { useState, useEffect, useMemo } from "react";
import {
  Users,
  Search,
  Phone,
  Mail,
  Building2,
  MapPin,
  Calendar,
  Filter,
  ArrowUpDown,
  ExternalLink,
  Plus,
  CheckCircle2,
  Clock,
  AlertCircle,
  MessageSquare,
  Sparkles,
  ChevronRight,
  X,
  Target,
} from "lucide-react";
import { useDialogActions } from "@/context/DialogContext";
import { Button } from "@/components/ui/button";
import { CrmLogo } from "@/components/AppLogos";

export interface CrmLead {
  row?: number;
  first_name: string;
  last_name: string;
  company?: string;
  email: string;
  phone?: string;
  status: string;
  website?: string;
  linkedin?: string;
  personal_email?: string;
  job_title?: string;
  address?: string;
  city?: string;
  province?: string;
  source?: string;
  sector?: string;
  revenue_range?: string;
  company_size?: string;
  country?: string;
  assigned_to?: string;
  next_action?: string;
  next_action_date?: string;
  call_status?: string;
  last_call_date?: string;
  email_status?: string;
  whatsapp_status?: string;
  appointment_date?: string;
  appointment_time?: string;
  notes?: string;
}

export function CrmContacts() {
  const { openNewIssue } = useDialogActions();
  const [leads, setLeads] = useState<CrmLead[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedLead, setSelectedLead] = useState<CrmLead | null>(null);

  useEffect(() => {
    fetch("http://localhost:8770/api/crm/contacts")
      .then((res) => res.json())
      .then((data) => {
        if (data && Array.isArray(data.contacts)) {
          setLeads(data.contacts);
        }
      })
      .catch((err) => {
        console.error("Failed to load CRM leads:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const stats = useMemo(() => {
    const total = leads.length;
    const daChiamare = leads.filter((l) => (l.status || "").toLowerCase().includes("chiamare")).length;
    const chiamati = leads.filter((l) => (l.status || "").toLowerCase().includes("chiamato")).length;
    const inTrattativa = leads.filter((l) => (l.status || "").toLowerCase().includes("trattativa")).length;
    const conTelefono = leads.filter((l) => Boolean(l.phone && l.phone.trim())).length;
    return { total, daChiamare, chiamati, inTrattativa, conTelefono };
  }, [leads]);

  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      const matchStatus =
        statusFilter === "all" ||
        (lead.status || "Da chiamare").toLowerCase().includes(statusFilter.toLowerCase());

      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        (lead.first_name || "").toLowerCase().includes(q) ||
        (lead.last_name || "").toLowerCase().includes(q) ||
        (lead.company || "").toLowerCase().includes(q) ||
        (lead.email || "").toLowerCase().includes(q) ||
        (lead.phone || "").toLowerCase().includes(q) ||
        (lead.city || "").toLowerCase().includes(q) ||
        (lead.sector || "").toLowerCase().includes(q);

      return matchStatus && matchSearch;
    });
  }, [leads, statusFilter, searchQuery]);

  const getStatusBadgeColor = (status: string = "") => {
    const s = status.toLowerCase();
    if (s.includes("trattativa") || s.includes("qualificato") || s.includes("vinto")) {
      return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
    }
    if (s.includes("chiamato") || s.includes("in corso")) {
      return "bg-sky-500/15 text-sky-400 border-sky-500/30";
    }
    if (s.includes("chiamare") || s.includes("nuovo")) {
      return "bg-amber-500/15 text-amber-400 border-amber-500/30";
    }
    return "bg-slate-500/15 text-slate-300 border-slate-500/30";
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-background text-foreground">
      {/* Header */}
      <div className="p-4 border-b border-border/70 flex flex-wrap items-center justify-between gap-4 bg-card/40 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-3">
          <CrmLogo size={32} />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight">CRM & Contatti B2B</h1>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-semibold">
                {leads.length} Lead Sovrani
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Pipeline commerciale integrata • Estrazione Lead Tracker MVX v11.2 • Sincronizzazione con agenti
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="http://localhost:8770/apps/crm/index.html"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border/70 bg-card hover:bg-muted transition-colors text-foreground"
          >
            <ExternalLink className="h-3.5 w-3.5 text-amber-400" />
            Apri App MVX CRM
          </a>
          <Button
            size="sm"
            onClick={() => openNewIssue()}
            className="text-xs gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
          >
            <Plus className="h-3.5 w-3.5" />
            Nuovo Task CRM
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 border-b border-border/60 bg-muted/10 shrink-0">
        <div className="p-3 rounded-xl border border-border/60 bg-card/60 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Totale Lead
            </div>
            <div className="text-xl font-bold font-mono text-foreground mt-0.5">
              {stats.total}
            </div>
          </div>
          <Users className="h-5 w-5 text-muted-foreground/60" />
        </div>

        <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/5 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider">
              Da Chiamare
            </div>
            <div className="text-xl font-bold font-mono text-amber-400 mt-0.5">
              {stats.daChiamare}
            </div>
          </div>
          <Phone className="h-5 w-5 text-amber-400/60" />
        </div>

        <div className="p-3 rounded-xl border border-sky-500/30 bg-sky-500/5 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-sky-400 uppercase tracking-wider">
              Contattati
            </div>
            <div className="text-xl font-bold font-mono text-sky-400 mt-0.5">
              {stats.chiamati}
            </div>
          </div>
          <CheckCircle2 className="h-5 w-5 text-sky-400/60" />
        </div>

        <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">
              In Trattativa
            </div>
            <div className="text-xl font-bold font-mono text-emerald-400 mt-0.5">
              {stats.inTrattativa}
            </div>
          </div>
          <Target className="h-5 w-5 text-emerald-400/60" />
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="p-4 flex flex-wrap items-center justify-between gap-3 border-b border-border/60 bg-card/20 shrink-0">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cerca per nome, azienda, email, città o telefono..."
            className="w-full pl-9 pr-3 py-1.5 bg-card border border-border/70 rounded-lg text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {[
            { id: "all", label: "Tutti" },
            { id: "chiamare", label: "Da Chiamare" },
            { id: "chiamato", label: "Chiamati" },
            { id: "trattativa", label: "In Trattativa" },
          ].map((pill) => (
            <button
              key={pill.id}
              onClick={() => setStatusFilter(pill.id)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                statusFilter === pill.id
                  ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                  : "bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>
      </div>

      {/* Leads Table View */}
      <div className="flex-1 overflow-auto p-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 gap-2 text-muted-foreground text-xs">
            <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            Caricamento 159 Lead dal database CRM...
          </div>
        ) : filteredLeads.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-2 text-muted-foreground text-xs">
            <Users className="h-8 w-8 text-muted-foreground/40" />
            Nessun lead trovato per il filtro applicato
          </div>
        ) : (
          <div className="border border-border/70 rounded-xl overflow-hidden bg-card/60 shadow-sm">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-muted/60 text-muted-foreground font-semibold border-b border-border/70 sticky top-0 backdrop-blur-md">
                <tr>
                  <th className="px-4 py-3">Contatto & Ruolo</th>
                  <th className="px-4 py-3">Azienda & Città</th>
                  <th className="px-4 py-3">Recapiti Diretti</th>
                  <th className="px-4 py-3">Stato Pipeline</th>
                  <th className="px-4 py-3">Assegnato A</th>
                  <th className="px-4 py-3 text-right">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filteredLeads.map((lead, idx) => (
                  <tr
                    key={idx}
                    onClick={() => setSelectedLead(lead)}
                    className="hover:bg-muted/30 cursor-pointer transition-colors group"
                  >
                    <td className="px-4 py-3 font-medium text-foreground">
                      <div className="font-semibold text-foreground group-hover:text-primary transition-colors">
                        {lead.first_name} {lead.last_name}
                      </div>
                      {lead.job_title && (
                        <div className="text-[11px] text-muted-foreground font-normal">
                          {lead.job_title}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground flex items-center gap-1.5">
                        <Building2 className="h-3 w-3 text-muted-foreground shrink-0" />
                        <span>{lead.company || "Azienda non specificata"}</span>
                      </div>
                      {lead.city && (
                        <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                          <MapPin className="h-2.5 w-2.5 shrink-0" />
                          <span>
                            {lead.city} {lead.province ? `(${lead.province})` : ""}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px]">
                      {lead.email && (
                        <div className="flex items-center gap-1.5 text-foreground/90">
                          <Mail className="h-3 w-3 text-muted-foreground shrink-0" />
                          <span className="truncate max-w-[200px]">{lead.email}</span>
                        </div>
                      )}
                      {lead.phone && (
                        <div className="flex items-center gap-1.5 text-muted-foreground mt-0.5">
                          <Phone className="h-3 w-3 text-amber-400 shrink-0" />
                          <span>{lead.phone}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getStatusBadgeColor(
                          lead.status
                        )}`}
                      >
                        {lead.status || "Da chiamare"}
                      </span>
                      {lead.next_action && (
                        <div className="text-[10px] text-muted-foreground mt-1 truncate max-w-[150px]">
                          {lead.next_action}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[11px] font-medium text-foreground/80 px-2 py-0.5 rounded bg-muted border border-border/50">
                        {lead.assigned_to || "Sovereign Lead"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <ChevronRight className="h-4 w-4 text-muted-foreground inline-block group-hover:translate-x-0.5 transition-transform" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Lead Detail Drawer */}
      {selectedLead && (
        <div className="fixed inset-y-0 right-0 w-full max-w-lg bg-card border-l border-border shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-200">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400 shadow-sm" />
              <h2 className="text-sm font-bold text-foreground">Scheda Lead CRM</h2>
            </div>
            <button
              onClick={() => setSelectedLead(null)}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {/* Header info */}
            <div>
              <span
                className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold border mb-2 ${getStatusBadgeColor(
                  selectedLead.status
                )}`}
              >
                {selectedLead.status || "Da chiamare"}
              </span>
              <h3 className="text-lg font-bold text-foreground">
                {selectedLead.first_name} {selectedLead.last_name}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {selectedLead.job_title || "Decision Maker"} • {selectedLead.company || "Azienda B2B"}
              </p>
            </div>

            {/* Direct Contacts Box */}
            <div className="p-3.5 rounded-xl border border-border bg-muted/20 space-y-2 text-xs">
              <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                Contatti & Canali
              </div>
              {selectedLead.email && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5" /> Email
                  </span>
                  <a
                    href={`mailto:${selectedLead.email}`}
                    className="font-mono text-primary hover:underline"
                  >
                    {selectedLead.email}
                  </a>
                </div>
              )}
              {selectedLead.phone && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5" /> Telefono
                  </span>
                  <a
                    href={`tel:${selectedLead.phone}`}
                    className="font-mono text-amber-400 hover:underline"
                  >
                    {selectedLead.phone}
                  </a>
                </div>
              )}
              {selectedLead.city && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" /> Località
                  </span>
                  <span>
                    {selectedLead.city} {selectedLead.province ? `(${selectedLead.province})` : ""}
                  </span>
                </div>
              )}
            </div>

            {/* Commercial Info */}
            <div className="space-y-3">
              <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Dati Commerciali & Qualificazione
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-lg border border-border bg-card">
                  <div className="text-muted-foreground text-[10px]">Settore</div>
                  <div className="font-semibold text-foreground mt-0.5">
                    {selectedLead.sector || "Non specificato"}
                  </div>
                </div>
                <div className="p-3 rounded-lg border border-border bg-card">
                  <div className="text-muted-foreground text-[10px]">Dimensione Azienda</div>
                  <div className="font-semibold text-foreground mt-0.5">
                    {selectedLead.company_size || "1-10 dipendenti"}
                  </div>
                </div>
                <div className="p-3 rounded-lg border border-border bg-card">
                  <div className="text-muted-foreground text-[10px]">Assegnato a</div>
                  <div className="font-semibold text-foreground mt-0.5">
                    {selectedLead.assigned_to || "Luca"}
                  </div>
                </div>
                <div className="p-3 rounded-lg border border-border bg-card">
                  <div className="text-muted-foreground text-[10px]">Prossima Azione</div>
                  <div className="font-semibold text-foreground mt-0.5">
                    {selectedLead.next_action_date || "Da fissare"}
                  </div>
                </div>
              </div>
            </div>

            {/* Notes */}
            {selectedLead.notes && (
              <div>
                <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  Note di Contatto
                </div>
                <div className="p-3 rounded-lg border border-border bg-muted/30 text-xs text-foreground/90 whitespace-pre-wrap">
                  {selectedLead.notes}
                </div>
              </div>
            )}
          </div>

          <div className="p-4 border-t border-border bg-card flex items-center justify-between gap-3 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedLead(null)}
              className="text-xs"
            >
              Chiudi
            </Button>
            <Button
              size="sm"
              onClick={() => {
                openNewIssue();
                setSelectedLead(null);
              }}
              className="text-xs gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
            >
              <Plus className="h-3.5 w-3.5" />
              Crea Task per questo Lead
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
