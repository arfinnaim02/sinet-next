"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useCart } from "../contexts/CartContext";
import { useLanguage } from "../i18n/LanguageContext";

type UpsellItem = {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string | null;
  category?: {
    name: string;
    slug: string;
  } | null;
};

type DeliveryPromotion = {
  title: string;
  minSubtotal: number;
  freeDelivery: boolean;
};

export default function CartDrawer() {
  const { t } = useLanguage();

  const {
    cart,
    isCartOpen,
    closeCart,
    addItem,
    updateQuantity,
    removeItem,
    totalPrice,
    totalQuantity,
  } = useCart();

  const [upsellItems, setUpsellItems] = useState<UpsellItem[]>([]);
  const [deliveryPromotion, setDeliveryPromotion] =
    useState<DeliveryPromotion | null>(null);

  useEffect(() => {
    if (!isCartOpen) return;

    async function loadConversionData() {
      try {
        const [upsellResponse, promotionResponse] = await Promise.all([
          fetch("/api/menu/upsells", { cache: "no-store" }),
          fetch("/api/delivery/promotion", { cache: "no-store" }),
        ]);

        const [upsellData, promotionData] = await Promise.all([
          upsellResponse.json(),
          promotionResponse.json(),
        ]);

        if (upsellResponse.ok && upsellData.success) {
          setUpsellItems(Array.isArray(upsellData.items) ? upsellData.items : []);
        }

        if (promotionResponse.ok && promotionData.success) {
          setDeliveryPromotion(promotionData.promotion || null);
        }
      } catch {
        setUpsellItems([]);
        setDeliveryPromotion(null);
      }
    }

    loadConversionData();
  }, [isCartOpen]);

  const availableUpsells = useMemo(() => {
    const cartIds = new Set(cart.map((item) => item.id));

    return upsellItems
      .filter((item) => !cartIds.has(item.id))
      .slice(0, 3);
  }, [upsellItems, cart]);

  const freeDeliveryMinimum = Number(
    deliveryPromotion?.minSubtotal || 0
  );

  const freeDeliveryRemaining = Math.max(
    0,
    freeDeliveryMinimum - totalPrice
  );

  const freeDeliveryUnlocked =
    Boolean(deliveryPromotion) &&
    (freeDeliveryMinimum <= 0 || freeDeliveryRemaining <= 0);

  const freeDeliveryProgress =
    freeDeliveryMinimum > 0
      ? Math.min(100, (totalPrice / freeDeliveryMinimum) * 100)
      : 100;

  function addUpsell(item: UpsellItem) {
    addItem({
      id: item.id,
      name: item.name,
      description: item.description || "",
      price: Number(item.price || 0),
      category: item.category?.slug || "",
      image: item.image || "",
    });
  }

  if (!isCartOpen) return null;

  return (
    <div className="fixed inset-0 z-[120]">
      <button
        type="button"
        aria-label={t("cartCloseOverlay")}
        onClick={closeCart}
        className="absolute inset-0 bg-black/60"
      />

      <aside className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-[#f4eee4] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#ddcfba] bg-[#3b1f18] px-5 py-5 text-white">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-[#d7b875]">
              {t("cart")}
            </p>
            <h2 className="mt-1 font-display text-2xl font-black">
              {t("cartYourOrder")}
            </h2>
          </div>

          <button
            type="button"
            onClick={closeCart}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 text-2xl"
            aria-label={t("cartClose")}
          >
            ×
          </button>
        </div>

        {cart.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
            <p className="font-script text-6xl text-[#3b1f18]/60">Sinet</p>
            <h3 className="mt-3 font-display text-2xl font-black text-[#3b1f18]">
              {t("cartEmptyTitle")}
            </h3>
            <p className="mt-2 text-sm text-[#7b6255]">
              {t("cartEmptyText")}
            </p>

            <Link
              href="/menu"
              onClick={closeCart}
              className="sinet-gold-button mt-6"
            >
              {t("browseMenu")}
            </Link>
          </div>
        ) : (
          <>
            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
              {cart.map((item) => {
                const identifier = item.cartKey || item.id;
                const unitPrice = Number(item.price || 0);
                const basePrice = Number(item.basePrice || item.price || 0);
                const lineTotal = unitPrice * item.quantity;

                return (
                  <article
                    key={identifier}
                    className="rounded-2xl border border-[#eadfce] bg-white p-4 shadow-sm"
                  >
                    <div className="flex gap-3">
                      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-[#eadcc6]">
                        {item.image ? (
                          <img
                            src={item.image}
                            alt={item.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <span className="font-script text-3xl text-[#3b1f18]/50">
                              Sinet
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="font-display text-lg font-black leading-snug text-[#3b1f18]">
                              {item.name}
                            </h3>
                            <p className="mt-1 text-xs font-bold text-[#9c806b]">
                              {t("cartBase")}: €{basePrice.toFixed(2)}
                            </p>
                          </div>

                          <p className="shrink-0 text-sm font-black text-[#3b1f18]">
                            €{lineTotal.toFixed(2)}
                          </p>
                        </div>

                        {item.addons && item.addons.length > 0 && (
                          <div className="mt-3 rounded-xl bg-[#fffaf3] px-3 py-2">
                            <p className="mb-1 text-[10px] font-black uppercase tracking-[0.22em] text-[#b09876]">
                              {t("cartAddons")}
                            </p>

                            <div className="space-y-1">
                              {item.addons.map((addon) => (
                                <div
                                  key={`${identifier}-${addon.optionId}`}
                                  className="flex justify-between gap-3 text-xs text-[#7b6255]"
                                >
                                  <span>
                                    {addon.groupName}:{" "}
                                    <strong>{addon.optionName}</strong>
                                  </span>
                                  <span className="font-bold">
                                    +€{Number(addon.optionPrice || 0).toFixed(2)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="mt-4 flex items-center justify-between gap-3">
                          <div className="flex items-center overflow-hidden rounded-full border border-[#d8c9ac] bg-white">
                            <button
                              type="button"
                              aria-label={t("cartDecreaseQuantity")}
                              className="flex h-9 w-10 items-center justify-center text-lg font-black text-[#3b1f18] hover:bg-[#f4eee4]"
                              onClick={() =>
                                updateQuantity(identifier, item.quantity - 1)
                              }
                            >
                              −
                            </button>

                            <span className="flex h-9 min-w-10 items-center justify-center px-3 text-sm font-black text-[#3b1f18]">
                              {item.quantity}
                            </span>

                            <button
                              type="button"
                              aria-label={t("cartIncreaseQuantity")}
                              className="flex h-9 w-10 items-center justify-center text-lg font-black text-[#3b1f18] hover:bg-[#f4eee4]"
                              onClick={() =>
                                updateQuantity(identifier, item.quantity + 1)
                              }
                            >
                              +
                            </button>
                          </div>

                          <button
                            type="button"
                            aria-label={t("cartRemoveItem")}
                            onClick={() => removeItem(identifier)}
                            className="text-xs font-black uppercase tracking-[0.15em] text-red-600 underline underline-offset-4"
                          >
                            {t("remove")}
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}

              {availableUpsells.length > 0 && (
                <section className="rounded-2xl border border-[#ddcfba] bg-[#2a1510] p-4 text-white shadow-lg">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.3em] text-[#d7b875]">
                      {t("cartCompleteOrderEyebrow")}
                    </p>
                    <h3 className="mt-1 font-display text-xl font-black">
                      {t("cartCompleteOrder")}
                    </h3>
                  </div>

                  <div className="mt-4 space-y-2">
                    {availableUpsells.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.07] p-2.5"
                      >
                        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-white/10">
                          {item.image ? (
                            <img
                              src={item.image}
                              alt={item.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center font-script text-xl text-[#d7b875]">
                              S
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-black">
                            {item.name}
                          </p>
                          <p className="mt-0.5 text-xs font-bold text-white/60">
                            €{Number(item.price || 0).toFixed(2)}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => addUpsell(item)}
                          className="shrink-0 rounded-full bg-[#c9a45c] px-3 py-2 text-xs font-black text-[#3b1f18] transition hover:bg-[#d7b875]"
                        >
                          + {t("quickAdd")}
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>

            <div className="border-t border-[#ddcfba] bg-white px-5 py-5">
              {deliveryPromotion && (
                <div className="mb-4 rounded-2xl border border-[#eadfce] bg-[#fffaf3] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-[0.25em] text-[#b09876]">
                        {deliveryPromotion.title || t("freeDelivery")}
                      </p>
                      <p
                        className={`mt-1 text-sm font-black ${
                          freeDeliveryUnlocked
                            ? "text-green-700"
                            : "text-[#3b1f18]"
                        }`}
                      >
                        {freeDeliveryUnlocked
                          ? t("freeDeliveryUnlocked")
                          : `€${freeDeliveryRemaining.toFixed(2)} ${t(
                              "freeDeliveryRemaining"
                            )}`}
                      </p>
                    </div>

                    {freeDeliveryUnlocked && (
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-green-100 text-lg text-green-700">
                        ✓
                      </span>
                    )}
                  </div>

                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#eadfce]">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        freeDeliveryUnlocked
                          ? "bg-green-600"
                          : "bg-[#c9a45c]"
                      }`}
                      style={{ width: `${freeDeliveryProgress}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="mb-4 flex items-center justify-between">
                <span className="text-sm font-black uppercase tracking-[0.25em] text-[#9c806b]">
                  {totalQuantity} {totalQuantity === 1 ? t("item") : t("items")}
                </span>
                <span className="font-display text-2xl font-black text-[#3b1f18]">
                  €{totalPrice.toFixed(2)}
                </span>
              </div>

              <div className="grid gap-3">
                <Link
                  href="/checkout"
                  onClick={closeCart}
                  className="sinet-gold-button w-full"
                >
                  {t("goToCheckout")}
                </Link>

                <button
                  type="button"
                  onClick={closeCart}
                  className="sinet-outline-button w-full border-[#3b1f18]/25 text-[#3b1f18]"
                >
                  {t("continueOrdering")}
                </button>
              </div>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
