'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { LayoutChapa, PecaPosicionada } from '../../domain/entities/CuttingPlan';

interface CanvasAvancadoProps {
  layout: LayoutChapa;
  chapaDimensoes: { largura: number; altura: number };
  onPecaClick?: (peca: PecaPosicionada) => void;
  onExportarPDF?: () => void;
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
      desenharPeca(ctx, peca, peca.peca_id === hoveredPeca, viewport.zoom, showMeasurements);
    });

    ctx.restore();

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

    setHoveredPeca(pecaHover?.peca_id || null);
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

    const peca = layout.pecas_posicionadas?.find(p => p.peca_id === hoveredPeca);
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
    <div ref={containerRef} className={className} style={{
      position: 'relative',
      width: '100%',
      height: '100%',
      backgroundColor: 'var(--background)',
      overflow: 'hidden',
      borderRadius: 'var(--radius-md)',
      border: '1px solid var(--border)'
    }}>
      {/* CANVAS PRINCIPAL */}
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          cursor: isPanning ? 'grabbing' : 'grab',
          display: 'block'
        }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
      />

      {/* TOOLBAR - CONTROLES DE ZOOM */}
      <div style={{
        position: 'absolute',
        bottom: '1.5rem',
        right: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        backgroundColor: 'var(--surface-overlay)',
        backdropFilter: 'blur(10px)',
        border: '1px solid var(--border-strong)',
        borderRadius: 'var(--radius-sm)',
        padding: '0.5rem',
        boxShadow: 'var(--shadow-md)',
        zIndex: 10
      }}>
        <button
          onClick={zoomIn}
          className="btn"
          style={{ padding: '0.4rem', minWidth: '32px' }}
          title="Zoom In (Scroll Up)"
        >
          <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>+</span>
        </button>
        <button
          onClick={zoomOut}
          className="btn"
          style={{ padding: '0.4rem', minWidth: '32px' }}
          title="Zoom Out (Scroll Down)"
        >
          <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>−</span>
        </button>
        <div style={{ borderTop: '1px solid var(--border)', margin: '0.25rem 0' }} />
        <button
          onClick={resetView}
          className="btn"
          style={{ padding: '0.4rem', fontSize: '0.75rem', minWidth: '32px' }}
          title="Reset View"
        >
          ↺
        </button>
        <button
          onClick={fitToScreen}
          className="btn"
          style={{ padding: '0.4rem', fontSize: '0.75rem', minWidth: '32px' }}
          title="Fit to Screen"
        >
          ⊡
        </button>
      </div>

      {/* TOOLBAR - OPÇÕES DE VISUALIZAÇÃO */}
      <div style={{
        position: 'absolute',
        top: '1.5rem',
        right: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        backgroundColor: 'var(--surface-overlay)',
        backdropFilter: 'blur(10px)',
        border: '1px solid var(--border-strong)',
        borderRadius: 'var(--radius-sm)',
        padding: '0.75rem',
        boxShadow: 'var(--shadow-md)',
        zIndex: 10
      }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text)', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={showGrid}
            onChange={(e) => setShowGrid(e.target.checked)}
          />
          GRID
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text)', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={showMeasurements}
            onChange={(e) => setShowMeasurements(e.target.checked)}
          />
          MEDIDAS
        </label>
        {onExportarPDF && (
          <>
            <div style={{ borderTop: '1px solid var(--border)', margin: '0.25rem 0' }} />
            <button
              onClick={onExportarPDF}
              className="btn btn-primary"
              style={{ fontSize: '0.7rem', padding: '0.4rem 0.6rem' }}
            >
              📄 PDF
            </button>
          </>
        )}
      </div>

      {/* INFO ZOOM */}
      <div style={{
        position: 'absolute',
        bottom: '1.5rem',
        left: '1.5rem',
        backgroundColor: 'var(--surface-overlay)',
        border: '1px solid var(--border-strong)',
        borderRadius: 'var(--radius-xs)',
        padding: '0.25rem 0.75rem',
        fontSize: '0.7rem',
        color: 'var(--text-secondary)',
        boxShadow: 'var(--shadow-sm)'
      }}>
        ZOOM: {(viewport.zoom * 100).toFixed(0)}%
      </div>

      {/* INFO PEÇA HOVER */}
      {hoveredPeca && (
        <div style={{
          position: 'absolute',
          top: '1.5rem',
          left: '1.5rem',
          backgroundColor: 'var(--surface-overlay)',
          backdropFilter: 'blur(12px)',
          border: '1px solid var(--primary)',
          borderRadius: 'var(--radius-sm)',
          padding: '1rem',
          boxShadow: 'var(--shadow-lg)',
          maxWidth: '280px',
          zIndex: 20,
          animation: 'fadeIn 0.2s ease'
        }}>
          {(() => {
            const peca = layout.pecas_posicionadas?.find(p => p.peca_id === hoveredPeca);
            if (!peca) return null;
            
            return (
              <>
                <h3 style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--primary)', marginBottom: '0.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.25rem' }}>{peca.nome}</h3>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                  <p>POSIÇÃO: ({Math.round(peca.x)}, {Math.round(peca.y)}) MM</p>
                  <p>TAMANHO: {peca.largura} × {peca.altura} MM</p>
                  <p>ÁREA: {((peca.largura * peca.altura) / 1000000).toFixed(3)} M²</p>
                  {peca.rotacionada && (
                    <p style={{ color: 'var(--warning)', marginTop: '0.25rem' }}>🔄 ROTACIONADA 90°</p>
                  )}
                  {peca.fio_de_fita && (
                    <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border)' }}>
                      <p style={{ fontSize: '0.65rem', fontWeight: 'bold', marginBottom: '0.25rem', color: 'var(--text-muted)' }}>FIO DE FITA:</p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', fontSize: '0.65rem' }}>
                        {peca.fio_de_fita.topo && <span style={{ color: CORES_FITA.topo }}>⬆ TOPO</span>}
                        {peca.fio_de_fita.baixo && <span style={{ color: CORES_FITA.baixo }}>⬇ BAIXO</span>}
                        {peca.fio_de_fita.esquerda && <span style={{ color: CORES_FITA.esquerda }}>⬅ ESQ</span>}
                        {peca.fio_de_fita.direita && <span style={{ color: CORES_FITA.direita }}>➡ DIR</span>}
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
  showMeasurements: boolean
) {
  ctx.save();

  // Fundo da peça
  ctx.fillStyle = highlighted ? 'rgba(212, 175, 55, 0.3)' : 'rgba(0, 169, 157, 0.15)';
  ctx.fillRect(peca.x, peca.y, peca.largura, peca.altura);

  // Borda principal
  ctx.strokeStyle = highlighted ? 'var(--primary)' : '#00A99D';
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
    ctx.font = `bold ${Math.max(10, 14 / zoom)}px Inter, sans-serif`;
    ctx.fillText(
      peca.nome.toUpperCase(),
      peca.x + peca.largura / 2,
      peca.y + peca.altura / 2 - 8 / zoom
    );

    // Dimensões
    if (showMeasurements) {
      ctx.font = `${Math.max(8, 10 / zoom)}px monospace`;
      ctx.fillText(
        `${peca.largura} × ${peca.altura}`,
        peca.x + peca.largura / 2,
        peca.y + peca.altura / 2 + 10 / zoom
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
  ctx.fillStyle = 'rgba(10, 13, 20, 0.98)';
  ctx.fillRect(0, 0, canvasWidth, REGUA_HEIGHT); // Horizontal
  ctx.fillRect(0, 0, REGUA_HEIGHT, canvasHeight); // Vertical

  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = 'var(--border-strong)';
  ctx.lineWidth = 1;
  ctx.font = '9px monospace';
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

function desenharEstatisticas(
  ctx: CanvasRenderingContext2D,
  layout: LayoutChapa,
  dimensoes: { largura: number; altura: number },
  canvasWidth: number
) {
  const areaChapa = dimensoes.largura * dimensoes.altura;
  const areaUsada = layout.area_aproveitada_mm2 || 0;
  const aproveitamento = (areaUsada / areaChapa) * 100;

  ctx.save();
  ctx.fillStyle = 'rgba(10, 13, 20, 0.9)';
  ctx.fillRect(canvasWidth - 180, REGUA_HEIGHT + 10, 170, 70);
  ctx.strokeStyle = 'var(--primary)';
  ctx.lineWidth = 1;
  ctx.strokeRect(canvasWidth - 180, REGUA_HEIGHT + 10, 170, 70);

  ctx.fillStyle = 'var(--primary)';
  ctx.font = 'bold 10px Inter, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('ESTATÍSTICAS', canvasWidth - 170, REGUA_HEIGHT + 25);

  ctx.font = '10px monospace';
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(
    `APROVEITAMENTO: ${aproveitamento.toFixed(1)}%`,
    canvasWidth - 170,
    REGUA_HEIGHT + 42
  );
  ctx.fillText(
    `PEÇAS: ${layout.pecas_posicionadas?.length || 0}`,
    canvasWidth - 170,
    REGUA_HEIGHT + 58
  );

  ctx.restore();
}

export default CanvasAvancado;
