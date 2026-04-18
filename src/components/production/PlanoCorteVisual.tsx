import React from 'react';
import { PecaPositionada } from '../../utils/planodeCorte';

interface PlanoCorteVisualProps {
  pecas: PecaPositionada[];
  chapaLargura: number;
  chapaAltura: number;
  chapaAtiva: number;
}

const PlanoCorteVisual: React.FC<PlanoCorteVisualProps> = ({ pecas, chapaLargura, chapaAltura, chapaAtiva }) => {
  const pecasDaChapa = pecas.filter(p => p.chapa === chapaAtiva);
  
  // Escala para caber na tela mantendo proporção
  const margin = 20;
  const containerWidth = 800;
  const scale = (containerWidth - (margin * 2)) / chapaLargura;
  const containerHeight = (chapaAltura * scale) + (margin * 2);

  const getCorPorAmbiente = (ambiente?: string) => {
    if (!ambiente) return '#4b5563'; // Gray
    const map: Record<string, string> = {
      'Cozinha': '#10b981', // Green
      'Quarto': '#3b82f6', // Blue
      'Sala': '#f59e0b',   // Orange
      'Banheiro': '#06b6d4', // Cyan
      'Lavanderia': '#8b5cf6' // Violet
    };
    return map[ambiente] || '#d4af37'; // Gold default
  };

  return (
    <div style={{ background: '#111', padding: '1rem', borderRadius: '12px', border: '1px solid #333', overflow: 'hidden' }}>
      <svg width="100%" height="auto" viewBox={`0 0 ${containerWidth} ${containerHeight}`} style={{ display: 'block' }}>
        {/* Chapa Principal */}
        <rect 
          x={margin} 
          y={margin} 
          width={chapaLargura * scale} 
          height={chapaAltura * scale} 
          fill="#1a1a1a" 
          stroke="#333" 
          strokeWidth="2" 
        />

        {/* Peças Posicionadas */}
        {pecasDaChapa.map((peca, idx) => (
          <g key={`${peca.pecaId}-${idx}`} transform={`translate(${margin + (peca.x * scale)}, ${margin + (peca.y * scale)})`}>
            <rect 
              width={peca.largura * scale} 
              height={peca.altura * scale} 
              fill={getCorPorAmbiente(peca.ambiente)} 
              fillOpacity="0.2"
              stroke={getCorPorAmbiente(peca.ambiente)} 
              strokeWidth="1" 
            />
            {peca.largura * scale > 40 && peca.altura * scale > 30 && (
              <text 
                x={peca.largura * scale / 2} 
                y={peca.altura * scale / 2} 
                textAnchor="middle" 
                fontSize="8" 
                fill="#fff" 
                fontWeight="bold"
              >
                <tspan x={peca.largura * scale / 2} dy="-0.5em">{peca.descricao}</tspan>
                <tspan x={peca.largura * scale / 2} dy="1.2em" fontSize="6" opacity="0.7">
                  {peca.largura}x{peca.altura}
                </tspan>
              </text>
            )}
            <title>{`${peca.descricao}\n${peca.largura} x ${peca.altura}mm\nAmbiente: ${peca.ambiente || 'Não informado'}`}</title>
          </g>
        ))}

        {/* Réguas de Medida (simbólicas) */}
        <text x="10" y="15" fontSize="10" fill="#666">{chapaLargura}mm</text>
        <text x="0" y="0" fontSize="10" fill="#666" transform={`translate(15, 20) rotate(90)`}>{chapaAltura}mm</text>
      </svg>
    </div>
  );
};

export default PlanoCorteVisual;
