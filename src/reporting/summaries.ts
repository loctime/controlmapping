import {
  AuditRecord,
  MonthSummary,
  OperationAnnualSummary,
  AnnualReport,
} from './types';

export function buildMonthSummary(
  records: AuditRecord[],
  mes: number,
  anio: number
): MonthSummary {
  throw new Error('Not implemented');
}

export function buildOperationAnnualSummary(
  operacion: string,
  anio: number,
  records: AuditRecord[]
): OperationAnnualSummary {
  throw new Error('Not implemented');
}

export function buildAnnualReport(anio: number, records: AuditRecord[]): AnnualReport {
  throw new Error('Not implemented');
}

export function computeGlobalMonthlyAverages(
  records: AuditRecord[],
  anio: number
): MonthSummary[] {
  throw new Error('Not implemented');
}

export function computeTopOperationsByAverage(
  annualReport: AnnualReport,
  topN: number
): OperationAnnualSummary[] {
  throw new Error('Not implemented');
}
