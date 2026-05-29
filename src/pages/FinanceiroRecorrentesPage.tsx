import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Repeat, Plus, Trash2, Edit2, Play, ArrowLeft } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../hooks/useConfirm';
import { TableSkeleton } from '../design-system/components/Skeleton';
import { Button, Modal, Card, CardContent, CardHeader, CardTitle, Badge, Input } from '../design-system/components';

export default function FinanceiroRecorrentesPage() {
  const { success, error } = useToast();
  const [ConfirmDialogElement, confirmAction] = useConfirm();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  
  // States para auxiliares
  const [classes, setClasses] = useState<any[]>([]);
  const [fornecedores, setFornecedores] = useState<any[]>([]);
  const [contas, setContas] = useState<any[]>([]);
  const [formas, setFormas] = useState<any[]>([]);

  const [form, setForm] = useState({
    descricao: '',
    tipo: 'pagar',
    valor: 0,
    dia_vencimento: 1,
    classe_financeira_id: '',
    fornecedor_id: '',
    forma_pagamento_id: '',
    conta_bancaria_id: '',
    ativa: true
  });

  const [gerarModal, setGerarModal] = useState(false);
  const [gerarMes, setGerarMes] = useState(new Date().getMonth() + 1);
  const [gerarAno, setGerarAno] = useState(new Date().getFullYear());

  const normalizeList = (value: any) => (Array.isArray(value) ? value : value?.data || []);

  const load = async () => {
    setLoading(true);
    try {
      const [recsRes, clsRes, fornsRes, ctsRes, fmsRes] = await Promise.all([
        api.financeiro.contasRecorrentes.list(),
        api.financeiro.classesFinanceiras.list(),
        api.suppliers.list(),
        api.financeiro.contasInternas.list(),
        api.financeiro.formasPagamento.list()
      ]);
      setRows(normalizeList(recsRes));
      setClasses(normalizeList(clsRes));
      setFornecedores(normalizeList(fornsRes));
      setContas(normalizeList(ctsRes));
      setFormas(normalizeList(fmsRes));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const openNew = () => {
    setEditing(null);
    setForm({
      descricao: '',
      tipo: 'pagar',
      valor: 0,
      dia_vencimento: 1,
      classe_financeira_id: '',
      fornecedor_id: '',
      forma_pagamento_id: '',
      conta_bancaria_id: '',
      ativa: true
    });
    setIsOpen(true);
  };

  const handleEdit = (r: any) => {
    setEditing(r);
    setForm({ ...r });
    setIsOpen(true);
  };

  const save = async () => {
    try {
      if (editing) {
        await api.financeiro.contasRecorrentes.update({ id: editing.id, ...form });
      } else {
        await api.financeiro.contasRecorrentes.create(form);
      }
      setIsOpen(false);
      load();
      success('Configuração salva com sucesso!');
    } catch (e: any) {
      error(e.message || 'Erro ao salvar');
    }
  };

  const doDelete = async (id: string) => {
    const isConfirmed = await confirmAction({
      title: 'Excluir Configuração',
      description: 'Excluir esta configuração de conta recorrente?'
    });
    if (!isConfirmed) return;
    try {
      await api.financeiro.contasRecorrentes.delete(id);
      load();
    } catch (e: any) {
      error(e.message || 'Erro ao excluir');
    }
  };

  const handleGerar = async () => {
    try {
      setLoading(true);
      await api.financeiro.contasRecorrentes.gerarMes(gerarMes, gerarAno);
      success('Títulos gerados com sucesso no Contas a Pagar!');
      setGerarModal(false);
    } catch (e: any) {
      error(e.message || 'Erro ao gerar títulos');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container anim-fade-in" style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <Button 
        variant="ghost" 
        onClick={() => window.location.hash = '#/financeiro'} 
        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))', marginBottom: '1rem', padding: 0, height: 'auto', background: 'transparent' }}
      >
        <ArrowLeft size={16} /> Voltar ao Painel Financeiro
      </Button>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Repeat /> CONTAS RECORRENTES
          </h1>
          <p style={{ color: 'hsl(var(--muted-foreground))' }}>Configuração de despesas fixas e geração automática mensal</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <Button variant="outline" onClick={() => setGerarModal(true)}>
            <Play className="w-4 h-4 mr-1" /> GERAR TÍTULOS DO MÊS
          </Button>
          <Button variant="primary" onClick={openNew}>
            <Plus className="w-4 h-4 mr-1" /> NOVA CONFIGURAÇÃO
          </Button>
        </div>
      </div>

      <Card padding="none" style={{ overflow: 'hidden' }}>
        <table className="table-base">
          <thead>
            <tr>
              <th style={{ width: '40px' }}>STATUS</th>
              <th>DESCRIÇÃO / CONTA FIXA</th>
              <th>DIA VENC.</th>
              <th>CLASSE FINANCEIRA</th>
              <th>FORNECEDOR</th>
              <th style={{ textAlign: 'right' }}>VALOR ESTIMADO</th>
              <th style={{ width: '100px' }}>AÇÕES</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <TableSkeleton rows={4} cols={7} />
            ) : rows.length === 0 ? (
              <tr>
                 <td colSpan={7} style={{ padding: 0 }}>
                    <div className="empty-state" style={{ border: 'none', borderRadius: 0 }}>Nenhuma conta recorrente configurada.</div>
                 </td>
              </tr>
            ) : rows.map(r => (
              <tr key={r.id}>
                <td style={{ textAlign: 'center' }}>
                  {r.ativa ? (
                    <Badge variant="success">ATIVA</Badge>
                  ) : (
                    <Badge variant="secondary">INATIVA</Badge>
                  )}
                </td>
                <td>
                  <div style={{ fontWeight: 700 }}>{r.descricao.toUpperCase()}</div>
                  <div style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>{r.tipo === 'pagar' ? 'DESPESA FIXA' : 'RECEITA FIXA'}</div>
                </td>
                <td style={{ fontWeight: 600 }}>Todo dia {r.dia_vencimento}</td>
                <td>{classes.find(c => c.id === r.classe_financeira_id)?.nome || '---'}</td>
                <td>{fornecedores.find(f => f.id === r.fornecedor_id)?.nome || '---'}</td>
                <td style={{ textAlign: 'right', fontWeight: 900 }}>
                  R$ {Number(r.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleEdit(r)}
                      aria-label={`Editar conta recorrente ${r.descricao}`}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-destructive hover:bg-destructive/10"
                      onClick={() => doDelete(r.id)}
                      aria-label={`Excluir conta recorrente ${r.descricao}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Modal de Configuração */}
      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title={editing ? "Editar Recorrência" : "Nova Conta Recorrente"} size="lg">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div style={{ gridColumn: 'span 2' }}>
            <Input 
              label="Descrição da Conta"
              placeholder="Ex: Aluguel, Internet, Pro-labore"
              value={form.descricao}
              onChange={e => setForm({...form, descricao: e.target.value})}
            />
          </div>

          <div>
            <Input 
              label="Valor Mensal Estimado"
              type="number"
              value={form.valor}
              onChange={e => setForm({...form, valor: Number(e.target.value)})}
            />
          </div>

          <div>
            <Input 
              label="Dia de Vencimento"
              type="number"
              min="1" max="31"
              value={form.dia_vencimento}
              onChange={e => setForm({...form, dia_vencimento: Number(e.target.value)})}
            />
          </div>

          <div className="form-group">
            <label className="mb-2 block text-sm font-medium text-foreground/90">Classe Financeira</label>
            <select className="input-base" value={form.classe_financeira_id} onChange={e => setForm({...form, classe_financeira_id: e.target.value})}>
              <option value="">Selecione...</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.nome.toUpperCase()}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="mb-2 block text-sm font-medium text-foreground/90">Fornecedor (Opcional)</label>
            <select className="input-base" value={form.fornecedor_id} onChange={e => setForm({...form, fornecedor_id: e.target.value})}>
              <option value="">Selecione...</option>
              {fornecedores.map(f => <option key={f.id} value={f.id}>{f.nome.toUpperCase()}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="mb-2 block text-sm font-medium text-foreground/90">Conta Bancária Padrão</label>
            <select className="input-base" value={form.conta_bancaria_id} onChange={e => setForm({...form, conta_bancaria_id: e.target.value})}>
              <option value="">Selecione...</option>
              {contas.map(c => <option key={c.id} value={c.id}>{c.nome.toUpperCase()}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="mb-2 block text-sm font-medium text-foreground/90">Forma de Pagamento</label>
            <select className="input-base" value={form.forma_pagamento_id} onChange={e => setForm({...form, forma_pagamento_id: e.target.value})}>
              <option value="">Selecione...</option>
              {formas.map(f => <option key={f.id} value={f.id}>{f.nome.toUpperCase()}</option>)}
            </select>
          </div>

          <div style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
            <input type="checkbox" checked={form.ativa} onChange={e => setForm({...form, ativa: e.target.checked})} />
            <label style={{ margin: 0 }}>Esta conta está ativa para geração mensal</label>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2rem' }}>
          <Button variant="outline" onClick={() => setIsOpen(false)}>CANCELAR</Button>
          <Button variant="primary" onClick={save}>SALVAR CONFIGURAÇÃO</Button>
        </div>
      </Modal>

      {/* Modal de Geração */}
      <Modal isOpen={gerarModal} onClose={() => setGerarModal(false)} title="Gerar Títulos Mensais" size="sm">
        <p style={{ marginBottom: '1.5rem', fontSize: '0.9rem', color: 'hsl(var(--muted-foreground))' }}>
          Este processo irá criar lançamentos automáticos no <strong>Contas a Pagar</strong> baseados em todas as configurações ativas acima.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="form-group">
            <label className="mb-2 block text-sm font-medium text-foreground/90">Mês</label>
            <select className="input-base" value={gerarMes} onChange={e => setGerarMes(Number(e.target.value))}>
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i+1} value={i+1}>{new Date(2000, i).toLocaleString('pt-BR', { month: 'long' }).toUpperCase()}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="mb-2 block text-sm font-medium text-foreground/90">Ano</label>
            <input type="number" className="input-base" value={gerarAno} onChange={e => setGerarAno(Number(e.target.value))} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2rem' }}>
          <Button variant="outline" onClick={() => setGerarModal(false)}>CANCELAR</Button>
          <Button variant="primary" onClick={handleGerar} isLoading={loading}>
            EXECUTAR GERAÇÃO
          </Button>
        </div>
      </Modal>
      {ConfirmDialogElement}
    </div>
  );
}
