import React, { useState } from 'react';
import { ShieldAlert, CheckCircle2, Search, ExternalLink, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';

export const InstructionBanner: React.FC = () => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-gradient-to-r from-amber-500/10 via-blue-500/10 to-red-500/10 border border-amber-500/30 rounded-xl p-4 mb-6 shadow-xs">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-500/20 text-amber-700 dark:text-amber-300 rounded-lg shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                Protocolo Estricto de Investigación y Cero Alucinaciones
              </h3>
              <span className="px-2 py-0.5 text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 rounded-full border border-emerald-300 dark:border-emerald-700">
                Verificación Activa
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
              Rastreo en Google de fuentes públicas colombianas (RUES, Cámaras de Comercio, portales oficiales). Si la dirección o teléfono no se verifican, se reporta estrictamente <span className="font-semibold text-rose-600 dark:text-rose-400">"NO DISPONIBLE"</span>.
            </p>
          </div>
        </div>

        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 flex items-center gap-1 shrink-0 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          {expanded ? 'Ocultar detalles' : 'Ver reglas'}
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {expanded && (
        <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 grid sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs text-slate-600 dark:text-slate-300">
          <div className="p-2.5 bg-white/60 dark:bg-slate-900/60 rounded-lg border border-slate-200/60 dark:border-slate-800/60">
            <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 mb-1">
              <Search className="w-3.5 h-3.5 text-blue-600" /> 1. Búsqueda Web Real
            </div>
            <p className="text-slate-500 dark:text-slate-400">
              Uso de Google Search sobre RUES, Cámaras de Comercio (CCB, Medellín, Cali) y directorios empresariales colombianos.
            </p>
          </div>

          <div className="p-2.5 bg-white/60 dark:bg-slate-900/60 rounded-lg border border-slate-200/60 dark:border-slate-800/60">
            <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 mb-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> 2. Análisis de Coincidencia
            </div>
            <p className="text-slate-500 dark:text-slate-400">
              Desambiguación mediante cotejo de NIT o ciudad para evitar cruce con homónimos o filiales en el extranjero.
            </p>
          </div>

          <div className="p-2.5 bg-white/60 dark:bg-slate-900/60 rounded-lg border border-slate-200/60 dark:border-slate-800/60">
            <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 mb-1">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-600" /> 3. Cero Alucinaciones
            </div>
            <p className="text-slate-500 dark:text-slate-400">
              Prohibido aproximar o inventar. Si el dato no existe confirmado, se marca formalmente como "NO DISPONIBLE".
            </p>
          </div>

          <div className="p-2.5 bg-white/60 dark:bg-slate-900/60 rounded-lg border border-slate-200/60 dark:border-slate-800/60">
            <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 mb-1">
              <ExternalLink className="w-3.5 h-3.5 text-amber-600" /> 4. Formato y Trazabilidad
            </div>
            <p className="text-slate-500 dark:text-slate-400">
              Entrega en las 5 columnas exactas: NIT, Razón Social, Dirección Encontrada, Teléfono y URL de Referencia.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
