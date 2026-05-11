"use client";

import { PortalPreferencesProvider } from "@/src/app/context/PortalPreferences";

export default function ClientProviders({ children }) {
  return <PortalPreferencesProvider>{children}</PortalPreferencesProvider>;
}
