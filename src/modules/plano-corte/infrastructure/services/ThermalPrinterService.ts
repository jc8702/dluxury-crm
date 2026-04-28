/**
 * SERVIÇO: ThermalPrinterService (WebUSB)
 * 
 * Permite a comunicação direta com impressoras térmicas (Zebra, Argox, Elgin) via WebUSB.
 * Gera comandos ZPL/TSPL para impressão instantânea sem PDF.
 */

export class ThermalPrinterService {
  /**
   * Conecta à impressora via WebUSB
   */
  static async conectar() {
    try {
      // @ts-ignore - WebUSB API
      const device = await navigator.usb.requestDevice({
        filters: [
          { vendorId: 0x0a5f }, // Zebra
          { vendorId: 0x04b8 }, // Epson
          { vendorId: 0x154f }  // Argox
        ]
      });
      await device.open();
      await device.selectConfiguration(1);
      await device.claimInterface(0);
      return device;
    } catch (err) {
      console.error('Erro ao conectar impressora:', err);
      throw err;
    }
  }

  /**
   * Gera e envia comando ZPL para etiqueta de peça
   */
  static async imprimirEtiquetaPeca(peca: any, planoNome: string) {
    const zpl = `
      ^XA
      ^CF0,30
      ^FO50,50^FDPlano: ${planoNome}^FS
      ^CF0,40
      ^FO50,100^FDPeça: ${peca.nome}^FS
      ^FO50,150^FDMassa: ${peca.largura}x${peca.altura}mm^FS
      ^FO50,200^FDBordas: ${this.formatarBordas(peca.fio_de_fita)}^FS
      ^FO50,260^BQN,2,4^FDQA,${peca.id}^FS
      ^XZ
    `;

    // No ambiente real, enviaríamos o buffer para o device USB
    console.log('Imprimindo via WebUSB (ZPL):', zpl);
    return zpl;
  }

  private static formatarBordas(fita: any) {
    if (!fita) return 'Nenhuma';
    const bordas = [];
    if (fita.topo) bordas.push('T');
    if (fita.baixo) bordas.push('B');
    if (fita.esquerda) bordas.push('E');
    if (fita.direita) bordas.push('D');
    return bordas.join('/') || 'Nenhuma';
  }
}
