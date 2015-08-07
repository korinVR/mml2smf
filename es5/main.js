#!/usr/bin/env node
"use strict";

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

require("babel/polyfill");

var _fs = require("fs");

var _fs2 = _interopRequireDefault(_fs);

var _minimist = require("minimist");

var _minimist2 = _interopRequireDefault(_minimist);

var _MML2SMF = require("./MML2SMF");

var _MML2SMF2 = _interopRequireDefault(_MML2SMF);

var argv = (0, _minimist2["default"])(global.process.argv.slice(2));

var mml = argv._[0];
var output = argv.o;

if (!mml || !output) {
	console.log("usage: mml2smf [mml] -o [.mid file]");
	process.exit();
}

var mml2smf = new _MML2SMF2["default"]();
var swf = undefined;

try {
	swf = mml2smf.convert(mml);
} catch (e) {
	console.log("error: " + e.message);
	process.exit(0);
}

var buffer = new Buffer(swf);
_fs2["default"].writeFile(output, buffer);