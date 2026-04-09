import { Resend } from "resend";
import { render } from "@react-email/render";
import PortfolioReport, { AssetRow } from "@/emails/PortfolioReport";

const resend = new Resend(process.env.RESEND_API_KEY);

export interface SendReportParams {
  userName: string;
  userEmail: string;
  assets: AssetRow[];
}

export async function sendPortfolioReport({
  userName,
  userEmail,
  assets,
}: SendReportParams): Promise<{ success: boolean; error?: string }> {
  if (!process.env.RESEND_API_KEY) {
    return { success: false, error: "RESEND_API_KEY no configurada" };
  }

  const generatedAt = new Date().toLocaleString("es-ES", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Madrid",
  });

  const valued = assets.filter((a) => a.shares != null && a.currentPrice != null);
  const totalValue = valued.reduce((s, a) => s + a.shares! * a.currentPrice!, 0);
  const totalCost = assets
    .filter((a) => a.shares != null)
    .reduce((s, a) => s + a.shares! * a.avgBuyPrice, 0);
  const totalProfit = totalValue - totalCost;
  const totalPct = totalCost > 0 ? (totalProfit / totalCost) * 100 : null;

  const currency = assets[0]?.currency ?? "EUR";
  const sym = currency === "EUR" ? "€" : currency === "USD" ? "$" : "£";
  const sign = totalProfit >= 0 ? "+" : "";

  const subject = `📈 Cartera: ${totalValue.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${sym}${totalPct != null ? ` · ${sign}${totalPct.toFixed(2)}%` : ""}`;

  const html = await render(
    PortfolioReport({ userName, userEmail, assets, generatedAt })
  );

  try {
    const from = process.env.RESEND_FROM_EMAIL ?? "Asset Tracker <noreply@assettracker.app>";
    const { error } = await resend.emails.send({
      from,
      to: userEmail,
      subject,
      html,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Error desconocido al enviar email",
    };
  }
}
