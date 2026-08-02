module.exports = {
  root: true,
  ignorePatterns: [
    'node_modules/**',
    'OZprivate/rawJS/OZTreeModule/dist/**',
    'static/**',
  ],
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  rules: {
    'no-unused-vars': ['error', {
      args: 'none',
      caughtErrors: 'none',
    }],
    'no-duplicate-imports': 'error',
  },
};
