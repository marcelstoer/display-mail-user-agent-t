import globals from 'globals';

export default [
  {
    files: ['scripts/**/*.js'],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'script',
      globals: {
        ...globals.browser,
        ...globals.webextensions,
        // Cross-file background-script globals (defined in dispmua-common.js,
        // used in dispmua.js — both are loaded in the same background context).
        dispMUA:          'writable',
        // Gecko/XPCOM-specific global used in dispmua-common.js.
        XPCNativeWrapper: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': 'warn',
      // Downgraded to 'warn': one pre-existing undeclared variable ('data') in
      // dispmua-common.js::getOverlay() is not in scope to fix here.
      'no-undef':       'warn',
    },
  },
];
