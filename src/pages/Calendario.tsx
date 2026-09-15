import React from 'react';
import CalendarioIntegrado from '../components/Calendario/CalendarioIntegrado.tsx';

export default function Calendario() {
  return (
    <div className="flex flex-col gap-4 max-w-[1440px] mx-auto w-full animate-fade-in">
      <CalendarioIntegrado />
    </div>
  );
}
