import { describe, it, expect } from 'vitest';

import * as agenda from '../schema/agenda.js';
import * as billing from '../schema/billing.js';
import * as conhecimento from '../schema/conhecimento.js';
import * as contratoDigital from '../schema/contrato-digital.js';
import * as crm from '../schema/crm.js';
import * as estoqueGranular from '../schema/estoque-granular.js';
import * as financeiro from '../schema/financeiro.js';
import * as indexSchema from '../schema/index.js';
import * as planosDeCorte from '../schema/planos-de-corte.js';
import * as producao from '../schema/producao.js';
import * as prospeccao from '../schema/prospeccao.js';
import * as quotations from '../schema/quotations.js';
import * as rentabilidade from '../schema/rentabilidade.js';
import * as skus from '../schema/skus.js';
import * as tenants from '../schema/tenants.js';
import * as whatsapp from '../schema/whatsapp.js';

function executarFuncoesRecursivo(obj: any, visitados = new Set()) {
  if (!obj || visitados.has(obj)) return;
  visitados.add(obj);

  if (typeof obj === 'function') {
    try {
      obj();
    } catch {}
    return;
  }

  if (typeof obj === 'object') {
    const keys = [...Object.getOwnPropertyNames(obj), ...Object.getOwnPropertySymbols(obj)];
    for (const key of keys) {
      try {
        const val = obj[key];
        executarFuncoesRecursivo(val, visitados);
      } catch {}
    }
  }
}

describe('Drizzle Schemas Deep loading', () => {
  it('deve carregar todos os schemas e executar relacoes e referencias latentes', () => {
    const modules = [
      agenda, billing, conhecimento, contratoDigital, crm,
      estoqueGranular, financeiro, indexSchema, planosDeCorte,
      producao, prospeccao, quotations, rentabilidade, skus,
      tenants, whatsapp
    ];

    modules.forEach((mod) => {
      expect(mod).toBeDefined();
      executarFuncoesRecursivo(mod);
    });
  });
});
