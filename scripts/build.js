#!/usr/bin/env node

const { minify } = require("uglify-js")
const { readFileSync, writeFileSync } = require("fs")
const { execSync } = require("child_process")
const { join } = require("path")
const { spawn } = require("child_process")

const getPath = relativePath => join(__dirname, "..", relativePath)

console.log("compiling...")
spawn("tsc", { stdio: ["inherit", "inherit", "inherit"] })
  .on("close", minifyIndex)

function minifyIndex() {
  console.log("minifying...")
  const indexPath = getPath("dist/index.js")
  const index = readFileSync(indexPath, { encoding: "utf8" })
  writeFileSync(indexPath, minify(index).code, "utf8")
}