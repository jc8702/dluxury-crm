'use client';

import React, { useState, useCallback } from 'react';
import { parseCSV } from '../../infrastructure/parsers/CSVParser';
import { parseSketchUpDAE } from '../../infrastructure/parsers/SketchUpParser';

interface ImportacaoModalProps {
  onImportar: (pecas: any[]) => void;
  onFechar: () => void;
}

export function ImportacaoModal({ onImportar, onFechar }: ImportacaoModalProps) {
  const [tipo, setTipo] = useState<'csv' | 'sketchup'>('csv');
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [processando, setProcessando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const handleArquivo = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setArquivo(file);
      setErro(null);
    }
  }, []);

  const handleImportar = useCallback(async () => {
    if (!arquivo) return;

    setProcessando(true);
    setErro(null);

    try {
      let pecas: any[] = [];

      if (tipo === 'csv') {
        pecas = await parseCSV(arquivo);
      } else {
        pecas = await parseSketchUpDAE(arquivo);
      }

      if (pecas.length === 0) {
        throw new Error('Nenhuma peça encontrada no arquivo');
      }

      onImportar(pecas);
      onFechar();
    } catch (err: any) {
      setErro(err.message || 'Erro ao processar arquivo');
    } finally {
      setProcessando(false);
    }
  }, [arquivo, tipo, onImportar, onFechar]);

  return (
    <div className="modal-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="glass" style={{ maxWidth: '450px', width: '90%', padding: '2.5rem', borderRadius: 'var(--radius-lg)' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--primary)', marginBottom: '1.5rem', letterSpacing: '-0.02em' }}>
          IMPORTAR PEÇAS
        </h2>

        {/* TIPO DE IMPORTAÇÃO */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label className="label-base" style={{ marginBottom: '0.75rem', display: 'block' }}>TIPO DE ARQUIVO</label>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              onClick={() => setTipo('csv')}
              className={tipo === 'csv' ? 'btn-primary' : 'btn-outline'}
              style={{ flex: 1, padding: '0.75rem' }}
            >
              📊 CSV / EXCEL
            </button>
            <button
              onClick={() => setTipo('sketchup')}
              className={tipo === 'sketchup' ? 'btn-primary' : 'btn-outline'}
              style={{ flex: 1, padding: '0.75rem' }}
            >
              📐 SKETCHUP
            </button>
          </div>
        </div>

        {/* UPLOAD ARQUIVO */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label className="label-base" style={{ marginBottom: '0.75rem', display: 'block' }}>SELECIONAR ARQUIVO</label>
          <input
            type="file"
            accept={tipo === 'csv' ? '.csv,.txt' : '.dae'}
            onChange={handleArquivo}
            className="input"
            style={{ width: '100%', padding: '0.5rem' }}
          />
          {arquivo && (
            <p style={{ fontSize: '0.7rem', color: 'var(--success)', marginTop: '0.5rem', fontWeight: '600' }}>
              ✓ {arquivo.name} ({(arquivo.size / 1024).toFixed(1)} KB)
            </p>
          )}
        </div>

        {/* ERRO */}
        {erro && (
          <div style={{
            marginBottom: '1.5rem', padding: '1rem',
            background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--danger)',
            borderRadius: 'var(--radius-sm)', color: 'var(--danger)', fontSize: '0.8rem', fontWeight: '500'
          }}>
            ⚠️ {erro}
          </div>
        )}

        {/* AÇÕES */}
        <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
          <button
            onClick={onFechar}
            className="btn-outline"
            style={{ flex: 1 }}
          >
            CANCELAR
          </button>
          <button
            onClick={handleImportar}
            disabled={!arquivo || processando}
            className="btn-primary"
            style={{ flex: 1 }}
          >
            {processando ? 'PROCESSANDO...' : 'IMPORTAR AGORA'}
          </button>
        </div>
      </div>
    </div>
  );
}
