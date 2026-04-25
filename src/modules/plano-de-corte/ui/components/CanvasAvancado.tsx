import React, { useRef, useState, useEffect } from 'react';
import type { Superficie, GrupoMaterial } from '../../../../utils/planodeCorte';

interface CanvasAvancadoProps {
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

export const CanvasAvancado: React.FC<CanvasAvancadoProps> = ({ superficie, grupoMaterial, highlightPecaId }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState({ x: 0, y: 0, zoom: 0.2 });
  const [hoveredPeca, setHoveredPeca] = useState<string | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });

  // Auto-fit inicial
  useEffect(() => {
    if (containerRef.current && superficie) {
      const container = containerRef.current;
      const padding = 60; // Para réguas e bordas
      const availableWidth = container.clientWidth - padding;
      const availableHeight = container.clientHeight - padding;
      
      const scaleX = availableWidth / superficie.largura;
      const scaleY = availableHeight / superficie.altura;
      const initialScale = Math.min(scaleX, scaleY, 0.8);
      
      setViewport({ 
        zoom: initialScale,
        x: (container.clientWidth - superficie.largura * initialScale) / 2, 
        y: (container.clientHeight - superficie.altura * initialScale) / 2 
      });
    }
  }, [superficie.id]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !containerRef.current) return;
    
    const ctx = canvas.getContext('2d')!;
    const dpr = window.devicePixelRatio || 1;
    
    // Setup high-DPI canvas
    const rect = containerRef.current.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    ctx.scale(dpr, dpr);
    
    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Save state for transformations
    ctx.save();
    ctx.translate(viewport.x, viewport.y);
    ctx.scale(viewport.zoom, viewport.zoom);
    
    // Fundo sombra
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillRect(10 / viewport.zoom, 10 / viewport.zoom, superficie.largura, superficie.altura);

    // Chapa Base
    ctx.fillStyle = '#1A1A1A';
    ctx.fillRect(0, 0, superficie.largura, superficie.altura);
    
    // Borda Chapa
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2 / viewport.zoom;
    ctx.strokeRect(0, 0, superficie.largura, superficie.altura);

    // Grid 100x100mm
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1 / viewport.zoom;
    ctx.beginPath();
    for (let x = 0; x <= superficie.largura; x += 100) {
      ctx.moveTo(x, 0); ctx.lineTo(x, superficie.altura);
    }
    for (let y = 0; y <= superficie.altura; y += 100) {
      ctx.moveTo(0, y); ctx.lineTo(superficie.largura, y);
    }
    ctx.stroke();

    // Peças Posicionadas
    superficie.pecasPositionadas.forEach(peca => {
      const isHighlighted = highlightPecaId === peca.pecaId;
      const isHovered = hoveredPeca === peca.pecaId;
      const baseColor = CORES_AMBIENTE[peca.ambiente || 'default'] || CORES_AMBIENTE['default'];
      
      // Draw Peca
      ctx.fillStyle = (isHighlighted || isHovered) ? hexToRgba(baseColor, 0.4) : hexToRgba(baseColor, 0.15);
      ctx.fillRect(peca.x, peca.y, peca.largura, peca.altura);
      
      ctx.strokeStyle = (isHighlighted || isHovered) ? '#E2AC00' : baseColor;
      ctx.lineWidth = ((isHighlighted || isHovered) ? 4 : 1) / viewport.zoom;
      ctx.strokeRect(peca.x, peca.y, peca.largura, peca.altura);

      // Fio de fita (Linhas vermelhas grossas) - mock if not defined
      const fio = (peca as any).fio_de_fita;
      if (fio) {
        ctx.strokeStyle = '#EF4444'; // Red para borda com fita
        ctx.lineWidth = 6 / viewport.zoom;
        ctx.beginPath();
        if (fio.topo) { ctx.moveTo(peca.x, peca.y); ctx.lineTo(peca.x + peca.largura, peca.y); }
        if (fio.direita) { ctx.moveTo(peca.x + peca.largura, peca.y); ctx.lineTo(peca.x + peca.largura, peca.y + peca.altura); }
        if (fio.baixo) { ctx.moveTo(peca.x, peca.y + peca.altura); ctx.lineTo(peca.x + peca.largura, peca.y + peca.altura); }
        if (fio.esquerda) { ctx.moveTo(peca.x, peca.y); ctx.lineTo(peca.x, peca.y + peca.altura); }
        ctx.stroke();
      }

      // Labels se houver espaço
      const labelW = peca.largura * viewport.zoom;
      const labelH = peca.altura * viewport.zoom;

      if (labelW > 80 && labelH > 40) {
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        ctx.font = `bold ${12 / viewport.zoom}px Inter, sans-serif`;
        ctx.fillText(peca.descricao.substring(0, 15), peca.x + peca.largura / 2, peca.y + peca.altura / 2 - (10 / viewport.zoom));
        
        ctx.font = `${10 / viewport.zoom}px monospace`;
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.fillText(`${peca.largura} x ${peca.altura}mm`, peca.x + peca.largura / 2, peca.y + peca.altura / 2 + (5 / viewport.zoom));

        ctx.font = `bold ${10 / viewport.zoom}px sans-serif`;
        ctx.fillStyle = '#E2AC00';
        ctx.fillText(`🏷️ ${String(peca.numeroEtiqueta).padStart(3, '0')}`, peca.x + peca.largura / 2, peca.y + peca.altura / 2 + (20 / viewport.zoom));
      } else if (labelW > 20 && labelH > 20) {
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `bold ${14 / viewport.zoom}px sans-serif`;
        ctx.fillText(`${peca.numeroEtiqueta}`, peca.x + peca.largura / 2, peca.y + peca.altura / 2);
      }
    });

    ctx.restore();

    // Desenhar Réguas Milimetradas (overlay UI fixo)
    desenharReguas(ctx, rect.width, rect.height, viewport, superficie.largura, superficie.altura);

  }, [superficie, viewport, highlightPecaId, hoveredPeca]);

  // Handlers
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const rect = canvasRef.current!.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Zoom no ponto do mouse
    setViewport(v => {
      const newZoom = Math.max(0.05, Math.min(v.zoom * zoomFactor, 10));
      return {
        zoom: newZoom,
        x: mouseX - (mouseX - v.x) * (newZoom / v.zoom),
        y: mouseY - (mouseY - v.y) * (newZoom / v.zoom)
      };
    });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsPanning(true);
    setStartPan({ x: e.clientX - viewport.x, y: e.clientY - viewport.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setViewport(v => ({ ...v, x: e.clientX - startPan.x, y: e.clientY - startPan.y }));
    } else {
      // Hit detection para Hover
      const rect = canvasRef.current!.getBoundingClientRect();
      const x = (e.clientX - rect.left - viewport.x) / viewport.zoom;
      const y = (e.clientY - rect.top - viewport.y) / viewport.zoom;

      const hovered = superficie.pecasPositionadas.find(p => 
        x >= p.x && x <= p.x + p.largura && y >= p.y && y <= p.y + p.altura
      );
      setHoveredPeca(hovered ? hovered.pecaId : null);
    }
  };

  const handleMouseUp = () => setIsPanning(false);

  return (
    <div className="relative w-full h-full flex flex-col" ref={containerRef}>
      <canvas
        ref={canvasRef}
        className={`w-full h-full ${isPanning ? 'cursor-grabbing' : 'cursor-grab'} outline-none`}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        tabIndex={0}
      />

      {/* Controles de Zoom */}
      <div className="absolute bottom-4 right-4 flex gap-2 bg-slate-900/80 p-2 rounded-lg border border-slate-700/50 backdrop-blur">
        <button 
          className="w-8 h-8 flex items-center justify-center rounded bg-slate-800 hover:bg-slate-700 text-white font-bold transition-colors"
          onClick={() => setViewport(v => ({ ...v, zoom: Math.min(v.zoom * 1.2, 10) }))}
        >+</button>
        <div className="w-16 flex items-center justify-center text-xs font-mono text-slate-300">
          {Math.round(viewport.zoom * 100)}%
        </div>
        <button 
          className="w-8 h-8 flex items-center justify-center rounded bg-slate-800 hover:bg-slate-700 text-white font-bold transition-colors"
          onClick={() => setViewport(v => ({ ...v, zoom: Math.max(v.zoom * 0.8, 0.05) }))}
        >-</button>
      </div>

      {hoveredPeca && (() => {
        const pecaInfo = superficie.pecasPositionadas.find(p => p.pecaId === hoveredPeca);
        if (pecaInfo) {
          return (
            <div className="absolute top-4 right-4 bg-slate-900/95 border border-amber-500/50 shadow-xl rounded-lg p-3 pointer-events-none text-white min-w-[200px]">
              <div className="text-amber-400 font-bold text-xs mb-1">🏷️ #{pecaInfo.numeroEtiqueta}</div>
              <div className="font-bold text-sm truncate">{pecaInfo.descricao}</div>
              <div className="text-slate-400 font-mono text-xs mt-1">
                {pecaInfo.largura} x {pecaInfo.altura} mm
              </div>
              <div className="text-slate-500 text-[10px] mt-2">
                {pecaInfo.ambiente || 'Geral'}
              </div>
            </div>
          );
        }
      })()}
    </div>
  );
};

// Utils
function hexToRgba(hex: string, alpha: number) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return `rgba(100,100,100,${alpha})`;
  return `rgba(${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}, ${alpha})`;
}

function desenharReguas(ctx: CanvasRenderingContext2D, width: number, height: number, viewport: any, w_real: number, h_real: number) {
  const THICKNESS = 25;

  ctx.save();
  ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
  // Fundo Régua Horizontal (Top)
  ctx.fillRect(0, 0, width, THICKNESS);
  // Fundo Régua Vertical (Left)
  ctx.fillRect(0, 0, THICKNESS, height);
  // Canto
  ctx.fillStyle = 'rgba(30, 41, 59, 1)';
  ctx.fillRect(0, 0, THICKNESS, THICKNESS);

  ctx.fillStyle = '#94A3B8';
  ctx.font = '9px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  // Graduação Horizontal
  for (let x = 0; x <= w_real; x += 100) {
    const screenX = viewport.x + (x * viewport.zoom);
    if (screenX > THICKNESS && screenX < width) {
      ctx.fillRect(screenX, THICKNESS - 5, 1, 5);
      if (x % 500 === 0) {
        ctx.fillRect(screenX, THICKNESS - 8, 1, 8);
        ctx.fillText(`${x}`, screenX, 5);
      }
    }
  }

  // Graduação Vertical
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (let y = 0; y <= h_real; y += 100) {
    const screenY = viewport.y + (y * viewport.zoom);
    if (screenY > THICKNESS && screenY < height) {
      ctx.fillRect(THICKNESS - 5, screenY, 5, 1);
      if (y % 500 === 0) {
        ctx.fillRect(THICKNESS - 8, screenY, 8, 1);
        ctx.save();
        ctx.translate(10, screenY);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText(`${y}`, 0, 0);
        ctx.restore();
      }
    }
  }
  ctx.restore();
}
