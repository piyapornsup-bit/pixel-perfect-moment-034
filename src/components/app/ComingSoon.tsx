import { LoginRequired } from "./ui";
import { useStore } from "@/lib/store";
import type { ReactNode } from "react";

export function MemberPage({ title, children }: { title: string; children: ReactNode }) {
  const { member } = useStore();
  if (!member) return <LoginRequired title={title} />;
  return (
    <div className="flex flex-col gap-4 p-4">
      <h1 className="text-2xl font-bold">{title}</h1>
      {children}
    </div>
  );
}
