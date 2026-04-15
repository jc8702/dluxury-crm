import { sql, validateAuth } from './lib/_db.js';

export default async function handler(req: any, res: any) {
  const { authorized, error } = validateAuth(req);
  if (!authorized) return res.status(401).json({ error });

  if (req.method === 'GET') {
    try {
      const result = await sql`SELECT * FROM clients ORDER BY created_at DESC`;
      return res.status(200).json(result);
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }

  if (req.method === 'POST') {
    const { 
      nome, cpf, telefone, email, endereco, bairro, cidade, uf,
      tipo_imovel, comodos_interesse, origem, observacoes, status,
      razao_social // do fallback do front
    } = req.body;

    const safeRazao = razao_social || nome || 'Sem Nome';
    const safeCnpj = cpf || '';
    const safeCadastro = status === 'ativo' ? 'ATIVA' : 'INATIVA';
    const comodosStr = Array.isArray(comodos_interesse) ? comodos_interesse.join(', ') : (comodos_interesse || '');

    try {
      const result = await sql`
        INSERT INTO clients (
          nome, cpf, telefone, email, endereco, bairro, cidade, uf,
          tipo_imovel, comodos_interesse, origem, observacoes, status,
          razao_social, cnpj, logradouro, municipio, situacao_cadastral
        )
        VALUES (
          ${nome || null}, ${cpf || null}, ${telefone || null}, ${email || null}, 
          ${endereco || null}, ${bairro || null}, ${cidade || null}, ${uf || null},
          ${tipo_imovel || null}, ${comodosStr || null}, ${origem || null}, 
          ${observacoes || null}, ${status || 'ativo'},
          ${safeRazao}, ${safeCnpj}, ${endereco || null}, ${cidade || null}, ${safeCadastro}
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
      nome, cpf, telefone, email, endereco, bairro, cidade, uf,
      tipo_imovel, comodos_interesse, origem, observacoes, status,
      razao_social
    } = req.body;

    const safeRazao = razao_social || nome;
    const comodosStr = Array.isArray(comodos_interesse) ? comodos_interesse.join(', ') : (comodos_interesse || null);

    try {
      const result = await sql`
        UPDATE clients SET
          nome = COALESCE(${nome || null}, nome),
          cpf = COALESCE(${cpf || null}, cpf),
          telefone = COALESCE(${telefone || null}, telefone),
          email = COALESCE(${email || null}, email),
          endereco = COALESCE(${endereco || null}, endereco),
          bairro = COALESCE(${bairro || null}, bairro),
          cidade = COALESCE(${cidade || null}, cidade),
          uf = COALESCE(${uf || null}, uf),
          tipo_imovel = COALESCE(${tipo_imovel || null}, tipo_imovel),
          comodos_interesse = COALESCE(${comodosStr}, comodos_interesse),
          origem = COALESCE(${origem || null}, origem),
          observacoes = COALESCE(${observacoes || null}, observacoes),
          status = COALESCE(${status || null}, status),
          razao_social = COALESCE(${safeRazao || null}, razao_social)
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

  res.setHeader('Allow', ['GET', 'POST', 'PATCH', 'DELETE']);
  res.status(405).end('Method Not Allowed');
}
