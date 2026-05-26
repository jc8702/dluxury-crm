import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield, Eye, Mail } from 'lucide-react';

const PoliticaPrivacidadePage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div style={{
      background: '#0D1117',
      color: '#F0F6FC',
      fontFamily: 'Inter, sans-serif',
      minHeight: '100vh',
      padding: '3rem 1.5rem',
      boxSizing: 'border-box'
    }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        
        {/* Botão Voltar */}
        <button 
          onClick={() => navigate('/')}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#8B949E',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            cursor: 'pointer',
            fontSize: '0.95rem',
            marginBottom: '2rem',
            padding: 0,
            transition: 'color 0.2s ease'
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = '#E2AC00'}
          onMouseLeave={(e) => e.currentTarget.style.color = '#8B949E'}
        >
          <ArrowLeft size={18} />
          Voltar para Home
        </button>

        {/* Cabeçalho */}
        <div style={{ borderBottom: '1px solid rgba(240, 246, 252, 0.1)', paddingBottom: '1.5rem', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#E2AC00', margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Shield size={36} /> Política de Privacidade
          </h1>
          <p style={{ color: '#8B949E', fontSize: '0.95rem', marginTop: '0.5rem' }}>
            Última atualização: 26 de Maio de 2026
          </p>
        </div>

        {/* Conteúdo da Política */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', lineHeight: '1.6', fontSize: '0.95rem', color: '#C9D1D9' }}>
          
          <section>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#F0F6FC', marginBottom: '0.75rem' }}>
              1. Compromisso com a Privacidade
            </h2>
            <p>
              O D'Luxury CRM tem o compromisso de proteger a privacidade e os dados pessoais de seus clientes e usuários. Esta Política de Privacidade descreve como coletamos, usamos, armazenamos e protegemos seus dados pessoais de acordo com a Lei Geral de Proteção de Dados Pessoais (LGPD) — Lei nº 13.709/2018.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#F0F6FC', marginBottom: '0.75rem' }}>
              2. Dados Coletados e Finalidade
            </h2>
            <p>
              Coletamos informações em diferentes níveis da Plataforma para viabilizar as funcionalidades do sistema:
            </p>
            <ul style={{ paddingLeft: '1.5rem', marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <li>
                <strong>Dados Cadastrais do Cliente (Tenant):</strong> Nome da empresa, subdomínio solicitado, CNPJ, telefone de contato e dados cadastrais dos usuários administradores (nome, e-mail e senha criptografada). Finalidade: Criação da conta, autenticação e comunicação sobre serviços.
              </li>
              <li>
                <strong>Dados Faturamento:</strong> CPF/CNPJ, endereço, telefone e detalhes básicos do meio de pagamento. Finalidade: Processamento de cobrança pelo gateway parceiro (Asaas) e emissão de notas fiscais.
              </li>
              <li>
                <strong>Dados de Produção e Estoque:</strong> Cadastro de materiais, clientes da marcenaria, SKUs de peças, ordens de produção, plano de corte e imagens de visitas técnicas. Finalidade: Execução do software contratado. O D'Luxury CRM atua exclusivamente como operador desses dados, cabendo ao Usuário o papel de controlador em relação aos dados de seus clientes finais.
              </li>
            </ul>
          </section>

          <section>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#F0F6FC', marginBottom: '0.75rem' }}>
              3. Compartilhamento de Dados com Terceiros
            </h2>
            <p>
              Não vendemos ou transferimos seus dados pessoais a terceiros para fins comerciais. Seus dados são compartilhados apenas com os parceiros necessários para a execução das funções principais do sistema:
            </p>
            <ul style={{ paddingLeft: '1.5rem', marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <li>
                <strong>Gateway de Pagamentos (Asaas):</strong> Para processamento de boleto, Pix ou cartão de crédito.
              </li>
              <li>
                <strong>API Google Gemini AI:</strong> Apenas os dados textuais de SKUs, orçamentos ou perguntas específicas enviados ativamente pelo Usuário ao assistente de IA (Dlux) são enviados à infraestrutura da API da Google para análise técnica e retorno. Estes dados não são utilizados para treinamento de modelos públicos da Google.
              </li>
            </ul>
          </section>

          <section>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#F0F6FC', marginBottom: '0.75rem' }}>
              4. Direitos dos Titulares de Dados
            </h2>
            <p>
              Nos termos do artigo 18 da LGPD, os titulares de dados pessoais possuem direitos quanto aos seus dados tratados pelo D'Luxury CRM:
            </p>
            <ul style={{ paddingLeft: '1.5rem', marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <li>Confirmação da existência de tratamento e acesso aos dados.</li>
              <li>Correção de dados incompletos, inexatos ou desatualizados.</li>
              <li>Eliminação ou portabilidade dos dados sob requisição expressa, respeitadas as obrigações legais de guarda fiscal.</li>
            </ul>
          </section>

          <section>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#F0F6FC', marginBottom: '0.75rem' }}>
              5. Encarregado de Dados (DPO)
            </h2>
            <p>
              Caso deseje exercer seus direitos como titular de dados ou esclarecer dúvidas sobre esta Política de Privacidade, entre em contato diretamente com o nosso Encarregado de Proteção de Dados (DPO) através dos canais oficiais:
            </p>
            <p style={{ marginTop: '0.5rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Mail size={18} style={{ color: '#E2AC00' }} /> E-mail do Encarregado: <a href="mailto:comercial@dluxury-crm.vercel.app" style={{ color: '#58A6FF', textDecoration: 'none' }}>comercial@dluxury-crm.vercel.app</a>
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#F0F6FC', marginBottom: '0.75rem' }}>
              6. Retenção e Exclusão de Dados
            </h2>
            <p>
              Após o encerramento do contrato ou cancelamento do plano, o D'Luxury CRM reterá os dados do banco de dados do respectivo Tenant pelo período de 90 (noventa) dias corridos. Decorrido esse período de segurança (que visa permitir que o cliente exporte suas informações), os dados de produção e o banco lógico do Tenant serão definitivamente excluídos e destruídos dos nossos servidores principais e backups ativos.
            </p>
          </section>

        </div>

        {/* Rodapé Interno */}
        <div style={{
          marginTop: '3rem',
          padding: '1.5rem',
          background: '#161B22',
          borderRadius: '12px',
          border: '1px solid rgba(240, 246, 252, 0.08)',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <Eye style={{ color: '#E2AC00', flexShrink: 0 }} size={24} />
          <span style={{ fontSize: '0.85rem', color: '#8B949E' }}>
            Esta Política de Privacidade está sujeita a alterações periódicas de acordo com novas normativas legais e melhorias técnicas do ERP.
          </span>
        </div>

      </div>
    </div>
  );
};

export default PoliticaPrivacidadePage;
