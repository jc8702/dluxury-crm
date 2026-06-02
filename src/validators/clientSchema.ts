import { z } from 'zod';

export const clientSchema = z.object({
  id: z.string().optional(),
  nome: z.string().min(3, { message: 'O nome deve ter no mínimo 3 caracteres' }),
  cpf: z.string().optional(),
  telefone: z.string().min(10, { message: 'Telefone inválido' }),
  email: z.string().email({ message: 'E-mail inválido' }).optional().or(z.literal('')),
  endereco: z.string().optional(),
  bairro: z.string().optional(),
  cidade: z.string().optional(),
  uf: z.string().length(2, { message: 'A UF deve ter 2 caracteres' }).optional().or(z.literal('')),
  tipoImovel: z.enum(['casa', 'apartamento', 'comercial']).optional(),
  comodosInteresse: z.array(z.string()).optional(),
  origem: z.enum(['indicacao', 'instagram', 'google', 'feira', 'passante', 'outro']).optional(),
  observacoes: z.string().optional(),
  status: z.enum(['ativo', 'inativo']).optional().default('ativo'),
});

export type ClientFormData = z.infer<typeof clientSchema>;
