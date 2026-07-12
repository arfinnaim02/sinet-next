"use client";

import { useEffect, useMemo, useState } from "react";

type AddonSnapshot = {
  id: string;
  groupName: string;
  optionName: string;
  optionPrice: number;
};

type OrderItem = {
  id: string;
  name: string;
  qty: number;
  unitPrice: number;
  addonsTotal: number;
  addonSnapshots: AddonSnapshot[];
};

type CustomerOrder = {
  id: string;
  status: string;
  createdAt: string;
  customerName: string;
  customerPhone: string;
  customerNote: string;
  paymentMethod: string;
  addressLabel: string;
  addressExtra: string;
  distanceKm: number;
  subtotal: number;
  deliveryFee: number;
  couponCode: string;
  couponDiscount: number;
  total: number;
  promoTitle: string;
  promoFreeDelivery: boolean;
  items: OrderItem[];
};

type Customer = {
  id: string;
  type: "registered" | "guest";
  name: string;
  email: string;
  phone: string;
  role: string;
  isActive: boolean;
  createdAt: string | null;
  orderCount: number;
  completedOrderCount: number;
  cancelledOrderCount: number;
  activeOrderCount: number;
  totalSpent: number;
  lastOrderAt: string | null;
  addresses: {
    id: string;
    label: string;
    addressLabel: string;
    addressExtra: string;
    distanceKm: number;
    isDefault: boolean;
    createdAt: string;
  }[];
  loyaltyRewards: {
    id: string;
    issuedMonth: string;
    orderCount: number;
    couponCode: string;
    rewardPercent: number;
    createdAt: string;
  }[];
  orders: CustomerOrder[];
};

type Summary = {
  totalCustomers: number;
  registeredCustomers: number;
  guestCustomers: number;
  totalOrders: number;
  totalRevenue: number;
};

const statusOptions = [
  "pending",
  "accepted",
  "preparing",
  "on_the_way",
  "completed",
  "cancelled",
];

function money(value: number | string | null | undefined) {
  return `€${Number(value || 0).toFixed(2)}`;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "No orders yet";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Invalid date";

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function statusClass(status: string) {
  if (status === "completed") return "bg-emerald-100 text-emerald-800 border-emerald-200";
  if (status === "cancelled") return "bg-red-100 text-red-800 border-red-200";
  if (status === "pending") return "bg-amber-100 text-amber-800 border-amber-200";
  if (status === "on_the_way") return "bg-blue-100 text-blue-800 border-blue-200";
  return "bg-indigo-100 text-indigo-800 border-indigo-200";
}

function prettyStatus(status: string) {
  return status.replaceAll("_", " ");
}

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editIsActive, setEditIsActive] = useState(true);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [sortBy, setSortBy] = useState("lastOrder");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function loadCustomers() {
    setLoading(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch("/api/admin/customers", {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to load customers.");
      }

      setCustomers(data.customers || []);
      setSummary(data.summary || null);

      if (selectedCustomer) {
        const refreshed = (data.customers || []).find(
          (customer: Customer) => customer.id === selectedCustomer.id
        );
        setSelectedCustomer(refreshed || null);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load customers.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCustomers();
  }, []);

  function openEdit(customer: Customer) {
    if (customer.type !== "registered") {
      setError("Guest customers cannot be edited because they do not have a user account.");
      return;
    }

    setEditingCustomer(customer);
    setEditName(customer.name || "");
    setEditEmail(customer.email || "");
    setEditPhone(customer.phone || "");
    setEditIsActive(Boolean(customer.isActive));
  }

  async function saveCustomerEdit() {
    if (!editingCustomer) return;

    setActionLoading("saveCustomer");
    setError("");
    setNotice("");

    try {
      const response = await fetch("/api/admin/customers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "updateCustomer",
          customerId: editingCustomer.id,
          name: editName,
          email: editEmail,
          phone: editPhone,
          isActive: editIsActive,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to update customer.");
      }

      setNotice(data.message || "Customer updated.");
      setEditingCustomer(null);
      await loadCustomers();
    } catch (err: any) {
      setError(err?.message || "Failed to update customer.");
    } finally {
      setActionLoading("");
    }
  }

  async function toggleCustomerActive(customer: Customer) {
    if (customer.type !== "registered") return;

    const nextStatus = !customer.isActive;
    const confirmText = nextStatus
      ? `Activate ${customer.name || "this customer"}?`
      : `Deactivate ${customer.name || "this customer"}?`;

    if (!window.confirm(confirmText)) return;

    setActionLoading(`toggle-${customer.id}`);
    setError("");
    setNotice("");

    try {
      const response = await fetch("/api/admin/customers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "toggleCustomerActive",
          customerId: customer.id,
          isActive: nextStatus,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to update customer.");
      }

      setNotice(data.message || "Customer updated.");
      await loadCustomers();
    } catch (err: any) {
      setError(err?.message || "Failed to update customer.");
    } finally {
      setActionLoading("");
    }
  }

  async function deleteRegisteredCustomer(customer: Customer) {
    if (customer.type !== "registered") return;

    const ok = window.confirm(
      `Delete registered customer "${customer.name}"?\n\nOrders will not be deleted, but they will become guest orders.`
    );

    if (!ok) return;

    setActionLoading(`delete-customer-${customer.id}`);
    setError("");
    setNotice("");

    try {
      const response = await fetch("/api/admin/customers", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "deleteCustomer",
          customerId: customer.id,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to delete customer.");
      }

      setNotice(data.message || "Customer deleted.");
      setSelectedCustomer(null);
      await loadCustomers();
    } catch (err: any) {
      setError(err?.message || "Failed to delete customer.");
    } finally {
      setActionLoading("");
    }
  }

  async function deleteGuestCustomerOrders(customer: Customer) {
    if (customer.type !== "guest") return;

    const ok = window.confirm(
      `Delete all ${customer.orders.length} order(s) for guest customer "${customer.name}"?\n\nThis will permanently delete those orders.`
    );

    if (!ok) return;

    setActionLoading(`delete-guest-${customer.id}`);
    setError("");
    setNotice("");

    try {
      const response = await fetch("/api/admin/customers", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "deleteOrders",
          orderIds: customer.orders.map((order) => order.id),
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to delete guest orders.");
      }

      setNotice(data.message || "Guest order history deleted.");
      setSelectedCustomer(null);
      await loadCustomers();
    } catch (err: any) {
      setError(err?.message || "Failed to delete guest order history.");
    } finally {
      setActionLoading("");
    }
  }

  async function deleteSingleOrder(order: CustomerOrder) {
    const ok = window.confirm(
      `Delete order ${order.id}?\n\nThis will permanently delete this order and its items.`
    );

    if (!ok) return;

    setActionLoading(`delete-order-${order.id}`);
    setError("");
    setNotice("");

    try {
      const response = await fetch("/api/admin/customers", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "deleteOrders",
          orderIds: [order.id],
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to delete order.");
      }

      setNotice(data.message || "Order deleted.");
      setExpandedOrderId(null);
      await loadCustomers();
    } catch (err: any) {
      setError(err?.message || "Failed to delete order.");
    } finally {
      setActionLoading("");
    }
  }

  async function updateOrderStatus(order: CustomerOrder, status: string) {
    setActionLoading(`status-${order.id}`);
    setError("");
    setNotice("");

    try {
      const response = await fetch("/api/admin/customers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "updateOrderStatus",
          orderId: order.id,
          status,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to update order status.");
      }

      setNotice(data.message || "Order status updated.");
      await loadCustomers();
    } catch (err: any) {
      setError(err?.message || "Failed to update order status.");
    } finally {
      setActionLoading("");
    }
  }

  const filteredCustomers = useMemo(() => {
    const value = search.trim().toLowerCase();

    const filtered = customers.filter((customer) => {
      const matchesSearch = value
        ? customer.name.toLowerCase().includes(value) ||
          customer.email.toLowerCase().includes(value) ||
          customer.phone.toLowerCase().includes(value) ||
          customer.orders.some(
            (order) =>
              order.id.toLowerCase().includes(value) ||
              order.addressLabel.toLowerCase().includes(value) ||
              order.items.some((item) => item.name.toLowerCase().includes(value))
          )
        : true;

      const matchesType = typeFilter ? customer.type === typeFilter : true;

      return matchesSearch && matchesType;
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === "orders") return b.orderCount - a.orderCount;
      if (sortBy === "spent") return b.totalSpent - a.totalSpent;
      if (sortBy === "name") return a.name.localeCompare(b.name);

      const aTime = a.lastOrderAt ? new Date(a.lastOrderAt).getTime() : 0;
      const bTime = b.lastOrderAt ? new Date(b.lastOrderAt).getTime() : 0;
      return bTime - aTime;
    });
  }, [customers, search, typeFilter, sortBy]);

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[2rem] border border-[#eadcc6] bg-gradient-to-br from-[#fffaf3] via-white to-[#f3e5cf] p-6 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.28em] text-[#9a7a3f]">
              Admin / Customers
            </p>
            <h1 className="mt-2 text-4xl font-black text-[#3b1f18]">
              Customer Intelligence
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#7c6a55]">
              Manage registered and guest customers, inspect order history, update
              statuses, edit customer records, and control inactive or deleted accounts.
            </p>
          </div>

          <button
            onClick={loadCustomers}
            className="rounded-2xl bg-[#3b1f18] px-6 py-3 text-sm font-black text-white shadow-lg shadow-[#3b1f18]/15 transition hover:bg-[#5a3429]"
          >
            Refresh Data
          </button>
        </div>
      </div>

      {summary && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {[
            ["Customers", summary.totalCustomers],
            ["Registered", summary.registeredCustomers],
            ["Guests", summary.guestCustomers],
            ["Orders", summary.totalOrders],
            ["Revenue", money(summary.totalRevenue)],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-3xl border border-[#eadcc6] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[#9a7a3f]">
                {label}
              </p>
              <p className="mt-2 text-3xl font-black text-[#3b1f18]">{value}</p>
            </div>
          ))}
        </div>
      )}

      {notice && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-800">
          {notice}
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
          {error}
        </div>
      )}

      <section className="rounded-[2rem] border border-[#eadcc6] bg-[#fffaf3] p-5 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h2 className="text-2xl font-black text-[#3b1f18]">Customer List</h2>
            <p className="mt-1 text-sm text-[#7c6a55]">
              {filteredCustomers.length} customer
              {filteredCustomers.length === 1 ? "" : "s"} shown
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 xl:grid-cols-[1fr_180px_180px]">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name, email, phone, order ID, address, item..."
            className="rounded-2xl border border-[#d8c9ac] bg-white px-4 py-3 text-sm outline-none transition focus:border-[#c9a45c] focus:ring-4 focus:ring-[#d7b875]/20"
          />

          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
            className="rounded-2xl border border-[#d8c9ac] bg-white px-4 py-3 text-sm outline-none transition focus:border-[#c9a45c] focus:ring-4 focus:ring-[#d7b875]/20"
          >
            <option value="">All customers</option>
            <option value="registered">Registered</option>
            <option value="guest">Guest</option>
          </select>

          <select
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value)}
            className="rounded-2xl border border-[#d8c9ac] bg-white px-4 py-3 text-sm outline-none transition focus:border-[#c9a45c] focus:ring-4 focus:ring-[#d7b875]/20"
          >
            <option value="lastOrder">Sort: Last order</option>
            <option value="orders">Sort: Most orders</option>
            <option value="spent">Sort: Most spent</option>
            <option value="name">Sort: Name</option>
          </select>
        </div>

        <div className="mt-5 space-y-4">
          {loading ? (
            <div className="rounded-3xl border border-[#eadcc6] bg-white p-6 text-sm font-semibold text-[#7c6a55]">
              Loading customers...
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="rounded-3xl border border-[#eadcc6] bg-white p-6 text-sm font-semibold text-[#7c6a55]">
              No customers found.
            </div>
          ) : (
            filteredCustomers.map((customer) => (
              <article
                key={customer.id}
                className={`rounded-3xl border bg-white p-5 shadow-sm transition hover:shadow-md ${
                  selectedCustomer?.id === customer.id
                    ? "border-[#c9a45c]"
                    : "border-[#eadcc6]"
                }`}
              >
                <div className="grid gap-4 xl:grid-cols-[1fr_120px_120px_120px_140px_260px] xl:items-center">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-xl font-black text-[#3b1f18]">
                        {customer.name || "Unnamed Customer"}
                      </h3>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.12em] ${
                          customer.type === "registered"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-stone-100 text-stone-700"
                        }`}
                      >
                        {customer.type}
                      </span>

                      {!customer.isActive && (
                        <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-red-700">
                          inactive
                        </span>
                      )}
                    </div>

                    <p className="mt-1 text-sm text-[#7c6a55]">
                      {customer.email || "No email"}
                      {customer.phone ? ` · ${customer.phone}` : ""}
                    </p>

                    <p className="mt-1 text-xs font-semibold text-[#9a7a3f]">
                      Last order: {formatDate(customer.lastOrderAt)}
                    </p>
                  </div>

                  <Metric label="Orders" value={customer.orderCount} />
                  <Metric label="Done" value={customer.completedOrderCount} />
                  <Metric label="Cancel" value={customer.cancelledOrderCount} />
                  <Metric label="Spent" value={money(customer.totalSpent)} />

                  <div className="flex flex-wrap gap-2 xl:justify-end">
                    <button
                      onClick={() => {
                        setSelectedCustomer(
                          selectedCustomer?.id === customer.id ? null : customer
                        );
                        setExpandedOrderId(null);
                      }}
                      className="rounded-2xl border border-[#d8c9ac] px-4 py-2 text-sm font-black text-[#3b1f18] transition hover:bg-[#fffaf3]"
                    >
                      {selectedCustomer?.id === customer.id ? "Close" : "View"}
                    </button>

                    {customer.type === "registered" && (
                      <button
                        onClick={() => openEdit(customer)}
                        className="rounded-2xl bg-[#d7b875] px-4 py-2 text-sm font-black text-[#3b1f18] transition hover:bg-[#c9a45c]"
                      >
                        Edit
                      </button>
                    )}

                    {customer.type === "registered" ? (
                      <button
                        onClick={() => toggleCustomerActive(customer)}
                        disabled={actionLoading === `toggle-${customer.id}`}
                        className="rounded-2xl bg-[#3b1f18] px-4 py-2 text-sm font-black text-white transition hover:bg-[#5a3429] disabled:opacity-50"
                      >
                        {customer.isActive ? "Deactivate" : "Activate"}
                      </button>
                    ) : (
                      <button
                        onClick={() => deleteGuestCustomerOrders(customer)}
                        disabled={actionLoading === `delete-guest-${customer.id}`}
                        className="rounded-2xl bg-red-600 px-4 py-2 text-sm font-black text-white transition hover:bg-red-700 disabled:opacity-50"
                      >
                        Delete Guest
                      </button>
                    )}
                  </div>
                </div>

                {selectedCustomer?.id === customer.id && (
                  <CustomerDetails
                    customer={customer}
                    expandedOrderId={expandedOrderId}
                    setExpandedOrderId={setExpandedOrderId}
                    updateOrderStatus={updateOrderStatus}
                    deleteSingleOrder={deleteSingleOrder}
                    deleteRegisteredCustomer={deleteRegisteredCustomer}
                    actionLoading={actionLoading}
                  />
                )}
              </article>
            ))
          )}
        </div>
      </section>

      {editingCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-xl rounded-[2rem] border border-[#eadcc6] bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-[#9a7a3f]">
                  Edit Customer
                </p>
                <h3 className="mt-2 text-2xl font-black text-[#3b1f18]">
                  {editingCustomer.name || "Customer"}
                </h3>
              </div>

              <button
                onClick={() => setEditingCustomer(null)}
                className="rounded-full border border-[#eadcc6] px-3 py-1 text-sm font-black text-[#3b1f18]"
              >
                ✕
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <label className="block">
                <span className="text-xs font-black uppercase tracking-[0.18em] text-[#9a7a3f]">
                  Name
                </span>
                <input
                  value={editName}
                  onChange={(event) => setEditName(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-[#d8c9ac] px-4 py-3 outline-none focus:border-[#c9a45c]"
                />
              </label>

              <label className="block">
                <span className="text-xs font-black uppercase tracking-[0.18em] text-[#9a7a3f]">
                  Email
                </span>
                <input
                  value={editEmail}
                  onChange={(event) => setEditEmail(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-[#d8c9ac] px-4 py-3 outline-none focus:border-[#c9a45c]"
                />
              </label>

              <label className="block">
                <span className="text-xs font-black uppercase tracking-[0.18em] text-[#9a7a3f]">
                  Phone
                </span>
                <input
                  value={editPhone}
                  onChange={(event) => setEditPhone(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-[#d8c9ac] px-4 py-3 outline-none focus:border-[#c9a45c]"
                />
              </label>

              <label className="flex items-center gap-3 rounded-2xl bg-[#fffaf3] p-4 text-sm font-bold text-[#3b1f18]">
                <input
                  type="checkbox"
                  checked={editIsActive}
                  onChange={(event) => setEditIsActive(event.target.checked)}
                />
                Active customer account
              </label>
            </div>

            <div className="mt-6 flex flex-wrap justify-between gap-3">
              <button
                onClick={() => deleteRegisteredCustomer(editingCustomer)}
                className="rounded-2xl bg-red-600 px-5 py-3 text-sm font-black text-white transition hover:bg-red-700"
              >
                Delete User
              </button>

              <div className="flex gap-3">
                <button
                  onClick={() => setEditingCustomer(null)}
                  className="rounded-2xl border border-[#d8c9ac] px-5 py-3 text-sm font-black text-[#3b1f18]"
                >
                  Cancel
                </button>

                <button
                  onClick={saveCustomerEdit}
                  disabled={actionLoading === "saveCustomer"}
                  className="rounded-2xl bg-[#3b1f18] px-5 py-3 text-sm font-black text-white transition hover:bg-[#5a3429] disabled:opacity-50"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: any }) {
  return (
    <div>
      <p className="text-xs font-black uppercase tracking-[0.18em] text-[#9a7a3f]">
        {label}
      </p>
      <p className="mt-1 text-lg font-black text-[#3b1f18]">{value}</p>
    </div>
  );
}

function CustomerDetails({
  customer,
  expandedOrderId,
  setExpandedOrderId,
  updateOrderStatus,
  deleteSingleOrder,
  deleteRegisteredCustomer,
  actionLoading,
}: {
  customer: Customer;
  expandedOrderId: string | null;
  setExpandedOrderId: (id: string | null) => void;
  updateOrderStatus: (order: CustomerOrder, status: string) => void;
  deleteSingleOrder: (order: CustomerOrder) => void;
  deleteRegisteredCustomer: (customer: Customer) => void;
  actionLoading: string;
}) {
  return (
    <div className="mt-5 border-t border-[#eadcc6] pt-5">
      <div className="grid gap-4 xl:grid-cols-3">
        <div className="rounded-3xl bg-[#fffaf3] p-4">
          <h4 className="font-black text-[#3b1f18]">Customer Details</h4>
          <div className="mt-3 space-y-2 text-sm text-[#5f5144]">
            <p>
              <b>Name:</b> {customer.name || "N/A"}
            </p>
            <p>
              <b>Email:</b> {customer.email || "N/A"}
            </p>
            <p>
              <b>Phone:</b> {customer.phone || "N/A"}
            </p>
            <p>
              <b>Type:</b> {customer.type}
            </p>
            <p>
              <b>Status:</b> {customer.isActive ? "Active" : "Inactive"}
            </p>
            <p>
              <b>Joined:</b> {formatDate(customer.createdAt)}
            </p>
          </div>
        </div>

        <div className="rounded-3xl bg-[#fffaf3] p-4">
          <h4 className="font-black text-[#3b1f18]">Performance</h4>
          <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-2xl bg-white p-3">
              <p className="text-[#9a7a3f]">Active orders</p>
              <p className="font-black text-[#3b1f18]">{customer.activeOrderCount}</p>
            </div>
            <div className="rounded-2xl bg-white p-3">
              <p className="text-[#9a7a3f]">Total spent</p>
              <p className="font-black text-[#3b1f18]">{money(customer.totalSpent)}</p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl bg-[#fffaf3] p-4">
          <h4 className="font-black text-[#3b1f18]">Quick Actions</h4>
          <div className="mt-3 space-y-2">
            {customer.type === "registered" ? (
              <button
                onClick={() => deleteRegisteredCustomer(customer)}
                disabled={actionLoading === `delete-customer-${customer.id}`}
                className="w-full rounded-2xl bg-red-600 px-4 py-3 text-sm font-black text-white transition hover:bg-red-700 disabled:opacity-50"
              >
                Delete Registered User
              </button>
            ) : (
              <p className="rounded-2xl bg-white p-3 text-sm font-semibold text-[#7c6a55]">
                Guest customers are grouped by phone/order details. Use Delete Guest from
                the main card to remove all guest orders.
              </p>
            )}
          </div>
        </div>
      </div>

      {customer.addresses.length > 0 && (
        <div className="mt-5 rounded-3xl bg-[#fffaf3] p-4">
          <h4 className="font-black text-[#3b1f18]">Saved Addresses</h4>

          <div className="mt-3 grid gap-3 xl:grid-cols-2">
            {customer.addresses.map((address) => (
              <div key={address.id} className="rounded-2xl bg-white p-4 text-sm text-[#5f5144]">
                <p className="font-black text-[#3b1f18]">
                  {address.label}
                  {address.isDefault ? " · Default" : ""}
                </p>
                <p className="mt-1">{address.addressLabel}</p>
                {address.addressExtra && <p className="mt-1">{address.addressExtra}</p>}
                <p className="mt-1 text-xs font-semibold text-[#9a7a3f]">
                  Distance: {address.distanceKm.toFixed(2)} km
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {customer.loyaltyRewards.length > 0 && (
        <div className="mt-5 rounded-3xl bg-[#fffaf3] p-4">
          <h4 className="font-black text-[#3b1f18]">Loyalty Rewards</h4>

          <div className="mt-3 grid gap-3 xl:grid-cols-2">
            {customer.loyaltyRewards.map((reward) => (
              <div key={reward.id} className="rounded-2xl bg-white p-4 text-sm text-[#5f5144]">
                <p className="font-black text-[#3b1f18]">{reward.couponCode}</p>
                <p className="mt-1">
                  {reward.rewardPercent}% reward · {reward.orderCount} orders
                </p>
                <p className="mt-1 text-xs font-semibold text-[#9a7a3f]">
                  Month: {reward.issuedMonth}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-5">
        <h4 className="font-black text-[#3b1f18]">Order History</h4>

        <div className="mt-3 space-y-3">
          {customer.orders.length === 0 ? (
            <div className="rounded-2xl bg-[#fffaf3] p-4 text-sm font-semibold text-[#7c6a55]">
              No orders found for this customer.
            </div>
          ) : (
            customer.orders.map((order) => {
              const orderExpanded = expandedOrderId === order.id;

              return (
                <div key={order.id} className="rounded-2xl border border-[#eadcc6] bg-[#fffaf3] p-4">
                  <div className="grid gap-3 xl:grid-cols-[1fr_160px_170px_140px_220px] xl:items-center">
                    <button
                      onClick={() => setExpandedOrderId(orderExpanded ? null : order.id)}
                      className="text-left"
                    >
                      <p className="font-black text-[#3b1f18]">Order #{order.id}</p>
                      <p className="mt-1 text-sm text-[#7c6a55]">{formatDate(order.createdAt)}</p>
                      <p className="mt-1 text-sm text-[#7c6a55]">{order.addressLabel}</p>
                    </button>

                    <span
                      className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-black uppercase ${statusClass(
                        order.status
                      )}`}
                    >
                      {prettyStatus(order.status)}
                    </span>

                    <select
                      value={order.status}
                      onChange={(event) => updateOrderStatus(order, event.target.value)}
                      disabled={actionLoading === `status-${order.id}`}
                      className="rounded-2xl border border-[#d8c9ac] bg-white px-3 py-2 text-sm outline-none disabled:opacity-50"
                    >
                      {statusOptions.map((status) => (
                        <option key={status} value={status}>
                          {prettyStatus(status)}
                        </option>
                      ))}
                    </select>

                    <p className="font-black text-[#3b1f18]">{money(order.total)}</p>

                    <div className="flex flex-wrap gap-2 xl:justify-end">
                      <button
                        onClick={() => setExpandedOrderId(orderExpanded ? null : order.id)}
                        className="rounded-2xl border border-[#d8c9ac] px-4 py-2 text-sm font-black text-[#3b1f18] transition hover:bg-white"
                      >
                        {orderExpanded ? "Hide" : "Details"}
                      </button>

                      <button
                        onClick={() => deleteSingleOrder(order)}
                        disabled={actionLoading === `delete-order-${order.id}`}
                        className="rounded-2xl bg-red-600 px-4 py-2 text-sm font-black text-white transition hover:bg-red-700 disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {orderExpanded && (
                    <div className="mt-4 border-t border-[#eadcc6] pt-4">
                      <div className="grid gap-4 xl:grid-cols-2">
                        <div>
                          <h5 className="font-black text-[#3b1f18]">Items</h5>

                          <div className="mt-3 space-y-3">
                            {order.items.map((item) => (
                              <div key={item.id} className="rounded-2xl bg-white p-4">
                                <div className="flex justify-between gap-3">
                                  <div>
                                    <p className="font-black text-[#3b1f18]">
                                      {item.name} × {item.qty}
                                    </p>
                                    <p className="mt-1 text-xs font-semibold text-[#9a7a3f]">
                                      Unit: {money(item.unitPrice)}
                                    </p>
                                  </div>

                                  <p className="font-black text-[#3b1f18]">
                                    {money(item.unitPrice * item.qty)}
                                  </p>
                                </div>

                                {item.addonSnapshots.length > 0 && (
                                  <div className="mt-3 rounded-xl bg-[#fffaf3] p-3">
                                    <p className="text-xs font-black uppercase tracking-[0.18em] text-[#9a7a3f]">
                                      Addons
                                    </p>

                                    <div className="mt-2 space-y-1 text-sm text-[#5f5144]">
                                      {item.addonSnapshots.map((addon) => (
                                        <p key={addon.id}>
                                          <b>{addon.groupName}:</b> {addon.optionName}{" "}
                                          {money(addon.optionPrice)}
                                        </p>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>

                        <div>
                          <h5 className="font-black text-[#3b1f18]">Order Details</h5>

                          <div className="mt-3 rounded-2xl bg-white p-4 text-sm text-[#5f5144]">
                            <p>
                              <b>Address:</b> {order.addressLabel || "N/A"}
                            </p>

                            {order.addressExtra && (
                              <p className="mt-2">
                                <b>Extra:</b> {order.addressExtra}
                              </p>
                            )}

                            <p className="mt-2">
                              <b>Distance:</b> {order.distanceKm.toFixed(2)} km
                            </p>

                            <p className="mt-2">
                              <b>Payment:</b> {order.paymentMethod}
                            </p>

                            {order.customerNote && (
                              <p className="mt-2">
                                <b>Note:</b> {order.customerNote}
                              </p>
                            )}

                            <div className="mt-4 space-y-2 border-t border-[#eadcc6] pt-4">
                              <div className="flex justify-between">
                                <span>Subtotal</span>
                                <b>{money(order.subtotal)}</b>
                              </div>

                              <div className="flex justify-between">
                                <span>Delivery</span>
                                <b>{money(order.deliveryFee)}</b>
                              </div>

                              {order.couponCode && (
                                <div className="flex justify-between text-emerald-700">
                                  <span>Coupon ({order.couponCode})</span>
                                  <b>-{money(order.couponDiscount)}</b>
                                </div>
                              )}

                              <div className="flex justify-between border-t border-[#eadcc6] pt-3 text-base text-[#3b1f18]">
                                <span className="font-black">Total</span>
                                <b>{money(order.total)}</b>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}