import React, { useState } from "react";
import type { TaskEvaluation } from "@paperclipai/shared";
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  Cpu,
  RefreshCw,
  Award,
  Zap,
  TrendingUp,
  Brain,
} from "lucide-react";
import { triggerIssueEvaluation } from "../api/task-evaluations.js";

interface TaskEvaluationCardProps {
  companyId: string;
  issueId: string;
  evaluation: TaskEvaluation | null;
  onRefresh?: () => void;
}

export const TaskEvaluationCard: React.FC<TaskEvaluationCardProps> = ({
  companyId,
  issueId,
  evaluation,
  onRefresh,
}) => {
  const [reEvaluating, setReEvaluating] = useState(false);
  const [currentEval, setCurrentEval] = useState<TaskEvaluation | null>(evaluation);

  const handleReEvaluate = async () => {
    try {
      setReEvaluating(true);
      const updated = await triggerIssueEvaluation(companyId, issueId);
      setCurrentEval(updated);
      onRefresh?.();
    } catch (err) {
      console.error("Failed to re-evaluate task:", err);
    } finally {
      setReEvaluating(false);
    }
  };

  const activeEval = currentEval ?? evaluation;
  if (!activeEval) return null;

  const isFree = activeEval.isFreeOrLocal;
  const grade = activeEval.grade || "A";

  const getGradeBadge = (g: string) => {
    switch (g) {
      case "A+":
      case "A":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
      case "B":
        return "bg-blue-500/10 text-blue-400 border-blue-500/30";
      case "C":
        return "bg-amber-500/10 text-amber-400 border-amber-500/30";
      default:
        return "bg-rose-500/10 text-rose-400 border-rose-500/30";
    }
  };

  return (
    <div className="rounded-xl border border-border/60 bg-card/80 p-5 shadow-sm backdrop-blur-sm space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/40 pb-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">
                Valutazione Task & Apprendimento Automatico
              </h3>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border ${getGradeBadge(grade)}`}>
                <Award className="h-3 w-3" />
                Grado {grade} ({activeEval.overallScore}/100)
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Analisi di qualità del prompt, correttezza output ed estrazione continua di pattern
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isFree && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-2xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              <Zap className="h-3 w-3" />
              Zero Cost ($0.00)
            </span>
          )}
          <button
            type="button"
            onClick={handleReEvaluate}
            disabled={reEvaluating}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md border border-border/60 bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            title="Rivaluta input e output del task"
          >
            <RefreshCw className={`h-3 w-3 ${reEvaluating ? "animate-spin" : ""}`} />
            Rivaluta
          </button>
        </div>
      </div>

      {/* Model & Execution Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-lg border border-border/40 bg-muted/20 p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>Qualità Input (Prompt)</span>
            <span className="font-semibold text-foreground">{activeEval.inputClarityScore}%</span>
          </div>
          <div className="w-full bg-muted/60 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-primary h-full rounded-full transition-all duration-500"
              style={{ width: `${activeEval.inputClarityScore}%` }}
            />
          </div>
          <p className="text-2xs text-muted-foreground mt-2">
            Complessità: <span className="font-medium text-foreground capitalize">{activeEval.inputEvaluation?.estimatedComplexity || "Moderata"}</span>
          </p>
        </div>

        <div className="rounded-lg border border-border/40 bg-muted/20 p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>Accuratezza Output</span>
            <span className="font-semibold text-foreground">{activeEval.outputQualityScore}%</span>
          </div>
          <div className="w-full bg-muted/60 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${activeEval.outputQualityScore}%` }}
            />
          </div>
          <p className="text-2xs text-muted-foreground mt-2">
            Deliverable: <span className="font-medium text-foreground">
              {activeEval.outputEvaluation?.deliverableVerdict === "delivered_complete" ? "Completo & Convalidato" : "Parziale / In corso"}
            </span>
          </p>
        </div>

        <div className="rounded-lg border border-border/40 bg-muted/20 p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>Efficienza Esecuzione</span>
            <span className="font-semibold text-foreground">{activeEval.efficiencyScore}%</span>
          </div>
          <div className="w-full bg-muted/60 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-cyan-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${activeEval.efficiencyScore}%` }}
            />
          </div>
          <p className="text-2xs text-muted-foreground mt-2 flex items-center gap-1">
            <Cpu className="h-3 w-3 text-muted-foreground" />
            <span className="truncate">{activeEval.model || "Default Model"}</span>
          </p>
        </div>
      </div>

      {/* Input / Prompt Insights */}
      {activeEval.inputEvaluation && (
        <div className="rounded-lg border border-border/40 bg-muted/10 p-3 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
            <Lightbulb className="h-3.5 w-3.5 text-amber-400" />
            <span>Analisi Input & Suggerimenti di Formulazione</span>
          </div>
          <div className="text-xs text-muted-foreground space-y-1">
            {activeEval.inputEvaluation.missingContextWarnings?.length > 0 && (
              <div className="flex items-start gap-1.5 text-amber-400/90 text-2xs">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <span>{activeEval.inputEvaluation.missingContextWarnings.join("; ")}</span>
              </div>
            )}
            {activeEval.inputEvaluation.promptImprovements?.map((tip, idx) => (
              <div key={idx} className="flex items-start gap-1.5 text-2xs text-muted-foreground">
                <span className="text-primary font-bold">•</span>
                <span>{tip}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Distilled Learnings (Continuous Improvement) */}
      {activeEval.distilledLearnings && activeEval.distilledLearnings.length > 0 && (
        <div className="rounded-lg border border-border/40 bg-primary/5 p-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
              <Brain className="h-4 w-4 text-primary" />
              <span>Apprendimento Distillato & Miglioramento Continuo</span>
            </div>
            <span className="text-2xs text-primary font-medium flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              Salvato in Memoria Agente
            </span>
          </div>

          <div className="space-y-2">
            {activeEval.distilledLearnings.map((item) => (
              <div
                key={item.id}
                className="rounded-md border border-border/50 bg-background/80 p-2.5 text-xs space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground flex items-center gap-1.5">
                    <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                    {item.title}
                  </span>
                  <span className="text-2xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground uppercase font-mono">
                    {item.category}
                  </span>
                </div>
                <p className="text-2xs text-muted-foreground">{item.insight}</p>
                <p className="text-2xs text-primary/90 font-medium bg-primary/10 p-1.5 rounded">
                  💡 Raccomandazione: {item.actionableRecommendation}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
