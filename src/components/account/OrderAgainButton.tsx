"use client";

import { useState } from "react";
import { MenuItem, MenuItemAddon, useCart } from "../../contexts/CartContext";
import { useLanguage } from "../../i18n/LanguageContext";

type ReorderItem = {
  quantity: number;
  item: MenuItem;
  addons: MenuItemAddon[];
};

type Props = {
  orderId: string;
  compact?: boolean;
};

export default function OrderAgainButton({
  orderId,
  compact = false,
}: Props) {
  const { addItem } = useCart();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleReorder() {
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(
        \`/api/account/orders/\${orderId}/reorder\`,
        {
          method: "POST",
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || t("reorderFailed"));
      }

      const items = (data.items || []) as ReorderItem[];

      items.forEach((entry) => {
        const quantity = Math.max(1, Number(entry.quantity || 1));

        for (let index = 0; index < quantity; index += 1) {
          addItem(entry.item, entry.addons || []);
        }
      });

      if (Array.isArray(data.warnings) && data.warnings.length > 0) {
        setMessage(t("reorderPartial"));
      } else {
        setMessage(t("reorderAdded"));
      }
    } catch (error: any) {
      setMessage(error?.message || t("reorderFailed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={compact ? "mt-3" : "mt-5"}>
      <button
        type="button"
        onClick={handleReorder}
        disabled={loading}
        className={
          compact
            ? "rounded-full bg-[#3b1f18] px-4 py-2 text-xs font-black text-white transition hover:bg-[#c9a45c] hover:text-[#3b1f18] disabled:opacity-60"
            : "w-full rounded-2xl bg-[#3b1f18] px-5 py-3 text-sm font-black text-white transition hover:bg-[#c9a45c] hover:text-[#3b1f18] disabled:opacity-60"
        }
      >
        {loading ? t("reordering") : t("reorder")} ↻
      </button>

      {message && (
        <p className="mt-2 text-xs font-bold leading-5 text-[#7b6255]">
          {message}
        </p>
      )}
    </div>
  );
}
