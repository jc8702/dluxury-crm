import React from 'react';

interface PropostaTemplateProps {
  orcamento: any;
  cliente: any;
}

const PropostaTemplate: React.FC<PropostaTemplateProps> = ({ orcamento, cliente }) => {
  const dataRef = new Date();
  const validade = new Date();
  validade.setDate(dataRef.getDate() + 30);

  return (
    <div id="proposta-pdf-template" style={{ 
      width: '210mm', 
      minHeight: '297mm', 
      background: '#fff', 
      color: '#1a1a1a', 
      padding: '20mm',
      fontFamily: 'Arial, sans-serif',
      position: 'absolute',
      left: '-9999px',
      top: 0
    }}>
      {/* Cabeçalho */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #0D2137', paddingBottom: '10mm', marginBottom: '10mm' }}>
        <div>
          <img src="/logo.png" alt="D'Luxury" style={{ height: '60px', marginBottom: '5px' }} />
          <h1 style={{ margin: 0, fontSize: '24px', color: '#0D2137', fontWeight: 'bold' }}>PROPOSTA COMERCIAL</h1>
          <p style={{ margin: 0, color: '#E2AC00', fontWeight: 'bold' }}>Nº {orcamento.numero}</p>
        </div>
        <div style={{ textAlign: 'right', fontSize: '12px' }}>
          <p>Emissão: {dataRef.toLocaleDateString()}</p>
          <p>Validade: {validade.toLocaleDateString()}</p>
        </div>
      </div>

      {/* Dados do Cliente */}
      <div style={{ background: '#f8f9fa', padding: '5mm', borderRadius: '4px', marginBottom: '10mm' }}>
        <h3 style={{ margin: '0 0 5px 0', fontSize: '14px', color: '#0D2137' }}>DADOS DO CLIENTE</h3>
        <p style={{ margin: 0, fontSize: '13px' }}><strong>Nome:</strong> {cliente.nome}</p>
        <p style={{ margin: 0, fontSize: '13px' }}><strong>Telefone:</strong> {cliente.telefone}</p>
        <p style={{ margin: 0, fontSize: '13px' }}><strong>Cidade:</strong> {cliente.cidade || 'Não informada'} - {cliente.uf || 'UF'}</p>
      </div>

      {/* Itens do Orçamento */}
      <div style={{ marginBottom: '15mm' }}>
        <h3 style={{ borderBottom: '1px solid #ddd', paddingBottom: '2mm', marginBottom: '5mm', fontSize: '16px', color: '#0D2137' }}>DETALHAMENTO DO PROJETO</h3>
        
        {/* Aqui viria o loop de ambientes se estivessem estruturados, por enquanto vamos listar os itens */}
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#0D2137', color: '#fff' }}>
              <th style={{ textAlign: 'left', padding: '3mm', fontSize: '12px' }}>ITEM / AMBIENTE</th>
              <th style={{ textAlign: 'left', padding: '3mm', fontSize: '12px' }}>DESCRITIVO TÉCNICO</th>
              <th style={{ textAlign: 'right', padding: '3mm', fontSize: '12px' }}>VALOR</th>
            </tr>
          </thead>
          <tbody>
            {/* Simulação de Itens - no mundo real viria de orcamento.items */}
            <tr style={{ borderBottom: '1px solid #eee' }}>
              <td style={{ padding: '4mm 3mm', fontSize: '13px' }}>
                <strong>COZINHA PLANEJADA</strong><br/>
                <span style={{ fontSize: '11px', color: '#666' }}>Armários inferiores e superiores</span>
              </td>
              <td style={{ padding: '4mm 3mm', fontSize: '11px', color: '#555' }}>
                MDF 18mm Branco Polar, Dobradiças com amortecedor, puxadores embutidos.
              </td>
              <td style={{ padding: '4mm 3mm', textAlign: 'right', fontSize: '13px' }}>
                R$ {(orcamento.valor_final || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Resumo Financeiro */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '15mm' }}>
        <div style={{ width: '80mm' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2mm 0', borderBottom: '1px solid #ddd' }}>
            <span>VALOR TOTAL</span>
            <span style={{ fontWeight: 'bold', fontSize: '18px', color: '#0D2137' }}>R$ {(orcamento.valor_final || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          </div>
          <div style={{ fontSize: '12px', marginTop: '5mm', color: '#666' }}>
            <p style={{ margin: '2px 0' }}><strong>Prazo de Entrega:</strong> {orcamento.prazo_entrega_dias || 45} dias úteis</p>
            <p style={{ margin: '2px 0' }}><strong>Pagamento:</strong> {orcamento.condicao_pagamento_nome || 'A combinar'}</p>
          </div>
        </div>
      </div>

      {/* Termos e Condições */}
      <div style={{ borderTop: '1px solid #ddd', paddingTop: '5mm', fontSize: '11px', color: '#888' }}>
        <h4 style={{ margin: '0 0 5px 0', fontSize: '12px', color: '#333' }}>TERMOS E CONDIÇÕES</h4>
        <ul style={{ paddingLeft: '15px', margin: 0 }}>
          <li>Garantia estrutural de 12 meses contra defeitos de fabricação.</li>
          <li>Ferragens com garantia conforme fabricante (ex: 10 anos para Blum/Hettich).</li>
          <li>Montagem inclusa no local indicado.</li>
          <li>Alterações após aprovação do projeto executivo podem alterar valores e prazos.</li>
        </ul>
      </div>

      {/* Rodapé fixo (simulado) */}
      <div style={{ position: 'absolute', bottom: '20mm', left: '20mm', width: '170mm', textAlign: 'center', fontSize: '10px', color: '#999', borderTop: '1px solid #eee', paddingTop: '5mm' }}>
        D'Luxury Móveis Sob Medida | Rua das Indústrias, 100 - Industrial | (11) 99999-8888 | www.dluxury.com.br
      </div>
    </div>
  );
};

export default PropostaTemplate;
