import PortalRouteLoader from "../../../src/app-shell/PortalRouteLoader";
export default function DynamicPortalPage({ params }) { return <PortalRouteLoader slug={params?.slug || []} />; }
