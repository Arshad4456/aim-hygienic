import fs from 'fs';
import path from 'path';

const repoRoot = path.resolve(process.cwd(), '..');
const dashboardsRoot = path.join(repoRoot, 'frontend', 'app', 'dashboards');
const outNavDir = path.join(process.cwd(), 'src', 'navigation');
const outFeaturesRoot = path.join(process.cwd(), 'src', 'features');

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((ent) => {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) return walk(full);
    return ent.isFile() && ent.name === 'page.js' ? [full] : [];
  });
}

const files = walk(dashboardsRoot);
const routes = files.map((file) => {
  const rel = path.relative(dashboardsRoot, file).replace(/\\/g, '/').replace(/\/page\.js$/, '');
  const parts = rel.split('/');
  const role = parts[0];
  const slug = parts.slice(1).join('/') || 'home';
  const source = fs.readFileSync(file, 'utf8');
  const endpoints = [...source.matchAll(/apiFetch\(\s*["'`]([^"'`]+)["'`]/g)].map((m) => m[1]);
  const first = endpoints[0] || null;
  return {
    role,
    slug,
    routeName: `${role}__${slug.replace(/[^a-zA-Z0-9]+/g, '_')}`,
    title: slug === 'home' ? `${role} Home` : slug.split('/').map((s) => s === '[...slug]' ? 'Catch All' : s.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())).join(' / '),
    file: path.relative(repoRoot, file).replace(/\\/g, '/'),
    endpoints,
    primaryEndpoint: first,
    primaryMethod: 'GET',
  };
});

const roles = [...new Set(routes.map((r) => r.role))].sort();
const grouped = Object.fromEntries(roles.map((role) => [role, routes.filter((r) => r.role === role).sort((a,b)=>a.slug.localeCompare(b.slug))]));

fs.writeFileSync(path.join(outNavDir, 'RoleMenu.generated.js'), `export const ROLE_MENU = ${JSON.stringify(grouped, null, 2)};\n`);
fs.writeFileSync(path.join(outNavDir, 'RouteMap.generated.js'), `export const ROUTE_MAP = ${JSON.stringify(routes, null, 2)};\n`);

for (const r of routes) {
  const dir = path.join(outFeaturesRoot, r.role, ...(r.slug === 'home' ? [] : r.slug.split('/')));
  fs.mkdirSync(dir, { recursive: true });
  const depth = path.relative(dir, path.join(outFeaturesRoot, 'common')).replace(/\\/g, '/');
  const relImport = `${depth}/GenericModuleScreen`;
  fs.writeFileSync(path.join(dir, 'index.js'), `import React from 'react';\nimport GenericModuleScreen from '${relImport}';\n\nexport default function Screen(props) {\n  return <GenericModuleScreen {...props} />;\n}\n`);
}

console.log(`Generated ${routes.length} routes across ${roles.length} roles.`);
