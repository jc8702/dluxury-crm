import { useState } from 'react';
import { Pencil, Trash2, Package, DollarSign } from 'lucide-react';

interface ItemCardProps {
  item: {
    id: string;
    nomeCustomizado: string;
    quantidade: number;
    largura: string | number;
    altura: string | number;
    espessura: string | number;
    material?: string;
    skuComponenteId?: string | null;
    skuCodigo?: string | null;
    skuDescricao?: string | null;
    custoUnitarioCalculado?: number;
    precoVendaUnitario?: number;
    observacoes?: string;
  };
  onUpdate?: (itemId: string, updates: any) => void;
  onDelete?: (itemId: string) => void;
}

export function ItemCard({ item, onUpdate, onDelete }: ItemCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState({
    quantidade: item.quantidade,
    largura: item.largura,
    altura: item.altura,
    espessura: item.espessura,
    material: item.material || '',
    skuCodigo: item.skuCodigo || ''
  });

  const handleSave = () => {
    if (onUpdate) {
      onUpdate(item.id, editedData);
    }
    setIsEditing(false);
  };

  const precoTotal = (Number(item.precoVendaUnitario) || 0) * Number(item.quantidade);
  const temSKU = !!item.skuComponenteId || !!item.skuCodigo;

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-800 p-4 hover:border-orange-600/50 transition-colors">
      {/* Cabeçalho do Card */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-orange-500 font-bold text-sm">ITM</span>
            <h3 className="text-white font-semibold text-lg">
              {item.nomeCustomizado}
            </h3>
          </div>
          
          {/* Status do SKU */}
          {temSKU ? (
            <div className="flex items-center gap-2 text-sm">
              <Package className="w-4 h-4 text-green-500" />
              <span className="text-green-400 font-mono">{item.skuCodigo}</span>
              <span className="text-gray-400">|</span>
              <span className="text-gray-300">{item.skuDescricao}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-yellow-500">
              <Package className="w-4 h-4" />
              <span className="italic">SKU não identificado - Definir manualmente</span>
            </div>
          )}
        </div>

        {/* Ações */}
        <div className="flex gap-2">
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="p-2 hover:bg-gray-800 rounded"
            title="Editar"
          >
            <Pencil className="w-4 h-4 text-gray-400" />
          </button>
          {onDelete && (
            <button
              onClick={() => {
                if (confirm('Remover este item do orçamento?')) {
                  onDelete(item.id);
                }
              }}
              className="p-2 hover:bg-red-900/20 rounded"
              title="Remover"
            >
              <Trash2 className="w-4 h-4 text-red-400" />
            </button>
          )}
        </div>
      </div>

      {/* Dados Dimensionais */}
      <div className="grid grid-cols-5 gap-3 mb-3 text-sm">
        <div>
          <label className="text-gray-500 text-xs uppercase block mb-1">QTD</label>
          {isEditing ? (
            <input
              type="number"
              value={editedData.quantidade}
              onChange={(e) => setEditedData({ ...editedData, quantidade: parseFloat(e.target.value) })}
              className="w-full bg-gray-800 text-white px-2 py-1 rounded"
            />
          ) : (
            <span className="text-white font-semibold">{item.quantidade}</span>
          )}
        </div>

        <div>
          <label className="text-gray-500 text-xs uppercase block mb-1">Largura (cm)</label>
          {isEditing ? (
            <input
              type="text"
              value={editedData.largura}
              onChange={(e) => setEditedData({ ...editedData, largura: e.target.value })}
              className="w-full bg-gray-800 text-white px-2 py-1 rounded"
            />
          ) : (
            <span className="text-white">{item.largura || '-'}</span>
          )}
        </div>

        <div>
          <label className="text-gray-500 text-xs uppercase block mb-1">Altura (cm)</label>
          {isEditing ? (
            <input
              type="text"
              value={editedData.altura}
              onChange={(e) => setEditedData({ ...editedData, altura: e.target.value })}
              className="w-full bg-gray-800 text-white px-2 py-1 rounded"
            />
          ) : (
            <span className="text-white">{item.altura || '-'}</span>
          )}
        </div>

        <div>
          <label className="text-gray-500 text-xs uppercase block mb-1">Esp (mm)</label>
          {isEditing ? (
            <input
              type="text"
              value={editedData.espessura}
              onChange={(e) => setEditedData({ ...editedData, espessura: e.target.value })}
              className="w-full bg-gray-800 text-white px-2 py-1 rounded"
            />
          ) : (
            <span className="text-white">{item.espessura || '-'}</span>
          )}
        </div>

        <div>
          <label className="text-gray-500 text-xs uppercase block mb-1">Material</label>
          {isEditing ? (
            <input
              type="text"
              value={editedData.material}
              onChange={(e) => setEditedData({ ...editedData, material: e.target.value })}
              className="w-full bg-gray-800 text-white px-2 py-1 rounded"
              placeholder="Defina o material..."
            />
          ) : (
            <span className="text-white">{item.material || 'A definir'}</span>
          )}
        </div>
      </div>

      {/* Campo SKU Editável */}
      {isEditing && (
        <div className="mb-3">
          <label className="text-gray-500 text-xs uppercase block mb-1">
            Código SKU (caso queira alterar)
          </label>
          <input
            type="text"
            value={editedData.skuCodigo}
            onChange={(e) => setEditedData({ ...editedData, skuCodigo: e.target.value })}
            className="w-full bg-gray-800 text-white px-3 py-2 rounded"
            placeholder="Ex: CHP-0001, FRG-0023..."
          />
        </div>
      )}

      {/* Seção de Preços */}
      <div className="border-t border-gray-800 pt-3 mt-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-gray-400" />
            <span className="text-gray-400 text-sm">Custo Unitário</span>
          </div>
          <span className="text-gray-300 font-mono">
            R$ {Number(item.custoUnitarioCalculado || 0).toFixed(2)}
          </span>
        </div>

        <div className="flex justify-between items-center mt-2">
          <span className="text-gray-400 text-sm">Preço de Venda Un.</span>
          <span className={`font-mono font-semibold ${temSKU ? 'text-green-400' : 'text-gray-500'}`}>
            R$ {Number(item.precoVendaUnitario || 0).toFixed(2)}
          </span>
        </div>

        <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-700">
          <span className="text-white font-semibold">TOTAL</span>
          <span className="text-orange-500 font-bold text-lg">
            R$ {precoTotal.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Botão Salvar (modo edição) */}
      {isEditing && (
        <div className="mt-3 flex gap-2">
          <button
            onClick={handleSave}
            className="flex-1 bg-green-600 hover:bg-green-500 text-white py-2 rounded font-semibold"
          >
            Salvar Alterações
          </button>
          <button
            onClick={() => setIsEditing(false)}
            className="px-4 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded"
          >
            Cancelar
          </button>
        </div>
      )}

      {/* Observações */}
      {item.observacoes && (
        <div className="mt-3 text-xs text-gray-500 italic">
          {item.observacoes}
        </div>
      )}
    </div>
  );
}
