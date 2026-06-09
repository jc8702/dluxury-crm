import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { ArrowLeft, Check, ArrowRight, Loader, Info, AlertCircle } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { CardSkeleton } from '../components/common/Skeleton';
import { Button } from '../components/ui';
import { Input } from '../components/common';

// Meios que exigem campo de taxa financeira
const MEIOS_COM_TAXA = ['boleto', 'cartao_credito', 'cheque', 'cartao_debito'];

interface FinanceiroTitulosPagarWizardProps {
  isDrawer?: boolean;
  onClose?: () => void;
  onSuccess?: () => void;
}

export default function FinanceiroTitulosPagarWizard({
  isDrawer = false,
  onClose,
  onSuccess,
}: FinanceiroTitulosPagarWizardProps = {}) {
  const { success, error } = useToast();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingOCs, setLoadingOCs] = useState(false);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [preview, setPreview] = useState<any[]>([]);
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [hasOC, setHasOC] = useState<'none' | 'sim' | 'nao'>('none');
  const [formasPagamento, setFormasPagamento] = useState<any[]>([]);
  const [contasInternas, setContasInternas] = useState<any[]>([]);
  const [taxaFinanceira, setTaxaFinanceira] = useState(0);
  const [totalParcelas, setTotalParcelas] = useState(1);
  const [projects, setProjects] = useState<any[]>([]);

  const normalizeList = (value: any) => (Array.isArray(value) ? value : value?.data || []);

  const [formData, setFormData] = useState({
    fornecedor_id: '',
    pedido_compra_id: '',
    classe_financeira_id: '',
    valor_base: 0,
    data_base: new Date().toISOString().split('T')[0],
    condicao_pagamento_id: '',
    forma_pagamento_id: '',
    conta_bancaria_id: '',
    numero_titulo: `PAG-${Date.now().toString().slice(-6)}`,
    descricao: '',
    recorrencia_meses: 1,
    showRateio: false,
    rateios: [] as any[],
  });

  // Valor total com taxa aplicada
  const valorCustoFinanceiro = formData.valor_base * (taxaFinanceira / 100);
  const valorComTaxa = formData.valor_base + valorCustoFinanceiro;

  // Forma selecionada
  const _formaSelecionada = formasPagamento.find((f) => f.id === formData.forma_pagamento_id);
  const _exibeTaxa = _formaSelecionada && MEIOS_COM_TAXA.includes(_formaSelecionada.tipo);

  useEffect(() => {
    const loadOpts = async () => {
      try {
        const [sup, cf, fp, ci, prj] = await Promise.all([
          api.suppliers.list(),
          api.financeiro.classesFinanceiras.list(),
          api.financeiro.formasPagamento.list(),
          api.financeiro.contasInternas.list(),
          api.projects.list(),
        ]);
        setSuppliers(normalizeList(sup));
        setClasses(normalizeList(cf));
        setFormasPagamento(normalizeList(fp));
        setContasInternas(normalizeList(ci));
        setProjects(normalizeList(prj));

        const contasList = normalizeList(ci);
        const formasList = normalizeList(fp);
        if (contasList.length > 0)
          setFormData((prev) => ({ ...prev, conta_bancaria_id: contasList[0].id }));
        if (formasList.length > 0)
          setFormData((prev) => ({ ...prev, forma_pagamento_id: formasList[0].id }));
      } catch (err) {
        console.error('[WIZARD PAGAR ERROR]', err);
      }
    };
    loadOpts();
  }, []);

  useEffect(() => {
    const loadOCs = async () => {
      if (!formData.fornecedor_id) {
        setPedidos([]);
        return;
      }
      setLoadingOCs(true);
      try {
        const ocs = await api.compras.listBySupplier(formData.fornecedor_id);
        setPedidos(
          (ocs || []).filter((o: any) => o.status !== 'recebido' && o.status !== 'confirmado'),
        );
      } catch (err) {
        console.error('Erro ao carregar OCs:', err);
      } finally {
        setLoadingOCs(false);
      }
    };
    loadOCs();
  }, [formData.fornecedor_id]);

  const handleOCSelection = (pedidoId: string) => {
    const pedido = pedidos.find((p) => p.id === pedidoId);
    if (pedido) {
      setFormData({
        ...formData,
        pedido_compra_id: pedido.id,
        valor_base: Number(pedido.valor_total),
        numero_titulo: pedido.numero ? `FAT-${pedido.numero}` : formData.numero_titulo,
        descricao: `Referente à Ordem de Compra ${pedido.numero}`,
      });
    }
  };

  const handleNext = async () => {
    if (step === 2) {
      setLoading(true);
      try {
        const res = await api.financeiro.titulosPagar.preview({
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
      await api.financeiro.titulosPagar.create({
        fornecedor_id: formData.fornecedor_id,
        pedido_compra_id: formData.pedido_compra_id || null,
        classe_financeira_id: formData.classe_financeira_id,
        valor_original: valorComTaxa,
        total_parcelas: totalParcelas,
        recorrencia_meses: formData.recorrencia_meses || 1,
        data_vencimento: formData.data_base,
        forma_pagamento_id: formData.forma_pagamento_id,
        conta_bancaria_id: formData.conta_bancaria_id,
        numero_titulo: formData.numero_titulo,
        observacoes: formData.descricao || null,
        taxa_financeira: taxaFinanceira,
        valor_custo_financeiro: valorCustoFinanceiro,
        rateio: formData.showRateio ? formData.rateios : [],
      });
      success('Títulos gerados com sucesso!');
      if (isDrawer) {
        onSuccess?.();
        onClose?.();
      } else {
        window.location.hash = '#/financeiro/titulos-pagar';
      }
    } catch (err: any) {
      error('Erro ao salvar títulos: ' + (err.message || ''));
    } finally {
      setLoading(false);
    }
  };

  // ─── PASSO 1: Identificação ───────────────────────────────────────────────
  const renderStep1 = () => (
    <div className="animate-fade-in">
      <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem' }}>
        Identificação da Despesa
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div>
          <label className="label-base">Fornecedor / Favorecido</label>
          <select
            className="input-base"
            value={formData.fornecedor_id}
            onChange={(e) => setFormData({ ...formData, fornecedor_id: e.target.value })}
          >
            <option value="">Selecione um fornecedor...</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nome || s.name}
              </option>
            ))}
          </select>
        </div>

        {formData.fornecedor_id && (
          <div
            className="animate-fade-in"
            style={{
              padding: '1rem',
              border: '1px solid hsl(var(--border))',
              borderRadius: 'var(--radius-md)',
              background: 'hsl(var(--surface-hover))',
            }}
          >
            <label className="label-base">Possui Ordem de Compra (OC)?</label>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
              <Button
                variant={hasOC === 'sim' ? 'danger' : 'outline'}
                onClick={() => setHasOC('sim')}
              >
                SIM
              </Button>
              <Button
                variant={hasOC === 'nao' ? 'danger' : 'outline'}
                onClick={() => {
                  setHasOC('nao');
                  setFormData({ ...formData, pedido_compra_id: '', valor_base: 0 });
                }}
              >
                NÃO
              </Button>
            </div>
            {hasOC === 'sim' && (
              <div style={{ marginTop: '1rem' }} className="animate-fade-in">
                <label className="label-base">Selecionar Ordem de Compra</label>
                {loadingOCs ? (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.5rem',
                    }}
                  >
                    <Loader className="animate-spin" /> Carregando OCs...
                  </div>
                ) : pedidos.length > 0 ? (
                  <select
                    className="input-base"
                    value={formData.pedido_compra_id}
                    onChange={(e) => handleOCSelection(e.target.value)}
                  >
                    <option value="">Selecione a OC...</option>
                    {pedidos.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.numero} - R${' '}
                        {Number(p.valor_total).toLocaleString('pt-BR', {
                          minimumFractionDigits: 2,
                        })}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p
                    style={{
                      color: 'hsl(var(--destructive))',
                      fontSize: '0.85rem',
                      marginTop: '0.5rem',
                    }}
                  >
                    Nenhuma OC pendente encontrada.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        <div>
          <label className="label-base">Classe Financeira</label>
          <select
            className="input-base"
            value={formData.classe_financeira_id}
            onChange={(e) => setFormData({ ...formData, classe_financeira_id: e.target.value })}
          >
            <option value="">Selecione uma categoria...</option>
            {classes
              .filter((c) => c.tipo.toLowerCase() === 'despesa' && c.permite_lancamento)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.codigo} - {c.nome}
                </option>
              ))}
          </select>
        </div>

        <div className="space-y-2">
          <Input
            type="text"
            label="Número da Duplicata / Título"
            value={formData.numero_titulo}
            onChange={(e) => setFormData({ ...formData, numero_titulo: e.target.value })}
            placeholder="Ex: NF-12345"
          />
        </div>
      </div>
    </div>
  );

  // ─── PASSO 2: Valores + Pagamento + Parcelas ─────────────────────────────
  const renderStep2 = () => (
    <div className="animate-fade-in">
      <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem' }}>
        Valores e Pagamento
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* Valor base */}
        <div className="space-y-2">
          <Input
            type="number"
            label="Valor da Obrigação (sem taxas)"
            value={formData.valor_base}
            onChange={(e) => setFormData({ ...formData, valor_base: Number(e.target.value) })}
          />
        </div>

        {/* Conta + Meio */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label className="label-base">Contas Internas</label>
            <select
              className="input-base"
              value={formData.conta_bancaria_id}
              onChange={(e) => setFormData({ ...formData, conta_bancaria_id: e.target.value })}
            >
              <option value="">Selecione a conta...</option>
              {contasInternas.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label-base">Meio de Pagamento</label>
            <select
              className="input-base"
              value={formData.forma_pagamento_id}
              onChange={(e) => {
                setFormData({ ...formData, forma_pagamento_id: e.target.value });
                setTaxaFinanceira(0);
              }}
            >
              <option value="">Selecione o meio...</option>
              {formasPagamento.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nome}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Taxa Financeira – Sempre disponível para ajuste manual */}
        <div
          className="animate-fade-in"
          style={{
            padding: '1rem',
            border: '1px solid var(--warning, #f59e0b)',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(245,158,11,0.08)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '0.75rem',
              color: 'var(--warning, #f59e0b)',
              fontWeight: 700,
              fontSize: '0.9rem',
            }}
          >
            <AlertCircle /> CUSTO FINANCEIRO / TAXAS (%)
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '1rem',
              alignItems: 'end',
            }}
          >
            <div className="space-y-2">
              <Input
                type="number"
                label="Taxa (%)"
                min={0}
                max={100}
                step={0.01}
                value={taxaFinanceira}
                onChange={(e) => setTaxaFinanceira(Number(e.target.value))}
              />
            </div>
            <div
              style={{
                padding: '0.75rem',
                borderRadius: 'var(--radius-md)',
                background: 'hsl(var(--surface))',
                textAlign: 'right',
              }}
            >
              {loading ? (
                <div style={{ display: 'grid', gap: '1rem', padding: '1rem' }}>
                  <CardSkeleton />
                  <CardSkeleton />
                </div>
              ) : (
                <>
                  <div style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>
                    VALOR TOTAL COM TAXAS
                  </div>
                  <div
                    style={{
                      fontSize: '1.2rem',
                      fontWeight: 800,
                      color: 'hsl(var(--destructive))',
                    }}
                  >
                    R$ {valorComTaxa.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Parcelas Manual */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
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
            label="Repetir por X meses (Recorrência)"
            min={1}
            max={36}
            value={formData.recorrencia_meses || 1}
            onChange={(e) =>
              setFormData({ ...formData, recorrencia_meses: Number(e.target.value) })
            }
          />
        </div>

        {/* Data + Observação */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '1rem',
            alignItems: 'end',
          }}
        >
          <Input
            type="date"
            label="Data de Emissão / Competência"
            value={formData.data_base}
            onChange={(e) => setFormData({ ...formData, data_base: e.target.value })}
          />
          <div className="space-y-2">
            <label className="label-base">Rateio por Projeto? (Opcional)</label>
            <Button
              variant="outline"
              style={{ width: '100%', justifyContent: 'center' }}
              onClick={() => setFormData({ ...formData, showRateio: !formData.showRateio })}
            >
              {formData.showRateio ? 'REMOVER RATEIO' : 'ADICIONAR RATEIO'}
            </Button>
          </div>
        </div>

        {formData.showRateio && (
          <div
            className="animate-fade-in"
            style={{
              padding: '1.25rem',
              border: '1px dashed hsl(var(--border))',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(255,255,255,0.02)',
            }}
          >
            <div
              style={{
                fontWeight: 700,
                fontSize: '0.85rem',
                marginBottom: '1rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              DISTRIBUIÇÃO POR PROJETO
              <Button
                variant="danger"
                size="sm"
                style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem' }}
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
              <div
                key={idx}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 1.5fr 1fr 40px',
                  gap: '0.5rem',
                  marginBottom: '0.5rem',
                  alignItems: 'end',
                }}
              >
                <div>
                  <label style={{ fontSize: '0.7rem', opacity: 0.6 }}>Projeto</label>
                  <select
                    className="input-base"
                    style={{ height: '36px', fontSize: '0.8rem' }}
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
                        {p.nome || p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.7rem', opacity: 0.6 }}>Classe</label>
                  <select
                    className="input-base"
                    style={{ height: '36px', fontSize: '0.8rem' }}
                    value={r.classe_id}
                    onChange={(e) => {
                      const newR = [...formData.rateios];
                      newR[idx].classe_id = e.target.value;
                      setFormData({ ...formData, rateios: newR });
                    }}
                  >
                    <option value="">Mesma do Título</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nome}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Input
                    type="number"
                    label="Valor (R$)"
                    style={{ height: '36px', fontSize: '0.8rem' }}
                    value={r.valor}
                    onChange={(e) => {
                      const newR = [...formData.rateios];
                      newR[idx].valor = Number(e.target.value);
                      setFormData({ ...formData, rateios: newR });
                    }}
                  />
                </div>
                <Button
                  variant="outline"
                  style={{
                    height: '36px',
                    padding: 0,
                    color: 'hsl(var(--destructive))',
                    borderColor: 'hsl(var(--destructive))',
                  }}
                  onClick={() => {
                    const newR = formData.rateios.filter((_: any, i: number) => i !== idx);
                    setFormData({ ...formData, rateios: newR });
                  }}
                >
                  ×
                </Button>
              </div>
            ))}
          </div>
        )}

        <div>
          <label className="label-base">Observações Internas</label>
          <textarea
            className="input-base"
            rows={2}
            value={formData.descricao}
            onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
            style={{ textTransform: 'none' }}
          />
        </div>
      </div>
    </div>
  );

  // ─── PASSO 3: Confirmação ─────────────────────────────────────────────────
  const renderStep3 = () => (
    <div className="animate-fade-in">
      <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem' }}>
        Confirmação Financeira
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {preview.map((p, i) => (
          <div
            key={i}
            className="card"
            style={{
              padding: '1rem',
              background: 'hsl(var(--surface-hover))',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderLeft: '4px solid hsl(var(--destructive))',
            }}
          >
            <div>
              <div
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: 'hsl(var(--destructive))',
                  marginBottom: '0.2rem',
                }}
              >
                PARCELA {p.numero_parcela}
              </div>
              <div style={{ fontWeight: 600 }}>
                {new Date(p.data_vencimento).toLocaleDateString('pt-BR')}
              </div>
              {taxaFinanceira > 0 && (
                <div style={{ fontSize: '0.7rem', color: 'hsl(var(--muted-foreground))' }}>
                  Base: R$ {(formData.valor_base / totalParcelas).toFixed(2)} + {taxaFinanceira}%
                  taxa
                </div>
              )}
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>
              R$ {Number(p.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </div>
        ))}
        <div
          style={{
            marginTop: '1.5rem',
            padding: '1.25rem',
            borderTop: '2px dashed hsl(var(--border))',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'hsl(var(--surface-hover))',
            borderRadius: 'var(--radius-md)',
          }}
        >
          <div>
            <div style={{ fontWeight: 700 }}>MONTANTE TOTAL A PAGAR</div>
            {taxaFinanceira > 0 && (
              <div style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>
                Inclui {taxaFinanceira}% de custo financeiro
              </div>
            )}
          </div>
          <span style={{ fontSize: '1.5rem', fontWeight: 900, color: 'hsl(var(--destructive))' }}>
            R$ {valorComTaxa.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <div
      style={isDrawer ? { padding: 0 } : { padding: '2rem', maxWidth: '800px', margin: '0 auto' }}
    >
      {!isDrawer && (
        <Button
          variant="outline"
          style={{ marginBottom: '2rem' }}
          onClick={() => (window.location.hash = '#/financeiro/titulos-pagar')}
        >
          <ArrowLeft /> VOLTAR PARA LISTAGEM
        </Button>
      )}

      <div
        className={isDrawer ? 'animate-pop-in' : 'card glass animate-pop-in'}
        style={isDrawer ? { padding: 0 } : { padding: '2.5rem' }}
      >
        {/* Stepper – 3 passos */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: '3rem',
            position: 'relative',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: '15px',
              left: 0,
              right: 0,
              height: '2px',
              background: 'hsl(var(--border))',
              zIndex: 0,
            }}
          />
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              style={{
                zIndex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: step >= s ? 'hsl(var(--destructive))' : 'hsl(var(--surface))',
                  color: step >= s ? '#ffffff' : 'hsl(var(--muted-foreground))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  border: '2px solid',
                  borderColor: step >= s ? 'hsl(var(--destructive))' : 'hsl(var(--border))',
                }}
              >
                {step > s ? <Check /> : s}
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
        <div
          style={{
            marginTop: '2.5rem',
            display: 'flex',
            gap: '1rem',
            justifyContent: 'space-between',
          }}
        >
          <Button
            variant="outline"
            disabled={step === 1}
            isLoading={loading}
            onClick={() => setStep(step - 1)}
          >
            ANTERIOR
          </Button>

          {step < 3 ? (
            <Button
              variant="danger"
              disabled={!formData.fornecedor_id || !formData.classe_financeira_id}
              isLoading={loading}
              onClick={handleNext}
            >
              PRÓXIMO <ArrowRight />
            </Button>
          ) : (
            <Button
              style={{
                background: 'hsl(var(--success))',
                borderColor: 'hsl(var(--success))',
                color: '#fff',
              }}
              isLoading={loading}
              onClick={handleSave}
            >
              CONFIRMAR E GERAR TÃTULOS
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
