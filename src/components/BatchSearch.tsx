import React, { useState, useRef } from 'react';
import { Layers, Play, Pause, Square, Upload, FileText, CheckCircle2, AlertCircle, RefreshCw, Copy, Check, Download, Trash2 } from 'lucide-react';
import { CompanyRecord, formatBatchResultsAsText, formatSingleResultAsText } from '../types';

interface BatchSearchProps {
  onResultsAdded: (records: CompanyRecord[]) => void;
  onClearResults?: () => void;
}

interface BatchQueueItem {
  id: string;
  name: string;
  knownNit?: string;
  cityHint?: string;
  status: 'pending' | 'searching' | 'completed' | 'error';
  record?: CompanyRecord;
  error?: string;
}

const SAMPLE_LISTS = [
  {
    title: 'Top Empresas Colombia',
    text: `Ecopetrol S.A.
Bancolombia S.A.
Grupo Nutresa S.A.
Almacenes Éxito S.A.
Organización Terpel S.A.`,
  },
  {
    title: 'Con NIT y Ciudad',
    text: `Ecopetrol S.A., 860.003.563-1, Bogotá
Bancolombia S.A., 890.903.938-8, Medellín
Carvajal S.A., 890.300.035-7, Cali
Crepes & Waffles S.A., 860.518.730-8, Bogotá`,
  },
  {
    title: 'Retail & Consumo',
    text: `Koba Colombia S.A.S. (D1)
Jerónimo Martins Colombia (Tiendas Ara)
Postobón S.A.
Bavaria & Cía S.C.A.`,
  },
];

export const BatchSearch: React.FC<BatchSearchProps> = ({ onResultsAdded }) => {
  const [inputText, setInputText] = useState(SAMPLE_LISTS[0].text);
  const [queue, setQueue] = useState<BatchQueueItem[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reference to cancel or pause
  const shouldStopRef = useRef(false);
  const isPausedRef = useRef(false);

  const parseInputLines = (text: string): BatchQueueItem[] => {
    return text
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith('#'))
      .map((line) => {
        // Support CSV style: "Empresa, NIT, Ciudad" or just "Empresa"
        const parts = line.split(',').map((p) => p.trim());
        const name = parts[0];
        const knownNit = parts[1] || undefined;
        const cityHint = parts[2] || undefined;

        return {
          id: crypto.randomUUID(),
          name,
          knownNit,
          cityHint,
          status: 'pending',
        };
      });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setInputText(content);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const startBatch = async () => {
    const items = parseInputLines(inputText);
    if (items.length === 0) return;

    setQueue(items);
    setIsRunning(true);
    setIsPaused(false);
    shouldStopRef.current = false;
    isPausedRef.current = false;

    const completedRecords: CompanyRecord[] = [];

    for (let i = 0; i < items.length; i++) {
      if (shouldStopRef.current) break;

      // Handle pause
      while (isPausedRef.current) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        if (shouldStopRef.current) break;
      }
      if (shouldStopRef.current) break;

      const currentItem = items[i];

      // Mark as searching
      setQueue((prev) =>
        prev.map((item, idx) => (idx === i ? { ...item, status: 'searching' } : item))
      );

      try {
        const response = await fetch('/api/investigate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            companyName: currentItem.name,
            knownNit: currentItem.knownNit,
            cityHint: currentItem.cityHint,
            strictMode: true,
          }),
        });

        const json = await response.json();

        if (!response.ok || !json.success) {
          throw new Error(json.error || 'Error al investigar');
        }

        const record: CompanyRecord = {
          id: currentItem.id,
          searchedName: currentItem.name,
          nit: json.data.nit,
          razonSocial: json.data.razonSocial,
          direccionEncontrada: json.data.direccionEncontrada,
          telefonoEncontrado: json.data.telefonoEncontrado,
          urlReferencia: json.data.urlReferencia,
          ciudad: json.data.ciudad,
          nivelConfianza: json.data.nivelConfianza,
          fuenteNombre: json.data.fuenteNombre,
          resumenVerificacion: json.data.resumenVerificacion,
          webSources: json.data.webSources,
          queryTimestamp: json.data.queryTimestamp || new Date().toISOString(),
          status: 'completed',
        };

        completedRecords.push(record);

        setQueue((prev) =>
          prev.map((item, idx) =>
            idx === i ? { ...item, status: 'completed', record } : item
          )
        );

        // Notify parent incrementally
        onResultsAdded([record]);
      } catch (err: any) {
        setQueue((prev) =>
          prev.map((item, idx) =>
            idx === i
              ? {
                  ...item,
                  status: 'error',
                  error: err.message || 'Error en búsqueda',
                }
              : item
          )
        );
      }

      // Small throttle pause between searches to avoid overloading
      if (i < items.length - 1 && !shouldStopRef.current) {
        await new Promise((resolve) => setTimeout(resolve, 800));
      }
    }

    setIsRunning(false);
    setIsPaused(false);
  };

  const togglePause = () => {
    const nextPaused = !isPaused;
    setIsPaused(nextPaused);
    isPausedRef.current = nextPaused;
  };

  const stopBatch = () => {
    shouldStopRef.current = true;
    setIsRunning(false);
    setIsPaused(false);
  };

  const completedCount = queue.filter((q) => q.status === 'completed').length;
  const errorCount = queue.filter((q) => q.status === 'error').length;
  const progressPercent = queue.length > 0 ? Math.round(((completedCount + errorCount) / queue.length) * 100) : 0;

  const copyCompletedExactFormat = () => {
    const records = queue
      .map((q) => q.record)
      .filter((r): r is CompanyRecord => !!r);

    if (records.length === 0) return;

    const formatted = formatBatchResultsAsText(records);
    navigator.clipboard.writeText(formatted);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2200);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              Investigación Corporativa en Lote (Batch)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Procesa múltiples empresas colombianas simultáneamente aplicando la política de Cero Alucinaciones.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".txt,.csv"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center gap-1.5 transition"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Cargar Archivo (.csv / .txt)</span>
            </button>
          </div>
        </div>

        {/* Preset Lists */}
        <div className="mb-4">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">
            Listas de ejemplo preconfiguradas:
          </div>
          <div className="flex flex-wrap gap-2">
            {SAMPLE_LISTS.map((sample) => (
              <button
                key={sample.title}
                onClick={() => setInputText(sample.text)}
                disabled={isRunning}
                className="text-xs bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-3 py-1 rounded-md border border-slate-200 dark:border-slate-700 transition"
              >
                {sample.title}
              </button>
            ))}
          </div>
        </div>

        {/* Text Area */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs text-slate-500 dark:text-slate-400 font-medium">
            <span>Ingresa una empresa por línea (o formato: Nombre, NIT, Ciudad):</span>
            <span>{inputText.split('\n').filter((l) => l.trim().length > 0).length} empresas detectadas</span>
          </div>

          <textarea
            rows={5}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={isRunning}
            placeholder="Ejemplo:&#10;Ecopetrol S.A.&#10;Bancolombia S.A., 890.903.938-8, Medellín&#10;Almacenes Éxito S.A."
            className="w-full p-3 font-mono text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-hidden transition text-slate-900 dark:text-slate-100"
          />
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3">
          <div className="text-xs text-slate-500">
            Cada consulta ejecuta Google Search Grounding individual con validación de homónimos.
          </div>

          <div className="flex items-center gap-2">
            {isRunning && (
              <>
                <button
                  onClick={togglePause}
                  className="px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <Pause className="w-3.5 h-3.5" />
                  <span>{isPaused ? 'Reanudar' : 'Pausar'}</span>
                </button>
                <button
                  onClick={stopBatch}
                  className="px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <Square className="w-3.5 h-3.5" />
                  <span>Detener</span>
                </button>
              </>
            )}

            <button
              onClick={startBatch}
              disabled={isRunning || !inputText.trim()}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 dark:disabled:bg-slate-700 text-white rounded-xl font-semibold text-xs transition shadow-sm flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed"
            >
              {isRunning ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Procesando Lote ({completedCount + errorCount}/{queue.length})</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  <span>Iniciar Investigación en Lote</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Progress & Queue Live Card */}
      {queue.length > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                  Progreso del Lote
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
                  {completedCount}/{queue.length} completadas ({progressPercent}%)
                </span>
              </div>
            </div>

            {completedCount > 0 && (
              <button
                onClick={copyCompletedExactFormat}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition"
              >
                {copiedAll ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>¡Copiados {completedCount} registros!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar Todos en Formato Solicitado</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Progress bar */}
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className="bg-indigo-600 h-full transition-all duration-300 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Queue items list */}
          <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-96 overflow-y-auto">
            {queue.map((item, idx) => (
              <div key={item.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-slate-400 font-mono w-5 shrink-0">{idx + 1}.</span>
                  <div className="truncate">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{item.name}</span>
                    {item.cityHint && (
                      <span className="ml-2 text-slate-500">({item.cityHint})</span>
                    )}
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  {item.status === 'pending' && (
                    <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 text-xs">
                      En cola
                    </span>
                  )}
                  {item.status === 'searching' && (
                    <span className="px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-xs flex items-center gap-1 font-medium">
                      <RefreshCw className="w-3 h-3 animate-spin" /> Rastreando Google...
                    </span>
                  )}
                  {item.status === 'completed' && item.record && (
                    <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-1 font-medium">
                      <CheckCircle2 className="w-3 h-3" />
                      {item.record.direccionEncontrada === 'NO DISPONIBLE'
                        ? 'Completado (Dir: NO DISPONIBLE)'
                        : 'Verificado'}
                    </span>
                  )}
                  {item.status === 'error' && (
                    <span className="px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> Error
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
