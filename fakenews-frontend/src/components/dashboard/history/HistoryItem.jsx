/**
 * @file HistoryItem.jsx
 * @description Tarjeta visual de una verificación guardada en el historial del usuario.
 */

import { ArrowUpRight, ExternalLink, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { getVerdictClass } from "./historyVerdict";
import { translateVerdictLabel } from "../result/verdictI18n";

/** Render unitario de un análisis con titulo, veredicto, fragmento y metadatos. */
function HistoryItem({ analysis, index = 0, onDelete, onOpenDetails, isDeleting = false }) {
  const { t } = useTranslation("dashboard");
  const resolvedSource =
    analysis.source ||
    (analysis.inputOrigin === "extension"
      ? t("history.extensionSource")
      : t("history.manualSource"));
  const resolvedKindLabel =
    analysis.kindLabel ||
    (analysis.runType === "csv" ? "CSV" : analysis.runType === "url" ? "URL" : t("history.textKind"));

  const handleDelete = async (event) => {
    event.stopPropagation();

    if (typeof onDelete !== "function") {
      return;
    }

    await onDelete(analysis);
  };

  const handleOpenDetails = () => {
    if (typeof onOpenDetails !== "function") {
      return;
    }

    onOpenDetails(analysis);
  };

  return (
    <article
      className="dash-in overflow-hidden rounded-2xl border border-outline-variant/20 bg-surface/40"
      style={{ "--i": Math.min(index, 6) }}
    >
      <div className="flex items-start gap-3 p-4">
        <button type="button" className="min-w-0 flex-1 text-left" onClick={handleOpenDetails}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="dash-list-row-title">
                <ArrowUpRight className="size-3.5 text-on-surface-variant" aria-hidden="true" />
                <span className="truncate">{analysis.title}</span>
              </div>

              {analysis.excerpt ? (
                <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-on-surface-variant/80">
                  {analysis.excerpt}
                </p>
              ) : null}

              <div className="dash-list-row-meta mt-2">
                <span>{analysis.timestampLabel}</span>
                <span>{analysis.metaCountLabel || t("history.claimsCount", { count: analysis.claimsCount ?? 0 })}</span>
                <span>{resolvedKindLabel}</span>
                <span>{resolvedSource}</span>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <span className={`dash-verdict ${getVerdictClass(analysis.verdictLabel)}`}>
                <span className="dash-verdict-dot" aria-hidden="true" />
                {translateVerdictLabel(analysis.verdictLabel)}
              </span>

              <span className="inline-flex items-center gap-1 rounded-full border border-outline-variant/25 bg-surface-container-low/40 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">
                <ExternalLink className="size-3.5" aria-hidden="true" />
                {t("history.showDetails")}
              </span>
            </div>
          </div>
        </button>

        <button
          type="button"
          className="dash-btn dash-btn-danger shrink-0"
          onClick={handleDelete}
          disabled={isDeleting}
          aria-label={t("history.deleteAria", { title: analysis.title })}
          title={t("history.delete")}
        >
          <Trash2 className="size-4" aria-hidden="true" />
          <span className="hidden sm:inline">{isDeleting ? t("history.deleting") : t("history.delete")}</span>
        </button>
      </div>
    </article>
  );
}

export default HistoryItem;
