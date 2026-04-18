import React, { useState, useRef, useEffect } from 'react';
import { 
  Superficie, 
  GrupoMaterial 
} from '../../utils/planodeCorte';

interface PlanoCorteVisualProps {
  superficie: Superficie;
  grupoMaterial: GrupoMaterial;
  highlightPecaId: string | null;
}

const CORES_AMBIENTE: Record<string, string> = {
  'Quarto Casal':    '#3B82F6',  // azul
  'Quarto Solteiro': '#8B5CF6',  // roxo
  'Cozinha':         '#10B981',  // verde
  'Sala':            '#F59E0B',  // âmbar
  'Banheiro':        '#06B6D4',  // ciano
  'Closet':          '#EC4899',  // rosa
  'Home Office':     '#6366F1',  // índigo
  'default':         '#94A3B8',  // cinza slate
};

const PlanoCorteVisual: React.FC<PlanoCorteVisualProps> = ({ superficie, grupoMaterial, highlightPecaId }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });

  // Auto-fit inicial
  useEffect(() => {
    if (containerRef.current && superficie) {
      const container = containerRef.current;
      const availableWidth = container.clientWidth - 40;
      const availableHeight = container.clientHeight - 40;
      
      const scaleX = availableWidth / superficie.largura;
      const scaleY = availableHeight / superficie.altura;
      const initialScale = Math.min(scaleX, scaleY, 0.5); // Limitar zoom inicial
      
      setZoom(initialScale);
      setPan({ 
        x: (container.clientWidth - superficie.largura * initialScale) / 2, 
        y: (container.clientHeight - superficie.altura * initialScale) / 2 
      });
    }
  }, [superficie.id]);

  // Handlers de Pan
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) { // Botão esquerdo
      setIsPanning(true);
      setStartPan({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({ x: e.clientX - startPan.x, y: e.clientY - startPan.y });
    }
  };

  const handleMouseUp = () => setIsPanning(false);

  const handleWheel = (e: React.WheelEvent) => {
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(prev => Math.max(0.05, Math.min(prev * delta, 5)));
  };

  const getCorAmbiente = (ambiente?: string) => {
    if (!ambiente) return CORES_AMBIENTE['default'];
    return CORES_AMBIENTE[ambiente] || CORES_AMBIENTE['default'];
  };

  return (
    <div 
      ref={containerRef}
      className={`w-full h-full relative cursor-${isPanning ? 'grabbing' : 'grab'} overflow-hidden select-none`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
    >
      <svg 
        width="100%" 
        height="100%" 
        className="absolute inset-0"
      >
        <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
          
          {/* Sombras da chapa (Efeito de profundidade) */}
          <rect 
            x={5} y={5}
            width={superficie.largura} 
            height={superficie.altura} 
            fill="rgba(0,0,0,0.5)"
          />

          {/* BACKGROUND CHAPA */}
          <rect 
            width={superficie.largura} 
            height={superficie.altura} 
            fill="#1A1A1A" 
            stroke="#334155" 
            strokeWidth={1 / zoom}
          />

          {/* GRADES (Réguas de 100mm) */}
          {Array.from({ length: Math.ceil(superficie.largura / 100) }).map((_, i) => (
            <line 
              key={`grid-v-${i}`}
              x1={i * 100} y1={0} x2={i * 100} y2={superficie.altura}
              stroke="#ffffff" strokeOpacity="0.03" strokeWidth={1 / zoom}
            />
          ))}
          {Array.from({ length: Math.ceil(superficie.altura / 100) }).map((_, i) => (
            <line 
              key={`grid-h-${i}`}
              x1={0} y1={i * 100} x2={superficie.largura} y2={i * 100}
              stroke="#ffffff" strokeOpacity="0.03" strokeWidth={1 / zoom}
            />
          ))}

          {/* PEÇAS */}
          {superficie.pecasPositionadas.map((peca, idx) => {
            const isHighlighted = highlightPecaId === peca.pecaId;
            const color = getCorAmbiente(peca.ambiente);
            const canShowLabels = peca.largura * zoom > 80 && peca.altura * zoom > 40;

            return (
              <g key={`${peca.pecaId}-${idx}`} transform={`translate(${peca.x}, ${peca.y})`}>
                <rect 
                  width={peca.largura} 
                  height={peca.altura} 
                  fill={color} 
                  fillOpacity={isHighlighted ? 0.3 : 0.15}
                  stroke={isHighlighted ? '#E2AC00' : color} 
                  strokeWidth={(isHighlighted ? 3 : 1) / zoom}
                  className="transition-all duration-200"
                />
                
                {/* Bordas decorativas nos cantos */}
                <path 
                  d={`M 0 10 V 0 H 10`} 
                  fill="none" stroke={color} strokeWidth={2 / zoom} strokeOpacity="0.5"
                />

                {/* Etiquetas */}
                {canShowLabels && (
                  <foreignObject x="5" y="5" width={peca.largura - 10} height={peca.altura - 10}>
                    <div className="text-white font-bold select-none pointer-events-none flex flex-col h-full" style={{ fontSize: `${12 / zoom}px`, lineHeight: 1.2 }}>
                      <div className="flex items-center gap-1 opacity-80">
                        <span className="bg-black/50 px-1 rounded">🏷️ {String(peca.numeroEtiqueta).padStart(3, '0')}</span>
                      </div>
                      <div className="truncate mt-1 text-slate-100">{peca.descricao}</div>
                      <div className="mt-auto text-[0.8em] opacity-60 font-mono">
                        {peca.largura}x{peca.altura} mm
                      </div>
                      <div className="text-[0.7em] opacity-40 truncate">
                        {peca.ambiente} / {peca.movel || 'Geral'}
                      </div>
                    </div>
                  </foreignObject>
                )}

                {!canShowLabels && peca.largura * zoom > 20 && (
                  <text 
                    x={peca.largura / 2} 
                    y={peca.altura / 2} 
                    textAnchor="middle" 
                    dominantBaseline="middle"
                    fill="#fff"
                    opacity="0.8"
                    fontSize={14 / zoom}
                    fontWeight="black"
                  >
                    {peca.numeroEtiqueta}
                  </text>
                )}
                
                <title>{`${peca.descricao}\n${peca.largura} x ${peca.altura}mm\nAmbiente: ${peca.ambiente}`}</title>
              </g>
            );
          })}

          {/* SOBRAS / ESPAÇOS VAZIOS (Efeito de hachura) */}
          {superficie.espacosLivres.filter(r => r.width > 5 && r.height > 5).map((r, idx) => (
            <rect 
              key={`free-${idx}`}
              x={r.x} y={r.y} width={r.width} height={r.height}
              fill="url(#hatch)"
              fillOpacity="0.1"
              stroke="#ffffff"
              strokeOpacity="0.05"
              strokeWidth={1 / zoom}
            />
          ))}
        </g>

        {/* DEFINITIONS (Patterns) */}
        <defs>
          <pattern id="hatch" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="10" stroke="#ffffff" strokeWidth="1" />
          </pattern>
        </defs>
      </svg>

      {/* OVERLAY: RÉGUAS / MEDIDAS NAS BORDAS */}
      <div className="absolute top-0 left-0 bg-black/50 px-2 py-1 text-[10px] font-mono text-slate-400 border-b border-r border-white/10">
        {pan.x.toFixed(0)}, {pan.y.toFixed(0)} | {(zoom * 100).toFixed(0)}%
      </div>
      
      {/* RÉGUA HORIZONTAL TOP */}
      <div className="absolute top-0 left-0 right-0 h-4 overflow-hidden pointer-events-none flex opacity-30">
        {/* Lógica simplificada de régua na UI real renderizaria graduações */}
      </div>
    </div>
  );
};

export default PlanoCorteVisual;
