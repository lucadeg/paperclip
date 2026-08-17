/**
 * Block Buzz Swarm Monitor & Telemetry Service for Paperclip and Hermes.
 *
 * Implements swarm telemetry collection, execution trace monitoring,
 * multi-agent message routing inspection, and performance evaluation.
 */

export interface SwarmAgentMember {
  agentId: string;
  role: string;
  model: string;
  status: 'idle' | 'running' | 'completed' | 'error';
  lastHeartbeat: number;
  totalTokensUsed: number;
  toolCallsCount: number;
}

export interface SwarmExecutionSession {
  swarmId: string;
  goal: string;
  orchestrator: string;
  status: 'active' | 'evaluating' | 'completed' | 'failed';
  startedAt: number;
  endedAt?: number;
  members: SwarmAgentMember[];
  messageCount: number;
  evalScore?: number;
  metrics: {
    avgStepDurationMs: number;
    errorRate: number;
    coordinationEfficiency: number;
  };
}

export interface BuzzTelemetryEvent {
  swarmId: string;
  agentId: string;
  eventType: 'agent_start' | 'step_completed' | 'tool_call' | 'message_sent' | 'error' | 'swarm_completed';
  payload: Record<string, unknown>;
  timestamp: number;
}

export class BuzzSwarmMonitor {
  private swarms: Map<string, SwarmExecutionSession> = new Map();
  private eventHistory: BuzzTelemetryEvent[] = [];

  constructor() {
    // Initialize with default Hermes orchestrator swarm
    this.registerSwarm({
      swarmId: 'hermes-core-swarm',
      goal: 'Autonomous multi-agent workspace coordination and tool execution',
      orchestrator: 'hermes-orchestrator',
      members: [
        { agentId: 'hermes-orchestrator', role: 'Leader/Planner', model: 'gemini-2.5-flash', status: 'running', lastHeartbeat: Date.now(), totalTokensUsed: 12400, toolCallsCount: 15 },
        { agentId: 'kanban-worker', role: 'Task Executor', model: 'claude-3-5-sonnet', status: 'idle', lastHeartbeat: Date.now(), totalTokensUsed: 8900, toolCallsCount: 8 },
        { agentId: 'sentrux-auditor', role: 'Security Critic', model: 'gpt-4o', status: 'running', lastHeartbeat: Date.now(), totalTokensUsed: 4500, toolCallsCount: 5 }
      ]
    });
  }

  public registerSwarm(params: {
    swarmId: string;
    goal: string;
    orchestrator: string;
    members: SwarmAgentMember[];
  }): SwarmExecutionSession {
    const session: SwarmExecutionSession = {
      swarmId: params.swarmId,
      goal: params.goal,
      orchestrator: params.orchestrator,
      status: 'active',
      startedAt: Date.now(),
      members: params.members,
      messageCount: 0,
      metrics: {
        avgStepDurationMs: 350,
        errorRate: 0.0,
        coordinationEfficiency: 0.98
      }
    };
    this.swarms.set(params.swarmId, session);
    return session;
  }

  public recordTelemetry(event: BuzzTelemetryEvent): void {
    this.eventHistory.push(event);
    const swarm = this.swarms.get(event.swarmId);
    if (swarm) {
      swarm.messageCount += 1;
      const member = swarm.members.find(m => m.agentId === event.agentId);
      if (member) {
        member.lastHeartbeat = event.timestamp;
        if (event.eventType === 'tool_call') {
          member.toolCallsCount += 1;
        }
        if (event.eventType === 'error') {
          member.status = 'error';
          swarm.metrics.errorRate = (swarm.metrics.errorRate * 0.8) + 0.2;
        } else {
          member.status = 'running';
        }
      }
    }
  }

  public evaluateSwarm(swarmId: string): { swarmId: string; score: number; verdict: string; details: Record<string, unknown> } {
    const swarm = this.swarms.get(swarmId);
    if (!swarm) {
      return { swarmId, score: 0, verdict: 'NOT_FOUND', details: {} };
    }

    const memberActivity = swarm.members.filter(m => m.status !== 'error').length / Math.max(1, swarm.members.length);
    const score = Math.round((memberActivity * 0.5 + (1 - swarm.metrics.errorRate) * 0.3 + swarm.metrics.coordinationEfficiency * 0.2) * 100);

    swarm.evalScore = score;
    return {
      swarmId,
      score,
      verdict: score >= 80 ? 'HIGH_PERFORMING' : 'NEEDS_OPTIMIZATION',
      details: {
        activeMembers: swarm.members.length,
        messageCount: swarm.messageCount,
        metrics: swarm.metrics
      }
    };
  }

  public getSwarm(swarmId: string): SwarmExecutionSession | undefined {
    return this.swarms.get(swarmId);
  }

  public listSwarms(): SwarmExecutionSession[] {
    return Array.from(this.swarms.values());
  }

  public getRecentEvents(limit: number = 50): BuzzTelemetryEvent[] {
    return this.eventHistory.slice(-limit);
  }
}

export const globalBuzzMonitor = new BuzzSwarmMonitor();
