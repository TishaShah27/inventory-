import { useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  Package,
  LayoutDashboard,
  ChevronDown,
  Leaf,
  ArrowDownToLine,
  ArrowUpFromLine,
  Boxes,
  Building2,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const mainMenu = [
  { title: "Inventory", url: "/inventory", search: { tab: "dashboard" }, icon: Package },
  { title: "Inward", url: "/inventory", search: { tab: "inward" }, icon: ArrowDownToLine },
  { title: "Outward", url: "/inventory", search: { tab: "outward" }, icon: ArrowUpFromLine },
];

const managementMenu = [
  { title: "Products", url: "/inventory", search: { tab: "products" }, icon: Boxes },
  { title: "Buyer", url: "/inventory", search: { tab: "b2b" }, icon: Building2 },
  { title: "Seller", url: "/inventory", search: { tab: "installer" }, icon: Users },
];

function NavGroup({
  label,
  icon: Icon,
  items,
  collapsed,
  currentTab,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  items: { title: string; url: string; search: { tab: string }; icon: React.ComponentType<{ className?: string }> }[];
  collapsed: boolean;
  currentTab: string;
}) {
  const [open, setOpen] = useState(true);

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="group/collapsible">
      <SidebarGroup className="mt-2 first:mt-0">
        {!collapsed && (
          <SidebarGroupLabel asChild>
            <CollapsibleTrigger className="flex h-11 w-full cursor-pointer items-center gap-2.5 rounded-md px-2 !text-sm !font-medium !text-sidebar-foreground !opacity-100 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                <Icon className="h-4 w-4" />
              </span>
              <span className="flex-1 text-left">{label}</span>
              <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180" />
            </CollapsibleTrigger>
          </SidebarGroupLabel>
        )}
        <CollapsibleContent>
          <SidebarGroupContent>
            <SidebarMenu
              className={cn(
                !collapsed &&
                  "relative mt-1 pl-[35px] before:absolute before:inset-y-0 before:left-[19px] before:w-px before:bg-sidebar-border before:content-['']",
              )}
            >
              {items.map((item) => {
                const isActive = currentTab === item.search.tab;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.title}
                      className="h-10 rounded-lg data-[active=true]:bg-primary data-[active=true]:text-primary-foreground data-[active=true]:font-semibold data-[active=true]:hover:bg-primary data-[active=true]:hover:text-primary-foreground"
                    >
                      <Link to={item.url as any} search={item.search as any}>
                        {!collapsed && <span className="h-px w-2.5 shrink-0 bg-current opacity-30" />}
                        <item.icon className="h-[18px] w-[18px]" />
                        <span className="font-medium">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </CollapsibleContent>
      </SidebarGroup>
    </Collapsible>
  );
}

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const search = useRouterState({ select: (r) => r.location.search }) as { tab?: string };
  const currentTab = search?.tab || "dashboard";

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarHeader className="px-4 py-5">
        <Link to="/inventory" search={{ tab: "dashboard" }} className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary text-primary-foreground shadow-soft">
            <Leaf className="h-5 w-5" />
          </div>
          {!collapsed && (
            <div className="leading-tight">
              <div className="text-[15px] font-semibold tracking-tight">Go Zero</div>
              <div className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
                Inventory Suite
              </div>
            </div>
          )}
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-2 space-y-1">
        <NavGroup
          label="Main Menu"
          icon={LayoutDashboard}
          items={mainMenu}
          collapsed={collapsed}
          currentTab={currentTab}
        />
        <NavGroup
          label="Masters & Partners"
          icon={Boxes}
          items={managementMenu}
          collapsed={collapsed}
          currentTab={currentTab}
        />
      </SidebarContent>
    </Sidebar>
  );
}
