import { withModuleFederation } from '@nx/module-federation/angular';
import { DefinePlugin, type Configuration } from 'webpack';
import config from './module-federation.config';

export default withModuleFederation({ ...config }, { dts: false }).then(
  (fn) => (webpackConfig: Configuration) => {
    const result = fn(webpackConfig);
    result.plugins = [
      ...(result.plugins ?? []),
      new DefinePlugin({
        'process.env.GH_GIST_TOKEN': JSON.stringify(process.env['GH_GIST_TOKEN'] ?? ''),
      }),
    ];
    return result;
  },
);
