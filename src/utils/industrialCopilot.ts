/**
 * MOTOR DE ENGENHARIA PARAMÉTRICA (ARIA 3.0)
 * Especialista: Marcenaria, CAD Paramétrico e ERP Industrial
 */

// --- 1. INTERFACES DE ENGENHARIA ---

export interface Projeto {
  tipo: string;
  largura: number;
  altura: number;
  profundidade: number;
  espessura: number;
  gavetas: number;
  portas: number;
}

export interface Peca {
  nome: string;
  largura: number;
  altura: number;
  espessura: number;
  material: string;
}

export interface PlanoCorte {
  chapaId: number;
  pecas: Peca[];
  aproveitamento: number;
}

export interface SKU {
  skuId: string;
  descricao: string;
  unidade: string;
  custo: number;
}

export interface ResultadoProjetoCompleto {
  projeto: Projeto;
  pecas: Peca[];
  planoDeCorte: PlanoCorte[];
  custo: number;
  venda: {
    custo: number;
    preco: number;
    margem: number;
  };
}

// --- 2. BASE DE SKUS TÉCNICOS ---

const skuDB: SKU[] = [
  { skuId: "CHA-0001", descricao: "MDF 18mm Branco Tx", unidade: "M2", custo: 125 },
  { skuId: "CHA-0002", descricao: "HDF 6mm Branco (Fundo)", unidade: "M2", custo: 58 },
  { skuId: "FER-0001", descricao: "Corrediça Telescópica 450mm", unidade: "UN", custo: 28 },
  { skuId: "FER-0002", descricao: "Dobradiça Curva c/ Amort.", unidade: "UN", custo: 12 }
];

const CHAPA_PADRAO = {
  largura: 2750,
  altura: 1850
};

// --- 3. FUNÇÕES DO MOTOR ---

export function interpretarProjeto(msg: string): Projeto {
  const match = msg.match(/(\d+)x(\d+)(x(\d+))?/);
  
  const gavetasMatch = msg.match(/(\d+)\s*gaveta/i);
  const portasMatch = msg.match(/(\d+)\s*porta/i);

  return {
    tipo: msg.toLowerCase().includes("gaveteiro") ? "Gaveteiro" : 
          msg.toLowerCase().includes("armário") ? "Armário" : "Estrutura Industrial",
    largura: match ? Number(match[1]) : 600,
    altura: match ? Number(match[2]) : 700,
    profundidade: match?.[4] ? Number(match[4]) : 450,
    espessura: 18,
    gavetas: gavetasMatch ? Number(gavetasMatch[1]) : (msg.toLowerCase().includes("gaveta") ? 3 : 0),
    portas: portasMatch ? Number(portasMatch[1]) : (msg.toLowerCase().includes("porta") ? 2 : 0)
  };
}

export function gerarPecas(p: Projeto): Peca[] {
  const pecas: Peca[] = [];

  // Módulos Paramétricos: Laterais
  pecas.push({ nome: "Lateral Esquerda", largura: p.profundidade, altura: p.altura, espessura: p.espessura, material: "MDF" });
  pecas.push({ nome: "Lateral Direita", largura: p.profundidade, altura: p.altura, espessura: p.espessura, material: "MDF" });

  // Base e Topo (ajustados pelo encaixe interno)
  const larguraInterna = p.largura - (p.espessura * 2);
  pecas.push({ nome: "Base Inferior", largura: larguraInterna, altura: p.profundidade, espessura: p.espessura, material: "MDF" });
  pecas.push({ nome: "Tampo Superior", largura: larguraInterna, altura: p.profundidade, espessura: p.espessura, material: "MDF" });

  // Fundo (encaixado no rebaixo)
  pecas.push({ nome: "Fundo", largura: p.largura, altura: p.altura, espessura: 6, material: "HDF" });

  // Frentes (Gavetas ou Portas)
  if (p.gavetas > 0) {
    const alturaFrente = (p.altura / p.gavetas) - 4;
    for (let i = 1; i <= p.gavetas; i++) {
        pecas.push({ nome: `Frente Gaveta ${i}`, largura: p.largura - 4, altura: alturaFrente, espessura: p.espessura, material: "MDF" });
    }
  }

  return pecas;
}

function mapearSKU(material: string, espessura: number): SKU {
  if (material === "MDF" && espessura === 18) {
    return skuDB.find(s => s.skuId === "CHA-0001")!;
  }
  if (material === "HDF") {
    return skuDB.find(s => s.skuId === "CHA-0002")!;
  }
  return { skuId: "GEN-01", descricao: "Material Genérico", unidade: "M2", custo: 100 };
}

export function otimizarCorte(pecas: Peca[]): PlanoCorte[] {
  let chapas: PlanoCorte[] = [];
  let atual: PlanoCorte = {
    chapaId: 1,
    pecas: [],
    aproveitamento: 0
  };

  const areaChapa = CHAPA_PADRAO.largura * CHAPA_PADRAO.altura;
  let areaUsada = 0;

  // Algoritmo de First-Fit simplificado para aproveitamento de área
  for (const p of pecas) {
    const areaPeca = p.largura * p.altura;

    if (areaUsada + areaPeca > areaChapa) {
      atual.aproveitamento = parseFloat(((areaUsada / areaChapa) * 100).toFixed(2));
      chapas.push(atual);

      atual = {
        chapaId: chapas.length + 1,
        pecas: [],
        aproveitamento: 0
      };

      areaUsada = 0;
    }

    atual.pecas.push(p);
    areaUsada += areaPeca;
  }

  atual.aproveitamento = parseFloat(((areaUsada / areaChapa) * 100).toFixed(2));
  chapas.push(atual);

  return chapas;
}

export function calcularCustoReal(pecas: Peca[], itensExtras: { gavetas: number; portas: number }): number {
  let total = 0;

  // Custo de Chapas
  pecas.forEach(p => {
    const sku = mapearSKU(p.material, p.espessura);
    const area = (p.largura * p.altura) / 1000000;
    total += area * sku.custo;
  });

  // Custo de Ferragens
  if (itensExtras.gavetas > 0) {
      total += itensExtras.gavetas * skuDB.find(s => s.skuId === "FER-0001")!.custo;
  }
  if (itensExtras.portas > 0) {
      total += (itensExtras.portas * 2) * skuDB.find(s => s.skuId === "FER-0002")!.custo;
  }

  return parseFloat(total.toFixed(2));
}

export function gerarProjetoCompleto(msg: string): ResultadoProjetoCompleto {
  const projeto = interpretarProjeto(msg);
  const pecas = gerarPecas(projeto);
  const corte = otimizarCorte(pecas);
  const custo = calcularCustoReal(pecas, { gavetas: projeto.gavetas, portas: projeto.portas });
  
  const markup = 2.5;
  const preco = custo * markup;

  return {
    projeto,
    pecas,
    planoDeCorte: corte,
    custo,
    venda: {
      custo,
      preco: parseFloat(preco.toFixed(2)),
      margem: parseFloat((((preco - custo) / preco) * 100).toFixed(2))
    }
  };
}
