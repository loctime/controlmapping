import { AuditRecord, Classifier, OperationDistribution } from './types';

export function computeDistributionForOperation(
  records: AuditRecord[],
  classifier: Classifier
): OperationDistribution {
  throw new Error('Not implemented');
}

export function computeAllDistributions(
  records: AuditRecord[],
  classifier: Classifier
): OperationDistribution[] {
  throw new Error('Not implemented');
}
