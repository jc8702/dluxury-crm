/**
 * PARSER DE SKETCHUP (.dae COLLADA)
 * Extrai peças de arquivo exportado do SketchUp
 */

export interface PecaSketchUp {
  nome: string;
  largura_mm: number;
  altura_mm: number;
  espessura_mm: number;
  quantidade: number;
}

export async function parseSketchUpDAE(arquivo: File): Promise<PecaSketchUp[]> {
  const texto = await arquivo.text();
  const parser = new DOMParser();
  const xml = parser.parseFromString(texto, 'text/xml');

  const pecasUnicas = new Map<string, PecaSketchUp>();

  // Buscar geometrias (nós <geometry>)
  const geometrias = xml.querySelectorAll('geometry');

  geometrias.forEach(geo => {
    const id = geo.getAttribute('id') || 'sem_nome';
    const nome = limparNome(id);

    // Buscar mesh
    const mesh = geo.querySelector('mesh');
    if (!mesh) return;

    // Extrair vértices
    const vertices = extrairVertices(mesh);
    if (vertices.length < 4) return; // Geometria inválida ou muito simples

    // Calcular dimensões (bounding box)
    const dimensoes = calcularDimensoes(vertices);

    // Assumir que a menor dimensão é a espessura
    const dims = [dimensoes.largura, dimensoes.altura, dimensoes.profundidade].sort((a, b) => a - b);
    
    const largura = Math.round(dims[2]);
    const altura = Math.round(dims[1]);
    const espessura = Math.round(dims[0]);

    // Ignorar peças irrelevantes (menos de 5mm)
    if (largura < 5 || altura < 5) return;

    // Criar hash para deduplicação (largura_altura_espessura)
    const hash = `${largura}_${altura}_${espessura}`;

    if (pecasUnicas.has(hash)) {
      // Se já existe, apenas incrementa a quantidade
      const existente = pecasUnicas.get(hash)!;
      existente.quantidade += 1;
    } else {
      // Nova peça única
      pecasUnicas.set(hash, {
        nome,
        largura_mm: largura,
        altura_mm: altura,
        espessura_mm: espessura,
        quantidade: 1
      });
    }
  });

  return Array.from(pecasUnicas.values());
}

function limparNome(id: string): string {
  return id
    .replace(/^geometry_/, '')
    .replace(/_\d+$/, '')
    .replace(/_/g, ' ')
    .trim();
}

function extrairVertices(mesh: Element): number[][] {
  const vertices: number[][] = [];
  
  const floatArray = mesh.querySelector('float_array');
  if (!floatArray) return vertices;

  const numeros = floatArray.textContent?.trim().split(/\s+/).map(Number) || [];
  
  for (let i = 0; i < numeros.length; i += 3) {
    vertices.push([numeros[i], numeros[i + 1], numeros[i + 2]]);
  }

  return vertices;
}

function calcularDimensoes(vertices: number[][]): { largura: number; altura: number; profundidade: number } {
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;

  vertices.forEach(([x, y, z]) => {
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
    minZ = Math.min(minZ, z);
    maxZ = Math.max(maxZ, z);
  });

  // SketchUp usa polegadas por padrão, converter para mm
  const INCH_TO_MM = 25.4;

  return {
    largura: Math.abs(maxX - minX) * INCH_TO_MM,
    altura: Math.abs(maxY - minY) * INCH_TO_MM,
    profundidade: Math.abs(maxZ - minZ) * INCH_TO_MM
  };
}
