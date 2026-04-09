import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fetchAssetPrice } from "@/lib/price-fetcher";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { id } = await params;

  const asset = await prisma.asset.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!asset) {
    return NextResponse.json({ error: "Activo no encontrado" }, { status: 404 });
  }

  const result = await fetchAssetPrice({
    type: asset.type,
    ticker: asset.ticker,
    isin: asset.isin,
    scrapeUrl: asset.scrapeUrl,
  });

  if (result.price !== null) {
    const updated = await prisma.asset.update({
      where: { id },
      data: {
        currentPrice: result.price,
        currency: result.currency,
        lastUpdated: new Date(),
      },
    });
    return NextResponse.json({ asset: updated, success: true });
  }

  return NextResponse.json(
    { error: result.error ?? "No se pudo obtener el precio", success: false },
    { status: 422 }
  );
}
