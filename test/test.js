var assert = require("assert");

import mml2smf from "../src/mml2smf";

function createSMF(timebase, ...trackDatas) {
    let format = trackDatas.length > 1 ? 1 : 0;
    
    let smf = [0x4d, 0x54, 0x68, 0x64];
    
    function write2bytes(value) {
        smf.push((value >> 8) & 0xff, value & 0xff);
    }
    function write4bytes(value) {
        smf.push((value >> 24) & 0xff, (value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff);
    }
    
    write4bytes(6);
    write2bytes(format);
    write2bytes(trackDatas.length);
    write2bytes(timebase);
    
    for (let trackData of trackDatas) {
        smf.push(0x4d, 0x54, 0x72, 0x6b);
        write4bytes(trackData.length);
        smf = smf.concat(trackData);
    }
    return new Uint8Array(smf);
}

function hex2array(hex) {
    let array = [];
    for (let byte of hex.split(" ")) {
        array.push(parseInt(byte, 16));
    }
    return array;
}

describe("mml2smf", function () {
    it("minimum SMF", function () {
        let mml = "c";
        let smf = createSMF(480, hex2array("00 90 3c 64 82 68 80 3c 00"));
        assert.deepEqual(mml2smf(mml), smf);
    });
    
    it("tempo", function () {
        let mml = "t120";
        let smf = createSMF(480, hex2array("00 ff 51 03 07 a1 20"));
        assert.deepEqual(mml2smf(mml), smf);
    });
    
    it("control change", function () {
        let mml = "B10,20";
        let smf = createSMF(480, hex2array("00 b0 0a 14"));
        assert.deepEqual(mml2smf(mml), smf);
    });
    
    it("multitrack", function () {
        let mml = "c;e;g";
        let smf = createSMF(480,
            hex2array("00 90 3c 64 82 68 80 3c 00"),
            hex2array("00 91 40 64 82 68 81 40 00"),
            hex2array("00 92 43 64 82 68 82 43 00"));
        assert.deepEqual(mml2smf(mml), smf);
    });
});
