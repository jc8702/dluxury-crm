import React, { useState } from 'react';
import { ChapaMaterial, PecaCorte } from '../../../domain/entities/CuttingPlan';
import { Plus, Trash2, Edit3, ChevronDown, ChevronUp, Copy } from 'lucide-react';

interface Props {
  material: ChapaMaterial;
  onUpdate: (updated: ChapaMaterial) => void;
  onRemove: () => void;
}

export const MaterialCard: React.FC<Props> = ({ material, onUpdate, onRemove }) => {
  const [expanded, setExpanded] = useState(true);

  const addPeca = () => {
    const nome = prompt('Nome da Peça (Ex: Lateral Gaveta)');
    if (!nome) return;

    const nova: PecaCorte = {
      id: Math.random().toString(36).substr(2, 9),
      nome,
      largura_mm: 100,
      altura_mm: 100,
      quantidade: 1,
      rotacionavel: true
    };

    onUpdate({
      ...material,
      pecas: [...material.pecas, nova]
    });
  };

  const updatePeca = (id: string, field: keyof PecaCorte, value: any) => {
    onUpdate({
      ...material,
      pecas: material.pecas.map(p => p.id === id ? { ...p, [field]: value } : p)
    });
  };

  const removePeca = (id: string) => {
    onUpdate({
      ...material,
      pecas: material.pecas.filter(p => p.id !== id)
    });
  };

  const duplicatePeca = (peca: PecaCorte) => {
    const nova = { ...peca, id: Math.random().toString(36).substr(2, 9), nome: `${peca.nome} (Cópia)` };
    onUpdate({
      ...material,
      pecas: [...material.pecas, nova]
    });
  };

  return (
    <div className="bg-[#1A1D23] border border-[#2D333B] rounded-xl overflow-hidden mb-4 shadow-lg transition-all duration-300 hover:border-[#E2AC00]/30">
      {/* Header */}
      <div className="p-4 flex items-center justify-between bg-[#1C2128] border-b border-[#2D333B]">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-[#E2AC00]/10 rounded-lg flex items-center justify-center text-[#E2AC00]">
            <span className="font-bold text-sm">MDF</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-white font-bold">{material.sku}</span>
              <span className="text-[#8B949E] text-sm">| {material.nome}</span>
            </div>
            <div className="text-[#8B949E] text-xs">
              {material.largura_mm}x{material.altura_mm}mm | esp: {material.espessura_mm}mm
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setExpanded(!expanded)}
            className="p-2 text-[#8B949E] hover:text-white hover:bg-[#2D333B] rounded-lg transition-colors"
          >
            {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
          <button 
            onClick={onRemove}
            className="p-2 text-[#F85149] hover:bg-[#F85149]/10 rounded-lg transition-colors"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      {/* Body */}
      {expanded && (
        <div className="p-4 bg-[#0D1117]">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-[#C9D1D9] text-xs font-bold uppercase tracking-wider flex items-center gap-2">
              Peças ({material.pecas.length})
            </h4>
            <button 
              onClick={addPeca}
              className="flex items-center gap-1 text-[10px] bg-[#E2AC00] text-black font-bold px-2 py-1 rounded hover:bg-[#FFC400] transition-colors"
            >
              <Plus size={12} /> ADICIONAR PEÇA
            </button>
          </div>

          <div className="space-y-2">
            {material.pecas.map((peca) => (
              <div key={peca.id} className="flex items-center gap-3 p-3 bg-[#1C2128] border border-[#2D333B] rounded-lg group hover:border-[#E2AC00]/20 transition-all">
                <div className="flex-1">
                  <input 
                    type="text"
                    value={peca.nome}
                    onChange={(e) => updatePeca(peca.id, 'nome', e.target.value)}
                    className="bg-transparent border-none text-white text-sm focus:ring-0 w-full p-0 font-medium"
                    placeholder="Nome da peça"
                  />
                </div>
                
                <div className="flex items-center gap-4 text-xs">
                  <div className="flex flex-col">
                    <span className="text-[#8B949E] text-[10px]">LARGURA</span>
                    <input 
                      type="number"
                      value={peca.largura_mm}
                      onChange={(e) => updatePeca(peca.id, 'largura_mm', Number(e.target.value))}
                      className="bg-[#0D1117] border border-[#2D333B] rounded p-1 text-white w-20 focus:border-[#E2AC00]"
                    />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[#8B949E] text-[10px]">ALTURA</span>
                    <input 
                      type="number"
                      value={peca.altura_mm}
                      onChange={(e) => updatePeca(peca.id, 'altura_mm', Number(e.target.value))}
                      className="bg-[#0D1117] border border-[#2D333B] rounded p-1 text-white w-20 focus:border-[#E2AC00]"
                    />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[#8B949E] text-[10px]">QTD</span>
                    <input 
                      type="number"
                      value={peca.quantidade}
                      onChange={(e) => updatePeca(peca.id, 'quantidade', Number(e.target.value))}
                      className="bg-[#0D1117] border border-[#2D333B] rounded p-1 text-white w-14 focus:border-[#E2AC00]"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => duplicatePeca(peca)} className="p-1.5 text-[#8B949E] hover:text-[#E2AC00] rounded"><Copy size={14}/></button>
                  <button onClick={() => removePeca(peca.id)} className="p-1.5 text-[#8B949E] hover:text-[#F85149] rounded"><Trash2 size={14}/></button>
                </div>
              </div>
            ))}
            {material.pecas.length === 0 && (
              <div className="text-center p-8 border-2 border-dashed border-[#2D333B] rounded-lg">
                <span className="text-[#8B949E] text-sm">Nenhuma peça adicionada para este material.</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
