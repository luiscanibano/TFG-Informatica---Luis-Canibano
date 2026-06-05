import React from "react";
import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";

import "@/lib/i18n";
import i18n from "@/lib/i18n";
import HistoryItem from "./HistoryItem";

const sampleAnalysis = {
  id: "run-1",
  runId: "run-1",
  title: "Donald Trump warned Iran that the clock is ticking",
  excerpt: "Donald Trump warned Iran that the clock is ticking as talks stalled.",
  source: null,
  verdictLabel: "NOT_ENOUGH_INFO",
  confidence: null,
  modelVersion: "fever-stub-v0",
  timestampLabel: "18/05 11:45",
  claimsCount: 1,
  summary: "No hay evidencia suficiente para confirmar ni refutar.",
  report: {
    run_id: "run-1",
    veredicto_global: "NOT_ENOUGH_INFO",
    resumen: "No hay evidencia suficiente para confirmar ni refutar.",
    model_version: "fever-stub-v0",
    duracion_ms: 42,
    claims: [
      {
        id: "claim-1",
        texto: "Trump warned Iran that the clock is ticking.",
        veredicto: "NOT_ENOUGH_INFO",
        confianza: 0.56,
        razonamiento: "Apoyado parcialmente por [1].",
        evidencias: [
          {
            url: "https://example.org/story",
            titulo: "Example story",
            snippet: "Snippet",
            nli_label: "NOT ENOUGH INFO",
            nli_score: 0.56,
          },
        ],
      },
    ],
  },
};

describe("<HistoryItem />", () => {
  it("abre el detalle del historial en una vista separada", () => {
    const onOpenDetails = vi.fn();
    render(<HistoryItem analysis={sampleAnalysis} onOpenDetails={onOpenDetails} />);

    fireEvent.click(screen.getAllByRole("button", { name: /Donald Trump warned Iran/i })[0]);

    expect(onOpenDetails).toHaveBeenCalledWith(sampleAnalysis);
  });

  it("permite eliminar una entrada del historial", () => {
    const onDelete = vi.fn();
    render(<HistoryItem analysis={sampleAnalysis} onDelete={onDelete} />);

    fireEvent.click(screen.getByRole("button", { name: /Eliminar .* del historial/i }));

    expect(onDelete).toHaveBeenCalledWith(sampleAnalysis);
  });

  it("muestra metadatos diferenciados para lotes CSV guardados", () => {
    render(
      <HistoryItem
        analysis={{
          ...sampleAnalysis,
          id: "batch-1",
          runId: null,
          batchId: "batch-1",
          runType: "csv",
          kindLabel: "CSV",
          metaCountLabel: "12 filas",
          source: "CSV batch",
        }}
      />
    );

    expect(screen.getByText("12 filas")).toBeInTheDocument();
    expect(screen.getByText("CSV")).toBeInTheDocument();
  });

  it("muestra la extensión como origen cuando el historial viene de la extensión", () => {
    render(
      <HistoryItem
        analysis={{
          ...sampleAnalysis,
          source: null,
          inputOrigin: "extension",
        }}
      />
    );

    expect(screen.getByText(/Extensión del navegador/i)).toBeInTheDocument();
  });

  it("traduce el tipo de ejecución a inglés cuando la interfaz está en inglés", async () => {
    await act(async () => {
      await i18n.changeLanguage("en");
    });

    render(
      <HistoryItem
        analysis={{
          ...sampleAnalysis,
          runType: "text",
          kindLabel: null,
        }}
      />
    );

    expect(screen.getByText("Text")).toBeInTheDocument();

    await act(async () => {
      await i18n.changeLanguage("es");
    });
  });
});