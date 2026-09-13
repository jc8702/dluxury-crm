import React from 'react';
import { DollarSign, Users, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/common/Card';
import { Button } from '../../../components/common/Button';
import * as calc from '../domain/calculations';

interface Socio {
  colaboradorId: string;
  nome: string;
  participacao: number;
  valor: number;
}

interface LucroSociosCardProps {
  receitaMes: number;
  custosMes: number;
  totalFolha: number;
  socios: Socio[];
  folhaStatus: 'rascunho' | 'fechada' | 'paga';
  onGerarTituloDistribuicao?: () => void;
  gerandoTitulo?: boolean;
}

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

export function LucroSociosCard({
  receitaMes,
  custosMes,
  totalFolha,
  socios,
  folhaStatus,
  onGerarTituloDistribuicao,
  gerandoTitulo = false,
}: LucroSociosCardProps) {
  const lucroDistribuivel = calc.calcLucroDistribuivel(receitaMes, custosMes, totalFolha);
  const isPrejuizo = lucroDistribuivel < 0;

  return (
    <Card data-testid="lucro-socios-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
          <DollarSign size={16} />
          Distribuição de Lucros — Sócios
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Fórmula visual: Receita - Custos - Folha = Lucro */}
        <div
          className="grid grid-cols-7 gap-2 items-center text-center"
          data-testid="formula-lucro"
        >
          {/* Receita */}
          <div className="col-span-1">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
              Receita Mês
            </div>
            <div className="text-lg font-bold text-success font-mono" data-testid="receita-mes">
              {fmt(receitaMes)}
            </div>
          </div>

          <div className="col-span-1 flex items-center justify-center text-muted-foreground text-xl font-light">
            −
          </div>

          {/* Custos */}
          <div className="col-span-1">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
              Custos Mês
            </div>
            <div className="text-lg font-bold text-destructive font-mono" data-testid="custos-mes">
              {fmt(custosMes)}
            </div>
          </div>

          <div className="col-span-1 flex items-center justify-center text-muted-foreground text-xl font-light">
            −
          </div>

          {/* Folha */}
          <div className="col-span-1">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
              Folha
            </div>
            <div className="text-lg font-bold text-warning font-mono" data-testid="total-folha">
              {fmt(totalFolha)}
            </div>
          </div>

          <div className="col-span-1 flex items-center justify-center text-muted-foreground text-xl font-light">
            =
          </div>

          {/* Lucro */}
          <div className="col-span-1">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
              Lucro
            </div>
            <div
              className={`text-xl font-black font-mono ${isPrejuizo ? 'text-destructive' : 'text-success'}`}
              data-testid="lucro-distribuivel"
            >
              {fmt(lucroDistribuivel)}
            </div>
          </div>
        </div>

        {/* Alerta de prejuízo */}
        {isPrejuizo && (
          <div
            className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm"
            data-testid="alerta-prejuizo"
          >
            <AlertTriangle size={16} />
            <span className="font-medium">Prejuízo: sem distribuição de lucros neste período.</span>
          </div>
        )}

        {/* Cards dos sócios */}
        {!isPrejuizo && socios.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3" data-testid="socios-cards">
            {socios.map((socio) => {
              const valor = calc.calcLucroPorSocio(lucroDistribuivel, socio.participacao);
              return (
                <div
                  key={socio.colaboradorId}
                  className="relative overflow-hidden rounded-xl border bg-gradient-to-br from-success/5 to-transparent p-4"
                  data-testid={`socio-card-${socio.colaboradorId}`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <Users size={14} className="text-primary" />
                        </div>
                        <span className="font-semibold text-sm">{socio.nome}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {socio.participacao}% do lucro
                      </div>
                    </div>
                    <div className="text-right">
                      <div
                        className="text-2xl font-black font-mono text-success"
                        data-testid={`socio-valor-${socio.colaboradorId}`}
                      >
                        {fmt(valor)}
                      </div>
                    </div>
                  </div>
                  {/* Decorative gradient bar */}
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-success/60 to-success/20" />
                </div>
              );
            })}
          </div>
        )}

        {/* Botão gerar título */}
        {onGerarTituloDistribuicao &&
          !isPrejuizo &&
          socios.length > 0 &&
          folhaStatus === 'fechada' && (
            <div className="flex justify-end pt-2">
              <Button
                onClick={onGerarTituloDistribuicao}
                disabled={gerandoTitulo}
                className="gap-2"
                data-testid="btn-gerar-titulo-distribuicao"
              >
                <DollarSign size={14} />
                {gerandoTitulo ? 'Gerando...' : 'Gerar Título Distribuição (5.02)'}
              </Button>
            </div>
          )}

        {/* Sem sócios */}
        {socios.length === 0 && !isPrejuizo && (
          <div className="text-center text-sm text-muted-foreground py-4">
            Nenhum sócio cadastrado com participação nos lucros.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
