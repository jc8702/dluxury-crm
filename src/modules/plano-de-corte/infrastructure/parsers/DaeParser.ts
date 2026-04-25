import type { PecaInput } from '../../../../utils/planodeCorte';

export class DaeParser {
  static async parseCollada(fileText: string): Promise<PecaInput[]> {
    const parser = new DOMParser();
    const doc = parser.parseFromString(fileText, "application/xml");
    
    // Busca os nodes de geometria (onde as caixas do Sketchup ficam salvas)
    const geometries = doc.getElementsByTagName("geometry");
    const pecasEncontradas: PecaInput[] = [];

    for (let i = 0; i < geometries.length; i++) {
      const geo = geometries[i];
      const id = geo.getAttribute('id') || `peca-${i}`;
      
      // Em Collada, precisamos achar o Bounding Box ou os vértices.
      // Simplificando o parser para buscar tags customizadas geradas pelo plugin:
      // <extra><technique><dimensions x="100" y="50" z="15" material="MDF-Branco"/></technique></extra>
      
      const extras = geo.getElementsByTagName("dimensions");
      if (extras.length > 0) {
        const dim = extras[0];
        const x = parseFloat(dim.getAttribute("x") || "0");
        const y = parseFloat(dim.getAttribute("y") || "0");
        const z = parseFloat(dim.getAttribute("z") || "0");
        const mat = dim.getAttribute("material") || "MDF-GENERICO";

        // Identifica qual é a espessura (menor medida)
        const medidas = [x, y, z].sort((a,b) => a - b);
        const espessura = medidas[0];
        const altura = medidas[1];
        const largura = medidas[2];

        pecasEncontradas.push({
          id,
          descricao: `Componente 3D ${i}`,
          larguraMm: largura,
          alturaMm: altura,
          quantidade: 1,
          podeRotacionar: true,
          grupoMaterialId: mat // Vai precisar de um de-para no frontend
        });
      }
    }

    return pecasEncontradas;
  }
}
