import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { useRouterState } from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";
import { BottomNav, NotificationCenterModal, OnboardingModal, QrOverlay, ReceiptModal } from "@/components/app/ui";
import { StoreProvider } from "@/lib/store";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "theme-color", content: "#EA580C" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@400;500;600;700&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="th">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <StoreProvider>
        <AppFrame />
      </StoreProvider>
    </QueryClientProvider>
  );
}

function AppFrame() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const hideNav = path.startsWith("/login");
  return (
    <div className="min-h-screen bg-stone-100/90 py-0 md:py-6 md:px-4">
      <div className="relative mx-auto flex min-h-screen w-full max-w-[430px] flex-col bg-background md:min-h-[calc(100vh-3rem)] md:overflow-hidden md:rounded-[2.5rem] md:border md:border-border/80 md:shadow-frame">
        {/* Subtle mobile status bar simulator on desktop */}
        <div className="hidden md:flex items-center justify-between px-6 pt-3 pb-1 text-[11px] font-semibold text-muted-foreground select-none border-b border-border/20">
          <span>09:41</span>
          <div className="h-4 w-24 rounded-full bg-stone-900/10 mx-auto" />
          <div className="flex items-center gap-1.5">
            <span className="text-[10px]">5G</span>
            <div className="h-2.5 w-5 rounded-xs border border-muted-foreground/60 p-0.5">
              <div className="h-full w-full bg-muted-foreground rounded-xs" />
            </div>
          </div>
        </div>
        <main className="flex-1 pb-4">
          <Outlet />
        </main>
        {!hideNav && <BottomNav />}
        <QrOverlay />
        <OnboardingModal />
        <ReceiptModal />
        <NotificationCenterModal />
        <Toaster position="top-center" />
      </div>
    </div>
  );
}
