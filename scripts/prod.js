#!/usr/bin/env node

const { join } = require("path")
const { readFileSync, writeFileSync, copyFileSync } = require("fs")
const { createInterface } = require("readline")
const { spawn } = require("child_process")

const rl = createInterface({
  input: process.stdin,
  output: process.stdout
})


const bumpPatchVersion = version => {
  const [maj, min, pat] = version.split(".")
  return [maj, min, (parseInt(pat) + 1).toString()].join(".")
}
const bumpMinorVersion = version => {
  const [maj, min] = version.split(".")
  return [maj, (parseInt(min) + 1).toString(), "0"].join(".")
}
const bumpMajorVersion = version => {
  const [maj] = version.split(".")
  return [(parseInt(maj) + 1).toString(), "0", "0"].join(".")
}

const getPath = relativePath => join(__dirname, "..", relativePath)

let packageJson = JSON.parse(readFileSync(getPath("package.json"), "utf8"))
const { name, version } = packageJson

rl.question(`Current version of this package is ${version}.\nIs this a major(u) update, minor(m) update, or a patch(p)? [u/m/p] (default: "p") `, ans => {
  let bump
  if (ans.toLowerCase() === "u") bump = bumpMajorVersion
  else if (ans.toLowerCase() === "m") bump = bumpMinorVersion
  else bump = bumpPatchVersion

  const nextVersion = bump(version)
  rl.question(`Bump version to ${nextVersion} and publish "${name}"?[Y/n] `, ans => {
    if (ans.toLowerCase() === "n") process.exit()
    else publish(nextVersion)
  })
})


function publish(version) {
  console.log("publishing package")

  Object.assign(packageJson, { version })
  writeFileSync(getPath("dist/package.json"), JSON.stringify(packageJson, null, 2))
  writeFileSync(getPath("package.json"), JSON.stringify(packageJson, null, 2))
  copyFileSync(getPath("LICENSE"), getPath("./dist/LICENSE"))
  copyFileSync(getPath("README.md"), getPath("./dist/README.md"))

  spawn("npm", ["publish", getPath("dist"), "--access", "public"/* , "--dry-run" */], { stdio: ["inherit", "inherit", "inherit"] })
    .on("close", process.exit)
}
