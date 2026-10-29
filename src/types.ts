export interface WebSource {
  uri: string;
  title: string;
}

export interface CompanyRecord {
  id: string;
  nit: string;
  razonSocial: string;
  direccionEncontrada: string;
  telefonoEncontrado: string;
  urlReferencia: string;
  ciudad: string;
  nivelConfianza: 'ALTA' | 'MEDIA' | 'BAJA' | 'NO DISPONIBLE';
  fuenteNombre: string;
  resumenVerificacion?: string;
  webSources?: WebSource[];
  queryTimestamp: string;
  status: 'pending' | 'searching' | 'completed' | 'error';
  errorMessage?: string;
  searchedName: string;
}

export interface BatchItemInput {
  name: string;
  knownNit?: string;
  cityHint?: string;
}

export function formatSingleResultAsText(record: Pick<CompanyRecord, 'nit' | 'razonSocial' | 'direccionEncontrada' | 'telefonoEncontrado' | 'urlReferencia'>): string {
  return [
    `- NIT: ${record.nit || 'NO DISPONIBLE'}`,
    `- Razón Social: ${record.razonSocial || 'NO DISPONIBLE'}`,
    `- Dirección Encontrada: ${record.direccionEncontrada || 'NO DISPONIBLE'}`,
    `- Teléfono Encontrado: ${record.telefonoEncontrado || 'NO DISPONIBLE'}`,
    `- URL de Referencia: ${record.urlReferencia || 'N/A'}`
  ].join('\n');
}

export function formatBatchResultsAsText(records: CompanyRecord[]): string {
  return records
    .filter(r => r.status === 'completed')
    .map(r => formatSingleResultAsText(r))
    .join('\n\n---\n\n');
}
