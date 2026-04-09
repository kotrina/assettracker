"use client";

import { useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Asset, ASSET_TYPE_LABELS, AssetType } from "@/types";

interface PortfolioSummaryProps {
  assets: Asset[];
}

const COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981",
  "#3b82f6", "#f97316", "#14b8a6", "#ef4444", "#84cc16",
];

const CURRENCY_SYMBOL: Record<string, string> = { EUR: "€", USD: "$", GBP: "£" };

function fmt(value: number, currency = "EUR"): string {
  return `${value.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${CURRENCY_SYMBOL[currency] ?? currency}`;
}

function fmtPct(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

// Custom tooltip for pie chart
interface TooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; payload: { currency: string; pct: number } }>;
}
function CustomTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg px-4 py-3 text-sm">
      <p className="font-semibold text-gray-900 mb-1">{d.name}</p>
      <p className="text-gray-600">{fmt(d.value, d.payload.currency)}</p>
      <p className="text-gray-500">{d.payload.pct.toFixed(1)}% de la cartera</p>
    </div>
  );
}

// Custom legend
interface LegendProps {
  payload?: Array<{ color: string; value: string }>;
}
function CustomLegend({ payload }: LegendProps) {
  if (!payload?.length) return null;
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5 justify-center mt-2">
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-1.5 text-xs text-gray-600">
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
          <span className="max-w-[120px] truncate">{entry.value}</span>
        </div>
      ))}
    </div>
  );
}

export default function PortfolioSummary({ assets }: PortfolioSummaryProps) {
  const stats = useMemo(() => {
    // Only assets with shares and currentPrice can contribute to portfolio value
    const valued = assets.filter((a) => a.shares != null && a.currentPrice != null);
    const costable = assets.filter((a) => a.shares != null);

    // Total current value
    const totalValue = valued.reduce((sum, a) => sum + a.shares! * a.currentPrice!, 0);
    // Total cost
    const totalCost = costable.reduce((sum, a) => sum + a.shares! * a.avgBuyPrice, 0);
    // Profit / loss
    const totalProfit = valued.reduce(
      (sum, a) => sum + a.shares! * (a.currentPrice! - a.avgBuyPrice),
      0
    );
    const totalPct = totalCost > 0 ? (totalProfit / totalCost) * 100 : null;

    // Pie chart data: one slice per asset (only valued ones)
    const pieData = valued
      .map((a, i) => ({
        name: a.name.length > 22 ? a.name.slice(0, 20) + "…" : a.name,
        value: a.shares! * a.currentPrice!,
        currency: a.currency,
        pct: totalValue > 0 ? (a.shares! * a.currentPrice! / totalValue) * 100 : 0,
        color: COLORS[i % COLORS.length],
      }))
      .sort((a, b) => b.value - a.value);

    // Breakdown by type
    const byType = assets.reduce<Record<string, { value: number; cost: number }>>((acc, a) => {
      if (a.shares == null || a.currentPrice == null) return acc;
      if (!acc[a.type]) acc[a.type] = { value: 0, cost: 0 };
      acc[a.type].value += a.shares * a.currentPrice;
      acc[a.type].cost += a.shares * a.avgBuyPrice;
      return acc;
    }, {});

    return { totalValue, totalCost, totalProfit, totalPct, pieData, byType, valued };
  }, [assets]);

  if (assets.length === 0) return null;

  // Don't show if no assets have shares+price yet
  if (stats.valued.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-6 text-center text-sm text-gray-400">
        Añade el número de títulos y actualiza los precios para ver el resumen de cartera.
      </div>
    );
  }

  const mainCurrency = assets[0]?.currency ?? "EUR";

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
      <h2 className="text-base font-semibold text-gray-900 mb-5">Resumen de cartera</h2>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left: pie chart */}
        <div className="flex-shrink-0 w-full lg:w-72">
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={stats.pieData}
                cx="50%"
                cy="45%"
                innerRadius={55}
                outerRadius={90}
                paddingAngle={2}
                dataKey="value"
              >
                {stats.pieData.map((entry, index) => (
                  <Cell key={index} fill={entry.color} stroke="white" strokeWidth={2} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend content={<CustomLegend />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Right: stats */}
        <div className="flex-1 flex flex-col gap-4">
          {/* Main metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard
              label="Valor total"
              value={fmt(stats.totalValue, mainCurrency)}
              neutral
            />
            <StatCard
              label="Coste total"
              value={fmt(stats.totalCost, mainCurrency)}
              neutral
            />
            <StatCard
              label="Beneficio / Pérdida"
              value={fmt(stats.totalProfit, mainCurrency)}
              positive={stats.totalProfit >= 0}
            />
            <StatCard
              label="Rentabilidad"
              value={stats.totalPct !== null ? fmtPct(stats.totalPct) : "—"}
              positive={stats.totalPct !== null && stats.totalPct >= 0}
            />
          </div>

          {/* By type */}
          {Object.keys(stats.byType).length > 1 && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-2">Por tipo de activo</p>
              <div className="flex flex-col gap-1.5">
                {Object.entries(stats.byType)
                  .sort(([, a], [, b]) => b.value - a.value)
                  .map(([type, data]) => {
                    const pct = stats.totalValue > 0 ? (data.value / stats.totalValue) * 100 : 0;
                    const profit = data.value - data.cost;
                    return (
                      <div key={type} className="flex items-center gap-3 text-sm">
                        <span className="w-28 text-gray-600 text-xs">
                          {ASSET_TYPE_LABELS[type as AssetType] ?? type}
                        </span>
                        <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                          <div
                            className="bg-indigo-500 h-1.5 rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="w-10 text-right text-xs text-gray-500">{pct.toFixed(0)}%</span>
                        <span className="w-24 text-right text-xs font-medium text-gray-700">
                          {fmt(data.value, mainCurrency)}
                        </span>
                        <span className={`w-20 text-right text-xs font-medium ${profit >= 0 ? "text-green-600" : "text-red-500"}`}>
                          {profit >= 0 ? "+" : ""}{fmt(profit, mainCurrency)}
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  positive,
  neutral,
}: {
  label: string;
  value: string;
  positive?: boolean;
  neutral?: boolean;
}) {
  const color = neutral
    ? "text-gray-900"
    : positive
    ? "text-green-600"
    : "text-red-500";

  return (
    <div className="bg-gray-50 rounded-xl p-3 flex flex-col gap-1">
      <span className="text-xs text-gray-500">{label}</span>
      <span className={`text-sm font-bold ${color}`}>{value}</span>
    </div>
  );
}
