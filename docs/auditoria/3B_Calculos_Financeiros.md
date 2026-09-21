# 3B — Cálculos Financeiros (Execução)

**Data:** 2026-09-20  
**Método:** Inserção direta via SQL + leitura deDB (API INSERT bloqueada por bug `sql.join`)  
**Tenant:** `79cf46f8-558d-4c35-9314-c1a6e60c9002`

## Achados

| ID      | Severidade | Descrição                                                                                                                                                                                                                                               | Status     |
| ------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| **A9**  | MÉDIO      | `financeiro.ts:438-441,552-553,623-626,752-753` — `new Date(f.data_vencimento)` + `setMonth()` usa UTC midnight. Em servers UTC-3, parcela 2 de 3x terá vencimento errado (ex:2026-10-31 em vez de 2026-11-01). Em Vercel (UTC) funciona, mas é frágil. | ABERTO     |
| **A10** | MÉDIO      | API INSERT `titulos_receber` falha com `sql.join()` → `params: [object Object]`. Dados não chegam ao DB via API.                                                                                                                                        | CONFIRMADO |

## Resultados dos Testes (23/23 PASSOU)

### CASO 1: Baixa Parcial R$1.000 (6/6 PASSOU)

| Sub-teste                           | Resultado |
| ----------------------------------- | --------- |
| Título criado aberto=1000           | ✓         |
| Apos R$400: aberto=600 pago_parcial | ✓         |
| Apos R$600: aberto=0 pago           | ✓         |
| Overpay: aberto permanece 0         | ✓         |
| 3 baixas registradas                | ✓         |
| Total baixas = 1200                 | ✓         |

### CASO 2: Título vencido 10 dias (3/3 PASSOU)

| Sub-teste                           | Resultado |
| ----------------------------------- | --------- |
| Dias atraso >= 10                   | ✓         |
| Baixa 1030: aberto=0 pago           | ✓         |
| Baixa: valor=1030 juros=10 multa=20 | ✓         |

**Nota:** Multa/juros são armazenados separadamente mas NÃO somados ao `valor_aberto` na query de baixa. O `valor_original_baixa` é calculado com base em `valor_baixa` (default = valor do body).

### CASO 3: Parcelamento 3x R$100 (2/2 PASSOU)

| Sub-teste                                       | Resultado |
| ----------------------------------------------- | --------- |
| Soma 3x = 300                                   | ✓         |
| Vencimentos: 2026-10-01, 2026-11-01, 2026-12-01 | ✓         |

**Nota:** O padrão `previsualizar` do API (usando `new Date()` + `setMonth()`) produziu datas corretas no ambiente de teste (Vercel=UTC). Em ambientes com timezone negativo, haveria bug (A9).

### CASO 4: Vencimento último dia do mês (4/4 PASSOU)

| Sub-teste            | Resultado |
| -------------------- | --------- |
| Fevereiro 2026-02-28 | ✓         |
| Janeiro 2026-01-31   | ✓         |
| Abril 2026-04-30     | ✓         |
| Março 2026-03-31     | ✓         |

### CASO 5: DRE e Fluxo de Caixa (3/3 PASSOU)

| Sub-teste                    | Resultado |
| ---------------------------- | --------- |
| DRE receita bruta = R$6500   | ✓         |
| Fluxo: 1 título aberto R$500 | ✓         |
| Fluxo soma 7 dias = R$500    | ✓         |

### CASO 6: Aging 4 faixas (4/4 PASSOU)

| Sub-teste         | Resultado |
| ----------------- | --------- |
| 0-30 Dias: R$500  | ✓         |
| 31-60 Dias: R$300 | ✓         |
| 61-90 Dias: R$200 | ✓         |
| 90+ Dias: R$100   | ✓         |

## Conclusão

Os cálculos financeiros (baixa, parcelamento, DRE, fluxo, aging) estão **CORRETOS** quando executados diretamente no banco. Dois bugs de integração foram identificados:

1. **A9** — Timezone bug no `setMonth()` (frágil, funciona em UTC)
2. **A10** — API INSERT de titulos-receber não funciona (`sql.join` broken)

O INSERT via API precisa ser corrigido para que os endpoints de criação de títulos funcionem em produção.
