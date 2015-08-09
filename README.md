# MML to Standard MIDI File converter

This tool is a part of in-development [synthesis.js](https://github.com/KatsuomiK/synthesis.js). The features are very limited for now.

## Setup

```bash
$ npm install -g mml2smf
```

## Usage

```bash
$ mml2smf test.mml
$ mml2smf test.mml -o output.mid
$ mml2smf -m cdefg -o test.mid
$ mml2smf -m "t140 o5l8q7 ccggaag4 ffeeddc4; o4l8 cgegcgeg >b<gfg>b<gc4" -o test.mid
```

## MML

command|MML
-------|---
Notes|c, d, e, f, g, a, b, +, -
Octave|o[octave], &lt;, &gt;
Note Length|l[note length]
Tempo|t[tempo]
Gate Time|q[1-8]
Channel Volume|v[0-127]
Expression Controller|E[0-127]
Next Track|;
Tie|^

## Development

To launch:

```bash
$ npm start
```

To watch:

```bash
$ npm run watch
```

# License

MIT

# Author

Katsuomi Kobayashi ([@KatsuomiK](https://twitter.com/KatsuomiK) / [@k0rin](https://twitter.com/k0rin))

http://framesynthesis.com/

