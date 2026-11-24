export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getCurrentUser } from "../../../../../../lib/auth";
import { prisma } from "../../../../../../lib/prisma";

function cleanOptionName(value: string) {
  return value.replace(/\s+\(Free\)$/i, "").trim();
}

function getEffectiveRules(link: any) {
  const group = link.addonGroup;

  return {
    isRequired: link.isRequiredOverride ?? group.isRequired,
    minSelect: link.minSelectOverride ?? group.minSelect,
    freeChoicesCount:
      link.freeChoicesCountOverride ?? group.freeChoicesCount ?? 0,
  };
}

export async function POST(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Please log in to reorder." },
        { status: 401 }
      );
    }

    const order = await prisma.deliveryOrder.findFirst({
      where: {
        id: params.id,
        userId: user.id,
      },
      include: {
        items: {
          include: {
            addonSnapshots: true,
            menuItem: {
              include: {
                category: true,
                addonGroupLinks: {
                  orderBy: {
                    order: "asc",
                  },
                  include: {
                    addonGroup: {
                      include: {
                        options: {
                          where: {
                            isActive: true,
                          },
                          orderBy: {
                            order: "asc",
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        { success: false, message: "Order not found." },
        { status: 404 }
      );
    }

    const warnings: string[] = [];
    const items: any[] = [];

    for (const orderItem of order.items) {
      const menuItem = orderItem.menuItem;

      if (!menuItem || menuItem.status !== "active") {
        warnings.push(`${orderItem.name} is no longer available.`);
        continue;
      }

      const addons: any[] = [];
      let canRestore = true;

      for (const link of menuItem.addonGroupLinks) {
        const group = link.addonGroup;
        const rules = getEffectiveRules(link);

        const snapshots = orderItem.addonSnapshots.filter(
          (snapshot) => snapshot.groupName === group.name
        );

        const matchedOptions = snapshots
          .map((snapshot) => {
            const optionName = cleanOptionName(snapshot.optionName);

            return group.options.find(
              (option) => option.name.trim() === optionName
            );
          })
          .filter(Boolean);

        const requiredCount = Math.max(
          rules.isRequired ? 1 : 0,
          Number(rules.minSelect || 0)
        );

        if (matchedOptions.length < requiredCount) {
          warnings.push(
            `${menuItem.name} needs to be customized again before ordering.`
          );
          canRestore = false;
          break;
        }

        matchedOptions.forEach((option: any, index: number) => {
          addons.push({
            groupId: group.id,
            groupName: group.name,
            optionId: option.id,
            optionName:
              index < rules.freeChoicesCount
                ? `${option.name} (Free)`
                : option.name,
            optionPrice:
              index < rules.freeChoicesCount ? 0 : Number(option.price || 0),
          });
        });
      }

      if (!canRestore) continue;

      items.push({
        quantity: Math.max(1, Number(orderItem.qty || 1)),
        item: {
          id: menuItem.id,
          name: menuItem.name,
          description: menuItem.description || "",
          price: Number(menuItem.price || 0),
          category: menuItem.category?.slug || "",
          image: menuItem.image || "",
        },
        addons,
      });
    }

    if (items.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            warnings[0] ||
            "The items in this order are no longer available for quick reorder.",
          warnings,
        },
        { status: 409 }
      );
    }

    return NextResponse.json({
      success: true,
      items,
      warnings,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Failed to prepare this order again.",
      },
      { status: 500 }
    );
  }
}
