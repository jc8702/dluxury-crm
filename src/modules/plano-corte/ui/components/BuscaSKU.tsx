'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { ChapaRepository } from '../../infrastructure/repositories/ChapaRepository';
import type { Chapa } from '../../infrastructure/repositories/ChapaRepository';
import type { ChapaSelecionada } from '../../domain/types';
import { CardChapa } from './CardChapa';
import { Search, Loader2 } from 'lucide-react';

interface BuscaSKUProps {
  onAdicionarChapa: (chapa: ChapaSelecionada) => void;
  chapasSelecionadas: ChapaSelecionada[];
}

export function BuscaSKU({ onAdicionarChapa, chapasSelecionadas }: BuscaSKUProps) {
  const [termoBusca, setTermoBusca] = useState('');
  const [resultados, setResultados] = useState<Chapa[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [repo] = useState(() => new ChapaRepository());

  // Buscar chapas por SKU
  useEffect(() => {
    const s = termoBusca.trim();
    if (s.length < 1) {
      setResultados([]);
      return;
    }

    const buscar = async () => {
      setCarregando(true);
      try {
        const resultado = await repo.buscarPorSKU(s);
        setResultados(resultado);
      } catch (error) {
        console.error('Erro ao buscar SKU:', error);
        setResultados([]);
      } finally {
        setCarregando(false);
      }
    };

    const timer = setTimeout(buscar, 300);
    return () => clearTimeout(timer);
  }, [termoBusca, repo]);

  const handleAdicionarChapa = useCallback((chapa: Chapa) => {
    // Verificar se já foi adicionada
    const jaAdicionada = chapasSelecionadas.some(c => c.sku_chapa === chapa.sku);
    if (jaAdicionada) {
      return;
    }

    onAdicionarChapa({
      id: chapa.id,
      sku_chapa: chapa.sku,
      nome_exibicao: `${chapa.material} ${chapa.espessura}mm`.toUpperCase(),
      largura_mm: chapa.largura,
      altura_mm: chapa.altura,
      espessura_mm: chapa.espessura,
      preco_unitario: chapa.preco,
      imagem_url: chapa.imagem_url,
      criada_em: new Date(),
      pecas: []
    });

    setTermoBusca(''); // Limpar busca
    setResultados([]);
  }, [chapasSelecionadas, onAdicionarChapa]);

  return (
    <div className="mb-8">
      <div className="relative mb-6">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
          <Search size={18} />
        </div>
        <input
          id="sku-search-input"
          type="text"
          placeholder="BUSCAR MATERIAL POR SKU (EX: MDF-BRANCO-18)..."
          value={termoBusca}
          onChange={(e) => setTermoBusca(e.target.value.toUpperCase())}
          className="w-full h-12 pl-12 pr-12 bg-background border border-border rounded-xl text-foreground font-bold tracking-wider focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-muted-foreground/60 placeholder:font-normal"
        />
        {carregando && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <Loader2 size={18} className="animate-spin text-primary" />
          </div>
        )}
      </div>

      {/* Resultados */}
      <div className="animate-in fade-in slide-in-from-top-2 duration-300">
        {resultados.length > 0 ? (
          <div className="flex flex-col gap-4">
            {resultados.map(chapa => (
              <CardChapa
                key={chapa.id}
                chapa={chapa}
                onAdicionar={() => handleAdicionarChapa(chapa)}
                jaAdicionada={chapasSelecionadas.some(c => c.sku_chapa === chapa.sku)}
              />
            ))}
          </div>
        ) : termoBusca.trim().length >= 2 && !carregando ? (
          <div className="bg-card border border-dashed border-border rounded-xl p-8 text-center">
            <p className="text-muted-foreground font-medium m-0">Nenhuma chapa encontrada para "{termoBusca}"</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
