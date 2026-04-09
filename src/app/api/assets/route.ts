import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const assets = await prisma.asset.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(assets);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const body = await request.json();
  const { name, type, ticker, isin, shares, avgBuyPrice, currency, scrapeUrl } = body;

  if (!name || !type || avgBuyPrice === undefined) {
    return NextResponse.json({ error: "Faltan campos obligatorios" }, { status: 400 });
  }

  const asset = await prisma.asset.create({
    data: {
      userId: session.user.id,
      name,
      type,
      ticker: ticker || null,
      isin: isin || null,
      shares: shares ? parseFloat(shares) : null,
      avgBuyPrice: parseFloat(avgBuyPrice),
      currency: currency || "EUR",
      scrapeUrl: scrapeUrl || null,
    },
  });

  return NextResponse.json(asset, { status: 201 });
}
