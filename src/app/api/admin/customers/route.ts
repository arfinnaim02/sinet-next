export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";

async function getPrisma() {
  const { prisma } = await import("../../../../lib/prisma");
  return prisma;
}

const allowedStatuses = [
  "pending",
  "accepted",
  "preparing",
  "on_the_way",
  "completed",
  "cancelled",
];

function toNumber(value: any) {
  return Number(value || 0);
}

function toDate(value: any) {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function normalizePhone(value: string | null | undefined) {
  return String(value || "")
    .replace(/\s+/g, "")
    .replace(/[^\d+]/g, "")
    .trim();
}

function serializeOrder(order: any) {
  return {
    id: order.id,
    status: order.status,
    createdAt: toDate(order.createdAt),
    customerName: order.customerName || "",
    customerPhone: order.customerPhone || "",
    customerNote: order.customerNote || "",
    paymentMethod: order.paymentMethod || "",
    addressLabel: order.addressLabel || "",
    addressExtra: order.addressExtra || "",
    distanceKm: toNumber(order.distanceKm),
    subtotal: toNumber(order.subtotal),
    deliveryFee: toNumber(order.deliveryFee),
    couponCode: order.couponCode || "",
    couponDiscount: toNumber(order.couponDiscount),
    total: toNumber(order.total),
    promoTitle: order.promoTitle || "",
    promoFreeDelivery: Boolean(order.promoFreeDelivery),
    items: (order.items || []).map((item: any) => ({
      id: item.id,
      name: item.name || "",
      qty: Number(item.qty || 0),
      unitPrice: toNumber(item.unitPrice),
      addonsTotal: toNumber(item.addonsTotal),
      addonSnapshots: (item.addonSnapshots || []).map((addon: any) => ({
        id: addon.id,
        groupName: addon.groupName || "",
        optionName: addon.optionName || "",
        optionPrice: toNumber(addon.optionPrice),
      })),
    })),
  };
}

function calculateStats(orders: any[]) {
  const orderCount = orders.length;
  const completedOrderCount = orders.filter((order) => order.status === "completed").length;
  const cancelledOrderCount = orders.filter((order) => order.status === "cancelled").length;

  const activeOrderCount = orders.filter(
    (order) => order.status !== "completed" && order.status !== "cancelled"
  ).length;

  const totalSpent = orders
    .filter((order) => order.status !== "cancelled")
    .reduce((sum, order) => sum + toNumber(order.total), 0);

  const lastOrderAt =
    orders.length > 0
      ? orders
          .map((order) => new Date(order.createdAt).getTime())
          .filter((time) => !Number.isNaN(time))
          .sort((a, b) => b - a)[0]
      : null;

  return {
    orderCount,
    completedOrderCount,
    cancelledOrderCount,
    activeOrderCount,
    totalSpent,
    lastOrderAt: lastOrderAt ? new Date(lastOrderAt).toISOString() : null,
  };
}

async function buildCustomersResponse() {
  const prisma = await getPrisma();

  const [users, orders] = await Promise.all([
    prisma.user.findMany({
      include: {
        addresses: {
          orderBy: { createdAt: "desc" },
        },
        loyaltyRewards: {
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    }),

    prisma.deliveryOrder.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
            isActive: true,
            createdAt: true,
          },
        },
        items: {
          include: {
            addonSnapshots: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const ordersByUserId = new Map<string, any[]>();

  for (const order of orders) {
    if (!order.userId) continue;

    const existing = ordersByUserId.get(order.userId) || [];
    existing.push(order);
    ordersByUserId.set(order.userId, existing);
  }

  const registeredCustomers = users.map((user: any) => {
    const customerOrders = ordersByUserId.get(user.id) || [];
    const serializedOrders = customerOrders.map(serializeOrder);
    const stats = calculateStats(serializedOrders);

    return {
      id: user.id,
      type: "registered",
      name: user.name || "",
      email: user.email || "",
      phone: user.phone || "",
      role: user.role || "customer",
      isActive: Boolean(user.isActive),
      createdAt: toDate(user.createdAt),
      updatedAt: toDate(user.updatedAt),
      addresses: (user.addresses || []).map((address: any) => ({
        id: address.id,
        label: address.label || "",
        addressLabel: address.addressLabel || "",
        addressExtra: address.addressExtra || "",
        lat: toNumber(address.lat),
        lng: toNumber(address.lng),
        distanceKm: toNumber(address.distanceKm),
        isDefault: Boolean(address.isDefault),
        createdAt: toDate(address.createdAt),
      })),
      loyaltyRewards: (user.loyaltyRewards || []).map((reward: any) => ({
        id: reward.id,
        issuedMonth: reward.issuedMonth || "",
        orderCount: Number(reward.orderCount || 0),
        couponCode: reward.couponCode || "",
        rewardPercent: Number(reward.rewardPercent || 0),
        createdAt: toDate(reward.createdAt),
      })),
      ...stats,
      orders: serializedOrders,
    };
  });

  const guestGroups = new Map<string, any[]>();

  for (const order of orders) {
    if (order.userId) continue;

    const phone = normalizePhone(order.customerPhone);
    const name = String(order.customerName || "").trim().toLowerCase();
    const key = phone ? `guest-phone:${phone}` : `guest:${name}:${order.addressLabel}`;

    const existing = guestGroups.get(key) || [];
    existing.push(order);
    guestGroups.set(key, existing);
  }

  const guestCustomers = Array.from(guestGroups.entries()).map(([key, groupOrders]) => {
    const firstOrder = groupOrders[0];
    const serializedOrders = groupOrders.map(serializeOrder);
    const stats = calculateStats(serializedOrders);

    return {
      id: key,
      type: "guest",
      name: firstOrder?.customerName || "Guest Customer",
      email: "",
      phone: firstOrder?.customerPhone || "",
      role: "guest",
      isActive: true,
      createdAt: serializedOrders[serializedOrders.length - 1]?.createdAt || null,
      updatedAt: null,
      addresses: [],
      loyaltyRewards: [],
      ...stats,
      orders: serializedOrders,
    };
  });

  const customers = [...registeredCustomers, ...guestCustomers].sort((a, b) => {
    const aTime = a.lastOrderAt ? new Date(a.lastOrderAt).getTime() : 0;
    const bTime = b.lastOrderAt ? new Date(b.lastOrderAt).getTime() : 0;
    return bTime - aTime;
  });

  return {
    success: true,
    summary: {
      totalCustomers: customers.length,
      registeredCustomers: registeredCustomers.length,
      guestCustomers: guestCustomers.length,
      totalOrders: orders.length,
      totalRevenue: customers.reduce((sum, customer) => sum + customer.totalSpent, 0),
    },
    customers,
  };
}

export async function GET() {
  try {
    const payload = await buildCustomersResponse();
    return NextResponse.json(payload);
  } catch (error: any) {
    console.error("Admin customers API error:", error);

    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Failed to load customers.",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const prisma = await getPrisma();
    const body = await request.json();
    const action = body.action;

    if (action === "updateCustomer") {
      const customerId = String(body.customerId || "");
      const name = String(body.name || "").trim();
      const email = String(body.email || "").trim().toLowerCase();
      const phone = String(body.phone || "").trim();
      const isActive = Boolean(body.isActive);

      if (!customerId) {
        return NextResponse.json(
          { success: false, message: "Customer ID is required." },
          { status: 400 }
        );
      }

      if (!name) {
        return NextResponse.json(
          { success: false, message: "Customer name is required." },
          { status: 400 }
        );
      }

      if (!email) {
        return NextResponse.json(
          { success: false, message: "Customer email is required." },
          { status: 400 }
        );
      }

      await prisma.user.update({
        where: { id: customerId },
        data: {
          name,
          email,
          phone,
          isActive,
        },
      });

      return NextResponse.json({
        success: true,
        message: "Customer updated successfully.",
      });
    }

    if (action === "toggleCustomerActive") {
      const customerId = String(body.customerId || "");
      const isActive = Boolean(body.isActive);

      if (!customerId) {
        return NextResponse.json(
          { success: false, message: "Customer ID is required." },
          { status: 400 }
        );
      }

      await prisma.user.update({
        where: { id: customerId },
        data: { isActive },
      });

      return NextResponse.json({
        success: true,
        message: isActive ? "Customer activated." : "Customer deactivated.",
      });
    }

    if (action === "updateOrderStatus") {
      const orderId = String(body.orderId || "");
      const status = String(body.status || "");

      if (!orderId || !allowedStatuses.includes(status)) {
        return NextResponse.json(
          { success: false, message: "Valid order ID and status are required." },
          { status: 400 }
        );
      }

      await prisma.deliveryOrder.update({
        where: { id: orderId },
        data: { status },
      });

      return NextResponse.json({
        success: true,
        message: "Order status updated.",
      });
    }

    return NextResponse.json(
      { success: false, message: "Unknown update action." },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("Admin customers PATCH error:", error);

    const message =
      error?.code === "P2002"
        ? "This email is already used by another customer."
        : error?.message || "Update failed.";

    return NextResponse.json(
      {
        success: false,
        message,
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const prisma = await getPrisma();
    const body = await request.json();
    const action = body.action;

    if (action === "deleteOrders") {
      const orderIds = Array.isArray(body.orderIds)
        ? body.orderIds.map((id: any) => String(id)).filter(Boolean)
        : [];

      if (orderIds.length === 0) {
        return NextResponse.json(
          { success: false, message: "No order IDs provided." },
          { status: 400 }
        );
      }

      await prisma.deliveryOrder.deleteMany({
        where: {
          id: {
            in: orderIds,
          },
        },
      });

      return NextResponse.json({
        success: true,
        message: `${orderIds.length} order(s) deleted.`,
      });
    }

    if (action === "deleteCustomer") {
      const customerId = String(body.customerId || "");

      if (!customerId) {
        return NextResponse.json(
          { success: false, message: "Customer ID is required." },
          { status: 400 }
        );
      }

      await prisma.user.delete({
        where: { id: customerId },
      });

      return NextResponse.json({
        success: true,
        message: "Customer deleted. Existing orders remain but become guest orders.",
      });
    }

    return NextResponse.json(
      { success: false, message: "Unknown delete action." },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("Admin customers DELETE error:", error);

    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Delete failed.",
      },
      { status: 500 }
    );
  }
}