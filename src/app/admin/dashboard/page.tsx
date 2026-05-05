
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import Link from "next/link";
import { prisma } from "../../../lib/prisma";

type Props = {
  searchParams?: {
    start?: string;
    end?: string;
  };
};

function money(value: any) {
  return `€${Number(value || 0).toFixed(2)}`;
}

function formatDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function getDateRange(start?: string, end?: string) {
  const today = new Date();

  const fallbackStart = new Date(today);
  fallbackStart.setDate(today.getDate() - 6);
  fallbackStart.setHours(0, 0, 0, 0);

  const fallbackEnd = new Date(today);
  fallbackEnd.setHours(23, 59, 59, 999);

  const startDate = start ? new Date(`${start}T00:00:00`) : fallbackStart;
  const endDate = end ? new Date(`${end}T23:59:59`) : fallbackEnd;

  return { startDate, endDate };
}

function isCancelled(status: string) {
  return status === "cancelled";
}

export default async function AdminDashboardPage({ searchParams }: Props) {
  const { startDate, endDate } = getDateRange(
    searchParams?.start,
    searchParams?.end
  );

  const orderWhere = {
    createdAt: {
      gte: startDate,
      lte: endDate,
    },
  };

  const [
    categoryCount,
    menuItemCount,
    addonGroupCount,
    bannerCount,
    orders,
    reservations,
    recentOrders,
    topItems,
    contactCount,
    activeCoupons,
  ] = await Promise.all([
    prisma.category.count(),
    prisma.menuItem.count(),
    prisma.addonGroup.count(),
    prisma.heroBanner.count(),

    prisma.deliveryOrder.findMany({
      where: orderWhere,
      include: {
        items: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    }),

    prisma.reservation.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    }),

    prisma.deliveryOrder.findMany({
      orderBy: {
        createdAt: "desc",
      },
      take: 6,
      include: {
        items: true,
      },
    }),

    prisma.deliveryOrderItem.groupBy({
      by: ["name"],
      _sum: {
        qty: true,
      },
      orderBy: {
        _sum: {
          qty: "desc",
        },
      },
      take: 6,
    }),

    prisma.contactMessage.count(),

    prisma.deliveryCoupon.count({
      where: {
        isActive: true,
      },
    }),
  ]);

  const validOrders = orders.filter((order) => !isCancelled(order.status));

  const totalSales = validOrders.reduce(
    (sum, order) => sum + Number(order.total || 0),
    0
  );

  const totalDeliveryFee = validOrders.reduce(
    (sum, order) => sum + Number(order.deliveryFee || 0),
    0
  );

  const totalDiscount = validOrders.reduce(
    (sum, order) => sum + Number(order.couponDiscount || 0),
    0
  );

  const totalItemsSold = validOrders.reduce(
    (sum, order) =>
      sum + order.items.reduce((itemSum, item) => itemSum + Number(item.qty || 0), 0),
    0
  );

  const averageOrderValue =
    validOrders.length > 0 ? totalSales / validOrders.length : 0;

  const pendingOrders = orders.filter((order) => order.status === "pending").length;
  const completedOrders = orders.filter((order) => order.status === "completed").length;
  const cancelledOrders = orders.filter((order) => order.status === "cancelled").length;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayOrders = orders.filter((order) => {
    const created = new Date(order.createdAt);
    return created >= today && !isCancelled(order.status);
  });

  const todaySales = todayOrders.reduce(
    (sum, order) => sum + Number(order.total || 0),
    0
  );

  const quickCards = [
    { label: "Categories", value: categoryCount, href: "/admin/categories" },
    { label: "Menu Items", value: menuItemCount, href: "/admin/menu-items" },
    { label: "Addon Groups", value: addonGroupCount, href: "/admin/addons" },
    { label: "Hero Banners", value: bannerCount, href: "/admin/banners" },
    { label: "Active Coupons", value: activeCoupons, href: "/admin/coupons" },
    { label: "Messages", value: contactCount, href: "/admin/messages" },
  ];

  const kpis = [
    {
      label: "Total Sales",
      value: money(totalSales),
      note: "Non-cancelled orders",
    },
    {
      label: "Total Orders",
      value: orders.length,
      note: `${validOrders.length} valid orders`,
    },
    {
      label: "Today Sales",
      value: money(todaySales),
      note: `${todayOrders.length} order(s) today`,
    },
    {
      label: "Average Order",
      value: money(averageOrderValue),
      note: "Average order value",
    },
    {
      label: "Items Sold",
      value: totalItemsSold,
      note: "Total quantity sold",
    },
    {
      label: "Reservations",
      value: reservations.length,
      note: "Reservations in selected range",
    },
    {
      label: "Delivery Fees",
      value: money(totalDeliveryFee),
      note: "Collected delivery fees",
    },
    {
      label: "Discount Given",
      value: money(totalDiscount),
      note: "Coupon discounts",
    },
  ];

  return (
    <main className="min-h-screen bg-[#f4eee4]">
      <section className="relative overflow-hidden border-b border-[#ddcfba] bg-[#1b0e0a] px-5 py-10 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(215,184,117,0.2),transparent_35%),radial-gradient(circle_at_85%_30%,rgba(255,255,255,0.08),transparent_28%)]" />

        <div className="relative mx-auto max-w-7xl">
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[#d7b875]">
            Ravintola Sinet
          </p>

          <div className="mt-3 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="font-display text-4xl font-black sm:text-5xl">
                Admin Dashboard
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-white/70">
                Track sales, orders, reservations, coupons and menu performance.
              </p>
            </div>

            <form className="grid gap-3 rounded-3xl border border-white/10 bg-white/10 p-4 sm:grid-cols-[1fr_1fr_auto]">
              <input
                type="date"
                name="start"
                defaultValue={formatDate(startDate)}
                className="rounded-2xl border border-white/10 bg-white px-4 py-3 text-sm font-bold text-[#3b1f18]"
              />

              <input
                type="date"
                name="end"
                defaultValue={formatDate(endDate)}
                className="rounded-2xl border border-white/10 bg-white px-4 py-3 text-sm font-bold text-[#3b1f18]"
              />

              <button className="rounded-2xl bg-[#d7b875] px-5 py-3 text-sm font-black text-[#3b1f18]">
                Filter
              </button>
            </form>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-8">
        <div className="mb-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-6">
          {quickCards.map((card) => (
            <Link
              key={card.label}
              href={card.href}
              className="rounded-3xl border border-[#e0d3bf] bg-white p-5 shadow-xl shadow-[#3b1f18]/8 transition hover:-translate-y-1"
            >
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#b09876]">
                {card.label}
              </p>
              <p className="mt-4 font-display text-4xl font-black text-[#3b1f18]">
                {card.value}
              </p>
            </Link>
          ))}
        </div>
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {kpis.map((item) => (
            <div
              key={item.label}
              className="rounded-3xl border border-[#e0d3bf] bg-white p-6 shadow-xl shadow-[#3b1f18]/8"
            >
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#b09876]">
                {item.label}
              </p>
              <p className="mt-4 font-display text-4xl font-black text-[#3b1f18]">
                {item.value}
              </p>
              <p className="mt-2 text-sm font-semibold text-[#7b6255]">
                {item.note}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-8 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl border border-[#e0d3bf] bg-white p-6 shadow-xl shadow-[#3b1f18]/8">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#b09876]">
                  Orders
                </p>
                <h2 className="mt-2 font-display text-3xl font-black text-[#3b1f18]">
                  Recent Orders
                </h2>
              </div>

              <Link
                href="/admin/orders"
                className="rounded-full bg-[#3b1f18] px-4 py-2 text-xs font-black text-white"
              >
                View All
              </Link>
            </div>

            <div className="mt-6 space-y-3">
              {recentOrders.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-[#d8c9ac] bg-[#fffaf3] p-8 text-center text-sm text-[#7b6255]">
                  No recent orders found.
                </p>
              ) : (
                recentOrders.map((order) => (
                  <Link
                    key={order.id}
                    href="/admin/orders"
                    className="block rounded-2xl border border-[#eadfce] bg-[#fffaf3] p-4 transition hover:border-[#c9a45c]"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-display text-xl font-black text-[#3b1f18]">
                          {order.customerName}
                        </p>
                        <p className="mt-1 text-xs font-bold text-[#9c806b]">
                          {new Intl.DateTimeFormat("en-GB", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          }).format(order.createdAt)}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="rounded-full bg-white px-4 py-2 text-xs font-black text-[#3b1f18]">
                          {order.status}
                        </span>
                        <strong className="font-display text-2xl text-[#3b1f18]">
                          {money(order.total)}
                        </strong>
                      </div>
                    </div>

                    <p className="mt-3 line-clamp-1 text-sm text-[#7b6255]">
                      {order.items.length} item{order.items.length === 1 ? "" : "s"} ·{" "}
                      {order.addressLabel}
                    </p>
                  </Link>
                ))
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-[#e0d3bf] bg-white p-6 shadow-xl shadow-[#3b1f18]/8">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#b09876]">
                Status
              </p>
              <h2 className="mt-2 font-display text-3xl font-black text-[#3b1f18]">
                Order Status
              </h2>

              <div className="mt-6 grid gap-3">
                <div className="flex justify-between rounded-2xl bg-[#fffaf3] px-4 py-3 text-sm">
                  <span>Pending</span>
                  <strong>{pendingOrders}</strong>
                </div>
                <div className="flex justify-between rounded-2xl bg-[#fffaf3] px-4 py-3 text-sm">
                  <span>Completed</span>
                  <strong>{completedOrders}</strong>
                </div>
                <div className="flex justify-between rounded-2xl bg-[#fffaf3] px-4 py-3 text-sm">
                  <span>Cancelled</span>
                  <strong>{cancelledOrders}</strong>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-[#e0d3bf] bg-white p-6 shadow-xl shadow-[#3b1f18]/8">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#b09876]">
                Menu Performance
              </p>
              <h2 className="mt-2 font-display text-3xl font-black text-[#3b1f18]">
                Top Selling Items
              </h2>

              <div className="mt-6 space-y-3">
                {topItems.length === 0 ? (
                  <p className="rounded-2xl border border-dashed border-[#d8c9ac] bg-[#fffaf3] p-6 text-center text-sm text-[#7b6255]">
                    No item sales yet.
                  </p>
                ) : (
                  topItems.map((item, index) => (
                    <div
                      key={item.name}
                      className="flex items-center justify-between gap-4 rounded-2xl bg-[#fffaf3] px-4 py-3"
                    >
                      <div>
                        <p className="text-xs font-black text-[#b09876]">
                          #{index + 1}
                        </p>
                        <p className="font-bold text-[#3b1f18]">{item.name}</p>
                      </div>
                      <strong className="text-[#3b1f18]">
                        {item._sum.qty || 0} sold
                      </strong>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        
      </section>
    </main>
  );
}