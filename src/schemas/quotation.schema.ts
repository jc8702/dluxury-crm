import { z } from 'zod';

export const createQuotationSchema = z.object({
  clientId: z.number().positive(),
  number: z.string().min(1),
  description: z.string().optional(),
  marginPercentage: z.number().min(0).max(100),
});

export type CreateQuotation = z.infer<typeof createQuotationSchema>;
