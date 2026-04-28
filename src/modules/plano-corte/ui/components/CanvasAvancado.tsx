'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { LayoutChapa, PecaPosicionada } from '../../domain/entities/CuttingPlan';

interface CanvasAvancadoProps {
  layout: LayoutChapa;
  chapaDimensoes: { largura: number; altura: number };
  onPecaClick?: (peca: PecaPosicionada) => void;
  onExportarPDF?: () => void;
  executionMode?: boolean;
  pecasCortadasIds?: Set<string>;
  recomendacaoRetalho?: { score: number; recomendacao: string; justificativa: string };
  className?: string;
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
  className = ''
}: CanvasAvancadoProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [viewport, setViewport] = useState<Viewport>({
    x: REGUA_HEIGHT,
    y: REGUA_HEIGHT,
    zoom: 0.3
  });
  
  const [hoveredPeca, setHoveredPeca] = useState<string | null>(null);
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

    // Ajustar tamanho do canvas
    canvas.width = canvas.offsetWidth * dpr;
    canvas.height = canvas.offsetHeight * dpr;
    ctx.scale(dpr, dpr);

    // Limpar canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Desenhar réguas (sempre visíveis)
    desenharReguas(ctx, viewport, chapaDimensoes, canvas.offsetWidth, canvas.offsetHeight);

    // Salvar contexto e aplicar transformações
    ctx.save();
    ctx.translate(viewport.x, viewport.y);
    ctx.scale(viewport.zoom, viewport.zoom);

    // Desenhar grid de fundo
    if (showGrid) {
      desenharGrid(ctx, chapaDimensoes);
    }

    // Desenhar borda da chapa
    desenharBordaChapa(ctx, chapaDimensoes);

    // Desenhar peças
    layout.pecas_posicionadas?.forEach(peca => {
      const isCortada = pecasCortadasIds.has(peca.id);
      desenharPeca(ctx, peca, peca.id === hoveredPeca, viewport.zoom, showMeasurements, isCortada, executionMode);
    });

    ctx.restore();

    // Desenhar overlay de recomendação de retalho (se for um retalho novo sendo gerado)
    if (recomendacaoRetalho) {
      desenharRecomendacaoRetalho(ctx, recomendacaoRetalho, canvas.offsetWidth);
    }

    // Desenhar estatísticas (overlay)
    desenharEstatisticas(ctx, layout, chapaDimensoes, canvas.offsetWidth);

  }, [layout, viewport, hoveredPeca, showGrid, showMeasurements, chapaDimensoes]);

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
    setIsPanning(true);
    setLastMousePos({ x: e.clientX, y: e.clientY });
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Pan
    if (isPanning) {
      const dx = e.clientX - lastMousePos.x;
      const dy = e.clientY - lastMousePos.y;

      setViewport(v => ({
        ...v,
        x: v.x + dx,
        y: v.y + dy
      }));

      setLastMousePos({ x: e.clientX, y: e.clientY });
      return;
    }

    // Detectar hover
    const worldX = (mouseX - viewport.x) / viewport.zoom;
    const worldY = (mouseY - viewport.y) / viewport.zoom;

    const pecaHover = layout.pecas_posicionadas?.find(p =>
      worldX >= p.x && worldX <= p.x + p.largura &&
      worldY >= p.y && worldY <= p.y + p.altura
    );

    setHoveredPeca(pecaHover?.id || null);
  }, [isPanning, lastMousePos, viewport, layout.pecas_posicionadas]);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsPanning(false);
    setHoveredPeca(null);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────
  // CLICK EM PEÇA
  // ─────────────────────────────────────────────────────────────────────────────

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (!onPecaClick || !hoveredPeca) return;

    const peca = layout.pecas_posicionadas?.find(p => p.id === hoveredPeca);
    if (peca) {
      onPecaClick(peca);
    }
  }, [hoveredPeca, layout.pecas_posicionadas, onPecaClick]);

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

  return (
    <div 
      ref={containerRef} 
      style={{ position: 'relative', width: '100%', height: '100%', background: '#0a0d14', overflow: 'hidden' }}
      className={className}
    >
      {/* CANVAS PRINCIPAL */}
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '100%', cursor: isPanning ? 'grabbing' : 'grab', display: 'block' }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
      />

      {/* TOOLBAR - CONTROLES DE ZOOM */}
      <div style={{
        position: 'absolute', bottom: '24px', right: '24px',
        display: 'flex', flexDirection: 'column', gap: '8px',
        background: 'var(--surface-overlay)', border: '1px solid var(--border)',
        borderRadius: '12px', padding: '8px', boxShadow: 'var(--shadow-lg)',
        backdropFilter: 'blur(10px)', zIndex: 10
      }}>
        <button
          onClick={zoomIn}
          className="btn-outline"
          style={{ width: '40px', height: '40px', padding: 0, borderRadius: '8px', fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          title="Zoom In (Scroll Up)"
        >
          +
        </button>
        <button
          onClick={zoomOut}
          className="btn-outline"
          style={{ width: '40px', height: '40px', padding: 0, borderRadius: '8px', fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          title="Zoom Out (Scroll Down)"
        >
          −
        </button>
        <div style={{ borderTop: '1px solid var(--border)', margin: '4px 0' }} />
        <button
          onClick={resetView}
          className="btn-outline"
          style={{ width: '40px', height: '40px', padding: 0, borderRadius: '8px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          title="Reset View"
        >
          ↺
        </button>
        <button
          onClick={fitToScreen}
          className="btn-outline"
          style={{ width: '40px', height: '40px', padding: 0, borderRadius: '8px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          title="Fit to Screen"
        >
          ⊡
        </button>
      </div>

      {/* TOOLBAR - OPÇÕES DE VISUALIZAÇÃO */}
      <div style={{
        position: 'absolute', top: '24px', right: '24px',
        display: 'flex', flexDirection: 'column', gap: '10px',
        background: 'var(--surface-overlay)', border: '1px solid var(--border)',
        borderRadius: '12px', padding: '12px', boxShadow: 'var(--shadow-md)',
        backdropFilter: 'blur(10px)', zIndex: 10
      }}>
        <label className="label-base" style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={showGrid}
            onChange={(e) => setShowGrid(e.target.checked)}
            style={{ width: '16px', height: '16px' }}
          />
          GRID
        </label>
        <label className="label-base" style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={showMeasurements}
            onChange={(e) => setShowMeasurements(e.target.checked)}
            style={{ width: '16px', height: '16px' }}
          />
          MEDIDAS
        </label>
      </div>

      {/* INFO ZOOM */}
      <div style={{
        position: 'absolute', bottom: '24px', left: '24px',
        background: 'rgba(0,0,0,0.5)', borderRadius: '20px',
        padding: '6px 16px', backdropFilter: 'blur(4px)',
        border: '1px solid rgba(255,255,255,0.1)', zIndex: 10
      }}>
        <span style={{ fontSize: '11px', fontWeight: '800', color: '#fff', letterSpacing: '0.05em' }}>
          ZOOM: {(viewport.zoom * 100).toFixed(0)}%
        </span>
      </div>

      {/* INFO PEÇA HOVER */}
      {hoveredPeca && (
        <div style={{
          position: 'absolute', top: '24px', left: '24px',
          background: 'var(--surface-overlay)', border: '1px solid var(--primary)',
          borderRadius: '14px', padding: '16px', boxShadow: 'var(--shadow-lg)',
          backdropFilter: 'blur(12px)', width: '280px', zIndex: 20
        }}>
          {(() => {
            const peca = layout.pecas_posicionadas?.find(p => p.id === hoveredPeca);
            if (!peca) return null;
            
            return (
              <>
                <h3 style={{ fontSize: '0.9rem', fontWeight: '800', color: 'var(--primary)', marginBottom: '8px' }}>{peca.nome}</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>DIMENSÕES</span>
                    <span style={{ fontSize: '0.75rem', fontWeight: '700' }}>{peca.largura} × {peca.altura} MM</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>POSIÇÃO</span>
                    <span style={{ fontSize: '0.75rem', fontWeight: '700' }}>X:{peca.x} Y:{peca.y}</span>
                  </div>
                  {peca.rotacionada && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--warning)', fontSize: '0.7rem', fontWeight: '800', marginTop: '4px' }}>
                      🔄 ROTACIONADA 90°
                    </div>
                  )}
                  {peca.fio_de_fita && (
                    <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid var(--border)' }}>
                      <p style={{ fontSize: '0.65rem', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '6px' }}>FIO DE FITA:</p>
                      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        {peca.fio_de_fita.topo && <span style={{ color: CORES_FITA.topo, fontSize: '0.65rem', fontWeight: '700' }}>TOPO</span>}
                        {peca.fio_de_fita.baixo && <span style={{ color: CORES_FITA.baixo, fontSize: '0.65rem', fontWeight: '700' }}>BAIXO</span>}
                        {peca.fio_de_fita.esquerda && <span style={{ color: CORES_FITA.esquerda, fontSize: '0.65rem', fontWeight: '700' }}>ESQ</span>}
                        {peca.fio_de_fita.direita && <span style={{ color: CORES_FITA.direita, fontSize: '0.65rem', fontWeight: '700' }}>DIR</span>}
                      </div>
                    </div>
                  )}
                </div>
              </>
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
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
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
  ctx.strokeStyle = '#64748B';
  ctx.lineWidth = 3;
  ctx.strokeRect(0, 0, dimensoes.largura, dimensoes.altura);
  ctx.restore();
}

function desenharPeca(
  ctx: CanvasRenderingContext2D,
  peca: PecaPosicionada,
  highlighted: boolean,
  zoom: number,
  showMeasurements: boolean,
  isCortada: boolean = false,
  executionMode: boolean = false
) {
  ctx.save();

  // Fundo da peça
  if (isCortada && executionMode) {
    ctx.fillStyle = 'rgba(16, 185, 129, 0.6)'; // Verde (Cortada)
  } else {
    ctx.fillStyle = highlighted ? 'rgba(226, 172, 0, 0.4)' : 'rgba(0, 169, 157, 0.2)';
  }
  ctx.fillRect(peca.x, peca.y, peca.largura, peca.altura);

  // Borda principal
  if (isCortada && executionMode) {
    ctx.strokeStyle = '#059669';
  } else {
    ctx.strokeStyle = highlighted ? '#E2AC00' : '#00A99D';
  }
  ctx.lineWidth = (highlighted ? 4 : 2) / zoom;
  ctx.strokeRect(peca.x, peca.y, peca.largura, peca.altura);

  // Fio de fita (bordas coloridas)
  if (peca.fio_de_fita) {
    ctx.lineWidth = 6 / zoom;

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
  const minSizeForText = 60 / zoom;
  if (peca.largura > minSizeForText && peca.altura > minSizeForText / 2) {
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Nome
    ctx.font = `bold ${Math.max(12, 16 / zoom)}px Inter, sans-serif`;
    ctx.fillText(
      peca.nome,
      peca.x + peca.largura / 2,
      peca.y + peca.altura / 2 - 8 / zoom
    );

    // Dimensões
    if (showMeasurements) {
      ctx.font = `${Math.max(9, 12 / zoom)}px monospace`;
      ctx.fillText(
        `${peca.largura} × ${peca.altura}`,
        peca.x + peca.largura / 2,
        peca.y + peca.altura / 2 + 12 / zoom
      );
    }

    // Ícone de rotação
    if (peca.rotacionada) {
      ctx.font = `${Math.max(10, 14 / zoom)}px sans-serif`;
      ctx.fillText(
        '🔄',
        peca.x + peca.largura - 15 / zoom,
        peca.y + 15 / zoom
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
  ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
  ctx.fillRect(0, 0, canvasWidth, REGUA_HEIGHT); // Horizontal
  ctx.fillRect(0, 0, REGUA_HEIGHT, canvasHeight); // Vertical

  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = '#94A3B8';
  ctx.lineWidth = 1;
  ctx.font = '10px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // RÉGUA HORIZONTAL (topo)
  for (let x = 0; x <= dimensoes.largura; x += 100) {
    const screenX = viewport.x + x * viewport.zoom;
    
    if (screenX >= REGUA_HEIGHT && screenX <= canvasWidth) {
      // Marcação
      ctx.beginPath();
      ctx.moveTo(screenX, REGUA_HEIGHT - 8);
      ctx.lineTo(screenX, REGUA_HEIGHT);
      ctx.stroke();

      // Número
      ctx.fillText(String(x), screenX, REGUA_HEIGHT / 2);
    }
  }

  // RÉGUA VERTICAL (esquerda)
  ctx.textAlign = 'right';
  for (let y = 0; y <= dimensoes.altura; y += 100) {
    const screenY = viewport.y + y * viewport.zoom;
    
    if (screenY >= REGUA_HEIGHT && screenY <= canvasHeight) {
      // Marcação
      ctx.beginPath();
      ctx.moveTo(REGUA_HEIGHT - 8, screenY);
      ctx.lineTo(REGUA_HEIGHT, screenY);
      ctx.stroke();

      // Número
      ctx.save();
      ctx.translate(REGUA_HEIGHT / 2, screenY);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText(String(y), 0, 0);
      ctx.restore();
    }
  }

  ctx.restore();
}

function desenharRecomendacaoRetalho(
  ctx: CanvasRenderingContext2D,
  rec: { score: number; recomendacao: string; justificativa: string },
  canvasWidth: number
) {
  ctx.save();
  const x = canvasWidth - 220;
  const y = 140;

  ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
  ctx.strokeStyle = rec.recomendacao === 'GUARDAR' ? '#10B981' : rec.recomendacao === 'DESCARTAR' ? '#EF4444' : '#F59E0B';
  ctx.lineWidth = 2;
  
  // Arredondado manual (ou apenas strokeRect)
  ctx.beginPath();
  ctx.roundRect(x, y, 210, 100, 12);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 10px Inter, sans-serif';
  ctx.fillText('RECOMENDAÇÃO DE REUSO', x + 15, y + 25);

  ctx.font = 'bold 24px Inter, sans-serif';
  ctx.fillStyle = ctx.strokeStyle;
  ctx.fillText(rec.recomendacao, x + 15, y + 55);

  ctx.font = '10px Inter, sans-serif';
  ctx.fillStyle = '#94A3B8';
  const words = rec.justificativa.split(' ');
  let line = '';
  let lineY = y + 75;
  for (let n = 0; n < words.length; n++) {
    let testLine = line + words[n] + ' ';
    if (testLine.length > 30) {
      ctx.fillText(line, x + 15, lineY);
      line = words[n] + ' ';
      lineY += 12;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x + 15, lineY);

  ctx.restore();
}

export default CanvasAvancado;
