// Tipagem mínima para o pacote `qrcode` (não possui @types instalado).
// Cobre apenas as APIs realmente utilizadas no projeto: `toDataURL`.
declare module 'qrcode' {
  export interface QRCodeToDataURLOptions {
    margin?: number;
    width?: number;
    color?: { dark?: string; light?: string };
    errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
    [key: string]: unknown;
  }

  export function toDataURL(text: string, options?: QRCodeToDataURLOptions): Promise<string>;

  export function toCanvas(
    canvas: HTMLCanvasElement,
    text: string,
    options?: QRCodeToDataURLOptions,
  ): Promise<void>;

  const QRCode: {
    toDataURL: typeof toDataURL;
    toCanvas: typeof toCanvas;
  };

  export default QRCode;
}
