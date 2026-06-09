import React, { useState, useEffect } from 'react';
import {
  HeartHandshake,
  Plus,
  Clock,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Save,
} from 'lucide-react';
import { api } from '../lib/api';
import { Button, Card } from '../components/ui';
import { CardBody as CardContent } from '../components/ui';
import {
  Input,
  Modal,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '../components/common';
import { useToast } from '../context/ToastContext';
import DataTable from '../components/common/DataTable';

const PosVendaPage: React.FC = () => {
  const { error: toastError } = useToast();
  const [activeTab, setActiveTab] = useState<'abertos' | 'historico' | 'indicadores'>('abertos');
  const [chamados, setChamados] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState<any>(null);

  const [formData, setFormData] = useState({
    cliente_id: '',
    projeto_id: '',
    titulo: '',
    descricao: '',
    tipo: 'garantia',
    prioridade: 'normal',
    data_agendamento: '',
  });

  const [clientes, setClientes] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
    fetchClientes();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [data, statsData] = await Promise.all([
        api.afterSales.list(),
        api.afterSales.getStats(),
      ]);
      setChamados(data);
      setStats(statsData);
    } catch (err) {
      console.error('Failed to fetch after sales data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchClientes = async () => {
    try {
      const data = await api.clients.list();
      setClientes(data);
    } catch (err) {
      console.error('Failed to fetch clients:', err);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.afterSales.create(formData);
      setIsModalOpen(false);
      setFormData({
        cliente_id: '',
        projeto_id: '',
        titulo: '',
        descricao: '',
        tipo: 'garantia',
        prioridade: 'normal',
        data_agendamento: '',
      });
      await fetchData();
    } catch (err: any) {
      toastError('Erro', err.message);
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      await api.afterSales.update({
        id,
        status,
        solucao_aplicada: 'Resolvido via atendimento padrão',
      });
      await fetchData();
    } catch (err) {
      console.error('Update failed:', err);
    }
  };

  const chamadosFiltrados = chamados.filter((c) =>
    activeTab === 'abertos' ? c.status !== 'resolvido' : c.status === 'resolvido',
  );

  return (
    <div className="animate-fade-in flex flex-col gap-8">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <HeartHandshake size={32} className="text-primary" /> Pós-Venda e Garantia
          </h2>
          <p className="text-muted-foreground mt-1">
            Gestão de assistências técnicas e satisfação do cliente.
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus size={20} className="mr-2" /> Novo Chamado
        </Button>
      </header>

      {/* Tabs Menu */}
      <div className="flex gap-2 border-b border-border pb-2">
        <Button
          variant={activeTab === 'abertos' ? 'primary' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('abertos')}
        >
          Chamados Abertos
        </Button>
        <Button
          variant={activeTab === 'historico' ? 'primary' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('historico')}
        >
          Histórico
        </Button>
        <Button
          variant={activeTab === 'indicadores' ? 'primary' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('indicadores')}
        >
          Indicadores
        </Button>
      </div>

      {activeTab === 'indicadores' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="flex flex-col items-center justify-center p-6 text-center">
            <CardContent className="flex flex-col items-center gap-2 p-0">
              <Clock size={32} className="text-primary mb-2" />
              <h4 className="text-sm font-semibold text-muted-foreground">Média de Resolução</h4>
              <p className="text-3xl font-extrabold mt-1">
                {stats?.tempo_medio ? Number(stats.tempo_medio).toFixed(1) : '---'} dias
              </p>
            </CardContent>
          </Card>
          <Card className="flex flex-col items-center justify-center p-6 text-center border-l-4 border-l-destructive">
            <CardContent className="flex flex-col items-center gap-2 p-0">
              <AlertTriangle size={32} className="text-destructive mb-2" />
              <h4 className="text-sm font-semibold text-muted-foreground">Chamados Críticos</h4>
              <p className="text-3xl font-extrabold text-destructive mt-1">
                {chamados.filter((c) => c.prioridade === 'urgente').length}
              </p>
            </CardContent>
          </Card>
          <Card className="flex flex-col items-center justify-center p-6 text-center border-l-4 border-l-success">
            <CardContent className="flex flex-col items-center gap-2 p-0">
              <CheckCircle size={32} className="text-success mb-2" />
              <h4 className="text-sm font-semibold text-muted-foreground">Taxa de Sucesso</h4>
              <p className="text-3xl font-extrabold text-success mt-1">94%</p>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="card p-6">
          <DataTable
            loading={loading}
            headers={['Número', 'Cliente', 'Título', 'Prioridade', 'Status', 'Ações']}
            data={chamadosFiltrados}
            renderRow={(c) => (
              <>
                <td className="p-4">
                  <span className="bg-primary/10 text-primary px-2.5 py-0.5 rounded-full text-xs font-bold border border-primary/20">
                    {c.numero}
                  </span>
                </td>
                <td className="p-4 text-sm font-medium">{c.cliente_nome}</td>
                <td className="p-4">
                  <div className="font-semibold text-sm">{c.titulo}</div>
                  <div className="text-[11px] text-muted-foreground uppercase font-bold">
                    {c.tipo}
                  </div>
                </td>
                <td className="p-4">
                  <span
                    className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase ${
                      c.prioridade === 'urgente'
                        ? 'bg-destructive/10 text-destructive border border-destructive/20'
                        : c.prioridade === 'alta'
                          ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                          : 'bg-primary/10 text-primary border border-primary/20'
                    }`}
                  >
                    {c.prioridade}
                  </span>
                </td>
                <td className="p-4">
                  <span className="bg-muted px-2 py-0.5 rounded text-[11px] font-bold uppercase">
                    {c.status}
                  </span>
                </td>
                <td className="p-4">
                  {c.status !== 'resolvido' && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-success border-success/30 hover:bg-success/10 font-bold"
                      onClick={() => updateStatus(c.id, 'resolvido')}
                    >
                      Resolver
                    </Button>
                  )}
                </td>
              </>
            )}
            emptyMessage="Nenhum chamado registrado."
          />
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Abrir Novo Chamado de Garantia"
        size="lg"
      >
        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-foreground/90">Cliente *</label>
            <Select
              value={String(formData.cliente_id)}
              onValueChange={(val) => setFormData({ ...formData, cliente_id: val })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o cliente" />
              </SelectTrigger>
              <SelectContent>
                {clientes.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Input
            required
            label="Título do Problema *"
            placeholder="Ex: Dobradiça solta / Porta desalinhada"
            value={formData.titulo}
            onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground/90">Tipo</label>
              <Select
                value={formData.tipo}
                onValueChange={(val) => setFormData({ ...formData, tipo: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="garantia">Garantia</SelectItem>
                  <SelectItem value="assistencia">Assistência Técnica</SelectItem>
                  <SelectItem value="ajuste">Ajuste / Regulagem</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground/90">
                Prioridade
              </label>
              <Select
                value={formData.prioridade}
                onValueChange={(val) => setFormData({ ...formData, prioridade: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a prioridade..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="baixa">Baixa</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="urgente">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Input
            type="datetime-local"
            label="Agendamento de Visita"
            value={formData.data_agendamento}
            onChange={(e) => setFormData({ ...formData, data_agendamento: e.target.value })}
          />

          <div>
            <label className="mb-2 block text-sm font-medium text-foreground/90">
              Descrição Detalhada *
            </label>
            <textarea
              required
              className="flex w-full rounded-xl border border-border bg-input px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background min-h-[100px] resize-vertical transition-colors"
              placeholder="Descreva o que aconteceu..."
              value={formData.descricao}
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
            />
          </div>

          <div className="flex gap-4 mt-4">
            <Button type="submit" className="flex-1" disabled={saving}>
              {saving ? (
                <Loader2 className="animate-spin mr-2" size={20} />
              ) : (
                <Save className="mr-2" size={20} />
              )}
              Abrir Chamado
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

export default PosVendaPage;
