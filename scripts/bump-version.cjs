const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const pkgPath = path.join(rootDir, 'package.json');
const versionTsPath = path.join(rootDir, 'src', 'version.ts');
const gradlePath = path.join(rootDir, 'android', 'app', 'build.gradle');

// Read package.json
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const currentVersion = pkg.version;

// Determine new version
let newVersion = process.argv[2];
if (!newVersion || newVersion === 'patch') {
  const parts = currentVersion.split('.').map(Number);
  parts[2] = (parts[2] || 0) + 1;
  newVersion = parts.join('.');
} else if (newVersion === 'minor') {
  const parts = currentVersion.split('.').map(Number);
  parts[1] = (parts[1] || 0) + 1;
  parts[2] = 0;
  newVersion = parts.join('.');
} else if (newVersion.startsWith('v')) {
  newVersion = newVersion.slice(1);
}

console.log(`Bumping version from ${currentVersion} to ${newVersion}`);

// 1. Update package.json
pkg.version = newVersion;
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
console.log('✓ Updated package.json');

// 2. Update src/version.ts
if (fs.existsSync(versionTsPath)) {
  let content = fs.readFileSync(versionTsPath, 'utf8');
  
  // Extract build number
  const buildMatch = content.match(/buildNumber:\s*(\d+)/);
  const currentBuild = buildMatch ? parseInt(buildMatch[1], 10) : 20;
  const nextBuild = currentBuild + 1;
  const today = new Date().toISOString().split('T')[0];

  content = content.replace(/version:\s*'[^']+'/, `version: '${newVersion}'`);
  content = content.replace(/buildNumber:\s*\d+/, `buildNumber: ${nextBuild}`);
  content = content.replace(/releaseDate:\s*'[^']+'/, `releaseDate: '${today}'`);

  // Check if changelog entry for this version already exists
  if (!content.includes(`version: '${newVersion}'`)) {
    // If not, we don't duplicate, but the top version string is already replaced.
  }

  fs.writeFileSync(versionTsPath, content);
  console.log(`✓ Updated src/version.ts to v${newVersion} (Build ${nextBuild})`);
}

// 3. Update android/app/build.gradle
if (fs.existsSync(gradlePath)) {
  let gradle = fs.readFileSync(gradlePath, 'utf8');
  
  // Extract versionCode
  const vcMatch = gradle.match(/versionCode\s+(\d+)/);
  const currentVc = vcMatch ? parseInt(vcMatch[1], 10) : 20;
  const nextVc = currentVc + 1;

  gradle = gradle.replace(/versionCode\s+\d+/, `versionCode ${nextVc}`);
  gradle = gradle.replace(/versionName\s+"[^"]+"/, `versionName "${newVersion}"`);

  fs.writeFileSync(gradlePath, gradle);
  console.log(`✓ Updated android/app/build.gradle to versionCode ${nextVc}, versionName "${newVersion}"`);
}

console.log(`\nSuccessfully bumped to v${newVersion}!`);
