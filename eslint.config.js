import globals from 'globals';

export default [
  {
    files: ['scripts/**/*.js'],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.webextensions,
        // Gecko/XPCOM-specific global used in dispmua-common.js.
        XPCNativeWrapper: 'readonly',
      },
    },
    rules: {
      'no-unused-vars':    'error',
      'no-undef':          'error',
      'no-var':            'error',
      'eqeqeq':            'error',
      'no-useless-escape': 'error',
    },
  },
];
