"use client";

import { PortalPreferencesProvider } from "@/src/context/PortalPreferences";

export default function ClientProviders({ children }) {
  return <PortalPreferencesProvider>{children}</PortalPreferencesProvider>;
}
