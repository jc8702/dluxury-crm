import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { apiService } from '../../services/apiService';

const Settings: React.FC = () => {
  const { 
    user, monthlyGoals, setMonthlyGoal, selectedPeriod, systemUsers, loadSystemUsers
  } = useAppContext();

  const [isEditing, setIsEditing] = useState(false);
  const [tempGoals, setTempGoals] = useState<Record<string, number>>({});

  // Initialize tempGoals when entering edit mode
  useEffect(() => {
    if (isEditing) {
      setTempGoals({ ...monthlyGoals });
    }
  }, [isEditing, monthlyGoals]);

  // Gestão de Usuários
  const [showUserModal, setShowUserModal] = useState(false);
  const [userError, setUserError] = useState('');
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'vendedor' as const });

  useEffect(() => {
    loadSystemUsers();
  }, []);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserError('');
    try {
      await apiService.registerUser(newUser);
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
        await apiService.removeUser(id);
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

  const handleSave = () => {
    if (selectedPeriod === 'Annual') {
      // No single annual goal defined in this simplified UI, 
      // typically we'd edit monthly components.
      setIsEditing(false);
      return;
    }
    Object.entries(tempGoals).forEach(([period, amount]) => {
      if (monthlyGoals[period] !== amount) {
        setMonthlyGoal(period, amount);
      }
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <header>
        <h2 style={{ fontSize: '1.875rem', fontWeight: 'bold' }}>Configurações do Sistema</h2>
        <p style={{ color: 'var(--text-muted)' }}>Gerencie permissões e metas mensais.</p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.125rem', margin: 0 }}>Gestão de Metas Mensais (2026)</h3>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {!isEditing ? (
                  <button 
                    className="btn btn-primary" 
                    onClick={() => setIsEditing(true)}
                    style={{ padding: '0.4rem 1rem', fontSize: '0.875rem' }}
                  >
                    Editar
                  </button>
                ) : (
                  <>
                    <button 
                      className="btn" 
                      onClick={handleCancel}
                      style={{ padding: '0.4rem 1rem', fontSize: '0.875rem', background: 'rgba(255,255,255,0.1)' }}
                    >
                      Cancelar
                    </button>
                    <button 
                      className="btn btn-primary" 
                      onClick={handleSave}
                      style={{ padding: '0.4rem 1rem', fontSize: '0.875rem' }}
                    >
                      Salvar
                    </button>
                  </>
                )}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', maxHeight: '400px', overflowY: 'auto', paddingRight: '0.5rem' }}>
               {[
                 { id: '01', name: 'Janeiro' }, { id: '02', name: 'Fevereiro' },
                 { id: '03', name: 'Março' }, { id: '04', name: 'Abril' },
                 { id: '05', name: 'Maio' }, { id: '06', name: 'Junho' },
                 { id: '07', name: 'Julho' }, { id: '08', name: 'Agosto' },
                 { id: '09', name: 'Setembro' }, { id: '10', name: 'Outubro' },
                 { id: '11', name: 'Novembro' }, { id: '12', name: 'Dezembro' }
               ].map(m => (
                 <div key={m.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: isEditing ? 'var(--primary)' : 'inherit' }}>{m.name}</label>
                    <input 
                      type="number" 
                      className="input" 
                      placeholder="R$ 0,00"
                      value={isEditing ? (tempGoals[`2026-${m.id}`] ?? '') : (monthlyGoals[`2026-${m.id}`] || '')}
                      onChange={(e) => {
                        if (isEditing) {
                          setTempGoals(prev => ({ ...prev, [`2026-${m.id}`]: parseFloat(e.target.value) || 0 }));
                        }
                      }}
                      disabled={!isEditing}
                      style={{ 
                        opacity: isEditing ? 1 : 0.7,
                        cursor: isEditing ? 'text' : 'not-allowed',
                        borderColor: isEditing ? 'var(--primary)' : 'transparent'
                      }}
                    />
                 </div>
               ))}
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '1rem' }}>
              As metas definidas aqui são comparadas com o faturamento real no Dashboard.
            </p>
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
    </div>
  );
};

export default Settings;
