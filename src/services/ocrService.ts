import * as pdfjsLib from 'pdfjs-dist';
import { createWorker } from 'tesseract.js';

/**
 * Converte a primeira página de um PDF em um Canvas para OCR
 */
export const renderPdfToCanvas = async (file: File): Promise<HTMLCanvasElement> => {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const page = await pdf.getPage(1);
  
  const viewport = page.getViewport({ scale: 2.0 }); // 2x scale for better OCR accuracy
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  
  if (!context) throw new Error('Falha ao criar contexto 2D para OCR');
  
  canvas.height = viewport.height;
  canvas.width = viewport.width;
  
  // Cast to any to bypass strict type checking on the render method in some versions
  await (page as any).render({ 
    canvasContext: context as any, 
    viewport 
  }).promise;
  
  return canvas;
};

/**
 * Executa OCR em um Canvas/Imagem para extrair texto
 */
export const performOCR = async (image: HTMLCanvasElement | File, onProgress?: (msg: string) => void): Promise<string> => {
  const worker = await createWorker('por', 1, {
    logger: m => {
      if (m.status === 'recognizing text') {
        const progress = Math.round(m.progress * 100);
        if (onProgress) onProgress(`Visão Computacional: ${progress}% lido...`);
      } else {
        if (onProgress) onProgress('Preparando motor de visão...');
      }
    }
  });

  try {
    const { data: { text } } = await worker.recognize(image);
    await worker.terminate();
    return text;
  } catch (error) {
    await worker.terminate();
    throw error;
  }
};
