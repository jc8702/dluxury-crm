import { z } from 'zod';

export const cpfSchema = z.string().refine(
  (val) => {
    // Remove tudo que não for dígito
    const cpf = val.replace(/\D/g, '');

    // Se estiver vazio, consideramos opcional em alguns formulários.
    if (cpf.length === 0) return true;

    if (cpf.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(cpf)) return false;

    let sum = 0;
    let remainder;
    for (let i = 1; i <= 9; i++) sum = sum + parseInt(cpf.substring(i - 1, i)) * (11 - i);
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cpf.substring(9, 10))) return false;

    sum = 0;
    for (let i = 1; i <= 10; i++) sum = sum + parseInt(cpf.substring(i - 1, i)) * (12 - i);
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cpf.substring(10, 11))) return false;

    return true;
  },
  { message: 'CPF inválido' },
);

export const phoneSchema = z.string().min(10, 'Telefone inválido').max(15, 'Telefone inválido');

export const moneySchema = z.union([
  z.number(),
  z.string().transform((val) => {
    if (!val) return 0;
    if (typeof val === 'number') return val;
    // Tenta limpar máscara monetária BRL se existir
    const cleaned = val
      .replace(/[R$\s]/g, '')
      .replace(/\./g, '')
      .replace(',', '.');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  }),
]);
