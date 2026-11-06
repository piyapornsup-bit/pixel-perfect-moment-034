import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import {
  ArrowLeft,
  Calendar,
  ChevronRight,
  Clock,
  Gift,
  Newspaper,
  Package,
  Percent,
  Sparkles,
  Tag,
} from "lucide-react";
import { useState } from "react";
import { CatIcon, Pill, PrimaryButton, ProductImage } from "@/components/app/ui";
import { repo } from "@/lib/data/repo";
import type { Promotion } from "@/lib/data/types";
import { baht, isPromotionActive } from "@/lib/rules";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/promotions")({
  head: () => ({
    meta: [
      { title: "ข่าวสารและโปรโมชัน — ร้านรุ่งอรุณ" },
      { name: "description", content: "ติดตามข่าวสาร โปรโมชัน และสิทธิพิเศษจากร้านรุ่งอรุณ มินิมาร์ท" },
      { property: "og:title", content: "ข่าวสารและโปรโมชัน — ร้านรุ่งอรุณ" },
      { property: "og:description", content: "รวมโปรโมชันสุดคุ้มและข่าวสารล่าสุด" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PromotionsPage,
});

type TabType = "all" | "news" | "promo";

function PromotionsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>("all");

  // Get active items (repo.listPromotions automatically filters out expired ones!)
  const allItems = repo.listPromotions();

  const filteredItems = allItems.filter((item) => {
    // Hide expired items
    if (!isPromotionActive(item)) return false;
    if (activeTab === "news") return item.type === "news";
    if (activeTab === "promo") return item.type === "promo";
    return true;
  });

  return (
    <div className="flex flex-col gap-4 p-4 pb-12">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          aria-label="ย้อนกลับ"
          onClick={() => router.history.back()}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-foreground hover:bg-secondary/80 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">ข่าวสารและโปรโมชัน</h1>
          <p className="text-xs text-muted-foreground">สิทธิพิเศษและข่าวสารอัปเดตล่าสุด</p>
        </div>
      </div>

      {/* Tabs: ทั้งหมด | ข่าวสาร | โปรโมชัน (ตามข้อกำหนด) */}
      <div className="flex rounded-2xl border border-border bg-secondary/50 p-1">
        {[
          { id: "all", label: "ทั้งหมด" },
          { id: "news", label: "ข่าวสาร" },
          { id: "promo", label: "โปรโมชัน" },
        ].map(({ id, label }) => {
          const active = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => setActiveTab(id as TabType)}
              className={cn(
                "flex-1 rounded-xl py-2 text-xs font-bold transition-all",
                active
                  ? "bg-card text-foreground shadow-soft"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* List of News & Promotions */}
      <div className="flex flex-col gap-3">
        {filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-center text-muted-foreground">
            <Newspaper className="h-10 w-10 stroke-1" />
            <p className="font-semibold text-foreground text-sm">ไม่มีรายการในหมวดนี้</p>
            <p className="text-xs">ติดตามข่าวสารและโปรโมชันใหม่ ๆ ได้เร็ว ๆ นี้</p>
          </div>
        ) : (
          filteredItems.map((item) => {
            const isPromo = item.type === "promo";
            const linkedProduct = item.productId ? repo.getProduct(item.productId) : null;

            return (
              <div
                key={item.id}
                className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-soft transition-all hover:border-primary/40 hover:shadow-md"
              >
                {/* Header: Type, Discount badge, and Expiration date */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Pill tone={isPromo ? "accent" : "primary"}>
                      {isPromo ? <Tag className="mr-0.5 h-3 w-3" /> : <Newspaper className="mr-0.5 h-3 w-3" />}
                      {isPromo ? "โปรโมชัน" : "ข่าวสาร"}
                    </Pill>
                    {item.discount && (
                      <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[11px] font-bold text-destructive">
                        {item.discount}
                      </span>
                    )}
                  </div>

                  {item.validUntil && (
                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Clock className="h-3 w-3 text-warning" />
                      ถึง {item.validUntil}
                    </span>
                  )}
                </div>

                {/* Title & Detail */}
                <div>
                  <h2 className="text-sm font-bold leading-snug text-foreground">{item.title}</h2>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.detail}</p>
                </div>

                {/* Linked Product Card (โปรโมชันที่เกี่ยวกับสินค้า ให้กดแล้วไปที่สินค้านั้นได้) */}
                {linkedProduct && (
                  <Link
                    to="/products/$id"
                    params={{ id: linkedProduct.id }}
                    className="group mt-1 flex items-center gap-3 rounded-2xl border border-border/80 bg-secondary/40 p-2.5 transition-all hover:border-primary hover:bg-primary/5"
                  >
                    <ProductImage p={linkedProduct} className="h-14 w-14 shrink-0 rounded-xl" />
                    <div className="flex-1">
                      <p className="text-xs font-bold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                        {linkedProduct.name}
                      </p>
                      <p className="text-[11px] text-muted-foreground">{linkedProduct.unit}</p>
                      <div className="flex items-baseline gap-1.5 mt-0.5">
                        <span className="text-xs font-bold text-primary">{baht(linkedProduct.price)}</span>
                        {linkedProduct.originalPrice && (
                          <span className="text-[10px] text-muted-foreground line-through">
                            {baht(linkedProduct.originalPrice)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-xs font-semibold text-primary">
                      <span>ดูสินค้า</span>
                      <ChevronRight className="h-4 w-4" />
                    </div>
                  </Link>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

