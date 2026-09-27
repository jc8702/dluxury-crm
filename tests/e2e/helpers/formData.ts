/**
 * Dados fictícios reutilizados pelos testes E2E de formulários (TSK-10).
 */
export const CLIENTE_FIXO = {
  nome: 'Maria da Silva Teste',
  cpf: '529.982.247-25',
  telefone: '(47) 99789-6229',
  email: 'maria.silva.teste@exemplo.com',
  endereco: 'Rua das Flores, 123',
  bairro: 'Centro',
  cidade: 'Joinville',
  uf: 'SC',
  tipoImovel: 'casa',
  comodo: 'Cozinha',
  origem: 'instagram',
  observacoes: 'Cliente E2E — criado automaticamente pelo Playwright.',
};

export const ORCAMENTO_FIXO = {
  margemLucroPercentual: '35',
  taxaFinanceiraPercentual: '2',
  validadeDias: '20',
  clienteNome: CLIENTE_FIXO.nome,
};
