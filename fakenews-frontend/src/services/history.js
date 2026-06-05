/**
 * @file history.js
 * @description Capa de servicios para acceso a API/Supabase, transformacion de datos y manejo uniforme de errores.
 */

import { resolveApiBaseUrl } from "../lib/apiBaseUrl";
import { getSupabaseClient } from "./supabase";

const DEFAULT_HISTORY_DELETE_PATH = "/verification-history";
const HISTORY_API_BASE_URL = resolveApiBaseUrl(import.meta.env.VITE_ANALYSIS_API_BASE_URL);

/** Asegura que las rutas de API empiecen por '/'. */
const normalizePath = (path) => {
  if (!path) {
    return DEFAULT_HISTORY_DELETE_PATH;
  }

  return path.startsWith("/") ? path : `/${path}`;
};

const HISTORY_DELETE_PATH = normalizePath(
  import.meta.env.VITE_HISTORY_DELETE_PATH?.trim() || DEFAULT_HISTORY_DELETE_PATH
);
const HISTORY_DELETE_ENDPOINT = `${HISTORY_API_BASE_URL}${HISTORY_DELETE_PATH}`;

const HISTORY_KIND_VERIFICATION = "verification";
const HISTORY_KIND_BATCH = "batch";

const normalizeInputOrigin = (value) => {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "extension") {
    return "extension";
  }
  return null;
};

/** Convierte confidence a número finito para operar en UI sin NaN. */
const toNumericOrNull = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

/** Homologa etiquetas de veredicto del backend a estados visuales estables. */
const normalizeVerdictLabel = (rawVerdict) => {
  const normalized = String(rawVerdict || "").trim().toUpperCase();

  if (["SUPPORTED", "REFUTED", "NOT_ENOUGH_INFO", "CONFLICTING"].includes(normalized)) {
    return normalized;
  }

  if (normalized === "REAL" || normalized === "FIABLE") {
    return "FIABLE";
  }

  if (normalized === "FAKE" || normalized === "FALSA") {
    return "FALSA";
  }

  return "DUDOSA";
};

/** Formatea la fecha de cada fila en formato corto legible para historial. */
const formatTimestampLabel = (dateValue) => {
  const parsed = new Date(dateValue);

  if (Number.isNaN(parsed.getTime())) {
    return "Sin fecha";
  }

  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed);
};

/** Ordena listas anidadas por su campo position cuando existe. */
const sortByPosition = (items) =>
  [...(items || [])].sort((left, right) => {
    const leftPos = Number.isFinite(Number(left?.position)) ? Number(left.position) : Number.MAX_SAFE_INTEGER;
    const rightPos = Number.isFinite(Number(right?.position)) ? Number(right.position) : Number.MAX_SAFE_INTEGER;
    return leftPos - rightPos;
  });

/** Adapta una verificación FEVER persistida al contrato visual de VerificationReport. */
const toVerificationReport = (row) => ({
  run_id: row?.id || null,
  run_type: row?.run_type || "text",
  source_url: row?.source_url || null,
  source_title: row?.source_title || null,
  batch_id: row?.batch_id || null,
  batch_row_index: toNumericOrNull(row?.batch_row_index),
  input_origin: row?.input_origin || null,
  veredicto_global: normalizeVerdictLabel(row?.overall_label),
  resumen: row?.summary || "",
  model_version: row?.model_version || "fever-stub-v0",
  duracion_ms: toNumericOrNull(row?.duration_ms),
  claims: sortByPosition(row?.verification_claims).map((claim) => ({
    id: claim?.id || null,
    texto: claim?.claim_text || "",
    veredicto: normalizeVerdictLabel(claim?.label),
    confianza: toNumericOrNull(claim?.confidence),
    razonamiento: claim?.rationale || "",
    evidencias: sortByPosition(claim?.verification_evidences).map((evidence) => ({
      url: evidence?.url || "",
      titulo: evidence?.title || evidence?.url || "",
      snippet: evidence?.snippet || "",
      nli_label: evidence?.nli_label || "NOT ENOUGH INFO",
      nli_score: toNumericOrNull(evidence?.nli_score),
    })),
  })),
});

const buildBatchVerdictLabel = ({ batch, items }) => {
  const normalizedLabels = (items || [])
    .map((item) => normalizeVerdictLabel(item?.overall_label))
    .filter(Boolean);
  const hasSupported = normalizedLabels.includes("SUPPORTED");
  const hasRefuted = normalizedLabels.includes("REFUTED");

  if ((Number(batch?.failed_rows) || 0) > 0 || (hasSupported && hasRefuted)) {
    return "CONFLICTING";
  }
  if (hasRefuted) {
    return "REFUTED";
  }
  if (hasSupported) {
    return "SUPPORTED";
  }
  return "NOT_ENOUGH_INFO";
};

const buildBatchResult = ({ batch, items }) => ({
  kind: "batch",
  mode: "csv",
  fileName: batch?.filename || "lote.csv",
  totalRows: Number(batch?.total_rows) || 0,
  processedRows: Number(batch?.processed_rows) || 0,
  successRows: Number(batch?.success_rows) || 0,
  failedRows: Number(batch?.failed_rows) || 0,
  suspiciousRows: Number(batch?.failed_rows) || 0,
  items: (items || []).map((item) => ({
    run_id: item?.id || null,
    row_index: toNumericOrNull(item?.batch_row_index),
    status: item?.status || "completed",
    overall_label: item?.overall_label || null,
    summary: item?.summary || "",
    error: item?.error_message || null,
    selected_claims: toNumericOrNull(item?.selected_claims),
    input_text: item?.input_text || "",
  })),
  batchId: batch?.id || null,
  status: batch?.status || "completed",
  error: batch?.error_message || null,
  savedInHistory: Boolean(batch?.saved_to_history),
});

/** Adapta una fila de verification_runs al contrato consumido por DashboardHistory. */
const toHistoryItem = (row) => {
  const inputText = String(row?.input_text || "").trim();
  const report = toVerificationReport(row);
  const runType = String(row?.run_type || "text").toLowerCase();
  const source = row?.source_title || row?.source_url || null;
  const title =
    row?.source_title ||
    row?.source_url ||
    (inputText ? `${inputText.slice(0, 72)}${inputText.length > 72 ? "..." : ""}` : null) ||
    "Verificación guardada";

  return {
    kind: HISTORY_KIND_VERIFICATION,
    id: row?.id,
    runId: row?.id || null,
    batchId: row?.batch_id || null,
    runType,
    inputOrigin: normalizeInputOrigin(row?.input_origin),
    title,
    excerpt: inputText ? inputText.slice(0, 220) : "Sin fragmento disponible.",
    source,
    verdictLabel: report.veredicto_global,
    confidence: null,
    modelVersion: row?.model_version || "fever-stub-v0",
    timestampLabel: formatTimestampLabel(row?.saved_at || row?.created_at),
    claimsCount: report.claims.length,
    metaCountLabel: `${report.claims.length} claims`,
    kindLabel: runType === "url" ? "URL" : null,
    summary: row?.summary || "",
    report,
    savedAt: row?.saved_at || row?.created_at || null,
  };
};

const toBatchHistoryItem = (batch, items) => {
  const batchResult = buildBatchResult({ batch, items });
  const totalRows = Number(batch?.total_rows) || 0;
  const processedRows = Number(batch?.processed_rows) || 0;
  const failedRows = Number(batch?.failed_rows) || 0;

  return {
    kind: HISTORY_KIND_BATCH,
    id: batch?.id,
    runId: null,
    batchId: batch?.id || null,
    runType: "csv",
    inputOrigin: normalizeInputOrigin(batch?.input_origin),
    title: batch?.filename || "Lote CSV guardado",
    excerpt: `Lote CSV con ${processedRows}/${totalRows} filas procesadas y ${failedRows} con error.`,
    source: "CSV batch",
    verdictLabel: buildBatchVerdictLabel({ batch, items }),
    confidence: null,
    modelVersion: "fever-batch-v1",
    timestampLabel: formatTimestampLabel(batch?.saved_at || batch?.created_at),
    claimsCount: items.length,
    metaCountLabel: `${totalRows} filas`,
    kindLabel: "CSV",
    summary: batch?.error_message || `Lote procesado: ${batch?.success_rows || 0} completadas, ${failedRows} con error.`,
    report: null,
    batchResult,
    savedAt: batch?.saved_at || batch?.created_at || null,
  };
};

/** Recupera verificaciones FEVER persistidas por usuario ordenadas por fecha descendente. */
export const getSavedHistory = async ({ userId, limit = null }) => {
  if (!userId) {
    throw new Error("User id is required to load history");
  }

  const supabase = getSupabaseClient();
  let runsQuery = supabase
    .from("verification_runs")
    .select(`
      id,
      user_id,
      input_text,
      run_type,
      source_url,
      source_title,
      batch_id,
      batch_row_index,
      input_origin,
      overall_label,
      summary,
      model_version,
      duration_ms,
      saved_to_history,
      saved_at,
      created_at,
      verification_claims (
        id,
        claim_text,
        label,
        confidence,
        rationale,
        position,
        verification_evidences (
          id,
          url,
          title,
          snippet,
          nli_label,
          nli_score,
          position
        )
      )
    `)
    .eq("user_id", userId)
    .eq("saved_to_history", true)
    .is("batch_id", null)
    .order("created_at", { ascending: false });

  if (Number.isFinite(limit) && limit > 0) {
    runsQuery = runsQuery.limit(limit);
  }

  const [runsResponse, batchesResponse] = await Promise.all([
    runsQuery,
    supabase
      .from("verification_batches")
      .select(`
        id,
        user_id,
        filename,
        status,
        total_rows,
        processed_rows,
        success_rows,
        failed_rows,
        error_message,
        input_origin,
        saved_to_history,
        saved_at,
        created_at
      `)
      .eq("user_id", userId)
      .eq("saved_to_history", true)
      .order("created_at", { ascending: false }),
  ]);

  const { data, error } = runsResponse;

  if (error) {
    throw new Error(error.message || "No se pudo cargar el historial guardado.");
  }

  if (batchesResponse.error) {
    throw new Error(batchesResponse.error.message || "No se pudo cargar el historial guardado.");
  }

  const savedBatches = batchesResponse.data || [];
  const batchIds = savedBatches.map((batch) => batch.id).filter(Boolean);
  let batchRowsById = new Map();

  if (batchIds.length > 0) {
    const { data: batchRows, error: batchRowsError } = await supabase
      .from("verification_runs")
      .select(`
        id,
        batch_id,
        batch_row_index,
        input_text,
        status,
        overall_label,
        summary,
        error_message,
        selected_claims,
        created_at
      `)
      .in("batch_id", batchIds)
      .order("batch_row_index", { ascending: true });

    if (batchRowsError) {
      throw new Error(batchRowsError.message || "No se pudo cargar el detalle de los lotes CSV guardados.");
    }

    batchRowsById = (batchRows || []).reduce((accumulator, row) => {
      const currentItems = accumulator.get(row.batch_id) || [];
      accumulator.set(row.batch_id, [...currentItems, row]);
      return accumulator;
    }, new Map());
  }

  const mergedItems = [
    ...(data || []).map(toHistoryItem),
    ...savedBatches.map((batch) => toBatchHistoryItem(batch, batchRowsById.get(batch.id) || [])),
  ].sort((left, right) => new Date(right.savedAt || 0).getTime() - new Date(left.savedAt || 0).getTime());

  if (Number.isFinite(limit) && limit > 0) {
    return mergedItems.slice(0, limit);
  }

  return mergedItems;
};

/** Elimina una verificación concreta del historial del usuario autenticado. */
export const deleteSavedHistoryItem = async ({ itemId = null, runId = null, jwtToken }) => {
  if (!jwtToken) {
    throw new Error("Tu sesión no es válida. Inicia sesión de nuevo.");
  }

  const resolvedItemId = itemId || runId;

  if (!resolvedItemId) {
    throw new Error("No se encontró el identificador del historial a eliminar.");
  }

  const response = await fetch(`${HISTORY_DELETE_ENDPOINT}/${resolvedItemId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${jwtToken}`,
    },
  });

  if (!response.ok) {
    let message = "No se pudo eliminar la verificación del historial.";

    try {
      const payload = await response.json();
      if (typeof payload?.detail === "string" && payload.detail.trim()) {
        message = payload.detail;
      }
    } catch {
      /** Fallback al mensaje por defecto. */
    }

    throw new Error(message);
  }

  return response.json();
};
