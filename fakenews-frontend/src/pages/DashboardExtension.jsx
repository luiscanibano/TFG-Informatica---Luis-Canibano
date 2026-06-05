/**
 * @file DashboardExtension.jsx
 * @description Página informativa de la extensión de navegador: descarga,
 * pasos de instalación en modo desarrollador y enlace a la documentación.
 */

import { Download, ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { GITHUB_RELEASES_URL } from "@/lib/constants";

const CHROME_WEB_STORE_URL = "https://chromewebstore.google.com/detail/fakenews-insight/hhlappniifhlbcnmnliecflgfbciekhe?hl=es";

function ChromeWebStoreIcon({ className = "size-10" }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <rect x="4" y="10" width="56" height="46" rx="14" fill="#F8FAFC" />
      <path
        d="M20 10C20 6.686 22.686 4 26 4H38C41.314 4 44 6.686 44 10V14H40V10C40 8.895 39.105 8 38 8H26C24.895 8 24 8.895 24 10V14H20V10Z"
        fill="#1F2937"
      />
      <path d="M30 22L20 39.5A19 19 0 0 1 12.11 24.51L30 22Z" fill="#EA4335" />
      <path d="M30 22L50 22A19 19 0 0 1 42.5 39.5H20L30 22Z" fill="#FBBC04" />
      <path d="M20 39.5H42.5A19 19 0 0 1 20 39.5Z" fill="#34A853" />
      <circle cx="32" cy="32" r="9" fill="#4285F4" />
      <path d="M35.5 32L30 35.175V28.825L35.5 32Z" fill="#F8FAFC" />
    </svg>
  );
}

function DashboardExtension() {
  const { t } = useTranslation("dashboard");
  const installSteps = t("extension.steps", { returnObjects: true });
  return (
    <section className="space-y-8">
      <div className="dash-in" style={{ "--i": 0 }}>
        <span className="dash-home-eyebrow">
          <span className="dash-home-eyebrow-dot" aria-hidden="true" />
          {t("extension.eyebrow")}
        </span>

        <h1 className="dash-home-h1 mt-3">
          {t("extension.titlePrefix")}{" "}
          <span className="dash-home-h1-soft">{t("extension.titleSoft")}</span>
        </h1>

        <p className="dash-home-sub">
          {t("extension.subtitle")}
        </p>

      </div>

      <div className="dash-in dash-panel" style={{ "--i": 1 }}>
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/8 bg-white/5 shadow-[0_18px_40px_rgba(0,0,0,0.18)]">
              <ChromeWebStoreIcon className="size-10" />
            </div>
            <div>
              <h2 className="dash-panel-title text-base md:text-lg">{t("extension.storeTitle")}</h2>
              <p className="mt-1 text-sm leading-6 text-stone-300/80">
                {t("extension.storeDescription")}
              </p>
              <p className="mt-2 text-xs text-stone-400/70">
                {t("extension.storeHelper")}
              </p>
            </div>
          </div>

          <a
            href={CHROME_WEB_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="dash-cta w-full justify-center md:w-auto"
          >
            <ChromeWebStoreIcon className="size-4" />
            {t("extension.storeCta")}
            <ArrowRight className="dash-cta-arrow size-4" aria-hidden="true" />
          </a>
        </div>
      </div>

      <div className="dash-in" style={{ "--i": 1.5 }}>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <a
            href={GITHUB_RELEASES_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="dash-cta"
          >
            <Download className="size-4" />
            {t("extension.downloadCta")}
            <ArrowRight className="dash-cta-arrow size-4" aria-hidden="true" />
          </a>
          <span className="dash-panel-meta">
            {t("extension.compatibility")}
          </span>
        </div>
      </div>

      <div className="dash-in dash-panel" style={{ "--i": 2 }}>
        <header className="dash-panel-head">
          <div>
            <h2 className="dash-panel-title">{t("extension.howToInstall")}</h2>
            <p className="dash-panel-meta">
              {t("extension.installSubtitle")}
            </p>
          </div>
        </header>

        <ol className="dash-list">
          {installSteps.map((step, index) => (
            <li
              key={step.title}
              className="dash-step dash-in"
              style={{ "--i": index + 2 }}
            >
              <span className="dash-step-num">{index + 1}</span>
              <div>
                <h3 className="dash-step-title">{step.title}</h3>
                <p className="dash-step-desc">{step.description}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export default DashboardExtension;
