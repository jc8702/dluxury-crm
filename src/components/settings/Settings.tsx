import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useFinanceStore as useFinance } from '../../stores/useFinanceStore';
import { useToast } from '../../context/ToastContext';
import { CardSkeleton } from '../../components/common/Skeleton';
import { api } from '../../lib/api';
import type { ConfiguracaoPrecificacao } from '../../types/entities';
import {
  Button,
  Modal,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
  Input,
} from '../../components/common';

const Settings: React.FC = () => {
  const { user, systemUsers, loadSystemUsers } = useAuth();
  const { addCondicaoPagamento, updateCondicaoPagamento } = useFinance();

  const [profileData, setProfileData] = useState({ email: user?.email || '', password: '' });
  const [subData, setSubData] = useState<{
    status: string;
    plano: string;
    valor: number;
    diaVencimento?: number;
    currentPeriodEnd?: string;
    diasRestantes?: number;
    invoiceUrl?: string;
  } | null>(null);

  const [invoices, setInvoices] = useState<any[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [boletoData, setBoletoData] = useState<{
    codigoBarras: string;
    linkPdf: string;
    vencimento: string;
    valor: number;
  } | null>(null);
  const [showBoletoModal, setShowBoletoModal] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const fetchInvoices = async () => {
    try {
      setLoadingInvoices(true);
      const res = await fetch('/api/checkout/invoices', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      const json = await res.json();
      if (json.success) {
        setInvoices(json.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingInvoices(false);
    }
  };

  const handleGerarBoleto = async () => {
    try {
      const res = await fetch('/api/checkout/gerar-boleto', {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      const json = await res.json();
      if (json.success) {
        setBoletoData(json.data);
        setShowBoletoModal(true);
        toastSuccess('Boleto gerado com sucesso!');
      } else {
        toastError(json.error || 'Erro ao gerar boleto.');
      }
    } catch (err) {
      console.error(err);
      toastError('Erro ao gerar boleto.');
    }
  };

  const handleCancelSubscription = async () => {
    if (
      !confirm(
        'ATENÃ‡ÃƒO: Deseja realmente cancelar sua assinatura? O acesso ao sistema serÃ¡ suspenso imediatamente.',
      )
    )
      return;
    try {
      setCancelling(true);
      const res = await fetch('/api/checkout/cancel', {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      const json = await res.json();
      if (json.success) {
        toastSuccess('Sua assinatura foi cancelada.');
        api.checkout
          .get()
          .then(setSubData)
          .catch(() => {});
        fetchInvoices();
      } else {
        toastError(json.error || 'Erro ao cancelar assinatura.');
      }
    } catch (err) {
      console.error(err);
      toastError('Erro ao solicitar cancelamento.');
    } finally {
      setCancelling(false);
    }
  };

  useEffect(() => {
    api.checkout
      .get()
      .then(setSubData)
      .catch(() => {});
    fetchInvoices();
  }, []);
  const [profileMsg, setProfileMsg] = useState('');

  // GestÃ£o de UsuÃ¡rios
  const [showUserModal, setShowUserModal] = useState(false);
  const [userError, setUserError] = useState('');
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    role: 'vendedor' as const,
  });

  useEffect(() => {
    loadSystemUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // GestÃ£o de CondiÃ§Ãµes de Pagamento
  const [showCondModal, setShowCondModal] = useState(false);
  const [newCond, setNewCond] = useState({ nome: '', n_parcelas: 1 });
  const [editingCondId, setEditingCondId] = useState<string | null>(null);
  const { error: toastError, success: toastSuccess } = useToast();

  const handleAddCond = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCondId) {
        await updateCondicaoPagamento(editingCondId, newCond);
      } else {
        await addCondicaoPagamento(newCond);
      }
      setShowCondModal(false);
      setNewCond({ nome: '', n_parcelas: 1 });
      setEditingCondId(null);
      toastSuccess('CondiÃ§Ã£o salva com sucesso');
    } catch (_err: any) {
      toastError('Erro ao salvar condiÃ§Ã£o');
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserError('');
    try {
      await api.auth.register(newUser);
      await loadSystemUsers();
      setShowUserModal(false);
      setNewUser({ name: '', email: '', password: '', role: 'vendedor' });
    } catch (err: any) {
      setUserError(err.message || 'Erro ao registrar usuÃ¡rio');
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (confirm('Tem certeza que deseja remover este acesso?')) {
      try {
        await api.users.delete(id);
        await loadSystemUsers();
      } catch (err: any) {
        toastError(err.message || 'Erro ao remover usuÃ¡rio');
      }
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMsg('');
    try {
      await api.users.update({
        email: profileData.email,
        password: profileData.password || undefined,
      });
      setProfileMsg('Dados atualizados com sucesso! FaÃ§a login novamente se alterou a senha.');
      setProfileData({ ...profileData, password: '' });
    } catch (err: any) {
      setProfileMsg('Erro: ' + (err.message || 'Falha ao atualizar'));
    }
  };

  return (
    <div className="animate-fade-in flex flex-col gap-8">
      <header>
        <h2 className="text-3xl font-bold tracking-tight text-foreground">
          ConfiguraÃ§Ãµes do Sistema
        </h2>
        <p className="text-muted-foreground text-sm">Gerencie permissÃµes e dados de acesso.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Meus Dados */}
        <Card className="glass">
          <CardHeader>
            <CardTitle>Meus Dados (Admin)</CardTitle>
          </CardHeader>
          <CardContent>
            {profileMsg && (
              <div
                style={{
                  padding: '0.75rem',
                  borderRadius: '8px',
                  marginBottom: '1rem',
                  fontSize: '0.85rem',
                  background: profileMsg.includes('Erro')
                    ? 'rgba(239,68,68,0.1)'
                    : 'rgba(16,185,129,0.1)',
                  color: profileMsg.includes('Erro') ? '#ef4444' : '#10b981',
                }}
              >
                {profileMsg}
              </div>
            )}
            <form onSubmit={handleUpdateProfile} className="flex flex-col gap-4">
              <Input
                required
                type="email"
                label="Novo E-mail de Login"
                value={profileData.email}
                onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
              />
              <Input
                type="password"
                label="Nova Senha (deixe em branco para manter)"
                placeholder="******"
                value={profileData.password}
                onChange={(e) => setProfileData({ ...profileData, password: e.target.value })}
              />
              <Button type="submit" variant="primary" className="w-full mt-2">
                Atualizar Credenciais
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* GestÃ£o de Equipe */}
        <div className="flex flex-col gap-8">
          <Card className="glass">
            <CardHeader className="flex flex-row justify-between items-center space-y-0 pb-4">
              <CardTitle>GestÃ£o de Equipe</CardTitle>
              <Button onClick={() => setShowUserModal(true)} size="sm">
                + Novo Acesso
              </Button>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {systemUsers.map((u) => (
                <div
                  key={u.id}
                  className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-border/40"
                >
                  <div>
                    <p className="font-semibold text-sm text-foreground">{u.name}</p>
                    <p className="text-xs text-muted-foreground">{u.email}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge
                      variant={u.role === 'admin' ? 'warning' : 'secondary'}
                      className="capitalize"
                    >
                      {u.role}
                    </Badge>
                    {user?.id !== u.id && (
                      <button
                        onClick={() => handleDeleteUser(u.id)}
                        className="text-destructive hover:text-destructive/80 transition-colors text-lg font-bold px-1"
                        title="Remover acesso"
                      >
                        Ã—
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {systemUsers.length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhum outro usuÃ¡rio cadastrado.</p>
              )}
            </CardContent>
          </Card>

          <Card className="border-dashed bg-transparent shadow-none border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground font-normal">
                InformaÃ§Ãµes do Sistema
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground leading-relaxed">
                VersÃ£o: 2.0.0-auth
                <br />
                Ambiente: ProduÃ§Ã£o (Neon PostgreSQL)
                <br />
                MÃ³dulo Acesso Multi-usuÃ¡rio: Ativo
                <br />
                {user?.subdominio && (
                  <>
                    Link de Acesso:{' '}
                    <span className="font-semibold text-primary">
                      https://{user.subdominio}.fattoos.com
                    </span>
                  </>
                )}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* PadrÃµes de OrÃ§amento */}
      <Card className="glass">
        <CardHeader>
          <CardTitle className="text-primary flex items-center gap-2">
            ðŸ’° PadrÃµes de OrÃ§amento
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Input
              type="number"
              step="0.1"
              label="Taxa Financeira PadrÃ£o (%)"
              defaultValue={0.0}
            />
            <Input type="number" label="Prazo PadrÃ£o de Entrega (Dias Ãšteis)" defaultValue={45} />
            <Input type="number" label="Adicional de UrgÃªncia (%)" defaultValue={15} />
          </div>
          <p className="text-xs text-muted-foreground italic mt-2">
            * O parcelamento e as taxas agora sÃ£o definidos manualmente em cada transaÃ§Ã£o (Pagar,
            Receber e OrÃ§amentos).
          </p>
        </CardContent>
      </Card>

      <TechnicalPricingSection />

      <NotificationSettingsSection />

      {/* Assinatura e Faturamento */}
      <Card className="glass">
        <CardHeader>
          <CardTitle className="text-primary flex items-center gap-2 text-xl font-bold">
            ðŸ’³ Assinatura e Plano SaaS
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-4 bg-white/5 rounded-2xl border border-border/40">
              <span className="text-xs text-muted-foreground block mb-1">PLANO CONTRATADO</span>
              <span className="font-bold text-lg text-foreground uppercase">
                {subData?.plano || 'PRO'}
              </span>
              <Badge
                variant={
                  subData?.status === 'trial'
                    ? 'warning'
                    : subData?.status === 'active'
                      ? 'success'
                      : 'danger'
                }
                className="ml-2 capitalize"
              >
                {subData?.status === 'trial'
                  ? 'PerÃ­odo de Teste'
                  : subData?.status === 'active'
                    ? 'Ativo'
                    : subData?.status === 'suspended'
                      ? 'Cancelado'
                      : 'Pendente'}
              </Badge>
            </div>
            <div className="p-4 bg-white/5 rounded-2xl border border-border/40">
              <span className="text-xs text-muted-foreground block mb-1">VALOR DA ASSINATURA</span>
              <span className="font-bold text-lg text-foreground">
                R$ {(subData?.valor || 197.0).toFixed(2).replace('.', ',')}
              </span>
              <span className="text-xs text-muted-foreground"> /mÃªs</span>
            </div>
            <div className="p-4 bg-white/5 rounded-2xl border border-border/40">
              <span className="text-xs text-muted-foreground block mb-1">STATUS DE COBRANÃ‡A</span>
              <span className="font-bold text-sm text-foreground block">
                {subData?.status === 'trial'
                  ? `AvaliaÃ§Ã£o ativa: resta(m) ${subData?.diasRestantes || 14} dia(s)`
                  : subData?.currentPeriodEnd
                    ? `PrÃ³ximo vencimento: ${new Date(subData.currentPeriodEnd).toLocaleDateString('pt-BR')}`
                    : 'Aguardando configuraÃ§Ã£o'}
              </span>
            </div>
          </div>

          {/* HistÃ³rico de Faturas Virtuais */}
          <div className="mt-4 space-y-3">
            <h4 className="font-bold text-sm text-foreground tracking-tight">
              HistÃ³rico de Mensalidades
            </h4>
            {loadingInvoices ? (
              <div className="text-xs text-muted-foreground">Carregando histÃ³rico...</div>
            ) : invoices.length === 0 ? (
              <div className="text-xs text-muted-foreground">Nenhuma fatura disponÃ­vel ainda.</div>
            ) : (
              <div className="border border-border/40 rounded-xl overflow-hidden text-xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-white/5 border-b border-border/40 text-muted-foreground font-semibold">
                      <th className="px-4 py-2">CompetÃªncia</th>
                      <th className="px-4 py-2">Valor</th>
                      <th className="px-4 py-2">Vencimento</th>
                      <th className="px-4 py-2">MÃ©todo</th>
                      <th className="px-4 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/20 text-foreground">
                    {invoices.map((invoice) => (
                      <tr key={invoice.id} className="hover:bg-white/5">
                        <td className="px-4 py-2 font-mono">{invoice.competencia}</td>
                        <td className="px-4 py-2 font-semibold">
                          R$ {invoice.valor.toFixed(2).replace('.', ',')}
                        </td>
                        <td className="px-4 py-2">
                          {new Date(invoice.dataVencimento + 'T00:00:00').toLocaleDateString(
                            'pt-BR',
                          )}
                        </td>
                        <td className="px-4 py-2">{invoice.metodoPagamento}</td>
                        <td className="px-4 py-2">
                          <span
                            className={`inline-block px-2 py-0.5 rounded font-semibold text-[10px] uppercase ${
                              invoice.status === 'pago'
                                ? 'bg-emerald-500/10 text-emerald-400'
                                : 'bg-amber-500/10 text-amber-400'
                            }`}
                          >
                            {invoice.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-4 mt-4 border-t border-border/40 pt-4">
            <Button
              onClick={handleGerarBoleto}
              variant="primary"
              className="flex-1 font-semibold"
              disabled={subData?.status === 'suspended'}
            >
              Emitir Boleto do MÃªs
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={handleCancelSubscription}
              className="flex-1 font-semibold text-rose-500 border-rose-500/30 hover:bg-rose-500/10"
              disabled={subData?.status === 'suspended' || cancelling}
            >
              {cancelling ? 'Cancelando...' : 'Cancelar Assinatura'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Modal de Membro de Equipe */}
      {showUserModal && (
        <Modal
          isOpen={showUserModal}
          onClose={() => setShowUserModal(false)}
          title="Novo Membro da Equipe"
          size="md"
        >
          {userError && (
            <div className="text-destructive bg-destructive/10 border border-destructive/20 p-3 rounded-lg mb-4 text-sm">
              {userError}
            </div>
          )}
          <form onSubmit={handleAddUser} className="flex flex-col gap-4">
            <Input
              required
              type="text"
              label="Nome"
              value={newUser.name}
              onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
              placeholder="JoÃ£o Silva"
            />
            <Input
              required
              type="email"
              label="E-mail"
              value={newUser.email}
              onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
              placeholder="joao@dluxury.com"
            />
            <Input
              required
              type="password"
              label="Senha TemporÃ¡ria"
              value={newUser.password}
              onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
              placeholder="******"
            />
            <div className="w-full">
              <label className="mb-2 block text-sm font-medium text-foreground/90">
                Papel (Acesso)
              </label>
              <select
                className="flex w-full rounded-xl border border-border bg-input px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
                value={newUser.role}
                onChange={(e) => setNewUser({ ...newUser, role: e.target.value as any })}
              >
                <option value="vendedor" style={{ background: '#1a1a1a' }}>
                  Vendedor (Comercial)
                </option>
                <option value="marceneiro" style={{ background: '#1a1a1a' }}>
                  Marceneiro (FÃ¡brica)
                </option>
                <option value="admin" style={{ background: '#1a1a1a' }}>
                  Administrador (Total)
                </option>
              </select>
            </div>
            <div className="flex gap-3 mt-4">
              <Button type="submit" variant="primary" className="flex-1">
                Cadastrar
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowUserModal(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {showCondModal && (
        <CondicaoModal
          show={showCondModal}
          onClose={() => setShowCondModal(false)}
          onSave={handleAddCond}
          data={newCond}
          setData={setNewCond}
          isEditing={!!editingCondId}
        />
      )}

      {/* Modal de ExibiÃ§Ã£o de Boleto */}
      {showBoletoModal && boletoData && (
        <Modal
          isOpen={showBoletoModal}
          onClose={() => setShowBoletoModal(false)}
          title="Boleto para Pagamento"
          size="md"
        >
          <div className="space-y-5 text-sm text-foreground">
            <div className="p-4 bg-primary/10 border border-primary/20 rounded-xl space-y-1">
              <div className="font-semibold">Boleto BancÃ¡rio Emitido</div>
              <div className="text-xs text-muted-foreground">
                Use o cÃ³digo abaixo ou baixe o PDF para pagar a mensalidade.
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-xs text-muted-foreground block">Valor</span>
                <span className="font-bold text-foreground">
                  R$ {boletoData.valor.toFixed(2).replace('.', ',')}
                </span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Vencimento</span>
                <span className="font-bold text-foreground">
                  {new Date(boletoData.vencimento + 'T00:00:00').toLocaleDateString('pt-BR')}
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Linha DigitÃ¡vel / CÃ³digo de Barras
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={boletoData.codigoBarras}
                  className="flex-1 bg-white/5 border border-border/40 rounded-lg px-3 py-2 text-xs font-mono select-all focus:outline-none"
                />
                <Button
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(boletoData.codigoBarras);
                    toastSuccess('Linha digitÃ¡vel copiada!');
                  }}
                >
                  Copiar
                </Button>
              </div>
            </div>

            <div className="pt-4 border-t border-border/40 flex items-center justify-end gap-3">
              <a href={boletoData.linkPdf} target="_blank" rel="noopener noreferrer">
                <Button variant="primary">Visualizar Boleto PDF</Button>
              </a>
              <Button variant="outline" onClick={() => setShowBoletoModal(false)}>
                Fechar
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

// Modal CondiÃ§Ã£o de Pagamento
const CondicaoModal: React.FC<{
  show: boolean;
  onClose: () => void;
  onSave: (e: React.FormEvent) => void;
  data: any;
  setData: any;
  isEditing: boolean;
}> = ({ show, onClose, onSave, data, setData, isEditing }) => {
  return (
    <Modal
      isOpen={show}
      onClose={onClose}
      title={isEditing ? 'Editar CondiÃ§Ã£o' : 'Nova CondiÃ§Ã£o de Pagamento'}
      size="sm"
    >
      <form onSubmit={onSave} className="flex flex-col gap-4">
        <Input
          required
          label="Nome da CondiÃ§Ã£o"
          value={data.nome}
          onChange={(e) => setData({ ...data, nome: e.target.value.toUpperCase() })}
          placeholder="EX: 4X CARTÃƒO"
        />
        <Input
          required
          type="number"
          min="1"
          label="NÃºmero de Parcelas"
          value={data.n_parcelas}
          onChange={(e) => setData({ ...data, n_parcelas: Number(e.target.value) })}
        />
        <div className="flex gap-3 mt-4">
          <Button type="submit" variant="primary" className="flex-1">
            Salvar
          </Button>
          <Button type="button" variant="outline" onClick={onClose} className="flex-1">
            Cancelar
          </Button>
        </div>
      </form>
    </Modal>
  );
};

// â”€â”€â”€ SEÃ‡ÃƒO DE CONFIGURAÃ‡Ã•ES DE NOTIFICAÃ‡Ã•ES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const NotificationSettingsSection: React.FC = () => {
  const alerts = [
    {
      title: 'ðŸ“‰ Estoque CrÃ­tico',
      desc: 'Avisa quando materiais atingem o nÃ­vel mÃ­nimo.',
      type: 'estoque',
    },
    {
      title: 'â° Prazos de Projetos',
      desc: 'Alerta sobre entregas previstas para os prÃ³ximos 3 dias.',
      type: 'projeto',
    },
    {
      title: 'ðŸ’° CobranÃ§as Vencidas',
      desc: 'Identifica faturas que passaram da data de vencimento.',
      type: 'financeiro',
    },
    {
      title: 'ðŸ“ OrÃ§amentos s/ Retorno',
      desc: 'Avisa sobre orÃ§amentos enviados hÃ¡ mais de 7 dias.',
      type: 'comercial',
    },
    {
      title: 'ðŸ› ï¸ Garantias Pendentes',
      desc: 'Alerta sobre chamados tÃ©cnicos abertos hÃ¡ mais de 3 dias.',
      type: 'pos-venda',
    },
  ];

  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle className="text-primary flex items-center gap-2 text-xl font-bold">
          ðŸ”” AutomaÃ§Ã£o de Alertas e NotificaÃ§Ãµes
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <p className="text-sm text-muted-foreground">
          O sistema monitora os seguintes eventos automaticamente e gera notificaÃ§Ãµes no sino
          superior para todos os administradores.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {alerts.map((a) => (
            <div
              key={a.type}
              className="p-4 bg-white/5 rounded-2xl border border-border/40 flex flex-col justify-between"
            >
              <div>
                <div className="font-bold text-sm text-foreground mb-1">{a.title}</div>
                <div className="text-xs text-muted-foreground">{a.desc}</div>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                <span className="text-[10px] font-extrabold text-success tracking-wider uppercase">
                  Ativo
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 bg-primary/5 rounded-2xl border border-primary/20">
          <p className="text-xs text-muted-foreground leading-relaxed">
            <strong>Nota:</strong> No momento, as regras de alerta sÃ£o globais. Para solicitar
            alteraÃ§Ãµes nos limites (ex: 7 dias para orÃ§amentos), entre em contato com o suporte
            tÃ©cnico.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

// â”€â”€â”€ SEÃ‡ÃƒO DE PRECIPICAÃ‡ÃƒO TÃ‰CNICA â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const TechnicalPricingSection: React.FC = () => {
  const { error: toastError, success: toastSuccess } = useToast();
  const [config, setConfig] = useState<ConfiguracaoPrecificacao | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.orcamentoTecnico
      .getConfig()
      .then(setConfig)
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    try {
      await api.orcamentoTecnico.updateConfig(config);
      toastSuccess('ConfiguraÃ§Ãµes salvas com sucesso!');
    } catch (_err) {
      toastError('Erro ao salvar configuraÃ§Ãµes');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <CardSkeleton />;

  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle className="text-primary text-xl font-bold">
          ðŸ“ ConfiguraÃ§Ãµes de PrecificaÃ§Ã£o TÃ©cnica (Marcenaria)
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Input
            type="number"
            step="0.01"
            label="Markup PadrÃ£o (x)"
            value={config?.markup_padrao}
            onChange={(e) => setConfig({ ...config!, markup_padrao: Number(e.target.value) })}
          />
          <Input
            type="number"
            step="0.01"
            label="AlÃ­quota de Imposto (%)"
            value={config?.aliquota_imposto}
            onChange={(e) => setConfig({ ...config!, aliquota_imposto: Number(e.target.value) })}
          />
          <Input
            type="number"
            step="0.01"
            label="Margem de Alerta MÃ­nima (%)"
            value={config?.margem_minima_alerta ? config.margem_minima_alerta * 100 : 25}
            onChange={(e) =>
              setConfig({ ...config!, margem_minima_alerta: Number(e.target.value) / 100 })
            }
          />
          <Input
            type="number"
            step="1"
            label="Fator de Perda PadrÃ£o (%)"
            value={config?.fator_perda_padrao}
            onChange={(e) => setConfig({ ...config!, fator_perda_padrao: Number(e.target.value) })}
          />
          <Input
            type="number"
            step="0.01"
            label="M.O. ProduÃ§Ã£o (% do material)"
            value={config?.mo_producao_pct_padrao ? config.mo_producao_pct_padrao * 100 : 30}
            onChange={(e) =>
              setConfig({ ...config!, mo_producao_pct_padrao: Number(e.target.value) / 100 })
            }
          />
          <Input
            type="number"
            step="0.01"
            label="M.O. InstalaÃ§Ã£o (% do material)"
            value={config?.mo_instalacao_pct_padrao ? config.mo_instalacao_pct_padrao * 100 : 15}
            onChange={(e) =>
              setConfig({ ...config!, mo_instalacao_pct_padrao: Number(e.target.value) / 100 })
            }
          />
        </div>
        <Button
          onClick={handleSave}
          disabled={saving}
          isLoading={saving}
          size="lg"
          className="w-full mt-2"
        >
          {saving ? 'SALVANDO...' : 'SALVAR CONFIGURAÃ‡Ã•ES TÃ‰CNICAS'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default Settings;
