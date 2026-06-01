import React, { useState, useRef } from 'react';
import {
  Upload,
  RefreshCw,
  CheckCircle,
  XCircle,
  Link,
  AlertTriangle,
  ArrowLeft,
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { Button, Card, CardContent, CardHeader, CardTitle, Badge } from '../components/common';

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

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
  return ofxTxns.map((txn) => {
    // Tentar match por valor exato + tipo compatÃ­vel (Â±3 dias de tolerÃ¢ncia)
    const txnDate = new Date(txn.date);
    const isCredit = txn.type === 'CREDIT';

    const match = internals.find((entry) => {
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
  const { success, warning } = useToast();
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
      if (parsed.length === 0) throw new Error('Arquivo OFX invÃ¡lido ou sem transaÃ§Ãµes');

      // Carregar tÃ­tulos pendentes
      const [recRes, pagRes] = await Promise.all([
        fetch('/api/financeiro/titulos-receber?status=aberto', {
          headers: { Authorization: `Bearer ${token}` },
        }).then((r) => r.json()),
        fetch('/api/financeiro/titulos-pagar?status=aberto', {
          headers: { Authorization: `Bearer ${token}` },
        }).then((r) => r.json()),
      ]);

      const entries: InternalEntry[] = [
        ...(recRes.data || []).map((t: any) => ({
          id: t.id,
          numero: t.numero_titulo,
          valor: Number(t.valor_aberto),
          data: t.data_vencimento?.split('T')[0],
          tipo: 'receber',
          descricao: t.observacoes || t.numero_titulo,
        })),
        ...(pagRes.data || []).map((t: any) => ({
          id: t.id,
          numero: t.numero_titulo,
          valor: Number(t.valor_aberto),
          data: t.data_vencimento?.split('T')[0],
          tipo: 'pagar',
          descricao: t.numero_titulo,
        })),
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
    const entry = internals.find((e) => e.id === entryId);
    setOfxTxns((prev) =>
      prev.map((t) =>
        t.id === ofxId
          ? { ...t, status: 'manual', matched: true, matchedTitulo: entry?.numero }
          : t,
      ),
    );
    setManualMatch(null);
  };

  const ignoreTransaction = (id: string) => {
    setOfxTxns((prev) => prev.map((t) => (t.id === id ? { ...t, status: 'ignored' } : t)));
  };

  const persistConciliacao = async () => {
    const matched = ofxTxns.filter((t) => t.status === 'matched' || t.status === 'manual');
    if (matched.length === 0) {
      warning('Nenhuma transaÃ§Ã£o conciliada para persistir.');
      return;
    }
    setPersistindo(true);
    try {
      // Marcar como conferidos no backend via endpoint de conferÃªncia
      for (const txn of matched) {
        if (txn.matchedTitulo) {
          await fetch('/api/financeiro/conferencia', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              numero_titulo: txn.matchedTitulo,
              conferido: true,
              ofx_id: txn.id,
            }),
          });
        }
      }
      setPersisted(true);
      success('ConciliaÃ§Ã£o persistida com sucesso!');
    } finally {
      setPersistindo(false);
    }
  };

  const matched = ofxTxns.filter((t) => t.status === 'matched' || t.status === 'manual');
  const unmatched = ofxTxns.filter((t) => t.status === 'unmatched');
  const ignored = ofxTxns.filter((t) => t.status === 'ignored');
  const matchRate = ofxTxns.length > 0 ? ((matched.length / ofxTxns.length) * 100).toFixed(0) : '0';

  return (
    <div
      className="page-container anim-fade-in"
      style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}
    >
      <Button
        variant="ghost"
        onClick={() => (window.location.hash = '#/financeiro')}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.75rem',
          color: 'hsl(var(--muted-foreground))',
          marginBottom: '1rem',
          padding: 0,
          height: 'auto',
          background: 'transparent',
        }}
      >
        <ArrowLeft size={16} /> Voltar ao Painel Financeiro
      </Button>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          marginBottom: '2rem',
        }}
      >
        <div>
          <h1
            style={{
              fontSize: '1.75rem',
              fontWeight: 900,
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
            }}
          >
            <RefreshCw /> CONCILIAÃ‡ÃƒO BANCÃRIA
          </h1>
          <p style={{ color: 'hsl(var(--muted-foreground))', fontSize: '0.9rem' }}>
            Importe seu extrato OFX e compare com os lanÃ§amentos internos
          </p>
        </div>
        {ofxTxns.length > 0 && (
          <Button
            variant={persisted ? 'secondary' : 'primary'}
            onClick={persistConciliacao}
            disabled={persistindo || persisted}
            isLoading={persistindo}
          >
            {persisted ? (
              <>
                <CheckCircle className="w-4 h-4 mr-1 inline" /> CONCILIADO!
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-1 inline" /> PERSISTIR CONCILIAÃ‡ÃƒO
              </>
            )}
          </Button>
        )}
      </div>

      {/* Upload */}
      <Card
        className="glass"
        style={{
          border: '2px dashed hsl(var(--border))',
          padding: '3rem',
          textAlign: 'center',
          cursor: 'pointer',
          marginBottom: '2rem',
          transition: '0.2s',
        }}
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          e.currentTarget.style.borderColor = 'hsl(var(--primary))';
        }}
        onDragLeave={(e) => {
          e.currentTarget.style.borderColor = 'hsl(var(--border))';
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.currentTarget.style.borderColor = 'hsl(var(--border))';
          const file = e.dataTransfer.files[0];
          if (file) handleFile(file);
        }}
      >
        <CardContent style={{ padding: 0 }}>
          <input
            ref={fileRef}
            type="file"
            accept=".ofx,.OFX"
            style={{ display: 'none' }}
            onChange={(e) => {
              if (e.target.files?.[0]) handleFile(e.target.files[0]);
            }}
          />
          <Upload className="w-10 h-10 mx-auto text-primary mb-3" />
          <p style={{ fontWeight: 700 }}>
            {loading ? 'Processando...' : 'Arraste seu arquivo OFX aqui ou clique para selecionar'}
          </p>
          <p
            style={{
              fontSize: '0.8rem',
              color: 'hsl(var(--muted-foreground))',
              marginTop: '0.35rem',
            }}
          >
            CompatÃ­vel com todos os bancos brasileiros
          </p>
          {error && (
            <p style={{ color: 'hsl(var(--destructive))', marginTop: '0.75rem', fontWeight: 700 }}>
              {error}
            </p>
          )}
        </CardContent>
      </Card>

      {ofxTxns.length > 0 && (
        <>
          {/* MÃ©tricas */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '1rem',
              marginBottom: '1.5rem',
            }}
          >
            {[
              {
                label: 'Total Importado',
                value: ofxTxns.length,
                color: 'hsl(var(--primary))',
                sub: `${fmt(ofxTxns.reduce((s, t) => s + t.amount, 0))} total`,
              },
              {
                label: 'Conciliadas',
                value: matched.length,
                color: 'hsl(var(--success))',
                sub: `${matchRate}% de match`,
              },
              {
                label: 'Pendentes',
                value: unmatched.length,
                color: 'hsl(var(--warning))',
                sub: 'Sem correspondÃªncia',
              },
              {
                label: 'Ignoradas',
                value: ignored.length,
                color: 'hsl(var(--muted-foreground))',
                sub: 'Descartadas',
              },
            ].map((m, i) => (
              <Card key={i} className="glass" style={{ borderLeft: `3px solid ${m.color}` }}>
                <CardContent style={{ padding: '1rem' }}>
                  <div
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      color: 'hsl(var(--muted-foreground))',
                      textTransform: 'uppercase',
                      marginBottom: '0.25rem',
                    }}
                  >
                    {m.label}
                  </div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 900, color: m.color }}>
                    {m.value}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'hsl(var(--muted-foreground))' }}>
                    {m.sub}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Barra de progresso */}
          <Card className="glass" style={{ marginBottom: '1.5rem' }}>
            <CardContent style={{ padding: '1rem' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  marginBottom: '0.5rem',
                }}
              >
                <span>PROGRESSO DA CONCILIAÃ‡ÃƒO</span>
                <span
                  style={{
                    color:
                      Number(matchRate) >= 80
                        ? 'hsl(var(--success))'
                        : Number(matchRate) >= 50
                          ? 'hsl(var(--warning))'
                          : 'hsl(var(--destructive))',
                  }}
                >
                  {matchRate}%
                </span>
              </div>
              <div
                style={{
                  height: '8px',
                  background: 'hsl(var(--surface-hover))',
                  borderRadius: '999px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${matchRate}%`,
                    background:
                      Number(matchRate) >= 80
                        ? 'hsl(var(--success))'
                        : Number(matchRate) >= 50
                          ? 'hsl(var(--warning))'
                          : 'hsl(var(--destructive))',
                    borderRadius: '999px',
                    transition: '0.5s',
                  }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Listagem */}
          <Card padding="none" style={{ overflow: 'hidden', marginTop: '1.5rem' }}>
            <CardHeader
              style={{ padding: '1rem 1.5rem', borderBottom: '1px solid hsl(var(--border))' }}
            >
              <CardTitle style={{ fontSize: '0.9rem', fontWeight: 700 }}>
                TRANSAÃ‡Ã•ES DO EXTRATO OFX
              </CardTitle>
            </CardHeader>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'hsl(var(--surface-hover))' }}>
                    {[
                      'DATA',
                      'DESCRIÃ‡ÃƒO',
                      'TIPO',
                      'VALOR',
                      'STATUS',
                      'CORRESPONDÃŠNCIA',
                      'AÃ‡Ã•ES',
                    ].map((h) => (
                      <th
                        key={h}
                        style={{
                          padding: '0.75rem 1rem',
                          textAlign: 'left',
                          fontSize: '0.7rem',
                          fontWeight: 800,
                          color: 'hsl(var(--muted-foreground))',
                          textTransform: 'uppercase',
                          borderBottom: '1px solid hsl(var(--border))',
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ofxTxns.map((txn, _i) => (
                    <React.Fragment key={txn.id}>
                      <tr
                        style={{
                          background:
                            txn.status === 'matched'
                              ? 'rgba(34,197,94,0.04)'
                              : txn.status === 'manual'
                                ? 'rgba(59,130,246,0.04)'
                                : txn.status === 'ignored'
                                  ? 'rgba(0,0,0,0.1)'
                                  : 'transparent',
                          opacity: txn.status === 'ignored' ? 0.5 : 1,
                        }}
                      >
                        <td
                          style={{
                            padding: '0.75rem 1rem',
                            fontSize: '0.82rem',
                            fontFamily: 'monospace',
                          }}
                        >
                          {txn.date}
                        </td>
                        <td
                          style={{
                            padding: '0.75rem 1rem',
                            fontSize: '0.82rem',
                            maxWidth: '200px',
                          }}
                        >
                          <div
                            style={{
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                            title={txn.memo}
                          >
                            {txn.memo}
                          </div>
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <Badge variant={txn.type === 'CREDIT' ? 'success' : 'destructive'}>
                            {txn.type === 'CREDIT' ? 'ENTRADA' : 'SAÃDA'}
                          </Badge>
                        </td>
                        <td
                          style={{
                            padding: '0.75rem 1rem',
                            fontFamily: 'monospace',
                            fontWeight: 700,
                            color:
                              txn.type === 'CREDIT'
                                ? 'hsl(var(--success))'
                                : 'hsl(var(--destructive))',
                          }}
                        >
                          {txn.type === 'CREDIT' ? '+' : '-'} {fmt(txn.amount)}
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          {txn.status === 'matched' && (
                            <Badge variant="success" className="gap-1">
                              <CheckCircle className="w-3.5 h-3.5 inline mr-1" /> AUTO
                            </Badge>
                          )}
                          {txn.status === 'manual' && (
                            <Badge variant="default" className="gap-1">
                              <Link className="w-3.5 h-3.5 inline mr-1" /> MANUAL
                            </Badge>
                          )}
                          {txn.status === 'unmatched' && (
                            <Badge variant="warning" className="gap-1">
                              <AlertTriangle className="w-3.5 h-3.5 inline mr-1" /> PENDENTE
                            </Badge>
                          )}
                          {txn.status === 'ignored' && <Badge variant="secondary">IGNORADO</Badge>}
                        </td>
                        <td
                          style={{
                            padding: '0.75rem 1rem',
                            fontSize: '0.82rem',
                            color: 'hsl(var(--muted-foreground))',
                          }}
                        >
                          {txn.matchedTitulo || 'â€”'}
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <div style={{ display: 'flex', gap: '0.4rem' }}>
                            {txn.status === 'unmatched' && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    setManualMatch(manualMatch === txn.id ? null : txn.id)
                                  }
                                >
                                  <Link className="w-3.5 h-3.5 mr-1" /> Vincular
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => ignoreTransaction(txn.id)}
                                >
                                  <XCircle className="w-3.5 h-3.5 mr-1" /> Ignorar
                                </Button>
                              </>
                            )}
                            {(txn.status === 'matched' || txn.status === 'manual') && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:bg-destructive/10"
                                onClick={() =>
                                  setOfxTxns((prev) =>
                                    prev.map((t) =>
                                      t.id === txn.id
                                        ? {
                                            ...t,
                                            status: 'unmatched',
                                            matched: false,
                                            matchedTitulo: undefined,
                                          }
                                        : t,
                                    ),
                                  )
                                }
                              >
                                Desfazer
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Match Manual Expander */}
                      {manualMatch === txn.id && (
                        <tr>
                          <td
                            colSpan={7}
                            style={{
                              padding: '0.75rem 1.5rem',
                              background: 'rgba(59,130,246,0.06)',
                              borderBottom: '2px solid rgba(59,130,246,0.2)',
                            }}
                          >
                            <div
                              style={{
                                fontSize: '0.8rem',
                                fontWeight: 700,
                                marginBottom: '0.75rem',
                                color: 'hsl(var(--primary))',
                              }}
                            >
                              VINCULAR MANUALMENTE: {txn.memo} ({fmt(txn.amount)})
                            </div>
                            <div
                              style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                                gap: '0.5rem',
                                maxHeight: '200px',
                                overflowY: 'auto',
                              }}
                            >
                              {internals
                                .filter((e) =>
                                  txn.type === 'CREDIT' ? e.tipo === 'receber' : e.tipo === 'pagar',
                                )
                                .map((entry) => (
                                  <button
                                    key={entry.id}
                                    onClick={() => doManualMatch(txn.id, entry.id)}
                                    style={{
                                      padding: '0.6rem 0.75rem',
                                      border: '1px solid hsl(var(--border))',
                                      borderRadius: '8px',
                                      background: 'hsl(var(--surface-hover))',
                                      cursor: 'pointer',
                                      textAlign: 'left',
                                      fontSize: '0.78rem',
                                      transition: '0.15s',
                                    }}
                                  >
                                    <div style={{ fontWeight: 700 }}>{entry.numero}</div>
                                    <div
                                      style={{
                                        color: 'hsl(var(--muted-foreground))',
                                        fontSize: '0.72rem',
                                      }}
                                    >
                                      {fmt(entry.valor)} â€¢ {entry.data}
                                    </div>
                                  </button>
                                ))}
                              {internals.filter((e) =>
                                txn.type === 'CREDIT' ? e.tipo === 'receber' : e.tipo === 'pagar',
                              ).length === 0 && (
                                <span
                                  style={{
                                    color: 'hsl(var(--muted-foreground))',
                                    fontSize: '0.82rem',
                                  }}
                                >
                                  Nenhum tÃ­tulo compatÃ­vel disponÃ­vel
                                </span>
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
          </Card>
        </>
      )}
    </div>
  );
}
