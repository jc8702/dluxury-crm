import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Clock,
  Wallet,
  TrendingUp,
  Plus,
  Calendar,
  FileText,
  Coins,
  ExternalLink,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Modal } from '../components/common/Modal';
import { useRH } from '../modules/rh/hooks/useRH';
import { ColaboradorForm } from '../modules/rh/components/ColaboradorForm';
import { PresencaCalendario } from '../modules/rh/components/PresencaCalendario';
import { AdiantamentoModal } from '../modules/rh/components/AdiantamentoModal';
import { api } from '../lib/api';

type Tab = 'colaboradores' | 'presencas' | 'folhas' | 'adiantamentos';

export default function RHPage() {
  const {
    colaboradores,
    loadColaboradores,
    createColaborador,
    updateColaborador,
    deleteColaborador,
    loadFolhas,
    folhas,
    createFolha,
    loadAdiantamentos,
    adiantamentos,
    loadDashboard,
    dashboard,
  } = useRH();

  const [tab, setTab] = useState<Tab>('colaboradores');
  const [showColabForm, setShowColabForm] = useState(false);
  const [editingColab, setEditingColab] = useState<Record<string, any> | null>(null);
  const [showAdiant, setShowAdiant] = useState(false);
  const [competencia, setCompetencia] = useState(() => new Date().toISOString().slice(0, 7));
  const [competenciaPresenca, setCompetenciaPresenca] = useState(() =>
    new Date().toISOString().slice(0, 7),
  );
  const [showGerarFolha, setShowGerarFolha] = useState(false);
  const [novaCompetencia, setNovaCompetencia] = useState(() =>
    new Date().toISOString().slice(0, 7),
  );
  const [loadingGerar, setLoadingGerar] = useState(false);
  const [folhaError, setFolhaError] = useState<string | null>(null);

  useEffect(() => {
    loadColaboradores();
    loadFolhas();
    loadAdiantamentos();
    loadDashboard(competencia);
  }, []);

  useEffect(() => {
    loadDashboard(competencia);
    loadAdiantamentos({ competencia });
  }, [competencia]);

  const handleCreateColab = async (data: any) => {
    if (editingColab) {
      await updateColaborador(editingColab.id, data);
      setEditingColab(null);
    } else {
      await createColaborador(data);
    }
    await loadColaboradores();
  };

  const handleGerarFolha = async () => {
    setFolhaError(null);
    setLoadingGerar(true);
    try {
      await createFolha(novaCompetencia);
      setShowGerarFolha(false);
      await loadFolhas();
      await loadDashboard(competencia);
    } catch (e: any) {
      setFolhaError(e.message);
    } finally {
      setLoadingGerar(false);
    }
  };

  const handleFechar = async (id: string) => {
    if (!confirm('Fechar folha? Isso gerará títulos a pagar.')) return;
    try {
      await api.rh.folhas.fechar(id);
      await loadFolhas();
      await loadDashboard(competencia);
    } catch (e: any) {
      alert(e.message);
    }
  };
  const handleReabrir = async (id: string) => {
    if (!confirm('Reabrir folha?')) return;
    try {
      await api.rh.folhas.reabrir(id);
      await loadFolhas();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const fmt = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

  return (
    <div className="min-h-screen bg-background text-foreground p-6 md:p-8" data-testid="rh-page">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight flex items-center gap-3">
            <span className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-primary-foreground">
              <Users size={20} />
            </span>
            RH & Folha
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Gestão de pessoas, presenças, adiantamentos e distribuição de lucros
          </p>
        </div>
        <Button
          onClick={() => setShowGerarFolha(true)}
          data-testid="btn-gerar-folha"
          className="gap-2"
        >
          <FileText size={16} /> Gerar Folha
        </Button>
      </header>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card data-testid="kpi-custo">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
              <Wallet size={14} /> Custo Total Folha Mês
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black" data-testid="kpi-custo-valor">
              {fmt(dashboard?.custoTotalFolha || 0)}
            </div>
            <div className="text-xs text-muted-foreground">
              Previsto {fmt(dashboard?.custoTotalPrevisto || dashboard?.custoTotalFolha || 0)}
            </div>
          </CardContent>
        </Card>
        <Card data-testid="kpi-he">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
              <Clock size={14} /> HE Prevista vs Real
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm">
              <span className="text-muted-foreground">
                {fmt(dashboard?.totalHorasExtrasPrevisto || 0)}
              </span>{' '}
              <span className="mx-1">→</span>{' '}
              <span className="font-black">{fmt(dashboard?.totalHorasExtras || 0)}</span>
            </div>
            <div className="text-xs text-muted-foreground">Divisor {dashboard?.divisor || 220}</div>
          </CardContent>
        </Card>
        <Card data-testid="kpi-adiant">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
              <Coins size={14} /> Adiantamentos no Mês
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black" data-testid="kpi-adiant-valor">
              {fmt(dashboard?.totalAdiantamentos || 0)}
            </div>
          </CardContent>
        </Card>
        <Card data-testid="kpi-lucro">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
              <TrendingUp size={14} /> Lucro Distribuível (50/50)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-black ${(dashboard?.lucroDistribuivel || 0) < 0 ? 'text-destructive' : 'text-success'}`}
              data-testid="kpi-lucro-valor"
            >
              {fmt(dashboard?.lucroDistribuivel || 0)}
            </div>
            {dashboard?.porSocio?.length ? (
              <div className="text-xs text-muted-foreground">
                {dashboard.porSocio.map((s: any) => `${s.nome}: ${fmt(s.valor)}`).join(' • ')}
              </div>
            ) : (
              <div className="text-xs text-muted-foreground">
                {dashboard?.lucroDistribuivel < 0 ? 'Prejuízo: sem distribuição' : '—'}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4 border-b border-border pb-2" data-testid="rh-tabs">
        {[
          { id: 'colaboradores', label: 'Colaboradores', icon: Users },
          { id: 'presencas', label: 'Presenças', icon: Calendar },
          { id: 'folhas', label: 'Folhas', icon: FileText },
          { id: 'adiantamentos', label: 'Adiantamentos', icon: Coins },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as Tab)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 ${tab === t.id ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'}`}
            data-testid={`tab-${t.id}`}
          >
            <t.icon size={16} />
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'colaboradores' && (
        <Card data-testid="tab-colaboradores">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Colaboradores</CardTitle>
            <Button
              size="sm"
              onClick={() => {
                setEditingColab(null);
                setShowColabForm(true);
              }}
              data-testid="btn-novo-colaborador"
            >
              <Plus size={16} /> Novo Colaborador
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Nome</th>
                    <th className="p-2">Tipo</th>
                    <th className="p-2">Vínculo</th>
                    <th className="p-2">Salário</th>
                    <th className="p-2">Participação</th>
                    <th className="p-2">Ativo</th>
                    <th className="p-2">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {colaboradores.map((c) => (
                    <tr
                      key={c.id}
                      className="border-b hover:bg-muted/50"
                      data-testid={`row-colab-${c.id}`}
                    >
                      <td className="p-2 font-medium">{c.nome}</td>
                      <td className="p-2">
                        <span
                          className={`px-2 py-1 rounded text-xs ${c.tipo === 'socio' ? 'bg-warning/20' : 'bg-muted'}`}
                        >
                          {c.tipo}
                        </span>
                      </td>
                      <td className="p-2">{c.vinculo}</td>
                      <td className="p-2 font-mono">R$ {Number(c.salario_base).toFixed(2)}</td>
                      <td className="p-2">
                        {c.tipo === 'socio' ? `${Number(c.participacao_lucros).toFixed(0)}%` : '—'}
                      </td>
                      <td className="p-2">{c.ativo ? 'Sim' : 'Não'}</td>
                      <td className="p-2 flex gap-2">
                        <button
                          onClick={() => {
                            setEditingColab(c);
                            setShowColabForm(true);
                          }}
                          className="px-3 py-1 rounded bg-muted hover:bg-muted/80 text-xs"
                          data-testid={`btn-edit-${c.id}`}
                        >
                          Editar
                        </button>
                        <button
                          onClick={async () => {
                            if (confirm(`Remover ${c.nome}?`)) {
                              await deleteColaborador(c.id);
                            }
                          }}
                          className="px-3 py-1 rounded bg-destructive/10 hover:bg-destructive/20 text-destructive text-xs"
                          data-testid={`btn-delete-${c.id}`}
                        >
                          Remover
                        </button>
                      </td>
                    </tr>
                  ))}
                  {colaboradores.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-muted-foreground">
                        Nenhum colaborador
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {tab === 'presencas' && (
        <div className="space-y-4" data-testid="tab-presencas">
          <div className="flex items-center gap-3">
            <Input
              type="month"
              value={competenciaPresenca}
              onChange={(e) => setCompetenciaPresenca(e.target.value)}
              data-testid="input-competencia-presenca"
            />
            <span className="text-sm text-muted-foreground">Competência</span>
          </div>
          <PresencaCalendario
            colaboradores={colaboradores}
            competencia={competenciaPresenca}
            onChanged={() => {
              loadDashboard(competencia);
            }}
          />
        </div>
      )}

      {tab === 'folhas' && (
        <Card data-testid="tab-folhas">
          <CardHeader>
            <CardTitle>Folhas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Competência</th>
                    <th className="p-2">Status</th>
                    <th className="p-2">Bruto</th>
                    <th className="p-2">Líquido</th>
                    <th className="p-2">HE</th>
                    <th className="p-2">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {folhas.map((f: any) => (
                    <tr key={f.id} className="border-b" data-testid={`row-folha-${f.id}`}>
                      <td className="p-2 font-mono">{f.competencia}</td>
                      <td className="p-2">
                        <span
                          className={`px-2 py-1 rounded text-xs ${f.status === 'fechada' ? 'bg-success/20 text-success' : 'bg-warning/20'}`}
                        >
                          {f.status}
                        </span>
                      </td>
                      <td className="p-2 font-mono">R$ {Number(f.total_bruto).toFixed(2)}</td>
                      <td className="p-2 font-mono font-bold">
                        R$ {Number(f.total_liquido).toFixed(2)}
                      </td>
                      <td className="p-2 font-mono">
                        R$ {Number(f.total_horas_extras).toFixed(2)}
                      </td>
                      <td className="p-2 flex gap-2">
                        <Link
                          to={`/rh/${f.id}`}
                          className="px-3 py-1 rounded bg-primary text-primary-foreground text-xs flex items-center gap-1"
                          data-testid={`btn-detalhe-${f.id}`}
                        >
                          <ExternalLink size={12} />
                          Abrir
                        </Link>
                        {f.status === 'rascunho' ? (
                          <button
                            onClick={() => handleFechar(f.id)}
                            className="px-3 py-1 rounded bg-success text-success-foreground text-xs"
                            data-testid={`btn-fechar-${f.id}`}
                          >
                            Fechar
                          </button>
                        ) : (
                          <button
                            onClick={() => handleReabrir(f.id)}
                            className="px-3 py-1 rounded bg-muted text-xs"
                            data-testid={`btn-reabrir-${f.id}`}
                          >
                            Reabrir
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {folhas.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-muted-foreground">
                        Nenhuma folha. Clique em Gerar Folha.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {tab === 'adiantamentos' && (
        <Card data-testid="tab-adiantamentos">
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <CardTitle>Adiantamentos</CardTitle>
            <div className="flex items-center gap-2">
              <Input
                type="month"
                value={competencia}
                onChange={(e) => setCompetencia(e.target.value)}
                data-testid="input-competencia-adiant"
                className="w-40"
              />
              <Button
                size="sm"
                onClick={() => setShowAdiant(true)}
                data-testid="btn-novo-adiantamento"
              >
                <Plus size={16} /> Novo Vale
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Colaborador</th>
                    <th className="p-2">Valor</th>
                    <th className="p-2">Data</th>
                    <th className="p-2">Competência</th>
                    <th className="p-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {adiantamentos.map((a: any) => (
                    <tr key={a.id} className="border-b" data-testid={`row-adiant-${a.id}`}>
                      <td className="p-2">{a.colaborador_nome || a.colaborador_id.slice(0, 8)}</td>
                      <td className="p-2 font-mono">R$ {Number(a.valor).toFixed(2)}</td>
                      <td className="p-2">{String(a.data).slice(0, 10)}</td>
                      <td className="p-2 font-mono">{a.competencia_desconto}</td>
                      <td className="p-2">
                        <span
                          className={`px-2 py-1 rounded text-xs ${a.status === 'pendente' ? 'bg-warning/20' : 'bg-success/20'}`}
                        >
                          {a.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {adiantamentos.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-muted-foreground">
                        Nenhum adiantamento
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <ColaboradorForm
        isOpen={showColabForm}
        onClose={() => {
          setShowColabForm(false);
          setEditingColab(null);
        }}
        onSubmit={handleCreateColab}
        initial={editingColab}
      />
      <AdiantamentoModal
        isOpen={showAdiant}
        onClose={() => setShowAdiant(false)}
        colaboradores={colaboradores}
        onCreated={() => {
          loadAdiantamentos({ competencia });
          loadDashboard(competencia);
        }}
      />

      <Modal
        isOpen={showGerarFolha}
        onClose={() => setShowGerarFolha(false)}
        title="Gerar Folha"
        size="sm"
      >
        <div className="space-y-4" data-testid="modal-gerar-folha">
          {folhaError && (
            <div
              className="p-3 rounded bg-destructive/10 text-destructive text-sm"
              data-testid="folha-error"
            >
              {folhaError}
            </div>
          )}
          <Input
            label="Competência (YYYY-MM)"
            value={novaCompetencia}
            onChange={(e) => setNovaCompetencia(e.target.value)}
            placeholder="2026-09"
            data-testid="input-nova-competencia"
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowGerarFolha(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleGerarFolha}
              isLoading={loadingGerar}
              data-testid="btn-confirm-gerar"
            >
              Gerar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
