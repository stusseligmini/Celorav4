module.exports = {
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'next/core-web-vitals'
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  rules: {
    '@typescript-eslint/no-unused-vars': ['warn', { 
      argsIgnorePattern: '^_', 
      varsIgnorePattern: '^_' 
    }],
    '@typescript-eslint/no-explicit-any': 'off',
    'react-hooks/exhaustive-deps': 'warn'
  },
  ignorePatterns: [
    'node_modules/',
    '.next/',
    'public/',
    'dist/',
    'src/lib/advancedEncryption.ts',
    'src/lib/encryptionManager.ts'
  ]
}