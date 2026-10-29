import React, { useState } from 'react';
import { Search, Building2, MapPin, Phone, Hash, Link as LinkIcon, Copy, Check, ExternalLink, AlertTriangle, Sparkles, RefreshCw, Globe2 } from 'lucide-react';
import { CompanyRecord, formatSingleResultAsText } from '../types';

interface SingleSearchProps {
  onResultAdded: (record: CompanyRecord) => void;
}

const PRESET_COMPANIES = [
  { name: 'Ecopetrol S.A.', city: 'Bogotá', nit: '860.003.563-1' },
  { name: 'Bancolombia S.A.', city: 'Medellín', nit: '890.903.938-8' },
  { name: 'Almacenes Éxito S.A.', city: 'Envigado', nit: '890.900.608-9' },
  { name: 'Grupo Nutresa S.A.', city: 'Medellín', nit: '890.900.050-1' },
  { name: 'Rappi S.A.S.', city: 'Bogotá', nit: '900.843.801-7' },
  { name: 'Crepes & Waffles S.A.', city: 'Bogotá', nit: '860.518.730-8' },
  { name: 'Carvajal S.A.', city: 'Cali', nit: '890.300.035-7' },
];

export const SingleSearch: React.FC<SingleSearchProps> = ({ onResultAdded }) => {
  const [companyName, setCompanyName] = useState('');
  const [knownNit, setKnownNit] = useState('');
  const [cityHint, setCityHint] = useState('');
  const [strictMode, setStrictMode] = useState(true);
  const [loading, setLoading] = useState(false);
  const [currentResult, setCurrentResult] = useState<CompanyRecord | null>(null);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [searchStep, setSearchStep] = useState<string>('');

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!companyName.trim()) {
      setErrorMsg('Ingresa el nombre de la empresa para iniciar la investigación.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setCurrentResult(null);
    setSearchStep('Iniciando rastreo en Google Search...');

    try {
      const stepTimer1 = setTimeout(() => {
        setSearchStep('Consultando directorios de Cámaras de Comercio, RUES y fuentes oficiales...');
      }, 1200);

      const stepTimer2 = setTimeout(() => {
        setSearchStep('Verificando coincidencia de NIT, domicilio y descartando homónimos...');
      }, 2500);

      const response = await fetch('/api/investigate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: companyName.trim(),
          knownNit: knownNit.trim() || undefined,
          cityHint: cityHint.trim() || undefined,
          strictMode,
        }),
      });

      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);

      const json = await response.json();

      if (!response.ok || !json.success) {
        throw new Error(json.error || 'Error al investigar la empresa en Google.');
      }

      const record: CompanyRecord = {
        id: crypto.randomUUID(),
        searchedName: companyName.trim(),
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

      setCurrentResult(record);
      onResultAdded(record);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Ocurrió un error inesperado durante la investigación.');
    } finally {
      setLoading(false);
      setSearchStep('');
    }
  };

  const copyExactFormat = () => {
    if (!currentResult) return;
    const text = formatSingleResultAsText(currentResult);
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  const handleSelectPreset = (preset: typeof PRESET_COMPANIES[0]) => {
    setCompanyName(preset.name);
    setCityHint(preset.city);
    setKnownNit(preset.nit);
    setErrorMsg(null);
  };

  return (
    <div className="space-y-6">
      {/* Search Input Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              Investigación Individual de Empresa
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Rastreo exhaustivo de dirección física de notificación judicial y teléfono corporativo en Colombia.
            </p>
          </div>

          <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
            <input
              type="checkbox"
              checked={strictMode}
              onChange={(e) => setStrictMode(e.target.checked)}
              className="rounded text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
            />
            <span>Cero Alucinaciones (Estricto)</span>
          </label>
        </div>

        {/* Preset suggestions */}
        <div className="mb-4">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Ejemplos de prueba rápida en Colombia:
          </div>
          <div className="flex flex-wrap gap-1.5">
            {PRESET_COMPANIES.map((preset) => (
              <button
                key={preset.name}
                type="button"
                onClick={() => handleSelectPreset(preset)}
                className="text-xs bg-slate-100 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700 transition-colors"
              >
                {preset.name}
              </button>
            ))}
          </div>
        </div>

        {/* Form fields */}
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="grid sm:grid-cols-12 gap-3">
            <div className="sm:col-span-6">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Nombre de la Empresa o Razón Social <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="Ej: Ecopetrol S.A., Arturo Calle, D1..."
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-hidden transition text-slate-900 dark:text-slate-100"
                />
                <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
            </div>

            <div className="sm:col-span-3">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                NIT Conocido (Opcional)
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Ej: 860.003.563-1"
                  value={knownNit}
                  onChange={(e) => setKnownNit(e.target.value)}
                  className="w-full pl-8 pr-3 py-2.5 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-hidden transition text-slate-900 dark:text-slate-100"
                />
                <Hash className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3.5" />
              </div>
            </div>

            <div className="sm:col-span-3">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Ciudad / Municipio (Opcional)
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Ej: Bogotá, Medellín, Cali..."
                  value={cityHint}
                  onChange={(e) => setCityHint(e.target.value)}
                  className="w-full pl-8 pr-3 py-2.5 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-hidden transition text-slate-900 dark:text-slate-100"
                />
                <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3.5" />
              </div>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {loading ? (
                <span className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 font-medium">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> {searchStep || 'Consultando fuentes...'}
                </span>
              ) : (
                'Búsqueda en vivo usando Google Search Grounding'
              )}
            </span>

            <button
              type="submit"
              disabled={loading || !companyName.trim()}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 dark:disabled:bg-slate-700 text-white rounded-xl font-semibold text-xs transition shadow-sm hover:shadow cursor-pointer disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Investigando...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  Buscar en Google
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Result Presentation */}
      {currentResult && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm space-y-5 animate-in fade-in duration-300">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                  Resultado Verificado
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {new Date(currentResult.queryTimestamp).toLocaleTimeString('es-CO')}
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1">
                {currentResult.razonSocial}
              </h3>
            </div>

            <button
              onClick={copyExactFormat}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>¡Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar Formato Solicitado</span>
                </>
              )}
            </button>
          </div>

          {/* Formato Estándar Requerido (Highlight Box) */}
          <div>
            <div className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
              Salida Estructurada Requerida
            </div>
            <div className="bg-slate-900 text-slate-100 p-4 rounded-xl font-mono text-xs leading-relaxed overflow-x-auto shadow-inner border border-slate-800">
              <pre className="whitespace-pre-wrap">{formatSingleResultAsText(currentResult)}</pre>
            </div>
          </div>

          {/* Grid de Datos Corporativos Visuales */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
            {/* NIT */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/70 dark:border-slate-700/60">
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mb-1">
                <Hash className="w-3.5 h-3.5 text-blue-500" /> NIT
              </div>
              <div className="font-semibold text-sm text-slate-900 dark:text-slate-100 break-words">
                {currentResult.nit === 'NO DISPONIBLE' ? (
                  <span className="text-rose-500 font-bold">NO DISPONIBLE</span>
                ) : (
                  currentResult.nit
                )}
              </div>
            </div>

            {/* Razón Social */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/70 dark:border-slate-700/60">
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mb-1">
                <Building2 className="w-3.5 h-3.5 text-indigo-500" /> Razón Social
              </div>
              <div className="font-semibold text-sm text-slate-900 dark:text-slate-100 break-words">
                {currentResult.razonSocial}
              </div>
            </div>

            {/* Dirección Encontrada */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/70 dark:border-slate-700/60">
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mb-1">
                <MapPin className="w-3.5 h-3.5 text-emerald-500" /> Dirección Encontrada
              </div>
              <div className="font-semibold text-sm text-slate-900 dark:text-slate-100 break-words">
                {currentResult.direccionEncontrada === 'NO DISPONIBLE' ? (
                  <span className="text-rose-500 font-bold">NO DISPONIBLE</span>
                ) : (
                  currentResult.direccionEncontrada
                )}
              </div>
            </div>

            {/* Teléfono Encontrado */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/70 dark:border-slate-700/60">
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mb-1">
                <Phone className="w-3.5 h-3.5 text-amber-500" /> Teléfono Encontrado
              </div>
              <div className="font-semibold text-sm text-slate-900 dark:text-slate-100 break-words">
                {currentResult.telefonoEncontrado === 'NO DISPONIBLE' ? (
                  <span className="text-rose-500 font-bold">NO DISPONIBLE</span>
                ) : (
                  currentResult.telefonoEncontrado
                )}
              </div>
            </div>
          </div>

          {/* URL de Referencia & Fuentes Web Consultadas */}
          <div className="p-4 bg-blue-50/50 dark:bg-slate-800/40 rounded-xl border border-blue-100 dark:border-slate-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 overflow-hidden">
              <LinkIcon className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
              <div className="truncate">
                <span className="font-bold text-slate-700 dark:text-slate-300">URL de Referencia: </span>
                {currentResult.urlReferencia !== 'N/A' && currentResult.urlReferencia !== 'NO DISPONIBLE' ? (
                  <a
                    href={currentResult.urlReferencia}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1 font-mono break-all"
                  >
                    {currentResult.urlReferencia}
                    <ExternalLink className="w-3 h-3 shrink-0" />
                  </a>
                ) : (
                  <span className="text-slate-500 font-mono">N/A</span>
                )}
              </div>
            </div>

            {currentResult.webSources && currentResult.webSources.length > 0 && (
              <div className="flex items-center gap-1.5 shrink-0 text-slate-500 dark:text-slate-400">
                <Globe2 className="w-3.5 h-3.5" />
                <span>{currentResult.webSources.length} enlaces rastreados</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
