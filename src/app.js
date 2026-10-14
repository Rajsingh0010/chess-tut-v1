import * as THREE from 'three';
import { Chess } from 'chess.js';
import './styles.css';

const sceneHost = document.querySelector('#scene');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
camera.position.set(0, 9.8, 10.8);
camera.lookAt(0, 0, 0);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
sceneHost.appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xeaf5e0, 0x11151a, 2.4));
const keyLight = new THREE.DirectionalLight(0xf4f6df, 4.5);
keyLight.position.set(-5, 12, 6);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(2048, 2048);
scene.add(keyLight);
const rimLight = new THREE.PointLight(0xa8dc91, 16, 20);
rimLight.position.set(5, 4, -4);
scene.add(rimLight);

const boardRoot = new THREE.Group();
boardRoot.rotation.y = -0.22;
scene.add(boardRoot);
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const chess = new Chess();
const squares = new Map();
const pieces = new Map();
const moveHistory = [];
let selectedSquare = null;
let isDragging = false;
let didDrag = false;
let lastPointer = { x: 0, y: 0 };
let engineThinking = false;
let engineMode = 'move';
let engineElo = 1400;

const engine = new Worker('/stockfish-19-lite-single.js');
engine.postMessage('uci');
engine.postMessage('setoption name UCI_LimitStrength value true');
engine.postMessage(`setoption name UCI_Elo value ${engineElo}`);
engine.postMessage('isready');

const woodDark = new THREE.MeshStandardMaterial({ color: 0x394847, roughness: 0.34, metalness: 0.1 });
const woodLight = new THREE.MeshStandardMaterial({ color: 0xb6c79e, roughness: 0.4, metalness: 0.05 });
const edgeMaterial = new THREE.MeshStandardMaterial({ color: 0x1a2528, roughness: 0.25, metalness: 0.28 });
const whitePiece = new THREE.MeshStandardMaterial({ color: 0xe4e5dd, roughness: 0.2, metalness: 0.12 });
const blackPiece = new THREE.MeshStandardMaterial({ color: 0x182124, roughness: 0.24, metalness: 0.42 });
const selectedMaterial = new THREE.MeshStandardMaterial({ color: 0xb6c79e, roughness: 0.4, emissive: 0x688747, emissiveIntensity: 0.45 });
const markerMaterial = new THREE.MeshBasicMaterial({ color: 0xb7f582, transparent: true, opacity: 0.8 });

function squarePosition(square) {
  return { x: (square.charCodeAt(0) - 97 - 3.5) * 1.01, z: (8 - Number(square[1]) - 3.5) * 1.01 };
}

function makePiece(type, color) {
  const material = color === 'w' ? whitePiece : blackPiece;
  const group = new THREE.Group();
  const hitTarget = new THREE.Mesh(
    new THREE.CylinderGeometry(0.43, 0.43, 0.42, 24),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
  );
  hitTarget.position.y = 0.28;
  group.add(hitTarget);
  const add = (geometry, y, scale = 1) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.y = y;
    mesh.scale.setScalar(scale);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  };
  add(new THREE.CylinderGeometry(0.31, 0.38, 0.12, 32), 0.08);
  add(new THREE.CylinderGeometry(0.23, 0.29, 0.1, 32), 0.18);

  if (type === 'p') {
    add(new THREE.SphereGeometry(0.2, 24, 16), 0.48);
    add(new THREE.CylinderGeometry(0.11, 0.18, 0.35, 24), 0.32);
  } else if (type === 'r') {
    add(new THREE.CylinderGeometry(0.2, 0.25, 0.48, 24), 0.45);
    add(new THREE.CylinderGeometry(0.3, 0.27, 0.12, 24), 0.72);
    add(new THREE.CylinderGeometry(0.22, 0.22, 0.14, 8), 0.84);
  } else if (type === 'n') {
    add(new THREE.CylinderGeometry(0.16, 0.24, 0.38, 24), 0.43);
    const neck = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.52, 5, 12), material);
    neck.position.set(0, 0.78, -0.02);
    neck.rotation.z = -0.26;
    neck.castShadow = true;
    group.add(neck);
    add(new THREE.SphereGeometry(0.18, 20, 12), 1.02);
  } else if (type === 'b') {
    add(new THREE.ConeGeometry(0.25, 0.62, 24), 0.52);
    add(new THREE.SphereGeometry(0.13, 20, 12), 0.91);
    add(new THREE.TorusGeometry(0.1, 0.035, 10, 20), 0.62);
  } else if (type === 'q') {
    add(new THREE.CylinderGeometry(0.18, 0.26, 0.52, 24), 0.47);
    add(new THREE.CylinderGeometry(0.31, 0.25, 0.1, 24), 0.75);
    add(new THREE.TorusGeometry(0.2, 0.055, 12, 24), 0.86);
    add(new THREE.SphereGeometry(0.13, 20, 12), 1.04);
  } else if (type === 'k') {
    add(new THREE.CylinderGeometry(0.18, 0.27, 0.58, 24), 0.5);
    add(new THREE.CylinderGeometry(0.31, 0.25, 0.1, 24), 0.8);
    add(new THREE.BoxGeometry(0.09, 0.34, 0.09), 1.03);
    add(new THREE.BoxGeometry(0.25, 0.08, 0.09), 1.08);
  }
  return group;
}

function createBoard() {
  const base = new THREE.Mesh(new THREE.BoxGeometry(8.65, 0.42, 8.65), edgeMaterial);
  base.position.y = -0.3;
  base.receiveShadow = true;
  boardRoot.add(base);
  for (let row = 0; row < 8; row += 1) {
    for (let col = 0; col < 8; col += 1) {
      const square = `${String.fromCharCode(97 + col)}${8 - row}`;
      const tile = new THREE.Mesh(new THREE.BoxGeometry(0.99, 0.12, 0.99), (row + col) % 2 ? woodDark : woodLight);
      const position = squarePosition(square);
      tile.position.set(position.x, 0.06, position.z);
      tile.receiveShadow = true;
      tile.userData.square = square;
      squares.set(square, tile);
      boardRoot.add(tile);
    }
  }
}

function renderPosition() {
  pieces.forEach((piece) => boardRoot.remove(piece));
  pieces.clear();
  chess.board().forEach((row) => row.forEach((piece) => {
    if (!piece) return;
    const group = makePiece(piece.type, piece.color);
    const position = squarePosition(piece.square);
    group.position.set(position.x, 0.12, position.z);
    group.userData = { square: piece.square, type: piece.type, color: piece.color };
    pieces.set(piece.square, group);
    boardRoot.add(group);
  }));
}

function clearHighlights() {
  squares.forEach((tile) => { tile.material = (tile.userData.square.charCodeAt(0) - 97 + (8 - Number(tile.userData.square[1]))) % 2 ? woodDark : woodLight; });
  boardRoot.children.filter((child) => child.userData?.moveMarker).forEach((marker) => boardRoot.remove(marker));
}

function showLegalMoves(square) {
  clearHighlights();
  squares.get(square).material = selectedMaterial;
  chess.moves({ square, verbose: true }).forEach((move) => {
    const position = squarePosition(move.to);
    const marker = new THREE.Mesh(new THREE.CylinderGeometry(move.captured ? 0.31 : 0.1, move.captured ? 0.31 : 0.1, 0.035, 24), markerMaterial);
    marker.position.set(position.x, 0.15, position.z);
    marker.userData = { moveMarker: true };
    boardRoot.add(marker);
  });
}

function resize() {
  const rect = sceneHost.getBoundingClientRect();
  renderer.setSize(rect.width, rect.height, false);
  camera.aspect = rect.width / rect.height;
  camera.updateProjectionMatrix();
}

function squareFromHit(hit) {
  let object = hit?.object;
  while (object) {
    if (object.userData?.square) return object.userData.square;
    object = object.parent;
  }
  return null;
}

function handleBoardClick(event) {
  if (engineThinking || chess.turn() !== 'w' || chess.isGameOver()) return;
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObjects([...squares.values(), ...pieces.values()], true)[0];
  const square = squareFromHit(hit);
  if (!square) return;

  if (!selectedSquare) {
    if (pieces.has(square) && pieces.get(square).userData.color === chess.turn()) {
      selectedSquare = square;
      showLegalMoves(square);
      document.querySelector('#coach-message').textContent = 'Choose a highlighted square for your move.';
    }
    return;
  }

  if (square === selectedSquare) {
    selectedSquare = null;
    clearHighlights();
    return;
  }
  const move = chess.moves({ square: selectedSquare, verbose: true }).find((candidate) => candidate.to === square);
  if (!move) {
    document.querySelector('#coach-message').textContent = 'That move is not legal. Choose a highlighted square.';
    return;
  }
  const result = chess.move({ from: selectedSquare, to: square, promotion: 'q' });
  moveHistory.push(result);
  selectedSquare = null;
  clearHighlights();
  renderPosition();
  updateMovePanel(result);
  requestEngineMove();
}

function renderMovePanel() {
  const history = chess.history();
  const moveList = document.querySelector('#move-list');
  moveList.innerHTML = '';
  for (let index = 0; index < history.length; index += 2) {
    const row = document.createElement('div');
    row.className = `move-row${index >= history.length - 2 ? ' current' : ''}`;
    row.innerHTML = `<span class="move-index">${String(index / 2 + 1).padStart(2, '0')}</span><span>${history[index] ?? '—'}</span><span>${history[index + 1] ?? '—'}</span>`;
    moveList.appendChild(row);
  }
  document.querySelector('#move-number').textContent = `${Math.ceil(history.length / 2)} / 40`;
}

function updateMovePanel(move) {
  renderMovePanel();
  document.querySelector('#turn-label').textContent = chess.turn() === 'w' ? 'Your turn' : 'Opponent turn';
  document.querySelector('#coach-message').textContent = chess.isCheckmate()
    ? 'Checkmate. The match is decided.'
    : chess.isCheck()
      ? 'Check. Your king needs attention.'
      : move.captured
        ? 'Capture confirmed. Recalculate the position.'
        : 'Legal move. Look for the next forcing idea.';
}

function requestEngineMove() {
  if (chess.isGameOver() || chess.turn() !== 'b') return;
  engineThinking = true;
  engineMode = 'move';
  document.querySelector('#turn-label').textContent = 'Stockfish is thinking';
  document.querySelector('#coach-message').textContent = 'Stockfish is calculating a reply.';
  engine.postMessage(`position fen ${chess.fen()}`);
  engine.postMessage('go depth 12');
}

function applyEngineMove(uciMove) {
  if (!uciMove) return;
  if (engineMode === 'hint') {
    if (chess.turn() !== 'w') return;
    engineThinking = false;
    document.querySelector('#coach-message').textContent = `Stockfish recommends ${uciMove.slice(0, 2)}-${uciMove.slice(2, 4)}.`;
    return;
  }
  if (!engineThinking || chess.turn() !== 'b') return;
  const result = chess.move({
    from: uciMove.slice(0, 2),
    to: uciMove.slice(2, 4),
    promotion: uciMove[4] || 'q',
  });
  if (!result) return;
  moveHistory.push(result);
  engineThinking = false;
  clearHighlights();
  renderPosition();
  updateMovePanel(result);
  document.querySelector('#coach-message').textContent = chess.isGameOver()
    ? 'Stockfish has finished the game.'
    : 'Your move. Find the best continuation.';
}

engine.onmessage = (event) => {
  const line = typeof event.data === 'string' ? event.data : '';
  if (line.startsWith('bestmove ')) applyEngineMove(line.split(/\s+/)[1]);
};

document.querySelector('#elo-select').addEventListener('change', (event) => {
  engineElo = Number(event.currentTarget.value);
  document.querySelector('#elo-value').textContent = engineElo;
  engine.postMessage(`setoption name UCI_Elo value ${engineElo}`);
  document.querySelector('#coach-message').textContent = `Stockfish level set to ${engineElo} Elo.`;
});

document.querySelector('#hint-button').addEventListener('click', () => {
  if (engineThinking || chess.turn() !== 'w' || chess.isGameOver()) return;
  engineThinking = true;
  engineMode = 'hint';
  document.querySelector('#coach-message').textContent = 'Stockfish is finding a suggestion.';
  engine.postMessage(`position fen ${chess.fen()}`);
  engine.postMessage('go depth 10');
});

document.querySelector('#new-game-button').addEventListener('click', () => {
  engine.postMessage('stop');
  chess.reset();
  moveHistory.length = 0;
  selectedSquare = null;
  engineThinking = false;
  engineMode = 'move';
  clearHighlights();
  renderPosition();
  renderMovePanel();
  document.querySelector('#turn-label').textContent = 'Your turn';
  document.querySelector('#coach-message').textContent = 'New game started. Control the center.';
});

document.querySelector('#undo-button').addEventListener('click', () => {
  if (!moveHistory.length) return;
  engine.postMessage('stop');
  engineThinking = false;
  chess.undo();
  moveHistory.pop();
  if (chess.turn() === 'b' && moveHistory.length) {
    chess.undo();
    moveHistory.pop();
  }
  selectedSquare = null;
  clearHighlights();
  renderPosition();
  renderMovePanel();
  document.querySelector('#turn-label').textContent = 'Your turn';
  document.querySelector('#coach-message').textContent = 'Take another look at the position.';
});
document.querySelector('#flip-button').addEventListener('click', () => { boardRoot.rotation.y += Math.PI; });
document.querySelector('#sound-toggle').addEventListener('click', (event) => { event.currentTarget.textContent = event.currentTarget.textContent === '⌕' ? '×' : '⌕'; });
document.querySelector('#theme-toggle').addEventListener('click', () => document.body.classList.toggle('bright-mode'));
document.querySelector('.coach-card button').addEventListener('click', (event) => {
  event.currentTarget.closest('.coach-card').classList.add('dismissed');
});
document.querySelectorAll('.tab').forEach((tab) => tab.addEventListener('click', () => {
  document.querySelectorAll('.tab').forEach((item) => item.classList.remove('active'));
  tab.classList.add('active');
  document.querySelector('#moves-panel').classList.toggle('hidden', tab.dataset.tab !== 'moves');
  document.querySelector('#chat-panel').classList.toggle('hidden', tab.dataset.tab !== 'chat');
}));

renderer.domElement.addEventListener('pointerdown', (event) => {
  isDragging = true;
  didDrag = false;
  lastPointer = { x: event.clientX, y: event.clientY };
  renderer.domElement.setPointerCapture(event.pointerId);
});
renderer.domElement.addEventListener('pointermove', (event) => {
  if (!isDragging) return;
  if (Math.abs(event.clientX - lastPointer.x) > 3 || Math.abs(event.clientY - lastPointer.y) > 3) {
    didDrag = true;
    boardRoot.rotation.y += (event.clientX - lastPointer.x) * 0.008;
    boardRoot.rotation.x = Math.max(-0.28, Math.min(0.18, boardRoot.rotation.x + (event.clientY - lastPointer.y) * 0.004));
    lastPointer = { x: event.clientX, y: event.clientY };
  }
});
renderer.domElement.addEventListener('pointerup', (event) => { isDragging = false; if (!didDrag) handleBoardClick(event); });
renderer.domElement.addEventListener('wheel', (event) => {
  camera.position.multiplyScalar(event.deltaY > 0 ? 1.06 : 0.94);
  camera.position.clampLength(8.5, 16);
  camera.lookAt(0, 0, 0);
}, { passive: true });
window.addEventListener('resize', resize);

createBoard();
renderPosition();
renderMovePanel();
resize();
(function animate() { requestAnimationFrame(animate); renderer.render(scene, camera); }());
