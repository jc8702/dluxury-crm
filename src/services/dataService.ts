import type { Product, PaymentCondition } from '../types/simulator';

const mk = (m15: number, m10: number, m5: number, m0: number) => ({
  max_ccf: m15, max: m15, mid_ccf: m10, mid: m10,
  mg5_ccf: m5, mg5: m5, mg0_ccf: m0, mg0: m0,
  min_ccf: m10, min: m10,
});

export const INITIAL_PRODUCTS: Product[] = [
  { codigo: "700692724", descricao: "HCA-M73010572-SG",               minSemBureau: 267.09/1000, minComBureau: 310.53/1000, midSemBureau: 317.14/1000, midComBureau: 368.72/1000, mg5SemBureau: 289.97/1000, mg5ComBureau: 337.14/1000, mg0SemBureau: 267.09/1000, mg0ComBureau: 310.53/1000, maxSemBureau: 349.92/1000, maxComBureau: 406.84/1000, sem_bureau: mk(349.92,317.14,289.97,267.09), com_bureau: mk(406.84,368.72,337.14,310.53) },
  { codigo: "700624112", descricao: "HCA-M73010572-BOPP",             minSemBureau: 284.86/1000, minComBureau: 328.30/1000, midSemBureau: 338.24/1000, midComBureau: 389.82/1000, mg5SemBureau: 309.26/1000, mg5ComBureau: 356.43/1000, mg0SemBureau: 284.86/1000, mg0ComBureau: 328.30/1000, maxSemBureau: 373.20/1000, maxComBureau: 430.12/1000, sem_bureau: mk(373.20,338.24,309.26,284.86), com_bureau: mk(430.12,389.82,356.43,328.30) },
  { codigo: "700645989", descricao: "HCM-M7305020-PET (COMPRA E REVENDA)", minSemBureau: 1335.15/1000, minComBureau: 1357.62/1000, midSemBureau: 1585.34/1000, midComBureau: 1612.02/1000, mg5SemBureau: 1449.53/1000, mg5ComBureau: 1473.92/1000, mg0SemBureau: 1335.15/1000, mg0ComBureau: 1357.62/1000, maxSemBureau: 1749.22/1000, maxComBureau: 1778.66/1000, sem_bureau: mk(1749.22,1585.34,1449.53,1335.15), com_bureau: mk(1778.66,1612.02,1473.92,1357.62) },
  { codigo: "700711909", descricao: "HCA-M7307319-PET LAMINADO SG",   minSemBureau: 269.92/1000, minComBureau: 298.84/1000, midSemBureau: 320.50/1000, midComBureau: 354.84/1000, mg5SemBureau: 293.04/1000, mg5ComBureau: 324.44/1000, mg0SemBureau: 269.92/1000, mg0ComBureau: 298.84/1000, maxSemBureau: 353.63/1000, maxComBureau: 391.52/1000, sem_bureau: mk(353.63,320.50,293.04,269.92), com_bureau: mk(391.52,354.84,324.44,298.84) },
];

export const INITIAL_PAYMENT_CONDITIONS: PaymentCondition[] = [
  {codigo:"566",  criterio:"Antecipado",             pct:-0.015},
  {codigo:"78",   criterio:"30 dias",                pct:0.030},
  {codigo:"2070", criterio:"30/45 dias",             pct:0.030},
  {codigo:"213",  criterio:"30/45/60 dias",          pct:0.045},
  {codigo:"299",  criterio:"30/45/60/75 dias",       pct:0.060},
  {codigo:"1619", criterio:"30/45/60/75/90 dias",    pct:0.060},
  {codigo:"191",  criterio:"30/60/90 dias",          pct:0.060},
  {codigo:"701",  criterio:"28 dias",                pct:0.030},
  {codigo:"736",  criterio:"28/42/56 dias",          pct:0.045},
  {codigo:"469",  criterio:"28/56 dias",             pct:0.015},
  {codigo:"779",  criterio:"42/56/70 dias",          pct:0.060},
  {codigo:"1031", criterio:"60/90 dias",             pct:0.070},
  {codigo:"132",  criterio:"120 dias",               pct:0.090},
  {codigo:"--",   criterio:"30/60/90/120 dias",      pct:0.070},
  {codigo:"--",   criterio:"30/60 dias",             pct:0.045},
  {codigo:"--",   criterio:"60/90/120/150 dias",     pct:0.095},
  {codigo:"--",   criterio:"90 dias",                pct:0.070},
];
