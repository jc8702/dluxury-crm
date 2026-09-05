import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ShieldAlert, FileText, CheckCircle } from 'lucide-react';

const TermosUsoPage: React.FC = () => {
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
            <FileText size={36} /> Termos de Uso
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

        {/* Conteúdo dos Termos */}
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
              1. Aceitação dos Termos
            </h2>
            <p>
              Ao se cadastrar e utilizar a plataforma D'Luxury CRM (doravante designada
              "Plataforma"), você ("Usuário" ou "Contratante") concorda integralmente com estes
              Termos de Uso. Se você não concorda com qualquer uma das disposições aqui descritas,
              não deve concluir o cadastro ou utilizar nossos serviços.
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
              2. Descrição do Serviço
            </h2>
            <p>
              O D'Luxury CRM é um software de gestão empresarial (ERP) voltado para o setor de
              marcenarias de alto padrão. O serviço inclui gerenciamento de clientes (CRM), geração
              técnica de orçamentos, acompanhamento de projetos, plano de corte de painéis de MDF,
              simulador tridimensional CNC, controle de movimentação de estoque, controle financeiro
              e assistente inteligente de IA.
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
              3. Cadastro de Conta e Multi-Tenancy
            </h2>
            <p>
              A Plataforma opera em regime de multi-tenancy. Cada cliente registrado ("Tenant")
              possui um banco de dados logicamente isolado, acessível através de um subdomínio
              exclusivo. É responsabilidade exclusiva do Usuário assegurar a confidencialidade das
              credenciais de acesso de seus colaboradores e administradores.
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
              4. Período de Testes (Trial) e Cobrança
            </h2>
            <p>
              Oferecemos um período de testes gratuitos (Trial) de 14 (quatorze) dias com acesso
              integral aos módulos equivalentes ao plano PRO. Ao final deste período, caso o Usuário
              deseje continuar utilizando o sistema, deverá configurar um meio de pagamento válido
              via gateway integrado (Asaas).
            </p>
            <p style={{ marginTop: '0.5rem' }}>
              A cobrança é recorrente e mensal. A inadimplência por um período superior a 5 (cinco)
              dias corridos a partir da data de vencimento ensejará a suspensão automática das
              permissões de escrita na Plataforma (bloqueio 402 Payment Required), sem prejuízo da
              exclusão lógica das informações após 90 (noventa) dias de atraso persistente.
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
              5. Limitação de Responsabilidade
            </h2>
            <p>
              A Plataforma fornece ferramentas matemáticas (como algoritmos de otimização de plano
              de corte e simulador 3D CNC) e análises físicas do assistente de IA. Tais ferramentas
              servem como apoio à decisão técnica e industrial. O D'Luxury CRM não se responsabiliza
              por eventuais erros de execução física na marcenaria, desgaste ou colisão de
              ferramentas em fresadoras CNC, ou prejuízos financeiros oriundos de precificações
              incorretas geradas de forma autônoma pelo Usuário.
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
              6. Rescisão e Reembolso
            </h2>
            <p>
              O Usuário poderá solicitar o cancelamento de sua assinatura a qualquer momento através
              do painel de Configurações, interrompendo as cobranças futuras. Em conformidade com o
              Código de Defesa do Consumidor brasileiro, o reembolso integral da primeira
              mensalidade está garantido para desistências ocorridas nos primeiros 7 (sete) dias
              após a primeira contratação paga.
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
              7. Foro
            </h2>
            <p>
              Para dirimir quaisquer controvérsias oriundas do presente termo, as partes elegem o
              Foro da Comarca da sede da empresa administradora do D'Luxury CRM, com renúncia
              expressa a qualquer outro, por mais privilegiado que seja.
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
          <ShieldAlert style={{ color: 'hsl(var(--accent))', flexShrink: 0 }} size={24} />
          <span style={{ fontSize: '0.85rem', color: 'hsl(var(--muted-foreground))' }}>
            Caso tenha qualquer dúvida de cunho legal, entre em contato com nosso suporte através de{' '}
            <a
              href="mailto:comercial@dluxury-crm.vercel.app"
              style={{ color: 'hsl(var(--primary))', textDecoration: 'none' }}
            >
              comercial@dluxury-crm.vercel.app
            </a>
            .
          </span>
        </div>
      </div>
    </div>
  );
};

export default TermosUsoPage;
