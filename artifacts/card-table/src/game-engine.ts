export type GameId =
  | 'solitaire'
  | 'poker'
  | 'rummy'
  | 'hearts'
  | 'spades'
  | 'bundles'
  | 'crazy-eights'
  | 'blackjack';
export type GameMode = 'ai' | 'pass';
export type Suit = 'S' | 'H' | 'D' | 'C';
export type Card = { suit: Suit; rank: number };
export type Player = {
  name: string;
  hand: Card[];
  bundle: Card[];
  score: number;
  bid: number;
  tricks: number;
};
export type Column = { cards: Card[]; faceUpFrom: number };
export type TrickPlay = { player: number; card: Card };
export type SolitaireSource = 'waste' | 'tableau' | 'foundation';

export type GameState = {
  id: GameId;
  mode: GameMode;
  players: Player[];
  stock: Card[];
  waste: Card[];
  tableau: Column[];
  foundations: Card[][];
  center: Card[];
  discard: Card[];
  melds: Card[][];
  selectedKeys: string[];
  solitaireSelected: null | {
    source: SolitaireSource;
    pile: number;
    index: number;
  };
  current: number;
  phase: 'play' | 'draw' | 'bid' | 'trick' | 'declare' | 'showdown' | 'done';
  trick: TrickPlay[];
  leadSuit: Suit | null;
  heartsBroken: boolean;
  crazySuit: Suit | null;
  crazyPasses: number;
  dealerRevealed: boolean;
  lastCapture: number;
  round: number;
  winner: number;
  result: string;
  moves: number;
};

export const catalog: {
  id: GameId;
  title: string;
  subtitle: string;
  players: string;
  description: string;
  mark: string;
  passAndPlay: boolean;
}[] = [
  {
    id: 'solitaire',
    title: 'Solitaire',
    subtitle: 'Klondike',
    players: '1 player',
    description: 'Build four suits from ace to king.',
    mark: '♠',
    passAndPlay: false,
  },
  {
    id: 'poker',
    title: 'Poker',
    subtitle: 'Five-card draw',
    players: '2–4 players',
    description: 'Trade cards, read the table, take the pot.',
    mark: '♦',
    passAndPlay: true,
  },
  {
    id: 'rummy',
    title: 'Rummy',
    subtitle: 'Straight Rummy',
    players: '2 players',
    description: 'Make matching sets and suited runs.',
    mark: '♥',
    passAndPlay: true,
  },
  {
    id: 'hearts',
    title: 'Hearts',
    subtitle: 'Classic',
    players: '4 players',
    description: 'Avoid hearts and the queen of spades.',
    mark: '♥',
    passAndPlay: true,
  },
  {
    id: 'spades',
    title: 'Spades',
    subtitle: 'Partnership',
    players: '4 players',
    description: 'Bid as a team, then make your contract.',
    mark: '♣',
    passAndPlay: true,
  },
  {
    id: 'bundles',
    title: 'Stealing Bundles',
    subtitle: 'Classic rules',
    players: '2–4 players',
    description: 'Match the table or steal a rival’s bundle.',
    mark: '♦',
    passAndPlay: true,
  },
  {
    id: 'crazy-eights',
    title: 'Crazy Eights',
    subtitle: 'Classic',
    players: '2–4 players',
    description: 'Match the suit or rank; eights are wild.',
    mark: '♣',
    passAndPlay: true,
  },
  {
    id: 'blackjack',
    title: 'Blackjack',
    subtitle: 'Dealer stands on 17',
    players: '1 player + dealer',
    description: 'Get closer to 21 than the dealer without going over.',
    mark: '♠',
    passAndPlay: false,
  },
];

const suits: Suit[] = ['S', 'H', 'D', 'C'];
const suitOrder: Record<Suit, number> = { C: 0, D: 1, H: 2, S: 3 };
const makeDeck = (): Card[] =>
  suits.flatMap((suit) =>
    Array.from({ length: 13 }, (_, index) => ({ suit, rank: index + 1 })),
  );
const key = (card: Card): string => `${card.suit}${card.rank}`;
const shuffle = <T,>(items: T[]): T[] => {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};
const rankSort = (a: Card, b: Card): number =>
  a.rank - b.rank || suitOrder[a.suit] - suitOrder[b.suit];
const playerNames = (mode: GameMode, count: number): string[] => {
  const aiNames = ['You', 'Mina', 'Jamal', 'Rafi'];
  return Array.from({ length: count }, (_, index) =>
    index === 0 ? 'You' : mode === 'ai' ? aiNames[index] : `Player ${index + 1}`,
  );
};
const basePlayers = (mode: GameMode, count: number): Player[] =>
  playerNames(mode, count).map((name) => ({
    name,
    hand: [],
    bundle: [],
    score: 0,
    bid: -1,
    tricks: 0,
  }));

const baseState = (id: GameId, mode: GameMode): GameState => ({
  id,
  mode,
  players: [],
  stock: [],
  waste: [],
  tableau: [],
  foundations: [[], [], [], []],
  center: [],
  discard: [],
  melds: [],
  selectedKeys: [],
  solitaireSelected: null,
  current: 0,
  phase: 'play',
  trick: [],
  leadSuit: null,
  heartsBroken: false,
  crazySuit: null,
  crazyPasses: 0,
  dealerRevealed: false,
  lastCapture: -1,
  round: 1,
  winner: -1,
  result: '',
  moves: 0,
});

export function newGame(id: GameId, mode: GameMode): GameState {
  const state = baseState(id, mode);
  const deck = shuffle(makeDeck());

  if (id === 'solitaire') {
    state.stock = deck.slice(28);
    state.tableau = Array.from({ length: 7 }, (_, column) => ({
      cards: deck.slice(
        (column * (column + 1)) / 2,
        (column * (column + 1)) / 2 + column + 1,
      ),
      faceUpFrom: column,
    }));
    state.players = basePlayers(mode, 1);
    return state;
  }

  if (id === 'poker') {
    state.players = basePlayers(mode, 4);
    state.stock = deck;
    for (let round = 0; round < 5; round += 1) {
      state.players.forEach((player) => player.hand.push(state.stock.pop()!));
    }
    state.phase = 'play';
    return state;
  }

  if (id === 'blackjack') {
    state.players = basePlayers(mode, 2);
    state.players[1].name = 'Dealer';
    state.stock = deck;
    for (let deal = 0; deal < 2; deal += 1) {
      state.players.forEach((player) => player.hand.push(state.stock.pop()!));
    }
    const playerNatural = blackjackTotal(state.players[0].hand) === 21;
    const dealerNatural = blackjackTotal(state.players[1].hand) === 21;
    if (playerNatural || dealerNatural) {
      if (playerNatural && dealerNatural)
        return finish(state, -1, 'Both you and the dealer have blackjack. Push.');
      return playerNatural
        ? finish(state, 0, 'Blackjack! You win with 21.')
        : finish(state, 1, 'The dealer has blackjack. Dealer wins.');
    }
    return state;
  }

  if (id === 'crazy-eights') {
    state.players = basePlayers(mode, 4);
    state.stock = deck;
    for (let deal = 0; deal < 5; deal += 1) {
      state.players.forEach((player) => player.hand.push(state.stock.pop()!));
    }
    const firstDiscard = state.stock.findIndex((card) => card.rank !== 8);
    [state.stock[firstDiscard], state.stock[state.stock.length - 1]] = [
      state.stock[state.stock.length - 1],
      state.stock[firstDiscard],
    ];
    const firstCard = state.stock.pop()!;
    state.discard = [firstCard];
    state.crazySuit = firstCard.suit;
    return state;
  }

  if (id === 'rummy') {
    state.players = basePlayers(mode, 2);
    state.stock = deck;
    for (let round = 0; round < 10; round += 1) {
      state.players.forEach((player) => player.hand.push(state.stock.pop()!));
    }
    state.discard = [state.stock.pop()!];
    state.phase = 'draw';
    return state;
  }

  if (id === 'hearts' || id === 'spades') {
    state.players = basePlayers(mode, 4);
    state.stock = deck;
    for (let round = 0; round < 13; round += 1) {
      state.players.forEach((player) => player.hand.push(state.stock.pop()!));
    }
    if (id === 'hearts') {
      state.current = state.players.findIndex((player) =>
        player.hand.some((card) => card.suit === 'C' && card.rank === 2),
      );
      state.phase = 'trick';
    } else {
      state.phase = 'bid';
    }
    return state;
  }

  state.players = basePlayers(mode, 4);
  state.stock = deck;
  for (let round = 0; round < 4; round += 1) {
    state.players.forEach((player) => player.hand.push(state.stock.pop()!));
  }
  state.center = state.stock.splice(-4);
  return state;
}

export const cardKey = key;
export const rankLabel = (rank: number): string =>
  rank === 1 ? 'A' : rank === 11 ? 'J' : rank === 12 ? 'Q' : rank === 13 ? 'K' : `${rank}`;
export const suitGlyph = (suit: Suit): string =>
  ({ S: '♠', H: '♥', D: '♦', C: '♣' })[suit];
export const isRed = (card: Card): boolean =>
  card.suit === 'H' || card.suit === 'D';

const finish = (state: GameState, winner: number, result: string): GameState => ({
  ...state,
  phase: 'done',
  winner,
  result,
});

export function blackjackTotal(hand: Card[]): number {
  let total = 0;
  let aces = 0;
  for (const card of hand) {
    if (card.rank === 1) {
      total += 11;
      aces += 1;
    } else {
      total += Math.min(card.rank, 10);
    }
  }
  while (total > 21 && aces > 0) {
    total -= 10;
    aces -= 1;
  }
  return total;
}

function finishBlackjack(state: GameState): GameState {
  const playerTotal = blackjackTotal(state.players[0].hand);
  const dealerTotal = blackjackTotal(state.players[1].hand);
  const winner =
    dealerTotal > 21 || playerTotal > dealerTotal
      ? 0
      : playerTotal === dealerTotal
        ? -1
        : 1;
  const result =
    winner === 0
      ? dealerTotal > 21
        ? `Dealer busts at ${dealerTotal}. You win with ${playerTotal}.`
        : `You win ${playerTotal} to ${dealerTotal}.`
      : winner === -1
        ? `Push: you and the dealer both have ${playerTotal}.`
        : `Dealer wins ${dealerTotal} to ${playerTotal}.`;
  return finish({ ...state, dealerRevealed: true }, winner, result);
}

export function blackjackHit(state: GameState): GameState {
  if (state.id !== 'blackjack' || state.phase !== 'play' || state.current !== 0)
    return state;
  const card = state.stock.at(-1);
  if (!card) return blackjackStand(state);
  const stock = state.stock.slice(0, -1);
  const players = state.players.map((player, index) =>
    index === 0 ? { ...player, hand: [...player.hand, card] } : player,
  );
  const next = { ...state, players, stock, moves: state.moves + 1 };
  const total = blackjackTotal(players[0].hand);
  if (total > 21) return finish({ ...next, dealerRevealed: true }, 1, `You bust at ${total}. Dealer wins.`);
  return total === 21 ? blackjackStand(next) : next;
}

export function blackjackStand(state: GameState): GameState {
  if (state.id !== 'blackjack' || state.phase !== 'play' || state.current !== 0)
    return state;
  return { ...state, current: 1, dealerRevealed: true, moves: state.moves + 1 };
}

export function legalCrazyEightsCards(state: GameState): Card[] {
  if (state.id !== 'crazy-eights' || state.phase !== 'play') return [];
  const top = state.discard.at(-1);
  if (!top) return [];
  return state.players[state.current]?.hand.filter(
    (card) => card.rank === 8 || card.suit === state.crazySuit || card.rank === top.rank,
  ) ?? [];
}

const crazyEightsCardValue = (card: Card): number =>
  card.rank === 8 ? 50 : card.rank >= 11 ? 10 : card.rank === 1 ? 1 : card.rank;

function finishCrazyEightsRound(state: GameState, winner: number, blocked = false): GameState {
  const points = state.players.reduce(
    (total, player, index) =>
      index === winner
        ? total
        : total + player.hand.reduce((sum, card) => sum + crazyEightsCardValue(card), 0),
    0,
  );
  const players = state.players.map((player, index) =>
    index === winner ? { ...player, score: player.score + points } : player,
  );
  const message = blocked
    ? `${players[winner].name} wins with the lowest hand and scores ${points} points.`
    : `${players[winner].name} went out and scores ${points} points.`;
  return finish({ ...state, players }, winner, message);
}

function finishBlockedCrazyEights(state: GameState): GameState {
  const values = state.players.map((player) =>
    player.hand.reduce((sum, card) => sum + crazyEightsCardValue(card), 0),
  );
  const winner = values.reduce((best, value, index) => (value < values[best] ? index : best), 0);
  return finishCrazyEightsRound(state, winner, true);
}

export function playCrazyEights(state: GameState, cardId: string): GameState {
  if (state.id !== 'crazy-eights' || state.phase !== 'play') return state;
  const card = state.players[state.current]?.hand.find((item) => key(item) === cardId);
  if (!card || !legalCrazyEightsCards(state).some((item) => key(item) === cardId))
    return state;
  const current = state.current;
  const players = state.players.map((player, index) =>
    index === current
      ? { ...player, hand: player.hand.filter((item) => key(item) !== cardId) }
      : player,
  );
  const next: GameState = {
    ...state,
    players,
    discard: [...state.discard, card],
    selectedKeys: [],
    crazySuit: card.rank === 8 ? null : card.suit,
    crazyPasses: 0,
    moves: state.moves + 1,
  };
  if (players[current].hand.length === 0) return finishCrazyEightsRound(next, current);
  if (card.rank === 8) return { ...next, phase: 'declare' };
  return { ...next, current: (current + 1) % players.length };
}

export function chooseCrazyEightsSuit(state: GameState, suit: Suit): GameState {
  if (state.id !== 'crazy-eights' || state.phase !== 'declare') return state;
  return {
    ...state,
    crazySuit: suit,
    phase: 'play',
    current: (state.current + 1) % state.players.length,
    moves: state.moves + 1,
  };
}

export function drawCrazyEights(state: GameState): GameState {
  if (state.id !== 'crazy-eights' || state.phase !== 'play' || legalCrazyEightsCards(state).length)
    return state;
  const stock = [...state.stock];
  if (stock.length === 0) {
    const crazyPasses = state.crazyPasses + 1;
    if (crazyPasses >= state.players.length)
      return finishBlockedCrazyEights({ ...state, crazyPasses });
    return {
      ...state,
      crazyPasses,
      current: (state.current + 1) % state.players.length,
      selectedKeys: [],
      moves: state.moves + 1,
    };
  }
  const card = stock.pop()!;
  const current = state.current;
  const players = state.players.map((player, index) =>
    index === current ? { ...player, hand: [...player.hand, card] } : player,
  );
  const next: GameState = {
    ...state,
    players,
    stock,
    selectedKeys: [],
    crazyPasses: 0,
    moves: state.moves + 1,
  };
  const canPlayDrawn =
    card.rank === 8 ||
    card.suit === state.crazySuit ||
    card.rank === state.discard.at(-1)?.rank;
  return canPlayDrawn
    ? next
    : { ...next, current: (current + 1) % players.length };
}

export function toggleCardSelection(
  state: GameState,
  card: Card,
  multiple = true,
): GameState {
  const cardId = key(card);
  const isSelected = state.selectedKeys.includes(cardId);
  const selectedKeys = multiple
    ? isSelected
      ? state.selectedKeys.filter((item) => item !== cardId)
      : [...state.selectedKeys, cardId]
    : isSelected
      ? []
      : [cardId];
  return { ...state, selectedKeys, solitaireSelected: null };
}

export function drawSolitaireStock(state: GameState): GameState {
  if (state.id !== 'solitaire' || state.phase === 'done') return state;
  if (state.stock.length === 0) {
    if (state.waste.length === 0) return state;
    return {
      ...state,
      stock: [...state.waste].reverse(),
      waste: [],
      moves: state.moves + 1,
      solitaireSelected: null,
    };
  }
  return {
    ...state,
    stock: state.stock.slice(0, -1),
    waste: [...state.waste, state.stock[state.stock.length - 1]],
    moves: state.moves + 1,
    solitaireSelected: null,
  };
}

export function selectSolitaireWaste(state: GameState): GameState {
  if (state.waste.length === 0) return state;
  const selected = state.solitaireSelected;
  if (selected) {
    const moved = moveSolitaireToFoundation(state, selected, -1);
    if (moved !== state) return moved;
  }
  return {
    ...state,
    solitaireSelected:
      selected?.source === 'waste' ? null : { source: 'waste', pile: 0, index: 0 },
  };
}

function cardFromSelection(
  state: GameState,
  selected: NonNullable<GameState['solitaireSelected']>,
): Card | undefined {
  if (selected.source === 'waste') return state.waste[state.waste.length - 1];
  if (selected.source === 'tableau')
    return state.tableau[selected.pile]?.cards[selected.index];
  return state.foundations[selected.pile]?.at(-1);
}

function removeSolitaireSelection(
  state: GameState,
  selected: NonNullable<GameState['solitaireSelected']>,
): { state: GameState; cards: Card[] } {
  if (selected.source === 'waste') {
    return {
      state: { ...state, waste: state.waste.slice(0, -1) },
      cards: [state.waste[state.waste.length - 1]],
    };
  }
  if (selected.source === 'foundation') {
    const foundations = state.foundations.map((pile, index) =>
      index === selected.pile ? pile.slice(0, -1) : pile,
    );
    return {
      state: { ...state, foundations },
      cards: [state.foundations[selected.pile].at(-1)!],
    };
  }
  const column = state.tableau[selected.pile];
  const cards = column.cards.slice(selected.index);
  const columns = state.tableau.map((item, index) => {
    if (index !== selected.pile) return item;
    const remaining = item.cards.slice(0, selected.index);
    let faceUpFrom = Math.min(item.faceUpFrom, remaining.length);
    if (remaining.length > 0 && faceUpFrom === remaining.length) faceUpFrom -= 1;
    return { cards: remaining, faceUpFrom };
  });
  return { state: { ...state, tableau: columns }, cards };
}

function canMoveToTableau(card: Card, target: Card | undefined): boolean {
  if (!target) return card.rank === 13;
  return isRed(card) !== isRed(target) && card.rank === target.rank - 1;
}

export function tapSolitaireTableau(
  state: GameState,
  pileIndex: number,
  cardIndex: number,
): GameState {
  const column = state.tableau[pileIndex];
  if (!column || cardIndex < column.faceUpFrom) return state;
  const selected = state.solitaireSelected;
  if (selected) {
    const selectedCard = cardFromSelection(state, selected);
    const targetCard = column.cards.at(-1);
    if (
      selectedCard &&
      (selected.source !== 'tableau' || selected.pile !== pileIndex)
    ) {
      if (canMoveToTableau(selectedCard!, targetCard)) {
        const removed = removeSolitaireSelection(state, selected);
        const targetColumn = removed.state.tableau[pileIndex];
        const tableau = removed.state.tableau.map((item, index) =>
          index === pileIndex
            ? { ...item, cards: [...item.cards, ...removed.cards] }
            : item,
        );
        const next = {
          ...removed.state,
          tableau,
          solitaireSelected: null,
          moves: state.moves + 1,
        };
        return checkSolitaireWin(next);
      }
    }
  }
  return {
    ...state,
    solitaireSelected: {
      source: 'tableau',
      pile: pileIndex,
      index: cardIndex,
    },
  };
}

export function tapSolitaireEmptyColumn(
  state: GameState,
  pileIndex: number,
): GameState {
  const selected = state.solitaireSelected;
  if (!selected) return state;
  const moving = cardFromSelection(state, selected);
  if (!moving || !canMoveToTableau(moving, undefined)) return state;
  const removed = removeSolitaireSelection(state, selected);
  const tableau = removed.state.tableau.map((column, index) =>
    index === pileIndex
      ? { ...column, cards: [...column.cards, ...removed.cards] }
      : column,
  );
  return checkSolitaireWin({
    ...removed.state,
    tableau,
    solitaireSelected: null,
    moves: state.moves + 1,
  });
}

function moveSolitaireToFoundation(
  state: GameState,
  selected: NonNullable<GameState['solitaireSelected']>,
  requestedFoundation: number,
): GameState {
  const card = cardFromSelection(state, selected);
  if (!card || (selected.source === 'tableau' && selected.index !== state.tableau[selected.pile].cards.length - 1))
    return state;
  const candidates =
    requestedFoundation >= 0
      ? [requestedFoundation]
      : state.foundations.map((_, index) => index);
  const foundationIndex = candidates.find((index) => {
    const pile = state.foundations[index];
    return pile.length === 0
      ? card.rank === 1
      : pile[pile.length - 1].suit === card.suit &&
          pile[pile.length - 1].rank + 1 === card.rank;
  });
  if (foundationIndex === undefined) return state;
  const removed = removeSolitaireSelection(state, selected);
  const foundations = removed.state.foundations.map((pile, index) =>
    index === foundationIndex ? [...pile, card] : pile,
  );
  return checkSolitaireWin({
    ...removed.state,
    foundations,
    solitaireSelected: null,
    moves: state.moves + 1,
  });
}

export function tapSolitaireFoundation(
  state: GameState,
  foundationIndex: number,
): GameState {
  if (state.solitaireSelected)
    return moveSolitaireToFoundation(state, state.solitaireSelected, foundationIndex);
  const wasteCard = state.waste.at(-1);
  if (wasteCard) {
    const selected = { source: 'waste' as const, pile: 0, index: 0 };
    return moveSolitaireToFoundation(state, selected, foundationIndex);
  }
  return state;
}

export function tapSolitaireAutoFoundation(state: GameState): GameState {
  if (state.solitaireSelected)
    return moveSolitaireToFoundation(state, state.solitaireSelected, -1);
  return state;
}

function checkSolitaireWin(state: GameState): GameState {
  if (state.foundations.reduce((count, pile) => count + pile.length, 0) === 52)
    return finish(state, 0, `You cleared the deck in ${state.moves} moves.`);
  return state;
}

const straightHigh = (ranks: number[]): number => {
  const values = [...new Set(ranks)].sort((a, b) => a - b);
  if (values.length !== 5) return 0;
  if (values[4] - values[0] === 4) return values[4];
  if (values.join(',') === '1,10,11,12,13') return 14;
  if (values.join(',') === '1,2,3,4,5') return 5;
  return 0;
};

export type PokerValue = { category: number; kickers: number[]; label: string };
const pokerNames = [
  'High card',
  'One pair',
  'Two pair',
  'Three of a kind',
  'Straight',
  'Flush',
  'Full house',
  'Four of a kind',
  'Straight flush',
];

export function evaluatePoker(hand: Card[]): PokerValue {
  const sorted = hand.map((card) => (card.rank === 1 ? 14 : card.rank)).sort((a, b) => b - a);
  const counts = new Map<number, number>();
  hand.forEach((card) => counts.set(card.rank, (counts.get(card.rank) ?? 0) + 1));
  const groups = [...counts.entries()].sort(
    (a, b) => b[1] - a[1] || (b[0] === 1 ? 14 : b[0]) - (a[0] === 1 ? 14 : a[0]),
  );
  const isFlush = hand.every((card) => card.suit === hand[0]?.suit);
  const straight = straightHigh(hand.map((card) => card.rank));
  let category = 0;
  let kickers = sorted;
  if (isFlush && straight) {
    category = 8;
    kickers = [straight];
  } else if (groups[0]?.[1] === 4) {
    category = 7;
    kickers = [groups[0][0] === 1 ? 14 : groups[0][0], groups[1][0] === 1 ? 14 : groups[1][0]];
  } else if (groups[0]?.[1] === 3 && groups[1]?.[1] === 2) {
    category = 6;
    kickers = [groups[0][0] === 1 ? 14 : groups[0][0], groups[1][0] === 1 ? 14 : groups[1][0]];
  } else if (isFlush) {
    category = 5;
  } else if (straight) {
    category = 4;
    kickers = [straight];
  } else if (groups[0]?.[1] === 3) {
    category = 3;
    kickers = [
      groups[0][0] === 1 ? 14 : groups[0][0],
      ...groups.slice(1).map(([rank]) => (rank === 1 ? 14 : rank)).sort((a, b) => b - a),
    ];
  } else if (groups[0]?.[1] === 2 && groups[1]?.[1] === 2) {
    category = 2;
    kickers = [
      ...groups.slice(0, 2).map(([rank]) => (rank === 1 ? 14 : rank)).sort((a, b) => b - a),
      groups[2][0] === 1 ? 14 : groups[2][0],
    ];
  } else if (groups[0]?.[1] === 2) {
    category = 1;
    kickers = [
      groups[0][0] === 1 ? 14 : groups[0][0],
      ...groups.slice(1).map(([rank]) => (rank === 1 ? 14 : rank)).sort((a, b) => b - a),
    ];
  }
  return { category, kickers, label: pokerNames[category] };
}

function comparePoker(a: Card[], b: Card[]): number {
  const av = evaluatePoker(a);
  const bv = evaluatePoker(b);
  if (av.category !== bv.category) return av.category - bv.category;
  for (let index = 0; index < Math.max(av.kickers.length, bv.kickers.length); index += 1) {
    const delta = (av.kickers[index] ?? 0) - (bv.kickers[index] ?? 0);
    if (delta !== 0) return delta;
  }
  return 0;
}

function pokerDiscardIndices(hand: Card[]): number[] {
  const groups = new Map<number, number[]>();
  hand.forEach((card, index) => {
    const group = groups.get(card.rank) ?? [];
    group.push(index);
    groups.set(card.rank, group);
  });
  const kept = [...groups.values()].filter((group) => group.length >= 2).flat();
  const candidates = hand
    .map((card, index) => ({ card, index }))
    .filter(({ index }) => !kept.includes(index))
    .sort((a, b) => {
      const rankA = a.card.rank === 1 ? 14 : a.card.rank;
      const rankB = b.card.rank === 1 ? 14 : b.card.rank;
      return rankA - rankB;
    });
  return candidates.slice(0, 3).map(({ index }) => index);
}

export function exchangePoker(
  state: GameState,
  discardKeys: string[],
  playerIndex = state.current,
): GameState {
  if (state.id !== 'poker' || state.phase !== 'play') return state;
  const player = state.players[playerIndex];
  if (!player) return state;
  const discardSet = new Set(discardKeys);
  const kept = player.hand.filter((card) => !discardSet.has(key(card)));
  const count = player.hand.length - kept.length;
  if (count > 3) return state;
  const stock = [...state.stock];
  const replacements: Card[] = [];
  for (let i = 0; i < count && stock.length > 0; i += 1) replacements.push(stock.pop()!);
  const players = state.players.map((item, index) =>
    index === playerIndex ? { ...item, hand: [...kept, ...replacements] } : item,
  );
  const next = {
    ...state,
    players,
    stock,
    selectedKeys: [],
    moves: state.moves + 1,
    current: state.current + 1,
  };
  if (next.current >= players.length) {
    const best = players.reduce(
      (winner, item, index) =>
        comparePoker(item.hand, players[winner].hand) > 0 ? index : winner,
      0,
    );
    const value = evaluatePoker(players[best].hand);
    return finish(next, best, `${players[best].name} wins with ${value.label}.`);
  }
  return next;
}

function isMeld(cards: Card[]): boolean {
  if (cards.length < 3) return false;
  if (cards.every((card) => card.rank === cards[0].rank)) return true;
  const sorted = [...cards].sort(rankSort);
  return (
    sorted.every((card) => card.suit === sorted[0].suit) &&
    sorted.every((card, index) => index === 0 || card.rank === sorted[index - 1].rank + 1)
  );
}

function findMelds(hand: Card[]): Card[][] {
  const remaining = [...hand];
  const melds: Card[][] = [];
  const rankGroups = new Map<number, Card[]>();
  remaining.forEach((card) => {
    const group = rankGroups.get(card.rank) ?? [];
    group.push(card);
    rankGroups.set(card.rank, group);
  });
  for (const group of rankGroups.values()) {
    if (group.length >= 3) {
      const meld = group.slice(0, 4);
      melds.push(meld);
      meld.forEach((card) => remaining.splice(remaining.findIndex((item) => key(item) === key(card)), 1));
    }
  }
  for (const suit of suits) {
    const suited = remaining.filter((card) => card.suit === suit).sort(rankSort);
    let run: Card[] = [];
    for (const card of suited) {
      if (run.length === 0 || card.rank === run[run.length - 1].rank + 1) {
        run.push(card);
      } else {
        if (run.length >= 3) melds.push(run);
        run = [card];
      }
    }
    if (run.length >= 3) melds.push(run);
  }
  return melds;
}

export function drawRummy(state: GameState, fromDiscard: boolean): GameState {
  if (state.id !== 'rummy' || state.phase !== 'draw') return state;
  let stock = [...state.stock];
  let discard = [...state.discard];
  let card: Card | undefined;
  if (fromDiscard && discard.length > 0) {
    card = discard.pop();
  } else {
    if (stock.length === 0 && discard.length > 1) {
      const top = discard.pop()!;
      stock = discard;
      discard = [top];
    }
    card = stock.pop();
  }
  if (!card) return finish(state, -1, 'No cards remain. The round is a draw.');
  const players = state.players.map((player, index) =>
    index === state.current ? { ...player, hand: [...player.hand, card!] } : player,
  );
  return {
    ...state,
    stock,
    discard,
    players,
    phase: 'play',
    selectedKeys: [],
    moves: state.moves + 1,
  };
}

export function layRummyMeld(state: GameState): GameState {
  if (state.id !== 'rummy' || state.phase !== 'play') return state;
  const player = state.players[state.current];
  const selected = new Set(state.selectedKeys);
  const cards = player.hand.filter((card) => selected.has(key(card)));
  if (!isMeld(cards)) return state;
  const hand = player.hand.filter((card) => !selected.has(key(card)));
  const melds = [...state.melds, cards];
  const players = state.players.map((item, index) =>
    index === state.current ? { ...item, hand } : item,
  );
  if (hand.length === 0)
    return finish({ ...state, players, melds, selectedKeys: [], moves: state.moves + 1 }, state.current, `${player.name} laid down every card.`);
  return { ...state, players, melds, selectedKeys: [], moves: state.moves + 1 };
}

export function discardRummy(state: GameState): GameState {
  if (state.id !== 'rummy' || state.phase !== 'play' || state.selectedKeys.length !== 1)
    return state;
  const cardId = state.selectedKeys[0];
  const player = state.players[state.current];
  const card = player.hand.find((item) => key(item) === cardId);
  if (!card) return state;
  const hand = player.hand.filter((item) => key(item) !== cardId);
  const discard = [...state.discard, card];
  const players = state.players.map((item, index) =>
    index === state.current ? { ...item, hand } : item,
  );
  if (hand.length === 0)
    return finish({ ...state, players, discard, selectedKeys: [], moves: state.moves + 1 }, state.current, `${player.name} emptied their hand.`);
  return {
    ...state,
    players,
    discard,
    selectedKeys: [],
    current: (state.current + 1) % players.length,
    phase: 'draw',
    moves: state.moves + 1,
  };
}

export function setSpadesBid(state: GameState, bid: number): GameState {
  if (state.id !== 'spades' || state.phase !== 'bid') return state;
  const players = state.players.map((player, index) =>
    index === state.current ? { ...player, bid } : player,
  );
  const nextPlayer = state.current + 1;
  if (nextPlayer < players.length)
    return { ...state, players, current: nextPlayer, selectedKeys: [] };
  return {
    ...state,
    players,
    current: 0,
    phase: 'trick',
    trick: [],
    leadSuit: null,
    selectedKeys: [],
  };
}

export function legalTrickCards(state: GameState): Card[] {
  const hand = state.players[state.current]?.hand ?? [];
  if (state.id !== 'hearts' && state.id !== 'spades') return hand;
  if (state.trick.length > 0) {
    const ledSuit = state.trick[0].card.suit;
    const following = hand.filter((card) => card.suit === ledSuit);
    if (following.length > 0) return following;
    if (
      state.id === 'hearts' &&
      state.players.every((player) => player.tricks === 0)
    ) {
      const noPoints = hand.filter(
        (card) => card.suit !== 'H' && !(card.suit === 'S' && card.rank === 12),
      );
      if (noPoints.length > 0) return noPoints;
    }
    return hand;
  }
  if (state.id === 'hearts' && state.moves === 0) {
    const twoClubs = hand.find((card) => card.suit === 'C' && card.rank === 2);
    if (twoClubs) return [twoClubs];
  }
  if (state.id === 'hearts' && !state.heartsBroken) {
    const nonHearts = hand.filter((card) => card.suit !== 'H');
    if (nonHearts.length > 0) return nonHearts;
  }
  return hand;
}

function trickWinner(trick: TrickPlay[], game: GameId): number {
  const lead = trick[0].card.suit;
  const candidate = trick.filter((play) =>
    game === 'spades'
      ? play.card.suit === 'S' || play.card.suit === lead
      : play.card.suit === lead,
  );
  return candidate.reduce((best, play) => {
    const value = play.card.rank === 1 ? 14 : play.card.rank;
    const bestValue = best.card.rank === 1 ? 14 : best.card.rank;
    if (game === 'spades' && play.card.suit === 'S' && best.card.suit !== 'S')
      return play;
    if (game === 'spades' && play.card.suit !== 'S' && best.card.suit === 'S')
      return best;
    return value > bestValue ? play : best;
  }).player;
}

export function playTrickCard(state: GameState, cardId: string): GameState {
  if (state.phase !== 'trick' || (state.id !== 'hearts' && state.id !== 'spades'))
    return state;
  const card = state.players[state.current].hand.find((item) => key(item) === cardId);
  if (!card || !legalTrickCards(state).some((item) => key(item) === cardId)) return state;
  const playerIndex = state.current;
  const players = state.players.map((player, index) =>
    index === playerIndex
      ? { ...player, hand: player.hand.filter((item) => key(item) !== cardId) }
      : player,
  );
  const trick = [...state.trick, { player: playerIndex, card }];
  const heartsBroken = state.heartsBroken || card.suit === 'H';
  if (trick.length < 4)
    return {
      ...state,
      players,
      trick,
      selectedKeys: [],
      current: (playerIndex + 1) % 4,
      leadSuit: trick[0].card.suit,
      heartsBroken,
      moves: state.moves + 1,
    };

  const winnerIndex = trickWinner(trick, state.id);
  const winningPlayer = players[winnerIndex];
  const firstTrick = state.players.every((player) => player.tricks === 0);
  const pointTotal =
    state.id === 'hearts' && !firstTrick
      ? trick.reduce(
          (total, play) =>
            total + (play.card.suit === 'H' ? 1 : 0) +
            (play.card.suit === 'S' && play.card.rank === 12 ? 13 : 0),
          0,
        )
      : 0;
  const updatedPlayers = players.map((player, index) => {
    if (index !== winnerIndex) return player;
    return {
      ...player,
      tricks: player.tricks + 1,
      score: player.score + pointTotal,
    };
  });
  const completedTricks = updatedPlayers.reduce((count, player) => count + player.tricks, 0);
  const next: GameState = {
    ...state,
    players: updatedPlayers,
    trick: [],
    selectedKeys: [],
    current: winnerIndex,
    leadSuit: null,
    heartsBroken,
    moves: state.moves + 1,
  };
  if (completedTricks < 13) return next;

  if (state.id === 'hearts') {
    const moonShooter = updatedPlayers.findIndex((player) => player.score === 26);
    const finalPlayers = updatedPlayers.map((player, index) => ({
      ...player,
      score: moonShooter >= 0 ? (index === moonShooter ? 0 : 26) : player.score,
    }));
    const winner = finalPlayers.reduce(
      (best, player, index) =>
        player.score < finalPlayers[best].score ? index : best,
      0,
    );
    return finish(
      { ...next, players: finalPlayers },
      winner,
      moonShooter >= 0
        ? `${finalPlayers[moonShooter].name} shot the moon.`
        : `${finalPlayers[winner].name} took the fewest points.`,
    );
  }

  const teamTricks = [
    updatedPlayers[0].tricks + updatedPlayers[2].tricks,
    updatedPlayers[1].tricks + updatedPlayers[3].tricks,
  ];
  const teamScores = [0, 1].map((team) => {
    const members = updatedPlayers.filter((_, index) => index % 2 === team);
    const contract = members.reduce(
      (total, player) => total + (player.bid > 0 ? player.bid : 0),
      0,
    );
    const contractScore =
      contract === 0
        ? 0
        : teamTricks[team] >= contract
          ? contract * 10 + (teamTricks[team] - contract)
          : -contract * 10;
    const nilScore = members.reduce(
      (total, player) =>
        total +
        (player.bid === 0 ? (player.tricks === 0 ? 100 : -100) : 0),
      0,
    );
    return contractScore + nilScore;
  });
  const finalPlayers = updatedPlayers.map((player, index) => ({
    ...player,
    score: teamScores[index % 2],
  }));
  const winningTeam = teamScores[0] >= teamScores[1] ? 0 : 1;
  return finish(
    { ...next, players: finalPlayers },
    winningTeam,
    `Team ${winningTeam + 1} scored ${teamScores[winningTeam]} points.`,
  );
}

export function playBundleCard(state: GameState, cardId: string): GameState {
  if (state.id !== 'bundles' || state.phase !== 'play') return state;
  const player = state.players[state.current];
  const card = player.hand.find((item) => key(item) === cardId);
  if (!card) return state;
  const players = state.players.map((item, index) =>
    index === state.current
      ? { ...item, hand: item.hand.filter((handCard) => key(handCard) !== cardId) }
      : item,
  );
  const centerMatches = state.center.filter((item) => item.rank === card.rank);
  let center = [...state.center];
  let lastCapture = state.lastCapture;
  if (centerMatches.length > 0) {
    center = center.filter((item) => item.rank !== card.rank);
    players[state.current].bundle.push(...centerMatches, card);
    lastCapture = state.current;
  } else {
    const stolenIndex = players.findIndex(
      (item, index) =>
        index !== state.current && item.bundle.at(-1)?.rank === card.rank,
    );
    if (stolenIndex >= 0) {
      const stolen = players[stolenIndex].bundle;
      players[state.current].bundle.push(...stolen, card);
      players[stolenIndex].bundle = [];
      lastCapture = state.current;
    } else {
      center = [...center, card];
    }
  }
  const moves = state.moves + 1;
  const handsEmpty = players.every((item) => item.hand.length === 0);
  if (handsEmpty && state.stock.length > 0) {
    const stock = [...state.stock];
    const nextPlayers = players.map((item) => {
      const dealt = stock.splice(-Math.min(4, stock.length));
      return { ...item, hand: [...item.hand, ...dealt] };
    });
    return {
      ...state,
      players: nextPlayers,
      stock,
      center,
      selectedKeys: [],
      current: 0,
      lastCapture,
      moves,
    };
  }
  if (handsEmpty && state.stock.length === 0) {
    if (lastCapture >= 0 && center.length > 0) {
      players[lastCapture].bundle.push(...center);
      center = [];
    }
    const winner = players.reduce(
      (best, item, index) =>
        item.bundle.length > players[best].bundle.length ? index : best,
      0,
    );
    return finish(
      { ...state, players, center, lastCapture, selectedKeys: [], moves },
      winner,
      `${players[winner].name} collected the largest bundle (${players[winner].bundle.length} cards).`,
    );
  }
  return {
    ...state,
    players,
    center,
    selectedKeys: [],
    current: (state.current + 1) % players.length,
    lastCapture,
    moves,
  };
}

function chooseAiRummyDiscard(hand: Card[]): Card | undefined {
  const melds = findMelds(hand);
  const protectedKeys = new Set(melds.flat().map(key));
  const candidates = hand.filter((card) => !protectedKeys.has(key(card)));
  const links = (card: Card): number =>
    hand.filter(
      (other) =>
        key(other) !== key(card) &&
        (other.rank === card.rank ||
          (other.suit === card.suit && Math.abs(other.rank - card.rank) <= 2)),
    ).length;
  return candidates.sort(
    (a, b) => links(a) - links(b) || b.rank - a.rank,
  )[0] ?? hand.at(-1);
}

function aiBid(hand: Card[]): number {
  return hand.reduce((total, card) => {
    if (card.rank === 1) return total + 1;
    if (card.rank === 13 || (card.rank === 12 && card.suit === 'S')) return total + 1;
    if (card.suit === 'S' && card.rank >= 10) return total + 0.5;
    return total;
  }, 0) | 0;
}

function aiTrickCard(state: GameState): Card | undefined {
  const legal = legalTrickCards(state);
  if (legal.length === 0) return undefined;
  if (state.id === 'hearts') return [...legal].sort(rankSort)[0];
  const partner = state.trick.find((play) => play.player === (state.current + 2) % 4);
  if (partner && state.trick.length > 0) return [...legal].sort(rankSort)[0];
  return [...legal].sort((a, b) => {
    const av = a.rank === 1 ? 14 : a.rank;
    const bv = b.rank === 1 ? 14 : b.rank;
    return av - bv;
  })[0];
}

function aiCrazyEightsCard(state: GameState): Card | undefined {
  const legal = legalCrazyEightsCards(state);
  const hand = state.players[state.current].hand;
  const suitCounts = suits.reduce(
    (counts, suit) => ({
      ...counts,
      [suit]: hand.filter((card) => card.suit === suit && card.rank !== 8).length,
    }),
    {} as Record<Suit, number>,
  );
  return [...legal].sort(
    (a, b) =>
      Number(a.rank === 8) - Number(b.rank === 8) ||
      suitCounts[b.suit] - suitCounts[a.suit] ||
      crazyEightsCardValue(b) - crazyEightsCardValue(a),
  )[0];
}

function advanceAi(state: GameState): GameState {
  if (state.phase === 'done' || state.current === 0) return state;
  if (state.id === 'blackjack') {
    const dealer = state.players[1];
    if (blackjackTotal(dealer.hand) >= 17 || state.stock.length === 0)
      return finishBlackjack(state);
    const card = state.stock.at(-1)!;
    const players = state.players.map((player, index) =>
      index === 1 ? { ...player, hand: [...player.hand, card] } : player,
    );
    const next = {
      ...state,
      players,
      stock: state.stock.slice(0, -1),
      moves: state.moves + 1,
    };
    return blackjackTotal(players[1].hand) > 21 ? finishBlackjack(next) : next;
  }
  if (state.id === 'crazy-eights') {
    if (state.phase === 'declare') {
      const hand = state.players[state.current].hand;
      const chosenSuit = suits.reduce((best, suit) => {
        const count = hand.filter((card) => card.suit === suit && card.rank !== 8).length;
        const bestCount = hand.filter((card) => card.suit === best && card.rank !== 8).length;
        return count > bestCount ? suit : best;
      }, 'S' as Suit);
      return chooseCrazyEightsSuit(state, chosenSuit);
    }
    const card = aiCrazyEightsCard(state);
    return card
      ? playCrazyEights(state, key(card))
      : drawCrazyEights(state);
  }
  if (state.id === 'poker' && state.phase === 'play') {
    const indices = pokerDiscardIndices(state.players[state.current].hand);
    const discarded = indices.map((index) => state.players[state.current].hand[index]);
    return exchangePoker(state, discarded.map(key));
  }
  if (state.id === 'rummy') {
    if (state.phase === 'draw') {
      const hand = state.players[state.current].hand;
      const top = state.discard.at(-1);
      const takeDiscard =
        !!top &&
        hand.some(
          (card) =>
            card.rank === top.rank ||
            (card.suit === top.suit && Math.abs(card.rank - top.rank) <= 2),
        );
      return drawRummy(state, takeDiscard);
    }
    if (state.phase === 'play') {
      const melds = findMelds(state.players[state.current].hand);
      let next = state;
      for (const meld of melds) {
        next = {
          ...next,
          selectedKeys: meld.map(key),
        };
        next = layRummyMeld(next);
        if (next.phase === 'done') return next;
      }
      const discard = chooseAiRummyDiscard(next.players[next.current].hand);
      return discard ? discardRummy({ ...next, selectedKeys: [key(discard)] }) : next;
    }
  }
  if (state.id === 'spades' && state.phase === 'bid') {
    return setSpadesBid(state, aiBid(state.players[state.current].hand));
  }
  if ((state.id === 'hearts' || state.id === 'spades') && state.phase === 'trick') {
    const card = aiTrickCard(state);
    return card ? playTrickCard(state, key(card)) : state;
  }
  if (state.id === 'bundles' && state.phase === 'play') {
    const hand = state.players[state.current].hand;
    const card =
      hand.find((item) => state.center.some((tableCard) => tableCard.rank === item.rank)) ??
      hand.find((item) =>
        state.players.some(
          (player, index) =>
            index !== state.current && player.bundle.at(-1)?.rank === item.rank,
        ),
      ) ??
      [...hand].sort(rankSort)[0];
    return card ? playBundleCard(state, key(card)) : state;
  }
  return state;
}

export function playAiTurn(state: GameState): GameState {
  let next = state;
  let count = 0;
  while (
    next.phase !== 'done' &&
    next.current !== 0 &&
    next.mode === 'ai' &&
    count < 5
  ) {
    const before = next;
    next = advanceAi(next);
    if (next === before) break;
    count += 1;
  }
  return next;
}

export function validRummyMeldSelection(state: GameState): boolean {
  const selected = new Set(state.selectedKeys);
  return isMeld(state.players[state.current].hand.filter((card) => selected.has(key(card))));
}

export function solitaireSelectionCard(state: GameState): Card | undefined {
  return state.solitaireSelected ? cardFromSelection(state, state.solitaireSelected) : undefined;
}
