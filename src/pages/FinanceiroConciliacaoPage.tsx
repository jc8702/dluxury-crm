import React, { useState, useRef } from 'react';
import { FiUpload, FiRefreshCw, FiCheckCircle, FiXCircle, FiLink, FiAlertTriangle } from 'react-icons/fi';

const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

interface OFXTransaction {
  id: string;
  date: string;
  amount: number;
  memo: string;
  type: 'CREDIT' | 'DEBIT';
  matched?: boolean;
  matchedTitulo?: string;
  status: 'matched' | 'unmatched' | 'manual' | 'ignored';
}

interface InternalEntry {
  id: string;
  numero: string;
  valor: number;
  data: string;
  tipo: 'receber' | 'pagar';
  descricao: string;
}

function parseOFX(content: string): OFXTransaction[] {
  const transactions: OFXTransaction[] = [];
  const stmttrns = content.match(/<STMTTRN>([\s\S]*?)<\/STMTTRN>/g) || [];
  
  for (const block of stmttrns) {
    const getVal = (tag: string) => {
      const m = block.match(new RegExp(`<${tag}>([^<]*)`));
      return m ? m[1].trim() : '';
    };
    
    const fitid = getVal('FITID');
    const dtposted = getVal('DTPOSTED');
    const trnamt = getVal('TRNAMT');
    const trntype = getVal('TRNTYPE');
    const memo = getVal('MEMO') || getVal('NAME') || '';
    
    if (!fitid || !trnamt) continue;
    
    const amount = parseFloat(trnamt.replace(',', '.'));
    const year = dtposted.substring(0, 4);
    const month = dtposted.substring(4, 6);
    const day = dtposted.substring(6, 8);
    const date = `${year}-${month}-${day}`;
    
    transactions.push({
      id: fitid,
      date,
      amount: Math.abs(amount),
      memo,
      type: amount >= 0 ? 'CREDIT' : 'DEBIT',
      status: 'unmatched',
    });
  }
  
  return transactions;
}

function autoMatch(ofxTxns: OFXTransaction[], internals: InternalEntry[]): OFXTransaction[] {
  return ofxTxns.map(txn => {
    // Tentar match por valor exato + tipo compatível (±3 dias de tolerância)
    const txnDate = new Date(txn.date);
    const isCredit = txn.type === 'CREDIT';
    
    const match = internals.find(entry => {
      const entryDate = new Date(entry.data);
      const dayDiff = Math.abs((txnDate.getTime() - entryDate.getTime()) / 86400000);
      const valorMatch = Math.abs(entry.valor - txn.amount) < 0.02;
      const tipoMatch = isCredit ? entry.tipo === 'receber' : entry.tipo === 'pagar';
      return valorMatch && tipoMatch && dayDiff <= 3;
    });
    
    if (match) {
      return { ...txn, status: 'matched', matched: true, matchedTitulo: match.numero };
    }
    return txn;
  });
}

export default function FinanceiroConciliacaoPage() {
  const [ofxTxns, setOfxTxns] = useState<OFXTransaction[]>([]);
  const [internals, setInternals] = useState<InternalEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [manualMatch, setManualMatch] = useState<string | null>(null); // OFX id sendo matchado manualmente
  const [persistindo, setPersistindo] = useState(false);
  const [persisted, setPersisted] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const token = localStorage.getItem('dluxury_token') || '';

  const handleFile = async (file: File) => {
    setLoading(true);
    setError('');
    try {
      const content = await file.text();
      const parsed = parseOFX(content);
      if (parsed.length === 0) throw new Error('Arquivo OFX inválido ou sem transações');
      
      // Carregar títulos pendentes
      const [recRes, pagRes] = await Promise.all([
        fetch('/api/financeiro/titulos-receber?status=aberto', { headers: { 'Authorization': `Bearer ${token}` } }).then(r => r.json()),
        fetch('/api/financeiro/titulos-pagar?status=aberto', { headers: { 'Authorization': `Bearer ${token}` } }).then(r => r.json()),
      ]);
      
      const entries: InternalEntry[] = [
        ...(recRes.data || []).map((t: any) => ({ id: t.id, numero: t.numero_titulo, valor: Number(t.valor_aberto), data: t.data_vencimento?.split('T')[0], tipo: 'receber', descricao: t.observacoes || t.numero_titulo })),
        ...(pagRes.data || []).map((t: any) => ({ id: t.id, numero: t.numero_titulo, valor: Number(t.valor_aberto), data: t.data_vencimento?.split('T')[0], tipo: 'pagar', descricao: t.numero_titulo })),
      ];
      
      setInternals(entries);
      setOfxTxns(autoMatch(parsed, entries));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const doManualMatch = (ofxId: string, entryId: string) => {
    const entry = internals.find(e => e.id === entryId);
    setOfxTxns(prev => prev.map(t => t.id === ofxId ? { ...t, status: 'manual', matched: true, matchedTitulo: entry?.numero } : t));
    setManualMatch(null);
  };

  const ignoreTransaction = (id: string) => {
    setOfxTxns(prev => prev.map(t => t.id === id ? { ...t, status: 'ignored' } : t));
  };

  const persistConciliacao = async () => {
    const matched = ofxTxns.filter(t => t.status === 'matched' || t.status === 'manual');
    if (matched.length === 0) { alert('Nenhuma transação conciliada para persistir.'); return; }
    setPersistindo(true);
    try {
      // Marcar como conferidos no backend via endpoint de conferência
      for (const txn of matched) {
        if (txn.matchedTitulo) {
          await fetch('/api/financeiro/conferencia', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ numero_titulo: txn.matchedTitulo, conferido: true, ofx_id: txn.id }),
          });
        }
      }
      setPersisted(true);
    } finally {
      setPersistindo(false);
    }
  };

  const matched = ofxTxns.filter(t => t.status === 'matched' || t.status === 'manual');
  const unmatched = ofxTxns.filter(t => t.status === 'unmatched');
  const ignored = ofxTxns.filter(t => t.status === 'ignored');
  const matchRate = ofxTxns.length > 0 ? ((matched.length / ofxTxns.length) * 100).toFixed(0) : '0';

  return (
    <div className="page-container anim-fade-in">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <FiRefreshCw style={{ color: '#06b6d4' }} /> CONCILIAÇÃO BANCÁRIA
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Importe seu extrato OFX e compare com os lançamentos internos</p>
        </div>
        {ofxTxns.length > 0 && (
          <button className="btn btn-primary" onClick={persistConciliacao} disabled={persistindo || persisted}>
            {persisted ? <><FiCheckCircle /> CONCILIADO!</> : persistindo ? '⏳ Salvando...' : <><FiCheckCircle /> PERSISTIR CONCILIAÇÃO</>}
          </button>
        )}
      </div>

      {/* Upload */}
      <div 
        className="card glass"
        style={{ border: '2px dashed var(--border)', padding: '3rem', textAlign: 'center', cursor: 'pointer', marginBottom: '2rem', transition: '0.2s' }}
        onClick={() => fileRef.current?.click()}
        onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--primary)'; }}
        onDragLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; }}
        onDrop={e => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--border)'; const file = e.dataTransfer.files[0]; if (file) handleFile(file); }}
      >
        <input ref={fileRef} type="file" accept=".ofx,.OFX" style={{ display: 'none' }} onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }} />
        <FiUpload style={{ fontSize: '2.5rem', color: 'var(--primary)', marginBottom: '0.75rem' }} />
        <p style={{ fontWeight: 700 }}>{loading ? 'Processando...' : 'Arraste seu arquivo OFX aqui ou clique para selecionar'}</p>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>Compatível com todos os bancos brasileiros</p>
        {error && <p style={{ color: 'var(--danger)', marginTop: '0.75rem', fontWeight: 700 }}>{error}</p>}
      </div>

      {ofxTxns.length > 0 && (
        <>
          {/* Métricas */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
            {[
              { label: 'Total Importado', value: ofxTxns.length, color: 'var(--primary)', sub: `${fmt(ofxTxns.reduce((s, t) => s + t.amount, 0))} total` },
              { label: 'Conciliadas', value: matched.length, color: 'var(--success)', sub: `${matchRate}% de match` },
              { label: 'Pendentes', value: unmatched.length, color: 'var(--warning)', sub: 'Sem correspondência' },
              { label: 'Ignoradas', value: ignored.length, color: 'var(--text-muted)', sub: 'Descartadas' },
            ].map((m, i) => (
              <div key={i} className="card glass" style={{ padding: '1rem', borderLeft: `3px solid ${m.color}` }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>{m.label}</div>
                <div style={{ fontSize: '1.75rem', fontWeight: 900, color: m.color }}>{m.value}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{m.sub}</div>
              </div>
            ))}
          </div>

          {/* Barra de progresso */}
          <div className="card glass" style={{ padding: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.5rem' }}>
              <span>PROGRESSO DA CONCILIAÇÃO</span>
              <span style={{ color: Number(matchRate) >= 80 ? 'var(--success)' : Number(matchRate) >= 50 ? 'var(--warning)' : 'var(--danger)' }}>{matchRate}%</span>
            </div>
            <div style={{ height: '8px', background: 'var(--surface-hover)', borderRadius: '999px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${matchRate}%`, background: Number(matchRate) >= 80 ? 'var(--success)' : Number(matchRate) >= 50 ? 'var(--warning)' : 'var(--danger)', borderRadius: '999px', transition: '0.5s' }} />
            </div>
          </div>

          {/* Listagem */}
          <div className="card glass" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: '0.9rem' }}>
              TRANSAÇÕES DO EXTRATO OFX
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                    {['DATA', 'DESCRIÇÃO', 'TIPO', 'VALOR', 'STATUS', 'CORRESPONDÊNCIA', 'AÇÕES'].map(h => (
                      <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', borderBottom: '1px solid var(--border)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ofxTxns.map((txn, i) => (
                    <React.Fragment key={txn.id}>
                      <tr style={{ background: txn.status === 'matched' ? 'rgba(34,197,94,0.04)' : txn.status === 'manual' ? 'rgba(59,130,246,0.04)' : txn.status === 'ignored' ? 'rgba(0,0,0,0.1)' : 'transparent', opacity: txn.status === 'ignored' ? 0.5 : 1 }}>
                        <td style={{ padding: '0.75rem 1rem', fontSize: '0.82rem', fontFamily: 'monospace' }}>{txn.date}</td>
                        <td style={{ padding: '0.75rem 1rem', fontSize: '0.82rem', maxWidth: '200px' }}>
                          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={txn.memo}>{txn.memo}</div>
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: '4px', background: txn.type === 'CREDIT' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)', color: txn.type === 'CREDIT' ? 'var(--success)' : 'var(--danger)' }}>
                            {txn.type === 'CREDIT' ? 'ENTRADA' : 'SAÍDA'}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', fontWeight: 700, color: txn.type === 'CREDIT' ? 'var(--success)' : 'var(--danger)' }}>
                          {txn.type === 'CREDIT' ? '+' : '-'} {fmt(txn.amount)}
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          {txn.status === 'matched' && <span style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', borderRadius: '4px', background: 'rgba(34,197,94,0.15)', color: 'var(--success)', fontWeight: 700 }}><FiCheckCircle style={{ verticalAlign: 'middle' }} /> AUTO</span>}
                          {txn.status === 'manual' && <span style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', borderRadius: '4px', background: 'rgba(59,130,246,0.15)', color: '#3b82f6', fontWeight: 700 }}><FiLink style={{ verticalAlign: 'middle' }} /> MANUAL</span>}
                          {txn.status === 'unmatched' && <span style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', borderRadius: '4px', background: 'rgba(245,158,11,0.15)', color: 'var(--warning)', fontWeight: 700 }}><FiAlertTriangle style={{ verticalAlign: 'middle' }} /> PENDENTE</span>}
                          {txn.status === 'ignored' && <span style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', borderRadius: '4px', background: 'rgba(107,114,128,0.15)', color: 'var(--text-muted)', fontWeight: 700 }}>IGNORADO</span>}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                          {txn.matchedTitulo || '—'}
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <div style={{ display: 'flex', gap: '0.4rem' }}>
                            {txn.status === 'unmatched' && (
                              <>
                                <button onClick={() => setManualMatch(manualMatch === txn.id ? null : txn.id)} className="btn btn-outline" style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem' }}>
                                  <FiLink /> Vincular
                                </button>
                                <button onClick={() => ignoreTransaction(txn.id)} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '6px', cursor: 'pointer', padding: '0.25rem 0.5rem', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                  <FiXCircle /> Ignorar
                                </button>
                              </>
                            )}
                            {(txn.status === 'matched' || txn.status === 'manual') && (
                              <button onClick={() => setOfxTxns(prev => prev.map(t => t.id === txn.id ? { ...t, status: 'unmatched', matched: false, matchedTitulo: undefined } : t))} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.7rem', color: 'var(--danger)' }}>
                                Desfazer
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Match Manual Expander */}
                      {manualMatch === txn.id && (
                        <tr>
                          <td colSpan={7} style={{ padding: '0.75rem 1.5rem', background: 'rgba(59,130,246,0.06)', borderBottom: '2px solid rgba(59,130,246,0.2)' }}>
                            <div style={{ fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.75rem', color: '#3b82f6' }}>
                              VINCULAR MANUALMENTE: {txn.memo} ({fmt(txn.amount)})
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '0.5rem', maxHeight: '200px', overflowY: 'auto' }}>
                              {internals
                                .filter(e => txn.type === 'CREDIT' ? e.tipo === 'receber' : e.tipo === 'pagar')
                                .map(entry => (
                                  <button key={entry.id} onClick={() => doManualMatch(txn.id, entry.id)} style={{
                                    padding: '0.6rem 0.75rem', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--card-bg)',
                                    cursor: 'pointer', textAlign: 'left', fontSize: '0.78rem', transition: '0.15s'
                                  }}>
                                    <div style={{ fontWeight: 700 }}>{entry.numero}</div>
                                    <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>{fmt(entry.valor)} • {entry.data}</div>
                                  </button>
                                ))
                              }
                              {internals.filter(e => txn.type === 'CREDIT' ? e.tipo === 'receber' : e.tipo === 'pagar').length === 0 && (
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Nenhum título compatível disponível</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
