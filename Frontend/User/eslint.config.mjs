import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
/** @type {import('eslint').Linter.Config[]} */
const eslintConfigNext = require('eslint-config-next');

/** @type {import('eslint').Linter.Config[]} */
const eslintConfig = [
  ...eslintConfigNext,
  {
    rules: {
      // eslint-plugin-react-hooks v7 (bundled with eslint-config-next 16): these rules
      // reject many legitimate patterns (data fetch on mount, "mounted" flags, dev OTP hints).
      // Re-enable and fix incrementally if you adopt the React Compiler strictly.
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/refs': 'off',
    },
  },
];

export default eslintConfig;
