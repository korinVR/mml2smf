start = track+

track = commands:command* next_track { return commands; }

next_track = _ ";" _ { return null; }

_ = [ \t\r\n]*

command
    = comment / note / tie / rest / octave / octave_up / octave_down / 
    note_length / gate_time / velocity / volume / pan / expression / control_change /
    program_change / channel_aftertouch /
    tempo / start_point / key_shift / set_midi_channel

comment
    = _ "/*" $((!"*/" .)*) "*/" _ { return { command: "comment" }; }
    / _ "//" [^\n]* _ { return { command: "comment" }; } 

note
    = _ tone:[cdefgab] _ accidentals:[-+]* _ length:$([0-9]*) _ dots:"."* _
    { return { command: "note", tone: tone, accidentals: accidentals, length: +length, dots: dots }; }

tie
    = _ "^" _ length:$([0-9]*) _ dots:"."* _
    { return { command: "tie", length: +length, dots: dots }; }

slur
    = _ "&" _
    { return { command: "slur" }; }

rest
    = _ "r" _ length:$([0-9]*) _ dots:"."* _
    { return { command: "rest", length: +length, dots: dots }; }

octave
    = _ "o" _ number:$("-"? [0-9]+) _
    {
        if (number < -1 || number > 10) {
            error("octave number is out of range");
        }
        return {
            command: "octave",
            number: +number
        };
    }

octave_up = _ "<" _ { return { command: "octave_up" }; }
octave_down = _ ">" _ { return { command: "octave_down" }; }

note_length
    = _ "l" _ length:$([0-9]+) _ dots:"."* _
    { return { command: "note_length", length: +length, dots: dots }; }

gate_time
    = _ "q" _ quantity:[1-8] _
    { return { command: "gate_time", quantity: +quantity }; }

velocity
    = _ "u" _ value:$([0-9]+) _
    {
        value = +value;
        if (value < 0 || value > 127) {
            error("velocity is out of range (0-127)");
        }
        return { command: "velocity", value: value };
    }

volume
    = _ "v" _ value:$([0-9]+) _
    {
        value = +value;
        if (value < 0 || value > 127) {
            error("volume is out of range (0-127)");
        }
        return { command: "volume", value: value };
    }

pan
    = _ "p" _ value:$("-"? [0-9]+) _
    {
        value = +value;
        if (value < -64 || value > 63) {
            error("pan is out of range (-64-63)");
        }
        return { command: "pan", value: value };
    }

expression
    = _ "E" _ value:$([0-9]+) _
    {
        value = +value;
        if (value < 0 || value > 127) {
            error("expression is out of range (0-127)");
        }
        return { command: "expression", value: value };
    }

control_change
    = _ "B" _ number:$([0-9]+) _ "," _ value:$([0-9]+) _
    {
        if (number < 0 || number > 119) {
            error("control number is out of range (0-127)");
        }
        if (value < 0 || value > 127) {
            error("control value is out of range (0-127)");
        }
        return { command: "control_change", number: number, value: value };
    }

program_change
    = _ "@" _ number:$([0-9]+) _
    {
        number = +number;
        if (number < 0 || number > 127) {
            error("program number is out of range (0-127)");
        }
        return { command: "program_change", number: number };
    }

channel_aftertouch
    = _ "D" _ value:$([0-9]+) _
    {
        value = +value;
        if (value < 0 || value > 127) {
            error("channel aftertouch is out of range (0-127)");
        }
        return { command: "channel_aftertouch", value: value };
    }

tempo
    = _ "t" _ value:$([0-9]+) _
    { return { command: "tempo", value: +value }; }

start_point
    = _ "?" _ { return { command: "start_point" }; }

key_shift
    = _ "k" _ value:$("-"? [0-9]+) _
    {
        value = +value;
        if (value < -127 || value > 127) {
            error("key shift is out of range (-127-127)");
        } 
        return { command: "key_shift", value: value };
    }

set_midi_channel
    = _ "C" _ channel:$([0-9]+) _
    {
        channel = +channel;
        if (channel < 1 || channel > 16) {
            error("MIDI channel is out of range (1-16)");
        }
        return { command: "set_midi_channel", channel: channel };
    }

