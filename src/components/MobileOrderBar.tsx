"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "../contexts/CartContext";
import { useLanguage } from "../i18n/LanguageContext";

export default function MobileOrderBar() {
  const pathname = usePathname();
  const {
    totalPrice,
    totalQuantity,
    isCartOpen,
    openCart,
  } = useCart();
  const { t } = useLanguage();

  if (
    isCartOpen ||
    pathname.startsWith("/admin") ||
    pathname === "/checkout" ||
    pathname === "/login" ||
    pathname === "/signup"
  ) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[80] px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:hidden">
      <div className="pointer-events-auto mx-auto max-w-md rounded-[1.35rem] border border-[#d7b875]/35 bg-[#2a1510]/95 p-2 shadow-[0_18px_45px_rgba(27,14,10,0.38)] backdrop-blur-xl">
        {totalQuantity > 0 ? (
          <button
            type="button"
            onClick={openCart}
            className="flex w-full items-center justify-between gap-4 rounded-[1rem] bg-[#c9a45c] px-4 py-3 text-left text-[#3b1f18] shadow-lg"
          >
            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase tracking-[0.28em] opacity-65">
                {t("mobileOrderReady")}
              </p>
              <p className="mt-0.5 truncate text-sm font-black">
                {totalQuantity} {totalQuantity === 1 ? t("item") : t("items")} · €{totalPrice.toFixed(2)}
              </p>
            </div>

            <span className="shrink-0 rounded-full bg-[#3b1f18] px-4 py-2 text-xs font-black text-white">
              {t("mobileViewOrder")} →
            </span>
          </button>
        ) : (
          <Link
            href="/menu"
            className="flex w-full items-center justify-between gap-4 rounded-[1rem] bg-[#c9a45c] px-4 py-3 text-[#3b1f18] shadow-lg"
          >
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.28em] opacity-65">
                {t("mobileOrderReady")}
              </p>
              <p className="mt-0.5 text-sm font-black">
                {t("orderOnline")}
              </p>
            </div>

            <span className="rounded-full bg-[#3b1f18] px-4 py-2 text-xs font-black text-white">
              {t("mobileBrowseMenu")} →
            </span>
          </Link>
        )}
      </div>
    </div>
  );
}
