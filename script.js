// -------------------- GLOBAL STATE --------------------
let bankroll = 300;
let bet = 0;
let insuranceBet = 0;
let deck = [];
let dealerHand = [];
let playerHands = [[]];
let handBets = [0];
let currentHandIndex = 0;
let gameInProgress = false;
let revealDealer = false;
let handActionTaken = [];
let betChips = [];

// -------------------- DOM ELEMENTS --------------------
const bankrollEl = document.getElementById('bankroll-amount');
const betEl = document.getElementById('bet-amount');
const dealerCardsEl = document.getElementById('dealer-cards');
const dealerScoreEl = document.getElementById('dealer-score');
const playerCards0El = document.getElementById('player-cards-0');
const playerCards1El = document.getElementById('player-cards-1');
const playerScore0El = document.getElementById('player-score-0');
const playerScore1El = document.getElementById('player-score-1');
const splitHandEl = document.getElementById('split-hand');
const messageEl = document.getElementById('message');

const hitBtn = document.getElementById('hit-btn');
const standBtn = document.getElementById('stand-btn');
const doubleBtn = document.getElementById('double-btn');
const splitBtn = document.getElementById('split-btn');
const insuranceBtn = document.getElementById('insurance-btn');

const chipButtons = document.querySelectorAll('.chip');
const betBtn = document.getElementById('bet-btn');

const rightHandEl = document.getElementById('right-hand');

// -------------------- AUDIO --------------------
function playSound(id) {
  const sound = document.getElementById(id);
  if (sound) {
    sound.currentTime = 0;
    sound.play();
  }
}

// -------------------- DECK --------------------
function createDeck() {
  const suits = ['♠','♥','♦','♣'];
  const values = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
  deck = [];
  for (let s of suits) {
    for (let v of values) {
      deck.push({value: v, suit: s});
    }
  }
}

function shuffleDeck() {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i+1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
}

function drawCard() {
  if (deck.length === 0) {
    createDeck();
    shuffleDeck();
  }
  return deck.pop();
}

// -------------------- SCORING --------------------
function calculateScore(hand) {
  let score = 0;
  let aces = 0;
  hand.forEach(card => {
    if (['J','Q','K'].includes(card.value)) score += 10;
    else if (card.value === 'A') { score += 11; aces++; }
    else score += parseInt(card.value);
  });
  while (score > 21 && aces > 0) {
    score -= 10;
    aces--;
  }
  return score;
}

function isBlackjack(hand) {
  return hand.length === 2 && calculateScore(hand) === 21;
}

// -------------------- RENDER --------------------
function renderHands() {
  dealerCardsEl.innerHTML = '';
  dealerHand.forEach((card, i) => {
    if (i === 0 && !revealDealer) {
      dealerCardsEl.innerHTML += `<div class="card">🂠</div>`;
    } else {
      dealerCardsEl.innerHTML += renderCard(card);
    }
  });
  dealerScoreEl.textContent = revealDealer ? `Score: ${calculateScore(dealerHand)}` : '';

  playerCards0El.innerHTML = '';
  playerHands[0].forEach(card => {
    playerCards0El.innerHTML += renderCard(card);
  });
  playerScore0El.textContent = `Score: ${calculateScore(playerHands[0])}`;

  if (playerHands[1]) {
    splitHandEl.style.display = 'block';
    playerCards1El.innerHTML = '';
    playerHands[1].forEach(card => {
      playerCards1El.innerHTML += renderCard(card);
    });
    playerScore1El.textContent = `Score: ${calculateScore(playerHands[1])}`;
  } else {
    splitHandEl.style.display = 'none';
    playerScore1El.textContent = '';
  }
}

function renderCard(card) {
  const color = (card.suit === '♥' || card.suit === '♦') ? 'red' : 'black';
  return `<div class="card ${color}">${card.value}${card.suit}</div>`;
}

// -------------------- GAME FLOW --------------------
function startRound() {
  if (bet <= 0) return;
  gameInProgress = true;
  revealDealer = false;
  dealerHand = [];
  playerHands = [[]];
  handBets = [bet];
  handActionTaken = [false];
  currentHandIndex = 0;
  messageEl.textContent = '';

  createDeck();
  shuffleDeck();

  playerHands[0].push(drawCard(), drawCard());
  dealerHand.push(drawCard(), drawCard());

  renderHands();
  updateControls();
  playSound('deal-sound');
}

async function endRound() {
  const activeHands = playerHands.filter(h => calculateScore(h) <= 21);
  if (activeHands.length > 0) {
    revealDealer = true;
    renderHands();
    await sleep(800);
    while (calculateScore(dealerHand) < 17) {
      dealerHand.push(drawCard());
      renderHands();
      await sleep(800);
    }
  }

  playerHands.forEach((hand, i) => {
    const wager = handBets[i];
    const score = calculateScore(hand);
    const dealerScore = calculateScore(dealerHand);
    const playerBJ = isBlackjack(hand);
    const dealerBJ = isBlackjack(dealerHand);

    if (playerBJ && dealerBJ) {
      bankroll += wager;
      showOverlay('push-overlay');
    } else if (dealerBJ) {
      playSound('lose-sound');
      showOverlay('lose-overlay');
    } else if (playerBJ) {
      bankroll += wager * 2.5;
      playSound('win-sound');
      showOverlay('blackjack-overlay');
    } else if (score > 21) {
      playSound('lose-sound');
      showOverlay('lose-overlay');
    } else if (dealerScore > 21 || score > dealerScore) {
      bankroll += wager * 2;
      playSound('win-sound');
      showOverlay('win-overlay');
    } else if (score === dealerScore) {
      bankroll += wager;
      showOverlay('push-overlay');
    } else {
      playSound('lose-sound');
      showOverlay('lose-overlay');
    }
  });

  bet = 0;
  insuranceBet = 0;
  handBets = [0];
  betChips = [];
  gameInProgress = false;
  animateNumber(bankrollEl, bankroll);
  animateNumber(betEl, bet);
  updateControls();
}

function nextHandOrEnd() {
  if (currentHandIndex < playerHands.length - 1) {
    currentHandIndex++;
    renderHands();
    updateControls();
  } else {
    endRound();
  }
}

// -------------------- OVERLAYS --------------------
function showOverlay(id) {
  const overlay = document.getElementById(id);
  overlay.classList.add('active');
  setTimeout(() => overlay.classList.remove('active'), 1500);
}

// -------------------- HAND ANIMATIONS --------------------
function animateHand(action) {
  if (action === 'hit') {
    rightHandEl.classList.add('tap');
    setTimeout(() => rightHandEl.classList.remove('tap'), 600);
  } else if (action === 'stand' || action === 'split') {
    rightHandEl.classList.add('wave');
    setTimeout(() => rightHandEl.classList.remove('wave'), 800);
  }
}

// -------------------- BUTTON EVENTS --------------------
hitBtn.addEventListener('click', () => {
  playerHands[currentHandIndex].push(drawCard());
  handActionTaken[currentHandIndex] = true;
  renderHands();
  playSound('deal-sound');
  animateHand('hit');

  if (calculateScore(playerHands[currentHandIndex]) > 21) {
    playSound('lose-sound');
    showOverlay('lose-overlay');
    nextHandOrEnd();
  } else {
    updateControls();
  }
});

standBtn.addEventListener('click', () => {
  handActionTaken[currentHandIndex] = true;
  animateHand('stand');
  nextHandOrEnd();
});

doubleBtn.addEventListener('click', () => {
  if (!canDouble(currentHandIndex)) return;

  const wager = handBets[currentHandIndex];
  bankroll -= wager;
  handBets[currentHandIndex] = wager * 2;

  // One card, then hand ends
  playerHands[currentHandIndex].push(drawCard());
  handActionTaken[currentHandIndex] = true;

  renderHands();
  animateNumber(bankrollEl, bankroll);
  playSound('deal-sound');
  animateHand('hit');

  if (calculateScore(playerHands[currentHandIndex]) > 21) {
    playSound('lose-sound');
    showOverlay('lose-overlay');
  }

  nextHandOrEnd();
});

// --- SPLIT (supports re-splitting pairs on any hand) ---
splitBtn.addEventListener('click', () => {
  if (!canSplit(currentHandIndex)) return;

  const wager = handBets[currentHandIndex];
  bankroll -= wager;

  const original = playerHands[currentHandIndex];
  const left = [original[0]];
  const right = [original[1]];

  // -------------------- GLOBAL STATE --------------------
let bankroll = 300;
let bet = 0;
let insuranceBet = 0;
let deck = [];
let dealerHand = [];
let playerHands = [[]];
let handBets = [0];
let currentHandIndex = 0;
let gameInProgress = false;
let revealDealer = false;
let handActionTaken = [];
let betChips = [];

// -------------------- DOM ELEMENTS --------------------
const bankrollEl = document.getElementById('bankroll-amount');
const betEl = document.getElementById('bet-amount');
const dealerCardsEl = document.getElementById('dealer-cards');
const dealerScoreEl = document.getElementById('dealer-score');
const playerCards0El = document.getElementById('player-cards-0');
const playerCards1El = document.getElementById('player-cards-1');
const playerScore0El = document.getElementById('player-score-0');
const playerScore1El = document.getElementById('player-score-1');
const splitHandEl = document.getElementById('split-hand');
const messageEl = document.getElementById('message');

const hitBtn = document.getElementById('hit-btn');
const standBtn = document.getElementById('stand-btn');
const doubleBtn = document.getElementById('double-btn');
const splitBtn = document.getElementById('split-btn');
const insuranceBtn = document.getElementById('insurance-btn');

const chipButtons = document.querySelectorAll('.chip');
const betBtn = document.getElementById('bet-btn');

const rightHandEl = document.getElementById('right-hand');

// -------------------- AUDIO --------------------
function playSound(id) {
  const sound = document.getElementById(id);
  if (sound) {
    sound.currentTime = 0;
    sound.play();
  }
}

// -------------------- DECK --------------------
function createDeck() {
  const suits = ['♠','♥','♦','♣'];
  const values = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
  deck = [];
  for (let s of suits) {
    for (let v of values) {
      deck.push({value: v, suit: s});
    }
  }
}

function shuffleDeck() {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i+1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
}

function drawCard() {
  if (deck.length === 0) {
    createDeck();
    shuffleDeck();
  }
  return deck.pop();
}

// -------------------- SCORING --------------------
function calculateScore(hand) {
  let score = 0;
  let aces = 0;
  hand.forEach(card => {
    if (['J','Q','K'].includes(card.value)) score += 10;
    else if (card.value === 'A') { score += 11; aces++; }
    else score += parseInt(card.value);
  });
  while (score > 21 && aces > 0) {
    score -= 10;
    aces--;
  }
  return score;
}

function isBlackjack(hand) {
  return hand.length === 2 && calculateScore(hand) === 21;
}

// -------------------- RENDER --------------------
function renderHands() {
  dealerCardsEl.innerHTML = '';
  dealerHand.forEach((card, i) => {
    if (i === 0 && !revealDealer) {
      dealerCardsEl.innerHTML += `<div class="card">🂠</div>`;
    } else {
      dealerCardsEl.innerHTML += renderCard(card);
    }
  });
  dealerScoreEl.textContent = revealDealer ? `Score: ${calculateScore(dealerHand)}` : '';

  playerCards0El.innerHTML = '';
  playerHands[0].forEach(card => {
    playerCards0El.innerHTML += renderCard(card);
  });
  playerScore0El.textContent = `Score: ${calculateScore(playerHands[0])}`;

  if (playerHands[1]) {
    splitHandEl.style.display = 'block';
    playerCards1El.innerHTML = '';
    playerHands[1].forEach(card => {
      playerCards1El.innerHTML += renderCard(card);
    });
    playerScore1El.textContent = `Score: ${calculateScore(playerHands[1])}`;
  } else {
    splitHandEl.style.display = 'none';
    playerScore1el.textContent = '';
  }
}

function renderCard(card) {
  const color = (card.suit === '♥' || card.suit === '♦') ? 'red' : 'black';
  return `<div class="card ${color}">${card.value}${card.suit}</div>`;
}

// -------------------- GAME FLOW --------------------
function startRound() {
  if (bet <= 0) return;
  gameInProgress = true;
  revealDealer = false;
  dealerHand = [];
  playerHands = [[]];
  handBets = [bet];
  handActionTaken = [false];
  currentHandIndex = 0;
  messageEl.textContent = '';

  createDeck();
  shuffleDeck();

  playerHands[0].push(drawCard(), drawCard());
  dealerHand.push(drawCard(), drawCard());

  renderHands();
  updateControls();
  playSound('deal-sound');
}

async function endRound() {
  const activeHands = playerHands.filter(h => calculateScore(h) <= 21);
  if (activeHands.length > 0) {
    revealDealer = true;
    renderHands();
    await sleep(800);
    while (calculateScore(dealerHand) < 17) {
      dealerHand.push(drawCard());
      renderHands();
      await sleep(800);
    }
  }

  // --- INSURANCE PAYOUT LOGIC (FIXED) ---
  if (insuranceBet > 0) {
      if (isBlackjack(dealerHand)) {
          bankroll += insuranceBet * 3; // Insurance pays 2:1 (original bet + 2x winnings)
          playSound('win-sound');
      } else {
          playSound('lose-sound');
      }
      insuranceBet = 0; // Reset insurance bet regardless of outcome
      animateNumber(bankrollEl, bankroll);
  }

  playerHands.forEach((hand, i) => {
    const wager = handBets[i];
    const score = calculateScore(hand);
    const dealerScore = calculateScore(dealerHand);
    const playerBJ = isBlackjack(hand);
    const dealerBJ = isBlackjack(dealerHand);

    if (playerBJ && dealerBJ) {
      bankroll += wager;
      showOverlay('push-overlay');
    } else if (dealerBJ) {
      playSound('lose-sound');
      showOverlay('lose-overlay');
    } else if (playerBJ) {
      bankroll += wager * 2.5;
      playSound('win-sound');
      showOverlay('blackjack-overlay');
    } else if (score > 21) {
      playSound('lose-sound');
      showOverlay('lose-overlay');
    } else if (dealerScore > 21 || score > dealerScore) {
      bankroll += wager * 2;
      playSound('win-sound');
      showOverlay('win-overlay');
    } else if (score === dealerScore) {
      bankroll += wager;
      showOverlay('push-overlay');
    } else {
      playSound('lose-sound');
      showOverlay('lose-overlay');
    }
  });

  bet = 0;
  // insuranceBet reset above
  handBets = [0];
  betChips = [];
  gameInProgress = false;
  animateNumber(bankrollEl, bankroll);
  animateNumber(betEl, bet);
  updateControls();
}

function nextHandOrEnd() {
  if (currentHandIndex < playerHands.length - 1) {
    currentHandIndex++;
    renderHands();
    updateControls();
  } else {
    endRound();
  }
}

// -------------------- OVERLAYS --------------------
function showOverlay(id) {
  const overlay = document.getElementById(id);
  overlay.classList.add('active');
  setTimeout(() => overlay.classList.remove('active'), 1500);
}

// -------------------- HAND ANIMATIONS --------------------
function animateHand(action) {
  if (action === 'hit') {
    rightHandEl.classList.add('tap');
    setTimeout(() => rightHandEl.classList.remove('tap'), 600);
  } else if (action === 'stand' || action === 'split') {
    rightHandEl.classList.add('wave');
    setTimeout(() => rightHandEl.classList.remove('wave'), 800);
  }
}

// -------------------- BUTTON EVENTS --------------------
hitBtn.addEventListener('click', () => {
  playerHands[currentHandIndex].push(drawCard());
  handActionTaken[currentHandIndex] = true;
  renderHands();
  playSound('deal-sound');
  animateHand('hit');

  if (calculateScore(playerHands[currentHandIndex]) > 21) {
    playSound('lose-sound');
    showOverlay('lose-overlay');
    nextHandOrEnd();
  } else {
    updateControls();
  }
});

standBtn.addEventListener('click', () => {
  handActionTaken[currentHandIndex] = true;
  animateHand('stand');
  nextHandOrEnd();
});

// --- DOUBLE DOWN LOGIC (FIXED) ---
doubleBtn.addEventListener('click', () => {
  if (!canDouble(currentHandIndex)) return;

  const wager = handBets[currentHandIndex];
  bankroll -= wager;
  handBets[currentHandIndex] = wager * 2;

  playerHands[currentHandIndex].push(drawCard());
  handActionTaken[currentHandIndex] = true; // Prevents hitting/doubling again

  renderHands();
  animateNumber(bankrollEl, bankroll);
  playSound('deal-sound');
  animateHand('hit');

  if (calculateScore(playerHands[currentHandIndex]) > 21) {
    playSound('lose-sound');
    // showOverlay('lose-overlay'); // handled in endRound
  }

  nextHandOrEnd(); // Ends the hand/turn after exactly one card
});

// --- SPLIT LOGIC (FIXED) ---
splitBtn.addEventListener('click', () => {
  if (!canSplit(currentHandIndex)) return;

  const wager = handBets[currentHandIndex];
  bankroll -= wager; // Deduct the second bet amount

  const originalHand = playerHands[currentHandIndex];
  const newHand = [originalHand.pop()]; // Move the second card to a new array

  // Insert the new hand and bet immediately after the current index
  playerHands.splice(currentHandIndex + 1, 0, newHand);
  handBets.splice(currentHandIndex + 1, 0, wager);
  handActionTaken.splice(currentHandIndex + 1, 0, false);

  // Deal the second card to both hands
  playerHands[currentHandIndex].push(drawCard());
  newHand.push(drawCard());
  
  renderHands();
  animateNumber(bankrollEl, bankroll);
  // playSound('split-sound'); // Optional sound effect
  animateHand('split');

  // Special case: If split Aces, only one card is allowed per hand
  if (playerHands[currentHandIndex][0].value === 'A') {
      handActionTaken[currentHandIndex] = true; // Mark current hand as done
      nextHandOrEnd(); // Move immediately to the second (right) hand
  } else {
      updateControls();
  }
});


// --- INSURANCE LOGIC (FIXED) ---
insuranceBtn.addEventListener('click', () => {
  if (!canInsure()) return;

  const insuranceWager = bet / 2;
  bankroll -= insuranceWager;
  insuranceBet = insuranceWager;

  animateNumber(bankrollEl, bankroll);
  // playSound('chip-sound'); // Optional sound effect
  updateControls();
});

// -------------------- CHIPS --------------------
chipButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const value = parseInt(btn.dataset.value);
    const color = btn.dataset.color;
    if (bankroll >= value && !gameInProgress) {
      // Your existing spawnToken logic seems to work for visuals, keeping it as is
      spawnToken(value, color, btn, betEl, () => {
          // This callback runs after animation finishes
          bankroll -= value;
          bet += value;
          handBets = [bet];
          animateNumber(bankrollEl, bankroll);
          animateNumber(betEl, bet);
          updateControls();
      });
    }
  });
});

betBtn.addEventListener('click', () => {
  if (!gameInProgress && bet > 0) {
    startRound();
  }
});

// -------------------- TOKEN ANIMATION --------------------
function spawnToken(amount, color, chipElement, targetElement, callback) {
  const chipRect = chipElement.getBoundingClientRect();
  const targetRect = targetElement.getBoundingClientRect();

  const token = document.createElement('div');
  token.className = 'token';
  token.textContent = `$${amount}`;
  token.style.background = color;
  document.body.appendChild(token);

  token.style.position = 'fixed';
  token.style.left = chipRect.left + 'px';
  token.style.top = chipRect.top + 'px';
  token.style.zIndex = 9999;

  const offsetX = (Math.random() - 0.5) * 200;
  const offsetY = (Math.random() - 0.5) * 200;

  token.animate(
    [{ transform: `translate(0,0)` }, { transform: `translate(${offsetX}px, ${offsetY}px)` }],
    { duration: 200, fill: 'forwards' }
  );

  setTimeout(() => {
    const dx = targetRect.left - chipRect.left;
    const dy = targetRect.top - chipRect.top;

    token
      .animate(
        [
          { transform: `translate(${offsetX}px, ${offsetY}px)` },
          { transform: `translate(${dx}px, ${dy}px)` }
        ],
        { duration: 700, easing: 'ease-in-out', fill: 'forwards' }
      )
      .onfinish = () => {
        token.remove();
        if (callback) callback();
      };
  }, 200);
}

// -------------------- DISPLAY & CONTROLS --------------------
// Renamed the 'i' parameter to 'handIndex' for clarity
function canDouble(handIndex) {
  const hand = playerHands[handIndex] || [];
  return (
    gameInProgress &&
    hand.length === 2 &&
    !handActionTaken[handIndex] &&
    bankroll >= handBets[handIndex]
  );
}

function canSplit(handIndex) {
  const hand = playerHands[handIndex] || [];
  return (
    gameInProgress &&
    hand.length === 2 &&
    hand[0]?.value === hand[1]?.value &&
    bankroll >= handBets[handIndex]
  );
}

function canInsure() {
  // FIXED: Insurance is offered if the dealer's UP card (index 0) is an Ace
  return (
    gameInProgress &&
    dealerHand[0]?.value === 'A' &&
    insuranceBet === 0 &&
    bet > 0 &&
    bankroll >= bet / 2
  );
}

function updateDisplay() {
  bankrollEl.textContent = bankroll;
  betEl.textContent = bet;
  updateControls();
}

function updateControls() {
  const inPlay = gameInProgress;
  
  // Use the .disabled property on the buttons directly
  hitBtn.disabled = !inPlay;
  standBtn.disabled = !inPlay;
  doubleBtn.disabled = !canDouble(currentHandIndex);
  splitBtn.disabled = !canSplit(currentHandIndex);
  insuranceBtn.disabled = !canInsure();
  betBtn.disabled = inPlay;

  chipButtons.forEach(btn => {
    const value = parseInt(btn.dataset.value, 10);
    if (bankroll < value || gameInProgress) {
      btn.classList.add('dim');
      btn.disabled = true;
    } else {
      btn.classList.remove('dim');
      btn.disabled = false;
    }
  });
}

// -------------------- UTIL --------------------
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function animateNumber(element, newValue) {
  const start = parseInt(element.textContent || '0', 10);
  const end = newValue;
  const duration = 500;
  const startTime = performance.now();

  function step(currentTime) {
    const progress = Math.min((currentTime - startTime) / duration, 1);
    const value = Math.floor(start + (end - start) * progress);
    element.textContent = value;
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

// Initialize display on load
updateDisplay();