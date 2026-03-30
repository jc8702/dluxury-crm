import { sql, validateAuth } from './lib/_db.js';

export default async function handler(req: any, res: any) {
  const { authorized, error } = validateAuth(req);
  if (!authorized) return res.status(401).json({ error });

  if (req.method === 'GET') {
    try {
      const result = await sql`SELECT * FROM clients ORDER BY razao_social ASC`;
      return res.status(200).json(result);
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }

  if (req.method === 'POST') {
    const { 
      razaoSocial, cnpj, nomeFantasia, porte, dataAbertura, 
      cnaePrincipal, cnaeSecundario, naturezaJuridica,
      logradouro, numero, complemento, cep, bairro, municipio, uf,
      email, telefone, situacaoCadastral, dataSituacaoCadastral, motivoSituacao,
      codigoErp, historico, frequenciaCompra 
    } = req.body;

    try {
      const result = await sql`
        INSERT INTO clients (
          razao_social, cnpj, nome_fantasia, porte, data_abertura,
          cnae_principal, cnae_secundario, natureza_juridica,
          logradouro, numero, complemento, cep, bairro, municipio, uf,
          email, telefone, situacao_cadastral, data_situacao_cadastral, motivo_situacao,
          codigo_erp, historico, frequencia_compra
        )
        VALUES (
          ${razaoSocial}, ${cnpj}, ${nomeFantasia}, ${porte}, ${dataAbertura},
          ${cnaePrincipal}, ${cnaeSecundario}, ${naturezaJuridica},
          ${logradouro}, ${numero}, ${complemento}, ${cep}, ${bairro}, ${municipio}, ${uf},
          ${email}, ${telefone}, ${situacaoCadastral}, ${dataSituacaoCadastral}, ${motivoSituacao},
          ${codigoErp}, ${historico}, ${frequenciaCompra}
        )
        RETURNING *
      `;
      return res.status(201).json(result[0]);
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }

  if (req.method === 'PATCH') {
    const { id } = req.query;
    const { 
      razaoSocial, cnpj, nomeFantasia, porte, dataAbertura, 
      cnaePrincipal, cnaeSecundario, naturezaJuridica,
      logradouro, numero, complemento, cep, bairro, municipio, uf,
      email, telefone, situacaoCadastral, dataSituacaoCadastral, motivoSituacao,
      codigoErp, historico, frequenciaCompra 
    } = req.body;

    try {
      const result = await sql`
        UPDATE clients SET
          razao_social = ${razaoSocial}, cnpj = ${cnpj}, nome_fantasia = ${nomeFantasia}, 
          porte = ${porte}, data_abertura = ${dataAbertura},
          cnae_principal = ${cnaePrincipal}, cnae_secundario = ${cnaeSecundario}, 
          natureza_juridica = ${naturezaJuridica},
          logradouro = ${logradouro}, numero = ${numero}, complemento = ${complemento}, 
          cep = ${cep}, bairro = ${bairro}, municipio = ${municipio}, uf = ${uf},
          email = ${email}, telefone = ${telefone}, 
          situacao_cadastral = ${situacaoCadastral}, data_situacao_cadastral = ${dataSituacaoCadastral}, 
          motivo_situacao = ${motivoSituacao},
          codigo_erp = ${codigoErp}, historico = ${historico}, frequencia_compra = ${frequenciaCompra}
        WHERE id = ${id}
        RETURNING *
      `;
      return res.status(200).json(result[0]);
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }

  if (req.method === 'DELETE') {
    const { id } = req.query;
    try {
      await sql`DELETE FROM clients WHERE id = ${id}`;
      return res.status(200).json({ success: true });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }

  res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
