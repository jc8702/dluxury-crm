# Guia de Implementação: Motor de Engenharia Industrial

Este guia descreve como utilizar o novo Motor de Engenharia do D'Luxury ERP.

## 1. Estrutura de Diretórios
- `src/modules/engenharia/application/usecases/ProcessadorProjeto.ts`: Orquestrador principal.
- `src/modules/engenharia/domain/services/GeradorPecasParametrico.ts`: Motor de fórmulas e templates.
- `src/modules/engenharia/domain/services/CustosService.ts`: Calculadora de custos reais.

## 2. Fluxo de Uso
O `ProcessadorProjeto` é o ponto de entrada único. Ele gerencia todo o ciclo de vida:

```typescript
import { ProcessadorProjeto } from './src/modules/engenharia/application/usecases/ProcessadorProjeto';

const processador = new ProcessadorProjeto(db, logger);

const resultado = await processador.processar({
  descricao_projeto: "Armário 120x80cm com 3 gavetas",
  sku_chapa: "MDF-18MM-BRA",
  usuario_id: "admin",
  opcoes: {
    usar_retalhos: true,
    margem_minima: 0.35 // 35% de margem
  }
});

if (resultado.sucesso) {
  console.log("Preço Sugerido:", resultado.custos.preco_venda);
}
```

## 3. Configuração de Templates (DB)
Os templates de móveis são carregados da tabela `projeto_tipos`.
- Use a coluna `parametros` (JSON) para definir limites físicos.
- Use a coluna `template_pecas` (JSON) para definir fórmulas matemáticas (ex: `P_ALTURA - 36` para laterais).

## 4. Integração com Chat (Copilot)
O `industrialCopilot.ts` agora deve atuar apenas como um roteador de intenções, chamando o `ProcessadorProjeto` para realizar o trabalho pesado de engenharia.

## 5. Próximos Passos
1. Executar as migrações de banco de dados pendentes.
2. Validar fórmulas no `GeradorPecasParametrico`.
3. Sincronizar preços de materiais no `CustosService`.
