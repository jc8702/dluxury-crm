/**
 * Utilitários para manipulação de datas.
 * Garante consistência de timezone (UTC).
 */

/**
 * Cria uma data UTC a partir de valores locais.
 * Uso recomendado para formulários onde o usuário seleciona data/hora no browser.
 */
export function toUTCDate(year: number, month: number, day: number, hour = 0, minute = 0): Date {
  return new Date(Date.UTC(year, month, day, hour, minute));
}

/**
 * Converte uma string de data local (do input type="datetime-local") para Date UTC.
 * @param dateString String no formato 'YYYY-MM-DDTHH:mm'
 */
export function parseLocalDateTime(dateString: string): Date | null {
  if (!dateString) return null;
  
  const [datePart, timePart] = dateString.split('T');
  if (!datePart) return null;

  const [year, month, day] = datePart.split('-').map(Number);
  const [hour, minute] = (timePart || '00:00').split(':').map(Number);

  // Criar data em UTC para evitar desvio de fuso
  return new Date(Date.UTC(year, month - 1, day, hour, minute));
}

/**
 * Formata uma data para exibir no input type="datetime-local" (local time).
 */
export function toInputDateString(date: Date | string | null): string {
  if (!date) return '';
  
  const d = new Date(date);
  
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Formata data para display (pt-BR).
 */
export function formatDatePtBR(date: Date | string | null): string {
  if (!date) return '-';
  const d = new Date(date);
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Formata data e hora para display (pt-BR).
 */
export function formatDateTimePtBR(date: Date | string | null): string {
  if (!date) return '-';
  const d = new Date(date);
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}