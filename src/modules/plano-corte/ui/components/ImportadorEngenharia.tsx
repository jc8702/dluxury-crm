import React, { useState, useRef } from 'react';
import { Upload, Box, CheckCircle2 } from 'lucide-react';
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
      className={`glass-elevated border-2 border-dashed rounded-2xl p-10 text-center transition-all cursor-pointer group ${
        isDragging 
          ? 'border-primary bg-primary/5 shadow-lg shadow-primary/10' 
          : 'border-border/40 bg-card/20 hover:border-primary/50 hover:bg-card/40'
      }`}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={onDrop}
      onClick={() => inputRef.current?.click()}
    >
      <input 
        type="file" 
        accept=".dae" 
        ref={inputRef} 
        onChange={(e) => e.target.files && handleProcessFile(e.target.files[0])} 
        className="hidden"
      />
      
      <div className="flex justify-center mb-6">
        <div className={`w-20 h-20 rounded-2xl flex items-center justify-center transition-all ${
          isDragging ? 'bg-primary text-primary-foreground scale-110 shadow-xl' : 'bg-white/5 text-muted-foreground group-hover:text-primary group-hover:scale-105'
        }`}>
          <Box size={40} />
        </div>
      </div>
      
      <h3 className="text-xl font-black text-foreground tracking-tight mb-2 uppercase">Importar do 3D</h3>
      <p className="text-[11px] text-muted-foreground font-bold uppercase tracking-widest leading-relaxed max-w-[280px] mx-auto mb-8">
        Arraste um arquivo <strong className="text-foreground">.dae (Collada)</strong> do SketchUp ou clique para procurar.
      </p>
      
      <div className="flex justify-center">
        <div className="h-11 px-6 rounded-xl border border-border/40 bg-white/5 group-hover:border-primary/50 group-hover:bg-primary/10 group-hover:text-primary flex items-center gap-2 text-xs font-black uppercase tracking-widest transition-all">
          <Upload size={16} /> 
          Procurar Arquivo
        </div>
      </div>
    </div>
  );
};

