# Chess Tutor

Chess Tutor is a browser-based 3D chess game powered by Stockfish 19. Play as White against a configurable Black opponent, request hints, and review the move list while learning.

## Features

- Stockfish 19 Lite running locally in a Web Worker
- Selectable opponent strength from 800 to 2400 Elo
- 3D board with rotate, zoom, board flip, and forgiving piece hit targets
- Legal move highlighting and move validation
- Hints, undo, new game, checkmate, and draw state handling
- Responsive dark interface

## Development

```bash
npm install
npm run dev
```

Open the local Vite URL shown in the terminal.

## Validation

```bash
npm test
npm run build
```

The Stockfish browser files are distributed under `public/` and are loaded locally, so gameplay does not depend on a remote engine service.

## License

Stockfish is distributed under the GPL-3.0 license. See [`node_modules/stockfish/Copying.txt`](./node_modules/stockfish/Copying.txt) after installing dependencies for the engine license text.
