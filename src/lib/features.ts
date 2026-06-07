export type PlanTier = 'basic' | 'pro' | 'enterprise';

export type Feature =
  | 'crm'
  | 'quotations'
  | 'financeiro'
  | 'ia'
  | 'plano_corte'
  | 'estoque'
  | 'simulador_cnc'
  | 'simulator'
  | 'whatsapp'
  | 'export-xml'
  | 'api-integration'
  | 'advanced-reports'
  | 'digital-signature';

export const FEATURES: Record<PlanTier, string[]> = {
  basic: ['crm', 'quotations'],
  pro: [
    'crm',
    'quotations',
    'financeiro',
    'ia',
    'plano_corte',
    'estoque',
    'simulador_cnc',
    'simulator',
    'whatsapp',
    'advanced-reports',
    'digital-signature',
  ],
  enterprise: [
    'crm',
    'quotations',
    'financeiro',
    'ia',
    'plano_corte',
    'estoque',
    'simulador_cnc',
    'simulator',
    'whatsapp',
    'advanced-reports',
    'digital-signature',
    'export-xml',
    'api-integration',
  ],
};

export const PLAN_LIMITS: Record<PlanTier, { maxUsers: number }> = {
  basic: { maxUsers: 2 },
  pro: { maxUsers: 5 },
  enterprise: { maxUsers: 99999 },
};

export function hasFeature(plan: PlanTier, feature: string): boolean {
  const allowed = FEATURES[plan] || [];
  return allowed.includes(feature) || allowed.includes('all');
}
