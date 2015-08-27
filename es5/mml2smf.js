"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports["default"] = mml2smf;

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj["default"] = obj; return newObj; } }

var _parserParser = require("../parser/parser");

var parser = _interopRequireWildcard(_parserParser);

function mml2smf(mml, opts) {
    var startTick = 0;
    var timebase = 480;

    if (opts && opts.timebase) {
        timebase = opts.timebase;
    }

    var trackDataArray = [];

    var tracks = parser.parse(mml + ";");
    // console.dir(tracks);

    var channel = 0;
    for (var i = 0; i < tracks.length; i++) {
        trackDataArray.push(createTrackData(tracks[i]));
        channel++;

        if (channel > 15) {
            throw new Error("Exceeded maximum MIDI channel (16)");
        }
    }

    var format = tracks.length > 1 ? 1 : 0;

    var smf = [0x4d, 0x54, 0x68, 0x64];

    function write2bytes(value) {
        smf.push(value >> 8 & 0xff, value & 0xff);
    }

    function write4bytes(value) {
        smf.push(value >> 24 & 0xff, value >> 16 & 0xff, value >> 8 & 0xff, value & 0xff);
    }

    write4bytes(6);
    write2bytes(format);
    write2bytes(tracks.length);
    write2bytes(timebase);

    for (var i = 0; i < tracks.length; i++) {
        smf.push(0x4d, 0x54, 0x72, 0x6b);
        write4bytes(trackDataArray[i].length);
        smf = smf.concat(trackDataArray[i]);
    }

    if (opts) {
        opts.startTick = startTick;
    }

    return new Uint8Array(smf);

    function createTrackData(tokens) {
        var trackData = [];
        var baseLength = timebase;

        var currentTick = 0;

        var restTick = 0;

        var OCTAVE_MIN = -1;
        var OCTAVE_MAX = 10;
        var octave = 4;

        var velocity = 100;

        var q = 6;
        var keyShift = 0;

        var p = 0;

        function write() {
            for (var _len = arguments.length, data = Array(_len), _key = 0; _key < _len; _key++) {
                data[_key] = arguments[_key];
            }

            trackData = trackData.concat(data);
        }

        function error(message) {
            throw new Error("" + message);
        }

        function calcNoteLength(length, numDots) {
            var noteLength = baseLength;
            if (length) {
                noteLength = timebase * 4 / length;
            }

            var dottedTime = noteLength;
            for (var i = 0; i < numDots; i++) {
                dottedTime /= 2;
                noteLength += dottedTime;
            }
            return noteLength;
        }

        function writeDeltaTick(tick) {
            if (tick < 0 || tick > 0xfffffff) {
                error("illegal length");
            }

            var stack = [];

            do {
                stack.push(tick & 0x7f);
                tick >>>= 7;
            } while (tick > 0);

            while (stack.length > 0) {
                var b = stack.pop();

                if (stack.length > 0) {
                    b |= 0x80;
                }
                write(b);
            }
        }

        while (p < tokens.length) {
            var token = tokens[p];
            // console.dir(token);

            switch (token.command) {
                case "note":
                    {
                        var abcdefg = [9, 11, 0, 2, 4, 5, 7];
                        var n = "abcdefg".indexOf(token.tone);

                        var note = (octave + 1) * 12 + abcdefg[n] + keyShift;

                        for (var i = 0; i < token.accidentals.length; i++) {
                            if (token.accidentals[i] === "+") {
                                note++;
                            }
                            if (token.accidentals[i] === "-") {
                                note--;
                            }
                        }

                        if (note < 0 || note > 127) {
                            error("illegal note number (0-127)");
                        }

                        var _stepTime = calcNoteLength(token.length, token.dots.length);
                        while (tokens[p + 1] && tokens[p + 1].command === "tie") {
                            p++;
                            _stepTime += calcNoteLength(tokens[p].length, tokens[p].dots.length);
                        }

                        var gateTime = Math.round(_stepTime * q / 8);

                        writeDeltaTick(restTick);
                        write(0x90 | channel, note, velocity);
                        writeDeltaTick(gateTime);
                        write(0x80 | channel, note, 0);
                        restTick = _stepTime - gateTime;

                        currentTick += _stepTime;
                        break;
                    }
                case "rest":
                    var stepTime = calcNoteLength(token.length, token.dots.length);

                    restTick += stepTime;
                    currentTick += stepTime;
                    break;

                case "octave":
                    octave = token.number;
                    break;

                case "octave_up":
                    octave++;
                    break;

                case "octave_down":
                    octave--;
                    break;

                case "note_length":
                    baseLength = calcNoteLength(token.length, token.dots.length);
                    break;

                case "gate_time":
                    q = token.quantity;
                    break;

                case "velocity":
                    velocity = token.value;
                    break;

                case "volume":
                    writeDeltaTick(restTick);
                    write(0xb0 | channel, 7, token.value);
                    break;

                case "pan":
                    writeDeltaTick(restTick);
                    write(0xb0 | channel, 10, token.value + 64);
                    break;

                case "expression":
                    writeDeltaTick(restTick);
                    write(0xb0 | channel, 11, token.value);
                    break;

                case "control_change":
                    writeDeltaTick(restTick);
                    write(0xb0 | channel, token.number, token.value);
                    break;

                case "program_change":
                    writeDeltaTick(restTick);
                    write(0xc0 | channel, token.number);
                    break;

                case "channel_aftertouch":
                    writeDeltaTick(restTick);
                    write(0xd0 | channel, token.value);
                    break;

                case "tempo":
                    {
                        var quarterMicroseconds = 60 * 1000 * 1000 / token.value;
                        if (quarterMicroseconds < 1 || quarterMicroseconds > 0xffffff) {
                            error("illegal tempo");
                        }

                        writeDeltaTick(restTick);
                        write(0xff, 0x51, 0x03, quarterMicroseconds >> 16 & 0xff, quarterMicroseconds >> 8 & 0xff, quarterMicroseconds & 0xff);
                        break;
                    }

                case "start_point":
                    {
                        startTick = currentTick;
                        break;
                    }

                case "key_shift":
                    {
                        keyShift = token.value;
                        break;
                    }

                case "set_midi_channel":
                    {
                        channel = token.channel - 1;
                        break;
                    }
            }

            if (octave < OCTAVE_MIN || octave > OCTAVE_MAX) {
                error("octave is out of range");
            }

            p++;
        }

        return trackData;
    }
}

module.exports = exports["default"];