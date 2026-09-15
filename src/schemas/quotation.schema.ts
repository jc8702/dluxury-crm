import { z } from 'zod';

export const createQuotationSchema = z.object({
  clientId: z.number().positive().nullable().optional(),
  clienteId: z.union([z.number(), z.string(), z.null()]).optional(),
  number: z.string().optional(),
  numero: z.string().optional(),
  description: z.string().optional(),
  descricao: z.string().optional(),
  marginPercentage: z.number().min(0).max(100).nullable().optional(),
  margemLucroPercentual: z.number().min(0).max(100).nullable().optional(),
  validadeDias: z.number().min(1).max(365).nullable().optional(),
  taxaFinanceiraPercentual: z.number().min(0).max(100).nullable().optional(),
  descontoPercentual: z.number().min(0).max(100).nullable().optional(),
});

export type CreateQuotation = z.infer<typeof createQuotationSchema>;
