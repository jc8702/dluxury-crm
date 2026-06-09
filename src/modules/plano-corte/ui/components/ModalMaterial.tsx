import { useState } from 'react';
import { Box, Settings2 } from 'lucide-react';
import { Modal } from '../../../../components/common';
import { Button, Input } from '../../../../components/ui';

const ESPESSURAS_PADRAO = [6, 15, 18, 25];
const TIPOS_PADRAO = ['Branco', 'Madeirado', 'Lacca', 'Estrutura', 'Fundo'];

export const ModalMaterial = ({ materiais, onAddEstoque, onAddManual, onClose }: any) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [manualEsp, setManualEsp] = useState(15);
  const [manualTipo, setManualTipo] = useState('Branco');

  const filtered = materiais.filter(
    (m: any) =>
      (m.categoria_id?.toLowerCase() === 'chp' ||
        m.categoria_id?.toLowerCase() === 'chapas' ||
        m.categoria_nome?.toLowerCase().includes('chapa') ||
        m.sku?.toUpperCase().startsWith('CHP-') ||
        m.unidade?.toLowerCase() === 'chapa') &&
      (m.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (m.sku && m.sku.toLowerCase().includes(searchTerm.toLowerCase()))),
  );

  return (
    <Modal open={true} onClose={onClose} title="Selecionar Chapa / Material" size="xl">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Esquerda: Cadastro do Estoque */}
        <div className="md:col-span-2 flex flex-col gap-4 pr-0 md:pr-6 border-r-0 md:border-r border-border min-h-[400px]">
          <h3 className="text-base font-bold flex items-center gap-2">
            <Box className="text-primary" size={20} />
            Selecionar do Estoque
          </h3>

          <Input
            type="text"
            placeholder="Buscar por Nome ou SKU..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          <div className="flex-1 overflow-y-auto max-h-[350px] pr-2 custom-scrollbar space-y-2">
            {filtered.map((m: any) => (
              <div
                key={m.id}
                onClick={() => onAddEstoque(m)}
                className="group relative p-3 cursor-pointer bg-foreground/5 border border-border/40 rounded-xl hover:border-primary/50 hover:bg-foreground/10 transition-all flex justify-between items-center"
              >
                <div>
                  <div className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">
                    {m.nome}
                  </div>
                  <div className="text-xs font-mono text-muted-foreground mt-1 uppercase tracking-wider">
                    {m.sku}
                  </div>
                </div>
                <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
                  {m.espessura || '?'}MM
                </span>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground opacity-50">
                <Box size={40} className="mb-2" />
                <p className="text-xs font-bold uppercase tracking-widest">
                  Nenhuma chapa encontrada
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Direita: Adição Manual */}
        <div className="flex flex-col gap-6">
          <h3 className="text-base font-bold flex items-center gap-2">
            <Settings2 className="text-primary" size={20} />
            Inserção Manual
          </h3>

          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                Espessura (mm)
              </label>
              <div className="grid grid-cols-2 gap-2">
                {ESPESSURAS_PADRAO.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => setManualEsp(e)}
                    className={`h-9 rounded-lg text-xs font-bold border transition-all ${
                      manualEsp === e
                        ? 'bg-primary border-primary text-primary-foreground shadow-sm shadow-primary/20'
                        : 'bg-white/5 border-border/40 text-muted-foreground hover:bg-white/10'
                    }`}
                  >
                    {e}mm
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                Tipo de Material
              </label>
              <div className="grid grid-cols-2 gap-2">
                {TIPOS_PADRAO.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setManualTipo(t)}
                    className={`h-9 rounded-lg text-xs font-bold border transition-all ${
                      manualTipo === t
                        ? 'bg-primary border-primary text-primary-foreground shadow-sm shadow-primary/20'
                        : 'bg-white/5 border-border/40 text-muted-foreground hover:bg-white/10'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <Button
              type="button"
              onClick={() =>
                onAddManual({
                  nome: `MDF ${manualTipo}`,
                  sku: `MDF-${manualTipo.toUpperCase()}-${manualEsp}MM`,
                  espessura: manualEsp,
                  tipo: manualTipo,
                })
              }
              className="w-full mt-2"
            >
              + Inserir Chapa
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
