module.exports = {
  env: {
    commonjs: true,
    es6: true,
    node: true,
  },
  extends: ["airbnb-base"],
  globals: {
    Atomics: "readonly",
    SharedArrayBuffer: "readonly",
    // jsbox globals
    $clipboard: true,
    $ssh: true,
    $data: true,
    $network: true,
  },
  parserOptions: {
    ecmaVersion: 2018,
  },
  rules: {
    "linebreak-style": "off",
    "no-unused-vars": "warn",
    "no-use-before-define": "off",
    "no-console": "off",
    "no-param-reassign": "off",
    "no-bitwise": "off",
    "no-restricted-globals": "off",
    "no-underscore-dangle": "off",
    "no-multi-assign": "off",
    "no-plusplus": "off"
  },
};
