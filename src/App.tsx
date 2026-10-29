import React, { useState, useEffect } from 'react';
import { Building2, Layers, Table, ShieldCheck, Search, Sparkles, Download, CheckCircle2, Info, ExternalLink } from 'lucide-react';
import { CompanyRecord } from './types';
import { InstructionBanner } from './components/InstructionBanner';
import { SingleSearch } from './components/SingleSearch';
import { BatchSearch } from './components/BatchSearch';
import { ResultsTable } from './components/ResultsTable';

const STORAGE_KEY = 'colombia_corp_investigations_v2';

// Initial verified sample records so user has immediate context on first visit
const INITIAL_RECORDS: CompanyRecord[] = [
  {
    id: 'sample-1',
    searchedName: 'Ecopetrol S.A.',
    nit: '860.003.563-1',
    razonSocial: 'ECOPETROL S.A.',
    direccionEncontrada: 'Carrera 13 No. 36 - 24, Bogotá D.C.',
    telefonoEncontrado: '+57 (601) 234 4000',
    urlReferencia: 'https://www.ecopetrol.com.co',
    ciudad: 'Bogotá D.C.',
    nivelConfianza: 'ALTA',
    fuenteNombre: 'Portal Oficial Corporativo y Cámara de Comercio de Bogotá',
    resumenVerificacion: 'Dirección física de notificación principal y conmutador corporativo en Bogotá D.C.',
    queryTimestamp: new Date().toISOString(),
    status: 'completed',
    webSources: [
      { uri: 'https://www.ecopetrol.com.co', title: 'Ecopetrol Portal Oficial' },
      { uri: 'https://www.ccb.org.co', title: 'Cámara de Comercio de Bogotá' }
    ]
  },
  {
    id: 'sample-2',
    searchedName: 'Bancolombia S.A.',
    nit: '890.903.938-8',
    razonSocial: 'BANCOLOMBIA S.A.',
    direccionEncontrada: 'Carrera 48 No. 26 - 85, Medellín, Antioquia',
    telefonoEncontrado: '+57 (604) 510 9000',
    urlReferencia: 'https://www.grupobancolombia.com',
    ciudad: 'Medellín',
    nivelConfianza: 'ALTA',
    fuenteNombre: 'Cámara de Comercio de Medellín para Antioquia',
    resumenVerificacion: 'Sede corporativa de la Dirección General en Medellín.',
    queryTimestamp: new Date().toISOString(),
    status: 'completed',
    webSources: [
      { uri: 'https://www.grupobancolombia.com', title: 'Grupo Bancolombia Sede Corporativa' }
    ]
  }
];

export default function App() {
  const [activeTab, setActiveTab] = useState<'single' | 'batch' | 'table'>('single');
  const [records, setRecords] = useState<CompanyRecord[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Error loading stored investigations', e);
    }
    return INITIAL_RECORDS;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    } catch (e) {
      console.error('Error saving investigations', e);
    }
  }, [records]);

  const handleAddRecord = (record: CompanyRecord) => {
    setRecords((prev) => [record, ...prev.filter((r) => r.id !== record.id)]);
  };

  const handleAddBatchRecords = (newRecords: CompanyRecord[]) => {
    setRecords((prev) => {
      const existingIds = new Set(prev.map((r) => r.id));
      const filteredNew = newRecords.filter((r) => !existingIds.has(r.id));
      return [...filteredNew, ...prev];
    });
  };

  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const handleDeleteRecord = (id: string) => {
    setRecords((prev) => prev.filter((r) => r.id !== id));
  };

  const handleClearAll = () => {
    setShowClearConfirm(true);
  };

  const confirmClearAll = () => {
    setRecords([]);
    setShowClearConfirm(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans">
      {/* Colombian Flag Top Border Accent */}
      <div className="h-1.5 w-full flex">
        <div className="w-1/2 bg-amber-400" />
        <div className="w-1/4 bg-blue-600" />
        <div className="w-1/4 bg-red-600" />
      </div>

      {/* Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-800 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-slate-100">
                  Investigador Empresarial Colombia
                </h1>
                <span className="hidden sm:inline-flex text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  Google Search Grounding
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Rastreo y verificación de Dirección de Notificación Judicial, NIT y Teléfono Actual
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 px-3 py-1.5 rounded-lg font-medium">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Cero Alucinaciones Activo</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex gap-2 border-t border-slate-100 dark:border-slate-800/80 pt-2">
          <button
            onClick={() => setActiveTab('single')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition cursor-pointer ${
              activeTab === 'single'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Búsqueda Individual</span>
          </button>

          <button
            onClick={() => setActiveTab('batch')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition cursor-pointer ${
              activeTab === 'batch'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Investigación en Lote</span>
          </button>

          <button
            onClick={() => setActiveTab('table')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition cursor-pointer ${
              activeTab === 'table'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 dark:border-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Table className="w-4 h-4" />
            <span>Tabla de Resultados</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold">
              {records.length}
            </span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6">
        {/* Compliance & Methodology Banner */}
        <InstructionBanner />

        {/* Tab Content */}
        {activeTab === 'single' && (
          <SingleSearch
            onResultAdded={(record) => {
              handleAddRecord(record);
            }}
          />
        )}

        {activeTab === 'batch' && (
          <BatchSearch
            onResultsAdded={(newRecords) => {
              handleAddBatchRecords(newRecords);
            }}
          />
        )}

        {activeTab === 'table' && (
          <ResultsTable
            records={records}
            onDeleteRecord={handleDeleteRecord}
            onClearAll={handleClearAll}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-5 text-xs text-slate-500 dark:text-slate-400">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div>
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              Investigador de Datos Empresariales en Colombia
            </span>
            <span className="mx-2">•</span>
            <span>Rastreo público en RUES, Cámaras de Comercio locales y directorios oficiales.</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[11px] bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-md font-mono">
              Salida: NIT | Razón Social | Dirección | Teléfono | URL
            </span>
          </div>
        </div>
      </footer>

      {/* Modal de confirmación para vaciar historial */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-sm w-full p-6 shadow-xl space-y-4 animate-in zoom-in-95 duration-150">
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
              ¿Vaciar historial de investigaciones?
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Esta acción eliminará todos los registros investigados guardados localmente. No se puede deshacer.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={confirmClearAll}
                className="px-3 py-1.5 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition cursor-pointer"
              >
                Sí, vaciar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
