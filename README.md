# Simple MML to Standard MIDI File converter

This tool is a part of in-development [synthesis.js](https://github.com/KatsuomiK/synthesis.js). The features are very limited for now.

## Setup

$ npm install -g mml2smf

## Usage

$ mml2smf "t140 o5l8q7 ccggaag4 ffeeddc4; o4l8 cgegcgeg >b<gfg>b<gc4" -o test.mid

## MML

command|MML
-------|---
notes|c, d, e, f, g, a, b, +, -
octave|o[octave], &lt;, &gt;
note length|l[note length]
gate time|q[1-8]
tempo|t[tempo]
next track|;
tie|^

## Development

To launch:

$ npm start

To watch:

$ npm run watch

# License

MIT

# Author

Katsuomi Kobayashi ([@KatsuomiK](https://twitter.com/KatsuomiK) / [@k0rin](https://twitter.com/k0rin))

http://framesynthesis.com/

