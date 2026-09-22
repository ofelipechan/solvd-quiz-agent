import { Outlet } from "react-router-dom";
import { Navbar } from "@/components/layout/sections/navbar";
import { Footer } from "@/components/layout/sections/footer";

/** Authenticated layout: sticky navbar, page outlet, footer. Pages render inside `<main>`. */
export function AppShell() {
  return (
    <div className="flex min-h-screen flex-col bg-white text-ink">
      <Navbar />
      <main className="mx-auto w-full max-w-site flex-1 px-5 py-fluid-lg">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
