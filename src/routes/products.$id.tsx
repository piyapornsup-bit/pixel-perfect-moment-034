import { createFileRoute, Link, notFound, useNavigate, useRouter } from "@tanstack/react-router";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Coins,
  Minus,
  Plus,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Truck,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { CatIcon, Pill, PrimaryButton, ProductCard, ProductImage } from "@/components/app/ui";
import { repo } from "@/lib/data/repo";
import { baht, pointsEarned } from "@/lib/rules";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/products/$id")({
  loader: ({ params }) => {
    const p = repo.getProduct(params.id);
    if (!p) throw notFound();
    return p;
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.name} — ร้านรุ่งอรุณ` },
          { name: "description", content: loaderData.description },
          { property: "og:title", content: loaderData.name },
          { property: "og:description", content: loaderData.description },
          { property: "og:type", content: "product" },
          { name: "twitter:card", content: "summary" },
        ]
      : [{ title: "ไม่พบสินค้า — ร้านรุ่งอรุณ" }, { name: "robots", content: "noindex" }],
  }),
  component: Detail,
});

function Detail() {
  const p = Route.useLoaderData();
  const router = useRouter();
  const nav = useNavigate();
  const { addToCart, cartCount } = useStore();
  const [qty, setQty] = useState(1);
  const outOfStock = p.stock <= 0;

  const category = repo.listCategories().find((c) => c.id === p.categoryId);
  const estimatedPoints = pointsEarned(p.price * qty);
  const related = repo
    .listProducts()
    .filter((item) => item.categoryId === p.categoryId && item.id !== p.id)
    .slice(0, 2);

  const handleBuyNow = () => {
    if (outOfStock) return;
    addToCart(p.id, qty);
    nav({ to: "/cart" });
  };

  return (
    <div className="flex flex-col pb-12">
      {/* Top Image with Back and Cart Button */}
      <div className="relative">
        <ProductImage p={p} className="aspect-square w-full" />
        <button
          aria-label="ย้อนกลับ"
          onClick={() => router.history.back()}
          className="absolute left-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-card/90 text-foreground shadow-soft backdrop-blur-xs transition-colors hover:bg-card"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <Link
          to="/cart"
          aria-label="ดูตะกร้าสินค้า"
          className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-card/90 text-foreground shadow-soft backdrop-blur-xs transition-colors hover:bg-card"
        >
          <ShoppingCart className="h-5 w-5" />
          {cartCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
              {cartCount}
            </span>
          )}
        </Link>
      </div>

      {/* Main Info */}
      <div className="flex flex-col gap-4 p-5">
        {/* Badges: Stock status, Category, Promo */}
        <div className="flex flex-wrap items-center gap-2">
          <Pill tone={outOfStock ? "danger" : "success"}>
            {outOfStock ? "สินค้าหมดชั่วคราว" : `มีสินค้าพร้อมส่ง (${p.stock} ${p.unit})`}
          </Pill>
          {category && (
            <Link to="/products" search={{ cat: category.id }}>
              <Pill tone="muted" className="hover:border-primary/40 transition-colors">
                <CatIcon name={category.icon} className="h-3 w-3" />
                หมวด: {category.name}
              </Pill>
            </Link>
          )}
          {p.promoLabel && (
            <Pill tone="accent">
              <Sparkles className="h-3 w-3" />
              {p.promoLabel}
            </Pill>
          )}
        </div>

        {/* Title, Unit, Category & ID */}
        <div>
          <h1 className="text-xl font-bold leading-tight text-foreground">{p.name}</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            หน่วย: <strong className="text-foreground">{p.unit}</strong> · หมวดหมู่:{" "}
            <strong className="text-foreground">{category?.name || p.categoryId}</strong> · รหัส: {p.id}
          </p>
        </div>

        {/* Price & Savings */}
        <div className="flex items-baseline gap-3 rounded-2xl bg-secondary/60 p-3.5">
          <span className="text-3xl font-extrabold text-primary">{baht(p.price)}</span>
          {p.originalPrice && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground line-through">
                {baht(p.originalPrice)}
              </span>
              <span className="rounded-md bg-destructive/10 px-1.5 py-0.5 text-xs font-semibold text-destructive">
                ประหยัด {baht(p.originalPrice - p.price)}
              </span>
            </div>
          )}
        </div>

        {/* Points Reward Box */}
        <div className="flex items-center gap-2.5 rounded-2xl border border-accent/30 bg-accent/10 p-3 text-xs text-accent-foreground">
          <Coins className="h-5 w-5 shrink-0 text-accent" />
          <span>
            ซื้อสินค้านี้จะได้รับประมาณ <strong>+{estimatedPoints} แต้ม</strong> (ทุก 50 บาท รับ 5 แต้ม)
          </span>
        </div>

        {/* Description */}
        <div>
          <h2 className="mb-1 text-sm font-bold text-foreground">รายละเอียดสินค้า</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">{p.description}</p>
        </div>

        {/* Stock Status & Service Perks */}
        <div className="grid grid-cols-2 gap-2 rounded-2xl border border-border p-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Truck className="h-4 w-4 text-primary" />
            <span>ส่งฟรีเมื่อซื้อครบ ฿300</span>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-success" />
            <span>สินค้าคุณภาพแท้ 100%</span>
          </div>
        </div>

        {/* Quantity Stepper (if in stock) */}
        {!outOfStock && (
          <div className="flex items-center justify-between rounded-2xl border border-border p-3">
            <div>
              <span className="text-sm font-medium text-foreground">จำนวนที่ต้องการ</span>
              <p className="text-[11px] text-muted-foreground">คงเหลือ {p.stock} {p.unit}</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                aria-label="ลดจำนวน"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-foreground transition-colors hover:bg-secondary active:scale-95 disabled:opacity-40"
                disabled={qty <= 1}
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-8 text-center text-base font-bold text-foreground">{qty}</span>
              <button
                type="button"
                aria-label="เพิ่มจำนวน"
                onClick={() => setQty((q) => Math.min(p.stock, q + 1))}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-foreground transition-colors hover:bg-secondary active:scale-95 disabled:opacity-40"
                disabled={qty >= p.stock}
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Actions: "เพิ่มลงตะกร้า" และ "ซื้อเลย" (ตามข้อกำหนด) */}
        <div className="mt-2 flex flex-col gap-2">
          {outOfStock ? (
            <PrimaryButton disabled className="bg-muted text-muted-foreground">
              สินค้าหมดชั่วคราว
            </PrimaryButton>
          ) : (
            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => addToCart(p.id, qty)}
                className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl border-2 border-primary bg-card text-xs font-bold text-primary shadow-xs transition-all hover:bg-primary/5 active:scale-[0.99]"
              >
                <ShoppingCart className="h-4 w-4" />
                เพิ่มลงตะกร้า
              </button>

              <PrimaryButton
                onClick={handleBuyNow}
                className="flex-1 text-xs"
              >
                <Zap className="h-4 w-4" />
                ซื้อเลย ({baht(p.price * qty)})
              </PrimaryButton>
            </div>
          )}
        </div>

        {/* Related Products */}
        {related.length > 0 && (
          <div className="mt-6">
            <h2 className="mb-3 text-sm font-bold text-foreground">สินค้าอื่นในหมวดเดียวกัน</h2>
            <div className="grid grid-cols-2 gap-3">
              {related.map((item) => (
                <ProductCard key={item.id} p={item} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
