import { z } from 'zod';

export const createClientSchema = z.object({
  name: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  email: z.string().email('Email inválido'),
  phone: z.string().min(10, 'Telefone inválido').max(15),
  document: z.string().optional(),
  notes: z.string().optional(),
});

export type CreateClient = z.infer<typeof createClientSchema>;
