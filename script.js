(() => {
  // Unified static web app: Ludo with dice + Tic Tac Toe (two-player)
  // Email: student@example.com

  // Elements for Ludo
  const board = document.getElementById('board');
  const statusEl = document.getElementById('status');
  const diceEl = document.getElementById('diceValue');
  const rollBtn = document.getElementById('btnRoll');
  const resetBtn = document.getElementById('btnReset');

  // Tic Tac Toe elements
  const tttBoardEl = document.getElementById('ttt-board');
  const tttStatusEl = document.getElementById('ttt-status');
  const tttResetBtn = document.getElementById('ttt-reset');

  // Tabs
  const tabLudo = document.getElementById('tabLudo');
  const tabTTT = document.getElementById('tabTTT');
  const ludoSection = document.getElementById('ludoSection');
  const tttSection = document.getElementById('tttSection');

  // Ludo state
  const colors = ['red','blue','green','yellow'];
  const START_INDEX = { red: 0, blue: 14, green: 28, yellow: 42 };
  const PATH = [];
  const CENTER = { x: 350, y: 350 };
  const R = 320;
  for(let i=0;i<56;i++){
    const angle = (-Math.PI/2) + (i * 2*Math.PI/56);
    PATH.push({ x: CENTER.x + Math.cos(angle)*R, y: CENTER.y + Math.sin(angle)*R });
  }
  const HOME_POSITIONS = {
    red: [ {x:60,  y:570}, {x:110, y:570}, {x:60, y:620}, {x:110, y:620} ],
    blue: [ {x:640, y:60},  {x:590, y:60}, {x:640, y:110}, {x:590, y:110} ],
    green:[ {x:640, y:640}, {x:590, y:640}, {x:640, y:590}, {x:590, y:590} ],
    yellow:[ {x:60, y:60}, {x:110, y:60}, {x:60, y:110}, {x:110, y:110} ]
  };
  let tokens = {
    red:  Array.from({length:4}, (_,i)=>({ idx:-1, homeIndex: i })),
    blue: Array.from({length:4}, (_,i)=>({ idx:-1, homeIndex: i })),
    green: Array.from({length:4}, (_,i)=>({ idx:-1, homeIndex: i })),
    yellow:Array.from({length:4}, (_,i)=>({ idx:-1, homeIndex: i }))
  };
  const domTokens = [];

  function createTokens(){
    for(const color of colors){
      for(let i=0;i<4;i++){
        const t = document.createElement('div');
        t.className = 'token ' + color;
        t.dataset.color = color;
        t.dataset.slot = i;
        t.title = color + ' token ' + (i+1);
        t.style.left = '0px'; t.style.top = '0px';
        t.addEventListener('click', () => onTokenClick(color, i));
        board.appendChild(t);
        domTokens.push(t);
      }
    }
    for(const color of colors){
      const homeList = HOME_POSITIONS[color];
      for(let k=0;k<homeList.length;k++){
        const h = document.createElement('span');
        h.className = 'home-slot ' + 'home-' + color;
        h.style.left = homeList[k].x + 'px';
        h.style.top =  homeList[k].y + 'px';
        board.appendChild(h);
      }
    }
  }

  let currentTurnIndex = 0;
  let currentRoll = null;
  let rolling = false;
  const movableTokensForColor = { red: [], blue: [], green: [], yellow: [] };

  function resetGame(){
    for(const color of colors){
      for(let i=0;i<4;i++) tokens[color][i].idx = -1, tokens[color][i].homeIndex = i;
    }
    currentTurnIndex = 0; currentRoll = null; rolling = false;
    updateLudoStatus('Game reset. '+ colorName(colors[currentTurnIndex]) +' to roll.');
    renderTokens();
  }

  function colorName(color){
    return color.charAt(0).toUpperCase()+color.slice(1);
  }

  function updateLudoStatus(text){ if(statusEl) statusEl.textContent = text; }

  function rollDice(){
    if(rolling) return;
    rolling = true;
    currentRoll = 1 + Math.floor(Math.random()*6);
    if(diceEl) diceEl.textContent = currentRoll;
    updateLudoStatus(colorName(colors[currentTurnIndex]) + ' rolled ' + currentRoll + '.');

    const color = colors[currentTurnIndex];
    const movable = [];
    tokens[color].forEach((p, idx)=>{
      if(p.idx === -1){ if(currentRoll===6) movable.push(idx); }
      else if(p.idx + currentRoll <= 56) movable.push(idx);
    });
    if(movable.length===0){ setTimeout(()=>{ nextTurn(currentRoll===6); }, 600); }
    else {
      movableTokensForColor[color] = movable;
      updateLudoStatus(colorName(color) + ' can move: click a token. Roll again only after a move.');
    }
  }

  function onTokenClick(color, slotIndex){
    if(colors[currentTurnIndex] !== color) return; // not this color's turn
    const piece = tokens[color][slotIndex];
    if(currentRoll == null){ return; }
    const canMove = (piece.idx === -1 && currentRoll===6) || (piece.idx >=0 && piece.idx + currentRoll <= 56);
    if(!canMove) return;

    if(piece.idx === -1 && currentRoll===6){ // move from home to start
      piece.idx = START_INDEX[color];
    } else if(piece.idx >=0){
      piece.idx += currentRoll;
      if(piece.idx >= 56) piece.idx = 56; // finished
    }

    // Capture opponents on same path index
    if(piece.idx >=0 && piece.idx < 56){
      for(const c of colors){
        if(c===color) continue;
        tokens[c].forEach(op => {
          if(op.idx === piece.idx && op.idx < 56){ op.idx = -1; });
      }
    }

    renderTokens();

    // Win check
    const allFinished = tokens[color].every(p=> p.idx === 56);
    if(allFinished){ updateLudoStatus(colorName(color) + ' wins!'); rolling = false; return; }

    if(currentRoll !== 6){ nextTurn(false); } else {
      currentRoll = null;
      updateLudoStatus(colorName(color) + ' rolled again with 6. Roll again to continue.');
      rolling = false;
    }
  }

  function nextTurn(sameTurn){
    if(sameTurn){ /* stay on same color */ } else { currentTurnIndex = (currentTurnIndex + 1) % 4; }
    currentRoll = null; rolling = false;
    updateLudoStatus(colorName(colors[currentTurnIndex]) + "'s turn. Press Roll Dice.");
    if(rollBtn) rollBtn.disabled = false;
  }

  function renderTokens(){
    const posMap = new Map();
    for(const color of colors){
      for(let i=0;i<4;i++){
        const p = tokens[color][i];
        const dom = domTokens.find(t => t.dataset.color===color && t.dataset.slot===String(i));
        if(!dom) continue;
        let x,y;
        if(p.idx === -1){ // home
          const coords = HOME_POSITIONS[color][p.homeIndex];
          x = coords.x; y = coords.y;
        } else if(p.idx >=0 && p.idx < 56){
          const base = PATH[p.idx];
          let sameIndexList = [];
          for(const c of colors){
            tokens[c].forEach(tt => { if(tt.idx === p.idx) sameIndexList.push(tt); });
          }
          const rank = sameIndexList.findIndex(t2 => t2 === p);
          const offset = (rank - (sameIndexList.length-1)/2) * 14;
          x = base.x + (offset/24)*12; // slight sideways offset
          y = base.y;
        } else {
          x = -100; y = -100; // finished off-board
        }
        dom.style.left = x + 'px'; dom.style.top = y + 'px';
      }
    }
  }

  // Initialize Ludo board pieces
  let colorTokensRefs = {}; // not used, kept for compatibility
  function initLudo(){
    createTokens();
    resetGame();
    renderTokens();
  }

  function createTokens(){
    for(const color of colors){
      for(let i=0;i<4;i++){
        const t = document.createElement('div');
        t.className = 'token ' + color;
        t.dataset.color = color; t.dataset.slot = i;
        t.title = color + ' token ' + (i+1);
        t.style.left = '0px'; t.style.top = '0px';
        t.addEventListener('click', () => onTokenClick(color, i));
        board.appendChild(t);
        domTokens.push(t);
      }
    }
    // home slots decorative
    for(const color of colors){
      const homeList = HOME_POSITIONS[color];
      for(let k=0;k<homeList.length;k++){
        const h = document.createElement('span');
        h.className = 'home-slot ' + 'home-' + color;
        h.style.left = homeList[k].x + 'px'; h.style.top = homeList[k].y + 'px';
        board.appendChild(h);
      }
    }
  }

  // Tic Tac Toe state
  let tttBoard = new Array(9).fill(null); // 'X' or 'O' or null
  let tttCurrent = 'X';
  let tttActive = true;

  function initTTTBoard(){
    tttBoardEl.innerHTML = '';
    for(let i=0;i<9;i++){
      const cell = document.createElement('div');
      cell.className = 'cell'; cell.dataset.index = i; cell.textContent = '';
      cell.addEventListener('click', onTTTCellClick);
      tttBoardEl.appendChild(cell);
    }
    tttStatusEl.textContent = 'Player X\'s turn';
  }

  function onTTTCellClick(e){
    if(!tttActive) return;
    const idx = Number(e.currentTarget.dataset.index);
    if(tttBoard[idx] != null) return;
    tttBoard[idx] = tttCurrent;
    e.currentTarget.textContent = tttCurrent;
    e.currentTarget.classList.add(tttCurrent === 'X' ? 'x' : 'o');
    if(checkTTTWin(tttCurrent)){
      tttStatusEl.textContent = 'Player ' + tttCurrent + ' wins!';
      tttActive = false; return;
    }
    if(tttBoard.every(v => v != null)){
      tttStatusEl.textContent = 'Draw!'; tttActive = false; return;
    }
    tttCurrent = tttCurrent === 'X' ? 'O' : 'X';
    tttStatusEl.textContent = 'Player ' + tttCurrent + '\'s turn';
  }

  function checkTTTWin(player){
    const b = tttBoard;
    const winLines = [
      [0,1,2],[3,4,5],[6,7,8],
      [0,3,6],[1,4,7],[2,5,8],
      [0,4,8],[2,4,6]
    ];
    return winLines.some(line => line.every(i => b[i] === player));
  }

  tttResetBtn.addEventListener('click', resetTTT);

  function resetTTT(){
    tttBoard = new Array(9).fill(null);
    tttCurrent = 'X';
    tttActive = true;
    // reset UI
    Array.from(tttBoardEl.children).forEach(c => {
      c.textContent = ''; c.classList.remove('x','o');
    });
    tttStatusEl.textContent = 'Player X\'s turn';
  }

  // Tab switching
  tabLudo.addEventListener('click', () => {
    ludoSection.classList.add('show'); ludoSection.classList.remove('hidden');
    tttSection.classList.add('hidden'); tttSection.classList.remove('show');
    tabLudo.classList.add('active'); tabTTT.classList.remove('active');
  });
  tabTTT.addEventListener('click', () => {
    tttSection.classList.add('show'); tttSection.classList.remove('hidden');
    ludoSection.classList.add('hidden'); ludoSection.classList.remove('show');
    tabTTT.classList.add('active'); tabLudo.classList.remove('active');
    // ensure ttt board is initialized
  });

  // Init board and sections
  function initBoard(){
    createTokens();
    // Build Tic Tac Toe board UI
    initTTTBoard();
    resetTTT();
    resetGame();
  }

  // Bind initial events
  rollBtn.addEventListener('click', () => {
    if(currentRoll != null) return; // prevent double roll
    rollDice();
  });
  resetBtn.addEventListener('click', resetGame);

  // Start
  initBoard();
})();
