
import {
    LayoutDashboard,
    Sprout,
    Map,
    CloudSun,
    Bot,
    Settings,
    Leaf,
  } from "lucide-react";

  type Page =
    | "Overview"
    | "Field Monitoring"
    | "Region Explorer"
    | "Soil & Weather"
    | "AI Assistant";

  interface SidebarProps {
    activePage: Page;
    onNavigate: (page: Page) => void;
  }

  const navigation = [
    { name: "Overview" as const, icon: LayoutDashboard },
    { name: "Field Monitoring" as const, icon: Sprout },
    { name: "Region Explorer" as const, icon: Map },
    { name: "Soil & Weather" as const, icon: CloudSun },
    { name: "AI Assistant" as const, icon: Bot },
  ];

  export default function Sidebar({
    activePage,
    onNavigate,
  }: SidebarProps) {
    return (
      <aside className="w-64 min-h-screen shrink-0 bg-[#10271D] text-white flex flex-col p-5">
        <div className="flex items-center gap-3 mb-12">
          <div className="bg-[#B9E769] p-2 rounded-xl">
            <Leaf className="text-[#10271D]" size={25} />
          </div>

          <div>
            <h1 className="text-xl font-bold tracking-wide">
              AgriSense
            </h1>
            <p className="text-xs text-gray-400">
              Agricultural Intelligence
            </p>
          </div>
        </div>

        <p className="text-xs uppercase tracking-widest text-gray-500 mb-4">
          Workspace
        </p>

        <nav className="space-y-2">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.name;

            return (
              <button
                key={item.name}
                onClick={() => onNavigate(item.name)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition ${
                  isActive
                    ? "bg-[#B9E769] text-[#10271D] font-semibold"
                    : "text-gray-300 hover:bg-white/10"
                }`}
              >
                <Icon size={19} />
                {item.name}
              </button>
            );
          })}
        </nav>

        <div className="mt-auto border-t border-white/10 pt-5">
          <button className="flex items-center gap-3 text-gray-400 text-sm">
            <Settings size={19} />
            Settings
          </button>
        </div>
      </aside>
    );
  }
