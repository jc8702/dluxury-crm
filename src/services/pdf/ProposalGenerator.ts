export const generateProposalPDF = (data: {
  clienteNome: string;
  clienteCNPJ?: string;
  simulationResult: any;
  proposalId: string;
}) => {
  const { clienteNome, clienteCNPJ, simulationResult, proposalId } = data;
  
  // Mapeia para garantir nomes de campos caso venha do nosso SimulationSummary
  const items = simulationResult.items || (simulationResult.slots?.map((s: any) => ({
      product: s.product,
      monthlyVolume: s.quantity,
      unitPrice: s.proposedPrice,
      revenue: s.monthlyRevenue,
      margin: s.realMargin
  })) || []);

  const totalMonthlyRevenue = simulationResult.totalMonthlyRevenue;
  const totalMonthlyProfit = simulationResult.totalMonthlyProfit;
  const consolidatedMargin = simulationResult.consolidatedMargin || simulationResult.averageMargin;

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>Proposta Comercial - ${proposalId}</title>
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; max-width: 900px; margin: 0 auto; color: #333; line-height: 1.6; }
        .header { display: flex; justify-content: space-between; align-items: start; border-bottom: 3px solid #2563eb; padding-bottom: 20px; margin-bottom: 30px; }
        h1 { color: #2563eb; margin: 0; font-size: 24px; text-transform: uppercase; }
        .header-info { text-align: right; font-size: 14px; }
        .cliente { background: #f8fafc; padding: 20px; border-radius: 12px; margin-bottom: 30px; border: 1px solid #e2e8f0; }
        .cliente h3 { margin-top: 0; color: #1e40af; border-bottom: 1px solid #cbd5e1; padding-bottom: 8px; margin-bottom: 15px; font-size: 16px; }
        .cliente p { margin: 5px 0; font-size: 14px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        th, td { border: 1px solid #e2e8f0; padding: 12px 15px; text-align: left; }
        th { background: #2563eb; color: white; text-transform: uppercase; font-size: 12px; letter-spacing: 0.05em; }
        tr:nth-child(even) { background: #f8fafc; }
        .total-box { margin-top: 30px; padding: 20px; background: #eff6ff; border-radius: 12px; border: 1px solid #bfdbfe; }
        .total-box p { margin: 8px 0; font-size: 16px; display: flex; justify-content: space-between; }
        .total-label { font-weight: 600; color: #1e40af; }
        .total-value { font-weight: 800; font-size: 18px; }
        .footer { margin-top: 60px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; text-align: center; }
        @media print {
            body { padding: 0; }
            .btn-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
            <h1>PROPOSTA COMERCIAL</h1>
            <p style="color: #64748b; font-size: 14px; margin-top: 5px;">Haco RFID Industrial Solutions</p>
        </div>
        <div class="header-info">
          <p><strong>Nº Proposta:</strong> ${proposalId}</p>
          <p><strong>Data de Emissão:</strong> ${new Date().toLocaleDateString('pt-BR')}</p>
        </div>
      </div>
      
      <div class="cliente">
        <h3>Dados do Beneficiário</h3>
        <p><strong>Razão Social:</strong> ${clienteNome}</p>
        ${clienteCNPJ ? `<p><strong>CNPJ:</strong> ${clienteCNPJ}</p>` : ''}
      </div>
      
      <h3 style="color: #1e40af; font-size: 18px; margin-bottom: 15px;">Itens e Volumes Projetados</h3>
      <table>
        <thead>
          <tr>
            <th>Produto (SKU)</th>
            <th style="text-align: center;">Vl. Mensal (Unidade)</th>
            <th style="text-align: right;">Preço Unit.</th>
            <th style="text-align: right;">Total Mes</th>
          </tr>
        </thead>
        <tbody>
          ${items.map((item: any) => `
            <tr>
              <td>${item.product.descricao} <br/><small style="color: #64748b;">${item.product.codigo}</small></td>
              <td style="text-align: center;">${item.monthlyVolume?.toLocaleString('pt-BR') || '0'}</td>
              <td style="text-align: right;">R$ ${item.unitPrice?.toFixed(4).replace('.', ',') || '0.0000'}</td>
              <td style="text-align: right; font-weight: 600;">R$ ${item.revenue?.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0,00'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      
      <div class="total-box">
        <p>
            <span class="total-label">Faturamento Mensal Estimado:</span>
            <span class="total-value">R$ ${totalMonthlyRevenue?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}</span>
        </p>
        <p>
            <span class="total-label">Vigência Sugerida do Contrato:</span>
            <span class="total-value" style="font-size: 16px;">12 Meses</span>
        </p>
      </div>
      
      <div style="margin-top: 40px; font-size: 13px;">
          <h4 style="color: #1e40af; margin-bottom: 10px;">Observações Comerciais:</h4>
          <ul style="color: #475569;">
              <li>Os preços informados não contemplam tributação de IPI.</li>
              <li>A validade desta proposta é de 10 dias úteis a partir da data de emissão.</li>
              <li>Condições de pagamento sujeitas à análise de crédito (Bureau Haco).</li>
          </ul>
      </div>

      <div class="footer">
        <p><strong>HACO INDUSTRIAL RFID SOLUTIONS</strong></p>
        <p>São Paulo | Blumenau | Hong Kong | Porto</p>
        <p>Proposta tecnológica gerada automaticamente via JMDCORP CRM v2.0</p>
      </div>
    </body>
    </html>
  `;
  
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    // Pequeno delay para garantir renderização antes do print
    setTimeout(() => {
        printWindow.print();
    }, 500);
  }
};
