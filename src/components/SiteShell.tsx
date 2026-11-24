"use client";

import { usePathname } from "next/navigation";
import { CartProvider } from "../contexts/CartContext";
import Header from "./Header";
import Footer from "./Footer";
import CartDrawer from "./CartDrawer";
import MobileOrderBar from "./MobileOrderBar";

export default function SiteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdminRoute = pathname.startsWith("/admin");

  if (isAdminRoute) {
    return <>{children}</>;
  }

  return (
    <CartProvider>
      <Header />
      <main className="flex-grow">{children}</main>
      <Footer />
      <MobileOrderBar />
      <CartDrawer />
    </CartProvider>
  );
}