import { useState } from 'react';
import { Box, Settings2, Search, X } from 'lucide-react';

const ESPESSURAS_PADRAO = [6, 15, 18, 25];
const TIPOS_PADRAO = ['Branco', 'Madeirado', 'Lacca', 'Estrutura', 'Fundo'];

export const ModalMaterial = ({ materiais, onAddEstoque, onAddManual, onClose }: any) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [manualEsp, setManualEsp] = useState(15);
  const [manualTipo, setManualTipo] = useState('Branco');

  const filtered = materiais.filter((m: any) => 
    (m.categoria_id === 'chapas' || m.unidade === 'CHAPA') &&
    (m.nome.toLowerCase().includes(searchTerm.toLowerCase()) || (m.sku && m.sku.toLowerCase().includes(searchTerm.toLowerCase())))
  );

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 hide-on-print" 
      onClick={onClose} 
      onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }} 
      tabIndex={-1}
    >
      <div 
        className="glass-elevated w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-3xl border border-border/40 shadow-2xl flex animate-in fade-in zoom-in duration-300"
        onClick={e => e.stopPropagation()}
      >
        {/* Esquerda: Cadastro do Estoque */}
        <div className="flex-1 flex flex-col p-8 gap-6 border-r border-border/40 min-h-[500px]">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-black flex items-center gap-3 tracking-tight">
              <Box className="text-primary" size={24} /> 
              Selecionar do Estoque
            </h3>
          </div>
          
          <div className="relative group">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <input 
              type="text" 
              placeholder="Buscar por Nome ou SKU..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full h-11 pl-11 pr-4 bg-background/50 border border-border/40 rounded-xl text-sm focus:border-primary/50 focus:ring-1 focus:ring-primary/20 outline-none transition-all"
            />
          </div>

          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3">
            {filtered.map((m: any) => (
              <div 
                key={m.id} 
                onClick={() => onAddEstoque(m)} 
                className="group relative p-4 cursor-pointer bg-white/[0.02] border border-border/40 rounded-2xl hover:border-primary/30 hover:bg-white/[0.04] transition-all"
              >
                <div className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">{m.nome}</div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-[10px] font-mono text-muted-foreground tracking-wider uppercase">{m.sku}</span>
                  <span className="text-[10px] font-black text-primary bg-primary/10 px-2 py-0.5 rounded">
                    {m.espessura || '?'}MM
                  </span>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground opacity-30">
                <Box size={48} className="mb-4" />
                <p className="text-xs font-bold uppercase tracking-widest">Nenhuma chapa encontrada</p>
              </div>
            )}
          </div>
        </div>

        {/* Direita: Adição Manual */}
        <div className="w-[340px] flex flex-col p-8 gap-8 bg-card/20">
          <div className="flex justify-between items-start">
            <h3 className="text-xl font-black flex items-center gap-3 tracking-tight">
              <Settings2 className="text-primary" size={24} /> 
              Manual
            </h3>
            <button onClick={onClose} className="p-1.5 hover:bg-white/5 rounded-lg text-muted-foreground transition-all">
              <X size={20} />
            </button>
          </div>
          
          <div className="space-y-8">
            <div className="space-y-4">
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">ESPESSURA (mm)</label>
              <div className="grid grid-cols-2 gap-2">
                {ESPESSURAS_PADRAO.map(e => (
                  <button 
                    key={e}
                    onClick={() => setManualEsp(e)}
                    className={`h-10 rounded-xl text-xs font-black border transition-all ${
                      manualEsp === e 
                        ? 'bg-primary border-primary text-primary-foreground shadow-primary' 
                        : 'bg-white/5 border-border/40 text-muted-foreground hover:bg-white/10'
                    }`}
                  >
                    {e}mm
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">TIPO DE MATERIAL</label>
              <div className="grid grid-cols-2 gap-2">
                {TIPOS_PADRAO.map(t => (
                  <button 
                    key={t}
                    onClick={() => setManualTipo(t)}
                    className={`h-10 rounded-xl text-xs font-black border transition-all ${
                      manualTipo === t 
                        ? 'bg-primary border-primary text-primary-foreground shadow-primary' 
                        : 'bg-white/5 border-border/40 text-muted-foreground hover:bg-white/10'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <button 
              onClick={() => onAddManual({ nome: `MDF ${manualTipo}`, sku: `MDF-${manualTipo.toUpperCase()}-${manualEsp}MM`, espessura: manualEsp, tipo: manualTipo })}
              className="w-full h-12 mt-4 rounded-xl bg-gradient-to-br from-primary to-primary-hover text-primary-foreground font-black text-[11px] uppercase tracking-widest shadow-lg shadow-primary/20 hover:brightness-110 active:scale-95 transition-all"
            >
              + INSERIR CHAPA
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

