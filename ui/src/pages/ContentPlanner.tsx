import { useState, useMemo, useEffect } from "react";
import { api } from "@/api/client";
import { useCompany } from "@/context/CompanyContext";
import {
  Calendar,
  CalendarDays,
  Plus,
  Filter,
  Video,
  FileText,
  Share2,
  Tv,
  Mail,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Layers,
  ChevronRight,
  ChevronLeft,
  User,
  SlidersHorizontal,
  Columns3,
  ListFilter,
  X,
  ExternalLink,
  Target,
  Edit3,
  Play,
} from "lucide-react";
import { useDialogActions } from "@/context/DialogContext";
import { Button } from "@/components/ui/button";

export interface ContentItem {
  id: string;
  title: string;
  channel: "reels_tiktok" | "linkedin" | "youtube" | "x_twitter" | "newsletter";
  channelLabel: string;
  channelIcon: typeof Video;
  channelColor: string;
  phase: "radar" | "scripting" | "studio" | "compliance" | "ready";
  assignedLeader: string;
  leaderRole: string;
  hookFormula: string;
  scheduledDate: string; // e.g. "2026-09-17" or formatted string
  scheduledTime?: string; // e.g. "18:30"
  priority: "high" | "critical" | "medium";
  metricsTarget: string;
  fullScript?: string;
}

export interface CreativePhrase {
  id: string;
  title: string;
  category: string;
  phase: string;
  phrase: string;
  hook?: string;
  framework?: string;
  metrics_views?: number;
  metrics_likes?: number;
  metrics_shares?: number;
  body?: string;
  hook_intro?: string;
  call_to_action?: string;
  hashtags?: string;
  target_platform?: string;
  quality_score?: number;
}



const PHASES = [
  { id: "radar", label: "01. Trend & Hook Radar", description: "Ideazione e validazione semantica dell'angolo", badgeColor: "#818cf8" },
  { id: "scripting", label: "02. Sovereign Scripting", description: "Copywriting strutturato con i 25 Leader", badgeColor: "#38bdf8" },
  { id: "studio", label: "03. Creative Studio Assets", description: "Higgsfield Video Lab, Caroselli, Mockup 3D", badgeColor: "#a78bfa" },
  { id: "compliance", label: "04. Munger QA & Veto", description: "Audit fattuale, assenza allucinazioni e pre-mortem", badgeColor: "#fbbf24" },
  { id: "ready", label: "05. Pronto per Pubblicazione", description: "Asset approvati e pronti alla programmazione", badgeColor: "#34d399" },
] as const;

function formatLocalDate(value: Date): string {
  return String(value.getFullYear()) + "-" +
    String(value.getMonth() + 1).padStart(2, "0") + "-" +
    String(value.getDate()).padStart(2, "0");
}

export function ContentPlanner() {
  const { openNewIssue } = useDialogActions();
  const { selectedCompanyId } = useCompany();
  const [syncError, setSyncError] = useState<string | null>(null);
  const [items, setItems] = useState<ContentItem[]>([]);
  const [channelFilter, setChannelFilter] = useState<string>("all");
  const [searchFilter, setSearchFilter] = useState<string>("");
  const [viewMode, setViewMode] = useState<"calendar" | "kanban" | "studio">("calendar");

  // Creative Studio Phrases (408 Items from backend)
  const [creativePhrases, setCreativePhrases] = useState<CreativePhrase[]>([]);
  const [creativeCategoryFilter, setCreativeCategoryFilter] = useState<string>("all");

  // Calendar State (Defaults to September 2026)
  const [calendarDate, setCalendarDate] = useState<Date>(new Date()); // Month 8 = September
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null);

  // Marketing content comes from an authorized, company-scoped Tier 1 connector.
  useEffect(() => {
    let active = true;
    setCreativePhrases([]);
    if (!selectedCompanyId) return;
    api.get<{ companyId: string; items: CreativePhrase[] }>(
      "/companies/" + encodeURIComponent(selectedCompanyId) + "/mvx-marketing/content/phrases",
    ).then((data) => {
      if (!active) return;
      if (data.companyId !== selectedCompanyId || !Array.isArray(data.items)) throw new Error("Company scope mismatch");
      setCreativePhrases(data.items.filter((p) => p && typeof p.id === "string" &&
        typeof p.title === "string" && typeof p.phrase === "string"));
    }).catch(() => {
      if (active) setSyncError("Archivio contenuti Tier 1 non connesso o non autorizzato. Nessun dato dimostrativo viene mostrato.");
    });
    return () => { active = false; };
  }, [selectedCompanyId]);

  // Helper to map a CreativePhrase into a ContentItem
  const mapPhraseToContentItem = (p: CreativePhrase): ContentItem => {
    let ch: ContentItem["channel"] = "reels_tiktok";
    let chLabel = "Reels / TikTok 9:16";
    let chColor = "#f43f5e";
    let ChIcon = Video;

    const cat = p.category || "";
    const plat = (p.target_platform || "").toLowerCase();

    if (cat === "Carosello Multi-Slide" || plat.includes("linkedin")) {
      ch = "linkedin";
      chLabel = "LinkedIn Carousel";
      chColor = "#0284c7";
      ChIcon = Layers;
    } else if (cat === "Educational" || plat.includes("youtube")) {
      ch = "youtube";
      chLabel = "YouTube Video";
      chColor = "#ef4444";
      ChIcon = Tv;
    } else if (cat === "Viral Sketch" || plat.includes("twitter") || plat.includes("x")) {
      ch = "x_twitter";
      chLabel = "X Thread & Viral";
      chColor = "#38bdf8";
      ChIcon = Share2;
    }

    return {
      id: p.id,
      title: p.title || "Contenuto Studio Creativo",
      channel: ch,
      channelLabel: chLabel,
      channelIcon: ChIcon,
      channelColor: chColor,
      phase: "studio",
      assignedLeader: "Creative Studio Sovereign",
      leaderRole: p.category || "Content Architecture",
      hookFormula: p.hook || p.hook_intro || "Gancio di conversione ottimizzato",
      scheduledDate: "",
      scheduledTime: undefined,
      priority: "high",
      metricsTarget: "N/D - risultati pubblicitari non verificati",
      fullScript: `${p.phrase}\n\nCall to Action: ${p.call_to_action || "Commenta con la tua opinione"}\n\nHashtags: ${p.hashtags || "#business #growth"}`,
    };
  };

  const handleSchedulePhrase = (_phrase: CreativePhrase) => {
    // No fake scheduling: require a writable Tier 1 API, approval and provider receipt.
    setSyncError("Pianificazione non disponibile: connettore Tier 1 in scrittura non configurato.");
  };

  const handleInspectPhrase = (phrase: CreativePhrase) => {
    const item = mapPhraseToContentItem(phrase);
    setSelectedItem(item);
  };

  // Filtered Creative Phrases
  const filteredCreativePhrases = useMemo(() => {
    return creativePhrases.filter((p) => {
      const matchCat =
        creativeCategoryFilter === "all" || p.category === creativeCategoryFilter;
      const matchSearch =
        !searchFilter.trim() ||
        p.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
        (p.hook && p.hook.toLowerCase().includes(searchFilter.toLowerCase())) ||
        (p.phrase && p.phrase.toLowerCase().includes(searchFilter.toLowerCase())) ||
        (p.framework && p.framework.toLowerCase().includes(searchFilter.toLowerCase()));
      return matchCat && matchSearch;
    });
  }, [creativePhrases, creativeCategoryFilter, searchFilter]);

  // Calendar contains only stored, source-scoped entries; no inferred schedule.
  useEffect(() => {
    let active = true;
    setItems([]);
    if (!selectedCompanyId) return;
    api.get<{ companyId: string; items: Array<{
      id: string; title: string; scheduled_time: string; status: string;
      platform?: string; hook_used?: string; caption?: string;
    }> }>(
      "/companies/" + encodeURIComponent(selectedCompanyId) + "/mvx-marketing/content/calendar",
    ).then((report) => {
      if (!active) return;
      if (report.companyId !== selectedCompanyId || !Array.isArray(report.items)) throw new Error("Company scope mismatch");
      const mapped: ContentItem[] = [];
      for (const item of report.items) {
        if (!item || typeof item.id !== "string" || !item.id ||
            typeof item.title !== "string" || typeof item.scheduled_time !== "string") continue;
        const when = new Date(item.scheduled_time);
        if (!Number.isFinite(when.getTime())) continue;
        const platform = String(item.platform || "").toLowerCase();
        const channel: ContentItem["channel"] = platform.includes("linkedin") ? "linkedin" :
          platform.includes("youtube") ? "youtube" :
          platform.includes("twitter") ? "x_twitter" : "reels_tiktok";
        mapped.push({
          id: item.id, title: item.title, channel,
          channelLabel: channel, channelColor: "#64748b",
          channelIcon: channel === "linkedin" ? Layers : channel === "youtube" ? Tv :
            channel === "x_twitter" ? Share2 : Video,
          phase: item.status === "published" ? "ready" : "studio",
          assignedLeader: "Tier 1", leaderRole: "Archivio editoriale",
          hookFormula: item.hook_used || item.caption || "",
          scheduledDate: formatLocalDate(when),
          scheduledTime: String(when.getHours()).padStart(2,"0") + ":" +
            String(when.getMinutes()).padStart(2,"0"),
          priority: "medium", metricsTarget: "N/D — performance non verificata",
          fullScript: item.caption || "",
        });
      }
      setItems(mapped);
    }).catch(() => {
      if (active) setSyncError("Calendario Tier 1 non connesso o non autorizzato: nessun evento dimostrativo verrà mostrato.");
    });
    return () => { active = false; };
  }, [selectedCompanyId]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchChannel = channelFilter === "all" || item.channel === channelFilter;
      const matchSearch =
        !searchFilter.trim() ||
        item.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
        item.hookFormula.toLowerCase().includes(searchFilter.toLowerCase()) ||
        item.assignedLeader.toLowerCase().includes(searchFilter.toLowerCase());
      return matchChannel && matchSearch;
    });
  }, [items, channelFilter, searchFilter]);

  // Calendar Grid Calculation
  const calendarGrid = useMemo(() => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sun, 1 = Mon, ...
    // Convert to Monday = 0
    const startDayOffset = (firstDayIndex + 6) % 7;

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const days: Array<{
      date: Date;
      dateString: string;
      isCurrentMonth: boolean;
      isToday: boolean;
      items: ContentItem[];
    }> = [];

    // Previous month filler days
    for (let i = startDayOffset - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, daysInPrevMonth - i);
      const dateStr = formatLocalDate(d);
      days.push({
        date: d,
        dateString: dateStr,
        isCurrentMonth: false,
        isToday: false,
        items: filteredItems.filter((it) => it.scheduledDate === dateStr),
      });
    }

    // Current month days
    const todayStr = `${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2, "0")}-${String(new Date().getDate()).padStart(2, "0")}`;
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(year, month, day);
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      days.push({
        date: d,
        dateString: dateStr,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
        items: filteredItems.filter((it) => it.scheduledDate === dateStr),
      });
    }

    // Next month filler days to complete 35 or 42 cells grid
    const remaining = 35 - days.length >= 0 ? 35 - days.length : 42 - days.length;
    for (let day = 1; day <= remaining; day++) {
      const d = new Date(year, month + 1, day);
      const dateStr = formatLocalDate(d);
      days.push({
        date: d,
        dateString: dateStr,
        isCurrentMonth: false,
        isToday: false,
        items: filteredItems.filter((it) => it.scheduledDate === dateStr),
      });
    }

    return days;
  }, [calendarDate, filteredItems]);

  const monthName = useMemo(() => {
    return calendarDate.toLocaleDateString("it-IT", { month: "long", year: "numeric" });
  }, [calendarDate]);

  const handlePrevMonth = () => {
    setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1));
  };

  const handleToday = () => {
    setCalendarDate(new Date());
  };

  return (
    <div className="relative w-full h-[calc(100vh-3.5rem)] overflow-hidden bg-background select-none flex flex-col">
      {syncError && (
        <div role="alert" className="m-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs">
          {syncError}
        </div>
      )}
      {/* Top Header & View Controls */}
      <div className="p-4 border-b border-border/60 bg-card/60 backdrop-blur-md shrink-0 flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <h1 className="text-base font-bold text-foreground">
                MVX Content Planner &amp; Calendario Editoriale
              </h1>
            </div>
            <span className="text-xs bg-muted text-muted-foreground px-2.5 py-0.5 rounded-full font-mono border border-border/50">
              {filteredItems.length} Pubblicazioni Totali
            </span>

            {/* View Switcher Toggle */}
            <div className="flex items-center bg-muted/60 p-1 rounded-lg border border-border/60 ml-3">
              <button
                onClick={() => setViewMode("calendar")}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all ${
                  viewMode === "calendar"
                    ? "bg-card text-foreground shadow-sm font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <CalendarDays className="h-3.5 w-3.5 text-primary" />
                Calendario Editoriale
              </button>
              <button
                onClick={() => setViewMode("kanban")}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all ${
                  viewMode === "kanban"
                    ? "bg-card text-foreground shadow-sm font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Columns3 className="h-3.5 w-3.5 text-cyan-400" />
                Pipeline Fasi
              </button>
              <button
                onClick={() => setViewMode("studio")}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all ${
                  viewMode === "studio"
                    ? "bg-card text-foreground shadow-sm font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                Studio Creativo ({creativePhrases.length})
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => openNewIssue()}
              className="gap-1.5 text-xs bg-primary text-primary-foreground font-semibold shadow-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              Nuova Pubblicazione
            </Button>
          </div>
        </div>

        {/* Filter Bar & Search */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setChannelFilter("all")}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                channelFilter === "all"
                  ? "bg-primary text-primary-foreground font-semibold"
                  : "bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted/70"
              }`}
            >
              Tutti i Canali ({items.length})
            </button>
            <button
              onClick={() => setChannelFilter("reels_tiktok")}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                channelFilter === "reels_tiktok"
                  ? "bg-rose-500 text-white font-semibold"
                  : "bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted/70"
              }`}
            >
              <Video className="h-3 w-3" />
              TikTok / Reels 9:16
            </button>
            <button
              onClick={() => setChannelFilter("linkedin")}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                channelFilter === "linkedin"
                  ? "bg-sky-600 text-white font-semibold"
                  : "bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted/70"
              }`}
            >
              <Layers className="h-3 w-3" />
              LinkedIn Carousel
            </button>
            <button
              onClick={() => setChannelFilter("youtube")}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                channelFilter === "youtube"
                  ? "bg-red-600 text-white font-semibold"
                  : "bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted/70"
              }`}
            >
              <Tv className="h-3 w-3" />
              YouTube Video
            </button>
            <button
              onClick={() => setChannelFilter("x_twitter")}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                channelFilter === "x_twitter"
                  ? "bg-cyan-500 text-white font-semibold"
                  : "bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted/70"
              }`}
            >
              <Share2 className="h-3 w-3" />
              X Thread
            </button>
            <button
              onClick={() => setChannelFilter("newsletter")}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                channelFilter === "newsletter"
                  ? "bg-emerald-600 text-white font-semibold"
                  : "bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted/70"
              }`}
            >
              <Mail className="h-3 w-3" />
              Newsletter
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-72">
            <input
              type="text"
              placeholder="Cerca per titolo, gancio o leader..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full bg-muted/40 border border-border/60 rounded-lg px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>
      </div>

      {/* VIEW 1: Interactive Editorial Calendar */}
      {viewMode === "calendar" && (
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
          {/* Calendar Month Navigation Header */}
          <div className="flex items-center justify-between bg-card/60 border border-border/70 rounded-xl p-3 shadow-xs">
            <div className="flex items-center gap-3">
              <h2 className="text-base font-bold capitalize text-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                {monthName}
              </h2>
              <Button
                variant="outline"
                size="sm"
                onClick={handleToday}
                className="h-7 text-xs px-2.5"
              >
                Oggi ({new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "short" }).format(new Date())})
              </Button>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={handlePrevMonth}
                className="p-1.5 rounded-lg border border-border/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                title="Mese precedente"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={handleNextMonth}
                className="p-1.5 rounded-lg border border-border/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                title="Mese successivo"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* 7 Days of Week Header */}
          <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider py-1">
            <span>Lun</span>
            <span>Mar</span>
            <span>Mer</span>
            <span>Gio</span>
            <span>Ven</span>
            <span>Sab</span>
            <span>Dom</span>
          </div>

          {/* Calendar Grid Days */}
          <div className="grid grid-cols-7 gap-2 flex-1 auto-rows-fr min-h-[580px]">
            {calendarGrid.map((dayCell, idx) => {
              const dayNumber = dayCell.date.getDate();

              return (
                <div
                  key={idx}
                  className={`rounded-xl border p-2 flex flex-col gap-1.5 transition-all overflow-hidden relative group min-h-[105px] ${
                    dayCell.isToday
                      ? "border-primary/80 bg-primary/5 shadow-xs ring-1 ring-primary/30"
                      : dayCell.isCurrentMonth
                      ? "border-border/60 bg-card/50 hover:bg-card hover:border-border"
                      : "border-border/20 bg-muted/10 opacity-50"
                  }`}
                >
                  {/* Day Number Header */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-mono font-bold px-1.5 py-0.5 rounded-md ${
                        dayCell.isToday
                          ? "bg-primary text-primary-foreground"
                          : dayCell.isCurrentMonth
                          ? "text-foreground"
                          : "text-muted-foreground"
                      }`}
                    >
                      {dayNumber}
                    </span>

                    {/* Quick Add Button on Hover */}
                    <button
                      onClick={() => openNewIssue()}
                      className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-opacity"
                      title="Programma pubblicazione per questo giorno"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>

                  {/* Scheduled Event Chips */}
                  <div className="flex-1 space-y-1 overflow-y-auto no-scrollbar">
                    {dayCell.items.map((item) => {
                      const ChannelIcon = item.channelIcon;
                      return (
                        <div
                          key={item.id}
                          onClick={() => setSelectedItem(item)}
                          className="px-1.5 py-1 rounded-md border text-[11px] font-medium leading-tight cursor-pointer transition-all hover:brightness-110 flex items-center justify-between gap-1 shadow-xs truncate"
                          style={{
                            backgroundColor: `${item.channelColor}18`,
                            borderColor: `${item.channelColor}45`,
                            color: item.channelColor,
                          }}
                        >
                          <div className="flex items-center gap-1 min-w-0 truncate">
                            <ChannelIcon className="h-3 w-3 shrink-0" />
                            <span className="truncate text-foreground font-semibold">
                              {item.title}
                            </span>
                          </div>
                          {item.scheduledTime && (
                            <span className="text-[9px] font-mono opacity-80 shrink-0">
                              {item.scheduledTime}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 2: Kanban Pipeline View (5 Fasi Sovrane) */}
      {viewMode === "kanban" && (
        <div className="p-4 flex-1 overflow-x-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 min-w-[1250px] items-start">
            {PHASES.map((phase) => {
              const phaseItems = filteredItems.filter((item) => item.phase === phase.id);
              return (
                <div
                  key={phase.id}
                  className="flex flex-col rounded-xl border border-border/70 bg-card/60 p-3 shadow-xs"
                >
                  <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-border/60">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2 w-2 rounded-full shrink-0"
                        style={{ backgroundColor: phase.badgeColor }}
                      />
                      <h3 className="text-xs font-bold text-foreground">
                        {phase.label}
                      </h3>
                    </div>
                    <span className="text-[11px] font-mono text-muted-foreground px-1.5 py-0.2 rounded-full bg-muted">
                      {phaseItems.length}
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {phaseItems.map((item) => {
                      const ChannelIcon = item.channelIcon;
                      return (
                        <div
                          key={item.id}
                          className="group rounded-lg border border-border/60 bg-card p-3 hover:border-primary/50 transition-all shadow-xs hover:shadow-md cursor-pointer"
                          onClick={() => setSelectedItem(item)}
                        >
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <span
                              className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded"
                              style={{
                                backgroundColor: `${item.channelColor}15`,
                                color: item.channelColor,
                                border: `1px solid ${item.channelColor}35`,
                              }}
                            >
                              <ChannelIcon className="h-3 w-3" />
                              {item.channelLabel}
                            </span>
                            <span className="text-[10px] font-mono text-muted-foreground">
                              {item.scheduledTime || item.scheduledDate}
                            </span>
                          </div>

                          <h4 className="text-xs font-semibold text-foreground leading-snug group-hover:text-primary transition-colors mb-2">
                            {item.title}
                          </h4>

                          <div className="text-[10px] text-muted-foreground bg-muted/40 p-2 rounded italic line-clamp-2 mb-2">
                            "{item.hookFormula}"
                          </div>

                          <div className="pt-2 border-t border-border/40 flex items-center justify-between text-[10px] text-muted-foreground">
                            <span className="font-medium text-foreground/80 truncate max-w-[120px]">
                              {item.assignedLeader}
                            </span>
                            <span className="text-primary font-mono font-semibold">
                              {item.phase}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 3: Creative Studio contents from the verified provider */}
      {viewMode === "studio" && (
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
          {/* Header Banner & Stats */}
          <div className="bg-card/70 border border-border/80 rounded-xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="h-4 w-4 text-amber-400" />
                <h2 className="text-base font-bold text-foreground">
                  Creative Studio — Archivio Master
                </h2>
                <span className="text-[10px] font-mono bg-amber-400/10 text-amber-400 border border-amber-400/20 px-2 py-0.5 rounded-full font-semibold">
                  {creativePhrases.length} Formule disponibili (Tier 1)
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Hook psicologici ad alta conversione, script video, sketch virali e caroselli multi-slide strutturati per l'ecosistema MVX.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button type="button" disabled title="Studio esterno non connesso" className="inline-flex items-center rounded-lg border border-border bg-muted px-3 py-1.5 text-xs text-muted-foreground">Integrazione non connessa</button>
              <button type="button" disabled title="Studio esterno non connesso" className="inline-flex items-center rounded-lg border border-border bg-muted px-3 py-1.5 text-xs text-muted-foreground">Integrazione non connessa</button>
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
            {[
              { id: "all", label: "Tutti i Contenuti", count: creativePhrases.length },
              { id: "Reel Script", label: "Reel Script 9:16", count: creativePhrases.filter((p) => p.category === "Reel Script").length },
              { id: "Educational", label: "Educational & Framework", count: creativePhrases.filter((p) => p.category === "Educational").length },
              { id: "Viral Sketch", label: "Viral Sketch", count: creativePhrases.filter((p) => p.category === "Viral Sketch").length },
              { id: "Carosello Multi-Slide", label: "Carosello Multi-Slide", count: creativePhrases.filter((p) => p.category === "Carosello Multi-Slide").length },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCreativeCategoryFilter(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                  creativeCategoryFilter === cat.id
                    ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                    : "bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted/70"
                }`}
              >
                {cat.label} ({cat.count})
              </button>
            ))}
          </div>

          {/* Grid of Creative Items */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
            {filteredCreativePhrases.slice(0, 60).map((phrase) => {
              const quality = phrase.quality_score || 95;
              const viewsEst = phrase.metrics_views ? `${phrase.metrics_views.toLocaleString()} Views` : "35.000+ Views";
              const isCarousel = phrase.category === "Carosello Multi-Slide";
              const isReel = phrase.category === "Reel Script";
              const isEdu = phrase.category === "Educational";

              const badgeColor = isCarousel
                ? "bg-sky-500/10 text-sky-400 border-sky-500/20"
                : isReel
                ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                : isEdu
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                : "bg-amber-500/10 text-amber-400 border-amber-500/20";

              return (
                <div
                  key={phrase.id}
                  className="bg-card/70 border border-border/70 rounded-xl p-4 flex flex-col justify-between hover:border-primary/40 hover:bg-card hover:shadow-md transition-all group relative"
                >
                  <div className="space-y-2.5">
                    {/* Top Row: Category & Quality */}
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${badgeColor}`}>
                        {phrase.category}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-mono font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded border border-primary/20">
                          ★ {quality}/100
                        </span>
                        <span className="text-[10px] font-mono text-muted-foreground">
                          {viewsEst}
                        </span>
                      </div>
                    </div>

                    {/* Title */}
                    <h3 className="text-xs font-bold text-foreground line-clamp-2 leading-snug group-hover:text-primary transition-colors">
                      {phrase.title}
                    </h3>

                    {/* Hook Callout */}
                    {(phrase.hook || phrase.hook_intro) && (
                      <div className="bg-muted/40 border border-border/50 rounded-lg p-2.5 text-[11px] text-foreground/90 italic line-clamp-2">
                        "{phrase.hook || phrase.hook_intro}"
                      </div>
                    )}

                    {/* Excerpt */}
                    <p className="text-[11px] text-muted-foreground line-clamp-3 leading-relaxed">
                      {phrase.phrase}
                    </p>
                  </div>

                  {/* Card Footer Actions */}
                  <div className="pt-3 mt-3 border-t border-border/60 flex items-center justify-between gap-2">
                    <button
                      onClick={() => handleInspectPhrase(phrase)}
                      className="text-xs text-muted-foreground hover:text-foreground font-medium px-2 py-1 rounded hover:bg-muted/60 transition-colors"
                    >
                      Dettagli &amp; Copy
                    </button>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled
                        className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 font-medium transition-colors"
                        title="Apri nello Studio Video OpenChatCut"
                      >
                        <Play className="h-3 w-3" />
                        Editor non connesso
                      </button>
                      <Button
                        size="sm"
                        onClick={() => handleSchedulePhrase(phrase)}
                        className="h-7 text-[11px] px-2.5 gap-1 bg-primary text-primary-foreground font-semibold"
                      >
                        <Calendar className="h-3 w-3" />
                        Richiedi pianificazione
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Slide-Over Publication Inspection Drawer */}
      {selectedItem && (
        <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-card/98 backdrop-blur-xl border-l border-border shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
          {/* Drawer Header */}
          <div className="p-5 border-b border-border flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider"
                  style={{
                    backgroundColor: `${selectedItem.channelColor}20`,
                    color: selectedItem.channelColor,
                    border: `1px solid ${selectedItem.channelColor}40`,
                  }}
                >
                  {selectedItem.channelLabel}
                </span>
                <span className="text-[10px] font-mono bg-muted px-2 py-0.5 rounded text-foreground font-semibold">
                  {selectedItem.id}
                </span>
              </div>
              <h3 className="text-base font-bold text-foreground leading-snug">
                {selectedItem.title}
              </h3>
            </div>
            <button
              onClick={() => setSelectedItem(null)}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Drawer Body */}
          <div className="p-5 space-y-5 flex-1 overflow-y-auto text-xs">
            {/* Schedule & Timing Info */}
            <div className="grid grid-cols-2 gap-3 bg-muted/30 p-3 rounded-lg border border-border/60">
              <div>
                <span className="text-[10px] font-semibold text-muted-foreground uppercase">
                  Data Pubblicazione
                </span>
                <p className="font-mono font-bold text-foreground mt-0.5 flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-primary" />
                  {selectedItem.scheduledDate} {selectedItem.scheduledTime ? `• ${selectedItem.scheduledTime}` : ""}
                </p>
              </div>
              <div>
                <span className="text-[10px] font-semibold text-muted-foreground uppercase">
                  Fase di Workflow
                </span>
                <p className="font-bold text-emerald-400 capitalize mt-0.5">
                  {selectedItem.phase}
                </p>
              </div>
            </div>

            {/* Assigned Sovereign Leader */}
            <div>
              <h4 className="font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-cyan-400" />
                Sovereign Leader Custode
              </h4>
              <div className="p-3 rounded-lg border border-border/60 bg-card flex items-center justify-between">
                <div>
                  <span className="font-bold text-foreground block">
                    {selectedItem.assignedLeader}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {selectedItem.leaderRole}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-cyan-400 font-semibold bg-cyan-400/10 px-2 py-0.5 rounded border border-cyan-400/20">
                  Top 25 Sovereign
                </span>
              </div>
            </div>

            {/* Hook & Psychological Angle */}
            <div>
              <h4 className="font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                Gancio Semantico & Pattern Interrupt
              </h4>
              <div className="bg-muted/40 p-3 rounded-lg border border-border/60 italic text-foreground/90 leading-relaxed">
                "{selectedItem.hookFormula}"
              </div>
            </div>

            {/* Full Script or Copy Draft */}
            <div>
              <h4 className="font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-indigo-400" />
                Script / Copy Completo
              </h4>
              <div className="bg-card p-3.5 rounded-lg border border-border/70 font-mono text-[11px] leading-relaxed text-foreground whitespace-pre-wrap">
                {selectedItem.fullScript ||
                  "Generazione script in corso tramite pipeline sovereign..."}
              </div>
            </div>

            {/* Performance Target KPIs */}
            <div>
              <h4 className="font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Target className="h-3.5 w-3.5 text-rose-400" />
                Target KPI di Rendimento
              </h4>
              <div className="p-2.5 bg-primary/5 rounded-lg border border-primary/20 text-primary font-mono font-bold">
                {selectedItem.metricsTarget}
              </div>
            </div>
          </div>

          {/* Drawer Footer Actions */}
          <div className="p-4 border-t border-border bg-card flex items-center justify-between gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedItem(null)}
              className="text-xs"
            >
              Chiudi
            </Button>
            <div className="flex items-center gap-2">
              <button type="button" disabled title="Studio esterno non connesso" className="inline-flex items-center rounded-lg border border-border bg-muted px-3 py-1.5 text-xs text-muted-foreground">Integrazione non connessa</button>
              <Button
                size="sm"
                onClick={() => {
                  setSelectedItem(null);
                  openNewIssue();
                }}
                className="text-xs bg-primary text-primary-foreground font-semibold"
              >
                Modifica con Leader
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
