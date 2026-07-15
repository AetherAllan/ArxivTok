const fs = require("node:fs");
const path = require("node:path");

const VERSION_PATTERN = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const BUMPS = new Set(["patch", "minor", "major", "retry"]);

function nextVersion(current, bump) {
  const match = VERSION_PATTERN.exec(current);
  if (!match) {
    throw new Error(`Expected a stable semantic version, got: ${current}`);
  }
  if (!BUMPS.has(bump)) {
    throw new Error(`Unknown release action: ${bump}`);
  }
  if (bump === "retry") return current;

  let major = Number(match[1]);
  let minor = Number(match[2]);
  let patch = Number(match[3]);

  if (bump === "major") {
    major += 1;
    minor = 0;
    patch = 0;
  } else if (bump === "minor") {
    minor += 1;
    patch = 0;
  } else {
    patch += 1;
  }

  return `${major}.${minor}.${patch}`;
}

function updatePackageVersion(packagePath, bump) {
  const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8"));
  const version = nextVersion(packageJson.version, bump);

  if (version !== packageJson.version) {
    packageJson.version = version;
    fs.writeFileSync(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`);
  }

  return version;
}

if (require.main === module) {
  try {
    const bump = process.argv[2];
    const packagePath = path.resolve(process.argv[3] ?? "package.json");
    process.stdout.write(`${updatePackageVersion(packagePath, bump)}\n`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}

module.exports = { nextVersion, updatePackageVersion };
