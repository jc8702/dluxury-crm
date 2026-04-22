import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { api } from '../../lib/api';
import type { ConfiguracaoPrecificacao } from '../../context/AppContext';

const Settings: React.FC = () => {
  const { 
    user, systemUsers, loadSystemUsers,
    condicoesPagamento, addCondicaoPagamento, updateCondicaoPagamento, removeCondicaoPagamento
  } = useAppContext();

  const [profileData, setProfileData] = useState({ email: user?.email || '', password: '' });
  const [profileMsg, setProfileMsg] = useState('');

  // Gestão de Usuários
  const [showUserModal, setShowUserModal] = useState(false);
  const [userError, setUserError] = useState('');
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'vendedor' as const });

  useEffect(() => {
    loadSystemUsers();
  }, []);

  // Gestão de Condições de Pagamento
  const [showCondModal, setShowCondModal] = useState(false);
  const [newCond, setNewCond] = useState({ nome: '', n_parcelas: 1 });
  const [editingCondId, setEditingCondId] = useState<string | null>(null);

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
    } catch (err: any) {
      alert('Erro ao salvar condição');
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
        alert(err.message || 'Erro ao remover usuário');
      }
    }
  };

  const inputStyle: React.CSSProperties = {
    background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '8px', padding: '0.75rem', color: 'white', width: '100%', outline: 'none',
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
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <header>
        <h2 style={{ fontSize: '1.875rem', fontWeight: 'bold' }}>Configurações do Sistema</h2>
        <p style={{ color: 'var(--text-muted)' }}>Gerencie permissões e dados de acesso.</p>
      </header>

      <div className="grid-2" style={{ gap: '2rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div className="card glass">
            <h3 style={{ fontSize: '1.125rem', marginBottom: '1.25rem' }}>Meus Dados (Admin)</h3>
            {profileMsg && (
              <div style={{ padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem', background: profileMsg.includes('Erro') ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)', color: profileMsg.includes('Erro') ? '#ef4444' : '#10b981' }}>
                {profileMsg}
              </div>
            )}
            <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>Novo E-mail de Login</label>
                <input 
                  type="email" required style={inputStyle} 
                  value={profileData.email} onChange={e => setProfileData({...profileData, email: e.target.value})} 
                />
              </div>
              <div>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>Nova Senha (deixe em branco para manter)</label>
                <input 
                  type="password" style={inputStyle} placeholder="******"
                  value={profileData.password} onChange={e => setProfileData({...profileData, password: e.target.value})} 
                />
              </div>
              <button type="submit" className="btn btn-primary" style={{ padding: '0.75rem', fontWeight: 'bold', marginTop: '0.5rem' }}>
                Atualizar Credenciais
              </button>
            </form>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
           <div className="card glass">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h3 style={{ fontSize: '1.125rem', margin: 0 }}>Gestão de Equipe</h3>
                <button onClick={() => setShowUserModal(true)} className="btn btn-primary" style={{ padding: '0.4rem 1rem', fontSize: '0.875rem' }}>
                  + Novo Acesso
                </button>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {systemUsers.map(u => (
                  <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '0.75rem', borderRadius: '8px' }}>
                    <div>
                      <p style={{ fontWeight: '500', fontSize: '0.9rem' }}>{u.name}</p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{u.email}</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <span style={{ 
                        fontSize: '0.7rem', padding: '0.2rem 0.6rem', borderRadius: '12px', 
                        background: u.role === 'admin' ? 'rgba(212,175,55,0.2)' : 'rgba(255,255,255,0.1)', 
                        color: u.role === 'admin' ? '#d4af37' : 'var(--text-muted)', textTransform: 'capitalize' 
                      }}>
                        {u.role}
                      </span>
                      {user?.id !== u.id && (
                        <button onClick={() => handleDeleteUser(u.id)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '1.2rem' }}>×</button>
                      )}
                    </div>
                  </div>
                ))}
                {systemUsers.length === 0 && <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Nenhum outro usuário cadastrado.</p>}
              </div>
           </div>

           <div className="card" style={{ borderStyle: 'dotted', background: 'transparent' }}>
              <h3 style={{ fontSize: '1rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>Informações do Sistema</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Versão: 2.0.0-auth<br/>
                Ambiente: Produção (Neon PostgreSQL)<br/>
                Módulo Acesso Multi-usuário: Ativo
              </p>
           </div>
        </div>
      </div>

      <div className="card glass" style={{ marginTop: '2rem' }}>
        <h3 style={{ fontSize: '1.25rem', color: '#d4af37', marginBottom: '1.5rem' }}>💰 Padrões de Orçamento</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '2rem' }}>
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Taxa Financeira Padrão (%)</label>
            <input type="number" step="0.1" style={inputStyle} defaultValue={0.0} />
          </div>
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Prazo Padrão de Entrega (Dias Úteis)</label>
            <input type="number" style={inputStyle} defaultValue={45} />
          </div>
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Adicional de Urgência (%)</label>
            <input type="number" style={inputStyle} defaultValue={15} />
          </div>
        </div>
        <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: '1rem' }}>
          * O parcelamento e as taxas agora são definidos manualmente em cada transação (Pagar, Receber e Orçamentos).
        </p>
      </div>

      <TechnicalPricingSection />
      <NotificationSettingsSection />

      {showUserModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'var(--surface)', padding: '2rem', borderRadius: '12px', width: '400px', border: '1px solid var(--border)' }}>
            <h3 style={{ color: 'white', marginBottom: '1.5rem' }}>Novo Membro da Equipe</h3>
            
            {userError && <div style={{ color: 'var(--danger)', background: 'rgba(239, 68, 68, 0.1)', padding: '0.5rem', borderRadius: '4px', marginBottom: '1rem', fontSize: '0.85rem' }}>{userError}</div>}
            
            <form onSubmit={handleAddUser} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>Nome</label>
                <input required type="text" style={inputStyle} value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} placeholder="João Silva" />
              </div>
              <div>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>E-mail</label>
                <input required type="email" style={inputStyle} value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} placeholder="joao@dluxury.com" />
              </div>
              <div>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>Senha Temporária</label>
                <input required type="password" style={inputStyle} value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} placeholder="******" />
              </div>
              <div>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>Papel (Acesso)</label>
                <select style={inputStyle} value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value as any})}>
                  <option value="vendedor" style={{ background: '#1a1a1a' }}>Vendedor (Comercial)</option>
                  <option value="marceneiro" style={{ background: '#1a1a1a' }}>Marceneiro (Fábrica)</option>
                  <option value="admin" style={{ background: '#1a1a1a' }}>Administrador (Total)</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="submit" style={{ flex: 1, background: 'var(--primary)', color: '#1a1a2e', border: 'none', padding: '0.75rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Cadastrar</button>
                <button type="button" onClick={() => setShowUserModal(false)} style={{ flex: 1, background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none', padding: '0.75rem', borderRadius: '8px', cursor: 'pointer' }}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {showCondModal && (
        <CondicaoModal 
          show={showCondModal} 
          onClose={() => setShowCondModal(false)} 
          onSave={handleAddCond} 
          data={newCond} 
          setData={setNewCond} 
          isEditing={!!editingCondId} 
          s={inputStyle} 
        />
      )}
    </div>
  );
};

// Modal Condição de Pagamento
const CondicaoModal: React.FC<{ show: boolean, onClose: () => void, onSave: (e: React.FormEvent) => void, data: any, setData: any, isEditing: boolean, s: any }> = ({ show, onClose, onSave, data, setData, isEditing, s }) => {
  if (!show) return null;
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: 'var(--surface)', padding: '2rem', borderRadius: '12px', width: '400px', border: '1px solid var(--border)' }}>
        <h3 style={{ color: 'white', marginBottom: '1.5rem' }}>{isEditing ? 'Editar Condição' : 'Nova Condição de Pagamento'}</h3>
        <form onSubmit={onSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>Nome da Condição</label>
            <input required style={s} value={data.nome} onChange={e => setData({...data, nome: e.target.value.toUpperCase()})} placeholder="EX: 4X CARTÃO" />
          </div>
          <div>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>Número de Parcelas</label>
            <input required type="number" min="1" style={s} value={data.n_parcelas} onChange={e => setData({...data, n_parcelas: Number(e.target.value)})} />
          </div>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <button type="submit" style={{ flex: 1, background: 'var(--primary)', color: '#1a1a2e', border: 'none', padding: '0.75rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Salvar</button>
            <button type="button" onClick={onClose} style={{ flex: 1, background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none', padding: '0.75rem', borderRadius: '8px', cursor: 'pointer' }}>Cancelar</button>
          </div>
        </form>
      </div>
    </div>
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
    <div className="card glass" style={{ marginTop: '2rem' }}>
      <h3 style={{ fontSize: '1.25rem', color: '#d4af37', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        🔔 Automação de Alertas e Notificações
      </h3>
      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
        O sistema monitora os seguintes eventos automaticamente e gera notificações no sino superior para todos os administradores.
      </p>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
        {alerts.map(a => (
          <div key={a.type} style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid var(--border)' }}>
            <div style={{ fontWeight: '700', fontSize: '0.9rem', marginBottom: '0.25rem' }}>{a.title}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{a.desc}</div>
            <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
              <span style={{ fontSize: '0.65rem', fontWeight: '800', color: '#10b981', textTransform: 'uppercase' }}>Ativo</span>
            </div>
          </div>
        ))}
      </div>
      
      <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(212, 175, 55, 0.05)', borderRadius: '12px', border: '1px solid rgba(212, 175, 55, 0.2)' }}>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
          <strong>Nota:</strong> No momento, as regras de alerta são globais. Para solicitar alterações nos limites (ex: 7 dias para orçamentos), entre em contato com o suporte técnico.
        </p>
      </div>
    </div>
  );
};

export default Settings;

// ─── SEÇÃO DE PRECIFICAÇÃO TÉCNICA ───────────────────────
const TechnicalPricingSection: React.FC = () => {
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
      alert('Configurações salvas com sucesso!');
    } catch (err) {
      alert('Erro ao salvar configurações.');
    } finally {
      setSaving(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '8px', padding: '0.75rem', color: 'white', width: '100%', outline: 'none',
  };

  if (loading) return null;

  return (
    <div className="card glass" style={{ marginTop: '2rem' }}>
       <h3 style={{ fontSize: '1.25rem', color: '#d4af37', marginBottom: '1.5rem' }}>📐 Configurações de Precificação Técnica (Marcenaria)</h3>
       <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem' }}>
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Markup Padrão (x)</label>
            <input type="number" step="0.01" style={inputStyle} value={config?.markup_padrao} onChange={e => setConfig({...config!, markup_padrao: Number(e.target.value)})} />
          </div>
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Alíquota de Imposto (%)</label>
            <input type="number" step="0.01" style={inputStyle} value={config?.aliquota_imposto} onChange={e => setConfig({...config!, aliquota_imposto: Number(e.target.value)})} />
          </div>
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Margem de Alerta Mínima (%)</label>
            <input type="number" step="0.01" style={inputStyle} value={config?.margem_minima_alerta ? config.margem_minima_alerta * 100 : 25} onChange={e => setConfig({...config!, margem_minima_alerta: Number(e.target.value) / 100})} />
          </div>
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Fator de Perda Padrão (%)</label>
            <input type="number" step="1" style={inputStyle} value={config?.fator_perda_padrao} onChange={e => setConfig({...config!, fator_perda_padrao: Number(e.target.value)})} />
          </div>
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>M.O. Produção (% do material)</label>
            <input type="number" step="0.01" style={inputStyle} value={config?.mo_producao_pct_padrao ? config.mo_producao_pct_padrao * 100 : 30} onChange={e => setConfig({...config!, mo_producao_pct_padrao: Number(e.target.value) / 100})} />
          </div>
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>M.O. Instalação (% do material)</label>
            <input type="number" step="0.01" style={inputStyle} value={config?.mo_instalacao_pct_padrao ? config.mo_instalacao_pct_padrao * 100 : 15} onChange={e => setConfig({...config!, mo_instalacao_pct_padrao: Number(e.target.value) / 100})} />
          </div>
       </div>
       <button 
        onClick={handleSave} 
        disabled={saving}
        className="btn btn-primary" 
        style={{ marginTop: '1.5rem', width: '100%', padding: '1rem', fontWeight: 'bold' }}
       >
         {saving ? 'SALVANDO...' : 'SALVAR CONFIGURAÇÕES TÉCNICAS'}
       </button>
    </div>
  );
};

