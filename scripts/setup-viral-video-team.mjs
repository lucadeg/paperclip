import http from 'node:http';

const COMPANY_ID = 'e97dd876-ab97-46c9-a49d-286aa3e1fde3';
const BASE_URL = 'http://127.0.0.1:3100';

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const method = options.method || 'GET';
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };
  const body = options.body ? JSON.stringify(options.body) : undefined;

  const res = await fetch(url, { method, headers, body });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`${method} ${path} failed (${res.status}): ${txt}`);
  }
  return res.json().catch(() => null);
}

const AGENTS_TO_CREATE = [
  {
    name: 'Viral Pipeline Lead Orchestrator',
    role: 'general',
    title: 'Chief Viral Architect & Campaign Director',
    icon: 'sparkles',
    capabilities: 'End-to-end viral video campaign orchestration, channel scouting coordination, video deconstruction dispatch, viral copywriting governance, retention optimization review, and A/B test matrix generation.',
    adapterType: 'hermes_local',
    adapterConfig: {
      model: 'hydra-auto'
    },
    runtimeConfig: {
      heartbeat: { enabled: false, intervalSec: 300 }
    }
  },
  {
    name: 'Viral Scout & Trend Hunter',
    role: 'general',
    title: 'Channel & Outlier Video Intelligence',
    icon: 'search',
    capabilities: 'Scouting winning channels and breakout creators across YouTube (Shorts & Long-Form) and Instagram (Reels & Carousels). Analyzes views-to-subscribers ratio (>5x), Views Per Hour (VPH), velocity curves, audience demographics, and viral breakout signals.',
    adapterType: 'hermes_local',
    adapterConfig: {
      model: 'hydra-auto'
    },
    runtimeConfig: {
      heartbeat: { enabled: false, intervalSec: 300 }
    }
  },
  {
    name: 'Video Reverse Engineer',
    role: 'engineer',
    title: 'Video & Script Deconstruction Specialist',
    icon: 'cpu',
    capabilities: 'Surgical frame-by-frame and audio-visual deconstruction of viral videos. Dissects 0-3s hooks (visual, auditory, textual), cuts per minute, B-roll density, script psychology (Curiosity Gap, PAS, Contrarian), and pacing curves.',
    adapterType: 'hermes_local',
    adapterConfig: {
      model: 'hydra-auto'
    },
    runtimeConfig: {
      heartbeat: { enabled: false, intervalSec: 300 }
    }
  },
  {
    name: 'Viral Copywriter & Concept Architect',
    role: 'general',
    title: 'Viral Scriptwriter & Storytelling Architect',
    icon: 'lightbulb',
    capabilities: 'High-converting scriptwriting and viral video concept generation. Develops 10-20 breakthrough angles per niche, crafts complete retention-engineered scripts for Shorts/Reels and Long-form with timestamps, visual cues [VISUAL], sound cues [SFX], and seamless loop transitions.',
    adapterType: 'hermes_local',
    adapterConfig: {
      model: 'hydra-auto'
    },
    runtimeConfig: {
      heartbeat: { enabled: false, intervalSec: 300 }
    }
  },
  {
    name: 'Content Quality & Virality Optimizer',
    role: 'qa',
    title: 'Retention, Pacing & Visual Fidelity Optimizer',
    icon: 'wand',
    capabilities: 'Drop-off diagnosis, retention friction removal, dead-air truncation (auto-editor pattern), dynamic kinetic subtitles styling, 4-7s pattern interrupts, sound design drops, color grading benchmarks, and comment-driver CTA engineering.',
    adapterType: 'hermes_local',
    adapterConfig: {
      model: 'hydra-auto'
    },
    runtimeConfig: {
      heartbeat: { enabled: false, intervalSec: 300 }
    }
  },
  {
    name: 'Variant Matrix & A/B Generator',
    role: 'pm',
    title: 'Multivariate Variant & Hook Matrix Generator',
    icon: 'target',
    capabilities: 'Systematic multi-angle test package generator for every analyzed video. Produces 5 Hook variants (Shock, Question, Visual Loop, Contrarian, Relatable Pain), 3 Narrative bodies (Tutorial, Storytelling, Rapid-Fire), 3 Production styles (Talking Head UGC, Faceless B-roll, High-Energy Explainer), and high-CTR Cover/Thumbnail concepts.',
    adapterType: 'hermes_local',
    adapterConfig: {
      model: 'hydra-auto'
    },
    runtimeConfig: {
      heartbeat: { enabled: false, intervalSec: 300 }
    }
  }
];

async function main() {
  console.log('=== VIRAL VIDEO INTELLIGENCE MULTI-AGENT PROVISIONING ===');

  // 1. Check if Project already exists
  const existingProjects = await request(`/api/companies/${COMPANY_ID}/projects`);
  let project = existingProjects.find(p => p.name === 'Viral Video Intelligence & Content Reverse Engineering Lab');
  
  if (!project) {
    console.log('Creating Project: Viral Video Intelligence & Content Reverse Engineering Lab...');
    project = await request(`/api/companies/${COMPANY_ID}/projects`, {
      method: 'POST',
      body: {
        name: 'Viral Video Intelligence & Content Reverse Engineering Lab',
        description: 'End-to-end multi-agent engine for YouTube and Instagram winning channel scouting, frame-by-frame reverse engineering, viral copywriting & script generation, retention optimization, and multivariate A/B testing variant matrices.',
        status: 'in_progress',
        color: '#ff0055',
        icon: 'flame'
      }
    });
    console.log(`Project created with ID: ${project.id}`);
  } else {
    console.log(`Project already exists with ID: ${project.id}`);
  }

  // 2. Fetch existing agents to avoid duplicates
  const existingAgents = await request(`/api/companies/${COMPANY_ID}/agents`);
  const agentMap = {};

  for (const agentDef of AGENTS_TO_CREATE) {
    let agent = existingAgents.find(a => a.name === agentDef.name);
    if (!agent) {
      console.log(`Creating Agent: ${agentDef.name} (${agentDef.title})...`);
      agent = await request(`/api/companies/${COMPANY_ID}/agents`, {
        method: 'POST',
        body: agentDef
      });
      console.log(`Agent ${agentDef.name} created with ID: ${agent.id}`);
    } else {
      console.log(`Agent ${agentDef.name} exists with ID: ${agent.id}`);
      // Ensure runtimeConfig.heartbeat.enabled is false and title/capabilities are up to date
      await request(`/api/agents/${agent.id}`, {
        method: 'PATCH',
        body: {
          title: agentDef.title,
          capabilities: agentDef.capabilities,
          status: 'idle',
          runtimeConfig: agentDef.runtimeConfig
        }
      });
    }
    agentMap[agentDef.name] = agent;
  }

  // 3. Set Lead Agent for the Project
  const leadAgent = agentMap['Viral Pipeline Lead Orchestrator'];
  if (leadAgent && project) {
    await request(`/api/projects/${project.id}`, {
      method: 'PATCH',
      body: {
        leadAgentId: leadAgent.id
      }
    });
    console.log(`Set ${leadAgent.name} as Project Lead.`);
  }

  // 4. Create Standard Protocol Tasks in Project
  const tasksToSeed = [
    {
      title: 'Protocol 01: Multi-Platform Channel Scouting & Outlier Identification',
      description: 'Scout 10 outlier YouTube channels (Shorts & Long-form) and 10 Instagram creators in target niches with >5x View-to-Subscriber ratio. Extract growth velocity metrics, top 5 videos per creator, and recurring viral hook archetypes.',
      priority: 'high',
      status: 'todo',
      assigneeAgentId: agentMap['Viral Scout & Trend Hunter']?.id
    },
    {
      title: 'Protocol 02: Frame-by-Frame Video & Script Reverse Engineering',
      description: 'Perform deep surgical breakdown of top 3 outlier videos: 0-3s hook classification, scene switch pacing (cuts per minute), visual cues, background audio track, retention drop points, and script framework deconstruction.',
      priority: 'high',
      status: 'todo',
      assigneeAgentId: agentMap['Video Reverse Engineer']?.id
    },
    {
      title: 'Protocol 03: Viral Copywriting, Scripting & Original Video Concept Ideation',
      description: 'Generate 15 original high-retention video concepts and write 3 complete, ready-to-record scripts (with timestamps, visual cues [VISUAL], SFX cues [SFX], and seamless loop endings).',
      priority: 'high',
      status: 'todo',
      assigneeAgentId: agentMap['Viral Copywriter & Concept Architect']?.id
    },
    {
      title: 'Protocol 04: Quality, Pacing & Virality Retention Optimization',
      description: 'Audit video draft workflows against retention heuristics: silent dead-air truncation (auto-editor), kinetic subtitles formatting, 4-7s pattern interrupts, audio EQ & SFX drops, and high-engagement comment prompts.',
      priority: 'medium',
      status: 'todo',
      assigneeAgentId: agentMap['Content Quality & Virality Optimizer']?.id
    },
    {
      title: 'Protocol 05: Multivariate A/B Testing Variant Matrix Generation',
      description: 'For each newly produced video script, generate a 5x3x3 Variant Testing Package: 5 distinct Hooks (Shock, Question, Visual Loop, Contrarian, Relatable), 3 Narrative angles, 3 Production formats, and 3 high-CTR Cover concepts.',
      priority: 'medium',
      status: 'todo',
      assigneeAgentId: agentMap['Variant Matrix & A/B Generator']?.id
    }
  ];

  const existingIssues = await request(`/api/companies/${COMPANY_ID}/issues?projectId=${project.id}`);
  for (const task of tasksToSeed) {
    const exists = existingIssues?.find(i => i.title === task.title);
    if (!exists) {
      console.log(`Creating Task: ${task.title}...`);
      await request(`/api/companies/${COMPANY_ID}/issues`, {
        method: 'POST',
        body: {
          projectId: project.id,
          title: task.title,
          description: task.description,
          priority: task.priority,
          status: task.status,
          assigneeAgentId: task.assigneeAgentId
        }
      });
    }
  }

  console.log('=== VIRAL VIDEO INTELLIGENCE SUITE PROVISIONED SUCCESSFULLY ===');
}

main().catch(err => {
  console.error('Provisioning failed:', err);
  process.exit(1);
});
