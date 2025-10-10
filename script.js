(() => {
  // Ludo-like, robust static game for GitHub Pages
  const board = document.getElementById('board');
  const statusEl = document.getElementById('status');
  const diceEl = document.getElementById('diceValue');
  const rollBtn = document.getElementById('btnRoll');
  const resetBtn = document.getElementById('btnReset');

  const colors = ['red','blue','green','yellow'];
  const START_INDEX = { red: 0, blue: 14, green: 28, yellow: 42 };
  const PATH = [];
  // Build circular track with 56 positions around center
  const CENTER = { x: 350, y: 350 };
  const R = 320; // radius for track
  for(let i=0;i<56;i++){
    const angle = (-Math.PI/2) + (i * 2*Math.PI/56);
    PATH.push({ x: CENTER.x + Math.cos(angle)*R, y: CENTER.y + Math.sin(angle)*R });
  }

  // Home positions for each color (slots 0..3)
  const HOME_POSITIONS = {
    red: [ {x:60,  y:570}, {x:110, y:570}, {x:60, y:620}, {x:110, y:620} ], // bottom-left
    blue: [ {x:640, y:60},  {x:590, y:60}, {x:640, y:110}, {x:590, y:110} ], // top-right-ish (within 700x700 canvas)
    green:[ {x:640, y:640}, {x:590, y:640}, {x:640, y:590}, {x:590, y:590} ], // bottom-right
    yellow:[ {x:60, y:60}, {x:110, y:60}, {x:60, y:110}, {x:110, y:110} ] // top-left
  };

  // Each color has 4 tokens. idx: -1 means at home, 0..55 means on PATH index, 56 means finished
  const tokens = {
    red:  Array.from({length:4}, (_,i)=>({ idx:-1, homeIndex: i })),
    blue: Array.from({length:4}, (_,i)=>({ idx:-1, homeIndex: i })),
    green: Array.from({length:4}, (_,i)=>({ idx:-1, homeIndex: i })),
    yellow:Array.from({length:4}, (_,i)=>({ idx:-1, homeIndex: i }))
  };

  // Token DOM elements (we create once per piece)
  const domTokens = [];
  function createTokens() {
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
    // also place small home indicators (decorative)
    for(const color of colors){
      const homeList = HOME_POSITIONS[color];
      const cls = 'home-' + color;
      for(let k=0;k<homeList.length;k++){
        const h = document.createElement('span');
        h.className = 'home-slot ' + cls;
        h.style.left = homeList[k].x + 'px';
        h.style.top = homeList[k].y + 'px';
        board.appendChild(h);
      }
    }
  }

  let currentTurnIndex = 0; // 0..3
  let currentRoll = null;
  let rolling = false;

  function resetGame(){
    for(const color of colors){
      for(let i=0;i<4;i++) tokens[color][i].idx = -1, tokens[color][i].homeIndex = i;
    }
    currentTurnIndex = 0; currentRoll = null; rolling = false;
    updateStatus('Game reset. '+ colorName(colors[currentTurnIndex]) +' to roll.');
    renderTokens();
  }

  function colorName(color){
    return color.charAt(0).toUpperCase()+color.slice(1);
  }

  function updateStatus(text){ statusEl?.innerText && ( // placeholder
    null
  ); }

  function updateUIStatus(text){ if(statusEl) statusEl.textContent = text; }

  function rollDice(){
    if(rolling) return;
    rolling = true;
    currentRoll = 1 + Math.floor(Math.random()*6);
    if(diceEl) diceEl.textContent = currentRoll;
    updateUIStatus(colorName(colors[currentTurnIndex]) + ' rolled ' + currentRoll + '.');

    // determine movable tokens for this color
    const color = colors[currentTurnIndex];
    const movable = [];
    tokens[color].forEach((p, idx)=>{
      if(p.idx === -1){ if(currentRoll===6) movable.push(idx); }
      else if(p.idx + currentRoll <= 56) movable.push(idx);
    });
    if(movable.length===0){ // no moves -> end turn after short delay
      setTimeout(()=>{ nextTurn(currentRoll===6); }, 600);
    } else {
      // highlight possible tokens by making them clickable (we already have click handlers on tokens)
      // show instruction
      updateUIStatus(colorName(color) + ' can move: click a token. Roll again only after move.');
      // store movable for UI hints (not strictly necessary)
      movableTokensForColor[color] = movable;
    }
    function nextTurn(sameTurn){ /* placeholder for closure */ }
  }

  // map for movable token indices per color per roll
  const movableTokensForColor = { red: [], blue: [], green: [], yellow: [] };

  function onTokenClick(color, slotIndex){
    if(colors[currentTurnIndex] !== color) return; // not this color's turn
    const piece = tokens[color][slotIndex];
    if(currentRoll == null){ return; }
    // Check if this token can move
    const canMove = (piece.idx === -1 && currentRoll===6) || (piece.idx >=0 && piece.idx + currentRoll <= 56);
    if(!canMove) return;

    if(piece.idx === -1 && currentRoll===6){ // move from home to start
      piece.idx = START_INDEX[color];
    } else if(piece.idx >=0){
      piece.idx += currentRoll;
      if(piece.idx >= 56) piece.idx = 56; // finished
    }

    // After moving, capture any opponent piece on same path index
    if(piece.idx >=0 && piece.idx < 56){
      for(const c of colors){
        if(c===color) continue;
        tokens[c].forEach(op => {
          if(op.idx === piece.idx and op.idx < 56){
            // capture
            op.idx = -1;
          }
        });
      }
    }

    renderTokens();

    // check win
    const allFinished = tokens[color].every(p=> p.idx === 56);
    if(allFinished){
      updateUIStatus(colorName(color) + ' wins!');
      // disable further moves
      rolling = false;
      return;
    }

    // end turn if roll not 6, else keep turn
    if(currentRoll !== 6){ nextTurn(false); } else { // allow another move for same color
      currentRoll = null; // force new roll only after clicking a new token? We can require roll again
      updateUIStatus(colorName(color) + ' rolled again with 6. Roll again to continue.');
      rolling = false; // allow roll again
    }
  }

  function nextTurn(sameTurn){
    // advance turn unless sameTurn
    if(sameTurn){
      // same turn, do not change currentTurnIndex
    } else {
      currentTurnIndex = (currentTurnIndex + 1) % 4;
    }
    currentRoll = null;
    rolling = false;
    updateUIStatus(colorName(colors[currentTurnIndex]) + "'s turn. Press Roll Dice.");
    if(rollBtn) rollBtn.disabled = false; // new turn ready for roll
  }

  function renderTokens(){
    // Build occupancy for stacking visuals
    // First determine positions for all tokens
    const posMap = new Map(); // key: idx or 'home-color-slot' for home

    for(const color of colors){
      for(let i=0;i<4;i++){
        const p = tokens[color][i];
        const dom = domTokens.find(t => t.dataset.color===color && t.dataset.slot===String(i));
        if(!dom) continue;
        let x,y, rot={};
        if(p.idx === -1){ // home
          const coords = HOME_POSITIONS[color][p.homeIndex];
          x = coords.x; y = coords.y;
        } else if(p.idx >=0 && p.idx < 56){
          const base = PATH[p.idx];
          // compute stacking offset among tokens sharing same path index
          let stack = 0; let sameIndexList = [];
          for(const color2 of colors){
            for(const t2 of tokens[color2]){
              if(t2.idx === p.idx) { sameIndexList.push(t2); }
            }
          }
          stack = sameIndexList.findIndex(t2=> t2===p);
          const offset = (stack - (sameIndexList.length-1)/2) * 14;
          x = base.x; y = base.y;
          // slight offset sideways to avoid perfect overlap
          const dx = (offset/24) * 12; // small shift
          const dy = 0;
          x += dx; y += dy;
        } else { // finished
          x = -100; y = -100; // off-board
        }
        dom.style.left = x + 'px';
        dom.style.top  = y + 'px';
      }
    }
  }

  function initBoard(){
    createTokens();
    // center board artwork note
    resetGame();
    renderTokens();
  }

  // Bind events
  rollBtn.addEventListener('click', () => {
    if(currentRoll != null) return; // prevent double roll
    // verify if there exists movable tokens; if none, advance turn
    const color = colors[currentTurnIndex];
    const movable = tokens[color].some(p => (p.idx === -1 && true) || (p.idx>=0 && p.idx + 1 <= 56)); // rough check
    // We'll perform a roll anyway; actual movable handled in onTokenClick
    rollDice();
  });

  resetBtn.addEventListener('click', resetGame);

  // Initialize on load
  initBoard();
})();
