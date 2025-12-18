import { AnnualReport, ExportOptions } from './types';

export async function exportAnnualReportToPdf(
  targetElement: HTMLElement,
  options?: ExportOptions
): Promise<Blob> {
  throw new Error('Not implemented');
}

export function preparePrintableNode(annualReport: AnnualReport): HTMLElement {
  throw new Error('Not implemented');
}

export async function renderHtmlFromReport(annualReport: AnnualReport): Promise<string> {
  throw new Error('Not implemented');
}

export async function htmlToPdf(html: string, options?: ExportOptions): Promise<Uint8Array> {
  throw new Error('Not implemented');
}
