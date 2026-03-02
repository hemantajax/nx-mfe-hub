import { registerRemotes } from '@module-federation/enhanced/runtime';

// Resolve relative to <base href> so it works both at / and at /nx-mfe-hub/
const base = document.querySelector('base')?.getAttribute('href') ?? '/';
fetch(`${base}module-federation.manifest.json`)
  .then((res) => res.json())
  .then((remotes: Record<string, string>) =>
    Object.entries(remotes).map(([name, entry]) => ({ name, entry })),
  )
  .then((remotes) => registerRemotes(remotes))
  .then(() => import('./bootstrap').catch((err) => console.error(err)));
