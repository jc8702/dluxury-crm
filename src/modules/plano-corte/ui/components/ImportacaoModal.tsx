'use client';

import React, { useState, useCallback } from 'react';
import { FileSpreadsheet, Ruler, X, Upload, CheckCircle2, AlertCircle } from 'lucide-react';
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
    <div className="modal-overlay" onClick={onFechar} style={{ zIndex: 1000 }}>
      <div 
        className="modal-content animate-pop-in" 
        style={{ width: '500px', background: 'var(--surface)', padding: '2rem' }} 
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '900', color: 'var(--text)', margin: 0 }}>Importar Peças</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Integração direta com SketchUp e planilhas</p>
          </div>
          <button onClick={onFechar} className="btn-icon" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <X size={24} />
          </button>
        </div>

        {/* TIPO DE IMPORTAÇÃO */}
        <div style={{ marginBottom: '2rem' }}>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--primary)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Formato do Projeto
          </label>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              onClick={() => setTipo('csv')}
              className={tipo === 'csv' ? 'btn btn-primary' : 'btn'}
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', height: '45px' }}
            >
              <FileSpreadsheet size={18} /> CSV / EXCEL
            </button>
            <button
              onClick={() => setTipo('sketchup')}
              className={tipo === 'sketchup' ? 'btn btn-primary' : 'btn'}
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', height: '45px' }}
            >
              <Ruler size={18} /> SKETCHUP
            </button>
          </div>
        </div>

        {/* AREA DE UPLOAD */}
        <div style={{ marginBottom: '2rem' }}>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--primary)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Seleção de Arquivo
          </label>
          <div 
            style={{ 
              border: '2px dashed var(--border-strong)', 
              borderRadius: 'var(--radius-md)', 
              padding: '2.5rem 1.5rem', 
              textAlign: 'center',
              backgroundColor: 'rgba(255,255,255,0.02)',
              position: 'relative',
              transition: 'all 0.2s ease'
            }}
          >
            <input
              type="file"
              accept={tipo === 'csv' ? '.csv,.txt' : '.dae'}
              onChange={handleArquivo}
              style={{ 
                position: 'absolute', 
                inset: 0, 
                opacity: 0, 
                cursor: 'pointer',
                width: '100%'
              }}
            />
            {!arquivo ? (
              <>
                <Upload size={40} style={{ color: 'var(--primary)', opacity: 0.5, marginBottom: '1rem' }} />
                <p style={{ fontSize: '0.9rem', color: 'var(--text)', fontWeight: '600' }}>Clique ou arraste o arquivo</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  {tipo === 'csv' ? 'Suporta .csv e .txt' : 'Suporta arquivos COLLADA .dae'}
                </p>
              </>
            ) : (
              <>
                <CheckCircle2 size={40} style={{ color: 'var(--success)', marginBottom: '1rem' }} />
                <p style={{ fontSize: '0.9rem', color: 'var(--text)', fontWeight: '700' }}>{arquivo.name}</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  {(arquivo.size / 1024).toFixed(1)} KB - Pronto para importar
                </p>
              </>
            )}
          </div>
        </div>

        {/* MENSAGEM DE ERRO */}
        {erro && (
          <div style={{ 
            marginBottom: '1.5rem', 
            padding: '1rem', 
            backgroundColor: 'rgba(239, 68, 68, 0.1)', 
            border: '1px solid rgba(239, 68, 68, 0.2)', 
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            color: '#ef4444',
            fontSize: '0.85rem'
          }}>
            <AlertCircle size={18} />
            {erro}
          </div>
        )}

        {/* AÇÕES */}
        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
          <button
            onClick={onFechar}
            className="btn"
            style={{ flex: 1, height: '48px' }}
          >
            CANCELAR
          </button>
          <button
            onClick={handleImportar}
            disabled={!arquivo || processando}
            className="btn btn-primary"
            style={{ flex: 2, height: '48px', fontWeight: 'bold', letterSpacing: '0.05em' }}
          >
            {processando ? 'PROCESSANDO...' : 'EXECUTAR IMPORTAÇÃO'}
          </button>
        </div>
      </div>
    </div>
  );
}
