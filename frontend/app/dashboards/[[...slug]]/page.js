import { redirect } from "next/navigation";

export default async function LegacyDashboardsRedirect({ params }) {
  const resolvedParams = await params;
  const slug = Array.isArray(resolvedParams?.slug) ? resolvedParams.slug.join("/") : "";
  redirect(`/portals${slug ? `/${slug}` : ""}`);
}
