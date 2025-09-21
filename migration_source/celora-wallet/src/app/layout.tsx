import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { WalletProvider } from "@/components/providers/WalletProvider";
import { Navbar } from "@/components/layout/Navbar";
import { SupabaseProvider } from "@/context/SupabaseContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Celora Wallet - Your Gateway to Web3",
  description: "Secure cryptocurrency wallet for Solana and Ethereum. Send, receive, stake, and manage your digital assets with Celora.",
  keywords: "cryptocurrency, wallet, Solana, Ethereum, DeFi, blockchain, crypto",
  authors: [{ name: "Celora Team" }],
  viewport: "width=device-width, initial-scale=1",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.className} min-h-screen bg-gradient-to-br from-dark-bg via-dark-surface to-dark-card text-dark-text antialiased`}
      >
        <SupabaseProvider>
          <WalletProvider>
            <div className="flex flex-col min-h-screen">
              <Navbar />
              <main className="flex-1">
                {children}
              </main>
            </div>
          </WalletProvider>
        </SupabaseProvider>
      </body>
    </html>
  );
}
