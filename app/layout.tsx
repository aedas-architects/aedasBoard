import type { Metadata } from "next";
import {
  Caveat,
  Inter,
  Instrument_Serif,
  Lora,
  Montserrat,
  Playfair_Display,
  Poppins,
  Space_Mono,
} from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

// App chrome fonts — only these two drive the UI.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  weight: "400",
  style: ["normal", "italic"],
  subsets: ["latin"],
  display: "swap",
});

// Extra text-tool fonts. Exposed as CSS variables so the style bar can
// apply them via inline style without creating Tailwind utilities for each.
const playfair = Playfair_Display({
  variable: "--font-playfair",
  weight: ["400", "700"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  display: "swap",
});

const lora = Lora({
  variable: "--font-lora",
  weight: ["400", "700"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  display: "swap",
});

const poppins = Poppins({
  variable: "--font-poppins",
  weight: ["400", "600"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  display: "swap",
});

const montserrat = Montserrat({
  variable: "--font-montserrat",
  weight: ["400", "600"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  display: "swap",
});

const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  weight: ["400", "700"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  display: "swap",
});

const caveat = Caveat({
  variable: "--font-caveat",
  weight: ["400", "700"],
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Aedas Board",
  description: "A whiteboard built for architects.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const fontVars = [
    inter.variable,
    instrumentSerif.variable,
    playfair.variable,
    lora.variable,
    poppins.variable,
    montserrat.variable,
    spaceMono.variable,
    caveat.variable,
  ].join(" ");

  return (
    <html lang="en" className={`${fontVars} h-full antialiased`}>
      <body className="h-full"><Providers>{children}</Providers></body>
    </html>
  );
}
