import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Retalho } from '../../infrastructure/api/retalhosRepository';

export function PainelRetalhos() {
  const [retalhos, setRetalhos] = useState<Retalho[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Simulando busca de retalhos (no futuro via API)
    setRetalhos([
      { id: '1', sku_chapa: 'MDF-BRANCO-15MM', largura_mm: 800, altura_mm: 600, espessura_mm: 15, disponivel: true, origem: 'sobra_plano_corte' },
      { id: '2', sku_chapa: 'MDF-AMADEIRADO-18MM', largura_mm: 1200, altura_mm: 450, espessura_mm: 18, disponivel: true, origem: 'manual' }
    ]);
  }, []);

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Estoque de Retalhos Reutilizáveis</CardTitle>
        <Button size="sm">Adicionar Retalho Manual</Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-slate-500">Carregando...</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU Material</TableHead>
                <TableHead>Dimensões</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {retalhos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-slate-500 py-6">
                    Nenhum retalho no estoque.
                  </TableCell>
                </TableRow>
              ) : (
                retalhos.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.sku_chapa}</TableCell>
                    <TableCell>{r.largura_mm} x {r.altura_mm} mm</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {r.origem === 'sobra_plano_corte' ? 'Sobra Sistema' : 'Manual'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {r.disponivel ? (
                        <Badge className="bg-emerald-500">Disponível</Badge>
                      ) : (
                        <Badge variant="secondary">Usado</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" className="text-red-500">Descartar</Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
