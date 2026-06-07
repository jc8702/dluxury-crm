import { useProspeccaoHook } from '../hooks/crm/useProspeccaoHook';
import { ProspeccaoListView } from '../components/crm/ProspeccaoListView';
import { ProspeccaoFormModal } from '../components/crm/ProspeccaoFormModal';

export default function ProspeccaoPage() {
  const h = useProspeccaoHook();

  return (
    <>
      <ProspeccaoListView
        leads={h.leads}
        metrics={h.metrics}
        loading={h.loading}
        search={h.search}
        filterStatus={h.filterStatus}
        filterTemp={h.filterTemp}
        view={h.view}
        onSearchChange={h.setSearch}
        onFilterStatusChange={h.setFilterStatus}
        onFilterTempChange={h.setFilterTemp}
        onViewToggle={() => h.setView(h.view === 'kanban' ? 'lista' : 'kanban')}
        onRefresh={h.fetchAll}
        onNew={() => {
          h.setEditTarget(null);
          h.setShowModal(true);
        }}
        onEdit={(lead) => {
          h.setEditTarget(lead);
          h.setShowModal(true);
        }}
        onDelete={h.handleDelete}
        onStatusChange={h.handleStatusChange}
      />

      {h.showModal && (
        <ProspeccaoFormModal
          initial={h.editTarget}
          onClose={() => {
            h.setShowModal(false);
            h.setEditTarget(null);
          }}
          onSave={h.handleSave}
        />
      )}
    </>
  );
}
