var assert = require("assert");

import mml2smf from "../src/mml2smf";

function createSMF(timebase, ...trackDatas) {
	let format = trackDatas.length > 1 ? 1 : 0;
	
	let smf = [0x4d, 0x54, 0x68, 0x64];
	
	function pushUint16(value) {
		smf.push((value >> 8) & 0xff, value & 0xff);
	}
	function pushUint32(value) {
		smf.push((value >> 24) & 0xff, (value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff);
	}
	
	pushUint32(6);
	pushUint16(format);
	pushUint16(trackDatas.length);
	pushUint16(timebase);
	
	for (let trackData of trackDatas) {
		smf.push(0x4d, 0x54, 0x72, 0x6b);
		pushUint32(trackData.length);
		smf = smf.concat(trackData);
	}
	return new Uint8Array(smf);
}

describe("mml2smf", function () {
	it("minimum SMF", function () {
		let mml = "c";
		let smf = createSMF(480, [0x00, 0x90, 0x3c, 0x64, 0x82, 0x68, 0x80, 0x3c, 0x00]);
		assert.deepEqual(mml2smf(mml), smf);
	});
	
	it("tempo", function () {
		let mml = "t120";
		let smf = createSMF(480, [0x00, 0xff, 0x51, 0x03, 0x07, 0xa1, 0x20]);
		assert.deepEqual(mml2smf(mml), smf);
	});
	
	it("control change", function () {
		let mml = "B10,20";
		let smf = createSMF(480, [0x00, 0xb0, 0x0a, 0x14]);
		assert.deepEqual(mml2smf(mml), smf);
	});
});
