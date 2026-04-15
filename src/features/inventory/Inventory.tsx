import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';

type TabId = 'list' | 'movement' | 'form';
type FormTab = 'identification' | 'supplier' | 'fiscal' | 'purchase' | 'mrp';

const CATEGORIES = ['Madeira/Painel', 'Ferragem', 'Pintura/Acabamento', 'Fixação', 'Vidro', 'Tecido/Couro', 'Eletro', 'Embalagem', 'Outro'];
const UNITS = ['un', 'm', 'm²', 'm³', 'L', 'kg', 'g', 'cx', 'pç', 'rolo', 'barra'];
const FISCAL_ORIGINS = ['0 - Nacional', '1 - Estrangeira (importação direta)', '2 - Estrangeira (mercado interno)'];
const POLICIES = ['FOQ - Lote fixo', 'EOQ - Lote econômico', 'Reposição periódica', 'Sob demanda'];
const PLANNING_TYPES = ['MRP - Cálculo de necessidades', 'MTO - Sob encomenda', 'MTS - Para estoque', 'Sem planejamento'];

const emptyItem = {
  name: '', sku: '', description: '', category: 'Madeira/Painel', family: '', subcategory: '',
  unit: 'un', location: '', quantity: 0, min_quantity: 0, max_quantity: 0, reorder_point: 0, price: 0,
  supplier_name: '', supplier_code: '', lead_time_days: 0,
  ncm: '', cfop: '1.102', icms: 12, ipi: 0, pis: 1.65, cofins: 7.6, fiscal_origin: '0 - Nacional',
  purchase_unit: 'un', conversion_factor: 1, purchase_price: 0, currency: 'BRL',
  min_lot: 1, replenishment_policy: 'FOQ - Lote fixo', planning_type: 'MRP - Cálculo de necessidades', resupply_days: 0
};

const getCategoryColor = (cat: string) => ({
  'Madeira/Painel': '#d4af37', Ferragem: '#64748b', 'Pintura/Acabamento': '#3b82f6',
  Fixação: '#f59e0b', Vidro: '#06b6d4', 'Tecido/Couro': '#8b5cf6',
  Eletro: '#10b981', Embalagem: '#f97316', Outro: '#94a3b8'
}[cat] || '#94a3b8');

const fmtCur = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

const Inventory: React.FC = () => {
  const { inventory, addInventory, updateInventoryQty, removeInventoryItem } = useAppContext();
  const [mainTab, setMainTab] = useState<TabId>('list');
  const [formTab, setFormTab] = useState<FormTab>('identification');
  const [form, setForm] = useState<typeof emptyItem>({ ...emptyItem });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selectedItem, setSelectedItem] = useState('');
  const [movType, setMovType] = useState<'entry' | 'exit'>('entry');
  const [movQty, setMovQty] = useState(0);

  const inp: React.CSSProperties = {
    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px', padding: '0.6rem 0.75rem', color: 'white', width: '100%', outline: 'none', fontSize: '0.875rem'
  };
  const sel: React.CSSProperties = { ...inp, cursor: 'pointer' };

  const f = (k: keyof typeof emptyItem) => (e: any) => setForm(prev => ({ ...prev, [k]: e.target.value }));

  const handleSave = async () => {
    if (!form.name || !form.category || !form.unit) { setError('Nome, categoria e unidade são obrigatórios.'); return; }
    setSaving(true); setError('');
    try {
      await addInventory(form);
      setForm({ ...emptyItem });
      setMainTab('list');
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar.');
    } finally { setSaving(false); }
  };

  const handleMovement = async () => {
    const item = inventory.find(i => i.id === selectedItem);
    if (!item || movQty <= 0) return;
    const qty = movType === 'entry' ? item.quantity + movQty : Math.max(0, item.quantity - movQty);
    await updateInventoryQty(selectedItem, qty);
    setMovQty(0); setSelectedItem('');
  };

  const formTabs: { id: FormTab; label: string; icon: string }[] = [
    { id: 'identification', label: 'Identificação', icon: '🏷️' },
    { id: 'supplier', label: 'Fornecedor', icon: '🏭' },
    { id: 'fiscal', label: 'Fiscal', icon: '📋' },
    { id: 'purchase', label: 'Compra/Estoque', icon: '🛒' },
    { id: 'mrp', label: 'MRP', icon: '⚙️' },
  ];

  const filtered = inventory.filter(i => !search || i.name.toLowerCase().includes(search.toLowerCase()) || (i.sku || '').toLowerCase().includes(search.toLowerCase()) || (i.family || '').toLowerCase().includes(search.toLowerCase()));

  const lowStock = inventory.filter(i => i.quantity <= i.minQuantity);

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>Gestão de Estoque</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Cadastro de itens, movimentação e controle MRP.</p>
        </div>
        <button onClick={() => { setMainTab('form'); setFormTab('identification'); }}
          style={{ background: 'linear-gradient(135deg, #d4af37, #b49050)', color: '#1a1a2e', border: 'none', padding: '0.7rem 1.4rem', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '0.875rem' }}>
          + Cadastrar Item
        </button>
      </header>

      {/* KPI bar */}
      <div className="grid-4" style={{ gap: '1rem' }}>
        {[
          { label: 'Total de Itens', value: inventory.length, color: '#d4af37' },
          { label: 'Abaixo do Mínimo', value: lowStock.length, color: '#ef4444' },
          { label: 'Valor em Estoque', value: fmtCur(inventory.reduce((a, i) => a + i.quantity * i.price, 0)), color: '#10b981' },
          { label: 'Com Fornecedor', value: inventory.filter(i => i.supplierName).length, color: '#3b82f6' },
        ].map(k => (
          <div key={k.label} className="card glass" style={{ padding: '1rem', borderLeft: `3px solid ${k.color}` }}>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>{k.label}</p>
            <p style={{ fontSize: '1.25rem', fontWeight: '800', color: k.color }}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Navigation tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0' }}>
        {([['list', '📦 Itens em Estoque'], ['movement', '↕️ Movimentação'], ['form', '➕ Cadastrar']] as const).map(([id, label]) => (
          <button key={id} onClick={() => setMainTab(id as TabId)} style={{
            padding: '0.6rem 1.2rem', border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600',
            background: 'none', borderBottom: mainTab === id ? '2px solid #d4af37' : '2px solid transparent',
            color: mainTab === id ? '#d4af37' : 'var(--text-muted)', marginBottom: '-1px', borderRadius: '0'
          }}>{label}</button>
        ))}
      </div>

      {/* TAB: LIST */}
      {mainTab === 'list' && (
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <h3 style={{ fontSize: '1rem', margin: 0 }}>Itens Cadastrados ({filtered.length})</h3>
            <input placeholder="🔍 Buscar por nome, SKU, família..." style={{ ...inp, width: '280px' }} value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', color: 'white', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  {['SKU', 'Nome', 'Família', 'Categoria', 'Qtd', 'Mín.', 'Fornecedor', 'Pr. Compra', 'NCM', 'Status', ''].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '0.6rem 0.75rem', color: 'var(--text-muted)', fontWeight: '600', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={10} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Nenhum item cadastrado ainda.</td></tr>
                )}
                {filtered.map(item => {
                  const low = item.quantity <= item.minQuantity;
                  return (
                    <tr key={item.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: low ? 'rgba(239,68,68,0.05)' : 'transparent' }}>
                      <td style={{ padding: '0.65rem 0.75rem' }}><span style={{ fontSize: '0.7rem', color: '#94a3b8', fontFamily: 'monospace' }}>{item.sku || '—'}</span></td>
                      <td style={{ padding: '0.65rem 0.75rem', fontWeight: '600', whiteSpace: 'nowrap' }}>{item.name}</td>
                      <td style={{ padding: '0.65rem 0.75rem', color: 'var(--text-muted)' }}>{item.family || '—'}</td>
                      <td style={{ padding: '0.65rem 0.75rem' }}>
                        <span style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', borderRadius: '12px', background: `${getCategoryColor(item.category)}22`, color: getCategoryColor(item.category), whiteSpace: 'nowrap' }}>
                          {item.category}
                        </span>
                      </td>
                      <td style={{ padding: '0.65rem 0.75rem', fontWeight: '700', color: low ? '#ef4444' : '#10b981' }}>{item.quantity} {item.unit}</td>
                      <td style={{ padding: '0.65rem 0.75rem', color: 'var(--text-muted)' }}>{item.minQuantity}</td>
                      <td style={{ padding: '0.65rem 0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{item.supplierName || '—'}</td>
                      <td style={{ padding: '0.65rem 0.75rem' }}>{fmtCur(item.purchasePrice || item.price)}</td>
                      <td style={{ padding: '0.65rem 0.75rem', fontFamily: 'monospace', fontSize: '0.75rem' }}>{item.ncm || '—'}</td>
                      <td style={{ padding: '0.65rem 0.75rem' }}>
                        <span style={{ fontSize: '0.65rem', padding: '0.2rem 0.5rem', borderRadius: '12px', background: low ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)', color: low ? '#ef4444' : '#10b981' }}>
                          {low ? '⚠ Baixo' : '✓ OK'}
                        </span>
                      </td>
                      <td style={{ padding: '0.65rem 0.75rem' }}>
                        <button onClick={() => removeInventoryItem(item.id)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '1rem' }}>×</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB: MOVEMENT */}
      {mainTab === 'movement' && (
        <div className="card" style={{ maxWidth: '500px' }}>
          <h3 style={{ fontSize: '1rem', marginBottom: '1.25rem' }}>Registrar Movimentação</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>Item</label>
              <select style={sel} value={selectedItem} onChange={e => setSelectedItem(e.target.value)}>
                <option value="" style={{ background: '#1a1a1a' }}>Selecione...</option>
                {inventory.map(i => <option key={i.id} value={i.id} style={{ background: '#1a1a1a' }}>{i.sku ? `[${i.sku}] ` : ''}{i.name} — Saldo: {i.quantity} {i.unit}</option>)}
              </select>
            </div>
            <div className="grid-2" style={{ gap: '0.75rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>Tipo</label>
                <select style={sel} value={movType} onChange={e => setMovType(e.target.value as any)}>
                  <option value="entry" style={{ background: '#1a1a1a' }}>Entrada (+)</option>
                  <option value="exit" style={{ background: '#1a1a1a' }}>Saída (-)</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>Quantidade</label>
                <input type="number" style={inp} value={movQty} onChange={e => setMovQty(parseFloat(e.target.value) || 0)} min={0} />
              </div>
            </div>
            <button onClick={handleMovement} disabled={!selectedItem || movQty <= 0}
              style={{ background: movType === 'entry' ? '#10b981' : '#ef4444', color: 'white', border: 'none', padding: '0.75rem', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', marginTop: '0.5rem' }}>
              {movType === 'entry' ? '▲ Registrar Entrada' : '▼ Registrar Saída'}
            </button>
          </div>
        </div>
      )}

      {/* TAB: FORM */}
      {mainTab === 'form' && (
        <div className="card">
          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '0.3rem' }}>Novo Cadastro de Item</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Preencha todas as seções para um cadastro MRP completo.</p>
          </div>

          {/* Form sub-tabs */}
          <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1.5rem', overflowX: 'auto', paddingBottom: '0.25rem', borderBottom: '1px solid var(--border)' }}>
            {formTabs.map(t => (
              <button key={t.id} onClick={() => setFormTab(t.id)} style={{
                padding: '0.5rem 0.9rem', border: 'none', borderRadius: '6px 6px 0 0', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '600', whiteSpace: 'nowrap',
                background: formTab === t.id ? 'rgba(212,175,55,0.15)' : 'transparent',
                color: formTab === t.id ? '#d4af37' : 'var(--text-muted)',
                borderBottom: formTab === t.id ? '2px solid #d4af37' : '2px solid transparent',
                marginBottom: '-1px',
              }}>{t.icon} {t.label}</button>
            ))}
          </div>

          {/* IDENTIFICAÇÃO */}
          {formTab === 'identification' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="grid-2" style={{ gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>Nome do Item *</label>
                  <input style={inp} placeholder="Ex: Chapa MDF 15mm Branco TX" value={form.name} onChange={f('name')} />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>SKU / Código Interno</label>
                  <input style={inp} placeholder="Ex: MDF-15-BRTX" value={form.sku} onChange={f('sku')} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>Descrição Técnica</label>
                <textarea style={{ ...inp, resize: 'vertical', minHeight: '70px' } as any} placeholder="Descreva as especificações do item..." value={form.description} onChange={f('description')} />
              </div>
              <div className="grid-3" style={{ gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>Categoria *</label>
                  <select style={sel} value={form.category} onChange={f('category')}>
                    {CATEGORIES.map(c => <option key={c} value={c} style={{ background: '#1a1a1a' }}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>Família</label>
                  <input style={inp} placeholder="Ex: Chapas, Perfis..." value={form.family} onChange={f('family')} />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>Subcategoria</label>
                  <input style={inp} placeholder="Ex: MDF, MDP, OSB..." value={form.subcategory} onChange={f('subcategory')} />
                </div>
              </div>
              <div className="grid-2" style={{ gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>Unidade de Estoque *</label>
                  <select style={sel} value={form.unit} onChange={f('unit')}>
                    {UNITS.map(u => <option key={u} value={u} style={{ background: '#1a1a1a' }}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>Localização no Estoque</label>
                  <input style={inp} placeholder="Ex: Galpão A - Prateleira 3" value={form.location} onChange={f('location')} />
                </div>
              </div>
            </div>
          )}

          {/* FORNECEDOR */}
          {formTab === 'supplier' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="grid-2" style={{ gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>Fornecedor Principal</label>
                  <input style={inp} placeholder="Ex: Arauco do Brasil" value={form.supplier_name} onChange={f('supplier_name')} />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>Código do Tem no Fornecedor</label>
                  <input style={inp} placeholder="Ex: AR-MDF15-BR" value={form.supplier_code} onChange={f('supplier_code')} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>Lead Time de Entrega (dias)</label>
                <input type="number" style={{ ...inp, width: '160px' }} value={form.lead_time_days} onChange={f('lead_time_days')} min={0} />
                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>Prazo médio de entrega após emissão do pedido de compra.</p>
              </div>
              <div style={{ padding: '1rem', background: 'rgba(212,175,55,0.05)', borderRadius: '8px', border: '1px solid rgba(212,175,55,0.15)' }}>
                <p style={{ fontSize: '0.75rem', color: '#d4af37', marginBottom: '0.5rem' }}>ℹ️ Múltiplos fornecedores</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No módulo de Compras (em breve) você poderá cadastrar fornecedores secundários e comparar preços automaticamente.</p>
              </div>
            </div>
          )}

          {/* FISCAL */}
          {formTab === 'fiscal' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="grid-2" style={{ gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>NCM (Nomenclatura Comum do Mercosul)</label>
                  <input style={inp} placeholder="Ex: 4411.12.00" value={form.ncm} onChange={f('ncm')} />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>CFOP (entrada padrão)</label>
                  <input style={inp} placeholder="Ex: 1.102" value={form.cfop} onChange={f('cfop')} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>Origem Fiscal</label>
                <select style={sel} value={form.fiscal_origin} onChange={f('fiscal_origin')}>
                  {FISCAL_ORIGINS.map(o => <option key={o} value={o} style={{ background: '#1a1a1a' }}>{o}</option>)}
                </select>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '600' }}>Alíquotas Padrão (%)</p>
              <div className="grid-4" style={{ gap: '1rem' }}>
                {(['icms', 'ipi', 'pis', 'cofins'] as const).map(tax => (
                  <div key={tax}>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>{tax.toUpperCase()}</label>
                    <input type="number" style={inp} placeholder="0.00" value={form[tax]} onChange={f(tax)} step={0.01} min={0} />
                  </div>
                ))}
              </div>
              <div style={{ padding: '1rem', background: 'rgba(59,130,246,0.05)', borderRadius: '8px', border: '1px solid rgba(59,130,246,0.15)' }}>
                <p style={{ fontSize: '0.75rem', color: '#3b82f6' }}>💡 Essas alíquotas serão usadas automaticamente no módulo de Compras para calcular o custo total de aquisição (CIF).</p>
              </div>
            </div>
          )}

          {/* COMPRA/ESTOQUE */}
          {formTab === 'purchase' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="grid-3" style={{ gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>Unidade de Compra</label>
                  <select style={sel} value={form.purchase_unit} onChange={f('purchase_unit')}>
                    {UNITS.map(u => <option key={u} value={u} style={{ background: '#1a1a1a' }}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>Fator de Conversão</label>
                  <input type="number" style={inp} placeholder="1" value={form.conversion_factor} onChange={f('conversion_factor')} step={0.001} min={0.001} />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>Moeda</label>
                  <select style={sel} value={form.currency} onChange={f('currency')}>
                    {['BRL', 'USD', 'EUR'].map(c => <option key={c} value={c} style={{ background: '#1a1a1a' }}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid-2" style={{ gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>Preço de Compra (por un. compra)</label>
                  <input type="number" style={inp} placeholder="0.00" value={form.purchase_price} onChange={f('purchase_price')} step={0.01} min={0} />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>Custo Unitário em Estoque (R$)</label>
                  <input type="number" style={inp} placeholder="0.00" value={form.price} onChange={f('price')} step={0.01} min={0} />
                </div>
              </div>
              <div className="grid-4" style={{ gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>Qtd. Inicial</label>
                  <input type="number" style={inp} value={form.quantity} onChange={f('quantity')} min={0} />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>Estoque Mínimo</label>
                  <input type="number" style={inp} value={form.min_quantity} onChange={f('min_quantity')} min={0} />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>Estoque Máximo</label>
                  <input type="number" style={inp} value={form.max_quantity} onChange={f('max_quantity')} min={0} />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>Ponto de Reposição</label>
                  <input type="number" style={inp} value={form.reorder_point} onChange={f('reorder_point')} min={0} />
                </div>
              </div>
            </div>
          )}

          {/* MRP */}
          {formTab === 'mrp' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="grid-2" style={{ gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>Tipo de Planejamento</label>
                  <select style={sel} value={form.planning_type} onChange={f('planning_type')}>
                    {PLANNING_TYPES.map(p => <option key={p} value={p} style={{ background: '#1a1a1a' }}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>Política de Reposição</label>
                  <select style={sel} value={form.replenishment_policy} onChange={f('replenishment_policy')}>
                    {POLICIES.map(p => <option key={p} value={p} style={{ background: '#1a1a1a' }}>{p}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid-2" style={{ gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>Lote Mínimo de Compra</label>
                  <input type="number" style={inp} value={form.min_lot} onChange={f('min_lot')} min={1} />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>Tempo de Ressuprimento (dias)</label>
                  <input type="number" style={inp} value={form.resupply_days} onChange={f('resupply_days')} min={0} />
                </div>
              </div>
              <div style={{ padding: '1rem', background: 'rgba(139,92,246,0.05)', borderRadius: '8px', border: '1px solid rgba(139,92,246,0.2)' }}>
                <p style={{ fontSize: '0.75rem', color: '#8b5cf6', marginBottom: '0.5rem', fontWeight: '600' }}>⚙️ Como o MRP será usado</p>
                <ul style={{ fontSize: '0.75rem', color: 'var(--text-muted)', paddingLeft: '1.2rem', lineHeight: '1.6' }}>
                  <li>Quando a quantidade cair abaixo do <strong style={{ color: 'white' }}>Ponto de Reposição</strong>, uma sugestão de compra é gerada</li>
                  <li>O <strong style={{ color: 'white' }}>Lead Time</strong> do fornecedor é somado ao tempo de ressuprimento para calcular a data de necessidade</li>
                  <li>A política <strong style={{ color: 'white' }}>FOQ</strong> estoca o Lote Mínimo; <strong style={{ color: 'white' }}>EOQ</strong> calcula automaticamente o lote econômico</li>
                </ul>
              </div>
            </div>
          )}

          {/* Error & Actions */}
          {error && <div style={{ color: '#ef4444', background: 'rgba(239,68,68,0.1)', padding: '0.75rem', borderRadius: '8px', fontSize: '0.85rem', marginTop: '0.5rem' }}>{error}</div>}

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            <button onClick={() => { setMainTab('list'); setForm({ ...emptyItem }); }}
              style={{ padding: '0.75rem 1.5rem', background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
              Cancelar
            </button>
            {formTab !== 'mrp' && (
              <button onClick={() => { const tabs: FormTab[] = ['identification', 'supplier', 'fiscal', 'purchase', 'mrp']; const idx = tabs.indexOf(formTab); setFormTab(tabs[idx + 1]); }}
                style={{ padding: '0.75rem 1.5rem', background: 'rgba(212,175,55,0.2)', color: '#d4af37', border: '1px solid rgba(212,175,55,0.3)', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>
                Próxima Seção →
              </button>
            )}
            <button onClick={handleSave} disabled={saving}
              style={{ padding: '0.75rem 2rem', background: 'linear-gradient(135deg, #d4af37, #b49050)', color: '#1a1a2e', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '700' }}>
              {saving ? 'Salvando...' : '💾 Salvar Item'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;