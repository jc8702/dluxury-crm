import type { PecaInput } from '../../../../utils/planodeCorte';

export class DaeParser {
  static async parseCollada(fileText: string): Promise<PecaInput[]> {
    const parser = new DOMParser();
    const doc = parser.parseFromString(fileText, "application/xml");
    
    // Identificar a unidade de medida do arquivo (para converter para milímetros)
    const unitTag = doc.getElementsByTagName("unit")[0];
    let multiplier = 1000; // Padrão: assumimos que o arquivo está em metros (m * 1000 = mm)
    if (unitTag) {
      const meterRatio = parseFloat(unitTag.getAttribute("meter") || "1");
      // Se ratio for 0.0254 (inch), 0.0254 * 1000 = 25.4 (fator de conversão inch -> mm)
      // Se ratio for 1 (meter), 1 * 1000 = 1000
      multiplier = meterRatio * 1000;
    }

    const geometries = doc.getElementsByTagName("geometry");
    const pecasEncontradas: PecaInput[] = [];

    for (let i = 0; i < geometries.length; i++) {
      const geo = geometries[i];
      let id = geo.getAttribute('id') || geo.getAttribute('name') || `Componente_${i}`;
      
      // 1. Tentar parser de tags customizadas (ex: Plugins de Marcenaria)
      const extras = geo.getElementsByTagName("dimensions");
      if (extras.length > 0) {
        const dim = extras[0];
        const x = parseFloat(dim.getAttribute("x") || "0");
        const y = parseFloat(dim.getAttribute("y") || "0");
        const z = parseFloat(dim.getAttribute("z") || "0");
        const mat = dim.getAttribute("material") || "MDF-GENERICO";

        const medidas = [x, y, z].sort((a,b) => a - b);
        pecasEncontradas.push({
          id: `dae-${i}-${Math.random().toString(36).substring(7)}`,
          descricao: id,
          larguraMm: medidas[2],
          alturaMm: medidas[1],
          quantidade: 1,
          podeRotacionar: true,
          grupoMaterialId: mat
        });
        continue;
      }

      // 2. Fallback: Calcular Bounding Box a partir dos vértices (SketchUp Nativo)
      const floatArrays = geo.getElementsByTagName("float_array");
      for (let j = 0; j < floatArrays.length; j++) {
        const arrNode = floatArrays[j];
        const sourceId = arrNode.parentElement?.getAttribute("id") || "";
        
        // Normalmente a lista de vértices tem "position" no ID
        if (sourceId.toLowerCase().includes("position") || j === 0) {
          const text = arrNode.textContent || "";
          const floats = text.trim().split(/\s+/).map(n => parseFloat(n)).filter(n => !isNaN(n));
          
          if (floats.length >= 6) {
            let minX = Infinity, minY = Infinity, minZ = Infinity;
            let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
            
            for (let k = 0; k < floats.length; k += 3) {
              const x = floats[k], y = floats[k+1], z = floats[k+2];
              if (x < minX) minX = x; if (x > maxX) maxX = x;
              if (y < minY) minY = y; if (y > maxY) maxY = y;
              if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
            }
            
            const dx = Math.abs(maxX - minX) * multiplier;
            const dy = Math.abs(maxY - minY) * multiplier;
            const dz = Math.abs(maxZ - minZ) * multiplier;
            
            // Ignorar sujeiras ou geometrias 2D sem espessura volumétrica válida
            if (dx > 1 && dy > 1 && dz > 1) {
              const medidas = [Math.round(dx), Math.round(dy), Math.round(dz)].sort((a,b) => a - b);
              
              // Em marcenaria, a espessura da chapa costuma ser menor que 60mm.
              // Se a menor medida for gigante, é um bloco sólido, não uma chapa.
              if (medidas[0] <= 60) {
                // Limpar nomes sujos do SketchUp (ex: Component_1_mesh)
                let nomeLimpo = id.replace(/_mesh.*$/, '').replace(/geom-/, '').replace(/_/g, ' ');
                if (nomeLimpo.length > 25) nomeLimpo = nomeLimpo.substring(0, 25);

                pecasEncontradas.push({
                  id: `dae-${i}-${Math.random().toString(36).substring(7)}`,
                  descricao: nomeLimpo || `Peça ${i}`,
                  larguraMm: medidas[2],
                  alturaMm: medidas[1],
                  quantidade: 1,
                  podeRotacionar: true,
                  grupoMaterialId: `MDF-${medidas[0]}MM` // Ex: MDF-15MM
                });
                break; // Achou a bounding box, vai pro próximo geometry
              }
            }
          }
        }
      }
    }

    return pecasEncontradas;
  }
}
