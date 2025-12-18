export type AuditRecord = {
  operacion: string;
  mes: number; // 1..12
  anio: number;
  cumplimiento: number | null; // 0..100 or null
};

export interface MonthSummary {
  mes: number;
  anio: number;
  count: number;
  values: number[]; // only non-null values
  missingCount: number; // records with cumplimiento === null
  average: number | null; // null if values.length === 0
}

export interface OperationAnnualSummary {
  operacion: string;
  anio: number;
  monthly: MonthSummary[]; // length 12, indexable by mes-1
  annualAverage: number | null; // average across months with values
  totalCount: number;
}

export interface DistributionBucket {
  label: string; // label provided by mapping classifier
  count: number;
}

export interface OperationDistribution {
  operacion: string;
  anio: number;
  byMonth: Record<number, DistributionBucket[]>; // key = mes (1..12)
  overall: DistributionBucket[];
}

export interface AnnualReport {
  anio: number;
  operations: OperationAnnualSummary[];
  distributions: OperationDistribution[];
}

export type Classifier = (record: AuditRecord) => string;

export interface ExportOptions {
  pageSize?: string;
  landscape?: boolean;
  filename?: string;
}
