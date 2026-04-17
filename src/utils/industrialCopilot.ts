/**
 * MOTOR DE ENGENHARIA INDUSTRIAL - MARCENARIA SOB MEDIDA
 * Especialista: Copiloto Industrial D'Luxury
 */

// --- 1. INTERFACES DE ESTRUTURA ---

export interface EstruturaProjeto {
  tipo: string;
  largura: number;
  altura: number;
  profundidade: number;
  gavetas: number;
  portas: number;
}

export interface ItemBOM {
  item: string;
  quantidade: number;
  unidade: string;
}

export interface BOM {
  chapas: ItemBOM[];
  ferragens: ItemBOM[];
  acabamento: ItemBOM[];
}

export interface Orcamento {
  custo: number;
  preco: number;
  margem: number;
}

export interface ResultadoOrcamento {
  estrutura: EstruturaProjeto;
  bom: BOM;
  custo: number;
  venda: Orcamento;
}

// --- 2. FUNÇÕES DO MOTOR ---

/**
 * Interpreta a mensagem do usuário para extrair dimensões e componentes.
 * Padrão esperado: "gaveteiro 3 gavetas 600x700x450"
 */
export function interpretarProjeto(msg: string): EstruturaProjeto {
  const match = msg.match(/(\d+)x(\d+)(x(\d+))?/);
  
  const gavetasMatch = msg.match(/(\d+)\s*gaveta/i);
  const portasMatch = msg.match(/(\d+)\s*porta/i);

  return {
    tipo: msg.toLowerCase().includes("gaveteiro") ? "Gaveteiro" : 
          msg.toLowerCase().includes("armário") ? "Armário" : "Projeto Genérico",
    largura: match ? Number(match[1]) : 600,
    altura: match ? Number(match[2]) : 700,
    profundidade: match?.[4] ? Number(match[4]) : 450,
    gavetas: gavetasMatch ? Number(gavetasMatch[1]) : (msg.toLowerCase().includes("gaveta") ? 3 : 0),
    portas: portasMatch ? Number(portasMatch[1]) : (msg.toLowerCase().includes("porta") ? 2 : 0)
  };
}

/**
 * Gera a Lista de Materiais (BOM) baseada na estrutura do projeto.
 */
export function gerarBOM(estrutura: EstruturaProjeto): BOM {
  // Cálculo simplificado de área (Laterais + Frentes + Base/Tampo)
  const areaM2 = ((estrutura.largura * estrutura.altura * 2) + 
                  (estrutura.largura * estrutura.profundidade * 2) + 
                  (estrutura.altura * estrutura.profundidade * 2)) / 1000000;

  return {
    chapas: [
      {
        item: "MDF 18mm Branco Tx (Chapa)",
        quantidade: parseFloat(areaM2.toFixed(2)),
        unidade: "M2"
      }
    ],
    ferragens: [
      {
        item: "Corrediça Telescópica 450mm",
        quantidade: estrutura.gavetas,
        unidade: "UN"
      },
      {
        item: "Dobradiça Curva c/ Amortecedor",
        quantidade: estrutura.portas * 2,
        unidade: "UN"
      },
      {
        item: "Parafuso Zincado 4.0x50",
        quantidade: (estrutura.gavetas * 12) + (estrutura.portas * 8) + 20,
        unidade: "UN"
      }
    ],
    acabamento: [
      {
        item: "Fita de Borda PVC Branca 22mm",
        quantidade: parseFloat(((estrutura.largura + estrutura.altura) * 0.04).toFixed(2)),
        unidade: "M"
      }
    ]
  };
}

/**
 * Calcula o custo total dos itens na BOM.
 */
export function calcularCusto(bom: BOM): number {
  let total = 0;

  bom.chapas.forEach(c => {
    total += c.quantidade * 125; // Preço médio M2 MDF 18mm
  });

  bom.ferragens.forEach(f => {
    if (f.item.includes("Corrediça")) total += f.quantidade * 28;
    if (f.item.includes("Dobradiça")) total += f.quantidade * 12;
    if (f.item.includes("Parafuso")) total += f.quantidade * 0.15;
  });

  bom.acabamento.forEach(a => {
    total += a.quantidade * 1.5; // Valor metro fita de borda
  });

  return parseFloat(total.toFixed(2));
}

/**
 * Calcula o preço de venda e margem baseado no markup industrial.
 */
export function calcularVenda(custo: number): Orcamento {
  const markup = 2.5; // Markup padrão de marcenaria (Custo x 2.5)
  const preco = custo * markup;

  return {
    custo,
    preco: parseFloat(preco.toFixed(2)),
    margem: parseFloat((((preco - custo) / preco) * 100).toFixed(2))
  };
}

/**
 * Função mestre para gerar o orçamento completo a partir da mensagem.
 */
export function gerarOrcamentoRelatorio(mensagem: string): ResultadoOrcamento {
  const estrutura = interpretarProjeto(mensagem);
  const bom = gerarBOM(estrutura);
  const custo = calcularCusto(bom);
  const venda = calcularVenda(custo);

  return {
    estrutura,
    bom,
    custo,
    venda
  };
}
