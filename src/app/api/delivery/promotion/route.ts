export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

export async function GET() {
  const promotion = await prisma.deliveryPromotion.findFirst({
    where: {
      isActive: true,
      freeDelivery: true,
    },
  });

  return NextResponse.json({
    success: true,
    promotion: promotion
      ? {
          title: promotion.title,
          minSubtotal: Number(promotion.minSubtotal || 0),
        }
      : null,
  });
}
