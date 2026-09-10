const boardEl = document.querySelector('#board');
const statusEl = document.querySelector('#status');
const cardX = document.querySelector('#cardX');
const cardO = document.querySelector('#cardO');
const scoreXEl = document.querySelector('#scoreX');
const scoreOEl = document.querySelector('#scoreO');
const roundEl = document.querySelector('#round');
const rulesDialog = document.querySelector('#rulesDialog');
const celebration = document.querySelector('#celebration');

const winningLines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
let board, histories, current, locked, scores = { X:0, O:0 }, round = 1;

function setupBoard() {
  boardEl.innerHTML = '';
  for (let i=0;i<9;i++) {
    const cell = document.createElement('button');
    cell.className = 'cell'; cell.dataset.index = i; cell.setAttribute('role','gridcell');
    cell.setAttribute('aria-label', `Square ${i+1}, empty`);
    cell.addEventListener('click', () => move(i));
    boardEl.appendChild(cell);
  }
}

function newRound(increment=false) {
  if (increment) { round++; roundEl.textContent = round; }
  board = Array(9).fill(null); histories = { X:[], O:[] }; current = round % 2 ? 'X' : 'O'; locked = false;
  setupBoard(); render();
}

function move(index) {
  if (locked || board[index]) return;
  if (histories[current].length === 3) {
    const expired = histories[current].shift();
    board[expired] = null;
  }
  board[index] = current; histories[current].push(index);
  const win = winningLines.find(line => line.every(i => board[i] === current));
  render();
  if (win) return finish(win);
  current = current === 'X' ? 'O' : 'X';
  render();
}

function render() {
  [...boardEl.children].forEach((cell,i) => {
    const mark = board[i];
    cell.className = `cell${mark ? ' '+mark.toLowerCase() : ''}`;
    cell.disabled = locked || Boolean(mark);
    cell.innerHTML = mark ? `<span class="mark">${mark === 'X' ? '×' : '○'}</span>` : '';
    cell.setAttribute('aria-label', `Square ${i+1}, ${mark ? (mark === 'X' ? 'X' : 'O') : 'empty'}`);
  });
  if (!locked && histories[current].length === 3) {
    const fadingCell = boardEl.children[histories[current][0]];
    fadingCell.classList.add('oldest');
    fadingCell.setAttribute('aria-label', `${fadingCell.getAttribute('aria-label')}, fades on your next move`);
  }
  cardX.classList.toggle('active', !locked && current === 'X');
  cardO.classList.toggle('active', !locked && current === 'O');
  if (!locked) statusEl.innerHTML = `<b style="color:var(--${current.toLowerCase()})">PLAYER ${current === 'X' ? '1' : '2'}</b> — YOUR TURN`;
}

function finish(line) {
  locked = true; scores[current]++; scoreXEl.textContent = scores.X; scoreOEl.textContent = scores.O;
  line.forEach(i => boardEl.children[i].classList.add('win'));
  statusEl.innerHTML = `<b style="color:var(--${current.toLowerCase()})">PLAYER ${current === 'X' ? '1' : '2'} WINS!</b>`;
  cardX.classList.remove('active'); cardO.classList.remove('active'); confetti();
  setTimeout(() => newRound(true), 1800);
}

function confetti() {
  celebration.innerHTML = '';
  for (let i=0;i<34;i++) {
    const spark = document.createElement('i'); spark.className='spark';
    spark.style.left = `${Math.random()*100}%`; spark.style.top = '-20px';
    spark.style.background = i%2 ? 'var(--x)' : 'var(--o)'; spark.style.animationDelay = `${Math.random()*.45}s`;
    celebration.appendChild(spark);
  }
  setTimeout(() => celebration.innerHTML='', 1900);
}

document.querySelector('#resetButton').addEventListener('click', () => newRound(true));
document.querySelector('#rulesButton').addEventListener('click', () => rulesDialog.showModal());
document.querySelector('#closeRules').addEventListener('click', () => rulesDialog.close());
document.querySelector('#gotIt').addEventListener('click', () => rulesDialog.close());
rulesDialog.addEventListener('click', e => { if (e.target === rulesDialog) rulesDialog.close(); });

setupBoard(); newRound();

// Let supporting browsers and assistants use the same game actions as the visible controls.
if (document.modelContext?.registerTool) {
  const register = (tool) => Promise.resolve(document.modelContext.registerTool(tool)).catch(() => {});
  register({
    name:'play_square', title:'Play a square',
    description:'Place the current player’s mark in an empty tic-tac-toe square numbered 1 through 9.',
    inputSchema:{type:'object',properties:{square:{type:'integer',minimum:1,maximum:9}},required:['square'],additionalProperties:false},
    annotations:{readOnlyHint:false,untrustedContentHint:false},
    execute(input) {
      if (!Number.isInteger(input?.square) || input.square < 1 || input.square > 9) throw new Error('Square must be an integer from 1 to 9.');
      const index=input.square-1;
      if (locked || board[index]) throw new Error('That square cannot be played.');
      const player=current; move(index);
      return {playedBy:player,square:input.square,nextPlayer:locked?null:current,board:[...board]};
    }
  });
  register({
    name:'start_new_round', title:'Start a new round',
    description:'Clear the board and start the next round while keeping the score.',
    inputSchema:{type:'object',properties:{},additionalProperties:false},
    annotations:{readOnlyHint:false,untrustedContentHint:false},
    execute() { newRound(true); return {round,currentPlayer:current,scores:{...scores}}; }
  });
}
