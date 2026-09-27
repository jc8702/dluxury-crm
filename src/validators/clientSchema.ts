import { z } from 'zod';

// Helper: remove formatação e valida comprimento mínimo (8 dígitos)
const telefoneSchema = z
  .string()
  .transform((v) => v.replace(/\D/g, ''))
  .refine((v) => v.length >= 8, { message: 'Telefone inválido — mínimo 8 dígitos' })
  .or(z.literal(''));

export const clientSchema = z.object({
  id: z.string().optional(),
  nome: z.string().min(3, { message: 'O nome deve ter no mínimo 3 caracteres' }),
  cpf: z.string().optional().or(z.literal('')),
  cnpj: z.string().optional().or(z.literal('')),
  telefone: telefoneSchema,
  email: z.string().email({ message: 'E-mail inválido' }).optional().or(z.literal('')),
  endereco: z.string().optional().or(z.literal('')),
  bairro: z.string().optional().or(z.literal('')),
  cidade: z.string().optional().or(z.literal('')),
  uf: z.string().max(2, { message: 'UF deve ter 2 caracteres' }).optional().or(z.literal('')),
  tipoImovel: z.enum(['casa', 'apartamento', 'comercial']).optional().default('casa'),
  comodosInteresse: z.array(z.string()).optional().default([]),
  origem: z
    .enum(['indicacao', 'instagram', 'google', 'feira', 'passante', 'outro'])
    .optional()
    .default('indicacao'),
  observacoes: z.string().optional().or(z.literal('')),
  status: z.enum(['ativo', 'inativo']).optional().default('ativo'),
});

export type ClientFormData = z.infer<typeof clientSchema>;
