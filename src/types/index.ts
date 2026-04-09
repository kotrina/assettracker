export type AssetType = "STOCK" | "ETF" | "FUND" | "CRYPTO" | "OTHER";

export const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  STOCK: "Acción",
  ETF: "ETF",
  FUND: "Fondo de Inversión",
  CRYPTO: "Criptomoneda",
  OTHER: "Otro",
};

export interface Asset {
  id: string;
  userId: string;
  name: string;
  type: AssetType;
  ticker: string | null;
  isin: string | null;
  shares: number | null;
  avgBuyPrice: number;
  currentPrice: number | null;
  currency: string;
  scrapeUrl: string | null;
  lastUpdated: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Settings {
  id: string;
  userId: string;
  updateFrequency: number;
  createdAt: string;
  updatedAt: string;
}
