import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { 
  FiArrowLeft, 
  FiCheck, 
  FiUser, 
  FiCalendar, 
  FiDollarSign, 
  FiCreditCard,
  FiArrowRight,
  FiLoader,
  FiInfo
} from 'react-icons/fi';

export default function FinanceiroTitulosReceberWizard() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [condicoes, setCondicoes] = useState<any[]>([]);
  const [preview, setPreview] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    cliente_id: '',
    classe_financeira_id: '',
    valor_total: 0,
    data_base: new Date().toISOString().split('T')[0],
    condicao_pagamento_id: '',
    numero_titulo: `REC-${Date.now().toString().slice(-6)}`,
    descricao: ''
  });

  useEffect(() => {
    const loadOpts = async () => {
      try {
        console.log('[WIZARD] Carregando opções de recebimento...');
        const cls = await api.clients.list();
        console.log('[WIZARD] Clientes carregados:', cls?.length);
        setClients(cls || []);

        const cf = await api.financeiro.classesFinanceiras.list();
        console.log('[WIZARD] Classes financeiras carregadas:', cf?.length);
        setClasses(cf || []);

        const cp = await api.financeiro.condicoesPagamento.list();
        console.log('[WIZARD] Condições carregadas:', cp?.length);
        setCondicoes(cp || []);

        // Auto-selecionar 'À Vista' se existir
        const aVista = cp.find((c: any) => c.nome.toLowerCase().includes('vista'));
        if (aVista) {
          setFormData(prev => ({ ...prev, condicao_pagamento_id: aVista.id }));
        }
      } catch (err) {
        console.error('[WIZARD ERROR] Erro crítico ao carregar opções:', err);
      }
    };
    loadOpts();
  }, []);

  const handleNext = async () => {
    if (step === 3) {
      setLoading(true);
      try {
        const res = await api.financeiro.titulosReceber.preview({
          valor_original: formData.valor_total,
          condicao_pagamento_id: formData.condicao_pagamento_id,
          data_vencimento: formData.data_base
        });
        setPreview(res.data?.parcelas || res.parcelas || []);
        setStep(4);
      } catch (err: any) {
        alert('Erro ao calcular parcelas');
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
        ...formData,
        parcelas: preview
      });
      alert('Títulos gerados com sucesso!');
      window.location.hash = '#/financeiro/titulos-receber';
    } catch (err: any) {
      alert('Erro ao salvar títulos');
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <div className="animate-fade-in">
      <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem' }}>Identificação</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div>
          <label className="label-base">Cliente / Origem</label>
          <select 
            className="input-base" 
            value={formData.cliente_id}
            onChange={e => setFormData({...formData, cliente_id: e.target.value})}
          >
            <option value="">Selecione um cliente...</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.nome || c.name || c.razao_social}</option>)}
          </select>
        </div>
        <div>
          <label className="label-base">Classe Financeira</label>
          <select 
            className="input-base"
            value={formData.classe_financeira_id}
            onChange={e => setFormData({...formData, classe_financeira_id: e.target.value})}
          >
            <option value="">Selecione uma categoria...</option>
            {classes
              .filter(c => c.tipo.toLowerCase() === 'receita' && c.permite_lancamento)
              .map(c => (
                <option key={c.id} value={c.id}>{c.codigo} - {c.nome}</option>
              ))
            }
          </select>
          {classes.filter(c => c.tipo.toLowerCase() === 'receita').length === 0 && (
            <p style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: '0.25rem' }}>Nenhuma classe de receita carregada.</p>
          )}
        </div>
        <div>
          <label className="label-base" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            Número do Documento / Título
            <FiInfo title="Gerado automaticamente, mas você pode alterar para o número da Nota Fiscal ou Recibo." />
          </label>
          <input 
            type="text" 
            className="input-base" 
            value={formData.numero_titulo}
            onChange={e => setFormData({...formData, numero_titulo: e.target.value})}
            placeholder="Ex: NF-12345"
          />
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="animate-fade-in">
      <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem' }}>Valores e Datas</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div>
          <label className="label-base">Valor Total do Recebimento</label>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>R$</span>
            <input 
              type="number" 
              className="input-base" 
              style={{ paddingLeft: '2.5rem' }}
              value={formData.valor_total}
              onChange={e => setFormData({...formData, valor_total: Number(e.target.value)})}
            />
          </div>
        </div>
        <div>
          <label className="label-base">Data Base de Vencimento</label>
          <input 
            type="date" 
            className="input-base"
            value={formData.data_base}
            onChange={e => setFormData({...formData, data_base: e.target.value})}
          />
        </div>
        <div>
          <label className="label-base">Descrição / Observação</label>
          <textarea 
            className="input-base" 
            rows={3}
            value={formData.descricao}
            onChange={e => setFormData({...formData, descricao: e.target.value})}
            style={{ textTransform: 'none' }}
          />
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="animate-fade-in">
      <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem' }}>Condição de Pagamento</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
        {condicoes.map(c => (
          <div 
            key={c.id} 
            className="card"
            style={{ 
              cursor: 'pointer', 
              borderColor: formData.condicao_pagamento_id === c.id ? 'var(--primary)' : 'var(--border)',
              background: formData.condicao_pagamento_id === c.id ? 'var(--input-bg-focus)' : 'var(--surface)',
              transition: 'all 0.2s ease'
            }}
            onClick={() => setFormData({...formData, condicao_pagamento_id: c.id})}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '1rem', color: formData.condicao_pagamento_id === c.id ? 'var(--primary)' : 'var(--text)' }}>{c.nome}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{c.descricao}</div>
              </div>
              {formData.condicao_pagamento_id === c.id && <FiCheck style={{ color: 'var(--primary)' }} />}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="animate-fade-in">
      <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem' }}>Confirmar Parcelamento</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {preview.map((p, i) => (
          <div key={i} className="card" style={{ padding: '1rem', background: 'var(--surface-hover)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '0.2rem' }}>PARCELA {p.numero_parcela}</div>
              <div style={{ fontWeight: 600 }}>{new Date(p.data_vencimento).toLocaleDateString()}</div>
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>R$ {p.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
          </div>
        ))}
        <div style={{ marginTop: '1.5rem', padding: '1rem', borderTop: '2px dashed var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 700 }}>TOTAL</span>
          <span style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--primary)' }}>
            R$ {formData.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <button 
        className="btn btn-outline" 
        style={{ marginBottom: '2rem' }}
        onClick={() => window.location.hash = '#/financeiro/titulos-receber'}
      >
        <FiArrowLeft /> VOLTAR PARA LISTAGEM
      </button>

      <div className="card glass animate-pop-in" style={{ padding: '2.5rem' }}>
        {/* Stepper */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3rem', position: 'relative' }}>
          <div style={{ position: 'absolute', top: '15px', left: 0, right: 0, height: '2px', background: 'var(--border)', zIndex: 0 }} />
          {[1, 2, 3, 4].map(s => (
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

        {/* Form Content */}
        <div style={{ minHeight: '300px' }}>
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
          {step === 4 && renderStep4()}
        </div>

        {/* Actions */}
        <div style={{ marginTop: '2.5rem', display: 'flex', gap: '1rem', justifyContent: 'space-between' }}>
          <button 
            className="btn btn-outline" 
            disabled={step === 1 || loading}
            onClick={() => setStep(step - 1)}
          >
            ANTERIOR
          </button>
          
          {step < 4 ? (
            <button 
              className="btn btn-primary" 
              disabled={loading || !formData.cliente_id || !formData.classe_financeira_id}
              onClick={handleNext}
            >
              {loading ? <FiLoader className="animate-spin" /> : <>PRÓXIMO <FiArrowRight /></>}
            </button>
          ) : (
            <button 
              className="btn btn-primary" 
              style={{ background: 'var(--success)' }}
              disabled={loading}
              onClick={handleSave}
            >
              {loading ? <FiLoader className="animate-spin" /> : 'CONFIRMAR E GERAR TÍTULOS'}
            </button>
          )}
        </div>
      </div>

      <style>{`
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
