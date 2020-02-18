import parser from '../parser/parser.js'

export default function mml2smf (mml, opts) {
  let startTick = 0
  let timebase = 480

  if (opts && opts.timebase) {
    timebase = opts.timebase
  }

  const trackDataArray = []

  const tracks = parser.parse(mml + ';')
  // console.dir(tracks);

  let channel = 0
  for (let i = 0; i < tracks.length; i++) {
    trackDataArray.push(createTrackData(tracks[i]))
    channel++

    if (channel > 15) {
      throw new Error('Exceeded maximum MIDI channel (16)')
    }
  }

  const format = tracks.length > 1 ? 1 : 0

  let smf = [0x4d, 0x54, 0x68, 0x64]

  function write2bytes (value) {
    smf.push((value >> 8) & 0xff, value & 0xff)
  }

  function write4bytes (value) {
    smf.push((value >> 24) & 0xff, (value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff)
  }

  write4bytes(6)
  write2bytes(format)
  write2bytes(tracks.length)
  write2bytes(timebase)

  for (let i = 0; i < tracks.length; i++) {
    smf.push(0x4d, 0x54, 0x72, 0x6b)
    write4bytes(trackDataArray[i].length)
    smf = smf.concat(trackDataArray[i])
  }

  if (opts) {
    opts.startTick = startTick
  }

  return new Uint8Array(smf)

  function createTrackData (tokens) {
    let trackData = []
    let baseLength = timebase

    let currentTick = 0

    let restTick = 0

    const OCTAVE_MIN = -1
    const OCTAVE_MAX = 10
    let octave = 4

    let velocity = 100

    let q = 6
    let keyShift = 0

    let p = 0

    function write (...data) {
      trackData = trackData.concat(data)
    }

    function error (message) {
      throw new Error(`${message}`)
    }

    function calcNoteLength (length, numDots) {
      let noteLength = baseLength
      if (length) {
        noteLength = timebase * 4 / length
      }

      let dottedTime = noteLength
      for (let i = 0; i < numDots; i++) {
        dottedTime /= 2
        noteLength += dottedTime
      }
      return noteLength
    }

    function writeDeltaTick (tick) {
      if (tick < 0 || tick > 0xfffffff) {
        error('illegal length')
      }

      const stack = []

      do {
        stack.push(tick & 0x7f)
        tick >>>= 7
      } while (tick > 0)

      while (stack.length > 0) {
        let b = stack.pop()

        if (stack.length > 0) {
          b |= 0x80
        }
        write(b)
      }
    }

    while (p < tokens.length) {
      const token = tokens[p]
      // console.dir(token);

      switch (token.command) {
        case 'note':
        {
          const abcdefg = [9, 11, 0, 2, 4, 5, 7]
          const n = 'abcdefg'.indexOf(token.tone)

          let note = (octave + 1) * 12 + abcdefg[n] + keyShift

          for (let i = 0; i < token.accidentals.length; i++) {
            if (token.accidentals[i] === '+') {
              note++
            }
            if (token.accidentals[i] === '-') {
              note--
            }
          }

          if (note < 0 || note > 127) {
            error('illegal note number (0-127)')
          }

          let stepTime = calcNoteLength(token.length, token.dots.length)
          while (tokens[p + 1] && tokens[p + 1].command === 'tie') {
            p++
            stepTime += calcNoteLength(tokens[p].length, tokens[p].dots.length)
          }

          const gateTime = Math.round(stepTime * q / 8)

          writeDeltaTick(restTick)
          write(0x90 | channel, note, velocity)
          writeDeltaTick(gateTime)
          write(0x80 | channel, note, 0)
          restTick = stepTime - gateTime

          currentTick += stepTime
          break
        }
        case 'rest':
          let stepTime = calcNoteLength(token.length, token.dots.length)

          restTick += stepTime
          currentTick += stepTime
          break

        case 'octave':
          octave = token.number
          break

        case 'octave_up':
          octave++
          break

        case 'octave_down':
          octave--
          break

        case 'note_length':
          baseLength = calcNoteLength(token.length, token.dots.length)
          break

        case 'gate_time':
          q = token.quantity
          break

        case 'velocity':
          velocity = token.value
          break

        case 'volume':
          writeDeltaTick(restTick)
          write(0xb0 | channel, 7, token.value)
          break

        case 'pan':
          writeDeltaTick(restTick)
          write(0xb0 | channel, 10, token.value + 64)
          break

        case 'expression':
          writeDeltaTick(restTick)
          write(0xb0 | channel, 11, token.value)
          break

        case 'control_change':
          writeDeltaTick(restTick)
          write(0xb0 | channel, token.number, token.value)
          break

        case 'program_change':
          writeDeltaTick(restTick)
          write(0xc0 | channel, token.number)
          break

        case 'channel_aftertouch':
          writeDeltaTick(restTick)
          write(0xd0 | channel, token.value)
          break

        case 'tempo':
        {
          const quarterMicroseconds = 60 * 1000 * 1000 / token.value
          if (quarterMicroseconds < 1 || quarterMicroseconds > 0xffffff) {
            error('illegal tempo')
          }

          writeDeltaTick(restTick)
          write(0xff, 0x51, 0x03,
            (quarterMicroseconds >> 16) & 0xff,
            (quarterMicroseconds >> 8) & 0xff,
            (quarterMicroseconds) & 0xff)
          break
        }

        case 'start_point':
        {
          startTick = currentTick
          break
        }

        case 'key_shift':
        {
          keyShift = token.value
          break
        }

        case 'set_midi_channel':
        {
          channel = token.channel - 1
          break
        }
      }

      if (octave < OCTAVE_MIN || octave > OCTAVE_MAX) {
        error('octave is out of range')
      }

      p++
    }

    return trackData
  }
}
