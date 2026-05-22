import React, { useState, useEffect } from 'react';
import { Layers, Plus, Search, Loader2, Save, Tag, DollarSign, Package } from 'lucide-react';
import { api } from '../../lib/api';
import { Button, Card, CardContent, Input, Modal, Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../design-system/components';
import DataTable from '../ui/DataTable';

const SKUPage: React.FC = () => {
  const [skus, setSkus] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({ 
    sku_code: '', 
    nome: '', 
    preco_base: 0, 
    unidade_medida: 'UN', 
    atributos: {} 
  });

  useEffect(() => {
    fetchSKUs();
  }, []);

  const fetchSKUs = async () => {
    try {
      setLoading(true);
      const data = await api.skus.list();
      setSkus(data);
    } catch (err) {
      console.error('Failed to fetch SKUs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.skus.create(formData);
      setIsModalOpen(false);
      setFormData({ sku_code: '', nome: '', preco_base: 0, unidade_medida: 'UN', atributos: {} });
      await fetchSKUs();
    } catch (err) {
      console.error('Failed to save SKU:', err);
    } finally {
      setSaving(false);
    }
  };

  const filteredSkus = skus.filter(s => {
    const term = searchTerm.toLowerCase();
    return s.nome.toLowerCase().includes(term) || s.sku.toLowerCase().includes(term);
  });

  return (
    <div className="animate-fade-in flex flex-col gap-8">
      <header className="flex justify-between items-center pb-4 border-b border-border">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-primary/10 rounded-xl text-primary shadow-sm">
            <Layers size={28} />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight uppercase flex items-center gap-2">
              Catálogo de Peças / SKUs
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Gerenciamento atômico de insumos técnicos e acessórios.
            </p>
          </div>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus size={20} className="mr-2" /> Novo SKU
        </Button>
      </header>

      <Card className="p-4">
        <CardContent className="p-0 flex gap-4 items-center">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input 
              className="pl-10" 
              placeholder="Buscar por descrição ou código SKU..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <div className="card p-6">
        {loading ? (
          <div className="py-20 flex flex-col justify-center items-center gap-3 text-muted-foreground">
            <Loader2 className="animate-spin text-primary" size={32} />
            <span className="text-sm font-semibold tracking-wider">Sincronizando com o banco industrial...</span>
          </div>
        ) : (
          <DataTable 
            headers={['Código SKU', 'Nome do Item', 'Unidade', 'Preço Base', 'Status']}
            data={filteredSkus}
            renderRow={(s) => (
              <>
                <td className="p-4"><span className="bg-primary/10 text-primary px-2.5 py-0.5 rounded-full text-xs font-bold border border-primary/20">{s.sku}</span></td>
                <td className="p-4 font-semibold">{s.nome}</td>
                <td className="p-4 text-sm">{s.unidade_medida}</td>
                <td className="p-4 text-sm font-semibold">R$ {Number(s.preco_base).toFixed(2)}</td>
                <td className="p-4">
                  <span className={`flex items-center gap-1.5 text-xs font-bold ${s.ativo ? 'text-success' : 'text-muted-foreground'}`}>
                    <div className={`w-2 h-2 rounded-full ${s.ativo ? 'bg-success' : 'bg-muted-foreground'}`} />
                    {s.ativo ? 'ATIVO' : 'INATIVO'}
                  </span>
                </td>
              </>
            )}
            emptyMessage="Nenhum SKU encontrado no catálogo."
          />
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Cadastrar Novo SKU" size="md">
        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Tag size={16} className="absolute left-3 top-9 text-muted-foreground z-10" />
              <Input 
                required
                label="Código SKU *"
                className="pl-10" 
                placeholder="Ex: SKU-FER-001"
                value={formData.sku_code}
                onChange={e => setFormData({...formData, sku_code: e.target.value})}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground/90">Unidade de Medida</label>
              <Select value={formData.unidade_medida} onValueChange={val => setFormData({...formData, unidade_medida: val})}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UN">Unidade (UN)</SelectItem>
                  <SelectItem value="MT">Metro (MT)</SelectItem>
                  <SelectItem value="M2">Metro Quadrado (M2)</SelectItem>
                  <SelectItem value="KG">Quilo (KG)</SelectItem>
                  <SelectItem value="CX">Caixa (CX)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="relative">
            <Package size={16} className="absolute left-3 top-9 text-muted-foreground z-10" />
            <Input 
              required
              label="Nome da Peça / SKU *"
              className="pl-10" 
              placeholder="Ex: Dobradiça 35mm Click"
              value={formData.nome}
              onChange={e => setFormData({...formData, nome: e.target.value})}
            />
          </div>

          <div className="relative">
            <DollarSign size={16} className="absolute left-3 top-9 text-muted-foreground z-10" />
            <Input 
              required
              type="number"
              step="0.01"
              label="Preço Base de Custo (R$) *"
              className="pl-10" 
              placeholder="0.00"
              value={formData.preco_base || ''}
              onChange={e => setFormData({...formData, preco_base: Number(e.target.value)})}
            />
          </div>

          <div className="flex gap-4 mt-4">
            <Button type="submit" className="flex-1" disabled={saving}>
              {saving ? <Loader2 className="animate-spin mr-2" size={20} /> : <Save className="mr-2" size={20} />}
              Salvar SKU
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

export default SKUPage;
