#!/usr/bin/env node

// import "babel/polyfill";

import fs from 'fs'
import minimist from 'minimist'

// convert
import mml2smf from './mml2smf.mjs'

// analyze command line
const argv = minimist(global.process.argv.slice(2))

function changeExtension (filename, ext) {
  let n = filename.lastIndexOf('.')
  if (n < 0) {
    n = filename.length
  }
  return filename.substr(0, n) + '.' + ext
}

let smfFile = 'output.mid'
let timebase = 480
let mml

if (argv.m) {
  // read MML from -m parameter
  mml = argv.m
} else {
  // read MML from file
  const mmlFile = argv._[0]
  if (mmlFile) {
    try {
      mml = fs.readFileSync(mmlFile, 'utf8')
    } catch (e) {
      if (e.code === 'ENOENT') {
        console.log('error: ' + mmlFile + ' not found')
        process.exit()
      } else {
        throw e
      }
    }

    smfFile = changeExtension(mmlFile, 'mid')
  }
}

if (argv.o) {
  smfFile = argv.o
}

if (argv.timebase) {
  timebase = argv.timebase
}

// display usage
if (!mml) {
  console.log(`
mml2smf version 0.3.0 - MML to Standard MIDI File converter

usage:
	mml2smf [MML file]
	mml2smf [MML file] -o [.mid file]
	mml2smf -m [MML] -o [.mid file]
options:
	--timebase [timebase] (default=480)
`)
  process.exit()
}

let smf

try {
  const opts = {
    timebase: timebase
  }
  smf = mml2smf(mml, opts)
} catch (e) {
  console.log('error: line ' + e.line + ' column ' + e.column + ': ' + e.message)
  process.exit(0)
}

const buffer = new Buffer(smf)
fs.writeFile(smfFile, buffer)
