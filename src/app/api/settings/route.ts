import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const settings = await prisma.settings.upsert({
    where: { userId: session.user.id },
    create: { userId: session.user.id, updateFrequency: 60 },
    update: {},
  });

  return NextResponse.json({ ...settings, email: session.user.email });
}

export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const body = await request.json();
  const { updateFrequency } = body;

  if (!updateFrequency || updateFrequency < 1) {
    return NextResponse.json({ error: "Frecuencia inválida" }, { status: 400 });
  }

  const settings = await prisma.settings.upsert({
    where: { userId: session.user.id },
    create: { userId: session.user.id, updateFrequency: parseInt(updateFrequency) },
    update: { updateFrequency: parseInt(updateFrequency) },
  });

  return NextResponse.json({ ...settings, email: session.user.email });
}
