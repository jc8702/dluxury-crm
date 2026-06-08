import { describe, it, expect } from 'vitest';
import { buildAuditWhereClause, clampPagination } from '../auditLogService.js';

const TID = '00000000-0000-0000-0000-000000000000';

describe('buildAuditWhereClause', () => {
  it('apenas tenantId obrigatório → 1 condição', () => {
    const r = buildAuditWhereClause({ tenantId: TID });
    expect(r.where).toBe('tenant_id = $1::uuid');
    expect(r.values).toEqual([TID]);
  });

  it('tenantId + tableName → 2 condições na ordem correta', () => {
    const r = buildAuditWhereClause({ tenantId: TID, tableName: 'clients' });
    expect(r.where).toBe('tenant_id = $1::uuid AND table_name = $2');
    expect(r.values).toEqual([TID, 'clients']);
  });

  it('tenantId + recordId → 2 condições', () => {
    const rid = '11111111-1111-1111-1111-111111111111';
    const r = buildAuditWhereClause({ tenantId: TID, recordId: rid });
    expect(r.where).toContain('record_id = $2::uuid');
    expect(r.values).toEqual([TID, rid]);
  });

  it('tenantId + action válida → 2 condições', () => {
    const r = buildAuditWhereClause({ tenantId: TID, action: 'CREATE' });
    expect(r.where).toContain('action = $2');
    expect(r.values).toEqual([TID, 'CREATE']);
  });

  it('action inválida → throw', () => {
    expect(() => buildAuditWhereClause({ tenantId: TID, action: 'INVALID' })).toThrow(
      'Unknown action',
    );
  });

  it('tenantId + startDate + endDate → 3 condições', () => {
    const r = buildAuditWhereClause({
      tenantId: TID,
      startDate: '2026-01-01T00:00:00Z',
      endDate: '2026-06-01T00:00:00Z',
    });
    expect(r.where).toContain('created_at >= $2::timestamptz');
    expect(r.where).toContain('created_at <= $3::timestamptz');
    expect(r.values).toEqual([TID, '2026-01-01T00:00:00Z', '2026-06-01T00:00:00Z']);
  });

  it('todos os filtros juntos → 6 condições na ordem fixa', () => {
    const rid = '22222222-2222-2222-2222-222222222222';
    const r = buildAuditWhereClause({
      tenantId: TID,
      action: 'DELETE',
      tableName: 'projects',
      recordId: rid,
      startDate: '2026-01-01T00:00:00Z',
      endDate: '2026-06-01T00:00:00Z',
    });
    expect(r.where).toBe(
      'tenant_id = $1::uuid AND action = $2 AND table_name = $3 AND record_id = $4::uuid AND created_at >= $5::timestamptz AND created_at <= $6::timestamptz',
    );
    expect(r.values).toEqual([
      TID,
      'DELETE',
      'projects',
      rid,
      '2026-01-01T00:00:00Z',
      '2026-06-01T00:00:00Z',
    ]);
  });

  it('tenantId inválido → throw', () => {
    expect(() => buildAuditWhereClause({ tenantId: 'not-a-uuid' })).toThrow(
      'Invalid or missing tenantId',
    );
  });

  it('tenantId vazio → throw', () => {
    expect(() => buildAuditWhereClause({ tenantId: '' })).toThrow('Invalid or missing tenantId');
  });

  it('tenantId ausente → throw', () => {
    expect(() => buildAuditWhereClause({} as any)).toThrow('Invalid or missing tenantId');
  });

  it('recordId inválido → throw', () => {
    expect(() => buildAuditWhereClause({ tenantId: TID, recordId: 'bad' })).toThrow(
      'Invalid recordId',
    );
  });

  it('startDate inválido → throw', () => {
    expect(() => buildAuditWhereClause({ tenantId: TID, startDate: 'not-a-date' })).toThrow(
      'Invalid startDate',
    );
  });

  it('endDate inválido → throw', () => {
    expect(() => buildAuditWhereClause({ tenantId: TID, endDate: '2026/01/01' })).toThrow(
      'Invalid endDate',
    );
  });

  it('action vazia → ignorada (não adiciona condição)', () => {
    const r = buildAuditWhereClause({ tenantId: TID, action: '' });
    expect(r.where).toBe('tenant_id = $1::uuid');
    expect(r.values).toEqual([TID]);
  });
});

describe('clampPagination', () => {
  it('limit undefined → 50', () => {
    expect(clampPagination(undefined, 0)).toEqual({ limit: 50, offset: 0 });
  });

  it('limit 0 → 1 (mínimo)', () => {
    expect(clampPagination(0, 0)).toEqual({ limit: 1, offset: 0 });
  });

  it('limit 500 → 200 (máximo)', () => {
    expect(clampPagination(500, 0)).toEqual({ limit: 200, offset: 0 });
  });

  it('offset negativo → 0', () => {
    expect(clampPagination(10, -5)).toEqual({ limit: 10, offset: 0 });
  });

  it('offset undefined → 0', () => {
    expect(clampPagination(10, undefined)).toEqual({ limit: 10, offset: 0 });
  });

  it('valores normais passam intactos', () => {
    expect(clampPagination(25, 100)).toEqual({ limit: 25, offset: 100 });
  });
});
