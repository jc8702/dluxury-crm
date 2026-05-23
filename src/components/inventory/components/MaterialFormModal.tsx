import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../../context/AppContext';
import type { Material } from '../../../context/AppContext';
import { Save, Plus } from 'lucide-react';
import FornecedorFormModal from '../../suppliers/components/FornecedorFormModal';
import { Modal, Button, Input } from '../../../design-system/components';

interface MaterialFormModalProps {
  material?: Material;
  onClose: () => void;
  onSuccess: () => void;
}

const MaterialFormModal: React.FC<MaterialFormModalProps> = ({ material, onClose, onSuccess }) => {
  const { categorias, materiais, addMaterial, updateMaterial } = useAppContext();
  const [form, setForm] = useState({
    sku: '', nome: '', descricao: '', categoria_id: '', subcategoria: '',
    unidade_compra: 'chapa', unidade_uso: 'm2', fator_conversao: 1,
    estoque_minimo: 0, preco_custo: 0, preco_venda: 0, margem_lucro: 0,
    fornecedor_principal: '', observacoes: '',
    cfop: '', ncm: '', icms: 0, icms_st: 0, ipi: 0, pis: 0, cofinancas: 0, origem: 0,
    largura_mm: 0, altura_mm: 0, marca: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const { fornecedores } = useAppContext();

  useEffect(() => {
    if (!material && form.categoria_id) {
      const prefix = form.categoria_id;
      const matCat = materiais.filter(m => m.categoria_id === form.categoria_id && m.sku && m.sku.startsWith(`${prefix}-`));
      let nextNum = 1;
      if (matCat.length > 0) {
        const nums = matCat.map(m => {
          const parts = m.sku.split('-');
          if (parts.length >= 2) {
            const num = parseInt(parts[1], 10);
            return isNaN(num) ? 0 : num;
          }
          return 0;
        });
        nextNum = Math.max(...nums) + 1;
      }
      const nextSku = `${prefix}-${nextNum.toString().padStart(4, '0')}`;
      
      setForm(prev => ({ ...prev, sku: nextSku }));
    }
  }, [form.categoria_id, material]); // Ignorando 'materiais' de propósito para rodar apenas ao trocar categoria

  useEffect(() => {
    if (material) {
      setForm({
        sku: material.sku, nome: material.nome, descricao: material.descricao || '',
        categoria_id: material.categoria_id, subcategoria: material.subcategoria || '',
        unidade_compra: material.unidade_compra, unidade_uso: material.unidade_uso,
        fator_conversao: material.fator_conversao, estoque_minimo: material.estoque_minimo,
        preco_custo: material.preco_custo, 
        preco_venda: material.preco_venda || 0,
        margem_lucro: material.margem_lucro || 0,
        fornecedor_principal: material.fornecedor_principal || '',
        observacoes: material.observacoes || '',
        cfop: material.cfop || '',
        ncm: material.ncm || '',
        icms: material.icms || 0,
        icms_st: material.icms_st || 0,
        ipi: material.ipi || 0,
        pis: material.pis || 0,
        cofinancas: material.cofins || 0,
        origem: material.origem || 0,
        largura_mm: material.largura_mm || 0,
        altura_mm: material.altura_mm || 0,
        marca: material.marca || ''
      });
    }
  }, [material]);

  // Cálculos em Tempo Real
  const calculos = React.useMemo(() => {
    const custoNF = Number(form.preco_custo || 0);
    const fator = Number(form.fator_conversao || 1);
    const margem = Number(form.margem_lucro || 0);
    
    const custoUnitBruto = custoNF / fator;
    // Perda técnica: 10% para Chapas, 1.0 para outros
    const fatorPerda = form.unidade_compra === 'chapa' ? 1.10 : 1.05;
    const custoComPerda = custoUnitBruto * fatorPerda;
    const precoVendaCalculado = custoComPerda + margem;

    return {
      unitarioBruto: custoUnitBruto,
      perdaPct: (fatorPerda - 1) * 100,
      custoEfetivo: custoComPerda,
      venda: precoVendaCalculado
    };
  }, [form.preco_custo, form.fator_conversao, form.margem_lucro, form.unidade_compra]);

  const handleDimensionChange = (field: 'largura_mm' | 'altura_mm', val: number) => {
    setForm(prev => {
      const next = { ...prev, [field]: val };
      if (next.unidade_compra === 'chapa' && next.unidade_uso === 'm2') {
        const area = (next.largura_mm * next.altura_mm) / 1000000;
        next.fator_conversao = Number(area.toFixed(4));
      }
      
      // Recalcula o preço de venda para manter sincronia
      const custoNF = next.preco_custo;
      const margemVal = next.margem_lucro;
      const fator = next.fator_conversao || 1;
      const fatorPerda = next.unidade_compra === 'chapa' ? 1.10 : 1.05;
      const calcVenda = ((custoNF / fator) * fatorPerda) + margemVal;
      next.preco_venda = Number(calcVenda.toFixed(2));
      
      return next;
    });
  };

  const handleUnitChange = (field: 'unidade_compra' | 'unidade_uso', val: string) => {
    setForm(prev => {
      const next = { ...prev, [field]: val };
      if (next.unidade_compra === 'chapa' && next.unidade_uso === 'm2') {
        const area = (next.largura_mm * next.altura_mm) / 1000000;
        next.fator_conversao = area > 0 ? Number(area.toFixed(4)) : 5.0325;
      } else if (next.unidade_compra === 'rolo 50m' && next.unidade_uso === 'm') {
        next.fator_conversao = 50;
      } else if (next.unidade_compra === 'caixa c/200un' && next.unidade_uso === 'un') {
        next.fator_conversao = 200;
      } else if (next.unidade_compra === 'caixa c/100un' && next.unidade_uso === 'un') {
        next.fator_conversao = 100;
      } else if (next.unidade_compra === 'caixa c/500un' && next.unidade_uso === 'un') {
        next.fator_conversao = 500;
      } else if (next.unidade_compra === 'caixa c/20un' && next.unidade_uso === 'un') {
        next.fator_conversao = 20;
      } else if (next.unidade_compra === next.unidade_uso) {
        next.fator_conversao = 1;
      }
      
      // Recalcula o preço de venda para manter sincronia
      const custoNF = next.preco_custo;
      const margemVal = next.margem_lucro;
      const fator = next.fator_conversao || 1;
      const fatorPerda = next.unidade_compra === 'chapa' ? 1.10 : 1.05;
      const calcVenda = ((custoNF / fator) * fatorPerda) + margemVal;
      next.preco_venda = Number(calcVenda.toFixed(2));
      
      return next;
    });
  };

  const handlePriceChange = (field: 'preco_custo' | 'margem_lucro', value: number) => {
    setForm(prev => {
      const next = { ...prev, [field]: value };
      // Recalcula o preço de venda para manter sincronia no estado antes de salvar
      const custoNF = field === 'preco_custo' ? value : prev.preco_custo;
      const margemVal = field === 'margem_lucro' ? value : prev.margem_lucro;
      const fator = prev.fator_conversao || 1;
      const fatorPerda = prev.unidade_compra === 'chapa' ? 1.10 : 1.05;
      const calcVenda = ((custoNF / fator) * fatorPerda) + margemVal;
      
      return { ...next, preco_venda: Number(calcVenda.toFixed(2)) };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (material) {
        await updateMaterial(material.id, form);
      } else {
        await addMaterial(form);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar material.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={material ? 'Editar Material' : 'Novo Material'}
      size="xl"
    >
      <div className="mb-4">
        <p className="text-sm text-muted-foreground">
          Cadastre as especificações técnicas para controle MRP.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Identificação */}
          <div className="flex flex-col gap-4">
            <h5 className="text-xs font-bold text-primary border-b border-border pb-2 uppercase tracking-wider">
              Identificação
            </h5>
            <div className="flex flex-col gap-4">
              <Input
                label="SKU / Código Único *"
                value={form.sku}
                onChange={e => setForm({...form, sku: e.target.value})}
                required
                placeholder="Ex: MDF-15-BR"
              />
              <Input
                label="Nome Comercial *"
                value={form.nome}
                onChange={e => setForm({...form, nome: e.target.value})}
                required
                placeholder="Ex: Chapa MDF 15mm Branco"
              />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground/90 mb-2">Categoria *</label>
                  <select 
                    className="flex w-full rounded-xl border border-border bg-input px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background" 
                    value={form.categoria_id} 
                    onChange={e => setForm({...form, categoria_id: e.target.value})} 
                    required
                  >
                    <option value="">Selecione...</option>
                    {categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                </div>
                <Input
                  label="Subcategoria"
                  value={form.subcategoria}
                  onChange={e => setForm({...form, subcategoria: e.target.value})}
                  placeholder="Ex: MDF, Ferragem..."
                />
              </div>
              <Input
                label="Marca / Fabricante"
                value={form.marca}
                onChange={e => setForm({...form, marca: e.target.value})}
                placeholder="Ex: Arauco, Duratex, Blum..."
              />
            </div>
          </div>

          {/* Conversão e Logística */}
          <div className="flex flex-col gap-4">
            <h5 className="text-xs font-bold text-primary border-b border-border pb-2 uppercase tracking-wider">
              Conversão e Logística
            </h5>
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground/90 mb-2">Unidade Compra</label>
                  <select 
                    className="flex w-full rounded-xl border border-border bg-input px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background" 
                    value={form.unidade_compra} 
                    onChange={e => handleUnitChange('unidade_compra', e.target.value)}
                  >
                    <option value="chapa">Chapa</option>
                    <option value="rolo 50m">Rolo 50m</option>
                    <option value="caixa c/200un">Caixa c/200un</option>
                    <option value="caixa c/100un">Caixa c/100un</option>
                    <option value="caixa c/500un">Caixa c/500un</option>
                    <option value="caixa c/20un">Caixa c/20un</option>
                    <option value="barra">Barra</option>
                    <option value="un">Unidade</option>
                    <option value="par">Par</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground/90 mb-2">Unidade Uso</label>
                  <select 
                    className="flex w-full rounded-xl border border-border bg-input px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background" 
                    value={form.unidade_uso} 
                    onChange={e => handleUnitChange('unidade_uso', e.target.value)}
                  >
                    <option value="un">Unidade</option>
                    <option value="m">Metro (m)</option>
                    <option value="m2">Metro² (m²)</option>
                    <option value="kg">Quilo (kg)</option>
                    <option value="par">Par</option>
                    <option value="barra">Barra</option>
                  </select>
                </div>
              </div>
              <Input
                type="number"
                step="0.0001"
                label="Fator de Conversão (Compra → Uso)"
                value={form.fator_conversao}
                onChange={e => setForm({...form, fator_conversao: Number(e.target.value)})}
                helperText="Ex: 1 chapa = 5.0325 m². 1 rolo = 50m."
              />
              {(form.unidade_compra === 'chapa' || form.unidade_uso === 'm2') && (
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    type="number"
                    label="Largura Chapa (mm)"
                    value={form.largura_mm}
                    onChange={e => handleDimensionChange('largura_mm', Number(e.target.value))}
                    placeholder="2750"
                  />
                  <Input
                    type="number"
                    label="Altura Chapa (mm)"
                    value={form.altura_mm}
                    onChange={e => handleDimensionChange('altura_mm', Number(e.target.value))}
                    placeholder="1830"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Parâmetros Financeiros e Precificação */}
        <div className="flex flex-col gap-4">
          <h5 className="text-xs font-bold text-primary border-b border-border pb-2 uppercase tracking-wider">
            Parâmetros Financeiros e Precificação
          </h5>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              type="number"
              step="0.01"
              label="Preço Custo (Total NF R$)"
              value={form.preco_custo}
              onChange={e => handlePriceChange('preco_custo', Number(e.target.value))}
            />
            <Input
              type="number"
              step="0.01"
              label="Margem Lucro (Fixo R$)"
              value={form.margem_lucro}
              onChange={e => handlePriceChange('margem_lucro', Number(e.target.value))}
            />
          </div>

          {/* Resumo de Custo Efetivo */}
          <div className="mt-2 p-4 bg-primary/5 border border-dashed border-primary rounded-xl flex flex-col md:flex-row justify-between md:items-center gap-4">
            <div>
              <span className="text-xs text-muted-foreground block font-medium">Resumo de Produção</span>
              <span className="text-sm font-semibold">
                Este material custa <span className="text-primary font-bold">R$ {calculos.custoEfetivo.toFixed(2)}</span> por {form.unidade_uso} efetivo.
              </span>
              <p className="text-xs text-muted-foreground mt-0.5">
                Considerando {calculos.perdaPct}% de perda técnica sobre o custo unitário de R$ {calculos.unitarioBruto.toFixed(2)}.
              </p>
            </div>
            <div className="md:text-right">
              <span className="text-xs text-muted-foreground font-medium">Sugestão de Venda:</span>
              <div className="text-lg font-bold text-success">R$ {calculos.venda.toFixed(2)}</div>
            </div>
          </div>

          <div className="mt-2">
            <label className="block text-sm font-medium text-foreground/90 mb-2">Fornecedor Principal</label>
            <div className="flex gap-2">
              <select
                className="flex-1 rounded-xl border border-border bg-input px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
                value={form.fornecedor_principal}
                onChange={e => {
                  if (e.target.value === 'NEW') {
                    setShowSupplierModal(true);
                  } else {
                    setForm({...form, fornecedor_principal: e.target.value});
                  }
                }}
              >
                <option value="">Selecione um fornecedor...</option>
                <option value="NEW" className="font-bold text-primary">+ Cadastrar Novo Fornecedor</option>
                <optgroup label="Fornecedores Cadastrados">
                  {fornecedores.map(f => (
                    <option key={f.id} value={f.nome}>{f.nome}</option>
                  ))}
                </optgroup>
              </select>
              <Button
                type="button"
                onClick={() => setShowSupplierModal(true)}
                variant="outline"
                className="px-3"
                title="Novo Fornecedor"
              >
                <Plus size={18} />
              </Button>
            </div>
          </div>
        </div>

        {/* Dados Fiscais */}
        <div className="flex flex-col gap-4">
          <h5 className="text-xs font-bold text-primary border-b border-border pb-2 uppercase tracking-wider">
            Informações Fiscais (Brasil)
          </h5>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="CFOP Padrão"
              value={form.cfop}
              onChange={e => setForm({...form, cfop: e.target.value})}
              placeholder="5.101"
            />
            <Input
              label="NCM"
              value={form.ncm}
              onChange={e => setForm({...form, ncm: e.target.value})}
              placeholder="9403.60.00"
            />
            <div>
              <label className="block text-sm font-medium text-foreground/90 mb-2">Origem</label>
              <select 
                className="flex w-full rounded-xl border border-border bg-input px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background" 
                value={form.origem} 
                onChange={e => setForm({...form, origem: Number(e.target.value)})}
              >
                <option value={0}>0 - Nacional</option>
                <option value={1}>1 - Estrangeira (Importação Direta)</option>
                <option value={2}>2 - Estrangeira (Adquirida no Mercado Interno)</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
            <Input
              type="number"
              step="0.01"
              label="ICMS (%)"
              value={form.icms}
              onChange={e => setForm({...form, icms: Number(e.target.value)})}
            />
            <Input
              type="number"
              step="0.01"
              label="ICMS ST (%)"
              value={form.icms_st}
              onChange={e => setForm({...form, icms_st: Number(e.target.value)})}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground/90 mb-2">Observações Internas</label>
          <textarea
            className="flex w-full rounded-xl border border-border bg-input px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
            style={{ height: '80px', resize: 'none' }}
            value={form.observacoes}
            onChange={e => setForm({...form, observacoes: e.target.value})}
          />
        </div>

        {error && <p className="text-destructive text-sm text-center font-semibold">{error}</p>}

        <div className="flex gap-4 justify-end mt-4">
          <Button type="button" variant="outline" onClick={onClose} className="min-w-[120px]">
            Cancelar
          </Button>
          <Button type="submit" isLoading={loading} className="min-w-[160px]">
            <Save size={16} /> Salvar Material
          </Button>
        </div>
      </form>

      {showSupplierModal && (
        <FornecedorFormModal
          onClose={() => setShowSupplierModal(false)}
          onSuccess={() => setShowSupplierModal(false)}
        />
      )}
    </Modal>
  );
};

export default MaterialFormModal;


