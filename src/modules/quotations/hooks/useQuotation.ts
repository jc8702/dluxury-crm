// src/modules/quotations/hooks/useQuotation.ts
import { useState, useCallback, useEffect } from 'react';
import { useToast } from '@/context/ToastContext';
import { z } from 'zod';
import { createQuotationSchema } from '@/schemas/quotation.schema';

export function useQuotation(orcamentoId?: string) {
  const { error: toastError } = useToast();
  const [quotation, setOrcamento] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ✅ HELPER PARA HEADERS
  const getHeaders = () => {
    const token = localStorage.getItem('dluxury_token') || '';
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  // ✅ FUNÇÃO DE CARREGAMENTO CENTRALIZADA (API PRO)
  const carregar = useCallback(async (id: string) => {
    /* console.log(`🔄 [useQuotation] Carregando orçamento PRO ${id}...`) */ setLoading(true);
    try {
      const response = await fetch(`/api/quotations?id=${id}`, {
        headers: getHeaders(),
      });

      if (response.status === 404) {
        throw new Error('Orçamento não encontrado neste módulo (Industrial/PRO).');
      }

      const result = await response.json();

      if (result.success) {
        setOrcamento(result.data);
        /* console.log("✅ [useQuotation] Dados carregados:", result.data) */ return result.data;
      } else {
        throw new Error(result.error || 'Erro ao carregar dados');
      }
    } catch (err: any) {
      console.error('❌ [useQuotation] Erro no fetch:', err);
      setError(err.message);
      setOrcamento(null); // Limpa para evitar UI inconsistente
    } finally {
      setLoading(false);
    }
  }, []);

  // ✅ IMPORTAÇÃO DE ITENS (CSV/PDF)
  const importItems = useCallback(
    async (itens: any[]) => {
      if (!orcamentoId) return false;

      // Normaliza os itens para garantir que o backend receba o que espera (sku_id)
      const normalizedItems = itens.map((item) => ({
        ...item,
        sku_id: item.sku_id || item.produto_id || item.match_sugerido?.sku_componente_id || null,
        // Fallback para campos numéricos
        quantidade: parseFloat(item.quantidade) || 1,
        largura: item.largura?.toString() || '',
        altura: item.altura?.toString() || '',
        espessura: item.espessura?.toString() || '',
      }));

      /* console.log(`📤 [useQuotation] Enviando request de importação (${normalizedItems.length} itens)...`) */ try {
        const response = await fetch(`/api/quotations?id=${orcamentoId}&action=import-items`, {
          method: 'PUT',
          headers: getHeaders(),
          body: JSON.stringify({ items: normalizedItems }),
        });

        const result = await response.json();

        if (result.success) {
          /* console.log("✅ [useQuotation] Importação concluída com sucesso!") */ await carregar(
            orcamentoId,
          );
          return true;
        } else {
          console.error('❌ [useQuotation] Erro retornado pela API:', result.error);
          toastError(`Erro na importação`, result.error || 'Erro desconhecido no servidor');
          return false;
        }
      } catch (err: any) {
        console.error('❌ [useQuotation] Falha na comunicação com a API:', err);
        toastError('Erro de rede ou conexão', err.message);
        return false;
      }
    },
    [orcamentoId, carregar],
  );

  // ✅ INICIALIZAR NOVO RASCUNHO (corrigido: permite criar sem cliente/número)
  const inicializar = useCallback(
    async (dados: any) => {
      setLoading(true);
      try {
        // Validação leniente - rascunho pode ser criado sem cliente
        let validatedData: any = {};
        try {
          validatedData = createQuotationSchema.parse({
            clienteId: dados.clienteId ?? null,
            clientId: dados.clienteId ? Number(dados.clienteId) || null : null,
            number: dados.numero,
            numero: dados.numero,
            description: dados.descricao,
            descricao: dados.descricao,
            marginPercentage: dados.margemLucroPercentual,
            margemLucroPercentual: dados.margemLucroPercentual,
            validadeDias: dados.validadeDias,
            taxaFinanceiraPercentual: dados.taxaFinanceiraPercentual,
            descontoPercentual: dados.descontoPercentual,
          });
        } catch (e) {
          // Se validação falhar, usa dados crus - backend fará validação própria
          validatedData = {};
        }

        const headerPayload: any = {
          clienteId: dados.clienteId || null,
          projetoId: dados.projetoId || null,
          validadeDias: dados.validadeDias ?? 15,
          margemLucroPercentual: dados.margemLucroPercentual ?? 30,
          taxaFinanceiraPercentual: dados.taxaFinanceiraPercentual ?? 0,
          descontoPercentual: dados.descontoPercentual ?? 0,
        };
        // Normalizar clienteId vazio
        if (headerPayload.clienteId === '' || headerPayload.clienteId === 0)
          headerPayload.clienteId = null;

        const response = await fetch('/api/quotations', {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({ header: headerPayload, itens: dados.itens || [] }),
        });
        const result = await response.json();
        if (result.success) return result.data;
        // Propagar mensagem de erro do backend
        const msg = result.error || `Erro HTTP ${response.status}`;
        toastError(msg);
        throw new Error(msg);
      } catch (err: any) {
        if (err instanceof z.ZodError) {
          console.error('❌ [useQuotation] Erro de validação:', err.errors);
          toastError('Dados inválidos', err.errors.map((e: any) => e.message).join(', '));
          throw err;
        }
        console.error('❌ [useQuotation] Erro ao inicializar:', err);
        // Não fazer double toast se já foi exibido
        if (!err.message?.includes('Erro HTTP') && !err.message?.includes('Erro ao criar')) {
          // mensagem já tratada acima; apenas relança
        }
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [toastError],
  );

  // ✅ ATUALIZAR CABEÇALHO (Header)
  const setHeader = useCallback(
    async (updates: any) => {
      if (!orcamentoId) return;
      try {
        const response = await fetch(`/api/quotations?id=${orcamentoId}`, {
          method: 'PUT',
          headers: getHeaders(),
          body: JSON.stringify(updates),
        });
        const result = await response.json();
        if (result.success) {
          await carregar(orcamentoId);
        }
      } catch (err) {
        console.error('❌ [useQuotation] Erro ao atualizar cabeçalho:', err);
      }
    },
    [orcamentoId, carregar],
  );

  // ✅ ADICIONAR ITEM MANUAL (SKU)
  const addItem = useCallback(
    async (skuId: string, quantidade: number) => {
      if (!orcamentoId) return;
      try {
        const response = await fetch(`/api/quotations?id=${orcamentoId}&action=add-item`, {
          method: 'PUT',
          headers: getHeaders(),
          body: JSON.stringify({ skuId, quantidade }),
        });
        const result = await response.json();
        if (result.success) {
          await carregar(orcamentoId);
        }
      } catch (err) {
        console.error('❌ [useQuotation] Erro ao adicionar item:', err);
      }
    },
    [orcamentoId, carregar],
  );

  // ✅ ATUALIZAR ITEM
  const updateItem = useCallback(
    async (itemId: string, updates: any) => {
      if (!orcamentoId) return;
      try {
        const response = await fetch(`/api/quotations?id=${orcamentoId}&action=update-item`, {
          method: 'PUT',
          headers: getHeaders(),
          body: JSON.stringify({ itemId, ...updates }),
        });
        const result = await response.json();
        if (result.success) {
          await carregar(orcamentoId);
        }
      } catch (err) {
        console.error('❌ [useQuotation] Erro ao atualizar item:', err);
      }
    },
    [orcamentoId, carregar],
  );

  // ✅ REMOVER ITEM
  const removerItem = useCallback(
    async (itemId: string) => {
      if (!orcamentoId) return;
      try {
        const response = await fetch(`/api/quotations?id=${orcamentoId}&action=delete-item`, {
          method: 'PUT',
          headers: getHeaders(),
          body: JSON.stringify({ itemId }),
        });
        const result = await response.json();
        if (result.success) {
          await carregar(orcamentoId);
        }
      } catch (err) {
        console.error('❌ [useQuotation] Erro ao remover item:', err);
      }
    },
    [orcamentoId, carregar],
  );

  // ✅ ATUALIZAR EXPLOSÃO (BOM)
  const updateItemExplosion = useCallback(
    async (bomId: string, quantidadeAjustada: number) => {
      if (!orcamentoId) return;
      try {
        const response = await fetch(`/api/quotations?id=${orcamentoId}&action=update-bom`, {
          method: 'PUT',
          headers: getHeaders(),
          body: JSON.stringify({ bomId, quantidadeAjustada }),
        });
        const result = await response.json();
        if (result.success) {
          await carregar(orcamentoId);
        }
      } catch (err) {
        console.error('❌ [useQuotation] Erro ao atualizar BOM:', err);
      }
    },
    [orcamentoId, carregar],
  );

  // ✅ ATUALIZAR SKU
  const updateItemSku = useCallback(
    async (itemId: string, skuId: string) => {
      if (!orcamentoId) return;
      try {
        const response = await fetch(`/api/quotations?id=${orcamentoId}&action=update-sku`, {
          method: 'PUT',
          headers: getHeaders(),
          body: JSON.stringify({ itemId, skuId }),
        });
        const result = await response.json();
        if (result.success) {
          await carregar(orcamentoId);
        }
      } catch (err) {
        console.error('❌ [useQuotation] Erro ao atualizar SKU:', err);
      }
    },
    [orcamentoId, carregar],
  );

  // ✅ ATUALIZAÇÃO EM MASSA (Bulk Update)
  const bulkUpdateItems = useCallback(
    async (itemIds: string[], updates: any) => {
      if (!orcamentoId || itemIds.length === 0) return;
      setLoading(true);
      try {
        const response = await fetch(`/api/quotations?id=${orcamentoId}&action=bulk-update-items`, {
          method: 'PUT',
          headers: getHeaders(),
          body: JSON.stringify({ itemIds, updates }),
        });
        const result = await response.json();
        if (result.success) {
          await carregar(orcamentoId);
          return true;
        }
        return false;
      } catch (err) {
        console.error('❌ [useQuotation] Erro em bulk update:', err);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [orcamentoId, carregar],
  );

  // ✅ RESETAR PARA MARGEM GLOBAL (Itens Selecionados)
  const resetToGlobalMargin = useCallback(
    async (itemIds: string[]) => {
      return bulkUpdateItems(itemIds, { possuiOverride: false });
    },
    [bulkUpdateItems],
  );

  // ✅ APLICAR MARGEM GLOBAL (Cabeçalho + Itens)
  const applyGlobalMargin = useCallback(
    async (margem: number) => {
      if (!orcamentoId) return;
      setLoading(true);
      try {
        const response = await fetch(
          `/api/quotations?id=${orcamentoId}&action=apply-global-margin`,
          {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify({ margem }),
          },
        );
        const result = await response.json();
        if (result.success) {
          await carregar(orcamentoId);
          return result;
        }
        throw new Error(result.error);
      } catch (err: any) {
        console.error('❌ [useQuotation] Erro ao aplicar margem global:', err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [orcamentoId, carregar],
  );

  // ✅ DELETAR ORÇAMENTO COMPLETO
  const deletarOrcamento = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/quotations?id=${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      const result = await response.json();
      if (result.success) return true;
      throw new Error(result.error);
    } catch (err: any) {
      console.error('❌ [useQuotation] Erro ao deletar orçamento:', err);
      throw err;
    }
  }, []);

  // Efeito de carregamento inicial
  useEffect(() => {
    if (orcamentoId) {
      carregar(orcamentoId);
    }
  }, [orcamentoId, carregar]);

  return {
    quotation,
    loading,
    error,
    inicializar,
    setHeader,
    addItem,
    importItems,
    updateItem,
    removerItem,
    updateItemExplosion,
    updateItemSku,
    bulkUpdateItems,
    resetToGlobalMargin,
    applyGlobalMargin,
    deletarOrcamento,
    carregar: () => (orcamentoId ? carregar(orcamentoId) : null),
  };
}
