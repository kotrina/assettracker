import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const { name, type, ticker, isin, shares, avgBuyPrice, currency, scrapeUrl } = body;

  const existing = await prisma.asset.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!existing) {
    return NextResponse.json({ error: "Activo no encontrado" }, { status: 404 });
  }

  const asset = await prisma.asset.update({
    where: { id },
    data: {
      name: name ?? existing.name,
      type: type ?? existing.type,
      ticker: ticker !== undefined ? ticker || null : existing.ticker,
      isin: isin !== undefined ? isin || null : existing.isin,
      shares: shares !== undefined ? (shares ? parseFloat(shares) : null) : existing.shares,
      avgBuyPrice: avgBuyPrice !== undefined ? parseFloat(avgBuyPrice) : existing.avgBuyPrice,
      currency: currency ?? existing.currency,
      scrapeUrl: scrapeUrl !== undefined ? scrapeUrl || null : existing.scrapeUrl,
    },
  });

  return NextResponse.json(asset);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { id } = await params;

  const existing = await prisma.asset.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!existing) {
    return NextResponse.json({ error: "Activo no encontrado" }, { status: 404 });
  }

  await prisma.asset.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
