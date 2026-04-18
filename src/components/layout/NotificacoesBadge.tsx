import { useState, useEffect, useRef } from 'react';

export function NotificacoesBadge() {
  const [count, setCount] = useState(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    async function buscar() {
      try {
        const res = await fetch('/api?action=contar_nao_lidas', {
          // Timeout de 5s para não travar o carregamento da UI
          signal: AbortSignal.timeout(5000)
        });
        if (!res.ok) return;
        const data = await res.json();
        if (mountedRef.current) {
          setCount(typeof data.total === 'number' ? data.total : 0);
        }
      } catch (err) {
        // Silencioso para não interromper a experiência do usuário
        if (mountedRef.current) setCount(0);
      }
    }

    // Delay inicial de 3s para evitar competição com o carregamento principal (Hydration)
    const primeiraVez = setTimeout(buscar, 3000);

    // Polling resiliente a cada 2 minutos
    const intervalo = setInterval(buscar, 120000);

    return () => {
      mountedRef.current = false;
      clearTimeout(primeiraVez);
      clearInterval(intervalo);
    };
  }, []);

  if (count === 0) return null;

  return (
    <span style={{
      background: '#EF4444',
      color: 'white',
      borderRadius: '10px',
      padding: '2px 6px',
      fontSize: '11px',
      fontWeight: 'bold',
      minWidth: '18px',
      textAlign: 'center',
      boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
      marginLeft: '4px'
    }}>
      {count > 99 ? '99+' : count}
    </span>
  );
}
