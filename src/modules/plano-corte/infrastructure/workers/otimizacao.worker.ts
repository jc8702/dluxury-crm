import { HybridOptimizer } from '../../domain/services/HybridOptimizer';
import type { Peca, ResultadoOtimizacao } from '../../domain/services/MaxRectsOptimizer';

/**
 * INTERFACE: Mensagem do worker (entrada)
 */
interface MensagemEntrada {
  tipo: 'otimizar' | 'cancelar';
  payload?: {
    materiais: Array<{
      sku: string;
      largura_mm: number;
      altura_mm: number;
      pecas: Peca[];
    }>;
    kerf_mm?: number;
    iteracoes?: number;
  };
}

/**
 * INTERFACE: Mensagem do worker (saída)
 */
interface MensagemSaida {
  tipo: 'progresso' | 'resultado' | 'erro' | 'concluido';
  material_sku?: string;
  progresso?: number; // 0-100
  resultado?: ResultadoOtimizacao;
  erro?: string;
  totalMateriais?: number;
  materialAtual?: number;
}

/**
 * ESTADO DO WORKER
 */
let cancelarOperacao = false;

/**
 * EVENT LISTENER: Receber mensagens do thread principal
 */
self.onmessage = async (event: MessageEvent<MensagemEntrada>) => {
  const { tipo, payload } = event.data;

  if (tipo === 'cancelar') {
    cancelarOperacao = true;
    self.postMessage({
      tipo: 'concluido',
      erro: 'Operação cancelada pelo usuário'
    } as MensagemSaida);
    return;
  }

  if (tipo === 'otimizar' && payload) {
    try {
      await processarOtimizacao(payload);
    } catch (erro) {
      self.postMessage({
        tipo: 'erro',
        erro: erro instanceof Error ? erro.message : 'Erro desconhecido'
      } as MensagemSaida);
    }
  }
};

/**
 * PROCESSAR OTIMIZAÇÃO
 * Pode ter múltiplos materiais (chapas) para otimizar
 */
async function processarOtimizacao(payload: {
  materiais: Array<{
    sku: string;
    largura_mm: number;
    altura_mm: number;
    pecas: Peca[];
  }>;
  kerf_mm?: number;
  iteracoes?: number;
}): Promise<void> {
  const {
    materiais,
    kerf_mm = 3,
    iteracoes = 20
  } = payload;

  const totalMateriais = materiais.length;
  cancelarOperacao = false;

  for (let i = 0; i < materiais.length; i++) {
    if (cancelarOperacao) {
      break;
    }

    const material = materiais[i];

    // Enviar: começando processamento deste material
    self.postMessage({
      tipo: 'progresso',
      material_sku: material.sku,
      progresso: Math.round((i / totalMateriais) * 100),
      totalMateriais,
      materialAtual: i + 1
    } as MensagemSaida);

    // Executar otimização
    const optimizer = new HybridOptimizer(
      material.largura_mm,
      material.altura_mm,
      kerf_mm
    );

    const resultado = optimizer.otimizar(material.pecas, iteracoes);

    // Enviar: resultado para este material
    self.postMessage({
      tipo: 'resultado',
      material_sku: material.sku,
      resultado,
      progresso: Math.round(((i + 1) / totalMateriais) * 100),
      totalMateriais,
      materialAtual: i + 1
    } as MensagemSaida);

    // Pequena pausa para não bloquear completamente a thread principal
    // (permite que o navegador processe outras coisas)
    await new Promise(resolve => setTimeout(resolve, 1));
  }

  // Enviar: operação concluída
  self.postMessage({
    tipo: 'concluido',
    progresso: 100,
    totalMateriais,
    materialAtual: totalMateriais
  } as MensagemSaida);
}

/**
 * EXPORTER: Para uso em testes ou Node.js
 */
export {};
