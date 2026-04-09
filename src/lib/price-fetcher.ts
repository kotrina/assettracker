import YahooFinance from "yahoo-finance2";
import { load } from "cheerio";

// yahoo-finance2 v3: must instantiate with new YahooFinance()
const yf = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

export interface PriceResult {
  price: number | null;
  currency: string;
  error?: string;
}

/**
 * Fetches current price for an asset.
 * - STOCK / ETF / CRYPTO with ticker: uses Yahoo Finance
 * - FUND or assets without ticker: tries ISIN search on Yahoo Finance
 * - Fallback: scrapes the provided URL
 */
export async function fetchAssetPrice(params: {
  type: string;
  ticker?: string | null;
  isin?: string | null;
  scrapeUrl?: string | null;
}): Promise<PriceResult> {
  const { type, ticker, isin, scrapeUrl } = params;

  // Try direct ticker first (fastest)
  if (ticker && type !== "FUND") {
    try {
      const result = await fetchYahooPrice(ticker);
      if (result.price !== null) return result;
    } catch {
      // fall through
    }
  }

  // Try ISIN search on Yahoo Finance (works for ETFs and some funds)
  if (isin) {
    try {
      const result = await fetchYahooPriceByISIN(isin);
      if (result.price !== null) return result;
    } catch {
      // fall through
    }
  }

  // Fallback: scrape provided URL
  if (scrapeUrl) {
    return await scrapePrice(scrapeUrl);
  }

  return {
    price: null,
    currency: "EUR",
    error: "No se pudo obtener el precio. Proporciona un ticker, ISIN o URL de scraping válidos.",
  };
}

async function fetchYahooPrice(symbol: string): Promise<PriceResult> {
  const quote = await yf.quote(symbol, {}, { validateResult: false });
  const price = (quote as Record<string, unknown>)?.regularMarketPrice as number | null ?? null;
  const currency = (quote as Record<string, unknown>)?.currency as string ?? "EUR";
  return { price, currency };
}

async function fetchYahooPriceByISIN(isin: string): Promise<PriceResult> {
  const results = await yf.search(isin, {}, { validateResult: false });
  const quotes = (results as Record<string, unknown>)?.quotes as Array<Record<string, unknown>> | undefined;
  if (quotes && quotes.length > 0) {
    const first = quotes[0];
    if (first?.symbol) {
      return await fetchYahooPrice(first.symbol as string);
    }
  }
  return { price: null, currency: "EUR", error: `ISIN ${isin} no encontrado en Yahoo Finance` };
}

async function scrapePrice(url: string): Promise<PriceResult> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
      },
    });

    if (!response.ok) {
      return { price: null, currency: "EUR", error: `HTTP ${response.status}` };
    }

    const html = await response.text();
    const $ = load(html);
    const price = extractPriceFromHTML($, url);

    if (price !== null) {
      return { price, currency: "EUR" };
    }

    return { price: null, currency: "EUR", error: "No se pudo extraer el precio de la página" };
  } catch (err) {
    return {
      price: null,
      currency: "EUR",
      error: err instanceof Error ? err.message : "Error de scraping",
    };
  }
}

function extractPriceFromHTML($: ReturnType<typeof load>, url: string): number | null {
  // Morningstar
  if (url.includes("morningstar")) {
    for (const sel of ['[data-test="nav-value"]', ".price__value", ".sal-mip-quote-value"]) {
      const price = parsePrice($(sel).first().text().trim());
      if (price !== null) return price;
    }
  }

  // Investing.com
  if (url.includes("investing.com")) {
    for (const sel of ['[data-test="instrument-price-last"]', ".text-5xl", "#last_last"]) {
      const price = parsePrice($(sel).first().text().trim());
      if (price !== null) return price;
    }
  }

  // Finanzas.com / Expansión
  if (url.includes("finanzas.com") || url.includes("expansion.com")) {
    for (const sel of [".cotizacion", ".cotiz", ".valor-actual", "#cotizacion"]) {
      const price = parsePrice($(sel).first().text().trim());
      if (price !== null) return price;
    }
  }

  // Generic: meta tags
  const metaPrice = $('meta[property="product:price:amount"]').attr("content");
  if (metaPrice) {
    const price = parsePrice(metaPrice);
    if (price !== null) return price;
  }

  return null;
}

function parsePrice(text: string): number | null {
  if (!text) return null;
  let cleaned = text.replace(/[€$£%\s]/g, "");
  // European format: 1.234,56 → 1234.56
  if (/\d{1,3}\.\d{3}/.test(cleaned)) {
    cleaned = cleaned.replace(/\./g, "").replace(",", ".");
  } else {
    cleaned = cleaned.replace(",", ".");
  }
  const match = cleaned.match(/\d+\.?\d*/);
  if (!match) return null;
  const num = parseFloat(match[0]);
  return isNaN(num) ? null : num;
}
