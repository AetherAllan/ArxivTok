const { version } = require("./package.json");

module.exports = ({ config }) => ({
  ...config,
  // package.json is the only user-facing version source. Keeping this derived
  // prevents an APK version from drifting away from its GitHub release tag.
  version,
});
