// -------------------- GLOBAL STATE --------------------
let bankroll = 300;
let bet = 0;
let insuranceBet = 0;
let deck = [];
let dealerHand = [];
let playerHands = [[]];
let currentHandIndex = 0;
let gameInProgress = false;
let revealDealer = false;

// -------------------- DOM ELEMENTS --------------------
const gameScreen = document.getElementById('game');
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
  // Dealer
  dealerCardsEl.innerHTML = '';
  dealerHand.forEach((card, i) => {
    if (i === 0 && !revealDealer) {
      dealerCardsEl.innerHTML += `<div class="card">🂠</div>`;
    } else {
      dealerCardsEl.innerHTML += renderCard(card);
    }
  });
  dealerScoreEl.textContent = revealDealer ? `Score: ${calculateScore(dealerHand)}` : '';

  // Player hand 0
  playerCards0El.innerHTML = '';
  playerHands[0].forEach(card => {
    playerCards0El.innerHTML += renderCard(card);
  });
  playerScore0El.textContent = `Score: ${calculateScore(playerHands[0])}`;

  // Split hand
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
  const red = (card.suit === '♥' || card.suit === '♦') ? 'red' : '';
  return `<div class="card ${red}">${card.value}${card.suit}</div>`;
}

// -------------------- GAME FLOW --------------------
function startRound() {
  if (bet <= 0) return;
  gameInProgress = true;
  revealDealer = false;
  dealerHand = [];
  playerHands = [[]];
  currentHandIndex = 0;
  messageEl.textContent = '';

  createDeck();
  shuffleDeck();

  playerHands[0].push(drawCard(), drawCard());
  dealerHand.push(drawCard(), drawCard());

  renderHands();
  updateControls();   // <-- ensures buttons show correctly
  updateControls();
  playSound('deal-sound');
}

async function endRound() {
  revealDealer = true;
  renderHands();
  await sleep(800);

  while (calculateScore(dealerHand) < 17) {
    dealerHand.push(drawCard());
    renderHands();
    await sleep(800);
  }

  playerHands.forEach((hand, i) => {
    const score = calculateScore(hand);
    const dealerScore = calculateScore(dealerHand);
    const playerBJ = isBlackjack(hand);
    const dealerBJ = isBlackjack(dealerHand);

    if (playerBJ && dealerBJ) {
      messageEl.textContent += `Hand ${i+1}: Push (both Blackjack).\n`;
      bankroll += bet / playerHands.length;
    } else if (dealerBJ) {
      messageEl.textContent += `Hand ${i+1}: Dealer Blackjack.\n`;
      playSound('lose-sound');
    } else if (playerBJ) {
      messageEl.textContent += `Hand ${i+1}: Blackjack! You win.\n`;
      bankroll += bet / playerHands.length * 2.5;
      playSound('win-sound');
      showBlackjackOverlay(); // special overlay
    } else if (dealerScore > 21 || score > dealerScore) {
      messageEl.textContent += `Hand ${i+1}: Win!\n`;
      bankroll += bet / playerHands.length * 2;
      playSound('win-sound');
    } else if (score === dealerScore) {
      messageEl.textContent += `Hand ${i+1}: Push.\n`;
      bankroll += bet / playerHands.length;
    } else {
      messageEl.textContent += `Hand ${i+1}: Lose.\n`;
      playSound('lose-sound');
    }
  });

  bet = 0;
  insuranceBet = 0;
  gameInProgress = false;
  updateDisplay();
}

// -------------------- OVERLAY --------------------
function showBlackjackOverlay() {
  const overlay = document.getElementById('blackjack-overlay');
  overlay.classList.add('active');
  setTimeout(() => overlay.classList.remove('active'), 2000);
}

// -------------------- CONTROLS --------------------
hitBtn.addEventListener('click', () => {
  playerHands[currentHandIndex].push(drawCard());
  renderHands();
  playSound('deal-sound');
  if (calculateScore(playerHands[currentHandIndex]) > 21) {
    endRound();
  }
});

standBtn.addEventListener('click', () => {
  endRound();
});

doubleBtn.addEventListener('click', () => {
  if (bankroll >= bet) {
    bankroll -= bet;
    bet *= 2;
    playerHands[currentHandIndex].push(drawCard());
    renderHands();
    endRound();
  }
});

splitBtn.addEventListener('click', () => {
  const hand = playerHands[0];
  if (hand.length === 2 && hand[0].value === hand[1].value && bankroll >= bet) {
    bankroll -= bet;
    playerHands = [[hand[0]], [hand[1]]];
    playerHands[0].push(drawCard());
    playerHands[1].push(drawCard());
    renderHands();
  }
});

insuranceBtn.addEventListener('click', () => {
  if (dealerHand[0].value === 'A' && bankroll >= bet/2) {
    insuranceBet = bet/2;
    bankroll -= insuranceBet;
    messageEl.textContent = 'Insurance taken.\n';
  }
});

// -------------------- CHIPS --------------------
chipButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const value = parseInt(btn.dataset.value);
    if (bankroll >= value && !gameInProgress) {
      // Animate tokens first, then update bankroll/bet
      animateTokens(value, btn, betEl, () => {
        bankroll -= value;
        bet += value;
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
function animateTokens(chipValue, chipElement, targetElement, callback) {
  const chipRect = chipElement.getBoundingClientRect();
  const targetRect = targetElement.getBoundingClientRect();
  let finished = 0;

  for (let i = 0; i < chipValue; i++) {
    const token = document.createElement('div');
    token.className = 'token';
    token.textContent = '$1';
    document.body.appendChild(token);

    token.style.left = chipRect.left + 'px';
    token.style.top = chipRect.top + 'px';

    const offsetX = (Math.random() - 0.5) * 200;
    const offsetY = (Math.random() - 0.5) * 200;

    token.animate([
      { transform: `translate(0,0)` },
      { transform: `translate(${offsetX}px, ${offsetY}px)` }
    ], { duration: 200, fill: 'forwards' });

    setTimeout(() => {
      const dx = targetRect.left - chipRect.left;
      const dy = targetRect.top - chipRect.top;

      token.animate([
        { transform: `translate(${offsetX}px, ${offsetY}px)` },
        { transform: `translate(${dx}px, ${dy}px)` }
      ], { duration: 700, easing: 'ease-in-out', fill: 'forwards' })
      .onfinish = () => {
        token.remove();
        finished++;
        if (finished === chipValue && callback) callback();
      };
    }, 200);
  }
}

// -------------------- DISPLAY & CONTROLS --------------------
function updateDisplay() {
  bankrollEl.textContent = bankroll;
  betEl.textContent = bet;
  updateControls();
}

function updateControls() {
  if (!gameInProgress) {
    hitBtn.disabled = true;
    standBtn.disabled = true;
    doubleBtn.classList.add('hidden');
    splitBtn.classList.add('hidden');
    insuranceBtn.classList.add('hidden');
    return;
  }

  hitBtn.disabled = false;
  standBtn.disabled = false;

  // Double available only on first two cards
  if (playerHands[currentHandIndex].length === 2 && bankroll >= bet) {
    doubleBtn.classList.remove('hidden');
  } else {
    doubleBtn.classList.add('hidden');
  }

  // Split available only if two cards of same value
  const hand = playerHands[currentHandIndex];
  if (hand.length === 2 && hand[0].value === hand[1].value && bankroll >= bet) {
    splitBtn.classList.remove('hidden');
  } else {
    splitBtn.classList.add('hidden');
  }

  // Insurance available if dealer shows Ace
  if (dealerHand[0].value === 'A' && insuranceBet === 0 && bankroll >= bet/2) {
    insuranceBtn.classList.remove('hidden');
  } else {
    insuranceBtn.classList.add('hidden');
  }
}

// -------------------- UTIL --------------------
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
function animateNumber(element, newValue) {
  const start = parseInt(element.textContent);
  const end = newValue;
  const duration = 500; // ms
  const startTime = performance.now();

  function step(currentTime) {
    const progress = Math.min((currentTime - startTime) / duration, 1);
    const value = Math.floor(start + (end - start) * progress);
    element.textContent = value;
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}
