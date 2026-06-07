import { sql } from '../_db.js';

export type Feature =
  | 'simulator'
  | 'whatsapp'
  | 'export-xml'
  | 'api-integration'
  | 'advanced-reports'
  | 'digital-signature';

type Tier = 'basic' | 'pro' | 'enterprise';

const FEATURE_MATRIX: Record<Feature, Tier[]> = {
  simulator: ['pro', 'enterprise'],
  whatsapp: ['pro', 'enterprise'],
  'export-xml': ['enterprise'],
  'api-integration': ['enterprise'],
  'advanced-reports': ['pro', 'enterprise'],
  'digital-signature': ['pro', 'enterprise'],
};

const tierOrder: Record<Tier, number> = { basic: 0, pro: 1, enterprise: 2 };

export async function validateFeatureAccess(
  tenantId: string,
  feature: Feature,
): Promise<{ allowed: boolean; requiredTier: Tier; currentTier: Tier }> {
  const rows = await sql`
    SELECT plano_tier FROM tenants WHERE id = ${tenantId}::uuid LIMIT 1
  `;

  const currentTier = (rows?.[0]?.plano_tier || 'basic') as Tier;
  const allowedTiers = FEATURE_MATRIX[feature];
  const allowed = allowedTiers.includes(currentTier);
  const requiredTier = allowedTiers[0];

  return { allowed, requiredTier, currentTier };
}

export function requireFeature(feature: Feature) {
  return async (req: any, res: any, next: any) => {
    const tenantId = req.tenantId;
    if (!tenantId) {
      res.status(403).json({ error: 'Não autenticado' });
      return;
    }

    const { allowed, requiredTier, currentTier } = await validateFeatureAccess(tenantId, feature);

    if (!allowed) {
      res.status(403).json({
        error: 'Funcionalidade não disponível no seu plano',
        feature,
        currentTier,
        requiredTier,
        upgradeUrl: '/configuracoes',
      });
      return;
    }

    next();
  };
}
