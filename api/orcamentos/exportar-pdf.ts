import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  return res.status(501).json({
    error: 'Endpoint legado',
    details:
      'Exportacao de PDF de orcamento usava a tabela morta "orcamentos" (mapeada para orcamentos_pro). ' +
      'Esta rota foi desativada em 2026-06-04 (PROMPT 1) - dados foram migrados para "quotations". ' +
      'A reescrita usando quotations esta prevista no PROMPT 2.',
    rota_legada: '/api/orcamentos/exportar-pdf',
    rota_nova: '/api/quotations/:id/pdf',
  });
}
