const fs = require('fs');
const path = require('path');

const versionTsPath = path.join(__dirname, '..', 'src', 'version.ts');
const pkgPath = path.join(__dirname, '..', 'package.json');
const gradlePath = path.join(__dirname, '..', 'android', 'app', 'build.gradle');

const versionTs = fs.readFileSync(versionTsPath, 'utf8');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

const vMatch = versionTs.match(/version:\s*'([^']+)'/);
const bMatch = versionTs.match(/buildNumber:\s*(\d+)/);

const appVersion = vMatch ? vMatch[1] : pkg.version;
const buildNumber = bMatch ? parseInt(bMatch[1], 10) : 54;

let gradle = fs.readFileSync(gradlePath, 'utf8');
gradle = gradle.replace(/versionCode\s+\d+/, 'versionCode ' + buildNumber);
gradle = gradle.replace(/versionName\s+"[^"]+"/, 'versionName "' + appVersion + '"');
fs.writeFileSync(gradlePath, gradle);

if (process.env.GITHUB_ENV) {
  fs.appendFileSync(process.env.GITHUB_ENV, 'APP_VERSION=' + appVersion + '\nAPP_BUILD=' + buildNumber + '\n');
}

console.log('✓ Successfully synchronized build target to Version v' + appVersion + ' (Build ' + buildNumber + ')');
