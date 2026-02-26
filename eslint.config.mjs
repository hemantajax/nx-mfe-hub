import nx from '@nx/eslint-plugin';

export default [
  ...nx.configs['flat/base'],
  ...nx.configs['flat/typescript'],
  ...nx.configs['flat/javascript'],
  {
    ignores: ['**/dist', '**/out-tsc', '**/vitest.config.*.timestamp*'],
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    rules: {
      '@nx/enforce-module-boundaries': [
        'error',
        {
          enforceBuildableLibDependency: true,
          allow: ['^.*/eslint(\\.base)?\\.config\\.[cm]?[jt]s$'],
          depConstraints: [
            // Global shared libs can be used by anyone
            {
              sourceTag: 'scope:shared',
              onlyDependOnLibsWithTags: ['scope:shared'],
            },
            // App-scoped libs can use shared and own scope
            {
              sourceTag: 'scope:shell',
              onlyDependOnLibsWithTags: ['scope:shared', 'scope:shell'],
            },
            {
              sourceTag: 'scope:dashboard',
              onlyDependOnLibsWithTags: ['scope:shared', 'scope:dashboard'],
            },
            {
              sourceTag: 'scope:profile',
              onlyDependOnLibsWithTags: ['scope:shared', 'scope:profile'],
            },
            {
              sourceTag: 'scope:lab',
              onlyDependOnLibsWithTags: ['scope:shared', 'scope:lab'],
            },
            {
              sourceTag: 'scope:theme',
              onlyDependOnLibsWithTags: ['scope:shared', 'scope:theme'],
            },
            {
              sourceTag: 'scope:demos',
              onlyDependOnLibsWithTags: ['scope:shared', 'scope:demos'],
            },
            // Feature libs cannot depend on other feature libs
            {
              sourceTag: 'type:feature',
              onlyDependOnLibsWithTags: [
                'type:ui',
                'type:data-access',
                'type:util',
                'type:styles',
              ],
            },
            // UI libs cannot depend on feature or data-access
            {
              sourceTag: 'type:ui',
              onlyDependOnLibsWithTags: ['type:ui', 'type:util', 'type:styles'],
            },
            // Util libs are leaf nodes
            {
              sourceTag: 'type:util',
              onlyDependOnLibsWithTags: ['type:util'],
            },
          ],
        },
      ],
    },
  },
  {
    files: [
      '**/*.ts',
      '**/*.tsx',
      '**/*.cts',
      '**/*.mts',
      '**/*.js',
      '**/*.jsx',
      '**/*.cjs',
      '**/*.mjs',
    ],
    // Override or add rules here
    rules: {},
  },
];
