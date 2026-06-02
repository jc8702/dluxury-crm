import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { ArrowLeft, Check, ArrowRight, Loader, Info, AlertCircle } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { Button, Input } from '../components/common';

const _MEIOS_COM_TAXA = ['boleto', 'cartao_credito', 'cheque', 'cartao_debito'];

export default function FinanceiroTitulosReceberWizard() {
  const { success, error } = useToast();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [preview, setPreview] = useState<any[]>([]);
  const [formasRecebimento, setFormasRecebimento] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [taxaFinanceira, setTaxaFinanceira] = useState(0);
  const [totalParcelas, setTotalParcelas] = useState(1);

  const normalizeList = (value: any) => (Array.isArray(value) ? value : value?.data || []);

  const [formData, setFormData] = useState({
    cliente_id: '',
    classe_financeira_id: '',
    valor_base: 0,
    data_base: new Date().toISOString().split('T')[0],
    condicao_pagamento_id: '',
    forma_recebimento_id: '',
    numero_titulo: `REC-${Date.now().toString().slice(-6)}`,
    descricao: '',
    recorrencia_meses: 1,
    showRateio: false,
    rateios: [] as any[],
  });

  const valorCustoFinanceiro = formData.valor_base * (taxaFinanceira / 100);
  const valorComTaxa = formData.valor_base + valorCustoFinanceiro;

  const _formaSelecionada = formasRecebimento.find((f) => f.id === formData.forma_recebimento_id);
  // exibeTaxa removido para ser sempre visÃ­vel como solicitado

  useEffect(() => {
    const loadOpts = async () => {
      try {
        const [cls, cf, fr, prj] = await Promise.all([
          api.clients.list(),
          api.financeiro.classesFinanceiras.list(),
          api.financeiro.formasPagamento.list(),
          api.projects.list(),
        ]);
        setClients(normalizeList(cls));
        setClasses(normalizeList(cf));
        setFormasRecebimento(normalizeList(fr));
        setProjects(normalizeList(prj));

        const formasList = normalizeList(fr);
        if (formasList.length > 0)
          setFormData((prev) => ({ ...prev, forma_recebimento_id: formasList[0].id }));
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
          data_vencimento: formData.data_base,
        });
        setPreview(res.data?.parcelas || res.parcelas || []);
        setStep(3);
      } catch (_err: any) {
        error('Erro ao calcular parcelas. Verifique os dados preenchidos.');
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
        recorrencia_meses: formData.recorrencia_meses || 1,
        data_vencimento: formData.data_base,
        forma_recebimento_id: formData.forma_recebimento_id,
        numero_titulo: formData.numero_titulo,
        observacoes: formData.descricao || null,
        taxa_financeira: taxaFinanceira,
        valor_custo_financeiro: valorCustoFinanceiro,
        rateio: formData.showRateio ? formData.rateios : [],
      });
      success('TÃ­tulos gerados com sucesso!');
      window.location.hash = '#/financeiro/titulos-receber';
    } catch (err: any) {
      error('Erro ao salvar tÃ­tulos: ' + (err.message || ''));
    } finally {
      setLoading(false);
    }
  };

  // â”€â”€â”€ PASSO 1: IdentificaÃ§Ã£o â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const renderStep1 = () => (
    <div className="animate-fade-in space-y-6">
      <h3 className="text-xl font-bold text-white uppercase tracking-wider">IdentificaÃ§Ã£o</h3>
      <div className="flex flex-col gap-5">
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block ml-1">
            Cliente / Origem
          </label>
          <select
            className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary uppercase font-bold"
            value={formData.cliente_id}
            onChange={(e) => setFormData({ ...formData, cliente_id: e.target.value })}
          >
            <option value="">Selecione um cliente...</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {String(c.nome || c.name || c.razao_social).toUpperCase()}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block ml-1">
            Classe Financeira
          </label>
          <select
            className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary uppercase font-bold"
            value={formData.classe_financeira_id}
            onChange={(e) => setFormData({ ...formData, classe_financeira_id: e.target.value })}
          >
            <option value="">Selecione uma categoria...</option>
            {classes
              .filter((c) => c.tipo.toLowerCase() === 'receita' && c.permite_lancamento)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.codigo} - {c.nome.toUpperCase()}
                </option>
              ))}
          </select>
        </div>
        <Input
          label="NÃºmero do Documento / TÃ­tulo"
          value={formData.numero_titulo}
          onChange={(e) => setFormData({ ...formData, numero_titulo: e.target.value })}
          placeholder="Ex: NF-12345"
          helperText="Gerado automaticamente. Pode editar para o nÃºmero da NF."
        />
      </div>
    </div>
  );

  // â”€â”€â”€ PASSO 2: Valores + Forma + Parcelas â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const renderStep2 = () => (
    <div className="animate-fade-in space-y-6">
      <h3 className="text-xl font-bold text-white uppercase tracking-wider">
        Valores e Recebimento
      </h3>
      <div className="flex flex-col gap-5">
        {/* Valor base */}
        <Input
          type="number"
          label="Valor a Receber (sem taxas)"
          value={formData.valor_base}
          onChange={(e) => setFormData({ ...formData, valor_base: Number(e.target.value) })}
          placeholder="0.00"
        />

        {/* Forma de Recebimento */}
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block ml-1">
            Forma de Recebimento
          </label>
          <select
            className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary uppercase font-bold"
            value={formData.forma_recebimento_id}
            onChange={(e) => {
              setFormData({ ...formData, forma_recebimento_id: e.target.value });
              setTaxaFinanceira(0);
            }}
          >
            <option value="">Selecione a forma...</option>
            {formasRecebimento.map((f) => (
              <option key={f.id} value={f.id}>
                {f.nome.toUpperCase()}
              </option>
            ))}
          </select>
        </div>

        {/* Taxa Financeira â€“ Sempre disponÃ­vel para ajuste manual */}
        <div className="animate-fade-in p-4 border border-amber-500/30 rounded-xl bg-amber-500/5">
          <div className="flex items-center gap-2 mb-3 text-amber-400 font-black text-xs uppercase tracking-widest">
            <AlertCircle size={16} /> CUSTO FINANCEIRO / TAXAS (%)
          </div>
          <div className="grid grid-cols-2 gap-4 items-end">
            <Input
              type="number"
              label="Taxa (%)"
              min={0}
              max={100}
              step={0.01}
              value={taxaFinanceira}
              onChange={(e) => setTaxaFinanceira(Number(e.target.value))}
            />
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 text-right">
              <div className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">
                VALOR TOTAL COM TAXAS
              </div>
              <div className="text-xl font-black text-primary italic">
                R$ {valorComTaxa.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>
        </div>

        {/* Parcelas Manual */}
        <div className="grid grid-cols-2 gap-4">
          <Input
            type="number"
            label="Quantidade de Parcelas"
            min={1}
            max={60}
            value={totalParcelas}
            onChange={(e) => setTotalParcelas(Number(e.target.value))}
          />
          <Input
            type="number"
            label="Repetir por X meses (RecorrÃªncia)"
            min={1}
            max={36}
            value={formData.recorrencia_meses || 1}
            onChange={(e) =>
              setFormData({ ...formData, recorrencia_meses: Number(e.target.value) })
            }
          />
        </div>

        {/* Data + ObservaÃ§Ã£o */}
        <div className="grid grid-cols-2 gap-4">
          <Input
            type="date"
            label="Data Base de Vencimento"
            value={formData.data_base}
            onChange={(e) => setFormData({ ...formData, data_base: e.target.value })}
          />
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block ml-1">
              Rateio por Projeto? (Opcional)
            </label>
            <Button
              variant="outline"
              className="w-full h-[46px] uppercase font-black italic text-xs tracking-widest"
              onClick={() => setFormData({ ...formData, showRateio: !formData.showRateio })}
            >
              {formData.showRateio ? 'REMOVER RATEIO' : 'ADICIONAR RATEIO'}
            </Button>
          </div>
        </div>

        {formData.showRateio && (
          <div className="animate-fade-in p-5 border border-dashed border-white/10 rounded-xl bg-white/[0.01] space-y-4">
            <div className="text-xs font-black uppercase tracking-widest text-muted-foreground flex justify-between items-center">
              DISTRIBUIÃ‡ÃƒO POR PROJETO
              <Button
                variant="primary"
                size="sm"
                className="px-3 py-1.5 uppercase font-black italic text-[9px]"
                onClick={() => {
                  const r = formData.rateios || [];
                  setFormData({
                    ...formData,
                    rateios: [
                      ...r,
                      { projeto_id: '', classe_id: formData.classe_financeira_id, valor: 0 },
                    ],
                  });
                }}
              >
                + ADICIONAR LINHA
              </Button>
            </div>
            {(formData.rateios || []).map((r: any, idx: number) => (
              <div key={idx} className="grid grid-cols-[2fr_1.5fr_1fr_40px] gap-3 items-end">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest block ml-1">
                    Projeto
                  </label>
                  <select
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary uppercase font-bold"
                    value={r.projeto_id}
                    onChange={(e) => {
                      const newR = [...formData.rateios];
                      newR[idx].projeto_id = e.target.value;
                      setFormData({ ...formData, rateios: newR });
                    }}
                  >
                    <option value="">Selecione...</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {String(p.ambiente || 'Sem Nome').toUpperCase()} -{' '}
                        {String(p.client_name || p.cliente_nome || 'Sem Cliente').toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest block ml-1">
                    Classe
                  </label>
                  <select
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary uppercase font-bold"
                    value={r.classe_id}
                    onChange={(e) => {
                      const newR = [...formData.rateios];
                      newR[idx].classe_id = e.target.value;
                      setFormData({ ...formData, rateios: newR });
                    }}
                  >
                    <option value="">Mesma do TÃ­tulo</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nome.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>
                <Input
                  type="number"
                  label="Valor (R$)"
                  className="h-10 text-xs font-bold"
                  value={r.valor}
                  onChange={(e) => {
                    const newR = [...formData.rateios];
                    newR[idx].valor = Number(e.target.value);
                    setFormData({ ...formData, rateios: newR });
                  }}
                />
                <Button
                  variant="outline"
                  className="h-10 w-10 p-0 text-red-400 hover:text-red-300 border-red-500/20 hover:bg-red-500/10 flex items-center justify-center text-lg font-bold"
                  onClick={() => {
                    const newR = formData.rateios.filter((_: any, i: number) => i !== idx);
                    setFormData({ ...formData, rateios: newR });
                  }}
                >
                  Ã—
                </Button>
              </div>
            ))}
          </div>
        )}

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block ml-1">
            DescriÃ§Ã£o / ObservaÃ§Ã£o
          </label>
          <textarea
            className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            rows={2}
            value={formData.descricao}
            onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
            style={{ textTransform: 'none' }}
          />
        </div>
      </div>
    </div>
  );

  // â”€â”€â”€ PASSO 3: ConfirmaÃ§Ã£o â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const renderStep3 = () => (
    <div className="animate-fade-in space-y-6">
      <h3 className="text-xl font-bold text-white uppercase tracking-wider">
        Confirmar Parcelamento
      </h3>
      <div className="flex flex-col gap-3">
        {preview.map((p, i) => (
          <div
            key={i}
            className="p-4 bg-white/[0.02] border border-white/5 rounded-xl flex justify-between items-center border-l-4 border-l-primary"
          >
            <div>
              <div className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">
                PARCELA {p.numero_parcela}
              </div>
              <div className="font-bold text-white text-sm">
                {new Date(p.data_vencimento).toLocaleDateString('pt-BR')}
              </div>
              {taxaFinanceira > 0 && (
                <div className="text-[10px] text-muted-foreground italic mt-0.5">
                  Base: R$ {(formData.valor_base / totalParcelas).toFixed(2)} + {taxaFinanceira}%
                  taxa
                </div>
              )}
            </div>
            <div className="text-lg font-black text-white italic">
              R$ {Number(p.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </div>
        ))}
        <div className="mt-6 p-5 border border-dashed border-white/10 flex justify-between items-center bg-white/[0.01] rounded-xl">
          <div>
            <div className="text-xs font-black uppercase tracking-widest text-white">
              TOTAL A RECEBER
            </div>
            {taxaFinanceira > 0 && (
              <div className="text-[10px] text-muted-foreground italic mt-1">
                Inclui {taxaFinanceira}% de custo financeiro
              </div>
            )}
          </div>
          <span className="text-2xl font-black text-primary italic">
            R$ {valorComTaxa.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="py-10 max-w-4xl mx-auto px-4">
      <Button
        variant="outline"
        className="mb-8 uppercase font-black italic text-xs tracking-widest"
        onClick={() => (window.location.hash = '#/financeiro/titulos-receber')}
      >
        <ArrowLeft size={16} /> VOLTAR PARA LISTAGEM
      </Button>

      <div className="glass-elevated p-8 md:p-12 animate-pop-in">
        {/* Stepper â€“ 3 passos */}
        <div className="flex justify-between mb-12 relative">
          <div className="absolute top-[15px] left-0 right-0 h-[2px] bg-white/5 z-0" />
          {[1, 2, 3].map((s) => (
            <div key={s} className="z-10 flex flex-col items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm border-2 transition-all ${
                  step >= s
                    ? 'bg-primary border-primary text-black'
                    : 'bg-background border-border text-muted-foreground'
                }`}
              >
                {step > s ? <Check size={14} /> : s}
              </div>
            </div>
          ))}
        </div>

        {/* ConteÃºdo */}
        <div className="min-h-[320px]">
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
        </div>

        {/* BotÃµes */}
        <div className="mt-10 flex gap-4 justify-between">
          <Button
            variant="outline"
            className="px-6 uppercase font-black italic text-xs tracking-widest"
            disabled={step === 1 || loading}
            onClick={() => setStep(step - 1)}
          >
            ANTERIOR
          </Button>

          {step < 3 ? (
            <Button
              variant="primary"
              className="px-6 uppercase font-black italic text-xs tracking-widest"
              disabled={loading || !formData.cliente_id || !formData.classe_financeira_id}
              onClick={handleNext}
            >
              {loading ? (
                <Loader className="animate-spin" size={16} />
              ) : (
                <>
                  PRÃ“XIMO <ArrowRight size={16} />
                </>
              )}
            </Button>
          ) : (
            <Button
              variant="primary"
              className="px-6 uppercase font-black italic text-xs tracking-widest bg-emerald-500 hover:bg-emerald-600 border-emerald-500 hover:border-emerald-600 text-black shadow-lg shadow-emerald-500/20"
              disabled={loading}
              onClick={handleSave}
            >
              {loading ? (
                <Loader className="animate-spin" size={16} />
              ) : (
                'CONFIRMAR E GERAR TÃTULOS'
              )}
            </Button>
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
