#!/usr/bin/env node


// import "babel/polyfill";

"use strict";

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var _fs = require("fs");

var _fs2 = _interopRequireDefault(_fs);

var _minimist = require("minimist");

var _minimist2 = _interopRequireDefault(_minimist);

var _MML2SMF = require("./MML2SMF");

var _MML2SMF2 = _interopRequireDefault(_MML2SMF);

// analyze command line
var argv = (0, _minimist2["default"])(global.process.argv.slice(2));

function changeExtension(filename, ext) {
	var n = filename.lastIndexOf(".");
	if (n < 0) {
		n = filename.length;
	}
	return filename.substr(0, n) + "." + ext;
}

var smfFile = "output.mid";
var timebase = 480;
var mml = undefined;

if (argv.m) {
	// read MML from -m parameter
	mml = argv.m;
} else {
	// read MML from file
	var mmlFile = argv._[0];
	if (mmlFile) {
		try {
			mml = _fs2["default"].readFileSync(mmlFile, "utf8");
		} catch (e) {
			if (e.code === "ENOENT") {
				console.log("error: " + mmlFile + " not found");
				process.exit();
			} else {
				throw e;
			}
		}

		smfFile = changeExtension(mmlFile, "mid");
	}
}

if (argv.o) {
	smfFile = argv.o;
}

if (argv.timebase) {
	timebase = argv.timebase;
}

// display usage
if (!mml) {
	console.log("\nmml2smf version 0.0.9 - MML to Standard MIDI File converter\n\nusage:\n\tmml2smf [MML file]\n\tmml2smf [MML file] -o [.mid file]\n\tmml2smf -m [MML] -o [.mid file]\noptions:\n\t--timebase [timebase] (default=480)\n");
	process.exit();
}

// convert
var mml2smf = new _MML2SMF2["default"]();
var swf = undefined;

try {
	swf = mml2smf.convert(mml, timebase);
} catch (e) {
	console.log("error: " + e.message);
	process.exit(0);
}

var buffer = new Buffer(swf);
_fs2["default"].writeFile(smfFile, buffer);