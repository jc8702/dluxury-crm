import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleAgenda } from '../agenda.js';

const mockAgendaService = vi.hoisted(() => ({
  getKanbanVisitas: vi.fn(),
  getDetalhesEvento: vi.fn(),
  getCalendario: vi.fn(),
  agendarEvento: vi.fn(),
  moverVisita: vi.fn(),
  realizarVisita: vi.fn(),
  atualizarEvento: vi.fn(),
  removerEvento: vi.fn(),
}));

vi.mock('../../modules/agenda/application/AgendaService.js', () => ({
  AgendaService: vi.fn(function () { return mockAgendaService; }),
}));

vi.mock('../_db.js', () => ({ sql: vi.fn(), validateAuth: vi.fn() }));

const { validateAuth } = await import('../_db.js');

function mockRes() {
  let sc = 200, jd: any = null;
  const self: any = {
    status: vi.fn((c: number) => { sc = c; return self; }),
    json: vi.fn((d: any) => { jd = d; return self; }),
    end: vi.fn(() => self),
    _s: () => sc, _d: () => jd,
  };
  return self;
}

describe('handleAgenda', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(validateAuth).mockReturnValue({ authorized: true, user: { id: 'u1' }, error: null });
  });

  it('deve listar eventos do calendário (GET)', async () => {
    mockAgendaService.getCalendario.mockResolvedValue([{ id: '1', title: 'Visita' }]);
    const req = { method: 'GET', query: {}, body: {} };
    const res = mockRes();
    await handleAgenda(req, res);
    expect(res._s()).toBe(200);
  });

  it('deve listar kanban (GET ?action=kanban)', async () => {
    mockAgendaService.getKanbanVisitas.mockResolvedValue([{ id: '1', status: 'agendado' }]);
    const req = { method: 'GET', query: { action: 'kanban' }, body: {} };
    const res = mockRes();
    await handleAgenda(req, res);
    expect(res._s()).toBe(200);
  });

  it('deve buscar detalhes (GET com id)', async () => {
    mockAgendaService.getDetalhesEvento.mockResolvedValue({ id: '1', title: 'Visita' });
    const req = { method: 'GET', query: { id: '1' }, body: {} };
    const res = mockRes();
    await handleAgenda(req, res);
    expect(res._s()).toBe(200);
  });

  it('deve retornar 404 se evento não encontrado', async () => {
    mockAgendaService.getDetalhesEvento.mockResolvedValue(null);
    const req = { method: 'GET', query: { id: '999' }, body: {} };
    const res = mockRes();
    await handleAgenda(req, res);
    expect(res._s()).toBe(404);
  });

  it('deve criar evento (POST)', async () => {
    mockAgendaService.agendarEvento.mockResolvedValue({ id: '1', title: 'Novo' });
    const req = { method: 'POST', query: {}, body: { title: 'Novo Evento' } };
    const res = mockRes();
    await handleAgenda(req, res);
    expect(res._s()).toBe(201);
  });

  it('deve mover visita (PATCH ?action=mover)', async () => {
    mockAgendaService.moverVisita.mockResolvedValue({ id: '1', status_visita: 'realizado' });
    const req = { method: 'PATCH', query: { id: '1', action: 'mover' }, body: { status_visita: 'realizado' } };
    const res = mockRes();
    await handleAgenda(req, res);
    expect(res._s()).toBe(200);
  });

  it('deve realizar visita (PATCH ?action=realizar)', async () => {
    mockAgendaService.realizarVisita.mockResolvedValue({ id: '1', resultado_visita: 'contratado' });
    const req = { method: 'PATCH', query: { id: '1', action: 'realizar' }, body: { resultado_visita: 'contratado' } };
    const res = mockRes();
    await handleAgenda(req, res);
    expect(res._s()).toBe(200);
    expect(mockAgendaService.realizarVisita).toHaveBeenCalledWith('1', 'contratado', '00000000-0000-0000-0000-000000000000');
  });

  it('deve atualizar evento de forma genérica (PUT)', async () => {
    mockAgendaService.atualizarEvento.mockResolvedValue({ id: '1', title: 'Editado' });
    const req = { method: 'PUT', query: { id: '1' }, body: { title: 'Editado' } };
    const res = mockRes();
    await handleAgenda(req, res);
    expect(res._s()).toBe(200);
  });

  it('deve retornar 400 no PATCH sem id', async () => {
    const req = { method: 'PATCH', query: {}, body: {} };
    const res = mockRes();
    await handleAgenda(req, res);
    expect(res._s()).toBe(400);
  });

  it('deve remover evento (DELETE)', async () => {
    mockAgendaService.removerEvento.mockResolvedValue(true);
    const req = { method: 'DELETE', query: { id: '1' } };
    const res = mockRes();
    await handleAgenda(req, res);
    expect(res._s()).toBe(200);
    expect(mockAgendaService.removerEvento).toHaveBeenCalledWith('1', '00000000-0000-0000-0000-000000000000');
  });

  it('deve retornar 400 no DELETE sem id', async () => {
    const req = { method: 'DELETE', query: {} };
    const res = mockRes();
    await handleAgenda(req, res);
    expect(res._s()).toBe(400);
  });

  it('deve retornar 405 para método não suportado', async () => {
    const req = { method: 'OPTIONS', query: {} };
    const res = mockRes();
    await handleAgenda(req, res);
    expect(res._s()).toBe(405);
  });

  it('deve retornar 500 caso ocorra erro interno no serviço', async () => {
    mockAgendaService.getCalendario.mockRejectedValue(new Error('Fatal DB Error'));
    const req = { method: 'GET', query: {} };
    const res = mockRes();
    await handleAgenda(req, res);
    expect(res._s()).toBe(500);
  });

  it('deve retornar 401 sem autorização', async () => {
    vi.mocked(validateAuth).mockReturnValue({ authorized: false, user: null, error: 'No auth' });
    const req = { method: 'GET', query: {}, body: {} };
    const res = mockRes();
    await handleAgenda(req, res);
    expect(res._s()).toBe(401);
  });
});
