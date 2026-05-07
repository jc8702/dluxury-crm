import { PDFParser } from '../../infrastructure/parsers/PDFParser';
import { ChapaRepository } from '../../infrastructure/repositories/ChapaRepository';
import { ProjetoCorte, ChapaSelecionada } from '../../domain/types';

export class ProcessarPDF {
  constructor(
    private parser: PDFParser = new PDFParser(),
    private chapaRepo: ChapaRepository = new ChapaRepository()
  ) {}

  async executar(file: File): Promise<ProjetoCorte> {
    try {
      // MOCK para o Demo PDF
      if (file.name === 'PROJETO_DEMO_DLUXURY.pdf') {
        return this.gerarProjetoDemo();
      }

      // 1. Converter arquivo para Base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]); // Remove o prefixo data:application/pdf;base64,
        };
        reader.onerror = (err) => {
          console.error('[IMPORT ERROR] Falha na leitura do arquivo:', err);
          reject(new Error('Erro ao ler o arquivo selecionado.'));
        };
        reader.readAsDataURL(file);
      });

      // 2. Chamar API de Importação (Fase 1-5)
      const { api } = await import('../../../../lib/api');
      let pecasExtraidas;
      try {
        pecasExtraidas = await api.planoCorte.importarDesenho(base64, file.name);
      } catch (apiErr: any) {
        console.error('[IMPORT ERROR] Falha na API de importação:', apiErr);
        throw new Error(`Serviço de extração indisponível: ${apiErr.message}`);
      }

      if (!pecasExtraidas || pecasExtraidas.length === 0) {
        throw new Error('Nenhuma peça identificada no arquivo. Verifique se o PDF contém texto legível.');
      }

      // 3. Estruturar o projeto
      const projeto: ProjetoCorte = {
        id: `proj_${Date.now()}`,
        nome: file.name.replace('.pdf', '').toUpperCase(),
        chapas: [],
        criado_em: new Date(),
        status: 'rascunho'
      };

      // Agrupar peças por espessura (já que não temos material na Fase 1)
      const porEspessura: Record<number, any[]> = {};
      pecasExtraidas.forEach((p: any) => {
        if (!porEspessura[p.espessura]) porEspessura[p.espessura] = [];
        porEspessura[p.espessura].push(p);
      });

      // Criar uma "chapa" para cada espessura encontrada
      for (const [esp, pecas] of Object.entries(porEspessura)) {
        const espessuraNum = parseFloat(esp);
        const materialSugerido = pecas[0]?.material || '';
        
        // Tentar buscar uma chapa real no estoque (Busca inteligente: Material + Espessura)
        const queryBusca = materialSugerido 
          ? `${materialSugerido} ${espessuraNum}MM`
          : `MDF ${espessuraNum}MM`;
          
        const resultadosBusca = await this.chapaRepo.buscarPorSKU(queryBusca);
        let chapaEstoque = resultadosBusca.find(c => c.espessura === espessuraNum);
        
        // Fallback: busca apenas pela espessura se a busca específica falhar
        if (!chapaEstoque) {
          const fallbackBusca = await this.chapaRepo.buscarPorSKU(`${espessuraNum}MM`);
          chapaEstoque = fallbackBusca.find(c => c.espessura === espessuraNum);
        }

        const novaChapa: ChapaSelecionada = {
          id: `ch_imp_${Math.random().toString(36).substr(2, 9)}`,
          sku_chapa: chapaEstoque?.sku || `MDF-GEN-${espessuraNum}`,
          nome_exibicao: `MDF ${espessuraNum}MM (IMPORTADO)`,
          largura_mm: chapaEstoque?.largura || 2750,
          altura_mm: chapaEstoque?.altura || 1840,
          espessura_mm: espessuraNum,
          preco_unitario: chapaEstoque?.preco || 0,
          criada_em: new Date(),
          pecas: pecas.map((p: any) => ({
            id: p.id,
            nome: p.nome,
            largura: p.largura,
            altura: p.comprimento,
            quantidade: p.quantidade,
            rotacionavel: true
          }))
        };
        projeto.chapas.push(novaChapa);
      }

      return projeto;
    } catch (error: any) {
      console.error('Erro ao processar desenho:', error);
      throw new Error(error.message || 'Falha ao processar arquivo. Verifique o formato.');
    }
  }

  private gerarProjetoDemo(): ProjetoCorte {
    return {
      id: `demo_${Date.now()}`,
      nome: 'PROJETO DEMO DLUXURY',
      status: 'rascunho',
      criado_em: new Date(),
      chapas: [
        {
          id: 'demo_ch_1',
          sku_chapa: 'MDF-BRA-18',
          nome_exibicao: 'MDF BRANCO 18MM',
          largura_mm: 2750,
          altura_mm: 1840,
          espessura_mm: 18,
          preco_unitario: 320,
          criada_em: new Date(),
          pecas: [
            { id: 'dp1', nome: 'LATERAL GABINETE', largura: 720, altura: 550, quantidade: 4, rotacionavel: true },
            { id: 'dp2', nome: 'BASE GABINETE', largura: 600, altura: 550, quantidade: 2, rotacionavel: true }
          ]
        },
        {
          id: 'demo_ch_2',
          sku_chapa: 'CHP-CAR-15',
          nome_exibicao: 'CHAPA CARVALHO 15MM',
          largura_mm: 2750,
          altura_mm: 1840,
          espessura_mm: 15,
          preco_unitario: 285,
          criada_em: new Date(),
          pecas: [
            { id: 'dp3', nome: 'PRATELEIRA', largura: 567, altura: 530, quantidade: 6, rotacionavel: true },
            { id: 'dp4', nome: 'TAMPO', largura: 1200, altura: 600, quantidade: 1, rotacionavel: true }
          ]
        }
      ]
    };
  }
}
