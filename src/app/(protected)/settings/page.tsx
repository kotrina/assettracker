"use client";

import { useState, useEffect } from "react";

const FREQUENCY_OPTIONS = [
  { label: "Cada 15 minutos", value: 15 },
  { label: "Cada 30 minutos", value: 30 },
  { label: "Cada hora", value: 60 },
  { label: "Cada 2 horas", value: 120 },
  { label: "Cada 4 horas", value: 240 },
  { label: "Cada 8 horas", value: 480 },
  { label: "Una vez al día", value: 1440 },
];

interface SettingsData {
  email: string;
  updateFrequency: number;
}

type SendState = "idle" | "loading" | "success" | "error";

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [frequency, setFrequency] = useState(60);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [sendState, setSendState] = useState<SendState>("idle");
  const [sendError, setSendError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        setSettings(data);
        setFrequency(data.updateFrequency);
      });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updateFrequency: frequency }),
      });
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleForceSend = async () => {
    setSendState("loading");
    setSendError(null);
    try {
      const res = await fetch("/api/send-report", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setSendState("success");
        setTimeout(() => setSendState("idle"), 5000);
      } else {
        setSendState("error");
        setSendError(data.error ?? "Error desconocido");
        setTimeout(() => { setSendState("idle"); setSendError(null); }, 6000);
      }
    } catch {
      setSendState("error");
      setSendError("Error de conexión");
      setTimeout(() => { setSendState("idle"); setSendError(null); }, 6000);
    }
  };

  if (!settings) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
        <p className="text-sm text-gray-500 mt-1">Gestiona tu cuenta y preferencias</p>
      </div>

      <div className="flex flex-col gap-6">

        {/* Account card */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Cuenta</h2>
          <div>
            <label className="text-sm font-medium text-gray-500">Email</label>
            <p className="mt-1 text-sm text-gray-900 font-medium">{settings.email}</p>
          </div>
        </div>

        {/* Update frequency card */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-1">
            Actualización automática de precios
          </h2>
          <p className="text-sm text-gray-500 mb-5">
            Periodicidad con la que se actualizarán los precios y se enviará el email resumen.
          </p>

          <form onSubmit={handleSave} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Periodicidad</label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(parseInt(e.target.value))}
                className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white max-w-xs"
              >
                {FREQUENCY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 bg-indigo-600 rounded-xl text-sm font-medium text-white hover:bg-indigo-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {saving ? "Guardando..." : "Guardar"}
              </button>
              {saved && (
                <span className="text-sm text-green-600 flex items-center gap-1.5">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Configuración guardada
                </span>
              )}
            </div>
          </form>
        </div>

        {/* Email report card */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h2 className="text-base font-semibold text-gray-900 mb-1">
                Informe de cartera por email
              </h2>
              <p className="text-sm text-gray-500">
                Envía ahora un resumen completo de tu cartera con los valores actuales guardados a{" "}
                <span className="font-medium text-gray-700">{settings.email}</span>.
                No se hacen nuevas llamadas a APIs de precios.
              </p>
            </div>

            {/* Send button */}
            <button
              onClick={handleForceSend}
              disabled={sendState === "loading"}
              className={`flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                sendState === "success"
                  ? "bg-green-50 text-green-700 border border-green-200"
                  : sendState === "error"
                  ? "bg-red-50 text-red-600 border border-red-200"
                  : "bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed"
              }`}
            >
              {sendState === "loading" ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Enviando...
                </>
              ) : sendState === "success" ? (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  ¡Enviado!
                </>
              ) : sendState === "error" ? (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Error
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Forzar envío
                </>
              )}
            </button>
          </div>

          {/* Error message */}
          {sendState === "error" && sendError && (
            <div className="mt-3 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
              {sendError}
            </div>
          )}

          {/* Success message */}
          {sendState === "success" && (
            <div className="mt-3 bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-lg flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Informe enviado a <strong className="ml-1">{settings.email}</strong>. Revisa tu bandeja de entrada.
            </div>
          )}
        </div>

        {/* Info cron card */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <div className="flex gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-amber-800">Sobre la automatización</p>
              <p className="text-sm text-amber-700 mt-1">
                La actualización automática y el envío del email se activan mediante un Cron Job en Vercel (configurado en{" "}
                <code className="font-mono bg-amber-100 px-1 rounded">vercel.json</code>).
                Necesitas configurar <code className="font-mono bg-amber-100 px-1 rounded">RESEND_API_KEY</code> y{" "}
                <code className="font-mono bg-amber-100 px-1 rounded">CRON_SECRET</code> en las variables de entorno.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
