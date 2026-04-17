import { calcularPrecoProjeto, ProjetoInput } from './src/utils/pricingEngine.ts';
import { pricingManager } from './src/utils/pricingConfig.ts';

/**
 * DEMONSTRAÇÃO DE INTEGRAÇÃO: MOTOR + CAMADA DE CONFIGURAÇÃO
 */

// 1. Definição do Projeto (Input do Vendedor)
const meuProjeto: ProjetoInput = {
  tipoProjeto: 'Cozinha', // Existe no config
  tempoProducaoMinutos: 600, // 10 horas
  itens: [
    { skuId: 'MDF-LOURO-18', categoria: 'Chapa', quantidade: 4, custoMedio: 280 },
    { skuId: 'FITA-LOURO', categoria: 'Fita', quantidade: 30, custoMedio: 2.5 },
    { skuId: 'OUTRO-ITEM', categoria: 'Desconhecida', quantidade: 1, custoMedio: 100 } // Vai disparar fallback
  ]
};

// 2. Execução do Motor usando o Manager de Configuração
// Passamos o .fullConfig para o motor, que agora sabe lidar com os fallbacks definidos
const resultado = calcularPrecoProjeto(meuProjeto, pricingManager.fullConfig);

// 3. Exibição dos Resultados
console.log('--- RELATÓRIO DE PRECIFICAÇÃO CONSOLIDADA ---');
console.log(`Tipo de Projeto: ${meuProjeto.tipoProjeto}`);
console.log(`Preço Final Sugerido: R$ ${resultado.precoFinal.toFixed(2)}`);
console.log(`Custo Total: R$ ${resultado.custoTotal.toFixed(2)}`);
console.log(`Margem Real: ${(resultado.margem * 100).toFixed(2)}%`);

if (resultado.alertas.length > 0) {
  console.log('\n⚠️  ALERTAS DO SISTEMA:');
  resultado.alertas.forEach(a => console.log(`- ${a}`));
}
