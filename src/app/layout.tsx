import type { Metadata, Viewport } from "next";
import "./globals.css";
import "../components/retro/retro.css";
import "../components/retro/retro-scrollbars.css";
import "../components/retro/retro-admin.css";
import "../components/retro/retro-hub.css";
import "../components/retro/retro-app-manager.css";
import "../components/retro/retro-tableview.css";
import "../components/retro/retro-admin-gestion.css";
import "../components/retro/retro-tarifas.css";
import "../components/retro/retro-user-movements.css";
import "../components/retro/retro-select.css";
import "../components/retro/retro-manager-modals.css";
import "../components/retro/retro-api.css";

export const metadata: Metadata = {
  title: "Administración Alpha",
  description: "Panel de administración Administración Alpha",
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
