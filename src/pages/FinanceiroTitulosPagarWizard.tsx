import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { 
  FiTruck, 
  FiDollarSign, 
  FiCalendar, 
  FiCreditCard, 
  FiCheckCircle, 
  FiChevronRight, 
  FiChevronLeft,
  FiArrowLeft,
  FiBriefcase
} from 'react-icons/fi';

export default function FinanceiroTitulosPagarWizard() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // Data
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [condicoes, setCondicoes] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);

  // Form
  const [fornecedorId, setFornecedorId] = useState('');
  const [valorTotal, setValorTotal] = useState('');
  const [condicaoId, setCondicaoId] = useState('');
  const [classeId, setClasseId] = useState('');
  const [dataEmissao, setDataEmissao] = useState(new Date().toISOString().slice(0,10));
  const [vencimento, setVencimento] = useState(new Date().toISOString().slice(0,10));
  const [numeroDoc, setNumeroDoc] = useState('');
  
  const [preview, setPreview] = useState<any[]>([]);

  useEffect(() => {
    const loadBasics = async () => {
      try {
        const [sup, cnd, fin] = await Promise.all([
          api.suppliers.list(),
          api.financeiro.condicoesPagamento.list(),
          api.financeiro.classes.list()
        ]);
        setSuppliers(sup || []);
        setCondicoes(cnd || []);
        // Filtrar apenas classes de DESPESA ou CUSTO (natureza = 'despesa')
        setClasses((fin || []).filter((c: any) => c.natureza === 'despesa'));
      } catch (e) {
        console.error('Erro ao carregar dados básicos', e);
      }
    };
    loadBasics();
  }, []);

  const next = () => setStep((s) => Math.min(4, s + 1));
  const prev = () => setStep((s) => Math.max(1, s - 1));

  const doPreview = async () => {
    if (!valorTotal || !condicaoId) return;
    setLoading(true);
    try {
      const res = await api.apiCall<any>('financeiro/titulos-pagar/preview', 'POST', {
        condicao_pagamento_id: condicaoId,
        valor_original: Number(valorTotal),
        data_vencimento: vencimento
      });
      setPreview(res.parcelas || []);
    } catch (e) {
      console.error(e);
      alert('Erro ao gerar preview');
    } finally {
      setLoading(false);
    }
  };

  const submit = async () => {
    setLoading(true);
    try {
      const payload = {
        fornecedor_id: fornecedorId,
        valor_original: Number(valorTotal),
        condicao_pagamento_id: condicaoId,
        classe_financeira_id: classeId,
        data_emissao: dataEmissao,
        data_vencimento: vencimento,
        numero_titulo: numeroDoc || `PAG-${Date.now().toString().slice(-6)}`,
        status: 'pendente'
      };
      await api.financeiro.titulosPagar.create(payload);
      window.location.hash = '#/financeiro/titulos-pagar';
    } catch (e: any) {
      alert(e.message || 'Erro ao gerar títulos');
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { n: 1, title: 'Fornecedor', icon: FiTruck },
    { n: 2, title: 'Valores', icon: FiDollarSign },
    { n: 3, title: 'Condições', icon: FiCreditCard },
    { n: 4, title: 'Revisão', icon: FiCheckCircle },
  ];

  return (
    <div className="min-h-screen bg-[#0D1117] text-white p-6">
      <button 
        onClick={() => window.location.hash = '#/financeiro/titulos-pagar'}
        className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8"
      >
        <FiArrowLeft /> Voltar para Listagem
      </button>

      <div className="max-w-3xl mx-auto">
        <header className="text-center mb-12">
          <h1 className="text-4xl font-black tracking-tight mb-2">Novo Pagamento</h1>
          <p className="text-gray-400">Lance suas obrigações financeiras e gere parcelas automaticamente</p>
        </header>

        <div className="flex justify-between mb-12 relative">
          <div className="absolute top-1/2 left-0 w-full h-0.5 bg-white/5 -translate-y-1/2 z-0" />
          {steps.map((s) => (
            <div key={s.n} className="relative z-10 flex flex-col items-center">
              <div 
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
                  step >= s.n ? 'bg-[#EF4444] text-white shadow-[0_0_20px_rgba(239,68,68,0.3)]' : 'bg-[#161B22] text-gray-500 border border-white/5'
                }`}
              >
                <s.icon className="text-xl" />
              </div>
              <span className={`mt-2 text-xs font-bold uppercase tracking-wider ${step >= s.n ? 'text-[#EF4444]' : 'text-gray-500'}`}>
                {s.title}
              </span>
            </div>
          ))}
        </div>

        <div className="bg-[#161B22] border border-white/5 rounded-3xl p-8 shadow-2xl backdrop-blur-xl">
          {step === 1 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <FiTruck className="text-[#EF4444]" /> Selecione o Fornecedor
              </h3>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Fornecedor</label>
                <select 
                  value={fornecedorId} 
                  onChange={e => setFornecedorId(e.target.value)}
                  className="w-full bg-[#0D1117] border border-white/10 rounded-xl px-4 py-4 text-white focus:ring-2 focus:ring-[#EF4444] outline-none transition-all"
                >
                  <option value="">Selecione um fornecedor...</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.nome || s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Categoria Financeira (Despesa)</label>
                <select 
                  value={classeId} 
                  onChange={e => setClasseId(e.target.value)}
                  className="w-full bg-[#0D1117] border border-white/10 rounded-xl px-4 py-4 text-white focus:ring-2 focus:ring-[#EF4444] outline-none transition-all"
                >
                  <option value="">Selecione uma categoria...</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.codigo} - {c.nome}</option>)}
                </select>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <FiDollarSign className="text-[#EF4444]" /> Detalhes do Valor
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm text-gray-400 mb-2">Valor Total da Fatura</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">R$</span>
                    <input 
                      type="number"
                      value={valorTotal} 
                      onChange={e => setValorTotal(e.target.value)}
                      placeholder="0,00"
                      className="w-full bg-[#0D1117] border border-white/10 rounded-xl pl-12 pr-4 py-4 text-white text-2xl font-bold focus:ring-2 focus:ring-[#EF4444] outline-none transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Data de Emissão</label>
                  <input 
                    type="date" 
                    value={dataEmissao} 
                    onChange={e => setDataEmissao(e.target.value)}
                    className="w-full bg-[#0D1117] border border-white/10 rounded-xl px-4 py-4 text-white focus:ring-2 focus:ring-[#EF4444] outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Número da NF / Referência</label>
                  <input 
                    type="text" 
                    value={numeroDoc}
                    onChange={e => setNumeroDoc(e.target.value)}
                    placeholder="Ex: NF-12345"
                    className="w-full bg-[#0D1117] border border-white/10 rounded-xl px-4 py-4 text-white focus:ring-2 focus:ring-[#EF4444] outline-none transition-all"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <FiCreditCard className="text-[#EF4444]" /> Condição de Pagamento
              </h3>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Vezes / Intervalo</label>
                <select 
                  value={condicaoId} 
                  onChange={e => setCondicaoId(e.target.value)}
                  className="w-full bg-[#0D1117] border border-white/10 rounded-xl px-4 py-4 text-white focus:ring-2 focus:ring-[#EF4444] outline-none transition-all"
                >
                  <option value="">Selecione a condição...</option>
                  {condicoes.map(c => <option key={c.id} value={c.id}>{c.nome} ({c.parcelas}x)</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Vencimento da 1ª Parcela</label>
                <input 
                  type="date" 
                  value={vencimento} 
                  onChange={e => setVencimento(e.target.value)}
                  className="w-full bg-[#0D1117] border border-white/10 rounded-xl px-4 py-4 text-white focus:ring-2 focus:ring-[#EF4444] outline-none transition-all"
                />
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <FiCheckCircle className="text-green-500" /> Revisão do Lançamento
              </h3>
              
              <div className="bg-[#0D1117] rounded-2xl p-6 border border-white/5 space-y-4 shadow-inner">
                <div className="flex justify-between border-b border-white/5 pb-2">
                    <span className="text-gray-400">Fornecedor:</span>
                    <span className="font-bold">{suppliers.find(s => s.id === fornecedorId)?.nome || '---'}</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-2">
                    <span className="text-gray-400">Valor Total:</span>
                    <span className="font-bold text-[#F87171]">R$ {Number(valorTotal).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-gray-400">Categoria:</span>
                    <span className="font-bold">{classes.find(c => c.id === classeId)?.nome || '---'}</span>
                </div>
              </div>

              {!preview.length && (
                <button 
                  onClick={doPreview}
                  disabled={!condicaoId || loading}
                  className="w-full py-4 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold transition-all border border-white/5"
                >
                  {loading ? 'CALCULANDO...' : 'VERIFICAR PARCELAS'}
                </button>
              )}

              {preview.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-gray-500 uppercase tracking-widest">Cronograma de Saída</h4>
                  <div className="max-h-48 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                    {preview.map((p, i) => (
                      <div key={i} className="flex justify-between items-center bg-white/[0.02] p-4 rounded-xl border border-white/5">
                        <div className="flex items-center gap-3">
                          <span className="w-8 h-8 rounded-full bg-red-500/20 text-red-500 flex items-center justify-center text-[10px] font-black">{p.parcela}</span>
                          <span className="text-sm font-medium">{new Date(p.vencimento).toLocaleDateString()}</span>
                        </div>
                        <span className="font-bold text-sm text-gray-200">R$ {Number(p.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Navegação */}
          <div className="mt-12 flex justify-between gap-4">
            {step > 1 ? (
              <button 
                onClick={prev}
                className="flex items-center gap-2 px-8 py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-bold transition-all"
              >
                <FiChevronLeft /> VOLTAR
              </button>
            ) : <div />}
            
            {step < 4 ? (
              <button 
                onClick={next}
                disabled={(step === 1 && !fornecedorId) || (step === 2 && !valorTotal)}
                className="flex items-center gap-2 px-8 py-4 bg-[#EF4444] hover:bg-[#FF5555] text-white rounded-2xl font-bold transition-all shadow-lg hover:shadow-[#EF4444]/30 disabled:opacity-20 ml-auto"
              >
                PRÓXIMO <FiChevronRight />
              </button>
            ) : (
              <button 
                onClick={submit}
                disabled={loading}
                className="flex items-center gap-2 px-12 py-4 bg-[#EF4444] hover:bg-red-500 text-white rounded-2xl font-extrabold transition-all shadow-lg hover:shadow-[#EF4444]/40 disabled:opacity-20 ml-auto"
              >
                {loading ? 'PROCESSANDO...' : 'CONFIRMAR E GERAR PAGAMENTOS'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
