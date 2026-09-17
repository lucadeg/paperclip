import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  Play,
  Plus,
  Trash2,
  Zap,
  Bot,
  Sparkles,
  Cpu,
  Layers,
  Settings2,
  Maximize2,
  Minimize2,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Save,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  Network,
  Database,
  Search,
  Sliders,
  X,
  ChevronDown,
  FileCode,
  Code,
  Copy,
  ExternalLink,
  Shield,
  UserCheck,
  TrendingUp,
  Brain,
  Award,
  Megaphone
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface WorkflowNode {
  id: string;
  type: "trigger" | "agent" | "make" | "skill" | "action";
  title: string;
  subtitle?: string;
  icon?: string;
  avatar?: string;
  position: { x: number; y: number };
  config: Record<string, any>;
  status?: "idle" | "running" | "success" | "failed";
  lastRunOutput?: any;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

export interface ProjectWorkflow {
  id: string;
  companyId: string;
  projectId: string;
  name: string;
  description: string;
  status: "active" | "draft" | "paused";
  engine: "make" | "hermes";
  makeWebhookUrl?: string;
  makeScenarioId?: string;
  triggerType?: string;
  schedule?: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  lastRunAt?: string | null;
  lastStatus?: "idle" | "succeeded" | "failed" | "running";
  createdAt: string;
  updatedAt: string;
}

interface Props {
  projectId: string;
  companyId: string;
  projectName?: string;
}

const LEADER_OPTIONS = [
  { id: "sales-belfort", name: "Jordan Belfort", role: "Straight-Line Closer", dept: "SALES", avatar: "/assets/avatars/sales-belfort.jpg" },
  { id: "ai-karpathy", name: "Andrej Karpathy", role: "Software 3.0 Architect", dept: "INTELLIGENCE", avatar: "/assets/avatars/ai-karpathy.jpg" },
  { id: "sales-hormozi", name: "Alex Hormozi", role: "$100M Grand Slam Offers", dept: "SALES", avatar: "/assets/avatars/sales-hormozi.jpg" },
  { id: "fullstack-dhh", name: "David Heinemeier Hansson", role: "Majestic Monolith Architect", dept: "OPERATIONS", avatar: "/assets/avatars/fullstack-dhh.jpg" },
  { id: "cto-vogels", name: "Werner Vogels", role: "Design for Failure Architect", dept: "OPERATIONS", avatar: "/assets/avatars/cto-vogels.jpg" },
  { id: "critic-munger", name: "Charlie Munger", role: "Absolute Inversion Veto", dept: "INTELLIGENCE", avatar: "/assets/avatars/critic-munger.jpg" },
  { id: "marketing-godin", name: "Seth Godin", role: "Permission Marketing", dept: "MARKETING", avatar: "/assets/avatars/marketing-godin.jpg" },
  { id: "story-duarte", name: "Nancy Duarte", role: "Sparkline & Storytelling", dept: "MARKETING", avatar: "/assets/avatars/story-duarte.jpg" },
  { id: "growth-ellis", name: "Sean Ellis", role: "Growth Hacking & Testing", dept: "DEALS", avatar: "/assets/avatars/growth-ellis.jpg" },
  { id: "ceo-bezos", name: "Jeff Bezos", role: "Day 1 Customer Obsession", dept: "DEALS", avatar: "/assets/avatars/ceo-bezos.jpg" }
];

export function InfiniteCanvasWorkflowBuilder({ projectId, companyId, projectName }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  
  // Workflows state
  const [workflows, setWorkflows] = useState<ProjectWorkflow[]>([]);
  const [activeWorkflowId, setActiveWorkflowId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState<any | null>(null);
  const [showExecModal, setShowExecModal] = useState(false);

  // Active workflow data
  const currentWorkflow = useMemo(() => {
    return workflows.find((w) => w.id === activeWorkflowId) || workflows[0] || null;
  }, [workflows, activeWorkflowId]);

  // Canvas Pan & Zoom State
  const [pan, setPan] = useState({ x: 120, y: 120 });
  const [zoom, setZoom] = useState(0.95);
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0 });

  // Node Dragging State
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const dragNodeOffsetRef = useRef({ x: 0, y: 0 });

  // Edge Connection Creation State
  const [connectingSourceNodeId, setConnectingSourceNodeId] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Selection & Inspector Drawer
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [skillCatalog, setSkillCatalog] = useState<any[]>([]);
  const [skillSearchQuery, setSkillSearchQuery] = useState("");

  const selectedNode = useMemo(() => {
    if (!currentWorkflow || !selectedNodeId) return null;
    return currentWorkflow.nodes.find((n) => n.id === selectedNodeId) || null;
  }, [currentWorkflow, selectedNodeId]);

  // 1. Fetch workflows from backend for this project
  const loadWorkflows = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/companies/${companyId}/projects/${projectId}/workflows`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setWorkflows(data);
          setActiveWorkflowId(data[0].id);
          setIsLoading(false);
          return;
        }
      }
    } catch (e) {
      console.warn("[WARN] Failed to fetch project workflows:", e);
    }

    // Fallback Initial Workflow if empty
    const initialWf: ProjectWorkflow = {
      id: `wf-${projectId}-default`,
      companyId,
      projectId,
      name: `${projectName || "Progetto"} — Pipeline Make & Sovereign Agents`,
      description: "Pipeline n8n-style ad esecuzione rapida con motore Make.com e agenti Hermes.",
      status: "active",
      engine: "make",
      makeWebhookUrl: "https://hook.eu1.make.com/sovereign-mvx-b2b-lead-enrichment",
      makeScenarioId: "SCENARIO-MVX-8821",
      triggerType: "webhook",
      nodes: [
        {
          id: "node-1",
          type: "trigger",
          title: "Inbound Lead Webhook",
          subtitle: "POST /hooks/b2b-inbound",
          position: { x: 80, y: 160 },
          config: { triggerType: "webhook", authRequired: true }
        },
        {
          id: "node-2",
          type: "make",
          title: "Make.com — CRM Verification",
          subtitle: "Scenario Fast Engine",
          position: { x: 420, y: 160 },
          config: {
            webhookUrl: "https://hook.eu1.make.com/sovereign-mvx-b2b-lead-enrichment",
            scenarioId: "SCENARIO-MVX-8821"
          }
        },
        {
          id: "node-3",
          type: "agent",
          title: "Jordan Belfort",
          subtitle: "Straight-Line Sales Closer",
          avatar: "/assets/avatars/sales-belfort.jpg",
          position: { x: 780, y: 160 },
          config: {
            agentId: "sales-belfort",
            prompt: "Valuta il lead inbound, estrai obiezioni chiave e formula la sequenza Straight-Line a 3 Dieci.",
            maxIterations: 5
          }
        },
        {
          id: "node-4",
          type: "action",
          title: "Paperclip Issue Checkout",
          subtitle: "Crea task prioritario Board",
          position: { x: 1140, y: 160 },
          config: { actionType: "create_paperclip_task", priority: "high" }
        }
      ],
      edges: [
        { id: "e1-2", source: "node-1", target: "node-2" },
        { id: "e2-3", source: "node-2", target: "node-3" },
        { id: "e3-4", source: "node-3", target: "node-4" }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setWorkflows([initialWf]);
    setActiveWorkflowId(initialWf.id);
    setIsLoading(false);
  }, [companyId, projectId, projectName]);

  useEffect(() => {
    loadWorkflows();
  }, [loadWorkflows]);

  // 2. Preload skills catalog index for the skill node picker
  useEffect(() => {
    fetch("/skills_catalog_index.json")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && Array.isArray(data.skills)) {
          setSkillCatalog(data.skills.slice(0, 300)); // first 300 for search dropdown
        }
      })
      .catch(() => {});
  }, []);

  // 3. Save Workflow to Backend
  const saveWorkflow = async (wfToSave?: ProjectWorkflow) => {
    const target = wfToSave || currentWorkflow;
    if (!target) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/workflows/${target.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(target)
      });
      if (res.ok) {
        setWorkflows((prev) => prev.map((w) => (w.id === target.id ? target : w)));
      }
    } catch (e) {
      console.error("[ERROR] Failed to save workflow:", e);
    } finally {
      setIsSaving(false);
    }
  };

  // 4. Create New Workflow
  const handleCreateNewWorkflow = async () => {
    const newWf: ProjectWorkflow = {
      id: `wf-${Date.now().toString(36)}`,
      companyId,
      projectId,
      name: `Nuovo Workflow #${workflows.length + 1}`,
      description: "Pipeline personalizzata ad esecuzione rapida con motore Make.com",
      status: "active",
      engine: "make",
      makeWebhookUrl: "",
      makeScenarioId: "SCENARIO-DIRECT",
      nodes: [
        {
          id: `node-start-${Date.now()}`,
          type: "trigger",
          title: "Inbound Trigger",
          subtitle: "Avvio manuale o webhook",
          position: { x: 100, y: 200 },
          config: { triggerType: "manual" }
        }
      ],
      edges: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      await fetch(`/api/companies/${companyId}/projects/${projectId}/workflows`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newWf)
      });
    } catch (e) {
      console.warn("Could not persist new workflow immediately:", e);
    }

    setWorkflows((prev) => [...prev, newWf]);
    setActiveWorkflowId(newWf.id);
  };

  // 5. Delete Active Workflow
  const handleDeleteWorkflow = async () => {
    if (!currentWorkflow || workflows.length <= 1) return;
    if (!confirm(`Sei sicuro di voler eliminare il workflow '${currentWorkflow.name}'?`)) return;

    try {
      await fetch(`/api/workflows/${currentWorkflow.id}`, { method: "DELETE" });
    } catch (e) {}

    const remaining = workflows.filter((w) => w.id !== currentWorkflow.id);
    setWorkflows(remaining);
    setActiveWorkflowId(remaining[0].id);
    setSelectedNodeId(null);
    setIsInspectorOpen(false);
  };

  // 6. Execute Workflow (Live Make & Hermes Execution)
  const handleExecuteWorkflow = async () => {
    if (!currentWorkflow) return;
    setIsExecuting(true);
    setExecutionResult(null);
    setShowExecModal(true);

    // Light up nodes sequentially as "running"
    setWorkflows((prev) =>
      prev.map((w) => {
        if (w.id !== currentWorkflow.id) return w;
        return {
          ...w,
          nodes: w.nodes.map((n) => ({ ...n, status: "running" }))
        };
      })
    );

    try {
      const res = await fetch(`/api/workflows/${currentWorkflow.id}/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          triggeredAt: new Date().toISOString(),
          projectId,
          companyId
        })
      });

      const data = await res.json();
      setExecutionResult(data);

      // Update node statuses with real execution outputs
      if (data && Array.isArray(data.steps)) {
        const stepStatusMap = new Map<string, { status: "success" | "failed"; output: any }>();
        data.steps.forEach((s: any) => {
          stepStatusMap.set(s.nodeId, {
            status: s.status === "success" ? "success" : "failed",
            output: s.output
          });
        });

        setWorkflows((prev) =>
          prev.map((w) => {
            if (w.id !== currentWorkflow.id) return w;
            return {
              ...w,
              lastRunAt: data.executedAt,
              lastStatus: data.status || (data.ok ? "succeeded" : "failed"),
              nodes: w.nodes.map((n) => {
                const resNode = stepStatusMap.get(n.id);
                return {
                  ...n,
                  status: resNode ? resNode.status : "success",
                  lastRunOutput: resNode ? resNode.output : undefined
                };
              })
            };
          })
        );
      }
    } catch (err: any) {
      setExecutionResult({
        ok: false,
        error: `Errore di rete durante la chiamata all'engine di esecuzione: ${err.message}`
      });
      setWorkflows((prev) =>
        prev.map((w) => {
          if (w.id !== currentWorkflow.id) return w;
          return {
            ...w,
            lastStatus: "failed",
            nodes: w.nodes.map((n) => ({ ...n, status: "failed" }))
          };
        })
      );
    } finally {
      setIsExecuting(false);
    }
  };

  // Canvas Mouse Controls (Pan & Zoom)
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = 1.08;
    let newZoom = e.deltaY < 0 ? zoom * zoomFactor : zoom / zoomFactor;
    newZoom = Math.min(Math.max(newZoom, 0.35), 2.2);
    setZoom(newZoom);
  };

  const handleMouseDownCanvas = (e: React.MouseEvent) => {
    // Only pan if clicking canvas directly or middle button
    if (e.button === 1 || e.target === containerRef.current || (e.target as HTMLElement).tagName === "svg") {
      setIsPanning(true);
      panStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
      setSelectedNodeId(null);
      setSelectedEdgeId(null);
      setIsInspectorOpen(false);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({
        x: e.clientX - panStartRef.current.x,
        y: e.clientY - panStartRef.current.y
      });
    } else if (draggingNodeId && currentWorkflow) {
      const canvasRect = containerRef.current?.getBoundingClientRect();
      if (!canvasRect) return;
      const rawX = (e.clientX - canvasRect.left - pan.x) / zoom - dragNodeOffsetRef.current.x;
      const rawY = (e.clientY - canvasRect.top - pan.y) / zoom - dragNodeOffsetRef.current.y;
      
      // Snap to 10px grid
      const snappedX = Math.round(rawX / 10) * 10;
      const snappedY = Math.round(rawY / 10) * 10;

      setWorkflows((prev) =>
        prev.map((w) => {
          if (w.id !== currentWorkflow.id) return w;
          return {
            ...w,
            nodes: w.nodes.map((n) => (n.id === draggingNodeId ? { ...n, position: { x: snappedX, y: snappedY } } : n))
          };
        })
      );
    }

    if (connectingSourceNodeId && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setMousePos({
        x: (e.clientX - rect.left - pan.x) / zoom,
        y: (e.clientY - rect.top - pan.y) / zoom
      });
    }
  };

  const handleMouseUp = () => {
    if (isPanning) setIsPanning(false);
    if (draggingNodeId) {
      setDraggingNodeId(null);
      saveWorkflow();
    }
    if (connectingSourceNodeId) {
      setConnectingSourceNodeId(null);
    }
  };

  // Node Drag Start
  const startDragNode = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    setDraggingNodeId(nodeId);
    setSelectedNodeId(nodeId);
    setIsInspectorOpen(true);

    const canvasRect = containerRef.current?.getBoundingClientRect();
    if (!canvasRect || !currentWorkflow) return;
    const node = currentWorkflow.nodes.find((n) => n.id === nodeId);
    if (!node) return;

    const mouseCanvasX = (e.clientX - canvasRect.left - pan.x) / zoom;
    const mouseCanvasY = (e.clientY - canvasRect.top - pan.y) / zoom;
    dragNodeOffsetRef.current = {
      x: mouseCanvasX - node.position.x,
      y: mouseCanvasY - node.position.y
    };
  };

  // Add Edge (Port Connect)
  const handleConnectPort = (targetNodeId: string) => {
    if (!connectingSourceNodeId || connectingSourceNodeId === targetNodeId || !currentWorkflow) return;
    
    // Check if edge already exists
    const exists = currentWorkflow.edges.some(
      (e) => e.source === connectingSourceNodeId && e.target === targetNodeId
    );
    if (exists) {
      setConnectingSourceNodeId(null);
      return;
    }

    const newEdge: WorkflowEdge = {
      id: `e-${connectingSourceNodeId}-${targetNodeId}`,
      source: connectingSourceNodeId,
      target: targetNodeId
    };

    const updated = {
      ...currentWorkflow,
      edges: [...currentWorkflow.edges, newEdge]
    };

    setWorkflows((prev) => prev.map((w) => (w.id === currentWorkflow.id ? updated : w)));
    setConnectingSourceNodeId(null);
    saveWorkflow(updated);
  };

  // Delete Edge
  const handleDeleteEdge = (edgeId: string) => {
    if (!currentWorkflow) return;
    const updated = {
      ...currentWorkflow,
      edges: currentWorkflow.edges.filter((e) => e.id !== edgeId)
    };
    setWorkflows((prev) => prev.map((w) => (w.id === currentWorkflow.id ? updated : w)));
    setSelectedEdgeId(null);
    saveWorkflow(updated);
  };

  // Add Node from Palette
  const handleAddNode = (type: WorkflowNode["type"], extra: Partial<WorkflowNode> = {}) => {
    if (!currentWorkflow) return;
    const newId = `node-${type}-${Date.now().toString(36)}`;
    
    // Position near center of current viewport
    const canvasRect = containerRef.current?.getBoundingClientRect();
    const centerX = canvasRect ? (-pan.x + canvasRect.width / 2) / zoom : 200;
    const centerY = canvasRect ? (-pan.y + canvasRect.height / 2) / zoom : 200;

    let defaultTitle = "Nuovo Nodo";
    let defaultSubtitle = "";
    let defaultIcon = "Sliders";
    let config: Record<string, any> = {};

    if (type === "trigger") {
      defaultTitle = "Inbound Webhook";
      defaultSubtitle = "Trigger evento HTTP";
      defaultIcon = "Zap";
      config = { triggerType: "webhook", authRequired: true };
    } else if (type === "agent") {
      const leader = LEADER_OPTIONS[0];
      defaultTitle = leader.name;
      defaultSubtitle = leader.role;
      defaultIcon = "UserCheck";
      config = { agentId: leader.id, prompt: "Esegui il task deterministico con massima precisione." };
    } else if (type === "make") {
      defaultTitle = "Make.com Fast Engine";
      defaultSubtitle = "Scenario Webhook";
      defaultIcon = "Network";
      config = { webhookUrl: currentWorkflow.makeWebhookUrl || "", scenarioId: "SCENARIO-AUTO" };
    } else if (type === "skill") {
      defaultTitle = "Competenza Specialistica";
      defaultSubtitle = "Catalogo 5.125 Skills";
      defaultIcon = "Sparkles";
      config = { skillId: "b2b-suite-v2", skillName: "B2B OSINT Suite" };
    } else if (type === "action") {
      defaultTitle = "Azione / Deliverable";
      defaultSubtitle = "Paperclip Issue Checkout";
      defaultIcon = "CheckCircle2";
      config = { actionType: "create_paperclip_task", priority: "high" };
    }

    const newNode: WorkflowNode = {
      id: newId,
      type,
      title: extra.title || defaultTitle,
      subtitle: extra.subtitle || defaultSubtitle,
      icon: extra.icon || defaultIcon,
      avatar: extra.avatar,
      position: { x: Math.round(centerX / 10) * 10, y: Math.round(centerY / 10) * 10 },
      config: { ...config, ...extra.config }
    };

    const updated = {
      ...currentWorkflow,
      nodes: [...currentWorkflow.nodes, newNode]
    };

    setWorkflows((prev) => prev.map((w) => (w.id === currentWorkflow.id ? updated : w)));
    setSelectedNodeId(newNode.id);
    setIsInspectorOpen(true);
    setIsPaletteOpen(false);
    saveWorkflow(updated);
  };

  // Delete Node
  const handleDeleteNode = (nodeId: string) => {
    if (!currentWorkflow) return;
    const updated = {
      ...currentWorkflow,
      nodes: currentWorkflow.nodes.filter((n) => n.id !== nodeId),
      edges: currentWorkflow.edges.filter((e) => e.source !== nodeId && e.target !== nodeId)
    };
    setWorkflows((prev) => prev.map((w) => (w.id === currentWorkflow.id ? updated : w)));
    if (selectedNodeId === nodeId) {
      setSelectedNodeId(null);
      setIsInspectorOpen(false);
    }
    saveWorkflow(updated);
  };

  // Update Node Config
  const updateSelectedNodeConfig = (patch: Partial<WorkflowNode>) => {
    if (!currentWorkflow || !selectedNodeId) return;
    const updated = {
      ...currentWorkflow,
      nodes: currentWorkflow.nodes.map((n) => {
        if (n.id !== selectedNodeId) return n;
        return {
          ...n,
          ...patch,
          config: { ...n.config, ...(patch.config || {}) }
        };
      })
    };
    setWorkflows((prev) => prev.map((w) => (w.id === currentWorkflow.id ? updated : w)));
  };

  // Render SVG Bezier Curve between nodes
  const renderBezierEdge = (edge: WorkflowEdge) => {
    if (!currentWorkflow) return null;
    const sourceNode = currentWorkflow.nodes.find((n) => n.id === edge.source);
    const targetNode = currentWorkflow.nodes.find((n) => n.id === edge.target);
    if (!sourceNode || !targetNode) return null;

    // Node dimensions (approx 240px wide, 80px high)
    const x1 = sourceNode.position.x + 230;
    const y1 = sourceNode.position.y + 40;
    const x2 = targetNode.position.x;
    const y2 = targetNode.position.y + 40;

    const dx = Math.abs(x2 - x1) * 0.55;
    const path = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;

    const isSelected = selectedEdgeId === edge.id;

    return (
      <g key={edge.id} className="cursor-pointer group" onClick={() => setSelectedEdgeId(edge.id)}>
        {/* Invisible wider hit area for easy selection */}
        <path d={path} fill="none" stroke="transparent" strokeWidth={18} />
        {/* Visible Cable */}
        <path
          d={path}
          fill="none"
          stroke={isSelected ? "#38bdf8" : "rgba(148, 163, 184, 0.45)"}
          strokeWidth={isSelected ? 3.5 : 2}
          className="transition-colors group-hover:stroke-sky-400"
        />
        {/* Flow particles when running */}
        {isExecuting && (
          <path
            d={path}
            fill="none"
            stroke="#38bdf8"
            strokeWidth={3}
            strokeDasharray="6 8"
            className="animate-pulse"
          />
        )}
        {/* Center delete button on hover/selected */}
        {isSelected && (
          <foreignObject
            x={(x1 + x2) / 2 - 12}
            y={(y1 + y2) / 2 - 12}
            width={24}
            height={24}
            className="overflow-visible"
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteEdge(edge.id);
              }}
              className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-600 text-white shadow-lg hover:bg-rose-700"
              title="Elimina connessione"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </foreignObject>
        )}
      </g>
    );
  };

  return (
    <div className="relative flex h-[780px] w-full flex-col overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
      {/* Top Workflow Toolbar */}
      <div className="z-20 flex h-14 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600/20 text-indigo-400 font-bold text-xs border border-indigo-500/30">
              n8n
            </span>
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Make.com Engine
            </span>
          </div>

          <div className="h-5 w-px bg-border" />

          {/* Workflow Selector Dropdown */}
          <div className="flex items-center gap-2">
            <select
              value={activeWorkflowId || ""}
              onChange={(e) => {
                setActiveWorkflowId(e.target.value);
                setSelectedNodeId(null);
                setIsInspectorOpen(false);
              }}
              className="h-8 rounded-md border border-border bg-muted/60 px-2.5 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-sky-500"
            >
              {workflows.map((wf) => (
                <option key={wf.id} value={wf.id}>
                  {wf.name} {wf.lastStatus ? `(${wf.lastStatus})` : ""}
                </option>
              ))}
            </select>

            <Button
              variant="outline"
              size="sm"
              onClick={handleCreateNewWorkflow}
              className="h-8 gap-1.5 text-xs"
              title="Crea nuovo workflow per questo progetto"
            >
              <Plus className="h-3.5 w-3.5" /> Nuovo
            </Button>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {currentWorkflow?.lastRunAt && (
            <span className="hidden text-xs text-muted-foreground sm:inline-flex items-center gap-1 mr-2">
              <Clock className="h-3.5 w-3.5" /> Ultimo run: {new Date(currentWorkflow.lastRunAt).toLocaleTimeString()}
            </span>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => saveWorkflow()}
            disabled={isSaving}
            className="h-8 gap-1.5 text-xs"
          >
            <Save className="h-3.5 w-3.5" /> {isSaving ? "Salvataggio..." : "Salva"}
          </Button>

          <Button
            size="sm"
            onClick={handleExecuteWorkflow}
            disabled={isExecuting || !currentWorkflow}
            className="h-8 gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 font-semibold text-xs text-white shadow-md hover:from-emerald-500 hover:to-teal-500"
          >
            <Play className={cn("h-3.5 w-3.5 fill-current", isExecuting && "animate-spin")} />
            {isExecuting ? "Esecuzione Live..." : "Esegui Workflow"}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleDeleteWorkflow}
            disabled={workflows.length <= 1}
            className="h-8 text-rose-500 hover:bg-rose-500/10 hover:text-rose-400"
            title="Elimina workflow"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Infinite Canvas Container */}
      <div
        ref={containerRef}
        onWheel={handleWheel}
        onMouseDown={handleMouseDownCanvas}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        className={cn(
          "relative flex-1 select-none overflow-hidden cursor-crosshair bg-[#090d1a]",
          isPanning && "cursor-grabbing"
        )}
      >
        {/* Infinite Dot Grid Background */}
        <div
          className="pointer-events-none absolute inset-0 h-full w-full"
          style={{
            backgroundImage: `radial-gradient(rgba(148, 163, 184, 0.18) 1.2px, transparent 1.2px)`,
            backgroundSize: `${24 * zoom}px ${24 * zoom}px`,
            backgroundPosition: `${pan.x}px ${pan.y}px`
          }}
        />

        {/* Transformation World Layer */}
        <div
          className="absolute inset-0 origin-top-left"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`
          }}
        >
          {/* SVG Connection Cables */}
          <svg className="pointer-events-auto absolute -top-[5000px] -left-[5000px] h-[10000px] w-[10000px] overflow-visible">
            {currentWorkflow?.edges.map((edge) => renderBezierEdge(edge))}

            {/* In-flight connecting cable while dragging output port */}
            {connectingSourceNodeId && currentWorkflow && (() => {
              const src = currentWorkflow.nodes.find((n) => n.id === connectingSourceNodeId);
              if (!src) return null;
              const x1 = src.position.x + 230;
              const y1 = src.position.y + 40;
              const x2 = mousePos.x;
              const y2 = mousePos.y;
              const dx = Math.abs(x2 - x1) * 0.5;
              const path = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
              return (
                <path
                  d={path}
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth={2.5}
                  strokeDasharray="4 4"
                  className="animate-pulse"
                />
              );
            })()}
          </svg>

          {/* Render Visual Nodes */}
          {currentWorkflow?.nodes.map((node) => {
            const isSelected = selectedNodeId === node.id;
            const isRunning = node.status === "running" || isExecuting;
            const isFailed = node.status === "failed";
            const isSuccess = node.status === "success";

            return (
              <div
                key={node.id}
                onMouseDown={(e) => startDragNode(e, node.id)}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedNodeId(node.id);
                  setIsInspectorOpen(true);
                }}
                className={cn(
                  "absolute z-10 w-[230px] rounded-xl border bg-background/95 p-3.5 shadow-xl backdrop-blur-md transition-shadow cursor-grab active:cursor-grabbing",
                  isSelected ? "border-sky-500 ring-2 ring-sky-500/30" : "border-border/80 hover:border-slate-600",
                  isRunning && "border-amber-400 ring-2 ring-amber-400/40 animate-pulse",
                  isFailed && "border-rose-500 ring-2 ring-rose-500/40",
                  isSuccess && "border-emerald-500/80"
                )}
                style={{
                  left: `${node.position.x}px`,
                  top: `${node.position.y}px`
                }}
              >
                {/* Input Connection Port (Left Handle) */}
                <div
                  onMouseUp={(e) => {
                    e.stopPropagation();
                    handleConnectPort(node.id);
                  }}
                  className="absolute -left-2.5 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full border-2 border-background bg-slate-400 transition-transform hover:scale-125 hover:bg-sky-400 cursor-crosshair"
                  title="Connetti input"
                />

                {/* Node Header */}
                <div className="flex items-center gap-2.5">
                  {node.avatar ? (
                    <img
                      src={node.avatar}
                      alt={node.title}
                      className="h-8 w-8 rounded-full border border-amber-400/40 object-cover shadow-inner shrink-0"
                    />
                  ) : (
                    <div
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-lg border text-white shadow-inner shrink-0",
                        node.type === "trigger" && "bg-amber-600/30 border-amber-500/40 text-amber-400",
                        node.type === "make" && "bg-purple-600/30 border-purple-500/40 text-purple-400",
                        node.type === "agent" && "bg-sky-600/30 border-sky-500/40 text-sky-400",
                        node.type === "skill" && "bg-emerald-600/30 border-emerald-500/40 text-emerald-400",
                        node.type === "action" && "bg-blue-600/30 border-blue-500/40 text-blue-400"
                      )}
                    >
                      {node.type === "trigger" && <Zap className="h-4 w-4" />}
                      {node.type === "make" && <Network className="h-4 w-4" />}
                      {node.type === "agent" && <Bot className="h-4 w-4" />}
                      {node.type === "skill" && <Sparkles className="h-4 w-4" />}
                      {node.type === "action" && <CheckCircle2 className="h-4 w-4" />}
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="truncate text-xs font-bold text-foreground">
                        {node.title}
                      </span>
                      {node.status && (
                        <span
                          className={cn(
                            "h-2 w-2 rounded-full",
                            node.status === "idle" && "bg-slate-400",
                            node.status === "running" && "bg-amber-400 animate-ping",
                            node.status === "success" && "bg-emerald-400",
                            node.status === "failed" && "bg-rose-500"
                          )}
                        />
                      )}
                    </div>
                    <p className="truncate text-[10px] text-muted-foreground">
                      {node.subtitle || node.type.toUpperCase()}
                    </p>
                  </div>
                </div>

                {/* Node Summary Snippet */}
                <div className="mt-2.5 rounded-md bg-muted/40 px-2 py-1 text-[10px] text-muted-foreground truncate border border-border/40">
                  {node.type === "make" && (node.config.webhookUrl ? "URL Configurato" : "⚠️ Webhook mancante")}
                  {node.type === "agent" && `Agente: ${node.config.agentId || "sales-belfort"}`}
                  {node.type === "skill" && `Skill: ${node.config.skillName || node.config.skillId || "5.125 Catalog"}`}
                  {node.type === "trigger" && `Trigger: ${node.config.triggerType || "manual"}`}
                  {node.type === "action" && `Azione: ${node.config.actionType || "Paperclip Task"}`}
                </div>

                {/* Output Connection Port (Right Handle) */}
                <div
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    setConnectingSourceNodeId(node.id);
                  }}
                  className="absolute -right-2.5 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full border-2 border-background bg-sky-500 transition-transform hover:scale-125 hover:bg-sky-400 cursor-crosshair shadow-md"
                  title="Trascina per collegare al nodo successivo"
                />
              </div>
            );
          })}
        </div>

        {/* Floating Canvas Controls (HUD) */}
        <div className="absolute bottom-4 left-4 z-20 flex items-center gap-1.5 rounded-lg border border-border bg-background/90 p-1.5 shadow-lg backdrop-blur-md">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setZoom((z) => Math.min(z * 1.15, 2.2))}
            title="Zoom In"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <span className="w-10 text-center font-mono text-[11px] text-muted-foreground">
            {Math.round(zoom * 100)}%
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setZoom((z) => Math.max(z / 1.15, 0.35))}
            title="Zoom Out"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <div className="h-4 w-px bg-border" />
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => {
              setPan({ x: 120, y: 120 });
              setZoom(0.95);
            }}
            title="Reimposta visuale"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>

        {/* Floating Add Node Button */}
        <div className="absolute top-4 left-4 z-20">
          <Button
            onClick={() => setIsPaletteOpen((prev) => !prev)}
            className="h-9 gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-lg"
          >
            <Plus className="h-4 w-4" /> Aggiungi Nodo
          </Button>

          {/* Node Palette Dropdown */}
          {isPaletteOpen && (
            <div className="absolute top-11 left-0 z-30 w-64 rounded-xl border border-border bg-popover p-2 shadow-2xl backdrop-blur-xl">
              <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Libreria Nodi Esecuzione
              </div>
              <div className="space-y-1">
                <button
                  onClick={() => handleAddNode("trigger")}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-foreground hover:bg-accent"
                >
                  <div className="flex h-6 w-6 items-center justify-center rounded bg-amber-500/20 text-amber-400">
                    <Zap className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <div>Inbound Trigger</div>
                    <div className="text-[10px] text-muted-foreground">Webhook o pianificazione</div>
                  </div>
                </button>

                <button
                  onClick={() => handleAddNode("make")}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-foreground hover:bg-accent"
                >
                  <div className="flex h-6 w-6 items-center justify-center rounded bg-purple-500/20 text-purple-400">
                    <Network className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <div>Make.com Webhook</div>
                    <div className="text-[10px] text-muted-foreground">Motore gratuito & veloce</div>
                  </div>
                </button>

                <button
                  onClick={() => handleAddNode("agent")}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-foreground hover:bg-accent"
                >
                  <div className="flex h-6 w-6 items-center justify-center rounded bg-sky-500/20 text-sky-400">
                    <Bot className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <div>Sovereign Agent</div>
                    <div className="text-[10px] text-muted-foreground">27 Leader del Consiglio</div>
                  </div>
                </button>

                <button
                  onClick={() => handleAddNode("skill")}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-foreground hover:bg-accent"
                >
                  <div className="flex h-6 w-6 items-center justify-center rounded bg-emerald-500/20 text-emerald-400">
                    <Sparkles className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <div>5.125 Skills Selector</div>
                    <div className="text-[10px] text-muted-foreground">Competenze da catalogo</div>
                  </div>
                </button>

                <button
                  onClick={() => handleAddNode("action")}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-foreground hover:bg-accent"
                >
                  <div className="flex h-6 w-6 items-center justify-center rounded bg-blue-500/20 text-blue-400">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <div>Paperclip Action</div>
                    <div className="text-[10px] text-muted-foreground">Crea task & Notifiche</div>
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Node Inspector Drawer (Right Panel) */}
        {isInspectorOpen && selectedNode && (
          <div className="absolute top-0 right-0 z-30 flex h-full w-80 flex-col border-l border-border bg-background/95 p-4 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Settings2 className="h-4 w-4 text-sky-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Configura Nodo
                </span>
              </div>
              <button
                onClick={() => setIsInspectorOpen(false)}
                className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto py-3 text-xs">
              {/* Title & Subtitle */}
              <div>
                <label className="block text-[10px] font-semibold uppercase text-muted-foreground mb-1">
                  Titolo Nodo
                </label>
                <Input
                  value={selectedNode.title}
                  onChange={(e) => updateSelectedNodeConfig({ title: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold uppercase text-muted-foreground mb-1">
                  Sottotitolo
                </label>
                <Input
                  value={selectedNode.subtitle || ""}
                  onChange={(e) => updateSelectedNodeConfig({ subtitle: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>

              {/* Node Type Specific Configs */}
              {selectedNode.type === "make" && (
                <div className="space-y-3 rounded-lg border border-purple-500/30 bg-purple-500/5 p-3">
                  <div className="flex items-center gap-2 text-purple-400 font-semibold text-xs">
                    <Network className="h-4 w-4" /> Parametri Make.com
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-muted-foreground mb-1">
                      Webhook URL (HTTP Endpoint)
                    </label>
                    <Input
                      placeholder="https://hook.eu1.make.com/..."
                      value={selectedNode.config.webhookUrl || ""}
                      onChange={(e) =>
                        updateSelectedNodeConfig({
                          config: { ...selectedNode.config, webhookUrl: e.target.value }
                        })
                      }
                      className="h-8 text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-muted-foreground mb-1">
                      Scenario ID
                    </label>
                    <Input
                      placeholder="SCENARIO-1234"
                      value={selectedNode.config.scenarioId || ""}
                      onChange={(e) =>
                        updateSelectedNodeConfig({
                          config: { ...selectedNode.config, scenarioId: e.target.value }
                        })
                      }
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                </div>
              )}

              {selectedNode.type === "agent" && (
                <div className="space-y-3 rounded-lg border border-sky-500/30 bg-sky-500/5 p-3">
                  <div className="flex items-center gap-2 text-sky-400 font-semibold text-xs">
                    <Bot className="h-4 w-4" /> Sovereign Leader
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-muted-foreground mb-1">
                      Assegna Leader
                    </label>
                    <select
                      value={selectedNode.config.agentId || "sales-belfort"}
                      onChange={(e) => {
                        const leader = LEADER_OPTIONS.find((l) => l.id === e.target.value);
                        updateSelectedNodeConfig({
                          title: leader ? leader.name : selectedNode.title,
                          subtitle: leader ? leader.role : selectedNode.subtitle,
                          avatar: leader?.avatar,
                          config: { ...selectedNode.config, agentId: e.target.value }
                        });
                      }}
                      className="h-8 w-full rounded-md border border-border bg-background px-2 text-xs"
                    >
                      {LEADER_OPTIONS.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.name} — {l.role} ({l.dept})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-muted-foreground mb-1">
                      Prompt / Direttiva Esecutiva
                    </label>
                    <textarea
                      rows={3}
                      value={selectedNode.config.prompt || ""}
                      onChange={(e) =>
                        updateSelectedNodeConfig({
                          config: { ...selectedNode.config, prompt: e.target.value }
                        })
                      }
                      className="w-full rounded-md border border-border bg-background p-2 text-xs focus:outline-none focus:ring-1 focus:ring-sky-500"
                      placeholder="Istruzioni specifiche per l'agente Hermes..."
                    />
                  </div>
                </div>
              )}

              {selectedNode.type === "skill" && (
                <div className="space-y-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3">
                  <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs">
                    <Sparkles className="h-4 w-4" /> Selezione Skill (5.125 Catalog)
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-muted-foreground mb-1">
                      Cerca tra 5.125 Skills
                    </label>
                    <Input
                      placeholder="Cerca per nome o reparto..."
                      value={skillSearchQuery}
                      onChange={(e) => setSkillSearchQuery(e.target.value)}
                      className="h-8 text-xs mb-2"
                    />

                    <select
                      value={selectedNode.config.skillId || ""}
                      onChange={(e) => {
                        const sk = skillCatalog.find((s) => s.id === e.target.value);
                        updateSelectedNodeConfig({
                          title: sk ? sk.name : selectedNode.title,
                          subtitle: sk ? `Skill: ${sk.department}` : selectedNode.subtitle,
                          config: {
                            ...selectedNode.config,
                            skillId: e.target.value,
                            skillName: sk?.name,
                            sourceLocator: sk?.path
                          }
                        });
                      }}
                      className="h-8 w-full rounded-md border border-border bg-background px-2 text-xs"
                    >
                      {skillCatalog
                        .filter(
                          (s) =>
                            !skillSearchQuery ||
                            s.name.toLowerCase().includes(skillSearchQuery.toLowerCase()) ||
                            s.department.toLowerCase().includes(skillSearchQuery.toLowerCase())
                        )
                        .slice(0, 50)
                        .map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} ({s.department})
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Execution Output Preview if node was run */}
              {selectedNode.lastRunOutput && (
                <div className="rounded-lg border border-border bg-muted/30 p-2.5">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Ricevuta Ultima Esecuzione
                  </div>
                  <pre className="max-h-40 overflow-y-auto font-mono text-[10px] text-foreground/80 whitespace-pre-wrap">
                    {JSON.stringify(selectedNode.lastRunOutput, null, 2)}
                  </pre>
                </div>
              )}

              <div className="pt-2">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDeleteNode(selectedNode.id)}
                  className="w-full gap-2 text-xs"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Elimina questo nodo
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Execution Results Modal Dialog */}
      {showExecModal && executionResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-xl border border-border bg-background shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
              <div className="flex items-center gap-2.5">
                {executionResult.ok ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-rose-500" />
                )}
                <div>
                  <h3 className="text-sm font-bold text-foreground">
                    {executionResult.ok ? "Esecuzione Workflow Riuscita" : "Esecuzione Terminata con Errori"}
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    Durata totale: {executionResult.totalDurationMs || 0} ms · {executionResult.totalSteps || 0} Nodi
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowExecModal(false)}
                className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-3.5 text-xs">
              <div className="rounded-lg bg-muted/40 p-3 border border-border/60">
                <p className="font-medium text-foreground">{executionResult.message}</p>
                {executionResult.error && (
                  <p className="mt-1 font-mono text-rose-400 text-[11px]">{executionResult.error}</p>
                )}
              </div>

              {/* Step By Step Receipt Breakdown */}
              {Array.isArray(executionResult.steps) && (
                <div className="space-y-2">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Dettaglio Esecuzione per Singolo Step
                  </h4>
                  {executionResult.steps.map((step: any, idx: number) => (
                    <div
                      key={step.nodeId || idx}
                      className={cn(
                        "rounded-lg border p-3",
                        step.status === "success"
                          ? "border-emerald-500/30 bg-emerald-500/5"
                          : "border-rose-500/30 bg-rose-500/5"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 font-semibold">
                          {step.status === "success" ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-rose-400" />
                          )}
                          <span>
                            {idx + 1}. {step.title}
                          </span>
                          <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono uppercase text-muted-foreground">
                            {step.type}
                          </span>
                        </div>
                        <span className="font-mono text-[10px] text-muted-foreground">
                          {step.durationMs} ms
                        </span>
                      </div>

                      <pre className="mt-2 max-h-32 overflow-y-auto rounded bg-background/80 p-2 font-mono text-[10px] text-muted-foreground whitespace-pre-wrap">
                        {JSON.stringify(step.output, null, 2)}
                      </pre>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end border-t border-border px-5 py-3 bg-muted/20">
              <Button size="sm" onClick={() => setShowExecModal(false)} className="text-xs">
                Chiudi
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
