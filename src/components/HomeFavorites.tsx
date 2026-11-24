"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import MenuItemPreviewModal from "./MenuItemPreviewModal";
import { useLanguage } from "../i18n/LanguageContext";

type CategoryFromApi = {
  id: string;
  name: string;
  slug: string;
};

type MenuItemFromApi = {
  id: string;
  name: string;
  description: string | null;
  price: string | number;
  image: string | null;
  tags?: string | null;
  category?: CategoryFromApi | null;
};

function tagScore(item: MenuItemFromApi) {
  const tags = String(item.tags || "")
    .toLowerCase()
    .split(",")
    .map((tag) => tag.trim());

  let score = 0;

  if (tags.includes("popular")) score += 40;
  if (tags.includes("bestseller")) score += 35;
  if (tags.includes("favorite")) score += 30;
  if (tags.includes("featured")) score += 20;

  return score;
}

export default function HomeFavorites() {
  const { t } = useLanguage();
  const [items, setItems] = useState<MenuItemFromApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewItemId, setPreviewItemId] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    async function loadItems() {
      try {
        const response = await fetch("/api/menu", { cache: "no-store" });
        const data = await response.json();
        setItems(Array.isArray(data) ? data : []);
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    }

    loadItems();
  }, []);

  const popularItems = useMemo(() => {
    return [...items]
      .sort((a, b) => tagScore(b) - tagScore(a))
      .slice(0, 4);
  }, [items]);

  function openPreview(id: string) {
    setPreviewItemId(id);
    setPreviewOpen(true);
  }

  if (loading) return null;
  if (popularItems.length === 0) return null;

  return (
    <section className="relative overflow-hidden bg-[#f4eee4] px-4 py-16 sm:py-20">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_12%,rgba(201,164,92,0.14),transparent_30%),radial-gradient(circle_at_88%_24%,rgba(59,31,24,0.08),transparent_28%)]" />

      <div className="relative mx-auto max-w-7xl">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[#b09876]">
              {t("popularEyebrow")}
            </p>

            <h2 className="mt-3 font-display text-3xl font-black text-[#3b1f18] sm:text-5xl">
              {t("popularTitle")}
            </h2>

            <p className="mt-3 text-sm leading-7 text-[#7b6255] sm:text-base">
              {t("popularSubtitle")}
            </p>
          </div>

          <Link
            href="/menu"
            className="inline-flex w-fit rounded-full border border-[#3b1f18]/20 bg-white px-5 py-3 text-sm font-black text-[#3b1f18] shadow-sm transition hover:border-[#c9a45c] hover:bg-[#fffaf3]"
          >
            {t("viewFullMenu")} →
          </Link>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-3 sm:mt-10 sm:gap-6 lg:grid-cols-4">
          {popularItems.map((item, index) => (
            <article
              key={item.id}
              className="group overflow-hidden rounded-[1.4rem] border border-[#eadfce] bg-white shadow-[0_12px_34px_rgba(59,31,24,0.09)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_20px_48px_rgba(59,31,24,0.15)]"
            >
              <button
                type="button"
                onClick={() => openPreview(item.id)}
                className="block w-full text-left"
              >
                <div className="relative h-44 overflow-hidden bg-[#eadcc6] sm:h-60">
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.name}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <span className="font-script text-5xl text-[#3b1f18]/40">
                        Sinet
                      </span>
                    </div>
                  )}

                  <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/55 to-transparent" />

                  <span className="absolute left-3 top-3 rounded-full bg-[#3b1f18]/92 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-[#d7b875] backdrop-blur sm:left-4 sm:top-4">
                    {index === 0 ? t("popularTopPick") : t("popularBadge")}
                  </span>

                  <span className="absolute bottom-3 right-3 rounded-full bg-white px-3 py-1.5 text-xs font-black text-[#3b1f18] shadow-lg sm:bottom-4 sm:right-4">
                    € {Number(item.price || 0).toFixed(2)}
                  </span>
                </div>

                <div className="p-4 sm:p-5">
                  <p className="text-[9px] font-black uppercase tracking-[0.28em] text-[#b09876]">
                    {item.category?.name || t("navMenu")}
                  </p>

                  <h3 className="mt-2 line-clamp-2 font-display text-lg font-black leading-snug text-[#3b1f18] sm:text-xl">
                    {item.name}
                  </h3>

                  <p className="mt-2 line-clamp-2 text-xs leading-5 text-[#7b6255] sm:text-sm sm:leading-6">
                    {item.description || t("freshlyPrepared")}
                  </p>

                  <div className="mt-4 flex items-center justify-between border-t border-[#eadfce] pt-4">
                    <span className="text-xs font-black text-[#3b1f18] sm:text-sm">
                      {t("orderNow")}
                    </span>

                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#c9a45c] text-lg font-black text-[#3b1f18] transition group-hover:bg-[#3b1f18] group-hover:text-white">
                      →
                    </span>
                  </div>
                </div>
              </button>
            </article>
          ))}
        </div>
      </div>

      <MenuItemPreviewModal
        itemId={previewItemId}
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
      />
    </section>
  );
}
