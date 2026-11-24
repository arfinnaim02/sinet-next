export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

const preferredKeywords = [
  "upsell",
  "drink",
  "drinks",
  "beverage",
  "juoma",
  "juomat",
  "side",
  "sides",
  "fries",
  "french fries",
  "sauce",
  "sauces",
  "dip",
  "dips",
  "dessert",
  "desserts",
  "favorite",
  "popular",
];

function scoreItem(item: {
  tags: string;
  name: string;
  category: { name: string; slug: string };
  price: any;
}) {
  const searchable = [
    item.tags,
    item.name,
    item.category?.name || "",
    item.category?.slug || "",
  ]
    .join(" ")
    .toLowerCase();

  let score = 0;

  preferredKeywords.forEach((keyword, index) => {
    if (searchable.includes(keyword)) {
      score += 120 - index * 4;
    }
  });

  const price = Number(item.price || 0);

  if (price > 0 && price <= 8) score += 25;
  if (price > 0 && price <= 5) score += 15;

  return score;
}

export async function GET() {
  try {
    const items = await prisma.menuItem.findMany({
      where: {
        status: "active",
        addonGroupLinks: {
          none: {},
        },
      },
      include: {
        category: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 40,
    });

    const ranked = items
      .map((item) => ({
        item,
        score: scoreItem(item),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
      .map(({ item }) => ({
        id: item.id,
        name: item.name,
        description: item.description,
        price: Number(item.price || 0),
        image: item.image,
        category: item.category,
      }));

    return NextResponse.json({
      success: true,
      items: ranked,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Failed to load cart suggestions.",
      },
      { status: 500 }
    );
  }
}
