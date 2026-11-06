import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Filter, RotateCcw, Search, X } from "lucide-react";
import { CatIcon, Pill, ProductCard, QrFab } from "@/components/app/ui";
import { repo } from "@/lib/data/repo";
import { cn } from "@/lib/utils";

type SearchParams = {
  q?: string;
  cat?: string;
  price?: string;
};

const priceRanges = [
  { id: "", label: "ทุกราคา", min: 0, max: Infinity },
  { id: "0-20", label: "ต่ำกว่า ฿20", min: 0, max: 20 },
  { id: "20-100", label: "฿20–100", min: 20, max: 100 },
  { id: "100+", label: "฿100 ขึ้นไป", min: 100, max: Infinity },
];

export const Route = createFileRoute("/products/")({
  validateSearch: (s: Record<string, unknown>): SearchParams => ({
    q: typeof s.q === "string" ? s.q : undefined,
    cat: typeof s.cat === "string" ? s.cat : undefined,
    price: typeof s.price === "string" ? s.price : undefined,
  }),
  head: () => ({
    meta: [
      { title: "สินค้าทั้งหมด — รุ่งอรุณ มินิมาร์ท" },
      {
        name: "description",
        content: "เลือกซื้อสินค้าร้านรุ่งอรุณ ค้นหาและกรองตามหมวดและราคา พร้อมจัดส่งถึงบ้าน",
      },
      { property: "og:title", content: "สินค้าทั้งหมด — รุ่งอรุณ" },
      { property: "og:description", content: "ค้นหาและสั่งซื้อสินค้าใกล้บ้าน" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Products,
});

function Products() {
  const { q = "", cat = "", price = "" } = Route.useSearch();
  const nav = useNavigate({ from: "/products/" });

  const setFilter = (patch: SearchParams) =>
    nav({
      search: (s) => ({ ...s, ...patch }),
      replace: true,
    });

  const resetFilters = () => {
    nav({
      search: () => ({}),
      replace: true,
    });
  };

  const selectedRange = priceRanges.find((x) => x.id === price) ?? priceRanges[0];
  const allProducts = repo.listProducts();
  const categories = repo.listCategories();

  const filteredProducts = allProducts.filter((p) => {
    const matchCat = !cat || p.categoryId === cat;
    const query = q.trim().toLowerCase();
    const matchQuery =
      !query ||
      p.name.toLowerCase().includes(query) ||
      p.description.toLowerCase().includes(query) ||
      p.id.toLowerCase().includes(query);
    const matchPrice = p.price >= selectedRange.min && p.price < selectedRange.max;
    return matchCat && matchQuery && matchPrice;
  });

  const hasActiveFilters = Boolean(q || cat || price);

  return (
    <div className="flex flex-col gap-4 pb-8 pt-4">
      {/* Header */}
      <div className="flex items-center justify-between px-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">สินค้าทั้งหมด</h1>
          <p className="text-xs text-muted-foreground">ของกินของใช้ สะอาด ได้มาตรฐาน</p>
        </div>
        {hasActiveFilters && (
          <button
            onClick={resetFilters}
            className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            ล้างตัวกรอง
          </button>
        )}
      </div>

      {/* Search Bar */}
      <div className="mx-4 flex h-12 items-center gap-2 rounded-2xl border border-border bg-card px-4 shadow-soft focus-within:border-primary">
        <Search className="h-5 w-5 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setFilter({ q: e.target.value || undefined })}
          placeholder="ค้นหาชื่อสินค้า..."
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        {q && (
          <button
            onClick={() => setFilter({ q: undefined })}
            className="rounded-full p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
            aria-label="ล้างการค้นหา"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Category Pills */}
      <div>
        <div className="mb-2 flex items-center gap-1.5 px-4 text-xs font-semibold text-muted-foreground">
          <span>หมวดหมู่</span>
        </div>
        <div className="no-scrollbar flex gap-2 overflow-x-auto px-4">
          <button
            onClick={() => setFilter({ cat: undefined })}
            className={cn(
              "flex h-9 shrink-0 items-center rounded-full px-4 text-xs font-semibold transition-all",
              !cat
                ? "bg-primary text-primary-foreground shadow-soft"
                : "border border-border bg-card text-foreground hover:bg-secondary"
            )}
          >
            ทั้งหมด
          </button>
          {categories.map((c) => {
            const active = cat === c.id;
            return (
              <button
                key={c.id}
                onClick={() => setFilter({ cat: active ? undefined : c.id })}
                className={cn(
                  "flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-xs font-semibold transition-all",
                  active
                    ? "bg-primary text-primary-foreground shadow-soft"
                    : "border border-border bg-card text-foreground hover:bg-secondary"
                )}
              >
                <CatIcon name={c.icon} className="h-3.5 w-3.5" />
                <span>{c.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Price Range Pills */}
      <div>
        <div className="mb-2 flex items-center gap-1.5 px-4 text-xs font-semibold text-muted-foreground">
          <span>ช่วงราคา</span>
        </div>
        <div className="no-scrollbar flex gap-2 overflow-x-auto px-4">
          {priceRanges.map((range) => {
            const active = price === range.id;
            return (
              <button
                key={range.id}
                onClick={() => setFilter({ price: active ? undefined : range.id || undefined })}
                className={cn(
                  "h-8 shrink-0 rounded-full px-3 text-xs font-medium transition-all",
                  active
                    ? "bg-primary text-primary-foreground shadow-soft"
                    : "border border-border bg-card text-muted-foreground hover:text-foreground"
                )}
              >
                {range.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Results Count & Active Badge */}
      <div className="flex items-center justify-between px-4 text-xs text-muted-foreground">
        <span>
          พบทั้งหมด <strong className="text-foreground">{filteredProducts.length}</strong> รายการ
        </span>
        {cat && (
          <Pill tone="accent">
            หมวด: {categories.find((c) => c.id === cat)?.name}
          </Pill>
        )}
      </div>

      {/* 2-Column Product Grid */}
      <div className="grid grid-cols-2 gap-3 px-4">
        {filteredProducts.map((p) => (
          <ProductCard key={p.id} p={p} />
        ))}
      </div>

      {/* Empty State (ไม่พบสินค้าให้แสดงข้อความ "ไม่พบสินค้าที่ค้นหา" พร้อมปุ่มล้างตัวกรอง) */}
      {filteredProducts.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-secondary text-muted-foreground">
            <Search className="h-8 w-8" />
          </div>
          <p className="font-bold text-foreground text-base">ไม่พบสินค้าที่ค้นหา</p>
          <p className="text-xs text-muted-foreground">ลองเปลี่ยนคำค้นหา หรือกดปุ่มล้างตัวกรองเพื่อดูสินค้าทั้งหมด</p>
          <button
            onClick={resetFilters}
            className="mt-2 flex items-center gap-1.5 rounded-2xl bg-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground shadow-soft hover:bg-primary-strong active:scale-95 transition-all"
          >
            <RotateCcw className="h-4 w-4" />
            ล้างตัวกรอง
          </button>
        </div>
      )}

      {/* Floating QR Action Button */}
      <QrFab />
    </div>
  );
}
