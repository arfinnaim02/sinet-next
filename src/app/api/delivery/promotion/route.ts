export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

export async function GET() {
  try {
    const now = new Date();

    const promotions = await prisma.deliveryPromotion.findMany({
      where: {
        isActive: true,
        freeDelivery: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 20,
    });

    const promotion = promotions.find((item) => {
      const validStart = !item.startAt || item.startAt <= now;
      const validEnd = !item.endAt || item.endAt >= now;

      return validStart && validEnd;
    });

    if (!promotion) {
      return NextResponse.json({
        success: true,
        promotion: null,
      });
    }

    return NextResponse.json({
      success: true,
      promotion: {
        title: promotion.title,
        minSubtotal: Number(promotion.minSubtotal || 0),
        freeDelivery: promotion.freeDelivery,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message:
          error?.message || "Failed to load delivery promotion.",
      },
      { status: 500 }
    );
  }
}
