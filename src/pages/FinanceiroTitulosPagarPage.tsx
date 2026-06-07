import { useTitulosPagarHook } from '../hooks/financeiro/useTitulosPagarHook';
import { TitulosPagarListView } from '../components/financeiro/TitulosPagarListView';
import {
  BaixaModal,
  EditTituloModal,
  LoteModal,
} from '../components/financeiro/TitulosPagarFormModal';

export default function FinanceiroTitulosPagarPage() {
  const h = useTitulosPagarHook();

  return (
    <>
      {h.ConfirmDialogElement}

      <TitulosPagarListView
        rows={h.rows}
        total={h.total}
        page={h.page}
        perPage={h.perPage}
        loading={h.loading}
        suppliersMap={h.suppliersMap}
        contas={h.contas}
        expandedGroups={h.expandedGroups}
        selectedIds={h.selectedIds}
        stats={h.stats}
        baixaModal={h.baixaModal}
        editModal={h.editModal}
        reciboModal={h.reciboModal}
        loteModal={h.loteModal}
        loteData={h.loteData}
        loteLoading={h.loteLoading}
        isWizardOpen={h.isWizardOpen}
        onPageChange={h.setPage}
        onRefresh={() => h.load(h.page)}
        onSelectAll={h.selectAllAbertos}
        onClearSelection={() => h.setSelectedIds(new Set())}
        onToggleSelect={h.toggleSelect}
        onToggleGroup={(sid) => h.setExpandedGroups((prev) => ({ ...prev, [sid]: !prev[sid] }))}
        onNewWizard={() => h.setIsWizardOpen(true)}
        onEdit={h.setEditModal}
        onDelete={h.doDelete}
        onBaixa={h.setBaixaModal}
        onRecibo={h.setReciboModal}
        onBaixaConfirm={h.confirmarBaixa}
        onBaixaClose={() => h.setBaixaModal(null)}
        onEditSave={h.saveEdit}
        onEditClose={() => h.setEditModal(null)}
        onEditChange={h.setEditModal}
        onReciboClose={() => h.setReciboModal(null)}
        onLoteOpen={() => h.setLoteModal(true)}
        onLoteClose={() => h.setLoteModal(false)}
        onLoteDataChange={h.setLoteData}
        onLoteConfirm={h.handleBaixaLote}
        onWizardClose={() => h.setIsWizardOpen(false)}
        onDeleteBatch={h.handleDeleteBatch}
      />

      <BaixaModal
        baixaModal={h.baixaModal}
        contas={h.contas}
        onClose={() => h.setBaixaModal(null)}
        onConfirm={h.confirmarBaixa}
      />
      <EditTituloModal
        editModal={h.editModal}
        onClose={() => h.setEditModal(null)}
        onChange={h.setEditModal}
        onSave={h.saveEdit}
      />
      <LoteModal
        loteModal={h.loteModal}
        loteData={h.loteData}
        loteLoading={h.loteLoading}
        selectedCount={h.selectedIds.size}
        contas={h.contas}
        onClose={() => h.setLoteModal(false)}
        onDataChange={h.setLoteData}
        onConfirm={h.handleBaixaLote}
      />
    </>
  );
}
