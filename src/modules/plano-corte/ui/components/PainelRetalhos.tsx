import React, { useState, useEffect } from 'react';
import type { Retalho, FiltrosRetalho } from '../../domain/entities/Retalho';
import { retalhosRepository } from '../../infrastructure/repositories/RetalhosRepository';
import { 
  Package, 
  Search, 
  Trash2, 
  History, 
  Layers, 
  ExternalLink,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle
} from 'lucide-react';

export const PainelRetalhos: React.FC = () => {
  const [retalhos, setRetalhos] = useState<Retalho[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<FiltrosRetalho>({ disponivel: true });
  const [stats, setStats] = useState({ total: 0, areaTotal: 0, economiaEstimada: 0 });

  useEffect(() => {
    carregarEstoque();
  }, [filtro]);

  const carregarEstoque = async () => {
    setLoading(true);
    try {
      const data = await retalhosRepository.listarEstoque();
      // Aplicar filtros locais por enquanto para agilidade
      let filtrados = data;
      if (filtro.sku_chapa) filtrados = filtrados.filter(r => r.sku_chapa.includes(filtro.sku_chapa!));
      if (filtro.disponivel !== undefined) filtrados = filtrados.filter(r => r.disponivel === filtro.disponivel);
      
      setRetalhos(filtrados);
      
      // Calcular stats
      const total = filtrados.length;
      const area = filtrados.reduce((acc, r) => acc + (r.largura_mm * r.altura_mm), 0) / 1000000; // m2
      setStats({
        total,
        areaTotal: area,
        economiaEstimada: area * 150 // R$ 150/m2 médio
      });
    } catch (error) {
      console.error('Erro ao carregar retalhos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDescarte = async (id: string) => {
    if (!confirm('Deseja realmente descartar este retalho?')) return;
    try {
      await retalhosRepository.descartarRetalho(id, 'Descarte manual via painel');
      carregarEstoque();
    } catch (error) {
      alert('Erro ao descartar retalho');
    }
  };

  return (
    <div className="bg-[#0D1117] min-h-screen p-6 text-gray-200">
      {/* HEADER & STATS */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <Package className="text-[#E2AC00]" />
            Estoque de Retalhos Reutilizáveis
          </h1>
          <p className="text-gray-400 mt-1">Gerencie as sobras de corte e otimize seu consumo de MDF</p>
        </div>

        <div className="flex gap-4">
          <StatCard 
            label="Total Itens" 
            value={stats.total} 
            icon={<Layers className="text-blue-400" />} 
          />
          <StatCard 
            label="Área Total" 
            value={`${stats.areaTotal.toFixed(2)} m²`} 
            icon={<Package className="text-green-400" />} 
          />
          <StatCard 
            label="Economia" 
            value={`R$ ${stats.economiaEstimada.toLocaleString()}`} 
            icon={<CheckCircle2 className="text-yellow-400" />} 
          />
        </div>
      </div>

      {/* FILTROS */}
      <div className="bg-[#161B22] p-4 rounded-xl border border-[#30363D] mb-6 flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
          <input 
            type="text" 
            placeholder="Filtrar por SKU (MDF-BRANCO...)"
            className="w-full bg-[#0D1117] border border-[#30363D] rounded-lg py-2 pl-10 pr-4 focus:border-[#E2AC00] outline-none"
            onChange={(e) => setFiltro({ ...filtro, sku_chapa: e.target.value })}
          />
        </div>

        <select 
          className="bg-[#0D1117] border border-[#30363D] rounded-lg py-2 px-4 outline-none"
          onChange={(e) => setFiltro({ ...filtro, disponivel: e.target.value === 'true' })}
        >
          <option value="true">Disponíveis</option>
          <option value="false">Todos</option>
        </select>

        <button className="flex items-center gap-2 bg-[#21262D] hover:bg-[#30363D] px-4 py-2 rounded-lg transition-colors">
          <Filter className="w-4 h-4" />
          Mais Filtros
        </button>
      </div>

      {/* TABELA */}
      <div className="bg-[#161B22] rounded-xl border border-[#30363D] overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#21262D] text-gray-400 text-sm uppercase tracking-wider">
              <th className="px-6 py-4 font-semibold">Material / SKU</th>
              <th className="px-6 py-4 font-semibold">Dimensões (mm)</th>
              <th className="px-6 py-4 font-semibold">Origem</th>
              <th className="px-6 py-4 font-semibold">Estado</th>
              <th className="px-6 py-4 font-semibold">Data</th>
              <th className="px-6 py-4 font-semibold text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#30363D]">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                  <div className="flex justify-center mb-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#E2AC00]"></div>
                  </div>
                  Carregando estoque...
                </td>
              </tr>
            ) : retalhos.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                  Nenhum retalho encontrado com os filtros atuais.
                </td>
              </tr>
            ) : (
              retalhos.map((retalho) => (
                <tr key={retalho.id} className="hover:bg-[#1C2128] transition-colors group">
                  <td className="px-6 py-4">
                    <div className="font-medium text-white">{retalho.sku_chapa}</div>
                    <div className="text-xs text-gray-500">{retalho.nome_material || 'MDF Industrial'}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="bg-[#23863622] text-[#3fb950] px-2 py-0.5 rounded text-xs border border-[#23863644]">
                        {retalho.largura_mm} x {retalho.altura_mm}
                      </span>
                      <span className="text-gray-500 text-xs">{retalho.espessura_mm}mm</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-400">
                    <div className="flex items-center gap-1">
                      {retalho.origem === 'sobra_plano_corte' ? <History className="w-3 h-3" /> : <Package className="w-3 h-3" />}
                      {retalho.origem.replace('_', ' ')}
                    </div>
                    {retalho.projeto_origem && (
                      <div className="text-[10px] text-gray-600 truncate max-w-[150px]">{retalho.projeto_origem}</div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {retalho.disponivel ? (
                      <span className="flex items-center gap-1.5 text-xs text-green-400">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.5)]"></div>
                        Em Estoque
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-xs text-gray-500">
                        <div className="w-1.5 h-1.5 rounded-full bg-gray-500"></div>
                        Utilizado
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-500">
                    {new Date(retalho.criado_em).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-2 hover:bg-[#30363D] rounded-lg text-gray-400 hover:text-white transition-colors">
                        <ExternalLink className="w-4 h-4" />
                      </button>
                      {retalho.disponivel && (
                        <button 
                          onClick={() => handleDescarte(retalho.id)}
                          className="p-2 hover:bg-red-900/30 rounded-lg text-gray-400 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* RODAPÉ INFO */}
      <div className="mt-6 flex items-center gap-2 text-xs text-gray-500">
        <AlertTriangle className="w-3 h-3 text-[#E2AC00]" />
        <span>Retalhos menores que 300x300mm são automaticamente descartados pelo sistema para otimizar espaço.</span>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ label: string; value: string | number; icon: React.ReactNode }> = ({ label, value, icon }) => (
  <div className="bg-[#161B22] border border-[#30363D] p-4 rounded-xl min-w-[140px]">
    <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
      {icon}
      {label}
    </div>
    <div className="text-xl font-bold text-white">{value}</div>
  </div>
);
