module.exports = {
  testEnvironment: 'jsdom',
  transform: {
    '^.+\\.(ts|tsx)$': ['@swc/jest', {
      jsc: {
        parser: { syntax: 'typescript', tsx: true },
        transform: {
          react: { runtime: 'automatic' },
        },
      },
    }],
  },
  testMatch: ['**/?(*.)+(spec|test).[jt]s?(x)'],
};
