import React, { useState, useEffect, useCallback } from 'react';
import { Settings2, Plus, Zap, Loader2, Save, X } from 'lucide-react';
import { evaluate } from 'mathjs';
import { useToast } from '../../context/ToastContext';
import { api } from '../../lib/api';
import { Button, Card } from '../../components/ui';
import { CardBody as CardContent } from '../../components/ui';
import { Modal, Input, CardSkeleton } from '../../components/common';
import DataTable from '../common/DataTable';
import { SKUAutocomplete } from '../../modules/quotations/components/SKUAutocomplete';

const EngineeringPage: React.FC = () => {
  const { error: toastError } = useToast();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<any>({
    id: null,
    nome: '',
    codigo_modelo: '',
    descricao: '',
    largura_padrao: 0,
    altura_padrao: 0,
    profundidade_padrao: 0,
    horas_mo_padrao: 0,
    valor_hora_padrao: 150,
    valor_total: 0,
    regras_calculo: [],
  });

  const [skus, setSkus] = useState<any[]>([]);
  useEffect(() => {
    api.skus.list().then(setSkus).catch(console.error);
  }, []);

  const avaliarFormula = (formula: string, L: number, A: number, P: number): number => {
    if (!formula) return 0;
    try {
      const expr = String(formula)
        .toUpperCase()
        .replace(/L/g, `(${L})`)
        .replace(/A/g, `(${A})`)
        .replace(/P/g, `(${P})`);
      // Sanitização: apenas caracteres matemáticos seguros (defesa em profundidade)
      if (!/^[0-9.+\-*/()\s]+$/.test(expr)) {
        console.warn('Formula contém caracteres inválidos:', formula);
        return 0;
      }
      // mathjs.evaluate() faz apenas cálculos matemáticos (SEGURO - sem execução de código)
      const result = evaluate(expr);
      const num = typeof result === 'number' ? result : Number(result);
      return Number.isFinite(num) ? num : 0;
    } catch (err) {
      console.error('Erro ao avaliar formula:', formula, err);
      return 0;
    }
  };

  const calcularCustoProporcionalPeca = (
    comp: any,
    L: number,
    A: number,
    P: number,
    skuSelected?: any,
  ): number => {
    const larguraPeca = avaliarFormula(comp.formula_largura, L, A, P);
    const alturaPeca = avaliarFormula(comp.formula_altura, L, A, P);

    if (larguraPeca <= 0 || alturaPeca <= 0) return 0;

    const precoChapa = Number(skuSelected?.preco_base || skuSelected?.precoUnitario || 0);
    const skuCodigo = String(skuSelected?.sku || skuSelected?.codigo || '').toUpperCase();
    const nomeChapa = String(skuSelected?.nome || '').toUpperCase();

    const isMDF =
      skuCodigo.includes('CHP-') ||
      skuCodigo.includes('MDF-') ||
      nomeChapa.includes('MDF') ||
      nomeChapa.includes('CHAPA');

    if (isMDF && precoChapa > 0) {
      const larguraChapa = Number(skuSelected?.largura_mm || 2750);
      const alturaChapa = Number(skuSelected?.altura_mm || 1830);

      const areaChapa = larguraChapa * alturaChapa;
      const areaPeca = larguraPeca * alturaPeca;
      const proporcao = areaPeca / areaChapa;
      const perdaFator = Number(comp.formula_perda) || 1.1;

      return Number((precoChapa * proporcao * perdaFator).toFixed(2));
    }

    return precoChapa;
  };

  const recalcularValorTotal = useCallback((regras: any[]) => {
    return regras.reduce((sum: number, r: any) => {
      return sum + (Number(r.valor_unitario) || 0) * (Number(r.quantidade) || 0);
    }, 0);
  }, []);

  const handleDimensaoModuloChange = (campo: string, valor: number) => {
    setFormData((prev) => {
      const novoFormData = { ...prev, [campo]: valor };
      const L = Number(novoFormData.largura_padrao) || 0;
      const A = Number(novoFormData.altura_padrao) || 0;
      const P = Number(novoFormData.profundidade_padrao) || 0;

      const novaLista = (novoFormData.regras_calculo || []).map((c: any) => {
        const skuSelected = skus.find((s) => s.id === c.sku_id);
        return {
          ...c,
          valor_unitario: calcularCustoProporcionalPeca(c, L, A, P, skuSelected),
        };
      });

      return {
        ...novoFormData,
        regras_calculo: novaLista,
        valor_total: recalcularValorTotal(novaLista),
      };
    });
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const data = await api.engineering.list();
      setProducts(data);
    } catch (err) {
      console.error('Failed to fetch products:', err);
    } finally {
      setLoading(false);
    }
  };

  // Auto-gera codigo_modelo ao abrir modal de novo modulo
  const openNewModal = useCallback(async () => {
    try {
      const all = await api.engineering.list();
      const mods = all
        .map((p: any) => p.codigo_modelo)
        .filter((c: string) => /^MOD-\d+$/.test(c))
        .map((c: string) => Number(c.replace('MOD-', '')));
      const nextNum = mods.length > 0 ? Math.max(...mods) + 1 : 1;
      setFormData({
        id: null,
        nome: '',
        codigo_modelo: `MOD-${String(nextNum).padStart(3, '0')}`,
        descricao: '',
        largura_padrao: 0,
        altura_padrao: 0,
        profundidade_padrao: 0,
        horas_mo_padrao: 0,
        valor_hora_padrao: 150,
        valor_total: 0,
        regras_calculo: [],
      });
      setIsModalOpen(true);
    } catch {
      setFormData({
        id: null,
        nome: '',
        codigo_modelo: 'MOD-001',
        descricao: '',
        largura_padrao: 0,
        altura_padrao: 0,
        profundidade_padrao: 0,
        horas_mo_padrao: 0,
        valor_hora_padrao: 150,
        valor_total: 0,
        regras_calculo: [],
      });
      setIsModalOpen(true);
    }
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (formData.id) {
        await api.engineering.update?.(formData.id, formData);
      } else {
        await api.engineering.create(formData);
      }

      setIsModalOpen(false);
      resetForm();
      await fetchProducts();
    } catch (err: any) {
      console.error('Failed to save product:', err);
      toastError(`Erro ao salvar: ${err.message || 'Erro desconhecido'}`);
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setFormData({
      id: null,
      nome: '',
      codigo_modelo: '',
      descricao: '',
      largura_padrao: 0,
      altura_padrao: 0,
      profundidade_padrao: 0,
      horas_mo_padrao: 0,
      valor_hora_padrao: 150,
      valor_total: 0,
      regras_calculo: [],
    });
  };

  const addComponent = () => {
    const L = Number(formData.largura_padrao) || 0;
    const A = Number(formData.altura_padrao) || 0;
    const P = Number(formData.profundidade_padrao) || 0;

    const newComponent = {
      id: crypto.randomUUID(),
      componente_nome: 'NOVO COMPONENTE',
      formula_largura: 'L',
      formula_altura: 'A',
      formula_perda: '1.10',
      quantidade: 1,
      valor_unitario: 0,
      sku_id: skus[0]?.id || '',
      tipo_regra: 'AREA',
    };

    const skuSelected = skus.find((s) => s.id === newComponent.sku_id);
    newComponent.valor_unitario = calcularCustoProporcionalPeca(newComponent, L, A, P, skuSelected);

    const novaLista = [...(formData.regras_calculo || []), newComponent];
    setFormData({
      ...formData,
      regras_calculo: novaLista,
      valor_total: recalcularValorTotal(novaLista),
    });
  };

  const removeComponent = (id: string) => {
    const novaLista = formData.regras_calculo.filter((c: any) => c.id !== id);
    setFormData({
      ...formData,
      regras_calculo: novaLista,
      valor_total: recalcularValorTotal(novaLista),
    });
  };

  const updateComponent = (id: string, updates: any) => {
    const L = Number(formData.largura_padrao) || 0;
    const A = Number(formData.altura_padrao) || 0;
    const P = Number(formData.profundidade_padrao) || 0;

    const novaLista = formData.regras_calculo.map((c: any) => {
      if (c.id !== id) return c;
      const updated = { ...c, ...updates };
      const skuSelected = skus.find((s) => s.id === updated.sku_id);
      updated.valor_unitario = calcularCustoProporcionalPeca(updated, L, A, P, skuSelected);
      return updated;
    });

    setFormData({
      ...formData,
      regras_calculo: novaLista,
      valor_total: recalcularValorTotal(novaLista),
    });
  };

  return (
    <div className="animate-fade-in flex flex-col gap-8">
      <header className="flex justify-between items-center pb-4 border-b border-border">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-primary/10 rounded-xl text-primary shadow-sm">
            <Settings2 size={28} />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight uppercase flex items-center gap-2">
              Engenharia de Produto
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Definição de módulos paramétricos e regras de cálculo (BOM).
            </p>
          </div>
        </div>
        <Button onClick={openNewModal}>
          <Plus size={20} className="mr-2" /> Novo Módulo
        </Button>
      </header>

      <div className="card p-6">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </div>
        ) : (
          <DataTable
            headers={['Nome', 'Modelo', 'Descrição', 'Valor Total (R$)', 'Criado em', 'Ações']}
            data={products}
            renderRow={(p) => (
              <>
                <td className="p-4 font-semibold">{p.nome}</td>
                <td className="p-4">
                  <span className="bg-primary/10 text-primary px-2.5 py-0.5 rounded-full text-xs font-bold border border-primary/20">
                    {p.codigo_modelo}
                  </span>
                </td>
                <td className="p-4 text-sm text-muted-foreground">{p.descricao}</td>
                <td className="p-4 font-semibold">
                  R${' '}
                  {Number(p.valor_total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </td>
                <td className="p-4 text-xs text-muted-foreground">
                  {p.created_at ? new Date(p.created_at).toLocaleDateString() : '-'}
                </td>
                <td className="p-4">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        // Garantir que regras_calculo tenha valor_unitario para calculo
                        const regras = Array.isArray(p.regras_calculo) ? p.regras_calculo : [];
                        setFormData({
                          ...p,
                          regras_calculo: regras,
                          valor_total: Number(p.valor_total) || 0,
                        });
                        setIsModalOpen(true);
                      }}
                    >
                      Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive border-destructive/20 hover:bg-destructive/10 font-bold"
                      onClick={async () => {
                        if (confirm(`Tem certeza que deseja excluir o módulo "${p.nome}"?`)) {
                          try {
                            await api.engineering.delete(p.id);
                            fetchProducts();
                          } catch (err: any) {
                            toastError('Erro ao excluir: ' + err.message);
                          }
                        }
                      }}
                    >
                      Excluir
                    </Button>
                  </div>
                </td>
              </>
            )}
            emptyMessage="Nenhum módulo de engenharia cadastrado."
          />
        )}
      </div>

      <Card className="bg-gradient-to-br from-primary/10 to-teal-500/5 border border-primary/15 p-6">
        <CardContent className="flex flex-col gap-4 p-0">
          <div className="flex items-center gap-2">
            <Zap size={20} className="text-primary" />
            <h3 className="text-lg font-bold text-primary">Motor de Cálculo (BOM Engine)</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            O motor de cálculo industrial está ativo. Ele processa automaticamente o consumo de
            materiais com base nos parâmetros definidos nestes módulos.
          </p>
        </CardContent>
      </Card>

      <Modal
        open={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          resetForm();
        }}
        title={formData.id ? 'Editar Módulo de Engenharia' : 'Cadastrar Novo Módulo de Engenharia'}
        size="xl"
      >
        <form
          onSubmit={handleSave}
          className="flex flex-col gap-4 max-h-[80vh] overflow-y-auto pr-2 custom-scrollbar"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              required
              label="Nome do Módulo *"
              placeholder="Ex: Armário Superior"
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
            />
            <Input
              required
              label="Código do Modelo"
              placeholder="MOD-XXX"
              value={formData.codigo_modelo}
              onChange={(e) => setFormData({ ...formData, codigo_modelo: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-3 gap-4 p-4 bg-muted/30 border border-border/50 rounded-xl">
            <Input
              type="number"
              label="Largura (mm)"
              value={formData.largura_padrao}
              onChange={(e) => handleDimensaoModuloChange('largura_padrao', Number(e.target.value))}
            />
            <Input
              type="number"
              label="Altura (mm)"
              value={formData.altura_padrao}
              onChange={(e) => handleDimensaoModuloChange('altura_padrao', Number(e.target.value))}
            />
            <Input
              type="number"
              label="Profundidade (mm)"
              value={formData.profundidade_padrao}
              onChange={(e) =>
                handleDimensaoModuloChange('profundidade_padrao', Number(e.target.value))
              }
            />
          </div>

          <div className="grid grid-cols-1 gap-4">
            <Input
              type="number"
              label="Valor Total (R$)"
              value={formData.valor_total}
              onChange={(e) => setFormData({ ...formData, valor_total: Number(e.target.value) })}
              disabled={formData.regras_calculo?.length > 0}
              hint={
                formData.regras_calculo?.length > 0
                  ? 'Calculado proporcionalmente a partir das peças MDF'
                  : 'Defina o valor base do módulo'
              }
            />
          </div>

          <div className="mt-4 border-t border-border pt-4">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-base font-bold text-primary">Regras de Construção (BOM)</h4>
              <Button type="button" variant="outline" size="sm" onClick={addComponent}>
                <Plus size={16} className="mr-1" /> Add Peça
              </Button>
            </div>

            <div className="flex flex-col gap-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              {(formData.regras_calculo || []).map((comp: any) => (
                <div
                  key={comp.id}
                  className="p-5 bg-muted/20 border border-border/50 rounded-xl flex flex-col gap-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <label className="mb-1.5 block text-xs font-medium text-foreground/80">
                        Nome da Peça *
                      </label>
                      <Input
                        placeholder="Ex: LATERAL ESQUERDA"
                        value={comp.componente_nome}
                        onChange={(e) =>
                          updateComponent(comp.id, {
                            componente_nome: e.target.value.toUpperCase(),
                          })
                        }
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:bg-destructive/10 mt-6"
                      onClick={() => removeComponent(comp.id)}
                      title="Remover peça"
                    >
                      <X size={20} />
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-foreground/80">
                        Material (SKU) *
                      </label>
                      <SKUAutocomplete
                        defaultValue={skus.find((s) => s.id === comp.sku_id)?.sku || ''}
                        onSelect={(sku) => updateComponent(comp.id, { sku_id: sku.id })}
                        placeholder="Buscar SKU..."
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-foreground/80">
                        Quantidade
                      </label>
                      <Input
                        type="number"
                        placeholder="Qtd"
                        min={0}
                        value={comp.quantidade}
                        onChange={(e) =>
                          updateComponent(comp.id, { quantidade: Number(e.target.value) })
                        }
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-foreground/80">
                        Valor Unitário (R$)
                      </label>
                      <Input
                        type="number"
                        placeholder="0,00"
                        min={0}
                        value={comp.valor_unitario}
                        onChange={(e) =>
                          updateComponent(comp.id, { valor_unitario: Number(e.target.value) })
                        }
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-foreground/80">
                        Sentido do Veio
                      </label>
                      <select
                        className="flex h-10 w-full rounded-xl border border-border bg-input px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                        value={comp.sentido_veio || 'longitudinal'}
                        onChange={(e) => updateComponent(comp.id, { sentido_veio: e.target.value })}
                      >
                        <option value="longitudinal">Longitudinal</option>
                        <option value="transversal">Transversal</option>
                        <option value="sem_sentido">Sem Sentido</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2 border-t border-border/40">
                    <Input
                      label="Fórmula Largura (L)"
                      hint="Ex: L, L-20, L*0.5"
                      value={comp.formula_largura}
                      onChange={(e) =>
                        updateComponent(comp.id, { formula_largura: e.target.value })
                      }
                    />
                    <Input
                      label="Fórmula Altura (A)"
                      hint="Ex: A, A-30, A*0.8"
                      value={comp.formula_altura}
                      onChange={(e) => updateComponent(comp.id, { formula_altura: e.target.value })}
                    />
                    <Input
                      label="Fator Perda"
                      hint="Ex: 1.10 = 10%"
                      value={comp.formula_perda}
                      onChange={(e) => updateComponent(comp.id, { formula_perda: e.target.value })}
                    />
                    <Input
                      type="number"
                      label="Desconto Fita (mm)"
                      hint="Subtraído do comprimento"
                      min={0}
                      value={comp.desconto_fita_mm || 0}
                      onChange={(e) =>
                        updateComponent(comp.id, { desconto_fita_mm: Number(e.target.value) })
                      }
                    />
                  </div>
                </div>
              ))}
              {(!formData.regras_calculo || formData.regras_calculo.length === 0) && (
                <p className="text-center text-muted-foreground text-sm py-4">
                  Nenhuma regra definida para este módulo.
                </p>
              )}
            </div>
          </div>

          {/* Resumo financeiro */}
          {formData.regras_calculo?.length > 0 && (
            <div className="bg-muted/30 border border-border/50 rounded-xl p-4 flex justify-between items-center">
              <span className="text-sm font-semibold text-muted-foreground">
                Valor Total dos Materiais
              </span>
              <span className="text-xl font-bold text-primary">
                R${' '}
                {recalcularValorTotal(formData.regras_calculo).toLocaleString('pt-BR', {
                  minimumFractionDigits: 2,
                })}
              </span>
            </div>
          )}

          <div className="flex gap-4 mt-4">
            <Button type="submit" className="flex-1" disabled={saving}>
              {saving ? (
                <Loader2 className="animate-spin mr-2" size={20} />
              ) : (
                <Save className="mr-2" size={20} />
              )}
              Salvar Módulo
            </Button>
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default EngineeringPage;
