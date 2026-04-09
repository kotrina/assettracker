"use client";

import { useState, useEffect } from "react";
import { Asset, AssetType, ASSET_TYPE_LABELS } from "@/types";

interface AssetModalProps {
  asset?: Asset | null;
  onClose: () => void;
  onSave: (asset: Asset) => void;
}

const ASSET_TYPES: AssetType[] = ["STOCK", "ETF", "FUND", "CRYPTO", "OTHER"];

export default function AssetModal({ asset, onClose, onSave }: AssetModalProps) {
  const [form, setForm] = useState({
    name: "",
    type: "ETF" as AssetType,
    ticker: "",
    isin: "",
    shares: "",
    avgBuyPrice: "",
    currency: "EUR",
    scrapeUrl: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (asset) {
      setForm({
        name: asset.name,
        type: asset.type,
        ticker: asset.ticker ?? "",
        isin: asset.isin ?? "",
        shares: asset.shares != null ? String(asset.shares) : "",
        avgBuyPrice: String(asset.avgBuyPrice),
        currency: asset.currency,
        scrapeUrl: asset.scrapeUrl ?? "",
      });
    }
  }, [asset]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const url = asset ? `/api/assets/${asset.id}` : "/api/assets";
      const method = asset ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          type: form.type,
          ticker: form.ticker || null,
          isin: form.isin || null,
          shares: form.shares ? parseFloat(form.shares) : null,
          avgBuyPrice: parseFloat(form.avgBuyPrice),
          currency: form.currency,
          scrapeUrl: form.scrapeUrl || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Error al guardar");
      }

      const saved = await res.json();
      onSave(saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  };

  const needsScrapeUrl = form.type === "FUND" || (!form.ticker && !form.isin);

  // Live calculation preview
  const sharesNum = parseFloat(form.shares);
  const avgPrice = parseFloat(form.avgBuyPrice);
  const totalCost = !isNaN(sharesNum) && !isNaN(avgPrice) ? sharesNum * avgPrice : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">
            {asset ? "Editar activo" : "Añadir activo"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Nombre */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Nombre *</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="ej. iShares Core MSCI World"
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          {/* Tipo */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Tipo *</label>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value as AssetType })}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
            >
              {ASSET_TYPES.map((t) => (
                <option key={t} value={t}>
                  {ASSET_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </div>

          {/* Ticker + ISIN */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Ticker</label>
              <input
                type="text"
                value={form.ticker}
                onChange={(e) => setForm({ ...form, ticker: e.target.value.toUpperCase() })}
                placeholder="ej. IWDA.AS"
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">ISIN</label>
              <input
                type="text"
                value={form.isin}
                onChange={(e) => setForm({ ...form, isin: e.target.value.toUpperCase() })}
                placeholder="ej. IE00B3XXRP09"
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono"
              />
            </div>
          </div>

          {/* Nº Títulos + Precio compra + Moneda */}
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Nº títulos</label>
              <input
                type="number"
                step="0.000001"
                min="0"
                value={form.shares}
                onChange={(e) => setForm({ ...form, shares: e.target.value })}
                placeholder="0"
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Precio compra *</label>
              <input
                type="number"
                required
                step="0.0001"
                min="0"
                value={form.avgBuyPrice}
                onChange={(e) => setForm({ ...form, avgBuyPrice: e.target.value })}
                placeholder="0.00"
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Moneda</label>
              <select
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value })}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
              >
                <option value="EUR">EUR €</option>
                <option value="USD">USD $</option>
                <option value="GBP">GBP £</option>
              </select>
            </div>
          </div>

          {/* Preview coste total */}
          {totalCost !== null && (
            <div className="bg-indigo-50 border border-indigo-100 rounded-lg px-4 py-2.5 flex items-center justify-between">
              <span className="text-xs text-indigo-600 font-medium">Coste total de adquisición</span>
              <span className="text-sm font-bold text-indigo-700">
                {totalCost.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {form.currency === "EUR" ? "€" : form.currency === "USD" ? "$" : "£"}
              </span>
            </div>
          )}

          {/* URL scraping */}
          {(form.type === "FUND" || needsScrapeUrl) && (
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">
                URL de scraping
                {form.type === "FUND" && (
                  <span className="text-gray-400 font-normal ml-1">(recomendado para fondos)</span>
                )}
              </label>
              <input
                type="url"
                value={form.scrapeUrl}
                onChange={(e) => setForm({ ...form, scrapeUrl: e.target.value })}
                placeholder="https://www.morningstar.es/es/funds/snapshot/..."
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-400">
                Pega la URL de la ficha del fondo en Morningstar, Investing.com o similar.
              </p>
            </div>
          )}

          {/* Botones */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2.5 bg-indigo-600 rounded-xl text-sm font-medium text-white hover:bg-indigo-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? "Guardando..." : asset ? "Guardar cambios" : "Añadir activo"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
