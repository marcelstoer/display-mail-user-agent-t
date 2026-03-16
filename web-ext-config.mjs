export default {
  build: {
    filename:      'dispmua-{version}.xpi',
    overwriteDest: true,
  },
  ignoreFiles: [
    '.claude',
    '.git',
    '.idea',
    '.gitignore',
    'eslint.config.js',
    'node_modules',
    'package.json',
    'tests',
    'tools',
    'web-ext-artifacts',
    'web-ext-config.mjs',
    'yarn.lock',
  ],
};
