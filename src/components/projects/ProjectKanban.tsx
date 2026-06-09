import React, { useState } from 'react';
import KanbanBoard from '../../components/kanban/KanbanBoard';
import { Button, Card } from '../../components/ui';
import { CardBody as CardContent } from '../../components/ui';
import {
  Input,
  Modal,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '../../components/common';
import { useCrmStore as useCRM } from '../../stores/useCrmStore';
import type { ProjectStatus } from '../../types/entities';

const ProjectKanban: React.FC = () => {
  const { projects, clients, addProject, updateProject, removeProject, quotations, events } =
    useCRM();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formData, setFormData] = useState({
    clientId: '',
    ambiente: '',
    descricao: '',
    valorEstimado: '',
    prazoEntrega: '',
    responsavel: '',
    observacoes: '',
    status: 'lead' as ProjectStatus,
    visitaId: 'none',
    orcamentoId: 'none',
  });

  const visitas = events?.filter((e: any) => e.tipo === 'visita') || [];

  const columns = [
    { id: 'lead', title: '🎯 Lead' },
    { id: 'visita_tecnica', title: '📋 Visita Técnica' },
    { id: 'orcamento_enviado', title: '💰 Orçamento Enviado' },
    { id: 'aprovado', title: '✅ Aprovado' },
    { id: 'em_producao', title: '🏭 Em Produção' },
    { id: 'pronto_entrega', title: '📦 Pronto p/ Entrega' },
    { id: 'instalado', title: '🛠️ Instalado' },
    { id: 'concluido', title: '🎉 Concluído' },
  ];

  const ambientes = [
    'Cozinha',
    'Quarto Casal',
    'Quarto Solteiro',
    'Sala de Estar',
    'Banheiro',
    'Lavanderia',
    'Closet',
    'Home Office',
    'Área Gourmet',
    'Varanda',
    'Sala de Jantar',
    'Outro',
  ];

  const handleMove = (id: string, newStatus: string) => {
    updateProject(id, { status: newStatus as ProjectStatus });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const selectedClient = clients.find((c) => c.id === formData.clientId);
    const data = {
      clientId: formData.clientId,
      clientName: selectedClient?.nome || '',
      ambiente: formData.ambiente,
      descricao: formData.descricao,
      valorEstimado: parseFloat(formData.valorEstimado) || undefined,
      prazoEntrega: formData.prazoEntrega || undefined,
      responsavel: formData.responsavel || undefined,
      observacoes: formData.observacoes,
      status: formData.status,
      visitaId: formData.visitaId === 'none' ? undefined : formData.visitaId || undefined,
      orcamentoId: formData.orcamentoId === 'none' ? undefined : formData.orcamentoId || undefined,
    };

    if (editingItem) {
      await updateProject(editingItem.id, data);
    } else {
      await addProject(data);
    }

    closeModal();
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setFormData({
      clientId: item.clientId || '',
      ambiente: item.ambiente || item.title || '',
      descricao: item.descricao || item.description || '',
      valorEstimado: item.valorEstimado?.toString() || item.value?.toString() || '',
      prazoEntrega: item.prazoEntrega || '',
      responsavel: item.responsavel || '',
      observacoes: item.observacoes || item.observations || '',
      status: item.status,
      visitaId: item.visitaId || 'none',
      orcamentoId: item.orcamentoId || item.quotation_id || 'none',
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
    setFormData({
      clientId: '',
      ambiente: '',
      descricao: '',
      valorEstimado: '',
      prazoEntrega: '',
      responsavel: '',
      observacoes: '',
      status: 'lead',
      visitaId: 'none',
      orcamentoId: 'none',
    });
  };

  // Map projects to kanban items format
  const kanbanItems = projects.map((p) => {
    const projOrcamentos = quotations.filter((o) => o.projeto_id === p.id?.toString());
    const vinculado = quotations.find(
      (o) =>
        o.id?.toString() === p.orcamentoId?.toString() ||
        o.id?.toString() === p.quotation_id?.toString(),
    );
    const badges = vinculado
      ? [`📄 ${vinculado.numero}`]
      : projOrcamentos.map((o) => `📄 ${o.numero}`);

    return {
      id: p.id,
      title: p.ambiente,
      subtitle: p.clientName || 'Cliente não identificado',
      label: p.valorEstimado
        ? `R$ ${p.valorEstimado?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
        : '',
      status: p.status,
      type: 'project' as const,
      value: p.valorEstimado,
      badges,
      tag: p.tag,
      clientId: p.clientId,
      clientName: p.clientName,
      ambiente: p.ambiente,
      descricao: p.descricao,
      valorEstimado: p.valorEstimado,
      prazoEntrega: p.prazoEntrega,
      responsavel: p.responsavel,
      observacoes: p.observacoes,
      description: p.descricao,
      observations: p.observacoes,
      visitaId: p.visitaId || p.visita_id,
      orcamentoId: p.orcamentoId || p.quotation_id,
    };
  });

  // Summary stats
  const totalValue = projects.reduce((acc, p) => acc + (p.valorEstimado || 0), 0);
  const inProduction = projects.filter((p) => p.status === 'em_producao').length;
  const approved = projects.filter((p) => p.status === 'aprovado').length;

  return (
    <div className="animate-fade-in flex flex-col gap-8">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Pipeline de Projetos</h2>
          <p className="text-muted-foreground">Acompanhe cada projeto do lead à instalação.</p>
        </div>
        <Button
          onClick={() => {
            setEditingItem(null);
            setIsModalOpen(true);
          }}
        >
          + Novo Projeto
        </Button>
      </header>

      {/* Mini KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-primary">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Total Projetos</p>
            <h4 className="text-2xl font-extrabold text-primary">{projects.length}</h4>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-success">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Aprovados</p>
            <h4 className="text-2xl font-extrabold text-success">{approved}</h4>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Em Produção</p>
            <h4 className="text-2xl font-extrabold text-blue-500">{inProduction}</h4>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Valor Total Pipeline</p>
            <h4 className="text-xl font-extrabold text-amber-500">
              R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h4>
          </CardContent>
        </Card>
      </div>

      <KanbanBoard
        title="Gestão de Projetos"
        items={kanbanItems}
        columns={columns}
        onMove={handleMove}
        onEdit={handleEdit}
        onDelete={removeProject}
      />

      <Modal
        open={isModalOpen}
        onClose={closeModal}
        title={editingItem ? 'Editar Projeto' : 'Novo Projeto'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground/90">Cliente *</label>
              <Select
                value={formData.clientId}
                onValueChange={(val) => setFormData({ ...formData, clientId: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground/90">
                Ambiente *
              </label>
              <Select
                value={formData.ambiente}
                onValueChange={(val) => setFormData({ ...formData, ambiente: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {ambientes.map((a) => (
                    <SelectItem key={a} value={a}>
                      {a}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Valor Estimado (R$)"
              type="number"
              step="0.01"
              placeholder="0,00"
              value={formData.valorEstimado}
              onChange={(e) => setFormData({ ...formData, valorEstimado: e.target.value })}
            />
            <Input
              label="Prazo de Entrega"
              type="date"
              value={formData.prazoEntrega}
              onChange={(e) => setFormData({ ...formData, prazoEntrega: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground/90">
                Vincular Ã Visita
              </label>
              <Select
                value={formData.visitaId}
                onValueChange={(val) => setFormData({ ...formData, visitaId: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Nenhuma visita vinculada" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma visita vinculada</SelectItem>
                  {visitas.map((v: any) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.titulo} - {v.cliente_nome || 'Sem cliente'} (
                      {new Date(v.data_inicio).toLocaleDateString('pt-BR')})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground/90">
                Vincular ao Orçamento
              </label>
              <Select
                value={formData.orcamentoId}
                onValueChange={(val) => setFormData({ ...formData, orcamentoId: val })}
                disabled={!formData.clientId}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      formData.clientId
                        ? 'Nenhum orçamento selecionado'
                        : 'Selecione o cliente primeiro'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum orçamento selecionado</SelectItem>
                  {quotations
                    .filter((o: any) => o.cliente_id?.toString() === formData.clientId?.toString())
                    .map((o: any) => (
                      <SelectItem key={o.id} value={o.id}>
                        Orçamento #{o.numero || o.id.substring(0, 8).toUpperCase()} - R${' '}
                        {parseFloat(o.valor_final || 0).toLocaleString('pt-BR', {
                          minimumFractionDigits: 2,
                        })}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="p-4 bg-primary/5 rounded-xl border border-primary/10 flex justify-between items-center">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                Identificador Ãšnico (TAG)
              </span>
              <span className="text-base font-extrabold text-primary">
                {editingItem?.tag ||
                  `PRJ-${Math.random().toString(36).substring(2, 8).toUpperCase()}`}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                Status Atual
              </span>
              <span className="text-xs font-bold text-primary">
                {formData.status.toUpperCase()}
              </span>
            </div>
          </div>

          <Input
            label="Responsável (Marceneiro)"
            placeholder="Ex: João"
            value={formData.responsavel}
            onChange={(e) => setFormData({ ...formData, responsavel: e.target.value })}
          />

          <div>
            <label className="mb-2 block text-sm font-medium text-foreground/90">
              Descrição do Projeto
            </label>
            <textarea
              className="flex w-full rounded-xl border border-border bg-input px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background min-h-[80px] resize-vertical transition-colors"
              placeholder="Detalhes: materiais, acabamento, referências..."
              value={formData.descricao}
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
            />
          </div>

          <div className="flex gap-4 mt-4">
            <Button type="submit" className="flex-1">
              âœ“ {editingItem ? 'Salvar' : 'Criar Projeto'}
            </Button>
            <Button type="button" variant="secondary" onClick={closeModal}>
              Cancelar
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ProjectKanban;
