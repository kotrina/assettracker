import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendPortfolioReport } from "@/lib/send-report";

// Manual "Forzar envío" — uses saved prices, no new API calls
export async function POST() {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const assets = await prisma.asset.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  if (assets.length === 0) {
    return NextResponse.json({ error: "No tienes activos para enviar" }, { status: 400 });
  }

  const result = await sendPortfolioReport({
    userName: session.user.name ?? session.user.email,
    userEmail: session.user.email,
    assets: assets.map((a) => ({
      name: a.name,
      type: a.type,
      ticker: a.ticker,
      isin: a.isin,
      shares: a.shares,
      avgBuyPrice: a.avgBuyPrice,
      currentPrice: a.currentPrice,
      currency: a.currency,
    })),
  });

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
