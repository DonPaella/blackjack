let bankroll = 300;
let bet = 0;
let insuranceBet = 0;
let deck = [];
let playerHands = [[]];
let dealerHand = [];
let activeHand = 0;
let revealDealer = false;

const bankrollEl = document.getElementById('bankroll-amount');
const betEl = document.getElementById('bet-amount');
const dealerCardsEl = document.getElementById('dealer-cards');
const playerCardsEls = [
  document.getElementById('player-cards-0'),
  document.getElementById('player-cards-1')
];
const messageEl = document.getElementById('message');
const splitHandEl = document.getElementById('split-hand');

function createDeck() {
  const suits = ['♠', '♥', '♦', '♣'];
  const values = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
  deck = [];
  for (let suit of suits) {
    for (let value of values) {
      deck.push({ value, suit });
    }
  }
  deck = deck.sort(() => Math.random() - 0.5);
}

function drawCard() {
  return deck.pop();
}

function renderCard(card) {
  return `
┌─────┐
│${card.value.padEnd(2)}   │
│  ${card.suit}  │
│   ${card.value.padStart(2)}│
└─────┘`;
}

function renderHands() {
  dealerCardsEl.innerHTML = '';
  playerHands.forEach((hand, i) => {
    playerCardsEls[i].innerHTML = '';
    hand.forEach(card => {
      const cardEl = document.createElement('pre');
      cardEl.className = 'card';
      cardEl.textContent = renderCard(card);
      playerCardsEls[i].appendChild(cardEl);
    });
  });

  dealerHand.forEach((card, i) => {
    const cardEl = document.createElement('pre');
    cardEl.className = 'card';
    cardEl.textContent = i === 1 && !revealDealer ? renderCard({ value: '?', suit: '?' }) : renderCard(card);
    dealerCardsEl.appendChild(cardEl);
  });
}

function animateBankrollChange(from, to) {
  const duration = 500;
  const steps = Math.abs(to - from);
  const stepTime = duration / steps;
  let current = from;
  const increment = to > from ? 1 : -1;

  const interval = setInterval(() => {
    current += increment;
    bankrollEl.textContent = current;
    if (current === to) clearInterval(interval);
  }, stepTime);
}

function updateDisplay() {
  animateBankrollChange(parseInt(bankrollEl.textContent), bankroll);
  betEl.textContent = bet;
  renderHands();
}

function resetHands() {
  playerHands = [[]];
  dealerHand = [];
  activeHand = 0;
  insuranceBet = 0;
  revealDealer = false;
  splitHandEl.style.display = 'none';
  messageEl.textContent = '';
  playerCardsEls.forEach(el => el.textContent = '');
  dealerCardsEl.textContent = '';
}

function calculateScore(hand) {
  let score = 0;
  let aces = 0;
  for (let card of hand) {
    if (['J','Q','K'].includes(card.value)) score += 10;
    else if (card.value === 'A') {
      score += 11;
      aces += 1;
    } else score += parseInt(card.value);
  }
  while (score > 21 && aces > 0) {
    score -= 10;
    aces -= 1;
  }
  return score;
}

async function dealCards() {
  playerHands[0].push(drawCard());
  renderHands();
  await new Promise(r => setTimeout(r, 500));
  dealerHand.push(drawCard());
  renderHands();
  await new Promise(r => setTimeout(r, 500));
  playerHands[0].push(drawCard());
  renderHands();
  await new Promise(r => setTimeout(r, 500));
  dealerHand.push(drawCard());
  renderHands();
}

function endRound() {
  revealDealer = true;
  renderHands();

  while (calculateScore(dealerHand) < 17) {
    dealerHand.push(drawCard());
  }

  playerHands.forEach((hand, i) => {
    const score = calculateScore(hand);
    const dealerScore = calculateScore(dealerHand);
    if (score > 21) {
      messageEl.textContent += `Hand ${i+1}: Bust.\n`;
    } else if (dealerScore > 21 || score > dealerScore) {
      messageEl.textContent += `Hand ${i+1}: Win!\n`;
      bankroll += bet / playerHands.length * 2;
    } else if (score === dealerScore) {
      messageEl.textContent += `Hand ${i+1}: Push.\n`;
      bankroll += bet / playerHands.length;
    } else {
      messageEl.textContent += `Hand ${i+1}: Lose.\n`;
    }
  });

  if (insuranceBet > 0) {
    if (dealerHand[0].value === 'A' && calculateScore(dealerHand) === 21) {
      messageEl.textContent += 'Insurance pays 2:1!\n';
      bankroll += insuranceBet * 3;
    } else {
      messageEl.textContent += 'Insurance lost.\n';
    }
  }

  bet = 0;
  insuranceBet = 0;
  updateDisplay();
}

document.querySelectorAll('.chip').forEach(chip => {
  chip.addEventListener('click', () => {
    const value = parseInt(chip.dataset.value);
    if (bankroll >= value) {
      bankroll -= value;
      bet += value;
      updateDisplay();
    }
  });
});

document.getElementById('bet-btn').addEventListener('click', async () => {
  if (bet === 0) return;
  resetHands();
  createDeck();
  await dealCards();
  if (dealerHand[0].value === 'A') {
    messageEl.textContent = 'Dealer shows Ace. Insurance available.';
  }
});

document.getElementById('hit-btn').addEventListener('click', () => {
  playerHands[activeHand].push(drawCard());
  updateDisplay();
  if (calculateScore(playerHands[activeHand]) > 21) {
    if (activeHand === 0 && playerHands.length === 2) {
      activeHand = 1;
      messageEl.textContent = 'Switching to Hand 2.';
    } else {
      endRound();
    }
  }
});

document.getElementById('stand-btn').addEventListener('click', () => {
  if (activeHand === 0 && playerHands.length === 2) {
    activeHand = 1;
    messageEl.textContent = 'Switching to Hand 2.';
  } else {
    endRound();
  }
});

document.getElementById('double-btn').addEventListener('click', () => {
  const handBet = bet / playerHands.length;
  if (bankroll >= handBet) {
    bankroll -= handBet;
    bet += handBet;
    playerHands[activeHand].push(drawCard());
    updateDisplay();
    document.getElementById('stand-btn').click();
  }
});

document.getElementById('split-btn').addEventListener('click', () => {
  const hand = playerHands[0];
  if (hand.length === 2 && hand[0].value === hand[1].value && bankroll >= bet) {
    bankroll -= bet;
    playerHands = [
      [hand[0], drawCard()],
      [hand[1], drawCard()]
    ];
    splitHandEl.style.display = 'block';
    updateDisplay();
    messageEl.textContent = 'Hand split!';
  } else {
    messageEl.textContent = 'Cannot split.';
  }
});

document.getElementById('insurance-btn').addEventListener('click', () => {
  if (dealerHand[0].value === 'A') {
    const insuranceCost = bet / 2;
    if (bankroll >= insuranceCost) {
      bankroll -= insuranceCost;
      insuranceBet = insuranceCost;
      updateDisplay();
      messageEl.textContent = 'Insurance placed.';
    } else {
      messageEl.textContent = 'Not enough bankroll for insurance.';
    }
  } else {
    messageEl.textContent = 'Insurance not available.';
  }
});
