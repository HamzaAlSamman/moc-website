"use client";

import { useState, createContext, useContext } from "react";
import AdminSidebar from "./AdminSidebar";
import AdminTopbar from "./AdminTopbar";

const ShellContext = createContext(null);
export const useShell = () => useContext(ShellContext);

export default function AdminShell({ children, user, fullWidth = false }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <ShellContext.Provider value={{ user, sidebarOpen, setSidebarOpen, mobileSidebarOpen, setMobileSidebarOpen }}>
      <div className="admin-layout flex h-screen overflow-hidden font-qomra">

        {/* Mobile overlay */}
        {mobileSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
            onClick={() => setMobileSidebarOpen(false)}
          />
        )}

        {/* Mobile Sidebar Drawer */}
        <aside
          className={`fixed top-0 right-0 h-full w-72 z-50 md:hidden transition-transform duration-300 ${
            mobileSidebarOpen ? "translate-x-0" : "translate-x-full"
          }`}
          style={{ background: "#003D33" }}
        >
          <div className="relative h-full overflow-hidden">
            <div
              className="absolute inset-0 opacity-[0.06] pointer-events-none z-0"
              style={{
                backgroundImage: "url('/custom-bg.png')",
                backgroundSize: "cover",
                backgroundPosition: "center",
                maskImage: "linear-gradient(to bottom, black 0%, transparent 100%)",
                WebkitMaskImage: "linear-gradient(to bottom, black 0%, transparent 100%)",
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#003D33]/50 to-[#003D33] pointer-events-none z-0" />
            <div className="absolute right-0 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-[#A48E68]/25 to-transparent pointer-events-none z-20" />
            <AdminSidebar onLinkClick={() => setMobileSidebarOpen(false)} />
          </div>
        </aside>

        {/* Desktop Sidebar */}
        <aside
          className={`hidden md:flex flex-col shrink-0 relative overflow-hidden select-none transition-all duration-500 ease-in-out ${
            sidebarOpen ? "w-72" : "w-20"
          }`}
          style={{ background: "#003D33" }}
        >
          <div
            className="absolute inset-0 pointer-events-none z-0"
            style={{
              backgroundImage: "url('/custom-bg.png')",
              backgroundSize: "cover",
              backgroundPosition: "center",
              opacity: 0.06,
              mixBlendMode: "soft-light",
              maskImage: "linear-gradient(to bottom, black 0%, transparent 100%)",
              WebkitMaskImage: "linear-gradient(to bottom, black 0%, transparent 100%)",
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#003D33]/50 to-[#003D33] pointer-events-none z-0" />
          <div className="absolute right-0 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-[#A48E68]/25 to-transparent pointer-events-none z-20" />
          <AdminSidebar collapsed={!sidebarOpen} />
        </aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
          {/* MOC decorative green bar */}
          <div className="moc-header-bar h-2 shrink-0" />
          <AdminTopbar />
          <main className="flex-1 overflow-x-hidden overflow-y-auto bg-slate-50 p-4 md:p-6">
            <div className={`mx-auto ${fullWidth ? "w-full max-w-none" : "max-w-7xl"}`} data-fullwidth={fullWidth.toString()}>
              {children}
            </div>
          </main>
        </div>
      </div>
    </ShellContext.Provider>
  );
}
