"use client";

import { LanguageProvider } from "./language";

export default function ClientProviders({ children }) {
  return <LanguageProvider>{children}</LanguageProvider>;
}
