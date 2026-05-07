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
      // MOCK para o Demo PDF (evita erro de arrayBuffer em objeto falso)
      if (file.name === 'PROJETO_DEMO_DLUXURY.pdf') {
        return this.gerarProjetoDemo();
      }

      const dados = await this.parser.parsearArquivo(file);
      
      const projeto: ProjetoCorte = {
        id: `proj_${Date.now()}`,
        nome: file.name.replace('.pdf', '').toUpperCase(),
        chapas: [],
        criado_em: new Date(),
        status: 'rascunho'
      };

      if (dados.length === 0) {
        throw new Error('Nenhum dado estruturado encontrado no PDF. O formato pode não ser compatível.');
      }

      for (const d of dados) {
        const resultadosBusca = await this.chapaRepo.buscarPorSKU(d.material);
        const chapaEstoque = resultadosBusca.find(c => 
          c.espessura === d.espessura && 
          (Math.abs(c.largura - d.largura) < 100 || Math.abs(c.altura - d.altura) < 100)
        ) || resultadosBusca[0];

        const novaChapa: ChapaSelecionada = {
          id: `ch_pdf_${Math.random().toString(36).substr(2, 9)}`,
          sku_chapa: chapaEstoque?.sku || 'SKU-GENERICO',
          nome_exibicao: d.material.toUpperCase(),
          largura_mm: d.largura || chapaEstoque?.largura || 2750,
          altura_mm: d.altura || chapaEstoque?.altura || 1840,
          espessura_mm: d.espessura,
          preco_unitario: chapaEstoque?.preco || 0,
          criada_em: new Date(),
          pecas: d.pecas.map(p => ({
            id: `pc_pdf_${Math.random().toString(36).substr(2, 9)}`,
            nome: p.nome,
            largura: p.largura,
            altura: p.altura,
            quantidade: p.quantidade,
            rotacionavel: true,
            sku_chapa: chapaEstoque?.sku || 'SKU-GENERICO'
          }))
        };
        projeto.chapas.push(novaChapa);
      }
      return projeto;
    } catch (error: any) {
      console.error('Erro ao processar PDF:', error);
      throw new Error(error.message || 'Falha ao processar arquivo PDF. Verifique se o formato é compatível.');
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
