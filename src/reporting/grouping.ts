import { AuditRecord } from './types';

/**
 * Group records by operacion, then by mes.
 * Returns Map<operacion, Map<mes, AuditRecord[]>>
 */
export function groupByOperacionAndMonth(
  records: AuditRecord[]
): Map<string, Map<number, AuditRecord[]>> {
  throw new Error('Not implemented');
}
