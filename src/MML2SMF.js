export default class MML2SMF {
	convert(mml, timebase = 480) {
		this.startTick = 0;
		
		let trackMMLs = mml.split(";");
		
		let trackNum = trackMMLs.length;
		if (trackNum >= 16) {
			throw new Error("over 16 tracks");
		}
		
		this.timebase = timebase;
		let smfFormat = (trackNum == 1) ? 0 : 1;
		
		let smf = [
			0x4d, 0x54, 0x68, 0x64,
			0x00, 0x00, 0x00, 0x06,
			0x00, smfFormat, 
			(trackNum >> 8) & 0xff,
			trackNum & 0xff,
			(this.timebase >> 8) & 0xff,
			this.timebase & 0xff
		];
		
		for (let i = 0; i < trackNum; i++) {
			let trackData = this.createTrackData(trackMMLs[i], i);

			const trackHeader = [
				0x4d, 0x54, 0x72, 0x6b,
				(trackData.length >> 24) & 0xff,
				(trackData.length >> 16) & 0xff,
				(trackData.length >> 8) & 0xff,
				trackData.length & 0xff
			];

			smf = smf.concat(trackHeader, trackData);
		}
		
		return new Uint8Array(smf);
	}
	
	createTrackData(mml, channel) {
		const abcdefg = [9, 11, 0, 2, 4, 5, 7];
		
		let trackData = [];
		let tick = this.timebase;
		let timebase = this.timebase;
		
		let currentTick = 0;
		
		let restTick = 0;
		
		const OCTAVE_MIN = -1;
		const OCTAVE_MAX = 10;
		let octave = 4;
		
		let q = 6;
		
		let p = 0;
		
		function isNextChar(candidates) {
			if (p >= mml.length) {
				return false;
			}
			let c = mml.charAt(p);
			return candidates.includes(c);
		}
		
		function readChar() {
			return mml.charAt(p++);
		}
		
		function isNextValue() {
			return isNextChar("0123456789.-");
		}
		
		function readValue() {
			let value = parseInt(mml.substr(p, 10));
			p += String(value).length;
			return value;
		}
		
		function isNextInt() {
			return isNextChar("0123456789-");
		}
		
		function readInt() {
			let s = "";
			while (isNextInt()) {
				s += readChar();
			}
			return parseInt(s);
		}
		
		function readNoteLength() {
			let totalStepTime = 0;
			
			do {
				let stepTime;
				
				// read note length
				if (isNextInt()) {
					let length = readInt();
					stepTime = timebase * 4 / length;
				} else {
					stepTime = tick;
				}
				
				// dotted note
				let dottedTime = stepTime;
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
			throw new Error(`char ${p} : ${message}`);
		}
		
		function writeDeltaTick(tick) {
			if (tick < 0 || tick > 0xfffffff) {
				error("illegal length");
			}
			
			let stack = [];
			
			do {
				stack.push(tick & 0x7f);
				tick >>>= 7;
			} while (tick > 0);
			
			while (stack.length > 0) {
				let b = stack.pop();
				
				if (stack.length > 0) {
					b |= 0x80;
				}
				trackData.push(b);
			}
		}
		
		while (p < mml.length) {
			if (!isNextChar("cdefgabro<>lqtvE? \n\r\t")) {
				error(`syntax error '${readChar()}'`);
			}
			let command = readChar();
			
			switch (command) {
				case "c":
				case "d":
				case "e":
				case "f":
				case "g":
				case "a":
				case "b":
					let n = "abcdefg".indexOf(command);
					if (n < 0 || n >= abcdefg.length) {
						break;
					}
					let note = (octave + 1) * 12 + abcdefg[n];
					
					if (isNextChar("+-")) {
						let c = readChar();
						if (c === "+") {
							note++;
						}
						if (c === "-") {
							note--;
						}
					}
					
					let stepTime = readNoteLength();
					let gateTime = Math.round(stepTime * q / 8);
					let velocity = 96;
					
					writeDeltaTick(restTick);
					trackData.push(0x90 | channel, note, velocity);
					writeDeltaTick(gateTime);
					trackData.push(0x80 | channel, note, 0);
					restTick = stepTime - gateTime;
					
					currentTick += stepTime;
					break;

				case "r":
					{
						let stepTime = readNoteLength();
						restTick += stepTime;
						
						currentTick += stepTime;
					}
					break;

				case "o":
					if (!isNextValue()) {
						error("no octave number");
					} else {
						let n = readValue();
						if (OCTAVE_MIN <= n || n <= OCTAVE_MAX) {
							octave = n;
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
						let length = 4;
						if (isNextValue()) {
							length = readValue();
						}
						tick = this.timebase * 4 / length;
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
						let tempo = readValue();
						let quarterMicroseconds = 60 * 1000 * 1000 / tempo;
						
						if (quarterMicroseconds < 1 || quarterMicroseconds > 0xffffff) {
							error("illegal tempo");
						}

						writeDeltaTick(restTick);
						trackData.push(0xff, 0x51, 0x03,
							(quarterMicroseconds >> 16) & 0xff,
							(quarterMicroseconds >> 8) & 0xff,
							(quarterMicroseconds) & 0xff);
					}
					break;
				
				case "v":
					if (!isNextValue()) {
						error("no volume value");
					} else {
						let volume = readValue();

						if (volume < 0 || volume > 127) {
							error("illegal volume");
						}

						writeDeltaTick(restTick);
						trackData.push(0xb0 | channel, 7, volume);
					}
					break;
				
				case "E":
					if (!isNextValue()) {
						error("no expression value");
					} else {
						let expression = readValue();

						if (expression < 0 || expression > 127) {
							error("illegal expression");
						}

						writeDeltaTick(restTick);
						trackData.push(0xb0 | channel, 11, expression);
					}
					break;
				
				case "?":
					// get start tick
					this.startTick = currentTick;
					break;
			}
		}
		
		return trackData;
	}
	
	getStartTick() {
		return this.startTick;
	}
}