import { Outfit } from 'next/font/google';
import './globals.css';
import { Toaster } from "sonner";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { SidebarProvider } from '@/context/SidebarContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { env } from "@/lib/env";
import { InstallSettingsProvider } from "@/modules/install/components/InstallSettingsProvider";
import { getInstallSettings, toView } from "@/modules/install/queries/install";

const outfit = Outfit({
 subsets: ["latin"],
});

export const dynamic = "force-dynamic";

export default async function RootLayout({
 children,
}: Readonly<{
 children: React.ReactNode;
}>) {
 let settingsForProvider = null;
 if (env.INSTALL_GATE) {
  const row = await getInstallSettings();
  settingsForProvider = row ? toView(row) : null;
 }

 return (
  <html lang="en">
   <body className={`${outfit.className} `}>
    <NuqsAdapter>
     <ThemeProvider>
      <InstallSettingsProvider settings={settingsForProvider}>
       <SidebarProvider>
        {children}
        <Toaster position="top-right" richColors closeButton />
       </SidebarProvider>
      </InstallSettingsProvider>
     </ThemeProvider>
    </NuqsAdapter>
   </body>
  </html>
 );
}
