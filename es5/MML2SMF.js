"use strict";

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var MML2SMF = (function () {
	function MML2SMF() {
		_classCallCheck(this, MML2SMF);
	}

	_createClass(MML2SMF, [{
		key: "convert",
		value: function convert(mml) {
			var trackMMLs = mml.split(";");

			var trackNum = trackMMLs.length;
			if (trackNum >= 16) {
				throw new Error("over 16 tracks");
			}

			this.resolution = 480;
			var smfFormat = trackNum == 1 ? 0 : 1;

			var smf = [0x4d, 0x54, 0x68, 0x64, 0x00, 0x00, 0x00, 0x06, 0x00, smfFormat, trackNum >> 8 & 0xff, trackNum & 0xff, this.resolution >> 8 & 0xff, this.resolution & 0xff];

			for (var i = 0; i < trackNum; i++) {
				var trackData = this.createTrackData(trackMMLs[i], i);

				var trackHeader = [0x4d, 0x54, 0x72, 0x6b, trackData.length >> 24 & 0xff, trackData.length >> 16 & 0xff, trackData.length >> 8 & 0xff, trackData.length & 0xff];

				smf = smf.concat(trackHeader, trackData);
			}

			return new Uint8Array(smf);
		}
	}, {
		key: "createTrackData",
		value: function createTrackData(mml, channel) {
			var abcdefg = [9, 11, 0, 2, 4, 5, 7];

			var trackData = [];
			var tick = this.resolution;
			var resolution = this.resolution;

			var restTick = 0;

			var OCTAVE_MIN = -1;
			var OCTAVE_MAX = 10;
			var octave = 4;

			var q = 6;

			var p = 0;

			function isNextChar(candidates) {
				if (p >= mml.length) {
					return false;
				}
				var c = mml.charAt(p);
				return candidates.includes(c);
			}

			function readChar() {
				return mml.charAt(p++);
			}

			function isNextValue() {
				return isNextChar("0123456789.-");
			}

			function readValue() {
				var value = parseInt(mml.substr(p, 10));
				p += String(value).length;
				return value;
			}

			function isNextInt() {
				return isNextChar("0123456789-");
			}

			function readInt() {
				var s = "";
				while (isNextInt()) {
					s += readChar();
				}
				return parseInt(s);
			}

			function readNoteLength() {
				var totalStepTime = 0;

				do {
					var stepTime = undefined;

					// read note length
					if (isNextInt()) {
						var _length = readInt();
						stepTime = resolution * 4 / _length;
					} else {
						stepTime = tick;
					}

					// dotted note
					var dottedTime = stepTime;
					while (isNextChar(".")) {
						readChar();
						dottedTime /= 2;
						stepTime += dottedTime;
					}

					totalStepTime += stepTime;
				} while (isNextChar("^") && readChar()); // tie

				return totalStepTime;
			}

			function error(message) {
				throw new Error("char " + p + " : " + message);
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
					trackData.push(b);
				}
			}

			while (p < mml.length) {
				if (!isNextChar("cdefgabro<>lqt \n\r\t")) {
					error("syntax error '" + readChar() + "'");
				}
				var command = readChar();

				switch (command) {
					case "c":
					case "d":
					case "e":
					case "f":
					case "g":
					case "a":
					case "b":
						var n = "abcdefg".indexOf(command);
						if (n < 0 || n >= abcdefg.length) {
							break;
						}
						var note = (octave + 1) * 12 + abcdefg[n];

						if (isNextChar("+-")) {
							var c = readChar();
							if (c === "+") {
								note++;
							}
							if (c === "-") {
								note--;
							}
						}

						var stepTime = readNoteLength();
						var gateTime = Math.round(stepTime * q / 8);
						var velocity = 96;

						writeDeltaTick(restTick);
						trackData.push(0x90 | channel, note, velocity);
						writeDeltaTick(gateTime);
						trackData.push(0x80 | channel, note, 0);
						restTick = stepTime - gateTime;
						break;

					case "r":
						{
							var _stepTime = readNoteLength();
							restTick += _stepTime;
						}
						break;

					case "o":
						if (!isNextValue()) {
							error("no octave number");
						} else {
							var _n = readValue();
							if (OCTAVE_MIN <= _n || _n <= OCTAVE_MAX) {
								octave = _n;
								break;
							}
						}
						break;

					case "<":
						if (octave < OCTAVE_MAX) {
							octave++;
						}
						break;

					case ">":
						if (octave > OCTAVE_MIN) {
							octave--;
						}
						break;

					case "l":
						{
							var _length2 = 4;
							if (isNextValue()) {
								_length2 = readValue();
							}
							tick = this.resolution * 4 / _length2;
						}
						break;

					case "q":
						{
							if (isNextValue()) {
								q = readValue();
								if (q < 1 || q > 8) {
									error("illegal q value");
								}
							}
						}
						break;

					case "t":
						if (!isNextValue()) {
							error("no tempo number");
						} else {
							var tempo = readValue();
							var quarterMicroseconds = 60 * 1000 * 1000 / tempo;

							if (quarterMicroseconds < 1 || quarterMicroseconds > 0xffffff) {
								error("illegal tempo");
							}

							writeDeltaTick(restTick);
							trackData.push(0xff, 0x51, 0x03, quarterMicroseconds >> 16 & 0xff, quarterMicroseconds >> 8 & 0xff, quarterMicroseconds & 0xff);
						}
						break;
				}
			}

			return trackData;
		}
	}]);

	return MML2SMF;
})();

exports["default"] = MML2SMF;
module.exports = exports["default"];