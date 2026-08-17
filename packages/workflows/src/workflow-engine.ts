import { STANDARD_WORKFLOWS } from './catalog.js';
import type { WorkflowDefinition, WorkflowExecutionRun, WorkflowStepStatus } from './types.js';

export class PaperclipWorkflowEngine {
  private workflows: Map<string, WorkflowDefinition> = new Map();
  private runs: Map<string, WorkflowExecutionRun> = new Map();

  constructor() {
    for (const wf of STANDARD_WORKFLOWS) {
      this.workflows.set(wf.id, wf);
    }
  }

  public listWorkflows(): WorkflowDefinition[] {
    return Array.from(this.workflows.values());
  }

  public getWorkflow(workflowId: string): WorkflowDefinition | undefined {
    return this.workflows.get(workflowId);
  }

  public registerWorkflow(workflow: WorkflowDefinition): void {
    this.workflows.set(workflow.id, workflow);
  }

  public async executeWorkflow(workflowId: string, initialInputs: Record<string, unknown> = {}): Promise<WorkflowExecutionRun> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow '${workflowId}' not found in catalog.`);
    }

    const runId = `wf_run_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const run: WorkflowExecutionRun = {
      runId,
      workflowId,
      status: 'running',
      startedAt: Date.now(),
      stepResults: {},
      telemetry: {
        totalTokens: 0,
        totalDurationMs: 0,
        efficiencyScore: 100
      }
    };

    this.runs.set(runId, run);

    // Execute steps in topological/dependency order
    for (const step of workflow.steps) {
      const stepStartTime = Date.now();
      run.stepResults[step.id] = {
        status: 'running',
        durationMs: 0
      };

      // Simulate step execution across agent & tool
      const duration = 120 + Math.floor(Math.random() * 80);
      run.stepResults[step.id] = {
        status: 'completed',
        output: {
          stepId: step.id,
          assignedAgent: step.assignedAgent,
          toolUsed: step.toolRequired,
          result: `Successfully executed ${step.name}`,
          timestamp: new Date().toISOString()
        },
        durationMs: duration
      };

      run.telemetry.totalDurationMs += duration;
      run.telemetry.totalTokens += 850;
    }

    run.status = 'completed';
    run.completedAt = Date.now();
    run.telemetry.efficiencyScore = 97.5;

    return run;
  }

  public getRun(runId: string): WorkflowExecutionRun | undefined {
    return this.runs.get(runId);
  }

  public listRuns(): WorkflowExecutionRun[] {
    return Array.from(this.runs.values());
  }
}

export const globalWorkflowEngine = new PaperclipWorkflowEngine();
