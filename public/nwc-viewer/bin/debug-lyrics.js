// Debug lyrics: parse NWC and trace lyrics through pipeline (no browser deps)
import { parseNWC } from '../lib/nwc2xml/parser.js';
import { decodeNwcArrayBuffer } from '../src/nwc.js';
import { readFileSync } from 'fs';

// Mock window before any imports that use it
global.window = {};
global.window.utils = {};

const fileArg = process.argv[2] || 'samples/WhatChildIsThis.nwc';
const buf = readFileSync(fileArg);

console.log('=== 1. Parser output ===');
const file = parseNWC(buf);
console.log('Version:', '0x' + file.version.toString(16), file.version >= 0x0205 ? '(V205)' : '(V<205)');
file.staffs.forEach((s, i) => {
  const lyrics = s.lyrics || [];
  console.log('Staff', i, s.name, 'lyrics:', lyrics.length, 'firstLine syllables:', lyrics[0]?.length || 0);
});

console.log('\n=== 2. After decodeNwcArrayBuffer (adapter) ===');
const data = decodeNwcArrayBuffer(buf);
data.score.staves.forEach((s, i) => {
  const lyrics = s.lyrics || [];
  console.log('Staff', i, s.staff_name, 'lyrics:', lyrics.length, 'firstLine:', Array.isArray(lyrics[0]) ? lyrics[0].length + ' syllables' : typeof lyrics[0]);
});

console.log('\n=== 3. After interpret ===');
const { interpret } = await import('../src/interpreter.js');
interpret(data);
let totalWithText = 0;
data.score.staves.forEach((s, i) => {
  const withText = (s.tokens || []).filter(t => t.text);
  totalWithText += withText.length;
  if (withText.length > 0) {
    console.log('Staff', i, s.staff_name, 'tokens with .text:', withText.length, 'sample:', withText.slice(0, 3).map(t => t.text));
  } else if ((s.lyrics || []).length > 0) {
    console.log('Staff', i, s.staff_name, 'HAS lyrics but 0 tokens got .text!');
  }
});
console.log('Total tokens with lyric text:', totalWithText);
