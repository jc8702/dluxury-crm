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
      const dados = await this.parser.parsearArquivo(file);
      
      const projeto: ProjetoCorte = {
        id: `proj_${Date.now()}`,
        nome: file.name.replace('.pdf', '').toUpperCase(),
        chapas: [],
        criado_em: new Date(),
        status: 'rascunho'
      };

      for (const d of dados) {
        // Tenta encontrar a chapa exata no estoque
        const resultadosBusca = await this.chapaRepo.buscarPorSKU(d.material);
        const chapaEstoque = resultadosBusca.find(c => 
          c.espessura === d.espessura && 
          (Math.abs(c.largura - d.largura) < 50 || Math.abs(c.altura - d.altura) < 50)
        ) || resultadosBusca[0];

        const chapaId = `ch_pdf_${Math.random().toString(36).substr(2, 9)}`;
        
        const novaChapa: ChapaSelecionada = {
          id: chapaId,
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
    } catch (error) {
      console.error('Erro ao processar PDF:', error);
      throw new Error('Falha ao processar arquivo PDF. Verifique se o formato é compatível.');
    }
  }
}
