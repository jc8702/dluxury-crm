import { useContasHook } from '../hooks/financeiro/useContasHook';
import { useContasFilters } from '../hooks/financeiro/useContasFilters';
import { ContasListView } from '../components/financeiro/ContasListView';
import { ContasFormModal } from '../components/financeiro/ContasFormModal';
import { ContasExtratoModal } from '../components/financeiro/ContasExtratoModal';
import { api } from '../lib/api';
import { useConfirm } from '../hooks/useConfirm';

const FinanceiroContasPage = () => {
  const h = useContasHook();
  const f = useContasFilters(h.extrato);
  const [_, confirm] = useConfirm();

  return (
    <div className="p-8 max-w-[1600px] mx-auto animate-fade-in pb-20">
      {h.ConfirmDialogElement}

      <ContasListView
        contas={h.contas}
        loading={h.loading}
        onRefresh={h.fetchContas}
        onNew={h.openNew}
        onEdit={h.openEdit}
        onDelete={h.doDelete}
        onExtrato={h.openExtrato}
        onTransfer={() => {
          h.setTransferErro('');
          h.setShowTransferencia(true);
        }}
        onFechamento={() => h.setShowFechamento(true)}
        showTransferencia={h.showTransferencia}
        transferForm={h.transferForm}
        transferLoading={h.transferLoading}
        transferErro={h.transferErro}
        onTransferClose={() => h.setShowTransferencia(false)}
        onTransferFormChange={h.setTransferForm}
        onTransferSubmit={h.doTransferencia}
        showFechamento={h.showFechamento}
        fechamentos={h.fechamentos}
        fechamentoForm={h.fechamentoForm}
        onFechamentoClose={() => h.setShowFechamento(false)}
        onFechamentoFormChange={h.setFechamentoForm}
        onFechamentoSave={h.saveFechamento}
        onReabrirFechamento={async (f) => {
          const ok = await confirm({
            title: 'REABRIR PERÍODO',
            description: 'CONFIRMAR DESBLOQUEIO?',
          });
          if (ok) {
            await api.financeiro.fechamentos.save({ ...f, status: 'aberto' });
            h.fetchFechamentos();
          }
        }}
      />

      <ContasFormModal
        isOpen={h.isOpen}
        editing={h.editing}
        form={h.form}
        onClose={() => h.setIsOpen(false)}
        onFormChange={h.setForm}
        onSave={h.save}
      />

      <ContasExtratoModal
        showExtrato={h.showExtrato}
        extrato={h.extrato}
        extratoLoading={h.extratoLoading}
        extratoContaNome={h.extratoContaNome}
        filtroBusca={f.filtroBusca}
        filtroTipo={f.filtroTipo}
        extratoFiltrado={f.extratoFiltrado}
        extratoTotais={f.extratoTotais}
        onClose={() => h.setShowExtrato(false)}
        onFiltroBuscaChange={f.setFiltroBusca}
        onFiltroTipoChange={f.setFiltroTipo}
        onExportCSV={f.exportCSV}
      />
    </div>
  );
};

export default FinanceiroContasPage;
