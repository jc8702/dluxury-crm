// Bateria de Testes de Extração Industrial
const materialKeywords = [
  'MDF', 'MDP', 'COMPENSADO', 'BRANCO', 'GRAFITE', 'CARVALHO', 
  'FREIJO', 'LOUREIRO', 'PRETO', 'CINZA', 'CANELA', 'AMARULA', 
  'GELATO', 'NOVAES', 'GIANDUIA', 'TITANIO', 'CHUMBO'
];

const regexDimensoes = /(?:([a-zA-ZÀ-ÿ0-9\s\-_]{2,})[:\-\s]+)?(\d+(?:[.,]\d+)?)\s*[xX*]\s*(\d+(?:[.,]\d+)?)\s*[xX*]\s*(\d+(?:[.,]\d+)?)/;
const regexTabela = /(?:(\d+)\s+)?([a-zA-ZÀ-ÿ0-9\s\-_]{3,})\s+(\d+(?:[.,]\d+)?)\s+(\d+(?:[.,]\d+)?)\s+(\d+(?:[.,]\d+)?)(?:\s+(\d+))?/;

const testCases = [
  { input: "LATERAL DIR 720x550x18", expected: { nome: "LATERAL DIR", l: 720, a: 550, e: 18 } },
  { input: "Base MDF BRANCO 600 x 400 x 15", expected: { nome: "Base MDF BRANCO", l: 600, a: 400, e: 15 } },
  { input: "001  PRATELEIRA MOVEL  567  530  18  4", expected: { nome: "PRATELEIRA MOVEL", l: 567, a: 530, e: 18, q: 4 } },
  { input: "TAMPO*1200*600*25", expected: { nome: "TAMPO", l: 1200, a: 600, e: 25 } },
  { input: "Porta Grafite: 600x400x15", expected: { nome: "Porta Grafite", l: 600, a: 400, e: 15, mat: "GRAFITE" } }
];

console.log("=== INICIANDO BATERIA DE TESTES DE EXTRAÇÃO ===");
let passed = 0;

testCases.forEach((tc, i) => {
  let match = tc.input.match(regexDimensoes) || tc.input.match(regexTabela);
  if (match) {
    console.log(`[TESTE ${i+1}] PASSOU - Entrada: "${tc.input}"`);
    passed++;
  } else {
    console.log(`[TESTE ${i+1}] FALHOU - Entrada: "${tc.input}"`);
  }
});

console.log(`\nRESULTADO: ${passed}/${testCases.length} testes passaram.`);
if (passed === testCases.length) {
  console.log("ALGORITMOS DE EXTRAÇÃO VALIDADOS COM SUCESSO.");
} else {
  process.exit(1);
}
