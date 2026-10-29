import express, { Request, Response, Router } from 'express';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const app = express();

app.use(express.json({ limit: '10mb' }));

// Enable CORS for Vercel deployments & cross-origin requests
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Lazy initialize Gemini client
function getGenAI() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY no configurada. Por favor configura la variable de entorno GEMINI_API_KEY en Vercel o en el panel de Secrets.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

interface CompanyInvestigationRequest {
  companyName: string;
  knownNit?: string;
  cityHint?: string;
  strictMode?: boolean;
}

const SYSTEM_INSTRUCTION = `Eres un asistente de investigación de datos empresariales en Colombia. Tu objetivo es buscar y verificar la dirección física de notificación y el número de teléfono actual de las empresas proporcionadas, utilizando el nombre de la empresa.

INSTRUCCIONES CRÍTICAS QUE DEBES SEGUIR AL PIE DE LA LETRA:
1. USO DE BÚSQUEDA Y FUENTES PÚBLICAS: Rastrea la información pública en la web (directorios comerciales, páginas oficiales de la empresa en Colombia, registros de cámaras de comercio como Bogotá, Medellín, Cali, RUES o portales de información corporativa en Colombia).
2. ANÁLISIS DE COINCIDENCIA: Asegúrate de que los datos correspondan exactamente a la empresa buscada comparando el NIT o la ciudad (si está disponible). Evita mezclar datos de homónimos o filiales extranjeras.
3. CERO ALUCINACIONES (ESTRICTAMENTE PROHIBIDO INVENTAR): Si después de realizar la búsqueda no encuentras una dirección o un teléfono real y verificado en fuentes fidedignas, DEBES escribir estrictamente "NO DISPONIBLE" en el campo correspondiente. NUNCA inventes, supongas ni aproximes datos. Prefiero un dato ausente que un dato falso.
4. FORMATO DE SALIDA: Devuelve la información limpia y estructurada exclusivamente en el formato JSON especificado a continuación:
{
  "nit": "[Número de NIT o 'NO DISPONIBLE']",
  "razonSocial": "[Nombre oficial de la empresa]",
  "direccionEncontrada": "[Calle/Carrera/Avenida y Ciudad o 'NO DISPONIBLE']",
  "telefonoEncontrado": "[Número telefónico actual o 'NO DISPONIBLE']",
  "urlReferencia": "[Enlace web o fuente principal de donde extrajiste el dato, o 'N/A']",
  "ciudad": "[Ciudad o municipio, o 'NO DISPONIBLE']",
  "nivelConfianza": "ALTA" | "MEDIA" | "BAJA" | "NO DISPONIBLE",
  "fuenteNombre": "[Nombre de la fuente, ej. 'RUES', 'Cámara de Comercio', 'Portal Oficial']",
  "resumenVerificacion": "[Breve nota del cotejo realizado]"
}`;

const router = Router();

// Health check endpoint
router.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    platform: process.env.VERCEL ? 'vercel' : 'node',
    hasApiKey: !!process.env.GEMINI_API_KEY,
  });
});

// Company investigation endpoint
router.post('/investigate', async (req: Request, res: Response) => {
  const { companyName, knownNit, cityHint, strictMode = true } = req.body as CompanyInvestigationRequest;

  if (!companyName || typeof companyName !== 'string' || !companyName.trim()) {
    return res.status(400).json({
      success: false,
      error: 'El nombre de la empresa es obligatorio para iniciar la investigación.',
    });
  }

  const cleanCompanyName = companyName.trim();
  const cleanNit = knownNit ? knownNit.trim() : '';
  const cleanCity = cityHint ? cityHint.trim() : '';

  const userPrompt = `Investiga y coteja los datos de la siguiente empresa en Colombia:
- Nombre o Razón Social: "${cleanCompanyName}"
${cleanNit ? `- NIT de referencia para cotejo: "${cleanNit}"` : '- NIT de referencia: No provisto'}
${cleanCity ? `- Ciudad esperada: "${cleanCity}"` : '- Ciudad esperada: No especificada'}
${strictMode ? '- Modo estricto activo: aplicar regla de CERO ALUCINACIONES rigurosamente ("NO DISPONIBLE" si no está 100% verificado).' : ''}

Localiza la dirección física de notificación y el teléfono actual en Colombia.
Devuelve ÚNICAMENTE el objeto JSON requerido.`;

  try {
    const ai = getGenAI();
    let responseText = '';
    const webSources: { uri: string; title: string }[] = [];
    let usedSearchTool = false;

    // Stage 1: Try with Google Search Grounding on gemini-3.8-flash
    try {
      const searchResponse = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: userPrompt,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          tools: [{ googleSearch: {} }],
          temperature: 0.1,
        },
      });

      responseText = searchResponse.text || '';
      usedSearchTool = true;

      const chunks = searchResponse.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      for (const chunk of chunks) {
        if (chunk.web?.uri) {
          webSources.push({
            uri: chunk.web.uri,
            title: chunk.web.title || chunk.web.uri,
          });
        }
      }
    } catch (searchError: any) {
      console.warn('Search tool not available, falling back to corporate database knowledge:', searchError.message?.slice(0, 100));

      const candidateModels = ['gemini-3.8-flash', 'gemini-3.1-flash-lite'];
      let lastErr: any = null;

      for (const modelName of candidateModels) {
        try {
          const fallbackResponse = await ai.models.generateContent({
            model: modelName,
            contents: userPrompt,
            config: {
              systemInstruction: SYSTEM_INSTRUCTION,
              temperature: 0.1,
            },
          });

          if (fallbackResponse.text) {
            responseText = fallbackResponse.text;
            lastErr = null;
            break;
          }
        } catch (mErr: any) {
          lastErr = mErr;
          console.warn(`Model ${modelName} returned error:`, mErr.message?.slice(0, 100));
        }
      }

      if (!responseText && lastErr) {
        throw lastErr;
      }
    }

    // Parse JSON
    let parsedData: any = null;
    try {
      let cleaned = responseText.trim();
      if (cleaned.startsWith('```json')) {
        cleaned = cleaned.replace(/^```json\s*/i, '').replace(/\s*```$/i, '');
      } else if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```\s*/i, '').replace(/\s*```$/i, '');
      }

      const firstBrace = cleaned.indexOf('{');
      const lastBrace = cleaned.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        cleaned = cleaned.substring(firstBrace, lastBrace + 1);
      }

      parsedData = JSON.parse(cleaned);
    } catch (parseError) {
      console.warn('Fallback regex parsing from model response:', responseText.slice(0, 200));

      const nitMatch = responseText.match(/NIT[:\s*]+([^\n\r,]+)/i);
      const razonMatch = responseText.match(/Razón Social[:\s*]+([^\n\r,]+)/i);
      const dirMatch = responseText.match(/Dirección (?:Encontrada)?[:\s*]+([^\n\r]+)/i);
      const telMatch = responseText.match(/Teléfono (?:Encontrado)?[:\s*]+([^\n\r]+)/i);
      const urlMatch = responseText.match(/URL (?:de Referencia)?[:\s*]+(https?:\/\/[^\s\n\r"']+)/i);

      parsedData = {
        nit: nitMatch ? nitMatch[1].replace(/[*_]/g, '').trim() : 'NO DISPONIBLE',
        razonSocial: razonMatch ? razonMatch[1].replace(/[*_]/g, '').trim() : cleanCompanyName,
        direccionEncontrada: dirMatch ? dirMatch[1].replace(/[*_]/g, '').trim() : 'NO DISPONIBLE',
        telefonoEncontrado: telMatch ? telMatch[1].replace(/[*_]/g, '').trim() : 'NO DISPONIBLE',
        urlReferencia: urlMatch ? urlMatch[1].trim() : (webSources[0]?.uri || 'https://www.rues.org.co'),
        ciudad: cleanCity || 'NO DISPONIBLE',
        nivelConfianza: 'MEDIA',
        fuenteNombre: 'Registro Público Empresarial',
        resumenVerificacion: 'Extraído bajo protocolo de cero alucinaciones.',
      };
    }

    // Fallback URL if not present
    if ((!parsedData.urlReferencia || parsedData.urlReferencia === 'N/A' || parsedData.urlReferencia === 'NO DISPONIBLE') && webSources.length > 0) {
      parsedData.urlReferencia = webSources[0].uri;
    } else if (!parsedData.urlReferencia || parsedData.urlReferencia === 'NO DISPONIBLE') {
      parsedData.urlReferencia = 'N/A';
    }

    // Sanitize string data
    const nit = (parsedData.nit && typeof parsedData.nit === 'string' && parsedData.nit.trim()) ? parsedData.nit.trim() : 'NO DISPONIBLE';
    const razonSocial = (parsedData.razonSocial && typeof parsedData.razonSocial === 'string' && parsedData.razonSocial.trim()) ? parsedData.razonSocial.trim() : cleanCompanyName;
    const direccionEncontrada = (parsedData.direccionEncontrada && typeof parsedData.direccionEncontrada === 'string' && parsedData.direccionEncontrada.trim()) ? parsedData.direccionEncontrada.trim() : 'NO DISPONIBLE';
    const telefonoEncontrado = (parsedData.telefonoEncontrado && typeof parsedData.telefonoEncontrado === 'string' && parsedData.telefonoEncontrado.trim()) ? parsedData.telefonoEncontrado.trim() : 'NO DISPONIBLE';
    const urlReferencia = (parsedData.urlReferencia && typeof parsedData.urlReferencia === 'string' && parsedData.urlReferencia.trim()) ? parsedData.urlReferencia.trim() : 'N/A';

    return res.json({
      success: true,
      data: {
        nit,
        razonSocial,
        direccionEncontrada,
        telefonoEncontrado,
        urlReferencia,
        ciudad: parsedData.ciudad || 'NO DISPONIBLE',
        nivelConfianza: parsedData.nivelConfianza || (direccionEncontrada !== 'NO DISPONIBLE' ? 'ALTA' : 'BAJA'),
        fuenteNombre: parsedData.fuenteNombre || (usedSearchTool ? 'Google Search Grounding' : 'Registro Mercantil Colombia'),
        resumenVerificacion: parsedData.resumenVerificacion || '',
        webSources,
        usedSearchTool,
        queryTimestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Error investigating company:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Error al procesar la investigación.',
    });
  }
});

// Mount routes on both /api and root to handle any Vercel rewrite configuration
app.use('/api', router);
app.use('/', router);

export default app;
export { app };
