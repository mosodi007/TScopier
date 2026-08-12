#!/usr/bin/env node
/**
 * Bump the mobile app semver across config files.
 *
 * Usage:
 *   node scripts/increment-version.js          # patch: 1.0.0 → 1.0.1
 *   node scripts/increment-version.js patch
 *   node scripts/increment-version.js minor    # 1.0.1 → 1.1.0
 *   node scripts/increment-version.js major    # 1.1.0 → 2.0.0
 */
const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
const appConfigPath = path.join(root, 'app.config.js')
const packageJsonPath = path.join(root, 'package.json')
const packageLockPath = path.join(root, 'package-lock.json')

const bumpKind = (process.argv[2] || 'patch').toLowerCase()
if (!['major', 'minor', 'patch'].includes(bumpKind)) {
  console.error(`Unknown bump kind "${bumpKind}". Use major | minor | patch.`)
  process.exit(1)
}

function parseSemver(raw) {
  const match = String(raw).trim().match(/^(\d+)\.(\d+)\.(\d+)$/)
  if (!match) {
    throw new Error(`Expected x.y.z version, got: ${raw}`)
  }
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
  }
}

function formatSemver({ major, minor, patch }) {
  return `${major}.${minor}.${patch}`
}

function bump(version, kind) {
  const next = { ...version }
  if (kind === 'major') {
    next.major += 1
    next.minor = 0
    next.patch = 0
  } else if (kind === 'minor') {
    next.minor += 1
    next.patch = 0
  } else {
    next.patch += 1
  }
  return next
}

function readAppConfigVersion(source) {
  const match = source.match(/\bversion:\s*['"](\d+\.\d+\.\d+)['"]/)
  if (!match) {
    throw new Error(`Could not find version: 'x.y.z' in ${appConfigPath}`)
  }
  return match[1]
}

function writeAppConfigVersion(source, from, to) {
  let next = source.replace(
    /\bversion:\s*['"]\d+\.\d+\.\d+['"]/,
    `version: '${to}'`,
  )
  if (next === source) {
    throw new Error(`Failed to replace version ${from} in app.config.js`)
  }
  next = next.replace(
    /\bruntimeVersion:\s*['"]\d+\.\d+\.\d+['"]/,
    `runtimeVersion: '${to}'`,
  )
  return next
}

const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))
const appConfigSource = fs.readFileSync(appConfigPath, 'utf8')

const pkgVersion = String(packageJson.version ?? '')
const appVersion = readAppConfigVersion(appConfigSource)

if (pkgVersion !== appVersion) {
  console.warn(
    `Warning: package.json (${pkgVersion}) and app.config.js (${appVersion}) differ.`
    + ` Bumping from app.config.js.`,
  )
}

const current = parseSemver(appVersion)
const nextVersion = formatSemver(bump(current, bumpKind))

packageJson.version = nextVersion
fs.writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`)
fs.writeFileSync(appConfigPath, writeAppConfigVersion(appConfigSource, appVersion, nextVersion))

if (fs.existsSync(packageLockPath)) {
  const lock = JSON.parse(fs.readFileSync(packageLockPath, 'utf8'))
  lock.version = nextVersion
  if (lock.packages && lock.packages['']) {
    lock.packages[''].version = nextVersion
  }
  fs.writeFileSync(packageLockPath, `${JSON.stringify(lock, null, 2)}\n`)
}

console.log(`App version: ${appVersion} → ${nextVersion} (${bumpKind})`)
console.log('Updated: app.config.js, package.json, package-lock.json')
console.log('Note: runtimeVersion is set to the same string as version — publish OTA against this new version after store builds.')
