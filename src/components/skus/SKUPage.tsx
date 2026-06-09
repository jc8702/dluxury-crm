import React, { useState, useEffect } from 'react';
import {
  Layers,
  Plus,
  Search,
  Loader2,
  Save,
  Tag,
  DollarSign,
  Package,
  Edit,
  Factory,
  Truck,
  Clock,
} from 'lucide-react';
import { api } from '../../lib/api';
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
import DataTable from '../common/DataTable';

const CATEGORIAS_TAXONOMIA = [
  { value: 'CHP', label: 'Chapas (MDF/MDP)' },
  { value: 'FBD', label: 'Fitas de Borda' },
  { value: 'FER', label: 'Ferragens (Dobradi�as, Corredi�as)' },
  { value: 'AC', label: 'Acess�rios' },
  { value: 'MD', label: 'Madeiras Maci�as' },
  { value: 'ACM', label: 'ACM / Metais' },
  { value: 'VID', label: 'Vidros / Espelhos' },
  { value: 'OUT', label: 'Outros Insumos' },
];

const SKUPage: React.FC = () => {
  const [skus, setSkus] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const defaultForm = {
    id: '',
    sku_code: '',
    nome: '',
    preco_base: 0,
    unidade_medida: 'UN',
    categoria_taxonomia: '',
    fabricante: '',
    fornecedor_principal: '',
    lead_time_dias: 0,
    atributos: {},
  };
  const [formData, setFormData] = useState(defaultForm);

  const [calcModoChapa, setCalcModoChapa] = useState(false);
  const [chapaPrecoInteira, setChapaPrecoInteira] = useState(0);
  const [chapaComprimento, setChapaComprimento] = useState(2.75);
  const [chapaLargura, setChapaLargura] = useState(1.85);

  useEffect(() => {
    if (calcModoChapa && chapaComprimento > 0 && chapaLargura > 0) {
      const area = chapaComprimento * chapaLargura;
      const precoM2 = chapaPrecoInteira / area;
      setFormData((prev) => ({ ...prev, preco_base: precoM2 || 0 }));
    }
  }, [calcModoChapa, chapaPrecoInteira, chapaComprimento, chapaLargura]);

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

  const handleCategoriaChange = async (val: string) => {
    setFormData((prev) => ({ ...prev, categoria_taxonomia: val }));
    if (!formData.id) {
      try {
        const res = await api.skus.getNextCode(val);
        if (res?.nextCode) {
          setFormData((prev) => ({ ...prev, sku_code: res.nextCode }));
        }
      } catch (err) {
        console.error('Failed to get next code:', err);
      }
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (formData.id) {
        await api.skus.update(formData.id, formData);
      } else {
        await api.skus.create(formData);
      }
      setIsModalOpen(false);
      setFormData(defaultForm);
      setCalcModoChapa(false);
      await fetchSKUs();
    } catch (err) {
      console.error('Failed to save SKU:', err);
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (s: any) => {
    setFormData({
      id: s.id,
      sku_code: s.sku,
      nome: s.nome,
      preco_base: Number(s.preco_base) || 0,
      unidade_medida: s.unidade_medida || 'UN',
      categoria_taxonomia: s.categoria_taxonomia || '',
      fabricante: s.fabricante || '',
      fornecedor_principal: s.fornecedor_principal || '',
      lead_time_dias: Number(s.lead_time_dias) || 0,
      atributos: {},
    });
    setCalcModoChapa(false);
    setIsModalOpen(true);
  };

  const filteredSkus = skus.filter((s) => {
    const term = searchTerm.toLowerCase();
    return (
      s.nome.toLowerCase().includes(term) ||
      s.sku.toLowerCase().includes(term) ||
      (s.categoria_taxonomia || '').toLowerCase().includes(term)
    );
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
              Cat�logo de Pe�as / SKUs
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Gerenciamento at�mico de insumos t�cnicos e acess�rios.
            </p>
          </div>
        </div>
        <Button
          onClick={() => {
            setFormData(defaultForm);
            setIsModalOpen(true);
          }}
        >
          <Plus size={20} className="mr-2" /> Novo SKU
        </Button>
      </header>

      <Card className="p-4">
        <CardContent className="p-0 flex gap-4 items-center">
          <div className="relative flex-1">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              className="pl-10"
              placeholder="Buscar por descri��o, c�digo ou categoria..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <div className="card p-6">
        {loading ? (
          <div className="py-20 flex flex-col justify-center items-center gap-3 text-muted-foreground">
            <Loader2 className="animate-spin text-primary" size={32} />
            <span className="text-sm font-semibold tracking-wider">
              Sincronizando com o banco industrial...
            </span>
          </div>
        ) : (
          <DataTable
            headers={[
              'C�digo SKU',
              'Categoria',
              'Nome do Item',
              'Unidade',
              'Pre�o Base',
              'Status',
              'A��es',
            ]}
            data={filteredSkus}
            renderRow={(s) => (
              <>
                <td className="p-4">
                  <span className="bg-primary/10 text-primary px-2.5 py-0.5 rounded-full text-xs font-bold border border-primary/20">
                    {s.sku}
                  </span>
                </td>
                <td className="p-4">
                  <span className="text-xs font-medium text-muted-foreground bg-secondary px-2 py-1 rounded-md">
                    {s.categoria_taxonomia || '-'}
                  </span>
                </td>
                <td className="p-4 font-semibold">{s.nome}</td>
                <td className="p-4 text-sm">{s.unidade_medida}</td>
                <td className="p-4 text-sm font-semibold">R$ {Number(s.preco_base).toFixed(2)}</td>
                <td className="p-4">
                  <span
                    className={`flex items-center gap-1.5 text-xs font-bold ${s.ativo ? 'text-success' : 'text-muted-foreground'}`}
                  >
                    <div
                      className={`w-2 h-2 rounded-full ${s.ativo ? 'bg-success' : 'bg-muted-foreground'}`}
                    />
                    {s.ativo ? 'ATIVO' : 'INATIVO'}
                  </span>
                </td>
                <td className="p-4">
                  <button
                    onClick={() => openEdit(s)}
                    className="p-2 hover:bg-secondary rounded-lg text-muted-foreground hover:text-primary transition-colors"
                  >
                    <Edit size={16} />
                  </button>
                </td>
              </>
            )}
            emptyMessage="Nenhum SKU encontrado no cat�logo."
          />
        )}
      </div>

      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={formData.id ? 'Editar SKU' : 'Cadastrar Novo SKU'}
        size="lg"
      >
        <form onSubmit={handleSave} className="flex flex-col gap-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground/90">
                Categoria (Taxonomia) *
              </label>
              <Select
                value={formData.categoria_taxonomia}
                onValueChange={handleCategoriaChange}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a Categoria..." />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIAS_TAXONOMIA.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="relative">
              <Tag size={16} className="absolute left-3 top-9 text-muted-foreground z-10" />
              <Input
                required
                label="C�digo SKU *"
                className="pl-10"
                placeholder="Ex: CHP-0001"
                value={formData.sku_code}
                onChange={(e) => setFormData({ ...formData, sku_code: e.target.value })}
                disabled={!formData.id}
              />
            </div>
          </div>

          <div className="relative">
            <Package size={16} className="absolute left-3 top-9 text-muted-foreground z-10" />
            <Input
              required
              label="Nome da Pe�a / SKU *"
              className="pl-10"
              placeholder="Ex: Dobradi�a 35mm Click"
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground/90">
                Unidade de Medida
              </label>
              <Select
                value={formData.unidade_medida}
                onValueChange={(val) => setFormData({ ...formData, unidade_medida: val })}
              >
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
            <div className="relative md:col-span-2">
              <DollarSign size={16} className="absolute left-3 top-9 text-muted-foreground z-10" />
              <Input
                required
                type="number"
                step="0.0001"
                label={
                  calcModoChapa
                    ? 'Pre�o Base Final Calculado por M² (R$) *'
                    : 'Pre�o Base de Custo (R$) *'
                }
                className={`pl-10 ${calcModoChapa ? 'bg-primary/5 border-primary/20 font-bold' : ''}`}
                placeholder="0.00"
                value={formData.preco_base || ''}
                onChange={(e) => setFormData({ ...formData, preco_base: Number(e.target.value) })}
                disabled={calcModoChapa}
              />
            </div>
          </div>

          {formData.unidade_medida === 'M2' && !formData.id && (
            <div className="mt-2 p-4 bg-muted/10 border border-border rounded-xl space-y-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="rounded border-border bg-background text-orange-500 focus:ring-orange-500 focus:ring-offset-background"
                  checked={calcModoChapa}
                  onChange={(e) => setCalcModoChapa(e.target.checked)}
                />
                <span className="text-sm font-semibold text-foreground">
                  Calcular pre�o base a partir do valor da Chapa Inteira
                </span>
              </label>

              {calcModoChapa && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-border/50">
                  <Input
                    type="number"
                    step="0.01"
                    label="Valor Chapa Inteira (R$)"
                    placeholder="Ex: 230.00"
                    value={chapaPrecoInteira || ''}
                    onChange={(e) => setChapaPrecoInteira(Number(e.target.value))}
                  />
                  <Input
                    type="number"
                    step="0.01"
                    label="Comprimento (Metros)"
                    placeholder="Ex: 2.75"
                    value={chapaComprimento || ''}
                    onChange={(e) => setChapaComprimento(Number(e.target.value))}
                  />
                  <Input
                    type="number"
                    step="0.01"
                    label="Largura (Metros)"
                    placeholder="Ex: 1.85"
                    value={chapaLargura || ''}
                    onChange={(e) => setChapaLargura(Number(e.target.value))}
                  />
                  <div className="col-span-1 md:col-span-3 text-xs text-muted-foreground flex justify-between bg-muted p-2 rounded-lg">
                    <span>
                      Área da Chapa:{' '}
                      <strong>{(chapaComprimento * chapaLargura).toFixed(4)} m²</strong>
                    </span>
                    <span>
                      Custo do M²:{' '}
                      <strong>
                        R$ {(chapaPrecoInteira / (chapaComprimento * chapaLargura)).toFixed(4)}
                      </strong>
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-border">
            <div className="relative">
              <Factory size={16} className="absolute left-3 top-9 text-muted-foreground z-10" />
              <Input
                label="Fabricante"
                className="pl-10"
                placeholder="Ex: Arauco, FGVTN"
                value={formData.fabricante}
                onChange={(e) => setFormData({ ...formData, fabricante: e.target.value })}
              />
            </div>
            <div className="relative">
              <Truck size={16} className="absolute left-3 top-9 text-muted-foreground z-10" />
              <Input
                label="Fornecedor Principal"
                className="pl-10"
                placeholder="Ex: Leo Madeiras"
                value={formData.fornecedor_principal}
                onChange={(e) => setFormData({ ...formData, fornecedor_principal: e.target.value })}
              />
            </div>
            <div className="relative">
              <Clock size={16} className="absolute left-3 top-9 text-muted-foreground z-10" />
              <Input
                type="number"
                label="Lead Time (Dias)"
                className="pl-10"
                placeholder="Ex: 5"
                value={formData.lead_time_dias || ''}
                onChange={(e) =>
                  setFormData({ ...formData, lead_time_dias: Number(e.target.value) })
                }
              />
            </div>
          </div>

          <div className="flex gap-4 mt-4">
            <Button type="submit" className="flex-1" disabled={saving}>
              {saving ? (
                <Loader2 className="animate-spin mr-2" size={20} />
              ) : (
                <Save className="mr-2" size={20} />
              )}
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
