import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  Bell,
  ChevronRight,
  Gift,
  HelpCircle,
  Search,
  Sparkles,
  Star,
  Tag,
  X,
} from "lucide-react";
import { useState } from "react";
import { CatIcon, Logo, Pill, PrimaryButton, ProductCard, QrFab } from "@/components/app/ui";
import { repo } from "@/lib/data/repo";
import type { Promotion } from "@/lib/data/types";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "รุ่งอรุณ มินิมาร์ท — สั่งง่าย สะสมแต้ม" },
      {
        name: "description",
        content: "แอปสมาชิกร้านรุ่งอรุณ มินิมาร์ท สั่งซื้อสินค้า สะสมแต้ม และติดตามการจัดส่ง",
      },
      { property: "og:title", content: "รุ่งอรุณ มินิมาร์ท" },
      { property: "og:description", content: "สั่งซื้อสินค้า สะสมแต้ม ติดตามการจัดส่ง ในแอปเดียว" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

function Home() {
  const { member, setOnboardingOpen, setNotificationOpen } = useStore();
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const [selectedPromo, setSelectedPromo] = useState<Promotion | null>(null);

  const products = repo.listProducts();
  const promos = repo.listPromotions();
  const categories = repo.listCategories();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (q.trim()) {
      nav({ to: "/products", search: { q: q.trim() } });
    }
  };

  const unreadCount = member?.notifications.filter((n) => !n.read).length ?? 0;

  return (
    <div className="flex flex-col gap-5 pb-8">
      {/* Top Header */}
      <header className="flex items-center justify-between px-4 pt-4">
        <Logo />
        <div className="flex items-center gap-2">
          <button
            onClick={() => setOnboardingOpen(true)}
            aria-label="แนะนำการใช้งาน"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-muted-foreground transition-colors hover:text-primary"
            title="แนะนำการใช้งาน"
          >
            <HelpCircle className="h-5 w-5" />
          </button>
          {member ? (
            <button
              type="button"
              onClick={() => setNotificationOpen(true)}
              className="relative flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-foreground transition-colors hover:text-primary"
              aria-label="ศูนย์การแจ้งเตือน"
              title="ศูนย์การแจ้งเตือน"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                  {unreadCount}
                </span>
              )}
            </button>
          ) : (
            <Link
              to="/login"
              className="rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/20"
            >
              เข้าสู่ระบบ
            </Link>
          )}
        </div>
      </header>

      {/* Main Banner: Points earning rule */}
      <div className="mx-4 overflow-hidden rounded-3xl bg-sunrise p-5 text-primary-foreground shadow-frame">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-medium backdrop-blur-xs">
              <Sparkles className="h-3 w-3" /> สิทธิประโยชน์สมาชิก
            </span>
            <p className="text-sm font-medium text-white/90">ทุกช่องทาง ทั้งหน้าร้านและในแอป</p>
            <h1 className="text-2xl font-bold tracking-tight text-white">ซื้อครบ 50 บาท ได้ 5 แต้ม</h1>
          </div>
        </div>
        <p className="mt-3 text-xs text-white/80">สะสมแต้มง่าย ๆ ใช้ 10 แต้ม = ส่วนลด 1 บาท ทุกการสั่งซื้อ</p>
      </div>

      {/* Member Points Card */}
      <Link
        to={member ? "/account" : "/login"}
        className="mx-4 flex items-center gap-3.5 rounded-2xl border border-border bg-card p-4 shadow-soft transition-all hover:border-primary/40 hover:shadow-md"
      >
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent/20 text-accent">
          <Star className="h-6 w-6 fill-current" />
        </div>
        <div className="flex-1">
          <p className="text-xs font-medium text-muted-foreground">แต้มสะสมของฉัน</p>
          {member ? (
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold tracking-tight text-foreground">
                {member.points.toLocaleString("th-TH")}{" "}
                <span className="text-xs font-normal text-muted-foreground">แต้ม</span>
              </p>
              <span className="rounded-full bg-accent/15 px-2 py-0.5 text-xs font-medium text-accent-foreground">
                ใช้ลดได้ ฿{Math.floor(member.points / 10)}
              </span>
            </div>
          ) : (
            <p className="text-sm font-semibold text-primary">เข้าสู่ระบบเพื่อดูแต้มสะสมและสิทธิพิเศษ</p>
          )}
        </div>
        <ChevronRight className="h-5 w-5 text-muted-foreground" />
      </Link>

      {/* Search Input */}
      <form onSubmit={handleSearch} className="mx-4 flex h-12 items-center gap-2 rounded-2xl border border-border bg-card px-4 shadow-soft focus-within:border-primary">
        <Search className="h-5 w-5 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="ค้นหาชื่อสินค้า เช่น บะหมี่, สบู่, แชมพู..."
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        {q && (
          <button type="button" onClick={() => setQ("")} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        )}
      </form>

      {/* Birthday & New Year Gift Announcement */}
      <div className="mx-4 flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50/70 p-3.5 text-xs text-amber-900 shadow-soft">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
          <Gift className="h-5 w-5" />
        </div>
        <div className="flex-1 leading-relaxed">
          <span className="font-bold">ของขวัญวันเกิดและเทศกาลปีใหม่:</span> ร้านจัดส่งให้สมาชิกตามที่อยู่หลัก ลูกค้าจะได้รับการแจ้งเตือนอัตโนมัติ
        </div>
      </div>

      {/* Categories */}
      <section>
        <div className="mb-3 flex items-center justify-between px-4">
          <h2 className="text-base font-bold text-foreground">หมวดหมู่สินค้า</h2>
          <Link to="/products" className="text-xs font-semibold text-primary hover:underline">
            ดูทั้งหมด ({categories.length})
          </Link>
        </div>
        <div className="no-scrollbar flex gap-3 overflow-x-auto px-4">
          {categories.map((c) => (
            <Link
              key={c.id}
              to="/products"
              search={{ cat: c.id }}
              className="group flex w-20 shrink-0 flex-col items-center gap-1.5 text-center"
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-card text-primary shadow-soft transition-transform group-hover:scale-105 group-hover:border-primary/50">
                <CatIcon name={c.icon} className="h-6 w-6" />
              </span>
              <span className="line-clamp-1 text-xs font-medium text-foreground">{c.name}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Promotions Horizontal Scroll */}
      <section>
        <div className="mb-3 flex items-center justify-between px-4">
          <div>
            <h2 className="text-base font-bold text-foreground">โปรโมชันตอนนี้</h2>
            <p className="text-[11px] text-muted-foreground">ข้อเสนอพิเศษและสิทธิประโยชน์สมาชิก</p>
          </div>
          <Link to="/promotions" className="text-xs font-semibold text-primary hover:underline">
            ดูข่าวสารทั้งหมด
          </Link>
        </div>
        <div className="no-scrollbar flex snap-x gap-3 overflow-x-auto px-4">
          {promos.map((p) => (
            <div
              key={p.id}
              onClick={() => setSelectedPromo(p)}
              className="flex w-68 shrink-0 cursor-pointer snap-start flex-col justify-between rounded-2xl border border-border bg-card p-4 shadow-soft transition-all hover:border-primary/40 hover:shadow-md"
            >
              <div>
                <div className="flex items-center justify-between">
                  <Pill tone="accent">
                    <Tag className="mr-1 h-3 w-3" />
                    {p.badge || "โปรโมชัน"}
                  </Pill>
                  {p.validUntil && (
                    <span className="text-[11px] text-muted-foreground">ถึง {p.validUntil}</span>
                  )}
                </div>
                <p className="mt-2.5 font-bold leading-snug text-foreground">{p.title}</p>
                <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                  {p.detail}
                </p>
              </div>
              <div className="mt-3 flex items-center justify-end text-xs font-semibold text-primary">
                <span>ดูรายละเอียด</span>
                <ChevronRight className="h-4 w-4" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Featured Products */}
      <section className="px-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-foreground">สินค้าแนะนำ</h2>
            <p className="text-xs text-muted-foreground">สินค้าขายดีประจำร้านรุ่งอรุณ</p>
          </div>
          <Link to="/products" className="text-xs font-semibold text-primary hover:underline">
            ดูสินค้าทั้งหมด ({products.length})
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {products.slice(0, 4).map((p) => (
            <ProductCard key={p.id} p={p} />
          ))}
        </div>
      </section>

      {/* Promo Detail Modal */}
      {selectedPromo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="relative flex w-full max-w-sm flex-col overflow-hidden rounded-3xl bg-card p-6 shadow-frame">
            <button
              onClick={() => setSelectedPromo(null)}
              className="absolute right-4 top-4 rounded-full p-1 text-muted-foreground hover:bg-secondary"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2">
              <Pill tone="accent">{selectedPromo.badge || "โปรโมชันพิเศษ"}</Pill>
              {selectedPromo.validUntil && (
                <span className="text-xs text-warning">ใช้ได้ถึง {selectedPromo.validUntil}</span>
              )}
            </div>
            <h3 className="mt-3 text-lg font-bold text-foreground">{selectedPromo.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{selectedPromo.detail}</p>
            {selectedPromo.productId && (
              <div className="mt-4">
                <Link
                  to="/products/$id"
                  params={{ id: selectedPromo.productId }}
                  onClick={() => setSelectedPromo(null)}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-sm font-semibold text-primary-foreground shadow-soft hover:bg-primary-strong"
                >
                  ดูสินค้าในโปรโมชันนี้
                </Link>
              </div>
            )}
            <button
              onClick={() => setSelectedPromo(null)}
              className="mt-2 h-11 w-full rounded-2xl text-sm font-semibold text-muted-foreground hover:bg-secondary"
            >
              ปิดหน้าต่าง
            </button>
          </div>
        </div>
      )}

      {/* Floating Member QR Action Button */}
      <QrFab />
    </div>
  );
}
