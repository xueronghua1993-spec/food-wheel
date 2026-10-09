import test from 'node:test';import assert from 'node:assert/strict';
import {wrapText} from '../calendar/calendar-export.mjs';
const ctx={measureText:s=>({width:Array.from(s).length*20})};
test('Wraps Chinese and existing newlines without clipping or punctuation-only line',()=>{
 const lines=wrapText(ctx,'空山新雨后，天气晚来秋。\n明月松间照，清泉石上流。',140);
 assert.equal(lines.join(''),'空山新雨后，天气晚来秋。明月松间照，清泉石上流。');
 assert.ok(lines.every(x=>ctx.measureText(x).width<=140));
 assert.ok(lines.every(x=>! /^[，。？！、；：]/.test(x)));
});
test('Wraps long unspaced text and emoji on code point boundaries',()=>{
 const lines=wrapText(ctx,'abcdefghijklmnopqrst🌲🌿',80);
 assert.equal(lines.join(''),'abcdefghijklmnopqrst🌲🌿');assert.ok(lines.every(x=>ctx.measureText(x).width<=80));
});
