import React, { useState } from 'react';
import { api } from '../lib/api';

export default function FinanceiroTitulosReceberWizard() {
  const [step, setStep] = useState(1);
  const [clienteId, setClienteId] = useState('');
  const [valorTotal, setValorTotal] = useState('0');
  const [condicaoId, setCondicaoId] = useState('');
  const [dataEmissao, setDataEmissao] = useState(new Date().toISOString().slice(0,10));
  const [vencimento, setVencimento] = useState(new Date().toISOString().slice(0,10));

  const next = () => setStep((s) => Math.min(4, s+1));
  const prev = () => setStep((s) => Math.max(1, s-1));

  const submit = async () => {
    const payload = {
      cliente_id: clienteId,
      valor_original: Number(valorTotal),
      condicao_pagamento_id: condicaoId || undefined,
      data_emissao: dataEmissao,
      data_vencimento: vencimento,
      classe_financeira_id: null,
      forma_recebimento_id: null,
    };
    await api.financeiro.titulosReceber.create(payload);
    alert('Títulos gerados com sucesso');
    window.location.hash = '#/financeiro/titulos-receber';
  };

  const [preview, setPreview] = useState<any[]>([]);
  const doPreview = async () => {
    try {
      const res = await fetch('/api/financeiro/titulos-receber/preview', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ condicao_pagamento_id: condicaoId, valor_original: Number(valorTotal), data_emissao: dataEmissao, data_vencimento: vencimento }) });
      const json = await res.json();
      setPreview(json.parcelas || []);
    } catch (e) { console.error(e); }
  };

  return (
    <div style={{ padding: 16 }}>
      <h2>Wizard - Gerar Títulos a Receber</h2>
      <div style={{ marginBottom: 12 }}>Passo {step} de 4</div>

      {step === 1 && (
        <div>
          <label>Cliente ID</label>
          <input value={clienteId} onChange={e => setClienteId(e.target.value)} />
          <div style={{ marginTop: 8 }}><button onClick={next}>Próximo</button></div>
        </div>
      )}

      {step === 2 && (
        <div>
          <label>Valor Total</label>
          <input value={valorTotal} onChange={e => setValorTotal(e.target.value)} />
          <div style={{ marginTop: 8 }}><button onClick={prev}>Voltar</button> <button onClick={next}>Próximo</button></div>
        </div>
      )}

      {step === 3 && (
        <div>
          <label>Condição de Pagamento ID (opcional)</label>
          <input value={condicaoId} onChange={e => setCondicaoId(e.target.value)} />
          <div style={{ marginTop: 8 }}><button onClick={prev}>Voltar</button> <button onClick={next}>Próximo</button></div>
        </div>
      )}

      {step === 4 && (
        <div>
          <label>Data Emissão</label>
          <input type="date" value={dataEmissao} onChange={e => setDataEmissao(e.target.value)} />
          <label>Data Vencimento</label>
          <input type="date" value={vencimento} onChange={e => setVencimento(e.target.value)} />
          <div style={{ marginTop: 8 }}>
            <button onClick={prev}>Voltar</button>
            <button onClick={doPreview} style={{ marginLeft: 8 }}>Preview</button>
            <button onClick={submit} style={{ marginLeft: 8 }}>Gerar</button>
          </div>
          {preview.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <h4>Preview de Parcelas</h4>
              <table>
                <thead><tr><th>Parcela</th><th>Valor</th><th>Vencimento</th></tr></thead>
                <tbody>
                  {preview.map((p,i) => (
                    <tr key={i}><td>{p.parcela}</td><td>{Number(p.valor).toFixed(2)}</td><td>{new Date(p.vencimento).toLocaleDateString()}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
