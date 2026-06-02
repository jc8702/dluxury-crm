import { z } from 'zod';
import { moneySchema } from './common';

export const skuSchema = z.object({
  id: z.string().optional(),
  codigo: z.string().optional(),
  nome: z.string().optional(),
  precoUnitario: moneySchema.optional(),
  tipo: z.string().optional(),
});

export const quotationItemSchema = z.object({
  nomeCustomizado: z.string().optional(),
  quantidade: z.number().min(0.01, 'A quantidade deve ser maior que zero'),
  largura: z.union([z.number(), z.string()]).optional(),
  altura: z.union([z.number(), z.string()]).optional(),
  espessura: z.union([z.number(), z.string()]).optional(),
  material: z.string().optional(),
  skuId: z.string().optional(),
  skuTipo: z.string().optional(),
  skuCodigo: z.string().optional(),
  skuDescricao: z.string().optional(),
  custoUnitarioCalculado: moneySchema,
  precoVendaUnitario: moneySchema,
  precoVendaSobrescrito: moneySchema.nullable().optional(),
  margemLucro: moneySchema,
  observacoes: z.string().optional(),
  metadata: z
    .object({
      chapa: skuSchema.nullable().optional(),
      fitaBorda: z
        .object({
          sku: skuSchema.nullable().optional(),
          lados: z
            .object({
              topo: z.boolean().optional(),
              base: z.boolean().optional(),
              esquerda: z.boolean().optional(),
              direita: z.boolean().optional(),
            })
            .optional(),
        })
        .optional(),
      ferragens: z
        .array(
          z.object({
            sku: skuSchema.optional(),
            quantidade: z.number().min(1, 'Quantidade inválida'),
          }),
        )
        .optional(),
    })
    .optional(),
});
