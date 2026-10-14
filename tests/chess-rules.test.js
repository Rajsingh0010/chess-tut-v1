import test from 'node:test';
import assert from 'node:assert/strict';
import { Chess } from 'chess.js';

test('accepts a legal opening move and records SAN', () => {
  const game = new Chess();

  const move = game.move({ from: 'e2', to: 'e4' });

  assert.equal(move.san, 'e4');
  assert.equal(game.turn(), 'b');
  assert.equal(game.history().length, 1);
});

test('rejects moving the wrong color', () => {
  const game = new Chess();

  assert.throws(() => game.move({ from: 'e7', to: 'e5' }));
  assert.equal(game.history().length, 0);
});

test('detects checkmate', () => {
  const game = new Chess();
  for (const move of ['f3', 'e5', 'g4', 'Qh4#']) game.move(move);

  assert.equal(game.isCheckmate(), true);
});

test('undo restores the previous turn and position', () => {
  const game = new Chess();
  game.move('e4');
  game.move('e5');

  game.undo();

  assert.equal(game.turn(), 'b');
  assert.deepEqual(game.history(), ['e4']);
});
