export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

function isWithinWindow(
  startAt: Date | null,
  endAt: Date | null,
  now: Date
) {
  const validStart = !startAt || startAt <= now;
  const validEnd = !endAt || endAt >= now;

  return validStart && validEnd;
}

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

    const promotion = promotions.find((item) =>
      isWithinWindow(item.startAt, item.endAt, now)
    );

    if (promotion) {
      return NextResponse.json({
        success: true,
        promotion: {
          title: promotion.title,
          minSubtotal: Number(promotion.minSubtotal || 0),
          freeDelivery: true,
          requiresCode: false,
          code: "",
        },
      });
    }

    const coupons = await prisma.deliveryCoupon.findMany({
      where: {
        isActive: true,
        discountType: "free_delivery",
      },
      orderBy: [
        {
          isFeatured: "desc",
        },
        {
          createdAt: "desc",
        },
      ],
      take: 20,
    });

    const coupon = coupons.find((item) => {
      const validWindow = isWithinWindow(item.startAt, item.endAt, now);
      const validUses =
        item.maxUses === null || item.usedCount < item.maxUses;

      return validWindow && validUses;
    });

    if (coupon) {
      return NextResponse.json({
        success: true,
        promotion: {
          title: coupon.featuredTitle || "Free Delivery",
          minSubtotal: Number(coupon.minSubtotal || 0),
          freeDelivery: true,
          requiresCode: true,
          code: coupon.code,
        },
      });
    }

    return NextResponse.json({
      success: true,
      promotion: null,
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
