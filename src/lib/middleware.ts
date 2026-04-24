// src/lib/middleware.ts

/**
 * Middleware global para tratamento de erros e logging.
 * Pode ser usado para envolver handlers de API.
 */

export function withMiddleware(handler: Function) {
  return async (req: any, res: any) => {
    try {
      const start = Date.now();

      // SANITIZAÇÃO BÁSICA DE INPUTS
      const body = sanitize(req.body);

      // LOG DE REQUISIÇÃO
      if (process.env.NODE_ENV !== 'test') {
        console.log('[REQUEST]', {
          path: req.url,
          method: req.method,
          ip: req.headers['x-forwarded-for'] || req.socket?.remoteAddress,
        });
      }

      // EXECUTA O HANDLER
      const result = await handler({ ...req, body }, res);

      // LOG DE RESPOSTA
      if (process.env.NODE_ENV !== 'test') {
        console.log('[RESPONSE TIME]', Date.now() - start, 'ms');
      }

      return result;

    } catch (error: any) {
      console.error('[MIDDLEWARE ERROR]', error);

      // Retorna erro padronizado
      return res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  };
}

/**
 * Sanitiza inputs removendo espaços em branco e verificando tipos.
 */
function sanitize(body: any) {
  if (!body || typeof body !== 'object') return body;

  const result: any = {};

  for (const key in body) {
    const value = body[key];

    if (typeof value === 'string') {
      result[key] = value.trim();
    } else {
      result[key] = value;
    }
  }

  return result;
}