import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { useToast } from '../../context/ToastContext';
import { CardSkeleton } from '../../design-system/components/Skeleton';
import { api } from '../../lib/api';
import type { ConfiguracaoPrecificacao } from '../../context/AppContext';
import { Button, Modal, Card, CardHeader, CardTitle, CardContent, Badge, Input } from '../../design-system/components';

const Settings: React.FC = () => {
  const { 
    user, systemUsers, loadSystemUsers,
    addCondicaoPagamento, updateCondicaoPagamento
  } = useAppContext();

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

  useEffect(() => {
    api.checkout.get()
      .then(setSubData)
      .catch(() => {});
  }, []);
  const [profileMsg, setProfileMsg] = useState('');

  // Gestão de Usuários
  const [showUserModal, setShowUserModal] = useState(false);
  const [userError, setUserError] = useState('');
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'vendedor' as const });

  useEffect(() => {
    loadSystemUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Gestão de Condições de Pagamento
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
      toastSuccess('Condição salva com sucesso');
    } catch (_err: any) {
      toastError('Erro ao salvar condição');
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
      setUserError(err.message || 'Erro ao registrar usuário');
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (confirm('Tem certeza que deseja remover este acesso?')) {
      try {
        await api.users.delete(id);
        await loadSystemUsers();
      } catch (err: any) {
        toastError(err.message || 'Erro ao remover usuário');
      }
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMsg('');
    try {
      await api.users.update({ email: profileData.email, password: profileData.password || undefined });
      setProfileMsg('Dados atualizados com sucesso! Faça login novamente se alterou a senha.');
      setProfileData({ ...profileData, password: '' });
    } catch (err: any) {
      setProfileMsg('Erro: ' + (err.message || 'Falha ao atualizar'));
    }
  };

  return (
    <div className="animate-fade-in flex flex-col gap-8">
      <header>
        <h2 className="text-3xl font-bold tracking-tight text-foreground">Configurações do Sistema</h2>
        <p className="text-muted-foreground text-sm">Gerencie permissões e dados de acesso.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Meus Dados */}
        <Card className="glass">
          <CardHeader>
            <CardTitle>Meus Dados (Admin)</CardTitle>
          </CardHeader>
          <CardContent>
            {profileMsg && (
              <div style={{ 
                padding: '0.75rem', 
                borderRadius: '8px', 
                marginBottom: '1rem', 
                fontSize: '0.85rem', 
                background: profileMsg.includes('Erro') ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)', 
                color: profileMsg.includes('Erro') ? '#ef4444' : '#10b981' 
              }}>
                {profileMsg}
              </div>
            )}
            <form onSubmit={handleUpdateProfile} className="flex flex-col gap-4">
              <Input 
                required 
                type="email" 
                label="Novo E-mail de Login" 
                value={profileData.email} 
                onChange={e => setProfileData({...profileData, email: e.target.value})} 
              />
              <Input 
                type="password" 
                label="Nova Senha (deixe em branco para manter)" 
                placeholder="******"
                value={profileData.password} 
                onChange={e => setProfileData({...profileData, password: e.target.value})} 
              />
              <Button type="submit" variant="primary" className="w-full mt-2">
                Atualizar Credenciais
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Gestão de Equipe */}
        <div className="flex flex-col gap-8">
          <Card className="glass">
            <CardHeader className="flex flex-row justify-between items-center space-y-0 pb-4">
              <CardTitle>Gestão de Equipe</CardTitle>
              <Button onClick={() => setShowUserModal(true)} size="sm">
                + Novo Acesso
              </Button>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {systemUsers.map(u => (
                <div key={u.id} className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-border/40">
                  <div>
                    <p className="font-semibold text-sm text-foreground">{u.name}</p>
                    <p className="text-xs text-muted-foreground">{u.email}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={u.role === 'admin' ? 'warning' : 'secondary'} className="capitalize">
                      {u.role}
                    </Badge>
                    {user?.id !== u.id && (
                      <button 
                        onClick={() => handleDeleteUser(u.id)} 
                        className="text-destructive hover:text-destructive/80 transition-colors text-lg font-bold px-1"
                        title="Remover acesso"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {systemUsers.length === 0 && <p className="text-sm text-muted-foreground">Nenhum outro usuário cadastrado.</p>}
            </CardContent>
          </Card>

          <Card className="border-dashed bg-transparent shadow-none border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground font-normal">Informações do Sistema</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Versão: 2.0.0-auth<br/>
                Ambiente: Produção (Neon PostgreSQL)<br/>
                Módulo Acesso Multi-usuário: Ativo<br/>
                {user?.subdominio && (
                  <>Link de Acesso: <span className="font-semibold text-primary">https://{user.subdominio}.fattoos.com</span></>
                )}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Padrões de Orçamento */}
      <Card className="glass">
        <CardHeader>
          <CardTitle className="text-primary flex items-center gap-2">
            💰 Padrões de Orçamento
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Input 
              type="number" 
              step="0.1" 
              label="Taxa Financeira Padrão (%)" 
              defaultValue={0.0} 
            />
            <Input 
              type="number" 
              label="Prazo Padrão de Entrega (Dias Úteis)" 
              defaultValue={45} 
            />
            <Input 
              type="number" 
              label="Adicional de Urgência (%)" 
              defaultValue={15} 
            />
          </div>
          <p className="text-xs text-muted-foreground italic mt-2">
            * O parcelamento e as taxas agora são definidos manualmente em cada transação (Pagar, Receber e Orçamentos).
          </p>
        </CardContent>
      </Card>

      <TechnicalPricingSection />
      
      <NotificationSettingsSection />

      {/* Assinatura e Faturamento */}
      <Card className="glass">
        <CardHeader>
          <CardTitle className="text-primary flex items-center gap-2 text-xl font-bold">
            💳 Assinatura e Plano SaaS
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-4 bg-white/5 rounded-2xl border border-border/40">
              <span className="text-xs text-muted-foreground block mb-1">PLANO CONTRATADO</span>
              <span className="font-bold text-lg text-foreground uppercase">{subData?.plano || 'PRO'}</span>
              <Badge variant="warning" className="ml-2 capitalize">
                {subData?.status === 'trial' ? 'Período de Teste' : subData?.status === 'active' ? 'Ativo' : 'Pendente'}
              </Badge>
            </div>
            <div className="p-4 bg-white/5 rounded-2xl border border-border/40">
              <span className="text-xs text-muted-foreground block mb-1">VALOR DA ASSINATURA</span>
              <span className="font-bold text-lg text-foreground">
                R$ {(subData?.valor || 197.00).toFixed(2).replace('.', ',')}
              </span>
              <span className="text-xs text-muted-foreground"> /mês</span>
            </div>
            <div className="p-4 bg-white/5 rounded-2xl border border-border/40">
              <span className="text-xs text-muted-foreground block mb-1">STATUS DE COBRANÇA</span>
              <span className="font-bold text-sm text-foreground block">
                {subData?.status === 'trial' 
                  ? `Avaliação activa: resta(m) ${subData?.diasRestantes || 14} dia(s)`
                  : subData?.currentPeriodEnd 
                    ? `Próximo vencimento: ${new Date(subData.currentPeriodEnd).toLocaleDateString('pt-BR')}`
                    : 'Aguardando configuração'}
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 mt-2">
            {subData?.invoiceUrl ? (
              <a 
                href={subData.invoiceUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ textDecoration: 'none' }}
                className="flex-1"
              >
                <Button variant="primary" className="w-full">
                  GERENCIAR PAGAMENTOS & FATURAS (ASAAS)
                </Button>
              </a>
            ) : (
              <Button 
                onClick={() => window.location.hash = '#/checkout'} 
                variant="primary" 
                className="flex-1"
              >
                CONFIGURAR FORMA DE PAGAMENTO
              </Button>
            )}
            
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => alert('Para alterar seu plano ou solicitar o cancelamento da assinatura, por favor envie um e-mail para comercial@dluxury-crm.vercel.app')}
              className="flex-1"
            >
              Alterar Plano / Cancelar Assinatura
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Modal de Membro de Equipe */}
      {showUserModal && (
        <Modal isOpen={showUserModal} onClose={() => setShowUserModal(false)} title="Novo Membro da Equipe" size="md">
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
              onChange={e => setNewUser({...newUser, name: e.target.value})} 
              placeholder="João Silva" 
            />
            <Input 
              required 
              type="email" 
              label="E-mail"
              value={newUser.email} 
              onChange={e => setNewUser({...newUser, email: e.target.value})} 
              placeholder="joao@dluxury.com" 
            />
            <Input 
              required 
              type="password" 
              label="Senha Temporária"
              value={newUser.password} 
              onChange={e => setNewUser({...newUser, password: e.target.value})} 
              placeholder="******" 
            />
            <div className="w-full">
              <label className="mb-2 block text-sm font-medium text-foreground/90">Papel (Acesso)</label>
              <select 
                className="flex w-full rounded-xl border border-border bg-input px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
                value={newUser.role} 
                onChange={e => setNewUser({...newUser, role: e.target.value as any})}
              >
                <option value="vendedor" style={{ background: '#1a1a1a' }}>Vendedor (Comercial)</option>
                <option value="marceneiro" style={{ background: '#1a1a1a' }}>Marceneiro (Fábrica)</option>
                <option value="admin" style={{ background: '#1a1a1a' }}>Administrador (Total)</option>
              </select>
            </div>
            <div className="flex gap-3 mt-4">
              <Button type="submit" variant="primary" className="flex-1">Cadastrar</Button>
              <Button type="button" variant="outline" onClick={() => setShowUserModal(false)} className="flex-1">Cancelar</Button>
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
    </div>
  );
};

// Modal Condição de Pagamento
const CondicaoModal: React.FC<{ 
  show: boolean, 
  onClose: () => void, 
  onSave: (e: React.FormEvent) => void, 
  data: any, 
  setData: any, 
  isEditing: boolean 
}> = ({ show, onClose, onSave, data, setData, isEditing }) => {
  return (
    <Modal isOpen={show} onClose={onClose} title={isEditing ? 'Editar Condição' : 'Nova Condição de Pagamento'} size="sm">
      <form onSubmit={onSave} className="flex flex-col gap-4">
        <Input 
          required 
          label="Nome da Condição" 
          value={data.nome} 
          onChange={e => setData({...data, nome: e.target.value.toUpperCase()})} 
          placeholder="EX: 4X CARTÃO" 
        />
        <Input 
          required 
          type="number" 
          min="1" 
          label="Número de Parcelas" 
          value={data.n_parcelas} 
          onChange={e => setData({...data, n_parcelas: Number(e.target.value)})} 
        />
        <div className="flex gap-3 mt-4">
          <Button type="submit" variant="primary" className="flex-1">Salvar</Button>
          <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancelar</Button>
        </div>
      </form>
    </Modal>
  );
};

// ─── SEÇÃO DE CONFIGURAÇÕES DE NOTIFICAÇÕES ────────────────
const NotificationSettingsSection: React.FC = () => {
  const alerts = [
    { title: '📉 Estoque Crítico', desc: 'Avisa quando materiais atingem o nível mínimo.', type: 'estoque' },
    { title: '⏰ Prazos de Projetos', desc: 'Alerta sobre entregas previstas para os próximos 3 dias.', type: 'projeto' },
    { title: '💰 Cobranças Vencidas', desc: 'Identifica faturas que passaram da data de vencimento.', type: 'financeiro' },
    { title: '📝 Orçamentos s/ Retorno', desc: 'Avisa sobre orçamentos enviados há mais de 7 dias.', type: 'comercial' },
    { title: '🛠️ Garantias Pendentes', desc: 'Alerta sobre chamados técnicos abertos há mais de 3 dias.', type: 'pos-venda' },
  ];

  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle className="text-primary flex items-center gap-2 text-xl font-bold">
          🔔 Automação de Alertas e Notificações
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <p className="text-sm text-muted-foreground">
          O sistema monitora os seguintes eventos automaticamente e gera notificações no sino superior para todos os administradores.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {alerts.map(a => (
            <div key={a.type} className="p-4 bg-white/5 rounded-2xl border border-border/40 flex flex-col justify-between">
              <div>
                <div className="font-bold text-sm text-foreground mb-1">{a.title}</div>
                <div className="text-xs text-muted-foreground">{a.desc}</div>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                <span className="text-[10px] font-extrabold text-success tracking-wider uppercase">Ativo</span>
              </div>
            </div>
          ))}
        </div>
        
        <div className="p-4 bg-primary/5 rounded-2xl border border-primary/20">
          <p className="text-xs text-muted-foreground leading-relaxed">
            <strong>Nota:</strong> No momento, as regras de alerta são globais. Para solicitar alterações nos limites (ex: 7 dias para orçamentos), entre em contato com o suporte técnico.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

// ─── SEÇÃO DE PRECIPICAÇÃO TÉCNICA ───────────────────────
const TechnicalPricingSection: React.FC = () => {
  const { error: toastError, success: toastSuccess } = useToast();
  const [config, setConfig] = useState<ConfiguracaoPrecificacao | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.orcamentoTecnico.getConfig()
      .then(setConfig)
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    try {
      await api.orcamentoTecnico.updateConfig(config);
      toastSuccess('Configurações salvas com sucesso!');
    } catch (_err) {
      toastError('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <CardSkeleton />;

  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle className="text-primary text-xl font-bold">
          📐 Configurações de Precificação Técnica (Marcenaria)
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Input 
            type="number" 
            step="0.01" 
            label="Markup Padrão (x)" 
            value={config?.markup_padrao} 
            onChange={e => setConfig({...config!, markup_padrao: Number(e.target.value)})} 
          />
          <Input 
            type="number" 
            step="0.01" 
            label="Alíquota de Imposto (%)" 
            value={config?.aliquota_imposto} 
            onChange={e => setConfig({...config!, aliquota_imposto: Number(e.target.value)})} 
          />
          <Input 
            type="number" 
            step="0.01" 
            label="Margem de Alerta Mínima (%)" 
            value={config?.margem_minima_alerta ? config.margem_minima_alerta * 100 : 25} 
            onChange={e => setConfig({...config!, margem_minima_alerta: Number(e.target.value) / 100})} 
          />
          <Input 
            type="number" 
            step="1" 
            label="Fator de Perda Padrão (%)" 
            value={config?.fator_perda_padrao} 
            onChange={e => setConfig({...config!, fator_perda_padrao: Number(e.target.value)})} 
          />
          <Input 
            type="number" 
            step="0.01" 
            label="M.O. Produção (% do material)" 
            value={config?.mo_producao_pct_padrao ? config.mo_producao_pct_padrao * 100 : 30} 
            onChange={e => setConfig({...config!, mo_producao_pct_padrao: Number(e.target.value) / 100})} 
          />
          <Input 
            type="number" 
            step="0.01" 
            label="M.O. Instalação (% do material)" 
            value={config?.mo_instalacao_pct_padrao ? config.mo_instalacao_pct_padrao * 100 : 15} 
            onChange={e => setConfig({...config!, mo_instalacao_pct_padrao: Number(e.target.value) / 100})} 
          />
        </div>
        <Button 
          onClick={handleSave} 
          disabled={saving}
          isLoading={saving}
          size="lg"
          className="w-full mt-2"
        >
          {saving ? 'SALVANDO...' : 'SALVAR CONFIGURAÇÕES TÉCNICAS'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default Settings;

