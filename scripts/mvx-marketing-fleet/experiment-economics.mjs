// Offline decision-support only; never authorizes spend, provider writes or sends.
const validDate = x => typeof x === 'string' && Number.isFinite(Date.parse(x));
const whole = x => Number.isSafeInteger(x) && x >= 0;
// Normal tail approximation (Abramowitz-Stegun 7.1.26, error below 1.5e-7).
function erfc(x) {
  const a = Math.abs(x), t = 1 / (1 + 0.3275911 * a);
  const polynomial = ((((1.061405429*t - 1.453152027)*t + 1.421413741)*t - 0.284496736)*t + 0.254829592)*t;
  const value = 1 - polynomial * Math.exp(-a*a);
  return x >= 0 ? 1-value : 1+value;
}
function pTwoSided(z) { return erfc(Math.abs(z) / Math.SQRT2); }
export function scoreABExperiment(e) {
  const errors = [], a = e?.control ?? {}, b = e?.treatment ?? {};
  if (typeof e?.hypothesisId !== 'string' || !e.hypothesisId.trim()) errors.push('missing hypothesis');
  for(const key of ['registeredAt','startAt','plannedEndAt','analyzedAt'])
    if (!validDate(e?.[key])) errors.push('invalid ' + key);
  if (!errors.length && (Date.parse(e.registeredAt) >= Date.parse(e.startAt) ||
      Date.parse(e.startAt) > Date.parse(e.plannedEndAt))) errors.push('hypothesis not preregistered');
  if (e?.randomized !== true || e?.holdout !== true)
    errors.push('controlled randomized holdout required for causal effect');
  if (typeof e?.metric !== 'string' || !e.metric || !Array.isArray(e?.guardrailMetrics) ||
    !e.guardrailMetrics.length) errors.push('missing primary metric or guardrail registry');
  for (const [name, arm] of [['control',a],['treatment',b]]) {
    if (!whole(arm.n) || !whole(arm.success) || arm.success > arm.n)
      errors.push('invalid ' + name + ' events');
  }
  if (!Number.isInteger(e?.minimumPerArm) || e.minimumPerArm < 30)
    errors.push('minimumPerArm must be >=30');
  if (typeof e?.variantAllocation !== 'number' ||
      e.variantAllocation <= 0 || e.variantAllocation >= 1)
    errors.push('missing preregistered allocation probability');
  if(errors.length) return {verdict:'INVALID',errors};
  if (a.n < e.minimumPerArm || b.n < e.minimumPerArm)
    return {verdict:'UNDERPOWERED',errors:['preregistered minimum n not reached']};
  const n = a.n + b.n, fraction = e.variantAllocation;
  const zRatio = (b.n - n*fraction)/Math.sqrt(n*fraction*(1-fraction));
  const srmP = pTwoSided(zRatio);
  if(srmP < 0.001) return {verdict:'INVALID_SRM',errors:['sample-ratio mismatch'],srmP};
  const p0 = a.success/a.n, p1 = b.success/b.n, difference = p1-p0;
  const pooled = (a.success+b.success)/n;
  const sem = Math.sqrt(pooled*(1-pooled)*(1/a.n+1/b.n));
  const z = sem===0 ? 0 : difference/sem;
  const pValue = sem===0 ? 1 : pTwoSided(z);
  const variance = p0*(1-p0)/a.n + p1*(1-p1)/b.n;
  const ci95 = [difference-1.95996398454*Math.sqrt(variance),
    difference+1.95996398454*Math.sqrt(variance)];
  const result = {metric:e.metric,controlRate:p0,treatmentRate:p1,
    absoluteLift:difference,relativeLift:p0>0?difference/p0:null,
    pValue,ci95,srmP,observations:{control:a.n,treatment:b.n},
    authorization:'NONE',notes:'Fixed-horizon approximation; not valid for peeking or multiple comparisons.'};
  if(Date.parse(e.analyzedAt)<Date.parse(e.plannedEndAt))
    return {...result,verdict:'WAIT_END_OF_HORIZON'};
  if(e.guardrailsBreached===true) return {...result,verdict:'GUARDRAIL_BREACH'};
  if(e.guardrailsBreached!==false) return {...result,verdict:'GUARDRAIL_EVIDENCE_MISSING'};
  return {...result,verdict:pValue<0.05 && ci95[0]>0 ? 'WINNER_CANDIDATE'
    :pValue<0.05 && ci95[1]<0 ? 'LOSER_CANDIDATE':'INCONCLUSIVE'};
}
export function estimateEuroContribution(p) {
  const required = ['salesGross','refundsGross','vatRate','cogsNet',
    'mediaSpendNet','mediaVatRate','platformFeesNet','otherCostsNet'];
  const errors=[];
  if(p?.currency!=='EUR') errors.push('EUR pricing model only');
  for(const key of required)
    if (typeof p?.[key]!=='number' || !Number.isFinite(p[key]) || p[key]<0)
      errors.push('missing/invalid '+key);
  if(p?.vatRate > 1 || p?.mediaVatRate > 1) errors.push('invalid VAT rate');
  if(p?.refundsGross > p?.salesGross) errors.push('refunds exceed sales');
  if(errors.length) return {verdict:'INVALID',errors};
  const netSales = (p.salesGross-p.refundsGross)/(1+p.vatRate);
  const salesVat = p.salesGross-p.refundsGross-netSales;
  const mediaGross = p.mediaSpendNet*(1+p.mediaVatRate);
  const mediaVat = mediaGross-p.mediaSpendNet;
  return {verdict:'ESTIMATE_REQUIRES_LEDGER_VERIFICATION',currency:'EUR',
    netSales,salesVat,mediaNet:p.mediaSpendNet,mediaVat,mediaGross,
    netContribution:netSales-p.cogsNet-p.mediaSpendNet-p.platformFeesNet-p.otherCostsNet,
    cashBudgetForMediaGross:mediaGross,authorization:'NONE',
    limitations:['VAT recovery/partial deductibility not determined',
      'cash settlement not reconciled','income tax and financing cost excluded']};
}
