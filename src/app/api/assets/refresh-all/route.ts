import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fetchAssetPrice } from "@/lib/price-fetcher";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const assets = await prisma.asset.findMany({
    where: { userId: session.user.id },
  });

  const results = await Promise.allSettled(
    assets.map(async (asset) => {
      const result = await fetchAssetPrice({
        type: asset.type,
        ticker: asset.ticker,
        isin: asset.isin,
        scrapeUrl: asset.scrapeUrl,
      });

      if (result.price !== null) {
        return prisma.asset.update({
          where: { id: asset.id },
          data: {
            currentPrice: result.price,
            currency: result.currency,
            lastUpdated: new Date(),
          },
        });
      }
      return null;
    })
  );

  const updated = results.filter(
    (r) => r.status === "fulfilled" && r.value !== null
  ).length;

  return NextResponse.json({ updated, total: assets.length });
}
