import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { 
  FiArrowLeft, 
  FiCheck, 
  FiArrowRight,
  FiLoader,
  FiInfo,
  FiAlertCircle
} from 'react-icons/fi';

const MEIOS_COM_TAXA = ['boleto', 'cartao_credito', 'cheque', 'cartao_debito'];

export default function FinanceiroTitulosReceberWizard() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [preview, setPreview] = useState<any[]>([]);
  const [formasRecebimento, setFormasRecebimento] = useState<any[]>([]);
  const [taxaFinanceira, setTaxaFinanceira] = useState(0);
  const [totalParcelas, setTotalParcelas] = useState(1);

  const [formData, setFormData] = useState({
    cliente_id: '',
    classe_financeira_id: '',
    valor_base: 0,
    data_base: new Date().toISOString().split('T')[0],
    condicao_pagamento_id: '',
    forma_recebimento_id: '',
    numero_titulo: `REC-${Date.now().toString().slice(-6)}`,
    descricao: ''
  });

  const valorComTaxa = formData.valor_base * (1 + taxaFinanceira / 100);
  const formaSelecionada = formasRecebimento.find(f => f.id === formData.forma_recebimento_id);
  const exibeTaxa = formaSelecionada && MEIOS_COM_TAXA.includes(formaSelecionada.tipo);

  useEffect(() => {
    const loadOpts = async () => {
      try {
        const [cls, cf, fr] = await Promise.all([
          api.clients.list(),
          api.financeiro.classesFinanceiras.list(),
          api.financeiro.formasPagamento.list(),
        ]);
        setClients(cls || []);
        setClasses(cf || []);
        setFormasRecebimento(fr || []);

        if (fr && fr.length > 0) setFormData(prev => ({ ...prev, forma_recebimento_id: fr[0].id }));
      } catch (err) {
        console.error('[WIZARD RECEBER ERROR]', err);
      }
    };
    loadOpts();
  }, []);

  const handleNext = async () => {
    if (step === 2) {
      setLoading(true);
      try {
        const res = await api.financeiro.titulosReceber.preview({
          valor_original: valorComTaxa,
          total_parcelas: totalParcelas,
          data_vencimento: formData.data_base
        });
        setPreview(res.data?.parcelas || res.parcelas || []);
        setStep(3);
      } catch (err: any) {
        alert('Erro ao calcular parcelas. Verifique os dados preenchidos.');
      } finally {
        setLoading(false);
      }
    } else {
      setStep(step + 1);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await api.financeiro.titulosReceber.create({
        cliente_id: formData.cliente_id,
        classe_financeira_id: formData.classe_financeira_id,
        valor_original: valorComTaxa,
        total_parcelas: totalParcelas,
        data_vencimento: formData.data_base,
        forma_recebimento_id: formData.forma_recebimento_id,
        numero_titulo: formData.numero_titulo,
        observacoes: formData.descricao || null,
      });
      alert('Títulos gerados com sucesso!');
      window.location.hash = '#/financeiro/titulos-receber';
    } catch (err: any) {
      alert('Erro ao salvar títulos: ' + (err.message || ''));
    } finally {
      setLoading(false);
    }
  };

  // ─── PASSO 1: Identificação ───────────────────────────────────────────────
  const renderStep1 = () => (
    <div className="animate-fade-in">
      <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem' }}>Identificação</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div>
          <label className="label-base">Cliente / Origem</label>
          <select className="input-base" value={formData.cliente_id}
            onChange={e => setFormData({ ...formData, cliente_id: e.target.value })}>
            <option value="">Selecione um cliente...</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.nome || c.name || c.razao_social}</option>)}
          </select>
        </div>
        <div>
          <label className="label-base">Classe Financeira</label>
          <select className="input-base" value={formData.classe_financeira_id}
            onChange={e => setFormData({ ...formData, classe_financeira_id: e.target.value })}>
            <option value="">Selecione uma categoria...</option>
            {classes.filter(c => c.tipo.toLowerCase() === 'receita' && c.permite_lancamento)
              .map(c => <option key={c.id} value={c.id}>{c.codigo} - {c.nome}</option>)}
          </select>
        </div>
        <div>
          <label className="label-base" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            Número do Documento / Título
            <FiInfo title="Gerado automaticamente. Pode editar para o número da NF." />
          </label>
          <input type="text" className="input-base" value={formData.numero_titulo}
            onChange={e => setFormData({ ...formData, numero_titulo: e.target.value })}
            placeholder="Ex: NF-12345" />
        </div>
      </div>
    </div>
  );

  // ─── PASSO 2: Valores + Forma + Parcelas ──────────────────────────────────
  const renderStep2 = () => (
    <div className="animate-fade-in">
      <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem' }}>Valores e Recebimento</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

        {/* Valor base */}
        <div>
          <label className="label-base">Valor a Receber (sem taxas)</label>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>R$</span>
            <input type="number" className="input-base" style={{ paddingLeft: '2.5rem' }}
              value={formData.valor_base}
              onChange={e => setFormData({ ...formData, valor_base: Number(e.target.value) })} />
          </div>
        </div>

        {/* Forma de Recebimento */}
        <div>
          <label className="label-base">Forma de Recebimento</label>
          <select className="input-base" value={formData.forma_recebimento_id}
            onChange={e => { setFormData({ ...formData, forma_recebimento_id: e.target.value }); setTaxaFinanceira(0); }}>
            <option value="">Selecione a forma...</option>
            {formasRecebimento.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
          </select>
        </div>

        {/* Taxa Financeira – condicional */}
        {exibeTaxa && (
          <div className="animate-fade-in" style={{ padding: '1rem', border: '1px solid var(--warning, #f59e0b)', borderRadius: 'var(--radius-md)', background: 'rgba(245,158,11,0.08)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: 'var(--warning, #f59e0b)', fontWeight: 700, fontSize: '0.9rem' }}>
              <FiAlertCircle /> Custo Financeiro ({formaSelecionada?.nome})
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', alignItems: 'end' }}>
              <div>
                <label className="label-base">Taxa %</label>
                <div style={{ position: 'relative' }}>
                  <input type="number" className="input-base" min={0} max={100} step={0.01}
                    value={taxaFinanceira}
                    onChange={e => setTaxaFinanceira(Number(e.target.value))}
                    style={{ paddingRight: '2.5rem' }} />
                  <span style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>%</span>
                </div>
              </div>
              <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', background: 'var(--surface)', textAlign: 'right' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Valor Total com Taxa</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--primary)' }}>
                  R$ {valorComTaxa.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Parcelas Manual */}
        <div>
          <label className="label-base">Quantidade de Parcelas</label>
          <input type="number" className="input-base" min={1} max={60}
            value={totalParcelas}
            onChange={e => setTotalParcelas(Number(e.target.value))} />
        </div>

        {/* Data + Observação */}
        <div>
          <label className="label-base">Data Base de Vencimento</label>
          <input type="date" className="input-base" value={formData.data_base}
            onChange={e => setFormData({ ...formData, data_base: e.target.value })} />
        </div>
        <div>
          <label className="label-base">Descrição / Observação</label>
          <textarea className="input-base" rows={2} value={formData.descricao}
            onChange={e => setFormData({ ...formData, descricao: e.target.value })}
            style={{ textTransform: 'none' }} />
        </div>
      </div>
    </div>
  );

  // ─── PASSO 3: Confirmação ─────────────────────────────────────────────────
  const renderStep3 = () => (
    <div className="animate-fade-in">
      <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem' }}>Confirmar Parcelamento</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {preview.map((p, i) => (
          <div key={i} className="card" style={{ padding: '1rem', background: 'var(--surface-hover)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: '4px solid var(--primary)' }}>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '0.2rem' }}>PARCELA {p.numero_parcela}</div>
              <div style={{ fontWeight: 600 }}>{new Date(p.data_vencimento).toLocaleDateString('pt-BR')}</div>
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>
              R$ {Number(p.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </div>
        ))}
        <div style={{ marginTop: '1.5rem', padding: '1rem', borderTop: '2px dashed var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface-hover)', borderRadius: 'var(--radius-md)' }}>
          <div>
            <div style={{ fontWeight: 700 }}>TOTAL A RECEBER</div>
            {taxaFinanceira > 0 && (
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Inclui {taxaFinanceira}% de custo financeiro
              </div>
            )}
          </div>
          <span style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--primary)' }}>
            R$ {valorComTaxa.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <button className="btn btn-outline" style={{ marginBottom: '2rem' }}
        onClick={() => window.location.hash = '#/financeiro/titulos-receber'}>
        <FiArrowLeft /> VOLTAR PARA LISTAGEM
      </button>

      <div className="card glass animate-pop-in" style={{ padding: '2.5rem' }}>
        {/* Stepper – 3 passos */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3rem', position: 'relative' }}>
          <div style={{ position: 'absolute', top: '15px', left: 0, right: 0, height: '2px', background: 'var(--border)', zIndex: 0 }} />
          {[1, 2, 3].map(s => (
            <div key={s} style={{ zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{
                width: '32px', height: '32px', borderRadius: '50%',
                background: step >= s ? 'var(--primary)' : 'var(--surface)',
                color: step >= s ? 'var(--primary-text)' : 'var(--text-muted)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 800, border: '2px solid',
                borderColor: step >= s ? 'var(--primary)' : 'var(--border)'
              }}>
                {step > s ? <FiCheck /> : s}
              </div>
            </div>
          ))}
        </div>

        {/* Conteúdo */}
        <div style={{ minHeight: '320px' }}>
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
        </div>

        {/* Botões */}
        <div style={{ marginTop: '2.5rem', display: 'flex', gap: '1rem', justifyContent: 'space-between' }}>
          <button className="btn btn-outline" disabled={step === 1 || loading}
            onClick={() => setStep(step - 1)}>ANTERIOR</button>

          {step < 3 ? (
            <button className="btn btn-primary"
              disabled={loading || !formData.cliente_id || !formData.classe_financeira_id}
              onClick={handleNext}>
              {loading ? <FiLoader className="animate-spin" /> : <>PRÓXIMO <FiArrowRight /></>}
            </button>
          ) : (
            <button className="btn btn-primary" style={{ background: 'var(--success)' }}
              disabled={loading} onClick={handleSave}>
              {loading ? <FiLoader className="animate-spin" /> : 'CONFIRMAR E GERAR TÍTULOS'}
            </button>
          )}
        </div>
      </div>

      <style>{`
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .animate-fade-in { animation: fadeIn 0.2s ease; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
      `}</style>
    </div>
  );
}
