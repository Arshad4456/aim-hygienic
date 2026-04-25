export function getSocketUrl() { return process.env.NEXT_PUBLIC_SOCKET_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000"; }
export default { getSocketUrl };
