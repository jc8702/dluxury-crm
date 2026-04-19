import React, { useState, useEffect, useRef } from 'react';
import type { ResultadoOtimizacao } from '../../domain/entities/CuttingPlan';
import { ZoomIn, ZoomOut, Maximize, ChevronLeft, ChevronRight, Printer } from 'lucide-react';

interface ResultadoCanvasProps {
  resultado: ResultadoOtimizacao;
}

export const ResultadoCanvas: React.FC<ResultadoCanvasProps> = ({ resultado }) => {
  const [activeLayoutIdx, setActiveLayoutIdx] = useState(0);
  const [zoom, setZoom] = useState(1);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const activeLayout = resultado.layouts[activeLayoutIdx];

  const getActivePieces = () => {
    const layout = activeLayout as any;
    return (layout?.layouts_pecas || layout?.pecas_posicionadas || []) as any[];
  };

  const getSheetDimensions = () => {
    const layout = activeLayout as any;
    const pieces = getActivePieces();
    const widthFromPieces = Math.max(0, ...pieces.map((p) => Number(p.x || 0) + Number(p.largura || 0)));
    const heightFromPieces = Math.max(0, ...pieces.map((p) => Number(p.y || 0) + Number(p.altura || 0)));
    return {
      width: Number(layout?.largura_original_mm || widthFromPieces || 2750),
      height: Number(layout?.altura_original_mm || heightFromPieces || 1830),
    };
  };

  const getAproveitamento = () => {
    const layout = activeLayout as any;
    if (!layout) return 0;
    const direct = Number(layout.aproveitamento_percentual);
    if (Number.isFinite(direct) && direct > 0) return direct;

    const { width, height } = getSheetDimensions();
    const totalArea = width * height;
    const usedArea = Number(layout.area_aproveitada_mm2 || 0);
    if (totalArea <= 0) return 0;
    return (usedArea / totalArea) * 100;
  };

  const exportarMapa = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    const layout = activeLayout as any;
    const sku = layout?.chapa_sku || layout?.sku_chapa || 'mapa-corte';
    link.href = canvas.toDataURL('image/png');
    link.download = `mapa-corte-${sku}-${activeLayoutIdx + 1}.png`;
    link.click();
  };

  useEffect(() => {
    drawLayout();
    window.addEventListener('resize', drawLayout);
    return () => window.removeEventListener('resize', drawLayout);
  }, [activeLayout, zoom, resultado]);

  const drawLayout = () => {
    const canvas = canvasRef.current;
    if (!canvas || !activeLayout) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const container = containerRef.current;
    if (!container) return;

    // Dimensões do canvas baseadas no container
    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    const padding = 60;
    
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    ctx.scale(dpr, dpr);

    // Limpar
    ctx.clearRect(0, 0, rect.width, rect.height);

    // Calcular escala para caber na tela
    const { width: sheetWidth, height: sheetHeight } = getSheetDimensions();
    const pieces = getActivePieces();

    const scaleX = (rect.width - padding * 2) / sheetWidth;
    const scaleY = (rect.height - padding * 2) / sheetHeight;
    const baseScale = Math.min(scaleX, scaleY) * zoom;

    const offsetX = (rect.width - sheetWidth * baseScale) / 2;
    const offsetY = (rect.height - sheetHeight * baseScale) / 2;

    // Desenhar a chapa (fundo)
    ctx.fillStyle = '#1A1D23'; // Cor da chapa
    ctx.fillRect(offsetX, offsetY, sheetWidth * baseScale, sheetHeight * baseScale);
    
    // Borda da chapa
    ctx.strokeStyle = 'var(--border-strong)';
    ctx.lineWidth = 1;
    ctx.strokeRect(offsetX, offsetY, sheetWidth * baseScale, sheetHeight * baseScale);

    // Desenhar peças
    pieces.forEach((p, idx) => {
      ctx.fillStyle = (idx % 2 === 0) ? 'rgba(212, 175, 55, 0.2)' : 'rgba(212, 175, 55, 0.15)';
      ctx.strokeStyle = 'var(--primary)';
      ctx.lineWidth = 1;

      const px = offsetX + p.x * baseScale;
      const py = offsetY + p.y * baseScale;
      const pw = p.largura * baseScale;
      const ph = p.altura * baseScale;

      ctx.fillRect(px, py, pw, ph);
      ctx.strokeRect(px, py, pw, ph);

      // Texto da peça (se couber)
      if (pw > 30 && ph > 20) {
        ctx.fillStyle = '#FFFFFF';
        ctx.font = `bold ${Math.max(8, 10 * baseScale)}px Inter`;
        ctx.textAlign = 'center';
        ctx.fillText(`${p.largura}x${p.altura}`, px + pw / 2, py + ph / 2 + 5);
        
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.font = `${Math.max(6, 8 * baseScale)}px Inter`;
        const nome = String(p.nome_peca || p.nome || 'PECA');
        ctx.fillText(nome.substring(0, 15), px + pw / 2, py + ph / 2 - 10);
      }
    });

    // Desenhar sobras (áreas vazias aproveitáveis)
    // Aqui poderíamos adicionar lógica para realçar retalhos gerados
  };

  const styles = {
    wrapper: { width: '100%', height: '100%', display: 'flex', flexDirection: 'column' as const },
    toolbar: { padding: '1rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    canvasContainer: { flex: 1, background: 'var(--background)', borderRadius: '12px', border: '1px solid var(--border)', overflow: 'hidden', position: 'relative' as const },
    pagination: { position: 'absolute' as const, bottom: '2rem', left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: '1rem', background: 'var(--surface-overlay)', padding: '0.75rem 1.5rem', borderRadius: '30px', border: '1px solid var(--border-strong)', backdropFilter: 'blur(8px)', zIndex: 10 }
  };

  return (
    <div style={styles.wrapper} className="animate-fade-in">
      {/* Toolbar Superior */}
      <div style={styles.toolbar}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={() => setZoom(z => Math.min(z + 0.2, 5))} className="btn btn-outline" style={{ padding: '8px' }} title="Aproximar">
            <ZoomIn size={18} />
          </button>
          <button onClick={() => setZoom(z => Math.max(z - 0.2, 0.5))} className="btn btn-outline" style={{ padding: '8px' }} title="Afastar">
            <ZoomOut size={18} />
          </button>
          <button onClick={() => setZoom(1)} className="btn btn-outline" style={{ padding: '8px' }} title="Resetar Zoom">
            <Maximize size={18} />
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', display: 'block', fontWeight: '800' }}>IDENTIFICAÇÃO DA CHAPA</span>
            <span style={{ fontSize: '0.85rem', fontWeight: '800', color: 'var(--primary)' }}>{(activeLayout as any)?.sku_chapa || (activeLayout as any)?.chapa_sku || 'MATERIAL'}</span>
          </div>
          <div style={{ width: '1px', height: '24px', background: 'var(--border)' }} />
          <div style={{ textAlign: 'center' }}>
            <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', display: 'block', fontWeight: '800' }}>APROVEITAMENTO</span>
            <span style={{ fontSize: '0.85rem', fontWeight: '800', color: 'var(--success)' }}>{getAproveitamento().toFixed(1)}%</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={exportarMapa} className="btn btn-outline" style={{ padding: '8px 16px', gap: '8px', fontSize: '0.75rem' }}>
            <Printer size={16} /> Mapa de Corte
          </button>
        </div>
      </div>

      {/* Área do Canvas */}
      <div style={styles.canvasContainer} ref={containerRef}>
        <canvas 
          ref={canvasRef} 
          style={{ cursor: 'grab', display: 'block' }}
        />

        {/* Paginação de Chapas */}
        <div style={styles.pagination}>
          <button 
            disabled={activeLayoutIdx === 0} 
            onClick={() => setActiveLayoutIdx(i => i - 1)}
            style={{ padding: '4px', border: 'none', background: 'none', color: activeLayoutIdx === 0 ? 'var(--text-muted)' : 'var(--primary)', cursor: 'pointer' }}
          >
            <ChevronLeft size={24} />
          </button>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', fontWeight: '900' }}>
            <span style={{ color: 'var(--primary)' }}>{activeLayoutIdx + 1}</span>
            <span style={{ color: 'var(--text-muted)' }}>/</span>
            <span>{resultado.layouts.length}</span>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginLeft: '4px', letterSpacing: '0.05em' }}>CHAPAS</span>
          </div>

          <button 
            disabled={activeLayoutIdx === resultado.layouts.length - 1} 
            onClick={() => setActiveLayoutIdx(i => i + 1)}
            style={{ padding: '4px', border: 'none', background: 'none', color: activeLayoutIdx === resultado.layouts.length - 1 ? 'var(--text-muted)' : 'var(--primary)', cursor: 'pointer' }}
          >
            <ChevronRight size={24} />
          </button>
        </div>

        {/* Legenda Flutuante */}
        <div style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '0.65rem', pointerEvents: 'none' }}>
           <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <div style={{ width: '8px', height: '8px', background: 'var(--primary)', borderRadius: '2px' }} />
              <span>Peças a Cortar</span>
           </div>
           <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '8px', height: '8px', background: '#1A1D23', border: '1px solid var(--border)', borderRadius: '2px' }} />
              <span>Chapa / Sobra</span>
           </div>
        </div>
      </div>
    </div>
  );
};
