import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  Filter,
  Search,
  CheckCircle2,
  AlertCircle,
  Plus,
  X,
  Target,
  Terminal,
  Key,
  Layers,
  Sparkles,
  ExternalLink,
  LayoutGrid,
  Globe2,
  ChevronRight,
  Shield,
  Brain,
  Users,
  Briefcase,
  TrendingUp,
  Award,
  Megaphone,
  Compass,
  Cpu,
  Server,
  Database,
  Code,
  Cloud,
  UserCheck,
} from "lucide-react";
import {
  STATIC_SKILL_TREE,
  fetchSkillTreeData,
  type SkillNode,
  type SkillEdge,
  type DepartmentInfo,
  type SkillTreePayload,
  type SkillItem,
} from "@/lib/skill-tree-data";
import { useDialogActions } from "@/context/DialogContext";
import { Button } from "@/components/ui/button";

interface StarParticle {
  x: number;
  y: number;
  size: number;
  speed: number;
  opacity: number;
  baseOpacity: number;
  pulseSpeed: number;
}

interface SkillStar {
  id: string;
  name: string;
  department: string;
  hub?: string;
  color: string;
  x: number;
  y: number;
  size: number;
  suggestedAgent?: string;
  description?: string;
}

const DEPT_CONFIGS: Record<string, { angle: number; color: string; icon: typeof Cpu; label: string }> = {
  OPERATIONS: { angle: -Math.PI / 2, color: "#06b6d4", icon: Cpu, label: "Operations & Infrastructure" },
  INTELLIGENCE: { angle: -Math.PI / 4.5, color: "#818cf8", icon: Brain, label: "Intelligence & Strategy" },
  CUSTOMER: { angle: 0, color: "#10b981", icon: Users, label: "Customer Experience" },
  "BACK OFFICE": { angle: Math.PI / 4.5, color: "#a855f7", icon: Shield, label: "Back Office & Compliance" },
  SALES: { angle: Math.PI / 2, color: "#f59e0b", icon: TrendingUp, label: "Sales & Conversion" },
  DEALS: { angle: (3 * Math.PI) / 4.2, color: "#f43f5e", icon: Award, label: "Deals & Commerce" },
  MARKETING: { angle: Math.PI, color: "#38bdf8", icon: Megaphone, label: "Marketing & Brand Scale" },
};

const LEADER_AVATARS: Record<string, string> = {
  "cto-vogels": "/assets/avatars/cto-vogels.jpg",
  "fullstack-dhh": "/assets/avatars/fullstack-dhh.jpg",
  "operations-pg": "/assets/avatars/operations-pg.jpg",
  "devops-hightower": "/assets/avatars/devops-hightower.jpg",
  "ai-karpathy": "/assets/avatars/ai-karpathy.jpg",
  "critic-munger": "/assets/avatars/critic-munger.jpg",
  "research-thompson": "/assets/avatars/research-thompson.jpg",
  "consulting-bower": "/assets/avatars/consulting-bower.jpg",
  "product-norman": "/assets/avatars/product-norman.jpg",
  "interaction-cooper": "/assets/avatars/interaction-cooper.jpg",
  "comm-voss": "/assets/avatars/comm-voss.jpg",
  "community-garyvee": "/assets/avatars/community-garyvee.jpg",
  "marketing-godin": "/assets/avatars/marketing-godin.jpg",
  "branding-neumeier": "/assets/avatars/branding-neumeier.jpg",
  "ui-duarte": "/assets/avatars/story-duarte.jpg",
  "story-duarte": "/assets/avatars/story-duarte.jpg",
  "social-zuckerberg": "/assets/avatars/social-zuckerberg.jpg",
  "psych-cialdini": "/assets/avatars/psych-cialdini.jpg",
  "sales-ross": "/assets/avatars/sales-ross.jpg",
  "sales-hormozi": "/assets/avatars/sales-hormozi.jpg",
  "sales-commercial-offer-architect": "/assets/avatars/sales-commercial-offer-architect.jpg",
  "sales-belfort": "/assets/avatars/sales-belfort.jpg",
  "jordan-belfort": "/assets/avatars/sales-belfort.jpg",
  "growth-ellis": "/assets/avatars/growth-ellis.jpg",
  "growth-chen": "/assets/avatars/growth-chen.jpg",
  "ceo-bezos": "/assets/avatars/ceo-bezos.jpg",
  "ecommerce-lutke": "/assets/avatars/ecommerce-lutke.jpg",
  "cfo-campbell": "/assets/avatars/cfo-campbell.jpg",
  "mindset-naval": "/assets/avatars/mindset-naval.jpg",
  "qa-bach": "/assets/avatars/qa-bach.jpg",
  "people-mccord": "/assets/avatars/people-mccord.jpg",
  "legal-frankel": "/assets/avatars/legal-frankel.jpg",
  "media-hastings": "/assets/avatars/media-hastings.jpg",
};

export function SkillTreeGalactic() {
  const { openNewIssue } = useDialogActions();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [graphData, setGraphData] = useState<SkillTreePayload>(STATIC_SKILL_TREE);
  const [selectedNode, setSelectedNode] = useState<SkillNode | null>(null);
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [viewMode, setViewMode] = useState<"galactic" | "matrix">("galactic");
  const [matrixPage, setMatrixPage] = useState<number>(1);

  // Avatar Images Cache
  const avatarImagesRef = useRef<Map<string, HTMLImageElement>>(new Map());

  // Canvas Viewport Transformation
  const viewState = useRef({
    scale: 0.88,
    offsetX: 0,
    offsetY: 0,
    isDragging: false,
    dragStartX: 0,
    dragStartY: 0,
    hoveredNodeId: null as string | null,
    hoveredStarId: null as string | null,
    hasUserPanned: false,
  });

  // Starfield particles & 5,125 Skills Constellation
  const starsRef = useRef<StarParticle[]>([]);
  const skillStarsRef = useRef<SkillStar[]>([]);

  // Preload all 27 leader avatars
  useEffect(() => {
    Object.entries(LEADER_AVATARS).forEach(([id, src]) => {
      if (!avatarImagesRef.current.has(id)) {
        const img = new Image();
        img.src = src;
        img.onload = () => {
          avatarImagesRef.current.set(id, img);
        };
      }
    });
  }, []);

  // Fetch full skill tree from backend (/api/skill-tree)
  useEffect(() => {
    fetchSkillTreeData().then((payload) => {
      if (payload && payload.graph && payload.graph.nodes.length > 0) {
        setGraphData(payload);
      }
    });
  }, []);

  // Calculate clean, collision-free node positions organized by sector
  const nodePositions = useMemo(() => {
    const positions = new Map<string, { x: number; y: number }>();
    const departments = graphData.departments || [];
    const nodes = graphData.graph?.nodes || [];

    positions.set("root", { x: 0, y: 0 });
    positions.set("core-council", { x: 0, y: 0 });

    const deptGroups: Record<string, { deptNode?: SkillNode; agents: SkillNode[]; hubs: SkillNode[]; skills: SkillNode[] }> = {};
    departments.forEach((d) => {
      deptGroups[d.name] = { agents: [], hubs: [], skills: [] };
    });

    nodes.forEach((node) => {
      if (node.id === "root" || node.id === "core-council" || node.type === "core") return;
      const deptName = (node.department || "OPERATIONS").toUpperCase();
      if (!deptGroups[deptName]) {
        deptGroups[deptName] = { agents: [], hubs: [], skills: [] };
      }
      if (node.type === "department") {
        deptGroups[deptName].deptNode = node;
      } else if (node.type === "agent") {
        deptGroups[deptName].agents.push(node);
      } else if (node.type === "hub") {
        deptGroups[deptName].hubs.push(node);
      } else {
        deptGroups[deptName].skills.push(node);
      }
    });

    // Concentric orbital radii
    const R_DEPT = 190;
    const R_AGENTS = 330;
    const R_HUBS = 470;
    const R_SKILLS_BASE = 590;

    departments.forEach((d, idx) => {
      const cfg = DEPT_CONFIGS[d.name] || {
        angle: (idx * 2 * Math.PI) / departments.length - Math.PI / 2,
        color: d.color,
      };
      const baseAngle = cfg.angle;

      positions.set(d.id, {
        x: Math.cos(baseAngle) * R_DEPT,
        y: Math.sin(baseAngle) * R_DEPT,
      });

      const group = deptGroups[d.name];
      if (group && group.deptNode) {
        positions.set(group.deptNode.id, {
          x: Math.cos(baseAngle) * R_DEPT,
          y: Math.sin(baseAngle) * R_DEPT,
        });
      }
      if (!group) return;

      const sectorSpan = 0.72;

      // 2. Agents / Sovereign Leaders (With Avatars)
      const agents = group.agents;
      agents.forEach((ag, i) => {
        const offsetRatio = agents.length > 1 ? (i / (agents.length - 1) - 0.5) : 0;
        const angle = baseAngle + offsetRatio * sectorSpan;
        positions.set(ag.id, {
          x: Math.cos(angle) * R_AGENTS,
          y: Math.sin(angle) * R_AGENTS,
        });
      });

      // 3. Specialized Hubs
      const hubs = group.hubs;
      hubs.forEach((hb, i) => {
        const offsetRatio = hubs.length > 1 ? (i / (hubs.length - 1) - 0.5) : 0;
        const angle = baseAngle + offsetRatio * (sectorSpan * 1.25);
        positions.set(hb.id, {
          x: Math.cos(angle) * R_HUBS,
          y: Math.sin(angle) * R_HUBS,
        });
      });

      // 4. Primary Skills
      const skills = group.skills;
      skills.forEach((sk, i) => {
        const offsetRatio = skills.length > 1 ? (i / (skills.length - 1) - 0.5) : 0;
        const angle = baseAngle + offsetRatio * (sectorSpan * 1.4);
        const staggeredRadius = R_SKILLS_BASE + (i % 2 === 0 ? -30 : 30);
        positions.set(sk.id, {
          x: Math.cos(angle) * staggeredRadius,
          y: Math.sin(angle) * staggeredRadius,
        });
      });
    });

    return positions;
  }, [graphData]);

  // Generate 5,125 Skills Constellation Stellar Belt (100% Real Skills from Catalog)
  useEffect(() => {
    const rawSkills = graphData.skills || [];

    const buildStars = (skills: SkillItem[]) => {
      const stars: SkillStar[] = [];
      skills.forEach((sk, idx) => {
        const deptName = (sk.department || "Operations").toUpperCase();
        const cfg = DEPT_CONFIGS[deptName] || DEPT_CONFIGS.OPERATIONS;
        const baseAngle = cfg.angle;
        
        const angleJitter = ((idx * 137.5) % 360) / 360 - 0.5;
        const angle = baseAngle + angleJitter * 0.85;
        const dist = 510 + ((idx * 83) % 320);

        stars.push({
          id: sk.id,
          name: sk.name,
          department: deptName,
          hub: sk.hub,
          color: cfg.color,
          x: Math.cos(angle) * dist,
          y: Math.sin(angle) * dist,
          size: idx % 11 === 0 ? 3.4 : idx % 5 === 0 ? 2.5 : 1.6,
          suggestedAgent: sk.suggestedAgent,
          description: sk.description,
        });
      });
      skillStarsRef.current = stars;
    };

    if (rawSkills.length > 0) {
      buildStars(rawSkills);
    } else {
      // Direct load from public catalog if not already populated
      fetch("/skills_catalog_index.json")
        .then((res) => res.json())
        .then((data) => {
          const list: SkillItem[] = (data.skills || []).map((s: any) => ({
            id: s.id,
            name: s.name,
            description: s.description || "",
            department: s.department || "Operations",
            hub: s.hub,
            suggestedAgent: s.suggested_agent,
            domain: s.domain,
            sourceLocator: s.path,
          }));
          if (list.length > 0) {
            setGraphData((prev) => ({
              ...prev,
              totalSkills: list.length,
              skills: list,
            }));
            buildStars(list);
          }
        })
        .catch((err) => {
          console.error("Failed to load skills catalog for galaxy:", err);
        });
    }
  }, [graphData]);

  // Initialize background starfield
  useEffect(() => {
    const stars: StarParticle[] = [];
    const count = 180;
    for (let i = 0; i < count; i++) {
      stars.push({
        x: (Math.random() - 0.5) * 3400,
        y: (Math.random() - 0.5) * 3400,
        size: Math.random() * 1.8 + 0.4,
        speed: Math.random() * 0.15 + 0.05,
        opacity: Math.random() * 0.6 + 0.2,
        baseOpacity: Math.random() * 0.6 + 0.2,
        pulseSpeed: Math.random() * 0.02 + 0.01,
      });
    }
    starsRef.current = stars;
  }, []);

  // Main Canvas Render Loop
  useEffect(() => {
    if (viewMode !== "galactic") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let time = 0;

    const render = () => {
      time += 0.015;
      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      // Deep Galactic Background
      ctx.fillStyle = "#070b16";
      ctx.fillRect(0, 0, width, height);

      ctx.save();
      const { scale, offsetX, offsetY, hoveredNodeId, hoveredStarId } = viewState.current;

      const centerX = width / 2;
      const centerY = height / 2;
      ctx.translate(centerX, centerY);

      // 1. Starfield Background
      ctx.save();
      ctx.translate(offsetX * 0.2, offsetY * 0.2);
      starsRef.current.forEach((star) => {
        const op = star.baseOpacity + Math.sin(time * star.pulseSpeed * 80) * 0.2;
        ctx.fillStyle = `rgba(226, 232, 240, ${Math.max(0.1, op)})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();

      // Pan & Zoom
      ctx.translate(offsetX, offsetY);
      ctx.scale(scale, scale);

      // 2. Concentric Orbits
      ctx.strokeStyle = "rgba(148, 163, 184, 0.08)";
      ctx.lineWidth = 1;
      [190, 330, 470, 620, 760].forEach((r) => {
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.stroke();
      });

      // 3. Department Sector Wedges
      Object.entries(DEPT_CONFIGS).forEach(([name, cfg]) => {
        const isSelected = selectedDeptFilter === "all" || selectedDeptFilter === name;
        ctx.fillStyle = isSelected ? `${cfg.color}0f` : "rgba(148, 163, 184, 0.015)";
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, 800, cfg.angle - 0.44, cfg.angle + 0.44);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = isSelected ? `${cfg.color}40` : "rgba(148, 163, 184, 0.05)";
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 6]);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(cfg.angle) * 810, Math.sin(cfg.angle) * 810);
        ctx.stroke();
      });
      ctx.setLineDash([]);

      // 4. 5,125 Skills Constellation Stellar Belt
      skillStarsRef.current.forEach((sk) => {
        const isDeptMatch = selectedDeptFilter === "all" || sk.department === selectedDeptFilter;
        const isHovered = hoveredStarId === sk.id;
        const alpha = isDeptMatch ? (isHovered ? 1.0 : 0.65) : 0.12;

        ctx.fillStyle = sk.color;
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(sk.x, sk.y, isHovered ? sk.size * 2.5 : sk.size, 0, Math.PI * 2);
        ctx.fill();

        if (isHovered) {
          ctx.shadowBlur = 15;
          ctx.shadowColor = sk.color;
          ctx.beginPath();
          ctx.arc(sk.x, sk.y, sk.size * 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;

          ctx.globalAlpha = 1.0;
          ctx.font = "bold 10px Inter, sans-serif";
          const tw = ctx.measureText(sk.name).width;
          ctx.fillStyle = "rgba(10, 15, 29, 0.95)";
          ctx.strokeStyle = sk.color;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.roundRect(sk.x - tw / 2 - 6, sk.y - 28, tw + 12, 18, 4);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = "#ffffff";
          ctx.textAlign = "center";
          ctx.fillText(sk.name, sk.x, sk.y - 15);
        }
      });
      ctx.globalAlpha = 1.0;

      // 5. Draw Edges
      const edges = graphData.graph?.edges || [];
      edges.forEach((edge) => {
        const sourcePos = nodePositions.get(edge.source);
        const targetPos = nodePositions.get(edge.target);
        if (!sourcePos || !targetPos) return;

        const isHighlighted =
          hoveredNodeId === edge.source ||
          hoveredNodeId === edge.target ||
          selectedNode?.id === edge.source ||
          selectedNode?.id === edge.target;

        ctx.strokeStyle = isHighlighted ? edge.color || "#38bdf8" : "rgba(148, 163, 184, 0.14)";
        ctx.lineWidth = isHighlighted ? 2.5 : 0.9;
        ctx.beginPath();
        ctx.moveTo(sourcePos.x, sourcePos.y);
        ctx.lineTo(targetPos.x, targetPos.y);
        ctx.stroke();
      });

      // 6. Central MVX Sovereign Core
      const corePulse = Math.sin(time * 2.2) * 5;
      ctx.shadowBlur = 35 + corePulse;
      ctx.shadowColor = "#38bdf8";
      ctx.fillStyle = "#0284c7";
      ctx.beginPath();
      ctx.arc(0, 0, 36 + corePulse * 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const ang = (i * Math.PI) / 3;
        const hx = Math.cos(ang) * 16;
        const hy = Math.sin(ang) * 16;
        if (i === 0) ctx.moveTo(hx, hy);
        else ctx.lineTo(hx, hy);
      }
      ctx.closePath();
      ctx.stroke();

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 9px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("MVX CORE", 0, 24);
      ctx.font = "bold 8px Inter, sans-serif";
      ctx.fillStyle = "#bae6fd";
      ctx.fillText("5.125 SKILLS", 0, 34);

      // 7. Draw Nodes with REAL AVATARS & DEDICATED ICONS
      const nodes = graphData.graph?.nodes || [];
      nodes.forEach((node) => {
        const pos = nodePositions.get(node.id);
        if (!pos) return;
        if (node.id === "root" || node.id === "core-council") return;

        const matchFilter =
          selectedDeptFilter === "all" ||
          node.department === selectedDeptFilter ||
          node.id === "root";

        const isHovered = hoveredNodeId === node.id;
        const isSelected = selectedNode?.id === node.id;
        const isLeader = node.type === "agent" || node.id.startsWith("leader-") || node.id.startsWith("agent-");
        const isDept = node.type === "department";

        const baseRadius = isDept ? 24 : isLeader ? 20 : 12;
        const radius = (isHovered || isSelected ? baseRadius * 1.25 : baseRadius) * (matchFilter ? 1 : 0.6);
        const alpha = matchFilter ? 1 : 0.25;

        if (isHovered || isSelected) {
          ctx.shadowBlur = 24;
          ctx.shadowColor = node.color || "#38bdf8";
        }

        ctx.globalAlpha = alpha;

        if (isLeader) {
          const leaderKey = node.agentId || node.id.replace("leader-", "").replace("agent-", "");
          const avatarImg = avatarImagesRef.current.get(leaderKey) || avatarImagesRef.current.get(node.id);

          ctx.strokeStyle = isSelected ? "#ffffff" : isHovered ? "#38bdf8" : (node.color || "#fbbf24");
          ctx.lineWidth = isHovered || isSelected ? 3.5 : 2.5;
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, radius + 2, 0, Math.PI * 2);
          ctx.stroke();

          ctx.save();
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
          ctx.clip();

          if (avatarImg && avatarImg.complete && avatarImg.naturalWidth > 0) {
            ctx.drawImage(avatarImg, pos.x - radius, pos.y - radius, radius * 2, radius * 2);
          } else {
            ctx.fillStyle = "#0f172a";
            ctx.fillRect(pos.x - radius, pos.y - radius, radius * 2, radius * 2);
            ctx.fillStyle = "#ffffff";
            ctx.font = `bold ${Math.round(radius * 0.7)}px Inter, sans-serif`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            const initials = node.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
            ctx.fillText(initials, pos.x, pos.y);
          }
          ctx.restore();

          ctx.shadowBlur = 0;

          const label = node.name;
          ctx.font = isHovered || isSelected ? "bold 10px Inter, sans-serif" : "9px Inter, sans-serif";
          const tw = ctx.measureText(label).width;
          ctx.fillStyle = isHovered || isSelected ? "rgba(10, 15, 29, 0.98)" : "rgba(10, 15, 29, 0.85)";
          ctx.strokeStyle = isHovered || isSelected ? node.color : "rgba(148, 163, 184, 0.3)";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.roundRect(pos.x - tw / 2 - 7, pos.y + radius + 4, tw + 14, 18, 5);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = isHovered || isSelected ? "#ffffff" : "#e2e8f0";
          ctx.textAlign = "center";
          ctx.textBaseline = "alphabetic";
          ctx.fillText(label, pos.x, pos.y + radius + 16);

        } else if (isDept) {
          ctx.fillStyle = isSelected ? "#ffffff" : node.color;
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, radius + 2, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = "#090e1c";
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, radius * 0.82, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;

          ctx.fillStyle = isSelected ? "#090e1c" : "#ffffff";
          ctx.font = "bold 9px Inter, sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(node.name.slice(0, 4), pos.x, pos.y);

          ctx.textBaseline = "alphabetic";
          ctx.font = "bold 11px Inter, sans-serif";
          const label = node.name;
          const tw = ctx.measureText(label).width;
          ctx.fillStyle = "rgba(10, 15, 29, 0.95)";
          ctx.strokeStyle = node.color;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.roundRect(pos.x - tw / 2 - 9, pos.y + radius + 6, tw + 18, 22, 6);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = "#ffffff";
          ctx.fillText(label, pos.x, pos.y + radius + 20);

        } else {
          ctx.strokeStyle = node.color;
          ctx.lineWidth = 2;
          ctx.fillStyle = "#090e1c";
          ctx.beginPath();
          ctx.moveTo(pos.x, pos.y - radius);
          ctx.lineTo(pos.x + radius, pos.y);
          ctx.lineTo(pos.x, pos.y + radius);
          ctx.lineTo(pos.x - radius, pos.y);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.shadowBlur = 0;

          ctx.fillStyle = "#ffffff";
          ctx.font = "bold 7px Inter, sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("HUB", pos.x, pos.y);
          ctx.textBaseline = "alphabetic";

          if (isHovered || isSelected) {
            const label = node.name;
            ctx.font = "bold 10px Inter, sans-serif";
            const tw = ctx.measureText(label).width;
            ctx.fillStyle = "rgba(10, 15, 29, 0.96)";
            ctx.strokeStyle = node.color;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.roundRect(pos.x - tw / 2 - 8, pos.y - radius - 26, tw + 16, 22, 6);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = "#ffffff";
            ctx.fillText(label, pos.x, pos.y - radius - 11);
          }
        }

        ctx.globalAlpha = 1.0;
      });

      ctx.restore();
      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [graphData, nodePositions, selectedDeptFilter, selectedNode, viewMode]);

  // Window resize handler
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current && containerRef.current) {
        canvasRef.current.width = containerRef.current.clientWidth;
        canvasRef.current.height = containerRef.current.clientHeight;
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [viewMode]);

  // Mouse / Touch Interaction Handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    viewState.current.isDragging = true;
    viewState.current.dragStartX = e.clientX - viewState.current.offsetX;
    viewState.current.dragStartY = e.clientY - viewState.current.offsetY;
    viewState.current.hasUserPanned = true;
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (viewState.current.isDragging) {
      viewState.current.offsetX = e.clientX - viewState.current.dragStartX;
      viewState.current.offsetY = e.clientY - viewState.current.dragStartY;
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left - canvas.width / 2;
    const mouseY = e.clientY - rect.top - canvas.height / 2;

    const { scale, offsetX, offsetY } = viewState.current;
    const worldX = (mouseX - offsetX) / scale;
    const worldY = (mouseY - offsetY) / scale;

    let foundNode: string | null = null;
    const nodes = graphData.graph?.nodes || [];
    for (const node of nodes) {
      const pos = nodePositions.get(node.id);
      if (!pos) continue;
      const hitRadius = node.type === "agent" ? 28 : node.type === "department" ? 32 : 18;
      const dx = worldX - pos.x;
      const dy = worldY - pos.y;
      if (dx * dx + dy * dy < hitRadius * hitRadius) {
        foundNode = node.id;
        break;
      }
    }
    viewState.current.hoveredNodeId = foundNode;

    let foundStar: string | null = null;
    if (!foundNode) {
      for (const star of skillStarsRef.current) {
        const dx = worldX - star.x;
        const dy = worldY - star.y;
        if (dx * dx + dy * dy < 80) {
          foundStar = star.id;
          break;
        }
      }
    }
    viewState.current.hoveredStarId = foundStar;
  };

  const handleMouseUp = () => {
    viewState.current.isDragging = false;
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
    const newScale = Math.min(Math.max(viewState.current.scale * zoomFactor, 0.35), 2.8);
    viewState.current.scale = newScale;
  };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left - canvas.width / 2;
    const mouseY = e.clientY - rect.top - canvas.height / 2;

    const { scale, offsetX, offsetY } = viewState.current;
    const worldX = (mouseX - offsetX) / scale;
    const worldY = (mouseY - offsetY) / scale;

    const nodes = graphData.graph?.nodes || [];
    for (const node of nodes) {
      const pos = nodePositions.get(node.id);
      if (!pos) continue;
      const hitRadius = node.type === "agent" ? 30 : node.type === "department" ? 35 : 20;
      const dx = worldX - pos.x;
      const dy = worldY - pos.y;
      if (dx * dx + dy * dy < hitRadius * hitRadius) {
        setSelectedNode(node);
        return;
      }
    }

    for (const star of skillStarsRef.current) {
      const dx = worldX - star.x;
      const dy = worldY - star.y;
      if (dx * dx + dy * dy < 100) {
        setSelectedNode({
          id: star.id,
          name: star.name,
          type: "skill",
          department: star.department,
          color: star.color,
          size: 14,
          badge: star.hub || "Sovereign Skill",
          details: {
            atAGlance: star.description || `Competenza Sovrana specializzata: ${star.name}.`,
            whatItDoes: `Esegue ${star.name} con determinismo, assegnata preferenzialmente a ${star.suggestedAgent || "Specialista OpenClaw"}.`,
            coversOnMap: `${star.department} -> ${star.hub || "Hub Generale"} -> ${star.name}`,
          },
        });
        return;
      }
    }

    setSelectedNode(null);
  };

  const handleZoomIn = () => {
    viewState.current.scale = Math.min(viewState.current.scale * 1.25, 2.8);
  };

  const handleZoomOut = () => {
    viewState.current.scale = Math.max(viewState.current.scale * 0.8, 0.35);
  };

  const handleResetZoom = () => {
    viewState.current.scale = 0.88;
    viewState.current.offsetX = 0;
    viewState.current.offsetY = 0;
    setSelectedDeptFilter("all");
    setSelectedNode(null);
  };

  const matrixSkills = useMemo(() => {
    const raw = graphData.skills || [];
    let filtered = raw;

    if (selectedDeptFilter !== "all") {
      filtered = filtered.filter(
        (s) => (s.department || "").toUpperCase() === selectedDeptFilter.toUpperCase()
      );
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.id.toLowerCase().includes(q) ||
          (s.description || "").toLowerCase().includes(q) ||
          (s.hub || "").toLowerCase().includes(q)
      );
    }

    return filtered;
  }, [graphData.skills, selectedDeptFilter, searchQuery]);

  const totalSkillsCount = graphData.totalSkills || (graphData.skills ? graphData.skills.length : 5125);

  return (
    <div className="relative w-full h-[calc(100vh-3.5rem)] overflow-hidden bg-[#070b16] select-none flex flex-col">
      {/* Top Controls Bar */}
      <div className="p-4 flex flex-wrap items-center justify-between gap-3 border-b border-border/40 bg-card/60 backdrop-blur-md z-10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-cyan-400 animate-pulse shadow-sm" />
            <h1 className="text-base font-bold text-foreground">Skill Tree Galattico</h1>
          </div>
          <span className="text-xs bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2 py-0.5 rounded-full font-mono font-semibold">
            {totalSkillsCount.toLocaleString()} Competenze Sovrane
          </span>

          {/* View Switcher */}
          <div className="flex items-center bg-muted/60 p-1 rounded-lg border border-border/60 ml-2">
            <button
              onClick={() => setViewMode("galactic")}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                viewMode === "galactic"
                  ? "bg-card text-foreground shadow-sm font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Globe2 className="h-3.5 w-3.5 text-cyan-400" />
              Mappa Radiale
            </button>
            <button
              onClick={() => setViewMode("matrix")}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                viewMode === "matrix"
                  ? "bg-card text-foreground shadow-sm font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5 text-indigo-400" />
              Matrice ad Albero ({totalSkillsCount.toLocaleString()})
            </button>
          </div>
        </div>

        {/* Filter Pills for 7 Departments */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
          <button
            onClick={() => setSelectedDeptFilter("all")}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
              selectedDeptFilter === "all"
                ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
            }`}
          >
            Tutti i Dipartimenti ({totalSkillsCount.toLocaleString()})
          </button>
          {Object.entries(DEPT_CONFIGS).map(([deptKey, deptCfg]) => (
            <button
              key={deptKey}
              onClick={() => setSelectedDeptFilter(deptKey)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all whitespace-nowrap flex items-center gap-1.5 ${
                selectedDeptFilter === deptKey
                  ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
              }`}
            >
              <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: deptCfg.color }} />
              {deptKey}
            </button>
          ))}
        </div>

        {/* Zoom Controls HUD */}
        {viewMode === "galactic" && (
          <div className="flex items-center gap-1 bg-card/80 border border-border/70 rounded-xl p-1 shadow-sm">
            <button
              onClick={handleZoomIn}
              className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded-lg transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
            <button
              onClick={handleZoomOut}
              className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded-lg transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <button
              onClick={handleResetZoom}
              className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded-lg transition-colors"
              title="Centra Mappa"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* VIEW 1: Galactic Canvas Viewport */}
      {viewMode === "galactic" && (
        <div ref={containerRef} className="flex-1 w-full h-full relative cursor-grab">
          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onWheel={handleWheel}
            onClick={handleClick}
            className="w-full h-full block"
          />
          {/* Quick HUD Legend */}
          <div className="absolute bottom-4 left-4 bg-card/90 border border-border/70 rounded-xl p-3 backdrop-blur-md text-xs space-y-1.5 shadow-lg max-w-xs pointer-events-none">
            <div className="flex items-center gap-2 font-semibold text-foreground">
              <span className="h-2 w-2 rounded-full bg-cyan-400" />
              <span>Cosmologia Galattica delle Competenze</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              27 Top Manager con avatar reali al centro delle orbite. Clicca su qualsiasi leader, hub o stella per aprire la scheda dettagliata e assegnare task.
            </p>
          </div>
        </div>
      )}

      {/* VIEW 2: Complete 5,125 Skills Matrix Table */}
      {viewMode === "matrix" && (
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="max-w-7xl mx-auto space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setMatrixPage(1);
                  }}
                  placeholder="Cerca tra le 5.125 competenze per nome, ID o hub..."
                  className="w-full pl-9 pr-4 py-2 bg-card border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <span className="text-xs font-mono text-muted-foreground">
                Trovate: <strong className="text-foreground">{matrixSkills.length}</strong> competenze
              </span>
            </div>

            {/* Grid of skills */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {matrixSkills.slice((matrixPage - 1) * 36, matrixPage * 36).map((sk) => {
                const deptCfg = DEPT_CONFIGS[(sk.department || "Operations").toUpperCase()] || DEPT_CONFIGS.OPERATIONS;
                return (
                  <div
                    key={sk.id}
                    onClick={() =>
                      setSelectedNode({
                        id: sk.id,
                        name: sk.name,
                        type: "skill",
                        department: sk.department,
                        color: deptCfg.color,
                        size: 14,
                        badge: sk.hub || "Skill",
                        details: {
                          atAGlance: sk.description || `Competenza Sovrana per ${sk.department}`,
                          whatItDoes: `Esegue ${sk.name} in modo deterministico. Suggerito per: ${sk.suggestedAgent || "Specialista OpenClaw"}.`,
                          coversOnMap: `${sk.department} -> ${sk.hub || "Hub"} -> ${sk.name}`,
                        },
                      })
                    }
                    className="p-3 rounded-lg border border-border/60 bg-card hover:border-primary/50 hover:bg-muted/30 cursor-pointer transition-all flex flex-col justify-between gap-2 group"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider"
                          style={{
                            backgroundColor: `${deptCfg.color}15`,
                            color: deptCfg.color,
                            border: `1px solid ${deptCfg.color}35`,
                          }}
                        >
                          {sk.department}
                        </span>
                        {sk.hub && (
                          <span className="text-[10px] text-muted-foreground font-mono truncate max-w-[120px]">
                            {sk.hub}
                          </span>
                        )}
                      </div>
                      <h4 className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                        {sk.name}
                      </h4>
                      <p className="text-[11px] text-muted-foreground line-clamp-2 mt-1">
                        {sk.description || "Nessuna descrizione specificata"}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-border/40 text-[10px] text-muted-foreground">
                      <span className="font-mono">ID: {sk.id}</span>
                      <span className="text-cyan-400 font-medium group-hover:underline">Dettagli &rarr;</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {matrixSkills.length > 36 && (
              <div className="flex items-center justify-center gap-2 pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={matrixPage <= 1}
                  onClick={() => setMatrixPage((p) => Math.max(p - 1, 1))}
                  className="text-xs"
                >
                  Precedente
                </Button>
                <span className="text-xs font-mono text-muted-foreground px-2">
                  Pagina {matrixPage} di {Math.ceil(matrixSkills.length / 36)}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={matrixPage >= Math.ceil(matrixSkills.length / 36)}
                  onClick={() => setMatrixPage((p) => p + 1)}
                  className="text-xs"
                >
                  Successiva
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Slide-over Inspection Drawer for Selected Node */}
      {selectedNode && (
        <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-card/98 backdrop-blur-xl border-l border-border shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
          <div className="p-5 border-b border-border flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              {(selectedNode.type === "agent" || LEADER_AVATARS[selectedNode.id.replace("leader-", "").replace("agent-", "")]) && (
                <img
                  src={
                    LEADER_AVATARS[selectedNode.id.replace("leader-", "").replace("agent-", "")] ||
                    "/assets/avatars/sales-belfort.jpg"
                  }
                  alt={selectedNode.name}
                  className="h-12 w-12 rounded-full object-cover border-2 shrink-0"
                  style={{ borderColor: selectedNode.color || "#38bdf8" }}
                />
              )}
              <div>
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider mb-1.5 inline-block"
                  style={{
                    backgroundColor: `${selectedNode.color}20`,
                    color: selectedNode.color,
                    border: `1px solid ${selectedNode.color}40`,
                  }}
                >
                  {selectedNode.type} • {selectedNode.department || "Governance"}
                </span>
                <h3 className="text-base font-bold text-foreground">{selectedNode.name}</h3>
                <p className="text-xs font-mono text-muted-foreground mt-0.5">ID: {selectedNode.id}</p>
              </div>
            </div>
            <button
              onClick={() => setSelectedNode(null)}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="p-5 space-y-5 flex-1 overflow-y-auto">
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                Panoramica Operativa
              </h4>
              <p className="text-xs text-foreground/90 leading-relaxed bg-muted/30 p-3 rounded-lg border border-border/60">
                {selectedNode.details?.atAGlance ||
                  selectedNode.details?.whatItDoes ||
                  "Capacità autonoma specializzata integrata all'interno dell'ecosistema MVX Ads Master & Paperclip."}
              </p>
            </div>

            {selectedNode.badge && (
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Tesi & Focus Esecutivo
                </h4>
                <div className="text-xs font-medium text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 p-2.5 rounded-lg font-mono">
                  {selectedNode.badge}
                </div>
              </div>
            )}

            {selectedNode.details?.coversOnMap && (
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Posizione nella Flotta
                </h4>
                <p className="text-xs text-muted-foreground font-mono bg-muted/20 p-2 rounded border border-border/40">
                  {selectedNode.details.coversOnMap}
                </p>
              </div>
            )}
          </div>

          <div className="p-4 border-t border-border bg-card flex items-center justify-between gap-3">
            <Button variant="outline" size="sm" onClick={() => setSelectedNode(null)} className="text-xs">
              Chiudi
            </Button>
            <Button
              size="sm"
              onClick={() => {
                openNewIssue();
                setSelectedNode(null);
              }}
              className="text-xs gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
            >
              <Plus className="h-3.5 w-3.5" />
              Assegna Issue a questo Nodo
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
