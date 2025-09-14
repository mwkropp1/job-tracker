module.exports = {
  // Backend TypeScript files
  'packages/backend/src/**/*.ts': [
    'eslint --fix --max-warnings 0',
    'prettier --write',
    () => 'tsc --noEmit --project packages/backend/tsconfig.json'
  ],
  // Root config files
  '*.{js,json,md,yml,yaml}': [
    'prettier --write'
  ],
  // Root TypeScript config files
  'eslint.config.js': [
    'eslint --fix --max-warnings 0',
    'prettier --write'
  ]
}