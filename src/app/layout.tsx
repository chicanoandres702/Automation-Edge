import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";
import "./globals.css";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/toaster";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Automaton Edge Extension",
  description: "AI Browser Automation Sidebar Extension",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} dark`} suppressHydrationWarning>
      <body className="font-body antialiased bg-background text-foreground selection:bg-accent/30 selection:text-accent overflow-hidden h-screen w-screen">
        <SidebarProvider defaultOpen={false}>
          {children}
          <Toaster />
        </SidebarProvider>
      </body>
    </html>
  );
}
