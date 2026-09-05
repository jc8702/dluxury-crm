import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield, Eye, Mail } from 'lucide-react';

const PoliticaPrivacidadePage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div
      style={{
        background: 'hsl(var(--background))',
        color: 'hsl(var(--foreground))',
        fontFamily: "'Source Sans 3', Inter, sans-serif",
        minHeight: '100vh',
        padding: '3rem 1.5rem',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        {/* Botão Voltar */}
        <button
          onClick={() => navigate('/')}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'hsl(var(--muted-foreground))',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            cursor: 'pointer',
            fontSize: '0.95rem',
            marginBottom: '2rem',
            padding: 0,
            transition: 'color 0.2s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'hsl(var(--primary))')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'hsl(var(--muted-foreground))')}
        >
          <ArrowLeft size={18} />
          Voltar para Home
        </button>

        {/* Cabeçalho */}
        <div
          style={{
            borderBottom: '1px solid hsl(var(--border))',
            paddingBottom: '1.5rem',
            marginBottom: '2rem',
          }}
        >
          <h1
            style={{
              fontSize: '2.5rem',
              fontWeight: 800,
              color: 'hsl(var(--primary))',
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
            }}
          >
            <Shield size={36} /> Política de Privacidade
          </h1>
          <p
            style={{
              color: 'hsl(var(--muted-foreground))',
              fontSize: '0.95rem',
              marginTop: '0.5rem',
            }}
          >
            Última atualização: 26 de Maio de 2026
          </p>
        </div>

        {/* Conteúdo */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem',
            lineHeight: '1.6',
            fontSize: '0.95rem',
            color: 'hsl(var(--foreground))',
          }}
        >
          <section>
            <h2
              style={{
                fontSize: '1.4rem',
                fontWeight: 700,
                color: 'hsl(var(--accent))',
                marginBottom: '0.75rem',
              }}
            >
              1. Introdução
            </h2>
            <p>
              A D'Luxury CRM está comprometida com a proteção da privacidade e dos dados pessoais de
              seus Usuários, em conformidade com a Lei Geral de Proteção de Dados (Lei nº
              13.709/2018 - LGPD). Esta Política descreve como coletamos, utilizamos, armazenamos e
              protegemos as informações dos Usuários da Plataforma.
            </p>
          </section>

          <section>
            <h2
              style={{
                fontSize: '1.4rem',
                fontWeight: 700,
                color: 'hsl(var(--accent))',
                marginBottom: '0.75rem',
              }}
            >
              2. Dados Coletados
            </h2>
            <p>
              Coletamos os seguintes dados pessoais: nome completo, e-mail, telefone, dados de
              cobrança (processados via gateway de pagamento Asaas, sem armazenamento direto pela
              Plataforma), e informações técnicas de uso (logs de acesso, IP, navegador). Dados
              empresariais inseridos pelo Usuário (clientes, projetos, orçamentos) são armazenados
              de forma isolada por tenant e tratados como conteúdo do Usuário.
            </p>
          </section>

          <section>
            <h2
              style={{
                fontSize: '1.4rem',
                fontWeight: 700,
                color: 'hsl(var(--accent))',
                marginBottom: '0.75rem',
              }}
            >
              3. Finalidades de Uso
            </h2>
            <p>
              Os dados pessoais são utilizados para: (i) prestação dos serviços contratados; (ii)
              emissão de cobrança e gestão financeira; (iii) suporte técnico e comunicação
              operacional; (iv) melhorias na Plataforma; (v) cumprimento de obrigações legais e
              fiscais. Não realizamos venda ou compartilhamento de dados pessoais com terceiros para
              fins comerciais.
            </p>
          </section>

          <section>
            <h2
              style={{
                fontSize: '1.4rem',
                fontWeight: 700,
                color: 'hsl(var(--accent))',
                marginBottom: '0.75rem',
              }}
            >
              4. Armazenamento e Segurança
            </h2>
            <p>
              Os dados são armazenados em infraestrutura cloud (Vercel, Neon/PostgreSQL, Upstash
              Redis) com criptografia em trânsito (TLS) e em repouso. Aplicamos controles de acesso
              baseados em função, autenticação multifator para contas administrativas e
              monitoramento contínuo de segurança. Backups são realizados de forma automatizada e
              criptografada.
            </p>
          </section>

          <section>
            <h2
              style={{
                fontSize: '1.4rem',
                fontWeight: 700,
                color: 'hsl(var(--accent))',
                marginBottom: '0.75rem',
              }}
            >
              5. Direitos do Titular
            </h2>
            <p>
              Em conformidade com a LGPD, o titular dos dados pode exercer a qualquer momento os
              direitos de: confirmação de existência de tratamento, acesso, correção, anonimização,
              portabilidade, eliminação e revogação de consentimento. As solicitações devem ser
              encaminhadas para o encarregado de dados (DPO) através do e-mail indicado no rodapé.
            </p>
          </section>

          <section>
            <h2
              style={{
                fontSize: '1.4rem',
                fontWeight: 700,
                color: 'hsl(var(--accent))',
                marginBottom: '0.75rem',
              }}
            >
              6. Cookies e Tecnologias Semelhantes
            </h2>
            <p>
              Utilizamos cookies essenciais para autenticação e sessão do Usuário. Cookies
              analíticos e de marketing somente são ativados com consentimento explícito. O Usuário
              pode gerenciar suas preferências de cookies a qualquer momento através das
              configurações do navegador.
            </p>
          </section>

          <section>
            <h2
              style={{
                fontSize: '1.4rem',
                fontWeight: 700,
                color: 'hsl(var(--accent))',
                marginBottom: '0.75rem',
              }}
            >
              7. Retenção e Eliminação
            </h2>
            <p>
              Os dados pessoais são retidos enquanto durar a relação contratual e por até 5 (cinco)
              anos após o término, para cumprimento de obrigações legais e fiscais. Após esse
              período, os dados são eliminados de forma segura ou anonimizados para fins
              estatísticos.
            </p>
          </section>

          <section>
            <h2
              style={{
                fontSize: '1.4rem',
                fontWeight: 700,
                color: 'hsl(var(--accent))',
                marginBottom: '0.75rem',
              }}
            >
              8. Alterações nesta Política
            </h2>
            <p>
              Esta Política pode ser revisada periodicamente. Alterações relevantes serão
              comunicadas por e-mail e/ou notificação na Plataforma, com antecedência mínima de 30
              (trinta) dias. A versão atual estará sempre disponível nesta página.
            </p>
          </section>
        </div>

        {/* Rodapé Interno */}
        <div
          style={{
            marginTop: '3rem',
            padding: '1.5rem',
            background: 'hsl(var(--card))',
            borderRadius: '12px',
            border: '1px solid hsl(var(--border))',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
          }}
        >
          <Mail style={{ color: 'hsl(var(--accent))', flexShrink: 0 }} size={24} />
          <span style={{ fontSize: '0.85rem', color: 'hsl(var(--muted-foreground))' }}>
            Para exercer seus direitos como titular de dados ou esclarecer dúvidas sobre
            privacidade, entre em contato com nosso DPO através de{' '}
            <a
              href="mailto:privacidade@dluxury-crm.vercel.app"
              style={{ color: 'hsl(var(--primary))', textDecoration: 'none' }}
            >
              privacidade@dluxury-crm.vercel.app
            </a>
            .
          </span>
        </div>
      </div>
    </div>
  );
};

export default PoliticaPrivacidadePage;
