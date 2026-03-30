import type { ParsedCNPJ } from './types';

/**
 * Consulta dados oficiais de um CNPJ via BrasilAPI (Gratuito e Sem Chave)
 */
export const fetchCNPJData = async (cnpj: string): Promise<ParsedCNPJ> => {
  const cleanCnpj = cnpj.replace(/\D/g, '');
  
  if (cleanCnpj.length !== 14) {
    throw new Error('O CNPJ deve ter exatamente 14 números.');
  }

  const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`);
  
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('CNPJ não encontrado na base da Receita Federal.');
    }
    throw new Error('Erro ao consultar CNPJ. Tente novamente em instantes.');
  }

  const data = await response.json();

  // Mapeamento dos campos da BrasilAPI para o nosso formato interno
  return {
    cnpj: data.cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5"),
    razaoSocial: data.razao_social,
    nomeFantasia: data.nome_fantasia || data.razao_social,
    dataAbertura: formatDate(data.data_inicio_atividade),
    logradouro: data.logradouro,
    numero: data.numero,
    complemento: data.complemento,
    cep: data.cep.replace(/^(\d{5})(\d{3})$/, "$1-$2"),
    bairro: data.bairro,
    municipio: data.municipio,
    uf: data.uf,
    email: data.email,
    telefone: data.ddd_telefone_1 || data.ddd_telefone_2,
    porte: mapPorte(data.porte),
    naturezaJuridica: data.natureza_juridica,
    cnaePrincipal: `${data.cnae_fiscal} - ${data.cnae_fiscal_descricao}`
  };
};

// Helpers para formatação
const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
};

const mapPorte = (porteCode: number | string) => {
  const code = Number(porteCode);
  if (code === 1) return 'ME';
  if (code === 3) return 'EPP';
  return 'Demais';
};
