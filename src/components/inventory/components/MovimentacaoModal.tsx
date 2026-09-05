import React, { useState, useMemo, useEffect } from 'react';
import { useInventoryStore as useInventory } from '../../../stores/useInventoryStore';
import { useCrmStore as useCRM } from '../../../stores/useCrmStore';
import type { Material } from '../../../types/entities';
import { ArrowUpCircle, ArrowDownCircle, Settings2 } from 'lucide-react';
import { Modal } from '../../../components/common';
import { Button, Input } from '../../../components/ui';
import { api } from '../../../lib/api';

interface MovimentacaoModalProps {
  material: Material;
  onClose: () => void;
  onSuccess: () => void;
}

const MovimentacaoModal: React.FC<MovimentacaoModalProps> = ({ material, onClose, onSuccess }) => {
  const { registrarMovimentacao } = useInventory();
  const { projects, quotations } = useCRM();
  const [tipo, setTipo] = useState<'entrada' | 'saida' | 'ajuste'>('entrada');
  const [quantidade, setQuantidade] = useState<number>(0);
  const [motivo, setMotivo] = useState('');
  const [projetoId, setProjetoId] = useState('');
  const [orcamentoId, setOrcamentoId] = useState('');
  const [precoUnitario, setPrecoUnitario] = useState<number>(material.preco_custo || 0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [titulos, setTitulos] = useState<any[]>([]);
  const [loadingTitulos, setLoadingTitulos] = useState(false);
  const [selecaoNF, setSelecaoNF] = useState<string>('');
  const [notaFiscal, setNotaFiscal] = useState<string>('');

  useEffect(() => {
    if (tipo === 'entrada') {
      setLoadingTitulos(true);
      api.financeiro.titulosPagar
        .list()
        .then((res) => {
          const list = Array.isArray(res) ? res : res?.data || [];
          let filtered = list;
          if (material.fornecedor_principal) {
            filtered = list.filter(
              (t: any) => String(t.fornecedor_id) === String(material.fornecedor_principal),
            );
          }
          setTitulos(filtered);
        })
        .catch((err) => console.error('Erro ao carregar títulos para notas fiscais:', err))
        .finally(() => setLoadingTitulos(false));
    } else {
      setTitulos([]);
      setNotaFiscal('');
      setSelecaoNF('');
    }
  }, [tipo, material.fornecedor_principal]);

  const notasFiscaisUnicas = useMemo(() => {
    const nfs = titulos
      .map((t: any) => t.nota_fiscal)
      .filter((nf: any) => nf && typeof nf === 'string' && nf.trim() !== '');
    return Array.from(new Set(nfs)) as string[];
  }, [titulos]);

  const equivalencia = useMemo(() => {
    const qty = Number(quantidade || 0);
    const factor = Number(material.fator_conversao || 1);
    return qty * factor;
  }, [quantidade, material.fator_conversao]);

  const novoEstoque = useMemo(() => {
    const atual = Number(material.estoque_atual || 0);
    const qty = Number(quantidade || 0);
    if (tipo === 'entrada') return atual + qty;
    if (tipo === 'saida') return atual - qty;
    if (tipo === 'ajuste') return qty;
    return atual;
  }, [tipo, quantidade, material.estoque_atual]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (quantidade <= 0 && tipo !== 'ajuste') {
      setError('A quantidade deve ser maior que zero.');
      return;
    }
    if (tipo === 'saida' && novoEstoque < 0) {
      setError('Estoque insuficiente.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await registrarMovimentacao({
        material_id: material.id,
        tipo,
        quantidade,
        motivo,
        projeto_id: projetoId || null,
        quotation_id: orcamentoId || null,
        preco_unitario: tipo === 'entrada' ? precoUnitario : null,
        nota_fiscal: tipo === 'entrada' && notaFiscal.trim() !== '' ? notaFiscal.trim() : null,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao registrar movimentação.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={true} onClose={onClose} title="Registrar Movimentação" size="md">
      <div className="mb-4">
        <p className="text-sm text-muted-foreground">{material.nome}</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="flex gap-2 bg-foreground/5 p-1.5 rounded-xl">
          {[
            {
              id: 'entrada',
              label: 'Entrada',
              icon: <ArrowUpCircle size={18} />,
              color: '#28A745',
            },
            { id: 'saida', label: 'Saída', icon: <ArrowDownCircle size={18} />, color: '#DC3545' },
            { id: 'ajuste', label: 'Ajuste', icon: <Settings2 size={18} />, color: '#0D66CC' },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTipo(t.id as any)}
              className="flex-1 flex items-center justify-center gap-2 p-2.5 rounded-lg border-none cursor-pointer text-sm font-bold transition-all"
              style={{
                background: tipo === t.id ? t.color : 'transparent',
                color:
                  tipo === t.id ? 'hsl(var(--accent-foreground))' : 'hsl(var(--muted-foreground))',
              }}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Input
              type="number"
              step="0.0001"
              label={`Quantidade (${material.unidade_compra})`}
              value={quantidade}
              onChange={(e) => setQuantidade(Number(e.target.value))}
              autoFocus
            />
            <p className="text-xs text-primary mt-1 font-semibold">
              = {equivalencia.toFixed(2)} {material.unidade_uso}
            </p>
          </div>
          {tipo === 'entrada' && (
            <div>
              <Input
                type="number"
                step="0.01"
                label="Preço Custo (R$)"
                value={precoUnitario}
                onChange={(e) => setPrecoUnitario(Number(e.target.value))}
              />
            </div>
          )}
        </div>

        <div>
          <Input
            label="Motivo / Referência"
            placeholder="Ex: Compra NF 123, Consumo projeto X..."
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            required
          />
        </div>

        {tipo === 'entrada' && (
          <div className="grid grid-cols-2 gap-4 animate-fade-in">
            <div>
              <label className="block text-sm font-medium text-foreground/90 mb-2">
                Nota Fiscal{' '}
                {loadingTitulos && (
                  <span className="text-xs text-muted-foreground">(carregando...)</span>
                )}
              </label>
              <select
                className="flex w-full rounded-xl border border-border bg-input px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
                value={selecaoNF}
                onChange={(e) => {
                  setSelecaoNF(e.target.value);
                  if (e.target.value !== 'manual') {
                    setNotaFiscal(e.target.value);
                  } else {
                    setNotaFiscal('');
                  }
                }}
              >
                <option value="">Nenhuma / Sem NF</option>
                {notasFiscaisUnicas.map((nf) => (
                  <option key={nf} value={nf}>
                    NF {nf}
                  </option>
                ))}
                <option value="manual">+ Digitar Manualmente...</option>
              </select>
            </div>
            {(selecaoNF === 'manual' || notasFiscaisUnicas.length === 0) && (
              <div className="animate-fade-in">
                <Input
                  label="Número da NF"
                  placeholder="Ex: 000123"
                  value={notaFiscal}
                  onChange={(e) => setNotaFiscal(e.target.value)}
                />
              </div>
            )}
          </div>
        )}

        {tipo === 'saida' && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground/90 mb-2">
                Projeto (Opcional)
              </label>
              <select
                className="flex w-full rounded-xl border border-border bg-input px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
                value={projetoId}
                onChange={(e) => setProjetoId(e.target.value)}
              >
                <option value="">Selecione...</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.clientName} - {p.ambiente}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground/90 mb-2">
                Orçamento (Opcional)
              </label>
              <select
                className="flex w-full rounded-xl border border-border bg-input px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
                value={orcamentoId}
                onChange={(e) => setOrcamentoId(e.target.value)}
              >
                <option value="">Selecione...</option>
                {quotations.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.numero}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        <div className="p-4 bg-foreground/5 rounded-xl mt-2 flex flex-col gap-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Estoque Atual:</span>
            <span className="font-semibold">
              {material.estoque_atual} {material.unidade_compra}
            </span>
          </div>
          <div
            className={`flex justify-between text-base font-bold ${novoEstoque < 0 ? 'text-destructive' : 'text-primary'}`}
          >
            <span>Novo Estoque:</span>
            <span>
              {novoEstoque.toFixed(4)} {material.unidade_compra}
            </span>
          </div>
        </div>

        {error && <p className="text-destructive text-sm text-center font-semibold">{error}</p>}

        <div className="flex gap-4 mt-2">
          <Button type="button" variant="outline" onClick={onClose} className="flex-1">
            Cancelar
          </Button>
          <Button
            type="submit"
            isLoading={loading}
            disabled={tipo === 'saida' && novoEstoque < 0}
            className="flex-1"
          >
            Confirmar
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default MovimentacaoModal;
