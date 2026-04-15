import React, { useState } from 'react';

interface InventoryItem {
  id: string;
  name: string;
  category: 'madeira' | 'ferragem' | 'pintura' | 'acabamento' | 'fixacao';
  unit: 'un' | 'mt' | 'm2' | 'l' | 'kg';
  quantity: number;
  minQuantity: number;
  location: string;
  price: number;
}

const Inventory: React.FC = () => {
  const [items, setItems] = useState<InventoryItem[]>([
    { id: '1', name: 'MDF 15mm', category: 'madeira', unit: 'm2', quantity: 150, minQuantity: 50, location: 'Armário A', price: 120 },
    { id: '2', name: 'Puxador Alumínio', category: 'ferragem', unit: 'un', quantity: 200, minQuantity: 50, location: 'Armário B', price: 15 },
    { id: '3', name: 'Tinta Acrílica Branco', category: 'pintura', unit: 'l', quantity: 20, minQuantity: 5, location: 'Depósito', price: 45 },
  ]);

  const [showModal, setShowModal] = useState(false);
  const [newItem, setNewItem] = useState({
    name: '',
    category: 'madeira' as const,
    unit: 'un' as const,
    quantity: 0,
    minQuantity: 0,
    location: '',
    price: 0
  });

  const [movementType, setMovementType] = useState<'entry' | 'exit'>('entry');
  const [movementQty, setMovementQty] = useState(0);
  const [selectedItemId, setSelectedItemId] = useState('');

  const addItem = () => {
    setItems([...items, { ...newItem, id: Date.now().toString() }]);
    setShowModal(false);
    setNewItem({ name: '', category: 'madeira', unit: 'un', quantity: 0, minQuantity: 0, location: '', price: 0 });
  };

  const handleMovement = () => {
    setItems(items.map(item => {
      if (item.id === selectedItemId) {
        const qty = movementType === 'entry' ? item.quantity + movementQty : item.quantity - movementQty;
        return { ...item, quantity: qty < 0 ? 0 : qty };
      }
      return item;
    }));
    setMovementQty(0);
    setSelectedItemId('');
  };

  const getCategoryColor = (cat: string) => {
    switch(cat) {
      case 'madeira': return '#8b5cf6';
      case 'ferragem': return '#3b82f6';
      case 'pintura': return '#10b981';
      case 'acabamento': return '#f59e0b';
      case 'fixacao': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const inputStyle: React.CSSProperties = {
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '8px',
    padding: '0.75rem',
    color: 'white',
    width: '100%',
    outline: 'none',
  };

  const selectStyle: React.CSSProperties = {
    ...inputStyle,
    appearance: 'none',
    background: 'rgba(255,255,255,0.05) url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'24\' height=\'24\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'white\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpolyline points=\'6 9 12 15 18 9\'%3E%3C/polyline%3E%3C/svg%3E") no-repeat right 0.75rem center',
    cursor: 'pointer'
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <header>
        <h2 style={{ fontSize: '1.875rem', fontWeight: 'bold' }}>Estoque</h2>
        <p style={{ color: 'var(--text-muted)' }}>Controle de materiais, madeiras e ferragens.</p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        <div style={{ background: 'var(--surface)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
          <h3 style={{ marginBottom: '1rem', color: 'white' }}>Movimentação</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '0.5rem' }}>Item</label>
              <select style={selectStyle} value={selectedItemId} onChange={e => setSelectedItemId(e.target.value)}>
                <option value="" style={{ background: '#1a1a1a' }}>Selecione...</option>
                {items.map(i => <option key={i.id} value={i.id} style={{ background: '#1a1a1a' }}>{i.name}</option>)}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '0.5rem' }}>Tipo</label>
                <select style={selectStyle} value={movementType} onChange={e => setMovementType(e.target.value as 'entry' | 'exit')}>
                  <option value="entry" style={{ background: '#1a1a1a' }}>Entrada (+)</option>
                  <option value="exit" style={{ background: '#1a1a1a' }}>Saída (-)</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '0.5rem' }}>Quantidade</label>
                <input type="number" style={inputStyle} value={movementQty} onChange={e => setMovementQty(parseInt(e.target.value) || 0)} />
              </div>
            </div>
            <button onClick={handleMovement} style={{ background: 'var(--primary)', color: 'white', border: 'none', padding: '0.75rem', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>Registrar</button>
          </div>
        </div>

        <div style={{ background: 'var(--surface)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
          <button onClick={() => setShowModal(true)} style={{ background: 'var(--secondary)', color: 'white', border: 'none', padding: '1rem 2rem', borderRadius: '8px', cursor: 'pointer', fontSize: '1rem', fontWeight: '600' }}>+ Novo Item ao Estoque</button>
        </div>
      </div>

      <div style={{ background: 'var(--surface)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
        <h3 style={{ marginBottom: '1rem', color: 'white' }}>Itens em Estoque</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', color: 'white' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <th style={{ textAlign: 'left', padding: '0.75rem', color: 'rgba(255,255,255,0.7)' }}>Nome</th>
              <th style={{ textAlign: 'center', padding: '0.75rem', color: 'rgba(255,255,255,0.7)' }}>Categoria</th>
              <th style={{ textAlign: 'center', padding: '0.75rem', color: 'rgba(255,255,255,0.7)' }}>Qtd</th>
              <th style={{ textAlign: 'center', padding: '0.75rem', color: 'rgba(255,255,255,0.7)' }}>Mín.</th>
              <th style={{ textAlign: 'center', padding: '0.75rem', color: 'rgba(255,255,255,0.7)' }}>Local</th>
              <th style={{ textAlign: 'right', padding: '0.75rem', color: 'rgba(255,255,255,0.7)' }}>Valor Unit.</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: item.quantity < item.minQuantity ? 'rgba(239,68,68,0.1)' : 'transparent' }}>
                <td style={{ padding: '0.75rem', fontWeight: '600' }}>{item.name}</td>
                <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                  <span style={{ background: getCategoryColor(item.category), padding: '0.25rem 0.75rem', borderRadius: '12px', fontSize: '0.75rem' }}>{item.category}</span>
                </td>
                <td style={{ padding: '0.75rem', textAlign: 'center', color: item.quantity < item.minQuantity ? '#ef4444' : 'white' }}>{item.quantity} {item.unit}</td>
                <td style={{ padding: '0.75rem', textAlign: 'center' }}>{item.minQuantity}</td>
                <td style={{ padding: '0.75rem', textAlign: 'center' }}>{item.location}</td>
                <td style={{ padding: '0.75rem', textAlign: 'right' }}>R$ {item.price.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'var(--surface)', padding: '2rem', borderRadius: '12px', width: '500px', border: '1px solid var(--border)' }}>
            <h3 style={{ color: 'white', marginBottom: '1.5rem' }}>Novo Item</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <input style={inputStyle} placeholder="Nome do Item" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <select style={selectStyle} value={newItem.category} onChange={e => setNewItem({...newItem, category: e.target.value as any})}>
                  <option value="madeira" style={{ background: '#1a1a1a' }}>Madeira</option>
                  <option value="ferragem" style={{ background: '#1a1a1a' }}>Ferragem</option>
                  <option value="pintura" style={{ background: '#1a1a1a' }}>Pintura</option>
                  <option value="acabamento" style={{ background: '#1a1a1a' }}>Acabamento</option>
                  <option value="fixacao" style={{ background: '#1a1a1a' }}>Fixação</option>
                </select>
                <select style={selectStyle} value={newItem.unit} onChange={e => setNewItem({...newItem, unit: e.target.value as any})}>
                  <option value="un" style={{ background: '#1a1a1a' }}>Unidade</option>
                  <option value="mt" style={{ background: '#1a1a1a' }}>Metro</option>
                  <option value="m2" style={{ background: '#1a1a1a' }}>Metro²</option>
                  <option value="l" style={{ background: '#1a1a1a' }}>Litro</option>
                  <option value="kg" style={{ background: '#1a1a1a' }}>Kg</option>
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                <input type="number" style={inputStyle} placeholder="Qtd" value={newItem.quantity} onChange={e => setNewItem({...newItem, quantity: parseInt(e.target.value) || 0})} />
                <input type="number" style={inputStyle} placeholder="Qtd Mín" value={newItem.minQuantity} onChange={e => setNewItem({...newItem, minQuantity: parseInt(e.target.value) || 0})} />
                <input type="number" style={inputStyle} placeholder="Valor R$" value={newItem.price} onChange={e => setNewItem({...newItem, price: parseFloat(e.target.value) || 0})} />
              </div>
              <input style={inputStyle} placeholder="Localização (Ex: Armário A)" value={newItem.location} onChange={e => setNewItem({...newItem, location: e.target.value})} />
            </div>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
              <button onClick={addItem} style={{ flex: 1, background: 'var(--primary)', color: 'white', border: 'none', padding: '0.75rem', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>Salvar</button>
              <button onClick={() => setShowModal(false)} style={{ flex: 1, background: '#333', color: 'white', border: 'none', padding: '0.75rem', borderRadius: '8px', cursor: 'pointer' }}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;