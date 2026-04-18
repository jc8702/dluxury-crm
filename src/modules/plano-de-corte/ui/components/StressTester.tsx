import React from 'react';
import { ChapaMaterial, PecaCorte } from '../../../domain/entities/CuttingPlan';
import { Zap, Activity } from 'lucide-react';

interface Props {
  onInject: (materiais: ChapaMaterial[]) => void;
}

export const StressTester: React.FC<Props> = ({ onInject }) => {
  const generateData = (numMaterials: number, piecesPerMaterial: number) => {
    const materiais: ChapaMaterial[] = [];
    
    for (let i = 0; i < numMaterials; i++) {
      const matId = Math.random().toString(36).substr(2, 9);
      const mat: ChapaMaterial = {
        id: matId,
        sku: `STRESS-MDF-${i}`,
        nome: `Material de Teste ${i}`,
        largura_mm: 2750,
        altura_mm: 1830,
        espessura_mm: 18,
        pecas: []
      };

      for (let j = 0; j < piecesPerMaterial; j++) {
        mat.pecas.push({
          id: `${matId}_P${j}`,
          nome: `Peça ${i}-${j}`,
          largura_mm: 100 + Math.floor(Math.random() * 800),
          altura_mm: 100 + Math.floor(Math.random() * 800),
          quantidade: 1 + Math.floor(Math.random() * 3),
          rotacionavel: true
        });
      }
      materiais.push(mat);
    }
    
    onInject(materiais);
  };

  return (
    <div className="p-4 bg-[#E2AC00]/5 border border-[#E2AC00]/20 rounded-xl mb-6">
      <div className="flex items-center gap-2 text-[#E2AC00] mb-3">
        <Activity size={16} />
        <span className="text-[10px] font-bold uppercase tracking-wider">Laboratório de Teste de Carga</span>
      </div>
      
      <div className="grid grid-cols-2 gap-2">
        <button 
          onClick={() => generateData(2, 10)}
          className="bg-[#2D333B] hover:bg-[#E2AC00] hover:text-black text-white text-[10px] font-bold py-2 rounded transition-all flex items-center justify-center gap-1"
        >
          <Zap size={10} /> CARGA LEVE
        </button>
        <button 
          onClick={() => generateData(5, 40)}
          className="bg-[#2D333B] hover:bg-[#F85149] text-white text-[10px] font-bold py-2 rounded transition-all flex items-center justify-center gap-1"
        >
          <Zap size={10} /> CARGA PESADA
        </button>
      </div>
      <p className="text-[9px] text-[#8B949E] mt-2 italic text-center">
        * Injeta dados falsos para validar a performance do Web Worker.
      </p>
    </div>
  );
};
