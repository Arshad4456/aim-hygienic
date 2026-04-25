import { redirect } from "next/navigation";

export default function LegacyDashboardsRedirect({ params }) {
  const slug = Array.isArray(params?.slug) ? params.slug.join("/") : "";
  redirect(`/portals${slug ? `/${slug}` : ""}`);
}
