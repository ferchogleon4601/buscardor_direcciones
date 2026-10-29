import React, { useState, useMemo } from 'react';
import { Table, Search, Download, Copy, Check, ExternalLink, Trash2, Filter, AlertCircle, FileSpreadsheet, FileCode, CheckCircle2, ChevronRight } from 'lucide-react';
import { CompanyRecord, formatSingleResultAsText, formatBatchResultsAsText } from '../types';

interface ResultsTableProps {
  records: CompanyRecord[];
  onDeleteRecord: (id: string) => void;
  onClearAll: () => void;
}

export const ResultsTable: React.FC<ResultsTableProps> = ({
  records,
  onDeleteRecord,
  onClearAll,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'verified_only' | 'has_unavailable'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<CompanyRecord | null>(null);

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      // Text match
      const query = searchTerm.toLowerCase();
      const matchesSearch =
        r.razonSocial.toLowerCase().includes(query) ||
        r.nit.toLowerCase().includes(query) ||
        r.direccionEncontrada.toLowerCase().includes(query) ||
        r.telefonoEncontrado.toLowerCase().includes(query) ||
        r.ciudad.toLowerCase().includes(query);

      if (!matchesSearch) return false;

      // Status filter
      if (filterMode === 'verified_only') {
        return (
          r.direccionEncontrada !== 'NO DISPONIBLE' &&
          r.telefonoEncontrado !== 'NO DISPONIBLE'
        );
      }
      if (filterMode === 'has_unavailable') {
        return (
          r.direccionEncontrada === 'NO DISPONIBLE' ||
          r.telefonoEncontrado === 'NO DISPONIBLE' ||
          r.nit === 'NO DISPONIBLE'
        );
      }

      return true;
    });
  }, [records, searchTerm, filterMode]);

  const handleCopySingle = (record: CompanyRecord) => {
    const text = formatSingleResultAsText(record);
    navigator.clipboard.writeText(text);
    setCopiedId(record.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCopyAll = () => {
    if (records.length === 0) return;
    const text = formatBatchResultsAsText(records);
    navigator.clipboard.writeText(text);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2200);
  };

  const handleDownloadCSV = () => {
    if (records.length === 0) return;

    const headers = [
      'NIT',
      'Razón Social',
      'Dirección Encontrada',
      'Teléfono Encontrado',
      'URL de Referencia',
      'Ciudad',
      'Nivel de Confianza',
      'Fecha Consulta',
    ];

    const escapeCsv = (val: string) => {
      if (!val) return '""';
      const clean = val.replace(/"/g, '""');
      return `"${clean}"`;
    };

    const rows = records.map((r) => [
      escapeCsv(r.nit),
      escapeCsv(r.razonSocial),
      escapeCsv(r.direccionEncontrada),
      escapeCsv(r.telefonoEncontrado),
      escapeCsv(r.urlReferencia),
      escapeCsv(r.ciudad),
      escapeCsv(r.nivelConfianza),
      escapeCsv(new Date(r.queryTimestamp).toLocaleString('es-CO')),
    ]);

    // Use UTF-8 BOM so Excel opens accents and special characters without encoding glitches
    const csvContent =
      '\uFEFF' +
      [headers.join(';'), ...rows.map((row) => row.join(';'))].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `investigacion_empresas_colombia_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadJSON = () => {
    if (records.length === 0) return;
    const jsonStr = JSON.stringify(records, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `investigacion_empresas_colombia_${new Date().toISOString().slice(0, 10)}.json`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      {/* Top Action & Stats Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Table className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              Consolidado de Empresas Investigadas ({records.length})
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Registros procesados bajo protocolo de Cero Alucinaciones con trazabilidad de enlaces web.
            </p>
          </div>

          {records.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleCopyAll}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg transition"
                title="Copiar todas las fichas en el formato estructurado"
              >
                {copiedAll ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>Copiar Todo (Texto)</span>
              </button>

              <button
                onClick={handleDownloadCSV}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition shadow-xs"
                title="Descargar tabla en CSV compatible con Excel"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Exportar CSV</span>
              </button>

              <button
                onClick={handleDownloadJSON}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-900 text-white rounded-lg transition"
                title="Descargar datos en JSON"
              >
                <FileCode className="w-3.5 h-3.5" />
                <span>JSON</span>
              </button>

              <button
                onClick={onClearAll}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition"
                title="Limpiar todos los registros"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Limpiar</span>
              </button>
            </div>
          )}
        </div>

        {/* Filter and Search Bar */}
        {records.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Filtrar por Razón Social, NIT, Dirección, Teléfono o Ciudad..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-hidden transition text-slate-900 dark:text-slate-100"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setFilterMode('all')}
                className={`text-xs px-2.5 py-1.5 rounded-lg font-medium transition ${
                  filterMode === 'all'
                    ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                Todas ({records.length})
              </button>
              <button
                onClick={() => setFilterMode('verified_only')}
                className={`text-xs px-2.5 py-1.5 rounded-lg font-medium transition ${
                  filterMode === 'verified_only'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                Completas
              </button>
              <button
                onClick={() => setFilterMode('has_unavailable')}
                className={`text-xs px-2.5 py-1.5 rounded-lg font-medium transition ${
                  filterMode === 'has_unavailable'
                    ? 'bg-amber-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                Con "NO DISPONIBLE"
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Table Content */}
      {records.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center shadow-xs">
          <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-3">
            <Search className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
            Aún no hay empresas investigadas
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
            Utiliza la pestaña de <strong>Búsqueda Individual</strong> o <strong>Lote (Batch)</strong> para rastrear direcciones físicas de notificación y teléfonos actuales en Colombia.
          </p>
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center">
          <p className="text-xs text-slate-500">
            No se encontraron empresas que coincidan con el filtro actual.
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[11px] font-bold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">NIT</th>
                  <th className="py-3.5 px-4">Razón Social</th>
                  <th className="py-3.5 px-4">Dirección Encontrada</th>
                  <th className="py-3.5 px-4">Teléfono Encontrado</th>
                  <th className="py-3.5 px-4">URL de Referencia</th>
                  <th className="py-3.5 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredRecords.map((r) => {
                  const isDirUnavailable = r.direccionEncontrada === 'NO DISPONIBLE';
                  const isTelUnavailable = r.telefonoEncontrado === 'NO DISPONIBLE';
                  const isNitUnavailable = r.nit === 'NO DISPONIBLE';

                  return (
                    <tr
                      key={r.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      {/* NIT */}
                      <td className="py-3.5 px-4 font-mono font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap">
                        {isNitUnavailable ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-900">
                            NO DISPONIBLE
                          </span>
                        ) : (
                          r.nit
                        )}
                      </td>

                      {/* Razón Social */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 dark:text-slate-100">
                          {r.razonSocial}
                        </div>
                        {r.ciudad && r.ciudad !== 'NO DISPONIBLE' && (
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            {r.ciudad}
                          </div>
                        )}
                      </td>

                      {/* Dirección Encontrada */}
                      <td className="py-3.5 px-4 max-w-xs break-words">
                        {isDirUnavailable ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-900">
                            NO DISPONIBLE
                          </span>
                        ) : (
                          <span className="font-medium text-slate-800 dark:text-slate-200">
                            {r.direccionEncontrada}
                          </span>
                        )}
                      </td>

                      {/* Teléfono Encontrado */}
                      <td className="py-3.5 px-4 font-mono whitespace-nowrap">
                        {isTelUnavailable ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-900">
                            NO DISPONIBLE
                          </span>
                        ) : (
                          <span className="font-medium text-slate-800 dark:text-slate-200">
                            {r.telefonoEncontrado}
                          </span>
                        )}
                      </td>

                      {/* URL de Referencia */}
                      <td className="py-3.5 px-4 max-w-xs truncate font-mono">
                        {r.urlReferencia && r.urlReferencia !== 'N/A' && r.urlReferencia !== 'NO DISPONIBLE' ? (
                          <a
                            href={r.urlReferencia}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                            title={r.urlReferencia}
                          >
                            <span className="truncate max-w-[180px]">{r.urlReferencia}</span>
                            <ExternalLink className="w-3 h-3 shrink-0" />
                          </a>
                        ) : (
                          <span className="text-slate-400">N/A</span>
                        )}
                      </td>

                      {/* Acciones */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => handleCopySingle(r)}
                            className="p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition"
                            title="Copiar en formato oficial solicitado"
                          >
                            {copiedId === r.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>

                          <button
                            onClick={() => setSelectedRecord(r)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-md transition"
                            title="Ver ficha completa"
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => onDeleteRecord(r.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 rounded-md transition"
                            title="Eliminar registro"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Record Inspection Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                Ficha de Notificación Corporativa
              </h3>
              <button
                onClick={() => setSelectedRecord(null)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-xs px-2 py-1 rounded-md"
              >
                Cerrar
              </button>
            </div>

            <div className="bg-slate-900 text-slate-100 p-3.5 rounded-xl font-mono text-xs leading-relaxed">
              <pre className="whitespace-pre-wrap">{formatSingleResultAsText(selectedRecord)}</pre>
            </div>

            {selectedRecord.webSources && selectedRecord.webSources.length > 0 && (
              <div className="space-y-1.5 text-xs">
                <div className="font-bold text-slate-700 dark:text-slate-300">
                  Fuentes Web de Rastreo ({selectedRecord.webSources.length}):
                </div>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {selectedRecord.webSources.map((s, idx) => (
                    <a
                      key={idx}
                      href={s.uri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-blue-600 hover:underline truncate"
                    >
                      • {s.title || s.uri}
                    </a>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  handleCopySingle(selectedRecord);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copiar Ficha</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
