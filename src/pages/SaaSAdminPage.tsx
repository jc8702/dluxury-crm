import React, { useState, useEffect } from 'react';
import {
  Building2,
  Users,
  CreditCard,
  Calendar,
  UserPlus,
  Edit3,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  X,
  ChevronRight,
  TrendingUp,
  Sliders,
  DollarSign,
} from 'lucide-react';
import { useToast } from '../context/ToastContext';

interface Tenant {
  id: string;
  nome: string;
  subdominio: string;
  dominioPersonalizado: string | null;
  planoTier: 'basic' | 'pro' | 'enterprise';
  status: 'ativo' | 'inativo' | 'pendente';
  createdAt: string;
  subscription: {
    id: string;
    status: string;
    plano: string;
    valor: number;
    diaVencimento: number;
    currentPeriodEnd: string | null;
  } | null;
}

export default function SaaSAdminPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPlano, setFilterPlano] = useState<string>('all');
  const { addToast } = useToast();

  // Estados dos Modais
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);

  // Formulário de Edição de Plano/Status
  const [editPlano, setEditPlano] = useState<'basic' | 'pro' | 'enterprise'>('pro');
  const [editStatus, setEditStatus] = useState<'ativo' | 'inativo' | 'pendente'>('ativo');
  const [editVencimento, setEditVencimento] = useState('');
  const [editValor, setEditValor] = useState(197.0);
  const [editDiaVencimento, setEditDiaVencimento] = useState(5);
  const [submittingEdit, setSubmittingEdit] = useState(false);

  // Formulário de Criação de Usuário no Tenant
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userRole, setUserRole] = useState('vendedor');
  const [userPassword, setUserPassword] = useState('');
  const [submittingUser, setSubmittingUser] = useState(false);

  // Carregar dados dos tenants
  const fetchTenants = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/saas-admin/tenants', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const json = await res.json();
      if (json.success) {
        setTenants(json.data);
      } else {
        addToast(json.error || 'Erro ao carregar tenants.', 'error');
      }
    } catch (err) {
      console.error(err);
      addToast('Erro de conexão ao buscar tenants.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenants();
  }, []);

  // Abrir modal de edição
  const handleOpenEdit = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setEditPlano(tenant.planoTier);
    setEditStatus(tenant.status);
    setEditValor(
      tenant.subscription?.valor ||
        (tenant.planoTier === 'basic' ? 97 : tenant.planoTier === 'pro' ? 197 : 397),
    );
    setEditDiaVencimento(tenant.subscription?.diaVencimento || 5);

    if (tenant.subscription?.currentPeriodEnd) {
      setEditVencimento(new Date(tenant.subscription.currentPeriodEnd).toISOString().split('T')[0]);
    } else {
      setEditVencimento('');
    }
    setIsEditModalOpen(true);
  };

  // Enviar edição do tenant/assinatura
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTenant) return;

    try {
      setSubmittingEdit(true);
      const res = await fetch('/api/saas-admin/tenants', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          tenantId: selectedTenant.id,
          planoTier: editPlano,
          status: editStatus,
          currentPeriodEnd: editVencimento ? new Date(editVencimento).toISOString() : null,
          diaVencimento: editDiaVencimento,
          valor: editValor,
        }),
      });

      const json = await res.json();
      if (json.success) {
        addToast('Tenant e Assinatura atualizados com sucesso.', 'success');
        setIsEditModalOpen(false);
        fetchTenants();
      } else {
        addToast(json.error || 'Erro ao atualizar dados.', 'error');
      }
    } catch (err) {
      console.error(err);
      addToast('Erro ao salvar edições.', 'error');
    } finally {
      setSubmittingEdit(false);
    }
  };

  // Abrir modal de usuário
  const handleOpenUser = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setUserName('');
    setUserEmail('');
    setUserRole('vendedor');
    setUserPassword('');
    setIsUserModalOpen(true);
  };

  // Criar usuário no tenant selecionado
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTenant) return;

    try {
      setSubmittingUser(true);
      const res = await fetch('/api/saas-admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          tenantId: selectedTenant.id,
          name: userName,
          email: userEmail,
          role: userRole,
          password: userPassword,
        }),
      });

      const json = await res.json();
      if (json.success) {
        addToast(`Usuário cadastrado com sucesso no tenant ${selectedTenant.nome}.`, 'success');
        setIsUserModalOpen(false);
      } else {
        addToast(json.error || 'Erro ao cadastrar usuário.', 'error');
      }
    } catch (err) {
      console.error(err);
      addToast('Erro ao criar usuário.', 'error');
    } finally {
      setSubmittingUser(false);
    }
  };

  // Filtragem local dos tenants
  const filteredTenants = tenants.filter((t) => {
    const matchesSearch =
      t.nome.toLowerCase().includes(search.toLowerCase()) ||
      t.subdominio.toLowerCase().includes(search.toLowerCase()) ||
      (t.dominioPersonalizado &&
        t.dominioPersonalizado.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus = filterStatus === 'all' || t.status === filterStatus;
    const matchesPlano = filterPlano === 'all' || t.planoTier === filterPlano;

    return matchesSearch && matchesStatus && matchesPlano;
  });

  // Métricas
  const totalTenants = tenants.length;
  const activeTenants = tenants.filter((t) => t.status === 'ativo').length;
  const mrrEstimado = tenants
    .filter((t) => t.status === 'ativo' && t.subscription)
    .reduce((acc, t) => acc + (t.subscription?.valor || 0), 0);

  const pendingPayments = tenants.filter((t) => t.subscription?.status === 'overdue').length;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 animate-fade-in">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-2xl font-bold font-display tracking-tight text-foreground flex items-center gap-2">
            <Sliders className="h-6 w-6 text-primary" />
            Painel Administrativo SaaS
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Controle global de tenants, assinaturas, planos de faturamento e usuários do ecossistema
            D'LUXURY CRM.
          </p>
        </div>
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Total Tenants */}
        <div className="bg-card border border-border rounded-xl p-5 flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Total de Tenants
            </span>
            <div className="text-2xl font-bold font-display text-foreground">{totalTenants}</div>
          </div>
          <div className="p-3 rounded-lg bg-primary/10 text-primary">
            <Building2 className="h-6 w-6" />
          </div>
        </div>

        {/* Ativos */}
        <div className="bg-card border border-border rounded-xl p-5 flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Tenants Ativos
            </span>
            <div className="text-2xl font-bold font-display text-emerald-500">{activeTenants}</div>
          </div>
          <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-500">
            <CheckCircle2 className="h-6 w-6" />
          </div>
        </div>

        {/* MRR Estimado */}
        <div className="bg-card border border-border rounded-xl p-5 flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Receita Recorrente (MRR)
            </span>
            <div className="text-2xl font-bold font-display text-primary">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                mrrEstimado,
              )}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-primary/10 text-primary">
            <DollarSign className="h-6 w-6" />
          </div>
        </div>

        {/* Inadimplentes */}
        <div className="bg-card border border-border rounded-xl p-5 flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Inadimplentes (Overdue)
            </span>
            <div className="text-2xl font-bold font-display text-rose-500">{pendingPayments}</div>
          </div>
          <div className="p-3 rounded-lg bg-rose-500/10 text-rose-500">
            <AlertTriangle className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Tabela de Controle e Filtros */}
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        {/* Barra de Filtros */}
        <div className="p-4 border-b border-border flex flex-col md:flex-row items-center gap-4 bg-muted/30">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar por empresa, subdomínio ou domínio..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="flex-1 md:flex-initial bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
            >
              <option value="all">Todos os Status</option>
              <option value="ativo">Ativo</option>
              <option value="inativo">Inativo</option>
              <option value="pendente">Pendente</option>
            </select>

            <select
              value={filterPlano}
              onChange={(e) => setFilterPlano(e.target.value)}
              className="flex-1 md:flex-initial bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
            >
              <option value="all">Todos os Planos</option>
              <option value="basic">Plano Basic</option>
              <option value="pro">Plano Pro</option>
              <option value="enterprise">Plano Enterprise</option>
            </select>
          </div>
        </div>

        {/* Tabela */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12 flex-col gap-3">
              <div className="w-8 h-8 border-2 border-border border-t-primary rounded-full animate-spin" />
              <span className="text-xs text-muted-foreground">
                Carregando tenants cadastrados...
              </span>
            </div>
          ) : filteredTenants.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              Nenhum tenant cadastrado correspondente aos filtros.
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted/40 border-b border-border text-xs font-semibold text-muted-foreground uppercase">
                  <th className="px-6 py-3">Empresa / Subdomínio</th>
                  <th className="px-6 py-3">Plano</th>
                  <th className="px-6 py-3">Mensalidade</th>
                  <th className="px-6 py-3">Assinatura / Vencimento</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-sm text-foreground">
                {filteredTenants.map((tenant) => {
                  const diasRestantes = tenant.subscription?.currentPeriodEnd
                    ? Math.max(
                        0,
                        Math.ceil(
                          (new Date(tenant.subscription.currentPeriodEnd).getTime() - Date.now()) /
                            (1000 * 60 * 60 * 24),
                        ),
                      )
                    : 0;

                  return (
                    <tr key={tenant.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-foreground">{tenant.nome}</div>
                        <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                          <span className="bg-muted px-1.5 py-0.5 rounded border border-border font-mono">
                            {tenant.subdominio}.dluxury.crm
                          </span>
                          {tenant.dominioPersonalizado && (
                            <span className="text-primary font-mono font-medium">
                              ({tenant.dominioPersonalizado})
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                            tenant.planoTier === 'enterprise'
                              ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                              : tenant.planoTier === 'pro'
                                ? 'bg-primary/10 text-primary border-primary/20'
                                : 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
                          }`}
                        >
                          {tenant.planoTier.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-medium text-foreground">
                        {tenant.subscription?.valor
                          ? new Intl.NumberFormat('pt-BR', {
                              style: 'currency',
                              currency: 'BRL',
                            }).format(tenant.subscription.valor)
                          : 'R$ 0,00'}
                      </td>
                      <td className="px-6 py-4">
                        {tenant.subscription?.currentPeriodEnd ? (
                          <div className="space-y-1">
                            <div className="text-xs text-foreground font-medium">
                              {new Date(tenant.subscription.currentPeriodEnd).toLocaleDateString(
                                'pt-BR',
                              )}
                            </div>
                            <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {diasRestantes} dias restantes
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">Sem assinatura</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            tenant.status === 'ativo'
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : tenant.status === 'inativo'
                                ? 'bg-rose-500/10 text-rose-400'
                                : 'bg-amber-500/10 text-amber-400'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              tenant.status === 'ativo'
                                ? 'bg-emerald-400'
                                : tenant.status === 'inativo'
                                  ? 'bg-rose-400'
                                  : 'bg-amber-400'
                            }`}
                          />
                          {tenant.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenUser(tenant)}
                            className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                            title="Criar usuário para este tenant"
                          >
                            <UserPlus className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(tenant)}
                            className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                            title="Editar plano/assinatura"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal 1: Editar Plano / Assinatura */}
      {isEditModalOpen && selectedTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-xl max-w-md w-full overflow-hidden shadow-2xl animate-scale-up">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                Editar Assinatura: {selectedTenant.nome}
              </h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Plano Contratado
                </label>
                <select
                  value={editPlano}
                  onChange={(e) => setEditPlano(e.target.value as any)}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="basic">Basic (R$ 97,00)</option>
                  <option value="pro">Pro (R$ 197,00)</option>
                  <option value="enterprise">Enterprise (R$ 397,00)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Status da Conta
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as any)}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="ativo">Ativo</option>
                  <option value="inativo">Inativo</option>
                  <option value="pendente">Pendente / Overdue</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Valor Mensal (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editValor}
                    onChange={(e) => setEditValor(parseFloat(e.target.value))}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Dia do Vencimento
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="28"
                    value={editDiaVencimento}
                    onChange={(e) => setEditDiaVencimento(parseInt(e.target.value))}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Data de Vencimento do Acesso
                </label>
                <input
                  type="date"
                  value={editVencimento}
                  onChange={(e) => setEditVencimento(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <span className="text-[11px] text-muted-foreground">
                  Define quando o período de trial ou acesso pago expira.
                </span>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-border mt-6">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 border border-border text-sm text-muted-foreground rounded-lg hover:bg-muted"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingEdit}
                  className="px-4 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:bg-primary/95 flex items-center gap-2"
                >
                  {submittingEdit ? (
                    <>
                      <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    'Salvar Alterações'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Adicionar Usuário ao Tenant */}
      {isUserModalOpen && selectedTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-xl max-w-md w-full overflow-hidden shadow-2xl animate-scale-up">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-primary" />
                Criar Usuário: {selectedTenant.nome}
              </h3>
              <button
                onClick={() => setIsUserModalOpen(false)}
                className="p-1 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Nome Completo
                </label>
                <input
                  type="text"
                  placeholder="Ex: João da Silva"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  E-mail
                </label>
                <input
                  type="email"
                  placeholder="Ex: joao@empresa.com"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Nível de Acesso (Role)
                </label>
                <select
                  value={userRole}
                  onChange={(e) => setUserRole(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="admin">Administrador (Acesso Total)</option>
                  <option value="producao">Gerente de Produção</option>
                  <option value="vendedor">Vendedor / Comercial</option>
                  <option value="financeiro">Analista Financeiro</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Senha Provisória
                </label>
                <input
                  type="password"
                  placeholder="Mínimo 8 caracteres"
                  value={userPassword}
                  onChange={(e) => setUserPassword(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  required
                  minLength={8}
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-border mt-6">
                <button
                  type="button"
                  onClick={() => setIsUserModalOpen(false)}
                  className="px-4 py-2 border border-border text-sm text-muted-foreground rounded-lg hover:bg-muted"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingUser}
                  className="px-4 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:bg-primary/95 flex items-center gap-2"
                >
                  {submittingUser ? (
                    <>
                      <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                      Criando...
                    </>
                  ) : (
                    'Criar Usuário'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
