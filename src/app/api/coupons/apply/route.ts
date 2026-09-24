export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

function normalizeCode(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, "");
}

function calculateDiscount(
  coupon: any,
  subtotal: number,
  deliveryFee: number
) {
  if (coupon.discountType === "percent") {
    return Math.min(
      subtotal,
      (subtotal * Number(coupon.discountValue || 0)) / 100
    );
  }

  if (coupon.discountType === "fixed") {
    return Math.min(
      subtotal,
      Number(coupon.discountValue || 0)
    );
  }

  if (coupon.discountType === "free_delivery") {
    return Math.max(0, deliveryFee);
  }

  return 0;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const code = normalizeCode(String(body.code || ""));
    const subtotal = Math.max(0, Number(body.subtotal || 0));
    const deliveryFee = Math.max(0, Number(body.deliveryFee || 0));

    if (!code) {
      return NextResponse.json(
        {
          success: false,
          message: "Coupon code is required.",
        },
        { status: 400 }
      );
    }

    const coupon = await prisma.deliveryCoupon.findUnique({
      where: { code },
    });

    if (!coupon || !coupon.isActive) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid or inactive coupon.",
        },
        { status: 400 }
      );
    }

    const now = new Date();

    if (coupon.startAt && now < coupon.startAt) {
      return NextResponse.json(
        {
          success: false,
          message: "This coupon is not active yet.",
        },
        { status: 400 }
      );
    }

    if (coupon.endAt && now > coupon.endAt) {
      return NextResponse.json(
        {
          success: false,
          message: "This coupon has expired.",
        },
        { status: 400 }
      );
    }

    if (
      coupon.maxUses !== null &&
      coupon.usedCount >= coupon.maxUses
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "This coupon usage limit has been reached.",
        },
        { status: 400 }
      );
    }

    const minimumSubtotal = Math.max(
      0,
      Number(coupon.minSubtotal || 0)
    );

    const remainingAmount = Math.max(
      0,
      minimumSubtotal - subtotal
    );

    /*
     * IMPORTANT:
     *
     * The coupon is valid, but the customer has not yet
     * reached the minimum order amount.
     *
     * We return HTTP 200 + eligible:false so the checkout
     * can show a friendly warning instead of treating the
     * coupon as invalid.
     */
    if (remainingAmount > 0) {
      return NextResponse.json({
        success: true,
        eligible: false,

        message:
          coupon.discountType === "free_delivery"
            ? `Add €${remainingAmount.toFixed(
                2
              )} more to unlock free delivery.`
            : `Add €${remainingAmount.toFixed(
                2
              )} more to use this coupon.`,

        minimumSubtotal,
        remainingAmount,

        coupon: {
          code: coupon.code,
          discountType: coupon.discountType,
          discountValue: Number(coupon.discountValue || 0),
          discount: 0,
          minimumSubtotal,
        },
      });
    }

    const discount = calculateDiscount(
      coupon,
      subtotal,
      deliveryFee
    );

    return NextResponse.json({
      success: true,
      eligible: true,

      message:
        coupon.discountType === "free_delivery"
          ? "Free delivery unlocked."
          : "Coupon applied successfully.",

      minimumSubtotal,
      remainingAmount: 0,

      coupon: {
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: Number(coupon.discountValue || 0),
        discount,
        minimumSubtotal,
      },
    });
  } catch (error: any) {
    console.error("Coupon apply error:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error?.message || "Failed to apply coupon.",
      },
      { status: 500 }
    );
  }
}