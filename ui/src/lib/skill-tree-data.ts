import rawPayload from "./skillTreePayload.json";

export interface SkillItem {
  id: string;
  name: string;
  description: string;
  department: string;
  hub?: string;
  suggestedAgent?: string;
  domain?: string;
  sourceLocator?: string;
}

export interface SkillNode {
  id: string;
  type: "root" | "core" | "department" | "agent" | "hub" | "skill";
  name: string;
  department?: string;
  color: string;
  icon?: string;
  avatar?: string;
  agentId?: string;
  skillsCount?: number;
  size: number;
  badge?: string;
  details?: {
    atAGlance?: string;
    whatItDoes?: string;
    coversOnMap?: string;
    governance?: string;
    level?: number | string;
    kpis?: Array<{
      metric?: string;
      name?: string;
      target?: string;
      measurement_seam?: string;
      failure_threshold?: string;
    }>;
    success_criteria?: string[];
    failure_indicators?: string[];
    needs?: string[] | string;
    produces?: string[] | string;
    required_api_keys?: string[];
    configuration?: string;
    how_to_run?: string;
  };
}

export interface SkillEdge {
  id: string;
  source: string;
  target: string;
  color: string;
  style: "solid" | "dashed";
}

export interface DepartmentInfo {
  id: string;
  name: string;
  label: string;
  color: string;
  icon: string;
  agentsCount: number;
  agents: string[];
  skillsCount?: number;
}

export interface SkillTreePayload {
  ok: boolean;
  title: string;
  source?: string;
  totalDepartments: number;
  totalNodes: number;
  totalEdges: number;
  totalSkills?: number;
  totalAgents?: number;
  departments: DepartmentInfo[];
  graph: {
    nodes: SkillNode[];
    edges: SkillEdge[];
  };
  skills?: SkillItem[];
}

export const STATIC_SKILL_TREE: SkillTreePayload = rawPayload as unknown as SkillTreePayload;

export async function fetchSkillTreeData(): Promise<SkillTreePayload> {
  try {
    const res = await fetch("/api/skill-tree");
    if (res.ok) {
      const data = await res.json();
      if (data && data.skills && data.skills.length > 0 && data.graph && data.graph.nodes && data.graph.nodes.length > 0) {
        return data as SkillTreePayload;
      }
    }
  } catch {
    // Fall back to direct catalog index
  }

  try {
    const catRes = await fetch("/skills_catalog_index.json");
    if (catRes.ok) {
      const catData = await catRes.json();
      const rawSkills = Array.isArray(catData) ? catData : (catData.skills || []);
      const skillsList: SkillItem[] = rawSkills.map((s: any) => ({
        id: s.id || `skill-${Math.random()}`,
        name: s.name || "Specialized Skill",
        description: s.description || "",
        department: s.department || "Operations",
        hub: s.hub,
        suggestedAgent: s.suggested_agent || s.suggestedAgent,
        domain: s.domain,
        sourceLocator: s.path || s.sourceLocator,
      }));
      return {
        ...STATIC_SKILL_TREE,
        totalSkills: skillsList.length,
        skills: skillsList,
      };
    }
  } catch (err) {
    console.warn("[WARN] Could not load /skills_catalog_index.json fallback:", err);
  }

  return STATIC_SKILL_TREE;
}
