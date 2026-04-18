import React, { useState } from 'react';
import { usePlanoDeCorte } from '../../hooks/usePlanoDeCorte';
import { MaterialCard } from '../components/MaterialCard';
import { ResultadoCanvas } from '../components/ResultadoCanvas';
import { 
  Play, 
  Save, 
  FileUp, 
  FolderOpen, 
  ChevronRight, 
  BarChart3, 
  Layers, 
  Maximize2,
  Package,
  Cpu
} from 'lucide-react';
import { parseCSV, downloadCSVTemplate } from '../../../application/usecases/csvHandler';
import { StressTester } from '../components/StressTester';
import { generateLabelsPDF } from '../../../application/usecases/labelGenerator';

const PlanoDeCortePage: React.FC = () => {
  const { 
    plano, 
    setPlano, 
    resultado, 
    loading, 
    calculando, 
    otimizar, 
    addMaterial, 
    removeMaterial, 
    updateMaterial, 
    salvar,
    handleAprovarProducao
  } = usePlanoDeCorte();

  const [searchStock, setSearchStock] = useState('');
  const [stockResults, setStockResults] = useState<any[]>([]);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleSearchStock = async (term: string) => {
    setSearchStock(term);
    if (term.length > 2) {
      const results = await planoDeCorteRepository.buscarChapas(term);
      setStockResults(results);
    } else {
      setStockResults([]);
    }
  };

  const selectChapa = (chapa: any) => {
    addMaterial({
      id: Math.random().toString(36).substr(2, 9),
      sku: chapa.sku,
      nome: chapa.nome,
      largura_mm: Number(chapa.largura_mm),
      altura_mm: Number(chapa.altura_mm),
      espessura_mm: Number(chapa.espessura_mm),
      preco_unitario: Number(chapa.preco_unitario),
      pecas: []
    });
    setSearchStock('');
    setStockResults([]);
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const novosMateriais = parseCSV(text);
        setPlano(prev => ({
          ...prev,
          materiais: [...(prev.materiais || []), ...novosMateriais]
        }));
        alert(`Importação concluída: ${novosMateriais.length} materiais adicionados.`);
      } catch (err) {
        alert('Erro ao processar CSV. Verifique o formato.');
      }
    };
    reader.readAsText(file);
  };

  const handleImportEngenharia = async () => {
    const sku = prompt('Digite o SKU de Engenharia: (Ex: KIT-COZINHA-LUX-01)');
    if (!sku) return;
    
    setLoading(true);
    try {
      const results = await planoDeCorteRepository.buscarEngenharia(sku);
      if (results.length > 0) {
        const eng = results[0];
        
        // 1. Agrupar peças por material_ref
        const grupos: Record<string, any[]> = {};
        eng.componentes.forEach((c: any) => {
          if (!grupos[c.material_ref]) grupos[c.material_ref] = [];
          grupos[c.material_ref].push(c);
        });

        // 2. Para cada grupo, buscar dados da chapa no estoque
        const novosMateriais: ChapaMaterial[] = [];
        
        for (const matSku in grupos) {
          const chapasDisponiveis = await planoDeCorteRepository.buscarChapas(matSku);
          const chapaInfo = chapasDisponiveis.find(c => c.sku === matSku) || {
            sku: matSku,
            nome: `Material: ${matSku}`,
            largura_mm: 2750,
            altura_mm: 1830,
            espessura_mm: 18
          };

          novosMateriais.push({
            id: Math.random().toString(36).substr(2, 9),
            sku: chapaInfo.sku,
            nome: chapaInfo.nome,
            largura_mm: Number(chapaInfo.largura_mm),
            altura_mm: Number(chapaInfo.altura_mm),
            espessura_mm: Number(chapaInfo.espessura_mm),
            pecas: grupos[matSku].map(p => ({
              id: Math.random().toString(36).substr(2, 9),
              nome: p.nome,
              largura_mm: Number(p.largura_mm),
              altura_mm: Number(p.altura_mm),
              quantidade: Number(p.quantidade),
              rotacionavel: true
            }))
          });
        }

        if (confirm(`Encontrado: ${eng.nome}. Importar ${novosMateriais.length} materiais e ${eng.componentes.length} peças?`)) {
          setPlano(prev => ({
            ...prev,
            sku_engenharia: eng.sku,
            materiais: [...(prev.materiais || []), ...novosMateriais]
          }));
        }
      } else {
        alert('SKU de engenharia não encontrado.');
      }
    } catch (e) {
      console.error(e);
      alert('Erro na busca de engenharia.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#0D1117] text-[#C9D1D9]">
      {/* Header */}
      <header className="h-16 border-b border-[#21262D] px-6 flex items-center justify-between bg-[#161B22] shadow-sm z-20">
        <div className="flex items-center gap-4">
          <div className="bg-[#E2AC00] p-2 rounded-lg">
            <Maximize2 className="text-black" size={20} />
          </div>
          <div>
            <h1 className="text-white font-bold leading-tight">Plano de Corte Industrial</h1>
            <div className="flex items-center gap-2 text-[10px] text-[#8B949E] uppercase tracking-widest font-bold">
              <span>D'Luxury ERP</span>
              <ChevronRight size={10} />
              <span>Otimizador v2.0</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleImportCSV} 
            accept=".csv" 
            className="hidden" 
          />
          <div className="flex flex-col gap-1">
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 text-sm font-bold border border-[#2D333B] rounded-lg hover:bg-[#21262D] transition-all text-[#8B949E] hover:text-white"
            >
              <FileUp size={16} /> IMPORTAR CSV
            </button>
            <button 
              onClick={downloadCSVTemplate}
              className="text-[9px] text-[#8B949E] hover:text-[#E2AC00] text-right pr-1"
            >
              Baixar Template CSV
            </button>
          </div>
          <button 
            onClick={handleImportEngenharia}
            className="flex items-center gap-2 px-4 py-2 text-sm font-bold border border-[#2D333B] rounded-lg hover:bg-[#21262D] transition-all text-[#8B949E] hover:text-white"
          >
            <FolderOpen size={16} /> DO ENGENHARIA
          </button>
          <div className="w-[1px] h-6 bg-[#2D333B] mx-2" />
          {resultado && (
            <button 
              onClick={handleAprovarProducao}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2 bg-green-600/10 text-green-400 border border-green-500/30 font-bold rounded-lg hover:bg-green-600/20 transition-all disabled:opacity-50"
            >
              <Package size={18} /> APROVAR PRODUÇÃO
            </button>
          )}
          <button 
            onClick={salvar}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2 bg-[#1C2128] text-[#E2AC00] border border-[#E2AC00]/30 font-bold rounded-lg hover:bg-[#E2AC00]/10 transition-all disabled:opacity-50"
          >
            <Save size={18} /> SALVAR RESULTADO
          </button>
          <button 
            onClick={otimizar}
            disabled={calculando}
            className="flex items-center gap-2 px-8 py-2 bg-[#E2AC00] text-black font-extrabold rounded-lg hover:bg-[#FFC400] shadow-[0_0_15px_rgba(226,172,0,0.3)] transition-all disabled:opacity-50"
          >
            {calculando ? <Cpu className="animate-spin" size={18} /> : <Play fill="currentColor" size={18} />}
            OTIMIZAR AGORA
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: Inputs */}
        <div className="w-[450px] border-r border-[#21262D] flex flex-col bg-[#161B22]">
          <div className="p-6 border-b border-[#21262D]">
            <label className="text-xs font-bold text-[#8B949E] uppercase mb-2 block">Materiais e Peças</label>
            <div className="relative">
              <input 
                type="text"
                placeholder="Buscar material no estoque (SKU ou Nome)..."
                value={searchStock}
                onChange={(e) => handleSearchStock(e.target.value)}
                className="w-full bg-[#0D1117] border border-[#2D333B] rounded-xl px-4 py-3 text-sm focus:border-[#E2AC00] focus:ring-1 focus:ring-[#E2AC00] transition-all"
              />
              {stockResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-[#1C2128] border border-[#2D333B] rounded-xl shadow-2xl z-50 overflow-hidden">
                  {stockResults.map(s => (
                    <div 
                      key={s.id} 
                      onClick={() => selectChapa(s)}
                      className="p-3 hover:bg-[#2D333B] cursor-pointer flex justify-between items-center border-b border-[#21262D] last:border-0"
                    >
                      <div>
                        <div className="text-white font-bold text-sm">{s.sku}</div>
                        <div className="text-[#8B949E] text-[10px]">{s.nome}</div>
                      </div>
                      <div className="text-[#E2AC00] text-xs font-bold">{s.largura_mm}x{s.altura_mm}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="mt-3 flex gap-2">
                <button 
                    onClick={() => selectChapa({ sku: 'MANUAL', nome: 'Material Customizado', largura_mm: 2750, altura_mm: 1840, espessura_mm: 18 })}
                    className="flex-1 bg-transparent border border-[#2D333B] text-[#C9D1D9] text-[10px] font-bold py-2 rounded-lg hover:border-[#8B949E]"
                >
                    + CONFIGURAÇÃO MANUAL
                </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-[#21262D]">
            <StressTester onInject={(mats) => setPlano(prev => ({ ...prev, materiais: [...(prev.materiais || []), ...mats] }))} />
            {plano.materiais?.map((mat, idx) => (
              <MaterialCard 
                key={mat.id} 
                material={mat} 
                onUpdate={(upd) => updateMaterial(idx, upd)}
                onRemove={() => removeMaterial(idx)}
              />
            ))}
            {(!plano.materiais || plano.materiais.length === 0) && (
              <div className="h-full flex flex-col items-center justify-center text-center p-10">
                <div className="w-16 h-16 bg-[#21262D] rounded-full flex items-center justify-center mb-4">
                  <Package className="text-[#8B949E]" size={32} />
                </div>
                <h3 className="text-white font-bold mb-2">Inicie seu Plano de Corte</h3>
                <p className="text-[#8B949E] text-sm leading-relaxed">
                  Adicione chapas do estoque ou configure manualmente para começar a incluir peças.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Center: Visualization */}
        <div className="flex-1 bg-[#090C10] p-10 overflow-auto scrollbar-none flex flex-col items-center">
          {resultado ? (
            <ResultadoCanvas resultado={resultado} />
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
              <Layers size={64} className="mb-6 text-[#8B949E]" />
              <h2 className="text-2xl font-light text-white mb-2">Aguardando Otimização</h2>
              <p className="text-[#8B949E]">Configure os materiais e peças à esquerda e clique em <b>OTIMIZAR AGORA</b></p>
            </div>
          )}
        </div>

        {/* Right Sidebar: KPIs */}
        <div className="w-80 border-l border-[#21262D] bg-[#161B22] p-6">
          <h3 className="text-xs font-bold text-[#8B949E] uppercase tracking-widest mb-6 flex items-center gap-2">
            <BarChart3 size={14} /> Estatísticas Gerais
          </h3>

          <div className="space-y-6">
            <div>
              <span className="text-[#8B949E] text-[10px] block mb-2 font-bold">APROVEITAMENTO GERAL</span>
              <div className="flex items-center gap-4">
                <div className="flex-1 h-3 bg-[#0D1117] rounded-full overflow-hidden border border-[#2D333B]">
                  <div 
                    className={`h-full transition-all duration-1000 ${
                        (resultado?.aproveitamento_percentual || 0) >= 80 ? 'bg-green-500' : 
                        (resultado?.aproveitamento_percentual || 0) >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${resultado?.aproveitamento_percentual || 0}%` }}
                  />
                </div>
                <span className="text-white font-mono font-bold">{Math.round(resultado?.aproveitamento_percentual || 0)}%</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#0D1117] border border-[#2D333B] p-4 rounded-xl">
                <span className="text-[#8B949E] text-[10px] block mb-1">TOTAL CHAPAS</span>
                <span className="text-2xl font-bold text-white">{resultado?.chapas_necessarias || 0}</span>
              </div>
              <div className="bg-[#0D1117] border border-[#2D333B] p-4 rounded-xl">
                <span className="text-[#8B949E] text-[10px] block mb-1">ÁREA ÚTIL</span>
                <span className="text-2xl font-bold text-white">{Math.round((resultado?.layouts.reduce((acc, l) => acc + l.area_aproveitada_mm2, 0) || 0) / 1000000)}m²</span>
              </div>
            </div>

            <div className="pt-6 border-t border-[#21262D]">
              <div className="flex justify-between items-center text-xs mb-3">
                <span className="text-[#8B949E]">Tempo de Cálculo:</span>
                <span className="text-[#C9D1D9] font-mono">{resultado?.tempo_calculo_ms.toFixed(0)} ms</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-[#8B949E]">Status:</span>
                <span className={`font-bold ${resultado ? 'text-green-500' : 'text-yellow-500'}`}>
                    {calculando ? 'Calculando...' : resultado ? 'Otimizado' : 'Aguardando'}
                </span>
              </div>
            </div>
            
            {resultado && (
                <button 
                    onClick={() => generateLabelsPDF(resultado)}
                    className="w-full mt-10 bg-transparent border border-[#E2AC00] text-[#E2AC00] py-4 rounded-xl font-bold hover:bg-[#E2AC00] hover:text-black transition-all uppercase tracking-widest text-xs"
                >
                    Imprimir Etiquetas
                </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default PlanoDeCortePage;
