'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { ChapaRepository, Chapa } from '../../infrastructure/repositories/ChapaRepository';
import { ChapaSelecionada } from '../../domain/types';
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
    if (s.length < 2) {
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

    const timer = setTimeout(buscar, 400);
    return () => clearTimeout(timer);
  }, [termoBusca, repo]);

  const handleAdicionarChapa = useCallback((chapa: Chapa) => {
    // Verificar se já foi adicionada
    const jaAdicionada = chapasSelecionadas.some(c => c.sku_chapa === chapa.sku);
    if (jaAdicionada) {
      return;
    }

    onAdicionarChapa({
      id: `chapa_${Date.now()}`,
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
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#888]">
          <Search size={18} />
        </div>
        <input
          type="text"
          placeholder="BUSCAR MATERIAL POR SKU (EX: MDF-BRANCO-18)..."
          value={termoBusca}
          onChange={(e) => setTermoBusca(e.target.value.toUpperCase())}
          className="w-full h-12 pl-12 pr-12 bg-[#1a1a1a] border-2 border-[#FFA500] rounded-xl text-white font-bold tracking-wider focus:outline-none focus:border-[#FF6B35] focus:ring-4 focus:ring-[#FF6B35]/10 transition-all placeholder:text-[#555] placeholder:font-normal"
        />
        {carregando && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <Loader2 size={18} className="animate-spin text-[#FFA500]" />
          </div>
        )}
      </div>

      {/* Resultados */}
      <div className="animate-in fade-in slide-in-from-top-2 duration-300">
        {resultados.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
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
          <div className="bg-[#242424] border border-dashed border-[#444] rounded-xl p-8 text-center">
            <p className="text-[#888] font-medium m-0">Nenhuma chapa encontrada para "{termoBusca}"</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
