#!/usr/bin/env node

import "babel/polyfill";

import fs from "fs";
import minimist from "minimist";

import MML2SMF from "./MML2SMF";

let argv = minimist(global.process.argv.slice(2));

let mml = argv._[0];
let output = argv.o;

if (!mml || !output) {
	console.log("usage: mml2smf [mml] -o [.mid file]");
	process.exit();
}

let mml2smf = new MML2SMF();
let swf;

try {
	swf = mml2smf.convert(mml);
} catch (e) {
	console.log("error: " + e.message);
	process.exit(0);
}

let buffer = new Buffer(swf);
fs.writeFile(output, buffer);

