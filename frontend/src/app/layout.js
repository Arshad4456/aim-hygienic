import "./globals.css";
import ClientProviders from "./providers/clientProviders";
import { BRAND_CONFIG } from "@/src/app/config/brand";

export const metadata = {
  title: {
    default: BRAND_CONFIG.name,
    template: `%s | ${BRAND_CONFIG.shortName}`,
  },
  description: BRAND_CONFIG.description,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
