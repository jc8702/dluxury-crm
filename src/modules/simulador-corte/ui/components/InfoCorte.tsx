import React from 'react';
import type { LayoutSimulacao, PecaSimulacao } from '../../domain/types';

interface InfoCorteProps {
  layout: LayoutSimulacao | null;
  pecaSelecionada: PecaSimulacao | null;
  indiceChapa: number;
  totalChapas: number;
}

export default function InfoCorte({
  layout,
  pecaSelecionada,
  indiceChapa,
  totalChapas,
}: InfoCorteProps) {
  if (!layout) {
    return (
      <div className="bg-card border border-border rounded-xl p-4">
        <p className="text-muted-foreground text-sm text-center">
          CARREGUE UM PLANO DE CORTE PARA INICIAR A SIMULAÇÃO
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-accent font-bold text-sm tracking-wider">INFORMAÇÕES DO CORTE</h3>
        <span className="text-muted-foreground text-sm">
          CHAPA {indiceChapa + 1} DE {totalChapas}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="bg-muted rounded-lg p-3">
          <span className="text-muted-foreground block">CHAPA</span>
          <span className="text-foreground font-semibold">{layout.chapa.sku}</span>
        </div>
        <div className="bg-muted rounded-lg p-3">
          <span className="text-muted-foreground block">DIMENSÃO CHAPA</span>
          <span className="text-foreground font-semibold">
            {layout.chapa.largura}×{layout.chapa.altura}×{layout.chapa.espessura}MM
          </span>
        </div>
        <div className="bg-muted rounded-lg p-3">
          <span className="text-muted-foreground block">PEÇAS</span>
          <span className="text-foreground font-semibold">{layout.pecas.length} UN</span>
        </div>
        <div className="bg-muted rounded-lg p-3">
          <span className="text-muted-foreground block">APROVEITAMENTO</span>
          <span className="text-success font-semibold">
            {layout.aproveitamento_percentual.toFixed(1)}%
          </span>
        </div>
      </div>

      {pecaSelecionada && (
        <div className="bg-muted rounded-lg p-3 space-y-1.5">
          <h4 className="text-accent font-semibold text-xs tracking-wider">PEÇA SELECIONADA</h4>
          <div className="grid grid-cols-2 gap-1 text-sm">
            <span className="text-muted-foreground">NOME:</span>
            <span className="text-foreground font-medium text-right truncate">
              {pecaSelecionada.nome}
            </span>
            <span className="text-muted-foreground">DIMENSÃO:</span>
            <span className="text-foreground font-medium text-right">
              {pecaSelecionada.comprimento}×{pecaSelecionada.largura}×{pecaSelecionada.espessura}MM
            </span>
            <span className="text-muted-foreground">POSIÇÃO:</span>
            <span className="text-foreground font-medium text-right">
              X:{pecaSelecionada.x} Y:{pecaSelecionada.y}
            </span>
            <span className="text-muted-foreground">ROTAÇÃO:</span>
            <span className="text-foreground font-medium text-right">
              {pecaSelecionada.rotacionada ? '90°' : '0°'}
            </span>
          </div>
        </div>
      )}

      <div className="bg-muted rounded-lg p-3">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-muted-foreground">ÁREA APROVEITADA</span>
          <span className="text-foreground font-semibold">
            {(layout.area_aproveitada_mm2 / 1e6).toFixed(2)}M²
          </span>
        </div>
        <div className="w-full bg-background rounded-full h-2 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-accent to-success rounded-full transition-all duration-500"
            style={{ width: `${Math.min(layout.aproveitamento_percentual, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}
