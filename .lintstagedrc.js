module.exports = {
  // TypeScript/JavaScript files
  '*.{js,jsx,ts,tsx}': [
    'eslint --fix',
    'prettier --write',
    'jest --bail --findRelatedTests --passWithNoTests',
  ],
  // JSON, CSS, MD files
  '*.{json,css,scss,md}': ['prettier --write'],
  // Prisma schema
  'prisma/schema.prisma': ['npx prisma format'],
};
