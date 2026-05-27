export type PlanTier = 'basic' | 'pro' | 'enterprise';

export const FEATURES: Record<PlanTier, string[]> = {
  basic: ['crm', 'orcamentos'],
  pro: ['crm', 'orcamentos', 'financeiro', 'ia', 'plano_corte', 'estoque'],
  enterprise: ['crm', 'orcamentos', 'financeiro', 'ia', 'plano_corte', 'estoque', 'simulador_cnc']
};

export const PLAN_LIMITS: Record<PlanTier, { maxUsers: number }> = {
  basic: { maxUsers: 2 },
  pro: { maxUsers: 5 },
  enterprise: { maxUsers: 99999 }
};

export function hasFeature(plan: PlanTier, feature: string): boolean {
  const allowed = FEATURES[plan] || [];
  return allowed.includes(feature) || allowed.includes('all');
}
