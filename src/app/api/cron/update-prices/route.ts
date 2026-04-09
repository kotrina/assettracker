import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchAssetPrice } from "@/lib/price-fetcher";
import { sendPortfolioReport } from "@/lib/send-report";

// Called by Vercel Cron Jobs
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 1. Fetch all assets grouped by user
  const allAssets = await prisma.asset.findMany({
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  // 2. Update prices for all assets
  const updateResults = await Promise.allSettled(
    allAssets.map(async (asset) => {
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

  const updated = updateResults.filter(
    (r) => r.status === "fulfilled" && r.value !== null
  ).length;

  // 3. Send portfolio report email to each user
  // Group assets by userId
  const userMap = new Map<
    string,
    { name: string; email: string; assets: typeof allAssets }
  >();

  for (const asset of allAssets) {
    if (!asset.user.email) continue;
    if (!userMap.has(asset.userId)) {
      userMap.set(asset.userId, {
        name: asset.user.name ?? asset.user.email,
        email: asset.user.email,
        assets: [],
      });
    }
    userMap.get(asset.userId)!.assets.push(asset);
  }

  // Fetch updated prices from DB and send emails
  const emailResults: { userId: string; success: boolean; error?: string }[] = [];

  for (const [userId, { name, email, assets }] of userMap.entries()) {
    // Reload assets from DB to get the freshly updated prices
    const freshAssets = await prisma.asset.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    const result = await sendPortfolioReport({
      userName: name,
      userEmail: email,
      assets: freshAssets.map((a) => ({
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

    emailResults.push({ userId, ...result });
  }

  const emailsSent = emailResults.filter((r) => r.success).length;
  const emailErrors = emailResults
    .filter((r) => !r.success)
    .map((r) => r.error)
    .filter(Boolean);

  return NextResponse.json({
    message: `Actualizados ${updated} de ${allAssets.length} activos. Emails enviados: ${emailsSent}/${userMap.size}.`,
    updated,
    total: allAssets.length,
    emailsSent,
    emailErrors,
  });
}
