export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

export async function GET() {
  try {
    const now = new Date();

    const promotion = await prisma.deliveryPromotion.findFirst({
      where: {
        isActive: true,
        freeDelivery: true,
        AND: [
          {
            OR: [
              { startAt: null },
              { startAt: { lte: now } },
            ],
          },
          {
            OR: [
              { endAt: null },
              { endAt: { gte: now } },
            ],
          },
        ],
      },
      orderBy: {
        createdAt: "desc",
      },
    });

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
        AND: [
          {
            OR: [
              { startAt: null },
              { startAt: { lte: now } },
            ],
          },
          {
            OR: [
              { endAt: null },
              { endAt: { gte: now } },
            ],
          },
        ],
      },
      orderBy: [
        { isFeatured: "desc" },
        { createdAt: "desc" },
      ],
      take: 20,
    });

    const coupon = coupons.find(
      (item) => item.maxUses === null || item.usedCount < item.maxUses
    );

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
        message: error?.message || "Failed to load delivery promotion.",
      },
      { status: 500 }
    );
  }
}
