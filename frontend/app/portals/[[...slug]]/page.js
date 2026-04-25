import PortalRouteLoader from "../../../src/app-shell/PortalRouteLoader";

export default async function DynamicPortalPage({ params }) {
  const resolvedParams = await params;
  return <PortalRouteLoader slug={resolvedParams?.slug || []} />;
}
