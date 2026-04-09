"use client";

import { useState, useCallback, useEffect } from "react";
import { Asset, ASSET_TYPE_LABELS, AssetType } from "@/types";
import AssetModal from "./AssetModal";
import PortfolioSummary from "./PortfolioSummary";

const CURRENCY_SYMBOL: Record<string, string> = { EUR: "€", USD: "$", GBP: "£" };

function formatPrice(price: number | null, currency: string, decimals = 4): string {
  if (price === null) return "—";
  const sym = CURRENCY_SYMBOL[currency] ?? currency;
  return `${price.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: decimals })} ${sym}`;
}

function formatDate(date: string | null): string {
  if (!date) return "—";
  return new Date(date).toLocaleString("es-ES", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function PctBadge({ avg, current }: { avg: number; current: number | null }) {
  if (current === null) return <span className="text-gray-300">—</span>;
  const pct = ((current - avg) / avg) * 100;
  const positive = pct >= 0;
  return (
    <span className={`inline-flex items-center text-xs font-medium px-1.5 py-0.5 rounded-md ${positive ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
      {positive ? "+" : ""}{pct.toFixed(2)}%
    </span>
  );
}

function ProfitCell({ asset }: { asset: Asset }) {
  if (asset.shares == null || asset.currentPrice == null) return <span className="text-gray-300">—</span>;
  const profit = asset.shares * (asset.currentPrice - asset.avgBuyPrice);
  const sym = CURRENCY_SYMBOL[asset.currency] ?? asset.currency;
  const positive = profit >= 0;
  return (
    <span className={`text-xs font-medium ${positive ? "text-green-700" : "text-red-500"}`}>
      {positive ? "+" : ""}{profit.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {sym}
    </span>
  );
}

function PositionValue({ asset }: { asset: Asset }) {
  if (asset.shares == null || asset.currentPrice == null) return <span className="text-gray-300">—</span>;
  const value = asset.shares * asset.currentPrice;
  return <span className="text-xs text-gray-600">{formatPrice(value, asset.currency, 2)}</span>;
}

type RefreshState = "idle" | "loading" | "success" | "error";

const TYPE_COLORS: Record<AssetType, string> = {
  STOCK: "bg-blue-50 text-blue-700",
  ETF: "bg-purple-50 text-purple-700",
  FUND: "bg-amber-50 text-amber-700",
  CRYPTO: "bg-orange-50 text-orange-700",
  OTHER: "bg-gray-100 text-gray-600",
};

export default function AssetTable() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [refreshStates, setRefreshStates] = useState<Record<string, RefreshState>>({});
  const [refreshErrors, setRefreshErrors] = useState<Record<string, string>>({});
  const [refreshingAll, setRefreshingAll] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const fetchAssets = useCallback(async () => {
    try {
      const res = await fetch("/api/assets");
      if (res.ok) setAssets(await res.json());
    } finally {
      setLoadingAssets(false);
    }
  }, []);

  useEffect(() => { fetchAssets(); }, [fetchAssets]);

  const handleRefreshOne = async (id: string) => {
    setRefreshStates((s) => ({ ...s, [id]: "loading" }));
    setRefreshErrors((e) => { const n = { ...e }; delete n[id]; return n; });
    try {
      const res = await fetch(`/api/assets/${id}/refresh`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setAssets((prev) => prev.map((a) => (a.id === id ? data.asset : a)));
        setRefreshStates((s) => ({ ...s, [id]: "success" }));
      } else {
        setRefreshStates((s) => ({ ...s, [id]: "error" }));
        setRefreshErrors((e) => ({ ...e, [id]: data.error ?? "Error al actualizar" }));
      }
    } catch {
      setRefreshStates((s) => ({ ...s, [id]: "error" }));
      setRefreshErrors((e) => ({ ...e, [id]: "Error de conexión" }));
    }
    setTimeout(() => {
      setRefreshStates((s) => ({ ...s, [id]: "idle" }));
      setRefreshErrors((e) => { const n = { ...e }; delete n[id]; return n; });
    }, 4000);
  };

  const handleRefreshAll = async () => {
    setRefreshingAll(true);
    try {
      const res = await fetch("/api/assets/refresh-all", { method: "POST" });
      if (res.ok) await fetchAssets();
    } finally {
      setRefreshingAll(false);
    }
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/assets/${id}`, { method: "DELETE" });
    if (res.ok) {
      setAssets((prev) => prev.filter((a) => a.id !== id));
      setDeleteConfirm(null);
    }
  };

  const handleSave = (saved: Asset) => {
    setAssets((prev) => {
      const exists = prev.find((a) => a.id === saved.id);
      return exists ? prev.map((a) => (a.id === saved.id ? saved : a)) : [saved, ...prev];
    });
    setShowModal(false);
    setEditingAsset(null);
  };

  return (
    <div>
      {/* Portfolio Summary */}
      <PortfolioSummary assets={assets} />

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mis activos</h1>
          <p className="text-sm text-gray-500 mt-1">{assets.length} activos en cartera</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefreshAll}
            disabled={refreshingAll || assets.length === 0}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className={`w-4 h-4 ${refreshingAll ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {refreshingAll ? "Actualizando..." : "Actualizar todos"}
          </button>
          <button
            onClick={() => { setEditingAsset(null); setShowModal(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 rounded-xl text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Añadir activo
          </button>
        </div>
      </div>

      {/* Table */}
      {loadingAssets ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        </div>
      ) : assets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.5l7.5-7.5 3 3 5.25-5.25M21 7.5h-4.5V3" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Sin activos todavía</h3>
          <p className="text-gray-500 text-sm mb-6">Añade tu primer activo para empezar a hacer seguimiento</p>
          <button
            onClick={() => setShowModal(true)}
            className="px-5 py-2.5 bg-indigo-600 rounded-xl text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
          >
            Añadir activo
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 font-medium text-gray-500 whitespace-nowrap">Nombre</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 whitespace-nowrap">Tipo</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 whitespace-nowrap">Código</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500 whitespace-nowrap">Títulos</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500 whitespace-nowrap">P. compra</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500 whitespace-nowrap">P. actual</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500 whitespace-nowrap">Var. %</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500 whitespace-nowrap">Beneficio</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500 whitespace-nowrap">Valor pos.</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-500 whitespace-nowrap">Actualizado</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {assets.map((asset) => (
                  <tr key={asset.id} className="hover:bg-gray-50/70 transition-colors group">
                    <td className="px-4 py-3">
                      <span className="font-medium text-gray-900">{asset.name}</span>
                      {refreshErrors[asset.id] && (
                        <p className="text-xs text-red-500 mt-0.5">{refreshErrors[asset.id]}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-md ${TYPE_COLORS[asset.type as AssetType] ?? "bg-gray-100 text-gray-600"}`}>
                        {ASSET_TYPE_LABELS[asset.type as AssetType] ?? asset.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">
                      {asset.ticker ?? asset.isin ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">
                      {asset.shares != null
                        ? asset.shares.toLocaleString("es-ES", { maximumFractionDigits: 6 })
                        : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">
                      {formatPrice(asset.avgBuyPrice, asset.currency)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">
                      {formatPrice(asset.currentPrice, asset.currency)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <PctBadge avg={asset.avgBuyPrice} current={asset.currentPrice} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <ProfitCell asset={asset} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <PositionValue asset={asset} />
                    </td>
                    <td className="px-4 py-3 text-center text-xs text-gray-400 whitespace-nowrap">
                      {formatDate(asset.lastUpdated)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {/* Refresh */}
                        <button
                          onClick={() => handleRefreshOne(asset.id)}
                          disabled={refreshStates[asset.id] === "loading"}
                          title="Actualizar precio"
                          className={`p-1.5 rounded-lg transition-colors ${
                            refreshStates[asset.id] === "success" ? "text-green-600 bg-green-50"
                            : refreshStates[asset.id] === "error" ? "text-red-500 bg-red-50"
                            : "text-gray-400 hover:text-indigo-600 hover:bg-indigo-50"
                          }`}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className={`w-4 h-4 ${refreshStates[asset.id] === "loading" ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                        </button>
                        {/* Edit */}
                        <button
                          onClick={() => { setEditingAsset(asset); setShowModal(true); }}
                          title="Editar"
                          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                        {/* Delete */}
                        {deleteConfirm === asset.id ? (
                          <div className="flex items-center gap-1">
                            <button onClick={() => handleDelete(asset.id)} className="px-2 py-1 text-xs bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                              Confirmar
                            </button>
                            <button onClick={() => setDeleteConfirm(null)} className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors">
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirm(asset.id)}
                            title="Eliminar"
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && (
        <AssetModal
          asset={editingAsset}
          onClose={() => { setShowModal(false); setEditingAsset(null); }}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
