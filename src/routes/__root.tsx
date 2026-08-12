import { useEffect, useRef, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  useNavigate,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import appCss from "../styles.css?url";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/crm/AppSidebar";
import { TopNav } from "@/components/crm/TopNav";
import { ThemeProvider } from "@/components/crm/ThemeProvider";
import { Toaster } from "@/components/ui/sonner";
import { getSession } from "@/lib/employeeService";
import { logPageVisit } from "@/lib/employeeActivityService";

const PAGE_NAMES: Record<string, string> = {
  "/": "Store",
  "/store": "Store",
  "/inventory": "Inventory",
};

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-gradient-primary">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          This page doesn't exist or has been moved.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex rounded-md gradient-primary px-4 py-2 text-sm font-medium text-white shadow-glow"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">This page didn't load</h1>
        <p className="mt-2 text-sm text-muted-foreground">Something went wrong. Try again.</p>
        <button
          onClick={() => {
            router.invalidate();
            reset();
          }}
          className="mt-6 inline-flex rounded-md gradient-primary px-4 py-2 text-sm font-medium text-white shadow-glow"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Aris Solar CRM — Solar Operations Dashboard" },
      {
        name: "description",
        content:
          "Aris Solar CRM is a modern dashboard for solar panel installation companies — leads, quotations, installations, payments and analytics.",
      },
      { property: "og:title", content: "Aris Solar CRM" },
      {
        property: "og:description",
        content: "Modern CRM dashboard for solar installation companies.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
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
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const lastTrackedPath = useRef<string>("");
  const [authChecked, setAuthChecked] = useState(false);

  // Auth check for standalone Inventory app
  useEffect(() => {
    setAuthChecked(true);
  }, [pathname, navigate]);

  // Auto-track every page the logged-in employee visits
  useEffect(() => {
    if (pathname === "/login") return;
    if (pathname === lastTrackedPath.current) return;
    lastTrackedPath.current = pathname;

    const session = getSession();
    if (!session) return;

    const basePath = "/" + pathname.split("/")[1];
    const pageName = PAGE_NAMES[basePath] ?? basePath.replace("/", "").replace(/-/g, " ");
    logPageVisit(session.id, session.name, pageName, pathname).catch(() => {});
  }, [pathname]);

  if (pathname === "/login") {
    return (
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <Outlet />
          <Toaster richColors position="top-right" />
        </ThemeProvider>
      </QueryClientProvider>
    );
  }

  if (!authChecked) return null;

  const role = getSession()?.role;
  const isCustomer = role === ("Customer" as string);
  const isFieldStaff = role === "Action Staff" || role === "Service Staff";
  const hideSidebar = isCustomer || isFieldStaff;

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <SidebarProvider>
          <div className="flex min-h-screen w-full bg-background">
            {!hideSidebar && <AppSidebar />}
            <SidebarInset className="flex min-w-0 flex-1 flex-col">
              <TopNav hideSidebarTrigger={hideSidebar} />
              <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
                <Outlet />
              </main>
            </SidebarInset>
          </div>
          <Toaster richColors position="top-right" />
        </SidebarProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
