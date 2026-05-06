'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { LayoutChapa, PecaPosicionada } from '../../domain/entities/CuttingPlan';
import { 
  RotateCw, 
  Plus, 
  Minus, 
  RotateCcw, 
  Maximize, 
  Grid, 
  Ruler, 
  Info 
} from 'lucide-react';

interface CanvasAvancadoProps {
  layout: LayoutChapa;
  chapaDimensoes: { largura: number; altura: number };
  onPecaClick?: (peca: PecaPosicionada) => void;
  onExportarPDF?: () => void;
  executionMode?: boolean;
  pecasCortadasIds?: Set<string>;
  recomendacaoRetalho?: { score: number; recomendacao: string; justificativa: string };
  className?: string;
  onLayoutChange?: (novoLayout: LayoutChapa) => void;
}

interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

const ZOOM_MIN = 0.1;
const ZOOM_MAX = 5;
const GRID_SPACING_MM = 100;
const REGUA_HEIGHT = 40;
const CORES_FITA = {
  topo: '#EF4444',
  baixo: '#3B82F6',
  esquerda: '#10B981',
  direita: '#F59E0B'
};

export function CanvasAvancado({
  layout,
  chapaDimensoes,
  onPecaClick,
  onExportarPDF,
  executionMode = false,
  pecasCortadasIds = new Set(),
  recomendacaoRetalho,
  className = '',
  onLayoutChange
}: CanvasAvancadoProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Layout local mutável para drag e rotação manual
  const [localLayout, setLocalLayout] = useState<LayoutChapa | null>(layout);
  useEffect(() => { setLocalLayout(layout); }, [layout]);
  
  const [viewport, setViewport] = useState<Viewport>({
    x: REGUA_HEIGHT,
    y: REGUA_HEIGHT,
    zoom: 0.3
  });
  
  const [hoveredPeca, setHoveredPeca] = useState<string | null>(null);
  const [selectedPeca, setSelectedPeca] = useState<string | null>(null);
  const [isDraggingPeca, setIsDraggingPeca] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  const [showGrid, setShowGrid] = useState(true);
  const [showMeasurements, setShowMeasurements] = useState(true);

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDERIZAÇÃO PRINCIPAL DO CANVAS
  // ─────────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvas.offsetWidth * dpr;
    canvas.height = canvas.offsetHeight * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    desenharReguas(ctx, viewport, chapaDimensoes, canvas.offsetWidth, canvas.offsetHeight);
    ctx.save();
    
    // FIX #7: clipar peças para dentro da chapa
    ctx.translate(viewport.x, viewport.y);
    ctx.scale(viewport.zoom, viewport.zoom);
    ctx.beginPath();
    ctx.rect(0, 0, chapaDimensoes.largura, chapaDimensoes.altura);
    if (showGrid) desenharGrid(ctx, chapaDimensoes);
    desenharBordaChapa(ctx, chapaDimensoes);
    
    if (localLayout && localLayout.pecas_posicionadas) {
      localLayout.pecas_posicionadas.forEach(peca => {
        const isCortada = pecasCortadasIds.has(peca.id);
        const isSelected = peca.id === selectedPeca;
        desenharPeca(ctx, peca, peca.id === hoveredPeca || isSelected, viewport.zoom, showMeasurements, isCortada, executionMode, isSelected);
      });
    }
    ctx.restore();
  }, [localLayout, viewport, hoveredPeca, selectedPeca, showGrid, showMeasurements, chapaDimensoes, pecasCortadasIds, executionMode, recomendacaoRetalho]);

  // ─────────────────────────────────────────────────────────────────────────────
  // CONTROLE DE ZOOM (Mouse Wheel)
  // ─────────────────────────────────────────────────────────────────────────────

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(ZOOM_MIN, Math.min(viewport.zoom * delta, ZOOM_MAX));

    // Zoom centrado no cursor
    const rect = canvasRef.current!.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const worldX = (mouseX - viewport.x) / viewport.zoom;
    const worldY = (mouseY - viewport.y) / viewport.zoom;

    const newX = mouseX - worldX * newZoom;
    const newY = mouseY - worldY * newZoom;

    setViewport({ x: newX, y: newY, zoom: newZoom });
  }, [viewport]);

  // ─────────────────────────────────────────────────────────────────────────────
  // CONTROLE DE PAN (Drag com Mouse)
  // ─────────────────────────────────────────────────────────────────────────────

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const worldX = (mouseX - viewport.x) / viewport.zoom;
    const worldY = (mouseY - viewport.y) / viewport.zoom;
    const pecaClicada = localLayout?.pecas_posicionadas?.find(p =>
      worldX >= p.x && worldX <= p.x + p.largura &&
      worldY >= p.y && worldY <= p.y + p.altura
    );
    if (pecaClicada && !executionMode) {
      setSelectedPeca(pecaClicada.id);
      setIsDraggingPeca(true);
      setDragOffset({ x: worldX - pecaClicada.x, y: worldY - pecaClicada.y });
    } else {
      setSelectedPeca(null);
      setIsPanning(true);
    }
    setLastMousePos({ x: e.clientX, y: e.clientY });
  }, [viewport, localLayout, executionMode]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const worldX = (mouseX - viewport.x) / viewport.zoom;
    const worldY = (mouseY - viewport.y) / viewport.zoom;
    if (isDraggingPeca && selectedPeca && localLayout) {
      setLocalLayout(prev => {
        if (!prev || !prev.pecas_posicionadas) return prev;
        return {
          ...prev,
          pecas_posicionadas: prev.pecas_posicionadas.map(p => {
            if (p.id !== selectedPeca) return p;
            const novoX = Math.max(0, Math.min(worldX - dragOffset.x, chapaDimensoes.largura - p.largura));
            const novoY = Math.max(0, Math.min(worldY - dragOffset.y, chapaDimensoes.altura - p.altura));
            return { ...p, x: novoX, y: novoY };
          })
        };
      });
      return;
    }
    if (isPanning) {
      const dx = e.clientX - lastMousePos.x;
      const dy = e.clientY - lastMousePos.y;
      setViewport(v => ({ ...v, x: v.x + dx, y: v.y + dy }));
      setLastMousePos({ x: e.clientX, y: e.clientY });
      return;
    }
    const pecaHover = localLayout?.pecas_posicionadas?.find(p =>
      worldX >= p.x && worldX <= p.x + p.largura &&
      worldY >= p.y && worldY <= p.y + p.altura
    );
    setHoveredPeca(pecaHover?.id || null);
  }, [isPanning, isDraggingPeca, selectedPeca, dragOffset, lastMousePos, viewport, localLayout, chapaDimensoes]);

  const handleMouseUp = useCallback(() => {
    if ((isDraggingPeca || isPanning) && onLayoutChange && localLayout) {
      onLayoutChange(localLayout);
    }
    setIsPanning(false);
    setIsDraggingPeca(false);
  }, [isDraggingPeca, isPanning, onLayoutChange, localLayout]);

  const handleMouseLeave = useCallback(() => {
    if ((isDraggingPeca || isPanning) && onLayoutChange) {
      onLayoutChange(localLayout);
    }
    setIsPanning(false);
    setIsDraggingPeca(false);
    setHoveredPeca(null);
  }, [isDraggingPeca, isPanning, onLayoutChange, localLayout]);

  // Rotação manual da peça selecionada
  const rotacionarPecaSelecionada = useCallback(() => {
    if (!selectedPeca || !localLayout) return;
    const novoLayout = {
      ...localLayout,
      pecas_posicionadas: localLayout.pecas_posicionadas.map(p => {
        if (p.id !== selectedPeca) return p;
        const novaLargura = p.altura;
        const novaAltura = p.largura;
        const novoX = Math.min(p.x, chapaDimensoes.largura - novaLargura);
        const novoY = Math.min(p.y, chapaDimensoes.altura - novaAltura);
        return { ...p, largura: novaLargura, altura: novaAltura, x: novoX, y: novoY, rotacionada: !p.rotacionada };
      })
    };
    setLocalLayout(novoLayout);
    if (onLayoutChange) onLayoutChange(novoLayout);
  }, [selectedPeca, localLayout, chapaDimensoes, onLayoutChange]);

  // ─────────────────────────────────────────────────────────────────────────────
  // CLICK EM PEÇA
  // ─────────────────────────────────────────────────────────────────────────────

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (!executionMode || !onPecaClick || !hoveredPeca || !localLayout) return;
    const peca = localLayout?.pecas_posicionadas?.find(p => p.id === hoveredPeca);
    if (peca) onPecaClick(peca);
  }, [executionMode, hoveredPeca, localLayout, onPecaClick]);

  // ─────────────────────────────────────────────────────────────────────────────
  // CONTROLES DE ZOOM
  // ─────────────────────────────────────────────────────────────────────────────

  const zoomIn = () => {
    setViewport(v => ({ ...v, zoom: Math.min(v.zoom * 1.3, ZOOM_MAX) }));
  };

  const zoomOut = () => {
    setViewport(v => ({ ...v, zoom: Math.max(v.zoom * 0.7, ZOOM_MIN) }));
  };

  const resetView = () => {
    setViewport({ x: REGUA_HEIGHT, y: REGUA_HEIGHT, zoom: 0.3 });
  };

  const fitToScreen = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const containerWidth = canvas.offsetWidth - REGUA_HEIGHT * 2;
    const containerHeight = canvas.offsetHeight - REGUA_HEIGHT * 2;

    const scaleX = containerWidth / chapaDimensoes.largura;
    const scaleY = containerHeight / chapaDimensoes.altura;
    const newZoom = Math.min(scaleX, scaleY) * 0.9;

    setViewport({
      x: REGUA_HEIGHT + (containerWidth - chapaDimensoes.largura * newZoom) / 2,
      y: REGUA_HEIGHT + (containerHeight - chapaDimensoes.altura * newZoom) / 2,
      zoom: newZoom
    });
  };

  useEffect(() => {
    fitToScreen();
  }, [chapaDimensoes]);

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────

  // Peça selecionada — coordenadas na tela para botão de rotação
  const pecaSelecionadaObj = (selectedPeca && localLayout) ? localLayout.pecas_posicionadas?.find(p => p.id === selectedPeca) : null;
  const rotBtnPos = pecaSelecionadaObj ? {
    left: viewport.x + pecaSelecionadaObj.x * viewport.zoom,
    top: viewport.y + pecaSelecionadaObj.y * viewport.zoom - 44
  } : null;

  return (
    <div 
      ref={containerRef} 
      className={`relative w-full h-full bg-[#0A0A0A] overflow-hidden ${className}`}
    >
      {/* CANVAS PRINCIPAL */}
      <canvas
        ref={canvasRef}
        className={`w-full h-full block ${isPanning ? 'cursor-grabbing' : 'cursor-grab'}`}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
      />

      {/* TOOLBAR - CONTROLES DE ZOOM */}
      <div className="absolute bottom-6 right-6 flex flex-col gap-2 glass p-2 rounded-xl z-10">
        <button
          onClick={zoomIn}
          className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-primary/10 text-foreground transition-colors"
          title="Zoom In (Scroll Up)"
        >
          <Plus size={20} />
        </button>
        <button
          onClick={zoomOut}
          className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-primary/10 text-foreground transition-colors"
          title="Zoom Out (Scroll Down)"
        >
          <Minus size={20} />
        </button>
        <div className="h-px bg-border my-1" />
        <button
          onClick={resetView}
          className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-primary/10 text-foreground transition-colors"
          title="Reset View"
        >
          <RotateCcw size={18} />
        </button>
        <button
          onClick={fitToScreen}
          className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-primary/10 text-foreground transition-colors"
          title="Fit to Screen"
        >
          <Maximize size={18} />
        </button>
      </div>

      {/* TOOLBAR - OPÇÕES DE VISUALIZAÇÃO */}
      <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex items-center gap-4 glass px-4 py-2 rounded-full z-10">
        <label className="flex items-center gap-2 cursor-pointer text-[10px] font-black italic text-primary uppercase tracking-wider">
          <input 
            type="checkbox" 
            checked={showGrid} 
            onChange={e => setShowGrid(e.target.checked)} 
            className="w-3 h-3 accent-primary" 
          />
          <Grid size={12} /> Grid
        </label>
        <div className="w-px h-4 bg-border" />
        <label className="flex items-center gap-2 cursor-pointer text-[10px] font-black italic text-primary uppercase tracking-wider">
          <input 
            type="checkbox" 
            checked={showMeasurements} 
            onChange={e => setShowMeasurements(e.target.checked)} 
            className="w-3 h-3 accent-primary" 
          />
          <Ruler size={12} /> Medidas
        </label>
      </div>

      {/* BOTÃO ROTACIONAR PEÇA SELECIONADA */}
      {rotBtnPos && !executionMode && (
        <button
          onClick={rotacionarPecaSelecionada}
          className="absolute z-20 bg-primary text-primary-foreground px-3 py-1.5 rounded-lg text-[10px] font-black italic flex items-center gap-2 shadow-lg animate-fade-in"
          style={{
            left: `${rotBtnPos.left}px`,
            top: `${rotBtnPos.top}px`,
            pointerEvents: 'all'
          }}
          title="Rotacionar peça 90°"
        >
          <RotateCw size={12} /> GIRAR 90°
        </button>
      )}

      {/* INFO ZOOM */}
      <div className="absolute bottom-6 left-6 glass px-4 py-2 rounded-full z-10 border border-primary/20">
        <span className="text-[10px] font-black italic text-foreground tracking-widest flex items-center gap-2">
          <Info size={12} className="text-primary" />
          ZOOM: {(viewport.zoom * 100).toFixed(0)}%
        </span>
      </div>

      {/* INFO PEÇA HOVER/SELECTED */}
      {(hoveredPeca || selectedPeca) && (
        <div className="absolute top-6 left-6 w-64 glass-elevated p-4 rounded-xl z-20 animate-fade-in border-l-4 border-l-primary">
          {(() => {
            const peca = localLayout?.pecas_posicionadas?.find(p => p.id === (selectedPeca || hoveredPeca));
            if (!peca) return null;
            
            return (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black italic text-primary uppercase tracking-tighter truncate pr-2">
                    {peca.nome}
                  </h3>
                  {selectedPeca && (
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  )}
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-muted-foreground font-medium">DIMENSÕES</span>
                    <span className="font-bold text-foreground">{peca.largura} × {peca.altura} MM</span>
                  </div>
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-muted-foreground font-medium">POSIÇÃO</span>
                    <span className="font-bold text-foreground">X:{peca.x} Y:{peca.y}</span>
                  </div>
                  
                  {peca.rotacionada && (
                    <div className="flex items-center gap-2 text-warning text-[10px] font-black italic pt-1 border-t border-border/50">
                      <RotateCw size={10} /> ROTACIONADA 90°
                    </div>
                  )}
                  
                  {peca.fio_de_fita && (
                    <div className="pt-2 border-t border-border/50">
                      <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-2">FIO DE FITA:</p>
                      <div className="flex gap-2 flex-wrap">
                        {peca.fio_de_fita.topo && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border border-red-500/50 text-red-500 bg-red-500/10">TOPO</span>}
                        {peca.fio_de_fita.baixo && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border border-blue-500/50 text-blue-500 bg-blue-500/10">BAIXO</span>}
                        {peca.fio_de_fita.esquerda && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border border-green-500/50 text-green-500 bg-green-500/10">ESQ</span>}
                        {peca.fio_de_fita.direita && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border border-amber-500/50 text-amber-500 bg-amber-500/10">DIR</span>}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNÇÕES DE DESENHO
// ─────────────────────────────────────────────────────────────────────────────

function desenharGrid(ctx: CanvasRenderingContext2D, dimensoes: { largura: number; altura: number }) {
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
  ctx.lineWidth = 0.5;

  // Linhas verticais a cada 100mm
  for (let x = 0; x <= dimensoes.largura; x += GRID_SPACING_MM) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, dimensoes.altura);
    ctx.stroke();
  }

  // Linhas horizontais a cada 100mm
  for (let y = 0; y <= dimensoes.altura; y += GRID_SPACING_MM) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(dimensoes.largura, y);
    ctx.stroke();
  }

  ctx.restore();
}

function desenharBordaChapa(ctx: CanvasRenderingContext2D, dimensoes: { largura: number; altura: number }) {
  ctx.save();
  ctx.strokeStyle = '#333333';
  ctx.lineWidth = 4;
  ctx.strokeRect(0, 0, dimensoes.largura, dimensoes.altura);
  
  // Detalhe de canto industrial
  ctx.strokeStyle = 'hsl(var(--primary))';
  ctx.lineWidth = 2;
  const cornerSize = 40;
  
  // Top Left
  ctx.beginPath(); ctx.moveTo(0, cornerSize); ctx.lineTo(0, 0); ctx.lineTo(cornerSize, 0); ctx.stroke();
  // Top Right
  ctx.beginPath(); ctx.moveTo(dimensoes.largura - cornerSize, 0); ctx.lineTo(dimensoes.largura, 0); ctx.lineTo(dimensoes.largura, cornerSize); ctx.stroke();
  // Bottom Left
  ctx.beginPath(); ctx.moveTo(0, dimensoes.altura - cornerSize); ctx.lineTo(0, dimensoes.altura); ctx.lineTo(cornerSize, dimensoes.altura); ctx.stroke();
  // Bottom Right
  ctx.beginPath(); ctx.moveTo(dimensoes.largura - cornerSize, dimensoes.altura); ctx.lineTo(dimensoes.largura, dimensoes.altura); ctx.lineTo(dimensoes.largura, dimensoes.altura - cornerSize); ctx.stroke();
  
  ctx.restore();
}

function desenharPeca(
  ctx: CanvasRenderingContext2D,
  peca: PecaPosicionada,
  highlighted: boolean,
  zoom: number,
  showMeasurements: boolean,
  isCortada: boolean = false,
  executionMode: boolean = false,
  isSelected: boolean = false
) {
  ctx.save();

  // Fundo da peça
  if (isCortada && executionMode) {
    ctx.fillStyle = 'rgba(34, 197, 94, 0.4)';
  } else if (isSelected) {
    ctx.fillStyle = 'hsla(var(--primary), 0.4)';
  } else if (highlighted) {
    ctx.fillStyle = 'hsla(var(--primary), 0.2)';
  } else {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
  }
  ctx.fillRect(peca.x, peca.y, peca.largura, peca.altura);

  // Borda principal
  if (isCortada && executionMode) {
    ctx.strokeStyle = '#22c55e';
  } else if (isSelected) {
    ctx.strokeStyle = 'hsl(var(--primary))';
  } else {
    ctx.strokeStyle = highlighted ? 'hsl(var(--primary))' : 'rgba(255, 255, 255, 0.15)';
  }
  ctx.lineWidth = (isSelected ? 4 : highlighted ? 2 : 1) / zoom;
  ctx.strokeRect(peca.x, peca.y, peca.largura, peca.altura);

  // Fio de fita (bordas coloridas)
  if (peca.fio_de_fita) {
    ctx.lineWidth = 4 / zoom;

    if (peca.fio_de_fita.topo) {
      ctx.strokeStyle = CORES_FITA.topo;
      ctx.beginPath();
      ctx.moveTo(peca.x, peca.y);
      ctx.lineTo(peca.x + peca.largura, peca.y);
      ctx.stroke();
    }

    if (peca.fio_de_fita.baixo) {
      ctx.strokeStyle = CORES_FITA.baixo;
      ctx.beginPath();
      ctx.moveTo(peca.x, peca.y + peca.altura);
      ctx.lineTo(peca.x + peca.largura, peca.y + peca.altura);
      ctx.stroke();
    }

    if (peca.fio_de_fita.esquerda) {
      ctx.strokeStyle = CORES_FITA.esquerda;
      ctx.beginPath();
      ctx.moveTo(peca.x, peca.y);
      ctx.lineTo(peca.x, peca.y + peca.altura);
      ctx.stroke();
    }

    if (peca.fio_de_fita.direita) {
      ctx.strokeStyle = CORES_FITA.direita;
      ctx.beginPath();
      ctx.moveTo(peca.x + peca.largura, peca.y);
      ctx.lineTo(peca.x + peca.largura, peca.y + peca.altura);
      ctx.stroke();
    }
  }

  // Texto (se couber)
  const minSizeForText = 50 / zoom;
  if (peca.largura > minSizeForText && peca.altura > minSizeForText / 2) {
    ctx.fillStyle = isCortada ? '#fff' : highlighted || isSelected ? 'hsl(var(--primary))' : '#999';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Nome
    ctx.font = `bold ${Math.max(10, 14 / zoom)}px Inter, sans-serif`;
    ctx.fillText(
      peca.nome.toUpperCase(),
      peca.x + peca.largura / 2,
      peca.y + peca.altura / 2 - (showMeasurements ? 6 / zoom : 0)
    );

    // Dimensões
    if (showMeasurements) {
      ctx.font = `${Math.max(8, 11 / zoom)}px monospace`;
      ctx.fillStyle = isCortada ? '#fff' : '#666';
      ctx.fillText(
        `${peca.largura}×${peca.altura}`,
        peca.x + peca.largura / 2,
        peca.y + peca.altura / 2 + 10 / zoom
      );
    }
  }

  ctx.restore();
}

function desenharReguas(
  ctx: CanvasRenderingContext2D,
  viewport: Viewport,
  dimensoes: { largura: number; altura: number },
  canvasWidth: number,
  canvasHeight: number
) {
  ctx.save();

  // Fundo das réguas
  ctx.fillStyle = 'rgba(10, 10, 10, 0.9)';
  ctx.fillRect(0, 0, canvasWidth, REGUA_HEIGHT); // Horizontal
  ctx.fillRect(0, 0, REGUA_HEIGHT, canvasHeight); // Vertical

  ctx.fillStyle = '#666';
  ctx.strokeStyle = '#222';
  ctx.lineWidth = 1;
  ctx.font = '9px font-black italic monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // RÉGUA HORIZONTAL (topo)
  for (let x = 0; x <= dimensoes.largura; x += 100) {
    const screenX = viewport.x + x * viewport.zoom;
    
    if (screenX >= REGUA_HEIGHT && screenX <= canvasWidth) {
      // Marcação
      ctx.beginPath();
      ctx.moveTo(screenX, REGUA_HEIGHT - 6);
      ctx.lineTo(screenX, REGUA_HEIGHT);
      ctx.stroke();

      // Número
      if (x % 500 === 0) {
        ctx.fillStyle = 'hsl(var(--primary))';
        ctx.fillText(String(x), screenX, REGUA_HEIGHT / 2);
        ctx.fillStyle = '#666';
      } else {
        ctx.fillText(String(x), screenX, REGUA_HEIGHT / 2);
      }
    }
  }

  // RÉGUA VERTICAL (esquerda)
  ctx.textAlign = 'right';
  for (let y = 0; y <= dimensoes.altura; y += 100) {
    const screenY = viewport.y + y * viewport.zoom;
    
    if (screenY >= REGUA_HEIGHT && screenY <= canvasHeight) {
      // Marcação
      ctx.beginPath();
      ctx.moveTo(REGUA_HEIGHT - 6, screenY);
      ctx.lineTo(REGUA_HEIGHT, screenY);
      ctx.stroke();

      // Número
      ctx.save();
      ctx.translate(REGUA_HEIGHT / 2, screenY);
      ctx.rotate(-Math.PI / 2);
      if (y % 500 === 0) {
        ctx.fillStyle = 'hsl(var(--primary))';
        ctx.fillText(String(y), 0, 0);
      } else {
        ctx.fillText(String(y), 0, 0);
      }
      ctx.restore();
    }
  }

  ctx.restore();
}

export default CanvasAvancado;
