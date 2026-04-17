module.exports = {
  apps: [
    {
      name: 'vocabvault',
      script: 'node_modules/tsx/dist/cli.mjs',
      args: 'server.ts',
      interpreter: 'node',
      cwd: __dirname,
    },
  ],
};
