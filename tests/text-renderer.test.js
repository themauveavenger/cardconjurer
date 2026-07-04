const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const sourcePath = path.join(__dirname, '..', 'js', 'modules', 'text-renderer.js');
const source = fs.readFileSync(sourcePath, 'utf8');
vm.runInThisContext(source);

test('curlyQuotes: straight apostrophes become right single quotes', () => {
	assert.strictEqual(curlyQuotes("it's"), 'it’s');
	assert.strictEqual(curlyQuotes("'hello'"), '‘hello’');
});

test('curlyQuotes: straight double quotes become curly double quotes', () => {
	assert.strictEqual(curlyQuotes('say "hello"'), 'say “hello”');
	assert.strictEqual(curlyQuotes('"hello"'), '“hello”');
});

test('curlyQuotes: leaves other characters unchanged', () => {
	assert.strictEqual(curlyQuotes('no quotes here'), 'no quotes here');
	assert.strictEqual(curlyQuotes('123 abc!'), '123 abc!');
});

test('pinlineColors: maps known color names to hex codes', () => {
	assert.strictEqual(pinlineColors('white'), '#fcfeff');
	assert.strictEqual(pinlineColors('blue'), '#0075be');
	assert.strictEqual(pinlineColors('black'), '#272624');
	assert.strictEqual(pinlineColors('red'), '#ef3827');
	assert.strictEqual(pinlineColors('green'), '#007b43');
});

test('pinlineColors: maps multiple color names in one string', () => {
	assert.strictEqual(pinlineColors('whiteblueblackredgreen'), '#fcfeff#0075be#272624#ef3827#007b43');
	assert.strictEqual(pinlineColors('red green'), '#ef3827 #007b43');
});

test('pinlineColors: leaves unknown names unchanged', () => {
	assert.strictEqual(pinlineColors('purple'), 'purple');
	assert.strictEqual(pinlineColors('colorless'), 'colorless');
});
