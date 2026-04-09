import {
  Body,
  Column,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Row,
  Section,
  Text,
} from "@react-email/components";

export interface AssetRow {
  name: string;
  type: string;
  ticker: string | null;
  isin: string | null;
  shares: number | null;
  avgBuyPrice: number;
  currentPrice: number | null;
  currency: string;
}

interface PortfolioReportProps {
  userName: string;
  userEmail: string;
  assets: AssetRow[];
  generatedAt: string;
}

const CURRENCY_SYMBOL: Record<string, string> = { EUR: "€", USD: "$", GBP: "£" };
const TYPE_LABELS: Record<string, string> = {
  STOCK: "Acción", ETF: "ETF", FUND: "Fondo", CRYPTO: "Cripto", OTHER: "Otro",
};

function fmt(value: number, currency = "EUR"): string {
  const sym = CURRENCY_SYMBOL[currency] ?? currency;
  return `${value.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${sym}`;
}

function fmtPct(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

export default function PortfolioReport({
  userName,
  assets,
  generatedAt,
}: PortfolioReportProps) {
  // Portfolio calculations
  const valued = assets.filter((a) => a.shares != null && a.currentPrice != null);
  const totalValue = valued.reduce((s, a) => s + a.shares! * a.currentPrice!, 0);
  const totalCost = assets
    .filter((a) => a.shares != null)
    .reduce((s, a) => s + a.shares! * a.avgBuyPrice, 0);
  const totalProfit = valued.reduce((s, a) => s + a.shares! * (a.currentPrice! - a.avgBuyPrice), 0);
  const totalPct = totalCost > 0 ? (totalProfit / totalCost) * 100 : null;
  const mainCurrency = assets[0]?.currency ?? "EUR";

  const profitColor = totalProfit >= 0 ? "#059669" : "#dc2626";

  return (
    <Html>
      <Head />
      <Preview>
        Resumen de cartera — {fmt(totalValue, mainCurrency)} · {totalPct !== null ? fmtPct(totalPct) : "—"}
      </Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>

          {/* Header */}
          <Section style={styles.header}>
            <Row>
              <Column>
                <div style={styles.logoWrap}>
                  <Text style={styles.logoText}>📈</Text>
                </div>
                <Heading style={styles.appName}>Asset Tracker</Heading>
                <Text style={styles.subtitle}>Resumen de cartera</Text>
              </Column>
            </Row>
          </Section>

          {/* Greeting */}
          <Section style={styles.section}>
            <Text style={styles.greeting}>Hola, {userName} 👋</Text>
            <Text style={styles.body2}>
              Aquí tienes el resumen actualizado de tu cartera. Los valores reflejan los precios del mercado al momento del envío.
            </Text>
          </Section>

          {/* Summary cards */}
          <Section style={styles.section}>
            <Row>
              <Column style={styles.card}>
                <Text style={styles.cardLabel}>Valor total</Text>
                <Text style={styles.cardValue}>{fmt(totalValue, mainCurrency)}</Text>
              </Column>
              <Column style={{ width: "8px" }} />
              <Column style={styles.card}>
                <Text style={styles.cardLabel}>Coste total</Text>
                <Text style={styles.cardValue}>{fmt(totalCost, mainCurrency)}</Text>
              </Column>
            </Row>
            <Row style={{ marginTop: "8px" }}>
              <Column style={styles.card}>
                <Text style={styles.cardLabel}>Beneficio / Pérdida</Text>
                <Text style={{ ...styles.cardValue, color: profitColor }}>
                  {totalProfit >= 0 ? "+" : ""}{fmt(totalProfit, mainCurrency)}
                </Text>
              </Column>
              <Column style={{ width: "8px" }} />
              <Column style={styles.card}>
                <Text style={styles.cardLabel}>Rentabilidad total</Text>
                <Text style={{ ...styles.cardValue, color: profitColor }}>
                  {totalPct !== null ? fmtPct(totalPct) : "—"}
                </Text>
              </Column>
            </Row>
          </Section>

          <Hr style={styles.hr} />

          {/* Asset table */}
          <Section style={styles.section}>
            <Heading as="h2" style={styles.tableTitle}>
              Detalle de activos ({assets.length})
            </Heading>

            {/* Table header */}
            <Row style={styles.tableHeader}>
              <Column style={{ ...styles.th, width: "35%" }}>Activo</Column>
              <Column style={{ ...styles.th, width: "12%", textAlign: "right" }}>Títulos</Column>
              <Column style={{ ...styles.th, width: "15%", textAlign: "right" }}>P. actual</Column>
              <Column style={{ ...styles.th, width: "13%", textAlign: "right" }}>Var. %</Column>
              <Column style={{ ...styles.th, width: "13%", textAlign: "right" }}>Beneficio</Column>
              <Column style={{ ...styles.th, width: "12%", textAlign: "right" }}>Valor</Column>
            </Row>

            {/* Asset rows */}
            {assets.map((asset, i) => {
              const pct =
                asset.currentPrice != null
                  ? ((asset.currentPrice - asset.avgBuyPrice) / asset.avgBuyPrice) * 100
                  : null;
              const profit =
                asset.shares != null && asset.currentPrice != null
                  ? asset.shares * (asset.currentPrice - asset.avgBuyPrice)
                  : null;
              const posValue =
                asset.shares != null && asset.currentPrice != null
                  ? asset.shares * asset.currentPrice
                  : null;
              const pctColor = pct != null ? (pct >= 0 ? "#059669" : "#dc2626") : "#9ca3af";
              const rowBg = i % 2 === 0 ? "#ffffff" : "#f9fafb";

              return (
                <Row key={asset.name + i} style={{ ...styles.tableRow, backgroundColor: rowBg }}>
                  <Column style={{ ...styles.td, width: "35%" }}>
                    <Text style={styles.assetName}>{asset.name}</Text>
                    <Text style={styles.assetSub}>
                      {TYPE_LABELS[asset.type] ?? asset.type}
                      {(asset.ticker || asset.isin) ? ` · ${asset.ticker ?? asset.isin}` : ""}
                    </Text>
                  </Column>
                  <Column style={{ ...styles.td, width: "12%", textAlign: "right" }}>
                    <Text style={styles.tdText}>
                      {asset.shares != null
                        ? asset.shares.toLocaleString("es-ES", { maximumFractionDigits: 4 })
                        : "—"}
                    </Text>
                  </Column>
                  <Column style={{ ...styles.td, width: "15%", textAlign: "right" }}>
                    <Text style={styles.tdText}>
                      {asset.currentPrice != null ? fmt(asset.currentPrice, asset.currency) : "—"}
                    </Text>
                  </Column>
                  <Column style={{ ...styles.td, width: "13%", textAlign: "right" }}>
                    <Text style={{ ...styles.tdText, color: pctColor, fontWeight: "600" }}>
                      {pct != null ? fmtPct(pct) : "—"}
                    </Text>
                  </Column>
                  <Column style={{ ...styles.td, width: "13%", textAlign: "right" }}>
                    <Text style={{ ...styles.tdText, color: profit != null ? (profit >= 0 ? "#059669" : "#dc2626") : "#9ca3af" }}>
                      {profit != null
                        ? `${profit >= 0 ? "+" : ""}${fmt(profit, asset.currency)}`
                        : "—"}
                    </Text>
                  </Column>
                  <Column style={{ ...styles.td, width: "12%", textAlign: "right" }}>
                    <Text style={styles.tdText}>
                      {posValue != null ? fmt(posValue, asset.currency) : "—"}
                    </Text>
                  </Column>
                </Row>
              );
            })}
          </Section>

          <Hr style={styles.hr} />

          {/* Footer */}
          <Section style={styles.footer}>
            <Text style={styles.footerText}>
              Generado el {generatedAt} · Asset Tracker
            </Text>
            <Text style={styles.footerNote}>
              Este email se envía automáticamente desde tu aplicación Asset Tracker. Los datos mostrados provienen de Yahoo Finance y pueden tener un pequeño retardo.
            </Text>
          </Section>

        </Container>
      </Body>
    </Html>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
  body: {
    backgroundColor: "#f1f5f9",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    margin: 0,
    padding: "24px 0",
  },
  container: {
    maxWidth: "680px",
    margin: "0 auto",
    backgroundColor: "#ffffff",
    borderRadius: "16px",
    overflow: "hidden",
    boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
  },
  header: {
    backgroundColor: "#4f46e5",
    padding: "32px 40px 28px",
    textAlign: "center" as const,
  },
  logoWrap: {
    display: "inline-block",
    marginBottom: "8px",
  },
  logoText: {
    fontSize: "36px",
    margin: "0",
    lineHeight: "1",
  },
  appName: {
    color: "#ffffff",
    fontSize: "22px",
    fontWeight: "700",
    margin: "0 0 4px",
    letterSpacing: "-0.3px",
  },
  subtitle: {
    color: "#c7d2fe",
    fontSize: "13px",
    margin: "0",
  },
  section: {
    padding: "24px 40px",
  },
  greeting: {
    fontSize: "18px",
    fontWeight: "600",
    color: "#111827",
    margin: "0 0 8px",
  },
  body2: {
    fontSize: "14px",
    color: "#6b7280",
    margin: "0",
    lineHeight: "1.6",
  },
  card: {
    backgroundColor: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "10px",
    padding: "14px 18px",
    flex: 1,
  },
  cardLabel: {
    fontSize: "11px",
    color: "#94a3b8",
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
    margin: "0 0 4px",
    fontWeight: "600",
  },
  cardValue: {
    fontSize: "18px",
    fontWeight: "700",
    color: "#0f172a",
    margin: "0",
  },
  hr: {
    borderColor: "#f1f5f9",
    margin: "0 40px",
  },
  tableTitle: {
    fontSize: "15px",
    fontWeight: "600",
    color: "#374151",
    margin: "0 0 16px",
  },
  tableHeader: {
    backgroundColor: "#f8fafc",
    borderTop: "1px solid #e5e7eb",
    borderBottom: "1px solid #e5e7eb",
    padding: "0",
  },
  th: {
    fontSize: "11px",
    fontWeight: "600",
    color: "#9ca3af",
    textTransform: "uppercase" as const,
    letterSpacing: "0.04em",
    padding: "8px 6px",
  },
  tableRow: {
    borderBottom: "1px solid #f3f4f6",
  },
  td: {
    padding: "10px 6px",
    verticalAlign: "middle" as const,
  },
  tdText: {
    fontSize: "12px",
    color: "#374151",
    margin: "0",
  },
  assetName: {
    fontSize: "13px",
    fontWeight: "600",
    color: "#111827",
    margin: "0 0 2px",
  },
  assetSub: {
    fontSize: "11px",
    color: "#9ca3af",
    margin: "0",
  },
  footer: {
    padding: "20px 40px 28px",
    textAlign: "center" as const,
  },
  footerText: {
    fontSize: "12px",
    color: "#94a3b8",
    margin: "0 0 6px",
  },
  footerNote: {
    fontSize: "11px",
    color: "#cbd5e1",
    margin: "0",
    lineHeight: "1.5",
  },
};
