import type { ReactNode } from 'react';
import { createContext, useContext, useState, useMemo, useEffect, useCallback } from 'react';
import { salesforceService } from '../services/salesforceService';
import { apiService, hasAppPin } from '../services/apiService';

export type Client = {
  id: string;
  // Identificação
  cnpj: string;
  razaoSocial: string;
  nomeFantasia?: string;
  porte?: 'ME' | 'EPP' | 'Demais';
  dataAbertura?: string;
  // Atividade
  cnaePrincipal?: string;
  cnaeSecundario?: string;
  naturezaJuridica?: string;
  // Endereço
  logradouro?: string;
  numero?: string;
  complemento?: string;
  cep?: string;
  bairro?: string;
  municipio?: string;
  uf?: string;
  // Contato
  email?: string;
  telefone?: string;
  // Situação Cadastral
  situacaoCadastral?: string;
  dataSituacaoCadastral?: string;
  motivoSituacao?: string;
  // Integração interna
  codigoErp?: string;
  // Legado
  historico?: string;
  frequenciaCompra?: 'Mensal' | 'Bimestral' | 'Trimestral' | 'Semestral' | 'Anual';
};
export type Billing = { 
  id: string; 
  nf: string; 
  pedido: string; 
  cliente: string; 
  erp: string; 
  valor: number; 
  data: string; 
  status: 'FATURADO' | 'PENDENTE' | 'CANCELADO';
};
export type KanbanItem = { 
  id: string; 
  title: string; 
  subtitle?: string; 
  label?: string; 
  status: string; 
  type: 'project' | 'visit';
  dateTime?: string;
  visitFormat?: 'Presencial' | 'Online';
  description?: string;
};
export type OfflineSync = { id: string; data: any; timestamp: string; status: 'PENDING' | 'SYNCED' | 'FAILED'; };

export type SystemLog = {
  id: string;
  type: string;
  message: string;
  timestamp: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
};

interface AppContextType {
  taxaFinanceiraPadrao: number;
  setTaxaFinanceiraPadrao: (val: number) => void;
  metaMensal: number;
  setMetaMensal: (val: number) => void;
  monthlyGoals: Record<string, number>;
  setMonthlyGoal: (period: string, amount: number) => void;
  selectedPeriod: string;
  setSelectedPeriod: (period: string) => void;
  clients: Client[];
  billings: Billing[];
  projects: KanbanItem[];
  visits: KanbanItem[];
  syncQueue: OfflineSync[];
  isCircuitOpen: boolean;
  
  // Phase 5 Health & Admin
  systemLogs: SystemLog[];
  isAdmin: boolean;
  setIsAdmin: (val: boolean) => void;
  addLog: (type: string, message: string, severity: SystemLog['severity']) => void;

  addClient: (client: Omit<Client, 'id'>) => Promise<void>;
  updateClient: (id: string, client: Omit<Client, 'id'>) => Promise<void>;
  removeClient: (id: string) => Promise<void>;
  addBilling: (billing: Omit<Billing, 'id'>) => Promise<void>;
  updateBilling: (id: string, billing: Partial<Billing>) => Promise<void>;
  removeBilling: (id: string) => Promise<void>;
  updateKanbanStatus: (type: 'project' | 'visit', id: string, newStatus: string) => Promise<void>;
  addKanbanItem: (item: Omit<KanbanItem, 'id'>) => Promise<void>;
  syncToSalesforce: (data: any) => Promise<{ success: boolean; message: string; degraded?: boolean }>;
  totalFaturadoMes: number;
  totalPedidosCarteira: number;
  yearlyEvolutionData: any[];
  reloadData: () => Promise<void>;
  updateKanbanItem: (id: string, data: Partial<KanbanItem>) => Promise<void>;
  currentMeta: number;
  totalPeriodo: number;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [taxaFinanceiraPadrao, setTaxaFinanceiraPadrao] = useState(2.5);
  
  // Goals & Periods
  const [selectedPeriod, setSelectedPeriod] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const [monthlyGoals, setMonthlyGoals] = useState<Record<string, number>>({});

  const setMonthlyGoal = async (period: string, amount: number) => {
    try {
      await apiService.updateMonthlyGoal(period, amount);
      setMonthlyGoals((prev: Record<string, number>) => ({ ...prev, [period]: amount }));
    } catch (error) {
      console.error('Erro ao salvar meta mensal:', error);
      // Fallback local em caso de erro na API
      setMonthlyGoals((prev: Record<string, number>) => ({ ...prev, [period]: amount }));
    }
  };

  // Legacy fallback
  const metaMensal = monthlyGoals[selectedPeriod] || 0;
  const setMetaMensal = (val: number) => setMonthlyGoal(selectedPeriod, val);
  const [clients, setClients] = useState<Client[]>([]);
  const [billings, setBillings] = useState<Billing[]>([]);
  const [projects, setProjects] = useState<KanbanItem[]>([]);
  const [visits, setVisits] = useState<KanbanItem[]>([]);
  const [syncQueue, setSyncQueue] = useState<OfflineSync[]>([]);
  const [isCircuitOpen, setIsCircuitOpen] = useState(false);
  
  // Admin & Health
  const [systemLogs, setSystemLogs] = useState<SystemLog[]>([]);
  const [isAdmin, setIsAdmin] = useState(hasAppPin());

  const reloadData = useCallback(async () => {
    try {
      // Ensure tables exist before fetching
      await fetch('/api/init-db').catch(() => ({}));

      const [clientsData, billingsData, kanbanData, goalsData] = await Promise.all([
        apiService.getClients().catch(() => []),
        apiService.getBillings().catch(() => []),
        apiService.getKanbanItems().catch(() => []),
        apiService.getMonthlyGoals().catch(() => ({}))
      ]);

      // 1. Migration: Goals
      if (Object.keys(goalsData).length === 0) {
        const saved = localStorage.getItem('monthly_goals');
        if (saved) {
          const localGoals = JSON.parse(saved);
          console.log('Migrando metas...');
          for (const [period, amount] of Object.entries(localGoals)) {
            await apiService.updateMonthlyGoal(period, amount as number).catch(() => {});
          }
          setMonthlyGoals(localGoals);
          localStorage.removeItem('monthly_goals');
        } else {
          setMonthlyGoals(goalsData);
        }
      } else {
        setMonthlyGoals(goalsData);
      }

      // 2. Migration: Clients
      let finalClients = clientsData;
      if (clientsData.length === 0) {
        const saved = localStorage.getItem('clients');
        if (saved) {
          const localClients = JSON.parse(saved);
          console.log('Migrando clientes...');
          for (const client of localClients) {
            await apiService.addClient(client).catch(() => {});
          }
          finalClients = localClients;
          localStorage.removeItem('clients');
        }
      }

      // 3. Migration: Billings
      let finalBillings = billingsData;
      if (billingsData.length === 0) {
        const saved = localStorage.getItem('billings');
        if (saved) {
          const localBillings = JSON.parse(saved);
          console.log('Migrando faturamento...');
          for (const b of localBillings) {
            await apiService.addBilling(b).catch(() => {});
          }
          finalBillings = localBillings;
          localStorage.removeItem('billings');
        }
      }

      // 4. Migration: Kanban
      let finalKanban = kanbanData;
      if (kanbanData.length === 0) {
        const savedProjects = localStorage.getItem('projects');
        const savedVisits = localStorage.getItem('visits');
        if (savedProjects || savedVisits) {
          console.log('Migrando kanban...');
          const localProjects = savedProjects ? JSON.parse(savedProjects) : [];
          const localVisits = savedVisits ? JSON.parse(savedVisits) : [];
          const allItems = [
            ...localProjects.map((p: any) => ({ ...p, type: 'project' })),
            ...localVisits.map((v: any) => ({ ...v, type: 'visit' }))
          ];
          for (const item of allItems) {
            await apiService.addKanbanItem(item).catch(() => {});
          }
          finalKanban = allItems;
          localStorage.removeItem('projects');
          localStorage.removeItem('visits');
        }
      }

      // Map Clients (Snake case to Camel case)
      setClients(finalClients.map((c: any) => ({
        id: c.id?.toString() || Math.random().toString(),
        cnpj: c.cnpj ?? '',
        razaoSocial: c.razao_social || c.razaoSocial || '',
        nomeFantasia: c.nome_fantasia || c.nomeFantasia || '',
        porte: c.porte ?? '',
        dataAbertura: c.data_abertura || c.dataAbertura || '',
        cnaePrincipal: c.cnae_principal || c.cnaePrincipal || '',
        cnaeSecundario: c.cnae_secundario || c.cnaeSecundario || '',
        naturezaJuridica: c.natureza_juridica || c.naturezaJuridica || '',
        logradouro: c.logradouro || c.logradouro || '',
        numero: c.numero || c.numero || '',
        complemento: c.complemento || c.complemento || '',
        cep: c.cep || c.cep || '',
        bairro: c.bairro || c.bairro || '',
        municipio: c.municipio || c.municipio || '',
        uf: c.uf || c.uf || '',
        email: c.email || c.email || '',
        telefone: c.telefone || c.telefone || '',
        situacaoCadastral: c.situacao_cadastral || c.situacaoCadastral || 'ATIVA',
        dataSituacaoCadastral: c.data_situacao_cadastral || c.dataSituacaoCadastral || '',
        motivoSituacao: c.motivo_situacao || c.motivoSituacao || '',
        codigoErp: c.codigo_erp || c.codigoErp || '',
        historico: c.historico || c.historico || '',
        frequenciaCompra: c.frequencia_compra || c.frequenciaCompra || 'Mensal',
      })));

      setBillings(finalBillings.map((b: any) => ({ 
        ...b, 
        id: b.id?.toString() || Math.random().toString(), 
        valor: Number(b.valor),
        status: b.status || 'FATURADO'
      })));
      
      const kItems = finalKanban.map((k: any) => ({ 
        ...k, 
        id: k.id?.toString() || Math.random().toString(),
        dateTime: k.date_time || k.dateTime,
        visitFormat: k.visit_format || k.visitFormat,
        description: k.description
      }));
      setProjects(kItems.filter((i: any) => (i.type || i.type_kanban) === 'project'));
      setVisits(kItems.filter((i: any) => (i.type || i.type_kanban) === 'visit'));

      if (isAdmin) {
        const logs = await apiService.getLogs();
        setSystemLogs(logs.map((l: any) => ({
          ...l,
          id: l.id.toString(),
          timestamp: new Date(l.timestamp).toLocaleTimeString()
        })));
      }
    } catch (error) {
      console.error('Falha ao carregar dados do CRM:', error);
    }
  }, [isAdmin]);

  useEffect(() => {
    reloadData();
  }, [reloadData]);

  const addLog = async (type: string, message: string, severity: SystemLog['severity']) => {
    try {
      const newLog = await apiService.addLog(type, severity, message);
      setSystemLogs(prev => [{
        ...newLog,
        id: newLog.id.toString(),
        timestamp: new Date(newLog.timestamp).toLocaleTimeString()
      }, ...prev].slice(0, 50));
    } catch (e: any) {
      // Local fallback if API fails
      setSystemLogs((prev: SystemLog[]) => [{
        id: 'error-' + Date.now(),
        type, message, severity,
        timestamp: new Date().toLocaleTimeString()
      }, ...prev].slice(0, 50));
    }
  };

  const syncToSalesforce = async (data: any) => {
    try {
      const result = await salesforceService.openCase(data);
      const status = salesforceService.getCircuitStatus();
      setIsCircuitOpen(status.state === 'OPEN');

      if (!result.success && result.queued) {
        addLog(status.state === 'OPEN' ? 'API_FAIL' : 'API_RETRY', result.message, 'WARNING');
        setSyncQueue((prev: OfflineSync[]) => [{ id: Math.random().toString(36).substr(2, 9), data, timestamp: new Date().toISOString(), status: 'PENDING' }, ...prev]);
        return { ...result, degraded: true };
      }
      
      if (result.success) addLog('SYSTEM_INFO', 'Sincronização realizada com Salesforce.', 'INFO');
      return result;
    } catch (error: any) {
      addLog('API_FAIL', error.message, 'CRITICAL');
      return { success: false, message: error.message };
    }
  };

  const currentMeta = useMemo(() => {
    if (selectedPeriod === 'Annual') {
      return Object.values(monthlyGoals).reduce((acc: number, curr: number) => acc + curr, 0);
    }
    return monthlyGoals[selectedPeriod] || 0;
  }, [selectedPeriod, monthlyGoals]);

  const totalPeriodo = useMemo(() => {
    const fatured = billings.filter((b: Billing) => b.status === 'FATURADO');
    if (selectedPeriod === 'Annual') {
      const currentYear = new Date().getFullYear().toString();
      return fatured
        .filter((b: Billing) => b.data.startsWith(currentYear))
        .reduce((acc: number, curr: Billing) => acc + curr.valor, 0);
    }
    return fatured
      .filter((b: Billing) => b.data.startsWith(selectedPeriod))
      .reduce((acc: number, curr: Billing) => acc + curr.valor, 0);
  }, [billings, selectedPeriod]);

  const totalFaturadoMes = totalPeriodo; // Alias for backward compatibility

  const totalPedidosCarteira = useMemo(() => {
    // Determine the range for projection based on selectedPeriod
    const isAnnual = selectedPeriod === 'Annual';
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1; // 1-12

    let targetMonths: number[] = [];
    if (isAnnual) {
      // For Annual, project for all months from currentMonth + 1 (future) to 12
      for (let m = currentMonth + 1; m <= 12; m++) targetMonths.push(m);
    } else {
      // For a specific month (e.g., "2026-04")
      const [year, month] = selectedPeriod.split('-').map(Number);
      // Only project if the selected month is in the future
      if (year === currentYear && month > currentMonth) {
        targetMonths = [month];
      }
    }

    // 1. Current Pending Billings for the TARGET PERIOD
    const existingPendente = billings
      .filter((b: Billing) => {
        if (b.status !== 'PENDENTE') return false;
        if (isAnnual) return b.data.startsWith(String(currentYear));
        return b.data.startsWith(selectedPeriod);
      })
      .reduce((acc: number, curr: Billing) => acc + curr.valor, 0);

    // 2. Future Recurrence Projection
    let projection = 0;

    clients.forEach(client => {
      const frequency = client.frequenciaCompra || 'Mensal';
      const clientBillings = billings.filter(b => b.cliente === client.razaoSocial);
      
      const lastBilling = [...clientBillings].sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())[0];
      const baseValue = lastBilling?.valor || 0;

      if (baseValue <= 0) return;

      const interval = {
        'Mensal': 1, 'Bimestral': 2, 'Trimestral': 3, 'Semestral': 6, 'Anual': 12
      }[frequency] || 1;

      targetMonths.forEach(m => {
        // Simple heuristic: if month fits the recurring pattern
        const isPurchaseMonth = (m - 1) % interval === 0;

        if (isPurchaseMonth) {
          const monthKey = `${currentYear}-${String(m).padStart(2, '0')}`;
          const alreadyPlanned = clientBillings.some(b => b.data.startsWith(monthKey));

          if (!alreadyPlanned) {
            projection += baseValue;
          }
        }
      });
    });

    return existingPendente + projection;
  }, [billings, clients, selectedPeriod]);

  const yearlyEvolutionData = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

    return months.map((name, i) => {
      const m = i + 1;
      const monthKey = `${currentYear}-${String(m).padStart(2, '0')}`;
      
      const meta = monthlyGoals[monthKey] || 0;
      const faturado = billings
        .filter((b: Billing) => b.status === 'FATURADO' && b.data.startsWith(monthKey))
        .reduce((acc: number, curr: Billing) => acc + curr.valor, 0);
      
      const pendenteDirect = billings
        .filter((b: Billing) => b.status === 'PENDENTE' && b.data.startsWith(monthKey))
        .reduce((acc: number, curr: Billing) => acc + curr.valor, 0);
      
      let projected = 0;
      if (m > currentMonth) {
        clients.forEach(client => {
          const frequency = client.frequenciaCompra || 'Mensal';
          const clientBillings = billings.filter(b => b.cliente === client.razaoSocial);
          const lastBilling = [...clientBillings].sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())[0];
          const baseValue = lastBilling?.valor || 0;
          if (baseValue <= 0) return;

          const interval = { 'Mensal': 1, 'Bimestral': 2, 'Trimestral': 3, 'Semestral': 6, 'Anual': 12 }[frequency] || 1;
          const isPurchaseMonth = (m - 1) % interval === 0;
          if (isPurchaseMonth && !clientBillings.some(b => b.data.startsWith(monthKey))) {
            projected += baseValue;
          }
        });
      }

      return {
        month: name,
        meta,
        faturado,
        carteira: pendenteDirect + projected
      };
    });
  }, [billings, clients, monthlyGoals]);

  const addClient = async (data: any) => {
    const saved = await apiService.addClient(data);
    setClients((prev: Client[]) => [...prev, {
      id: saved.id.toString(),
      cnpj: saved.cnpj ?? '',
      razaoSocial: saved.razao_social ?? '',
      nomeFantasia: saved.nome_fantasia ?? '',
      porte: saved.porte ?? '',
      dataAbertura: saved.data_abertura ?? '',
      cnaePrincipal: saved.cnae_principal ?? '',
      cnaeSecundario: saved.cnae_secundario ?? '',
      naturezaJuridica: saved.natureza_juridica ?? '',
      logradouro: saved.logradouro ?? '',
      numero: saved.numero ?? '',
      complemento: saved.complemento ?? '',
      cep: saved.cep ?? '',
      bairro: saved.bairro ?? '',
      municipio: saved.municipio ?? '',
      uf: saved.uf ?? '',
      email: saved.email ?? '',
      telefone: saved.telefone ?? '',
      situacaoCadastral: saved.situacao_cadastral ?? '',
      dataSituacaoCadastral: saved.data_situacao_cadastral ?? '',
      motivoSituacao: saved.motivo_situacao ?? '',
      codigoErp: saved.codigo_erp ?? '',
      historico: saved.historico ?? '',
      frequenciaCompra: saved.frequencia_compra ?? 'Mensal',
    }]);
    addLog('SYSTEM_INFO', `Novo cliente cadastrado: ${data.razaoSocial}`, 'INFO');
  };
 
  const updateClient = async (id: string, data: any) => {
    const saved = await apiService.updateClient(id, data);
    setClients((prev: Client[]) => prev.map((c: Client) => c.id === id ? {
      id: saved.id.toString(),
      cnpj: saved.cnpj ?? '',
      razaoSocial: saved.razao_social ?? '',
      nomeFantasia: saved.nome_fantasia ?? '',
      porte: saved.porte ?? '',
      dataAbertura: saved.data_abertura ?? '',
      cnaePrincipal: saved.cnae_principal ?? '',
      cnaeSecundario: saved.cnae_secundario ?? '',
      naturezaJuridica: saved.natureza_juridica ?? '',
      logradouro: saved.logradouro ?? '',
      numero: saved.numero ?? '',
      complemento: saved.complemento ?? '',
      cep: saved.cep ?? '',
      bairro: saved.bairro ?? '',
      municipio: saved.municipio ?? '',
      uf: saved.uf ?? '',
      email: saved.email ?? '',
      telefone: saved.telefone ?? '',
      situacaoCadastral: saved.situacao_cadastral ?? '',
      dataSituacaoCadastral: saved.data_situacao_cadastral ?? '',
      motivoSituacao: saved.motivo_situacao ?? '',
      codigoErp: saved.codigo_erp ?? '',
      historico: saved.historico ?? '',
      frequenciaCompra: saved.frequencia_compra ?? 'Mensal',
    } : c));
    addLog('SYSTEM_INFO', `Cliente atualizado: ${data.razaoSocial}`, 'INFO');
  };

  const removeClient = async (id: string) => {
    await apiService.removeClient(id);
    setClients((prev: Client[]) => prev.filter((c: Client) => c.id !== id));
    addLog('SYSTEM_INFO', `Cliente removido ID: ${id}`, 'WARNING');
  };

  const addBilling = async (data: any) => {
    const saved = await apiService.addBilling(data);
    setBillings((prev: Billing[]) => [{ ...saved, id: saved.id.toString(), valor: Number(saved.valor), status: saved.status || 'FATURADO' }, ...prev]);
    addLog('SYSTEM_INFO', `Faturamento registrado: ${data.nf}`, 'INFO');
  };

  const updateBilling = async (id: string, data: any) => {
    const saved = await apiService.updateBilling(id, data);
    setBillings((prev: Billing[]) => prev.map((b: Billing) => b.id === id ? { ...saved, id: saved.id.toString(), valor: Number(saved.valor), status: saved.status || 'FATURADO' } : b));
    addLog('SYSTEM_INFO', `Faturamento atualizado: ${saved.nf}`, 'INFO');
  };

  const removeBilling = async (id: string) => {
    await apiService.removeBilling(id);
    setBillings((prev: Billing[]) => prev.filter((b: Billing) => b.id !== id));
    addLog('SYSTEM_INFO', `Faturamento removido ID: ${id}`, 'WARNING');
  };

  const updateKanbanStatus = async (type: any, id: string, newStatus: string) => {
    await apiService.updateKanbanStatus(id, newStatus);
    const setter = type === 'project' ? setProjects : setVisits;
    setter((prev: KanbanItem[]) => prev.map((i: KanbanItem) => i.id === id ? { ...i, status: newStatus } : i));
  };

  const addKanbanItem = async (data: any) => {
    const saved = await apiService.addKanbanItem(data);
    const setter = data.type === 'project' ? setProjects : setVisits;
    setter((prev: KanbanItem[]) => [...prev, { 
      ...saved, 
      id: saved.id.toString(),
      dateTime: saved.date_time || saved.dateTime,
      visitFormat: saved.visit_format || saved.visitFormat
    }]);
  };

  const updateKanbanItem = async (id: string, data: Partial<KanbanItem>) => {
    const saved = await apiService.updateKanbanStatus(id, data.status!, {
      title: data.title,
      subtitle: data.subtitle,
      label: data.label,
      date_time: data.dateTime,
      visit_format: data.visitFormat,
      description: data.description
    });
    setProjects((prev: KanbanItem[]) => prev.map((i: KanbanItem) => i.id === id ? { ...i, ...data } : i));
    setVisits((prev: KanbanItem[]) => prev.map((i: KanbanItem) => i.id === id ? { ...i, ...data } : i));
  };

  return (
    <AppContext.Provider value={{ 
      taxaFinanceiraPadrao, setTaxaFinanceiraPadrao, 
      metaMensal, setMetaMensal, monthlyGoals, setMonthlyGoal, selectedPeriod, setSelectedPeriod,
      clients, billings, projects, visits, syncQueue, isCircuitOpen,
      systemLogs, isAdmin, setIsAdmin, addLog,
      addClient, updateClient, removeClient, addBilling, updateBilling, removeBilling, updateKanbanStatus, addKanbanItem, updateKanbanItem, syncToSalesforce,
      totalFaturadoMes, totalPedidosCarteira, yearlyEvolutionData, currentMeta, totalPeriodo, reloadData
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used within AppProvider');
  return context;
};
