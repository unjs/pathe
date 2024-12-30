
import unjs from 'eslint-config-unjs'

// https://github.com/unjs/eslint-config
export default unjs({
  ignores: [],
  rules: {
    "unicorn/no-null": "off",
    "unicorn/prefer-at": "off",
    "unicorn/prevent-abbreviations": "off"
  },
});
