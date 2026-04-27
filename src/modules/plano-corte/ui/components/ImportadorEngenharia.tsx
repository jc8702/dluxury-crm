import React, { useState, useRef } from 'react';
import { Upload, Box } from 'lucide-react';
import { DaeParser } from '../../infrastructure/parsers/DaeParser';
import type { PecaInput } from '../../../../utils/planodeCorte';

interface ImportadorProps {
  onImport: (pecas: PecaInput[]) => void;
}

export const ImportadorEngenharia: React.FC<ImportadorProps> = ({ onImport }) => {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleProcessFile = async (file: File) => {
    if (!file.name.endsWith('.dae')) {
      alert("Apenas arquivos .dae (Collada) do SketchUp são suportados por enquanto.");
      return;
    }
    const text = await file.text();
    const pecas = await DaeParser.parseCollada(text);
    if (pecas.length > 0) {
      onImport(pecas);
    } else {
      alert("Nenhuma peça detectada no arquivo. Verifique se o plugin de exportação gerou as dimensões corretamente.");
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleProcessFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div 
      className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
        isDragging ? 'border-[#E2AC00] bg-[rgba(226,172,0,0.05)]' : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
      }`}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={onDrop}
      onClick={() => inputRef.current?.click()}
      style={{ cursor: 'pointer' }}
    >
      <input 
        type="file" 
        accept=".dae" 
        ref={inputRef} 
        onChange={(e) => e.target.files && handleProcessFile(e.target.files[0])} 
        style={{ display: 'none' }} 
      />
      
      <div className="flex justify-center mb-4 text-slate-400">
        <Box size={48} className={isDragging ? 'text-[#E2AC00]' : ''} />
      </div>
      
      <h3 className="font-bold text-lg mb-2">Importar do 3D (SketchUp/Promob)</h3>
      <p className="text-sm text-slate-400 mb-4">
        Arraste um arquivo <strong className="text-slate-300">.dae (Collada)</strong> gerado pelo projeto de engenharia, ou clique para procurar.
      </p>
      
      <div className="flex justify-center">
        <button className="btn btn-outline flex items-center gap-2 pointer-events-none">
          <Upload size={16} /> Procurar Arquivo
        </button>
      </div>
    </div>
  );
};
