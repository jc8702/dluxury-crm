import React, { useState } from 'react';
import { ResultadoOtimizacao } from '../../domain/entities/CuttingPlan';
import { ZoomIn, ZoomOut, Maximize2, ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
  resultado: ResultadoOtimizacao;
}

export const ResultadoCanvas: React.FC<Props> = ({ resultado }) => {
  const [currentChapa, setCurrentChapa] = useState(0);
  const [zoom, setZoom] = useState(1);
  
  const layout = resultado.layouts[currentChapa];
  if (!layout) return null;

  // Encontrar dimensões para o SVG (baseado em peças ou chapa fixa se for material unificado)
  // Como o LayoutChapa não tem W/H direto, vamos assumir que ele segue o material
  // Para fins visuais, vamos pegar o limite máximo das peças se não tivermos a chapa
  const maxW = Math.max(...layout.pecas_posicionadas.map(p => p.x + p.largura), 2750);
  const maxH = Math.max(...layout.pecas_posicionadas.map(p => p.y + p.altura), 1830);

  // Escala para caber no container (ex: 800px largura)
  const containerW = 800;
  const scale = (containerW / maxW) * zoom;

  return (
    <div className="bg-[#0D1117] border border-[#2D333B] rounded-xl overflow-hidden shadow-2xl">
      {/* Toolbar */}
      <div className="p-4 bg-[#1C2128] border-b border-[#2D333B] flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center bg-[#0D1117] rounded-lg p-1 border border-[#2D333B]">
            <button 
              onClick={() => setCurrentChapa(Math.max(0, currentChapa - 1))}
              disabled={currentChapa === 0}
              className="p-1 text-[#8B949E] hover:text-white disabled:opacity-30"
            >
              <ChevronLeft size={20} />
            </button>
            <span className="px-3 text-white text-sm font-medium">
              Chapa {currentChapa + 1} de {resultado.layouts.length}
            </span>
            <button 
              onClick={() => setCurrentChapa(Math.min(resultado.layouts.length - 1, currentChapa + 1))}
              disabled={currentChapa === resultado.layouts.length - 1}
              className="p-1 text-[#8B949E] hover:text-white disabled:opacity-30"
            >
              <ChevronRight size={20} />
            </button>
          </div>
          <span className="text-[#8B949E] text-xs font-mono">{layout.chapa_sku}</span>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => setZoom(z => Math.max(0.5, z - 0.2))} className="p-2 text-[#8B949E] hover:text-white hover:bg-[#2D333B] rounded-lg"><ZoomOut size={18}/></button>
          <span className="text-[#8B949E] text-xs w-10 text-center">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom(z => Math.min(3, z + 0.2))} className="p-2 text-[#8B949E] hover:text-white hover:bg-[#2D333B] rounded-lg"><ZoomIn size={18}/></button>
          <button onClick={() => setZoom(1)} className="p-2 text-[#8B949E] hover:text-white hover:bg-[#2D333B] rounded-lg"><Maximize2 size={18}/></button>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="relative p-10 overflow-auto flex justify-center bg-[#090C10] min-h-[500px]">
        <svg 
          width={maxW * scale} 
          height={maxH * scale} 
          viewBox={`0 0 ${maxW} ${maxH}`}
          className="shadow-2xl bg-white/5 rounded-sm"
        >
          {/* Fundo da Chapa */}
          <rect x={0} y={0} width={maxW} height={maxH} fill="#1C2128" stroke="#2D333B" strokeWidth={2} />
          
          {/* Peças Posicionadas */}
          {layout.pecas_posicionadas.map((peca, idx) => {
            const h = (idx * 137) % 360; // Cor dinâmica por peça
            return (
              <g key={peca.peca_id} className="group cursor-pointer">
                <rect 
                  x={peca.x} 
                  y={peca.y} 
                  width={peca.largura} 
                  height={peca.altura} 
                  fill={`hsla(${h}, 70%, 50%, 0.3)`}
                  stroke={`hsla(${h}, 70%, 50%, 0.8)`}
                  strokeWidth={1}
                  className="transition-all group-hover:fill-opacity-50"
                />
                {peca.largura > 100 && peca.altura > 50 && (
                  <text 
                    x={peca.x + 5} 
                    y={peca.y + 15} 
                    fill="white" 
                    fontSize="10" 
                    className="select-none font-bold"
                    style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}
                  >
                    {peca.nome}
                  </text>
                )}
                {/* Dimensões se o zoom for suficiente ou no hover? (hover visual) */}
                <rect 
                  x={peca.x} y={peca.y} width={peca.largura} height={peca.altura} 
                  fill="transparent" 
                  className="group-hover:stroke-[#E2AC00] group-hover:stroke-2"
                />
              </g>
            );
          })}
        </svg>
      </div>

      {/* Estatísticas da Chapa Atual */}
      <div className="p-4 bg-[#1C2128] border-t border-[#2D333B] grid grid-cols-3 gap-8">
        <div>
          <span className="text-[#8B949E] text-[10px] uppercase font-bold tracking-widest block mb-1">Aproveitamento</span>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2 bg-[#0D1117] rounded-full overflow-hidden">
              <div 
                className="h-full bg-[#E2AC00]" 
                style={{ width: `${(layout.area_aproveitada_mm2 / (maxW * maxH)) * 100}%` }}
              />
            </div>
            <span className="text-white font-bold text-sm">
              {Math.round((layout.area_aproveitada_mm2 / (maxW * maxH)) * 100)}%
            </span>
          </div>
        </div>
        <div>
          <span className="text-[#8B949E] text-[10px] uppercase font-bold tracking-widest block mb-1">Peças</span>
          <span className="text-white font-bold text-sm">{layout.pecas_posicionadas.length} un</span>
        </div>
        <div>
          <span className="text-[#8B949E] text-[10px] uppercase font-bold tracking-widest block mb-1">Desperdício</span>
          <span className="text-[#F85149] font-bold text-sm">{Math.round(layout.area_desperdicada_mm2 / 1000000)} m²</span>
        </div>
      </div>
    </div>
  );
};
