const expoConfig = require("eslint-config-expo/flat");
const { defineConfig } = require("eslint/config");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["android/**", "dist/**"],
    rules: {
      // React Compiler's static ref/immutability model does not understand
      // Reanimated shared values or Gesture Builder callbacks. The standard
      // rules-of-hooks and exhaustive-deps checks remain enabled.
      "react-hooks/immutability": "off",
      "react-hooks/refs": "off",
      // Several modal and data-loading effects intentionally reset local state
      // when their external identity changes; banning that pattern globally is
      // not useful for this React Native application.
      "react-hooks/set-state-in-effect": "off",
      // i18next intentionally exposes `.use()` on its default singleton; the
      // import rule mistakes that documented API for a named-import typo.
      "import/no-named-as-default-member": "off",
    },
  },
]);
