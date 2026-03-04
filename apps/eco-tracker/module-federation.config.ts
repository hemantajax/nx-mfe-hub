import { ModuleFederationConfig } from '@nx/module-federation';

const config: ModuleFederationConfig = {
  name: 'eco-tracker',
  exposes: {
    './Routes': 'apps/eco-tracker/src/app/remote-entry/entry.routes.ts',
  },
};

export default config;
