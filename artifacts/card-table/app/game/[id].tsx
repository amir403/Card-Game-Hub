import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import {
  Card,
  blackjackHit,
  blackjackStand,
  blackjackTotal,
  cardKey,
  catalog,
  chooseCrazyEightsSuit,
  drawCrazyEights,
  drawSolitaireStock,
  drawRummy,
  discardRummy,
  exchangePoker,
  evaluatePoker,
  GameId,
  GameMode,
  GameState,
  isRed,
  legalCrazyEightsCards,
  layRummyMeld,
  legalTrickCards,
  newGame,
  playAiTurn,
  playBundleCard,
  playCrazyEights,
  playTrickCard,
  rankLabel,
  selectSolitaireWaste,
  setSpadesBid,
  suitGlyph,
  tapSolitaireAutoFoundation,
  tapSolitaireEmptyColumn,
  tapSolitaireFoundation,
  tapSolitaireTableau,
  toggleCardSelection,
  validRummyMeldSelection,
} from '@/src/game-engine';

const ACTIVE_KEY = '@card-table:last-game';
const gameStorageKey = (id: GameId, mode: GameMode) =>
  `@card-table:save:${id}:${mode}`;

const rules: Record<GameId, string> = {
  solitaire:
    'Move cards in descending order, alternating red and black. Build each foundation from ace to king by suit. Turn over the stock one card at a time; tap it again when the stock is empty to recycle the waste.',
  poker:
    'Five-card draw: keep your best cards and exchange up to three. After every seat has drawn, the best five-card poker hand wins. Hand rankings run from high card up to a straight flush.',
  rummy:
    'Draw from the stock or discard pile. Select three or more cards of one rank, or a consecutive run in one suit, and lay them down. Discard one card to end your turn; empty your hand to win.',
  hearts:
    'Follow the suit that was led when possible. Hearts are worth one point each and the queen of spades is worth thirteen. The fewest points wins the hand.',
  spades:
    'Partners sit opposite: seats 1 and 3 play together, as do seats 2 and 4. Bid how many tricks your team expects to win. A bid of zero is nil. Spades are trump; make your contract to score.',
  bundles:
    'Play one card each turn. Match a card in the centre by rank to collect it into your bundle. If there is no centre match, a card matching the top of a rival’s bundle steals that whole bundle. After all cards are played, the largest bundle wins.',
  'crazy-eights':
    'Each player gets five cards. Play a card matching the top discard by suit or rank; an eight can be played on anything and lets you choose the suit. If you have no legal play, draw one card; if it still cannot be played, your turn ends. Empty your hand to win and score the points left in opponents’ hands (8 = 50, face cards = 10, ace = 1). If everyone is blocked with no cards left to draw, the lowest hand score wins.',
  blackjack:
    'Get closer to 21 than the dealer without going over. Number cards count as shown, face cards as 10, and aces as 1 or 11. Choose Hit or Stand; the dealer reveals the hidden card and draws until reaching 17. The higher total wins; equal totals are a push. A two-card 21 is blackjack.',
};

function CardFace({
  card,
  colors,
  compact = false,
  selected = false,
  faceDown = false,
  disabled = false,
  onPress,
  testID,
}: {
  card?: Card;
  colors: ReturnType<typeof useColors>;
  compact?: boolean;
  selected?: boolean;
  faceDown?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  testID?: string;
}) {
  const width = compact ? 43 : 54;
  const height = compact ? 61 : 76;
  if (faceDown) {
    return (
      <View
        style={[
          styles.card,
          styles.cardBack,
          {
            width,
            height,
            backgroundColor: colors.secondary,
            borderColor: colors.primary,
          },
        ]}
      >
        <View style={[styles.cardBackInset, { borderColor: colors.border }]}>
          <Text style={[styles.backSuit, { color: colors.primary }]}>♠</Text>
        </View>
      </View>
    );
  }
  if (!card) {
    return (
      <View
        style={[
          styles.card,
          styles.emptyCard,
          { width, height, borderColor: colors.border },
        ]}
      />
    );
  }
  const content = (
    <View
      style={[
        styles.card,
        {
          width,
          height,
          backgroundColor: colors.card,
          borderColor: selected ? colors.primary : colors.card,
          borderWidth: selected ? 2 : 1,
          transform: [{ translateY: selected ? -6 : 0 }],
        },
      ]}
    >
      <Text
        style={[
          styles.cardRank,
          compact && styles.compactRank,
          { color: isRed(card) ? colors.destructive : colors.cardForeground },
        ]}
      >
        {rankLabel(card.rank)}
      </Text>
      <Text
        style={[
          styles.cardSuit,
          compact && styles.compactSuit,
          { color: isRed(card) ? colors.destructive : colors.cardForeground },
        ]}
      >
        {suitGlyph(card.suit)}
      </Text>
      {!compact ? (
        <Text
          style={[
            styles.cardCorner,
            { color: isRed(card) ? colors.destructive : colors.cardForeground },
          ]}
        >
          {suitGlyph(card.suit)}
        </Text>
      ) : null}
    </View>
  );
  if (!onPress) return content;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${rankLabel(card.rank)} ${card.suit === 'S' ? 'spades' : card.suit === 'H' ? 'hearts' : card.suit === 'D' ? 'diamonds' : 'clubs'}`}
      accessibilityState={{ selected, disabled }}
      testID={testID}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.78 : 1 })}
    >
      {content}
    </Pressable>
  );
}

function ActionButton({
  label,
  onPress,
  colors,
  disabled = false,
  secondary = false,
  testID,
}: {
  label: string;
  onPress: () => void;
  colors: ReturnType<typeof useColors>;
  disabled?: boolean;
  secondary?: boolean;
  testID?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      testID={testID}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionButton,
        secondary
          ? {
              backgroundColor: colors.secondary,
              borderColor: colors.border,
              borderWidth: 1,
            }
          : { backgroundColor: colors.primary },
        { opacity: disabled ? 0.4 : pressed ? 0.78 : 1 },
      ]}
    >
      <Text
        style={[
          styles.actionButtonText,
          { color: secondary ? colors.foreground : colors.primaryForeground },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function SectionLabel({
  children,
  colors,
  right,
}: {
  children: React.ReactNode;
  colors: ReturnType<typeof useColors>;
  right?: string;
}) {
  return (
    <View style={styles.sectionLabelRow}>
      <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
        {children}
      </Text>
      {right ? (
        <Text style={[styles.sectionLabel, { color: colors.primary }]}>{right}</Text>
      ) : null}
    </View>
  );
}

export default function GameScreen() {
  const colors = useColors();
  const router = useRouter();
  const params = useLocalSearchParams<{
    id: string;
    mode?: string;
    fresh?: string;
    resume?: string;
  }>();
  const gameId = params.id as GameId;
  const mode: GameMode = params.mode === 'pass' ? 'pass' : 'ai';
  const meta = catalog.find((item) => item.id === gameId);
  const storageKey = useMemo(() => gameStorageKey(gameId, mode), [gameId, mode]);
  const [game, setGame] = useState<GameState | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [ready, setReady] = useState(true);
  const [showRules, setShowRules] = useState(false);

  useEffect(() => {
    let active = true;
    setLoaded(false);
    const load = async () => {
      let restored: GameState | null = null;
      if (params.resume === '1' && !params.fresh) {
        const stored = await AsyncStorage.getItem(storageKey);
        if (stored) {
          try {
            restored = JSON.parse(stored) as GameState;
          } catch {
            restored = null;
          }
        }
      }
      if (active) {
        const nextGame = restored ?? newGame(gameId, mode);
        setGame(nextGame);
        setReady(nextGame.current === 0);
        setLoaded(true);
      }
    };
    load().catch(() => {
      if (active) {
        const nextGame = newGame(gameId, mode);
        setGame(nextGame);
        setReady(nextGame.current === 0);
        setLoaded(true);
      }
    });
    return () => {
      active = false;
    };
  }, [gameId, mode, params.fresh, params.resume, storageKey]);

  useEffect(() => {
    if (game && loaded) {
      AsyncStorage.setItem(storageKey, JSON.stringify(game)).catch(() => undefined);
      AsyncStorage.setItem(ACTIVE_KEY, JSON.stringify({ id: gameId, mode })).catch(
        () => undefined,
      );
    }
  }, [game, gameId, loaded, mode, storageKey]);

  useEffect(() => {
    if (
      !game ||
      game.mode !== 'ai' ||
      game.current === 0 ||
      game.phase === 'done'
    )
      return;
    const timeout = setTimeout(() => {
      setGame((current) => (current ? playAiTurn(current) : current));
    }, 500);
    return () => clearTimeout(timeout);
  }, [game]);

  const act = useCallback((change: (state: GameState) => GameState) => {
    Haptics.selectionAsync().catch(() => undefined);
    if (!game) return;
    const next = change(game);
    if (next.current !== game.current) setReady(false);
    setGame(next);
  }, [game]);

  const restart = useCallback(() => {
    Alert.alert('Start a new game?', 'Your current hand will be replaced.', [
      { text: 'Keep playing', style: 'cancel' },
      {
        text: 'New game',
        style: 'destructive',
        onPress: () => {
          const nextGame = newGame(gameId, mode);
          setGame(nextGame);
          setReady(nextGame.current === 0);
          setShowRules(false);
        },
      },
    ]);
  }, [gameId, mode]);

  if (!meta || !game || !loaded) {
    return (
      <SafeAreaView
        style={[
          styles.safe,
          {
            backgroundColor: colors.background,
            paddingTop: Platform.OS === 'web' ? 67 : 0,
            paddingBottom: Platform.OS === 'web' ? 34 : 0,
          },
        ]}
      >
        <View style={styles.loading}>
          <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>
            Setting the table…
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const currentPlayer = game.players[game.current];
  const hand = currentPlayer?.hand ?? [];
  const passBlock =
    game.mode === 'pass' && game.current > 0 && !ready && game.phase !== 'done';
  const canLayMeld = game.id === 'rummy' && validRummyMeldSelection(game);
  const legalKeys = new Set(legalTrickCards(game).map(cardKey));
  const legalCrazyKeys = new Set(legalCrazyEightsCards(game).map(cardKey));

  const selectCard = (card: Card, multiple = true) =>
    act((state) => toggleCardSelection(state, card, multiple));
  const playTrick = () => {
    if (game.selectedKeys.length !== 1) return;
    act((state) => playTrickCard(state, state.selectedKeys[0]));
  };

  return (
    <SafeAreaView
      style={[
        styles.safe,
        {
          backgroundColor: colors.background,
          paddingTop: Platform.OS === 'web' ? 67 : 0,
          paddingBottom: Platform.OS === 'web' ? 34 : 0,
        },
      ]}
    >
      <StatusBar barStyle="light-content" />
      <View style={styles.page}>
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to games"
            testID="back-to-games"
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.iconButton,
              { borderColor: colors.border, opacity: pressed ? 0.65 : 1 },
            ]}
          >
            <Ionicons name="arrow-back" size={20} color={colors.foreground} />
          </Pressable>
          <View style={styles.headerTitleWrap}>
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>
              {meta.title}
            </Text>
            <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
              {game.id === 'solitaire'
                ? 'SOLO KLONDIKE'
                : game.mode === 'ai'
                  ? 'AGAINST THE COMPUTER'
                  : 'PASS & PLAY'}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Show rules"
            testID="show-rules"
            onPress={() => setShowRules((shown) => !shown)}
            style={({ pressed }) => [
              styles.iconButton,
              {
                borderColor: showRules ? colors.primary : colors.border,
                opacity: pressed ? 0.65 : 1,
              },
            ]}
          >
            <Ionicons name="help" size={20} color={colors.primary} />
          </Pressable>
        </View>

        {showRules ? (
          <View
            style={[
              styles.rulesPanel,
              { backgroundColor: colors.secondary, borderColor: colors.border },
            ]}
          >
            <View style={styles.rulesHeading}>
              <Text style={[styles.rulesTitle, { color: colors.foreground }]}>
                {meta.subtitle} rules
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close rules"
                onPress={() => setShowRules(false)}
              >
                <Ionicons name="close" size={19} color={colors.mutedForeground} />
              </Pressable>
            </View>
            <Text style={[styles.rulesText, { color: colors.mutedForeground }]}>
              {rules[game.id]}
            </Text>
            {game.id === 'bundles' ? (
              <Text style={[styles.sourceNote, { color: colors.mutedForeground }]}>
                Using the standard 52-card, 2–4 player rules for Stealing Bundles.
              </Text>
            ) : null}
          </View>
        ) : null}

        {game.phase === 'done' ? (
          <View
            style={[
              styles.resultPanel,
              { backgroundColor: colors.secondary, borderColor: colors.border },
            ]}
          >
            <View style={[styles.resultIcon, { backgroundColor: colors.muted }]}>
              <Ionicons
                name={game.winner === 0 || game.winner === -1 ? 'trophy' : 'sparkles'}
                size={23}
                color={colors.primary}
              />
            </View>
            <Text style={[styles.resultEyebrow, { color: colors.primary }]}>
              {game.winner === 0 ? 'HAND COMPLETE' : game.winner === -1 ? 'ROUND COMPLETE' : 'TABLE COMPLETE'}
            </Text>
            <Text style={[styles.resultText, { color: colors.foreground }]}>
              {game.result}
            </Text>
            <ActionButton
              label="Deal again"
              onPress={() => {
                const nextGame = newGame(gameId, mode);
                setGame(nextGame);
                setReady(nextGame.current === 0);
              }}
              colors={colors}
              testID="deal-again"
            />
          </View>
        ) : (
          <ScrollView
            style={styles.boardScroll}
            contentContainerStyle={styles.boardContent}
            showsVerticalScrollIndicator={false}
          >
            <View
              style={[
                styles.turnBanner,
                { backgroundColor: colors.muted, borderColor: colors.border },
              ]}
            >
              <View style={[styles.turnDot, { backgroundColor: colors.primary }]} />
              <Text style={[styles.turnText, { color: colors.foreground }]}>
                {game.id === 'solitaire'
                  ? `${game.moves} moves`
                  : `${currentPlayer?.name ?? 'Your'} turn`}
              </Text>
              <Text style={[styles.turnMeta, { color: colors.mutedForeground }]}>
                {game.id === 'solitaire'
                  ? `${game.stock.length} in stock`
                  : game.id === 'poker'
                    ? `${game.players.length} seats`
                    : game.id === 'bundles'
                      ? `${game.stock.length} undealt`
                      : game.id === 'spades' && game.phase === 'bid'
                        ? 'BIDDING'
                        : game.id === 'blackjack'
                          ? game.current === 0
                            ? 'YOUR MOVE'
                            : 'DEALER PLAYS'
                          : game.id === 'crazy-eights'
                            ? game.phase === 'declare'
                              ? 'CHOOSE A SUIT'
                              : `${game.stock.length} IN STOCK`
                        : game.id === 'rummy'
                          ? game.phase === 'draw'
                            ? 'DRAW A CARD'
                            : 'MAKE A MELD'
                          : 'ROUND 1'}
              </Text>
            </View>

            {game.id === 'solitaire' ? (
              <View style={styles.solitaireArea}>
                <View style={styles.solitaireTop}>
                  <View style={styles.stockGroup}>
                    <SectionLabel colors={colors}>STOCK</SectionLabel>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={game.stock.length ? 'Draw a card' : 'Recycle waste'}
                      testID="solitaire-stock"
                      onPress={() => act(drawSolitaireStock)}
                    >
                      {game.stock.length > 0 ? (
                        <CardFace faceDown colors={colors} compact />
                      ) : (
                        <View style={styles.recycleSlot}>
                          <Ionicons name="refresh" size={21} color={colors.mutedForeground} />
                        </View>
                      )}
                    </Pressable>
                  </View>
                  <View style={styles.wasteGroup}>
                    <SectionLabel colors={colors}>WASTE</SectionLabel>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Select top waste card"
                      testID="solitaire-waste"
                      onPress={() => act(selectSolitaireWaste)}
                    >
                      <CardFace
                        card={game.waste.at(-1)}
                        colors={colors}
                        compact
                        selected={game.solitaireSelected?.source === 'waste'}
                      />
                    </Pressable>
                  </View>
                  <View style={styles.foundations}>
                    {game.foundations.map((pile, index) => (
                      <View key={`foundation-${index}`} style={styles.foundationItem}>
                        <SectionLabel colors={colors}>{suitGlyph((['S', 'H', 'D', 'C'] as const)[index])}</SectionLabel>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Foundation ${index + 1}`}
                          testID={`solitaire-foundation-${index}`}
                          onPress={() => act((state) => tapSolitaireFoundation(state, index))}
                        >
                          <CardFace
                            card={pile.at(-1)}
                            colors={colors}
                            compact
                            selected={
                              game.solitaireSelected?.source === 'foundation' &&
                              game.solitaireSelected.pile === index
                            }
                          />
                        </Pressable>
                      </View>
                    ))}
                  </View>
                </View>
                <View style={styles.solitaireTools}>
                  <Text style={[styles.hint, { color: colors.mutedForeground }]}>
                    Select a card, then a destination
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Move selected card to a foundation"
                    testID="solitaire-auto-foundation"
                    onPress={() => act(tapSolitaireAutoFoundation)}
                    style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
                  >
                    <Text style={[styles.textLink, { color: colors.primary }]}>Auto-foundation</Text>
                  </Pressable>
                </View>
                <View style={styles.tableau}>
                  {game.tableau.map((column, columnIndex) => {
                    const height = Math.max(76, 52 + Math.max(0, column.cards.length - 1) * 19);
                    return (
                      <View
                        key={`column-${columnIndex}`}
                        style={[styles.tableauColumn, { height }]}
                      >
                        {column.cards.length === 0 ? (
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={`Empty column ${columnIndex + 1}`}
                            testID={`solitaire-empty-${columnIndex}`}
                            onPress={() => act((state) => tapSolitaireEmptyColumn(state, columnIndex))}
                          >
                            <CardFace colors={colors} />
                          </Pressable>
                        ) : (
                          column.cards.map((card, cardIndex) => {
                            const faceDown = cardIndex < column.faceUpFrom;
                            const selected =
                              game.solitaireSelected?.source === 'tableau' &&
                              game.solitaireSelected.pile === columnIndex &&
                              cardIndex === game.solitaireSelected.index;
                            return (
                              <View
                                key={cardKey(card)}
                                style={[styles.tableauCard, { top: cardIndex * 19 }]}
                              >
                                <CardFace
                                  card={card}
                                  faceDown={faceDown}
                                  colors={colors}
                                  compact
                                  selected={selected}
                                  onPress={
                                    faceDown
                                      ? undefined
                                      : () =>
                                          act((state) =>
                                            tapSolitaireTableau(state, columnIndex, cardIndex),
                                          )
                                  }
                                  testID={`solitaire-card-${columnIndex}-${cardIndex}`}
                                />
                              </View>
                            );
                          })
                        )}
                      </View>
                    );
                  })}
                </View>
              </View>
            ) : (
              <>
                {game.id === 'poker' ? (
                  <View style={styles.contentBlock}>
                    <SectionLabel colors={colors} right="FIVE-CARD DRAW">
                      THE TABLE
                    </SectionLabel>
                    <View style={styles.seatStrip}>
                      {game.players.map((player, index) => (
                        <View
                          key={player.name}
                          style={[
                            styles.seatPill,
                            {
                              borderColor:
                                index === game.current ? colors.primary : colors.border,
                              backgroundColor: colors.secondary,
                            },
                          ]}
                        >
                          <View
                            style={[
                              styles.seatDot,
                              {
                                backgroundColor:
                                  index === game.current ? colors.primary : colors.border,
                              },
                            ]}
                          />
                          <Text
                            style={[
                              styles.seatName,
                              { color: index === game.current ? colors.primary : colors.foreground },
                            ]}
                          >
                            {player.name}
                          </Text>
                          <Text style={[styles.seatCount, { color: colors.mutedForeground }]}>
                            {player.hand.length}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                ) : null}

                {game.id === 'rummy' ? (
                  <View style={styles.contentBlock}>
                    <SectionLabel colors={colors} right={`${game.stock.length} IN STOCK`}>
                      DISCARD
                    </SectionLabel>
                    <View style={styles.rummyPiles}>
                      <View style={styles.pileWrap}>
                        <Text style={[styles.tinyLabel, { color: colors.mutedForeground }]}>DRAW PILE</Text>
                        <Pressable
                          accessibilityRole="button"
                          testID="rummy-draw-stock"
                          disabled={game.phase !== 'draw'}
                          onPress={() => act((state) => drawRummy(state, false))}
                        >
                          {game.stock.length ? (
                            <CardFace faceDown colors={colors} compact />
                          ) : (
                            <CardFace colors={colors} compact />
                          )}
                        </Pressable>
                      </View>
                      <View style={styles.pileWrap}>
                        <Text style={[styles.tinyLabel, { color: colors.mutedForeground }]}>TOP DISCARD</Text>
                        <Pressable
                          accessibilityRole="button"
                          testID="rummy-draw-discard"
                          disabled={game.phase !== 'draw' || game.discard.length === 0}
                          onPress={() => act((state) => drawRummy(state, true))}
                        >
                          <CardFace card={game.discard.at(-1)} colors={colors} compact />
                        </Pressable>
                      </View>
                      <View style={styles.rummyInstruction}>
                        <Text style={[styles.rummyStage, { color: colors.primary }]}>
                          {game.phase === 'draw' ? 'Draw one card' : 'Build a meld'}
                        </Text>
                        <Text style={[styles.hint, { color: colors.mutedForeground }]}>
                          {game.phase === 'play' ? 'Select 3+ matching cards' : 'Choose a pile'}
                        </Text>
                      </View>
                    </View>
                    {game.melds.length > 0 ? (
                      <View style={styles.meldRow}>
                        <Text style={[styles.tinyLabel, { color: colors.mutedForeground }]}>MELDS</Text>
                        {game.melds.map((meld, index) => (
                          <View
                            key={`meld-${index}`}
                            style={[styles.meldPill, { borderColor: colors.border }]}
                          >
                            <Text style={[styles.meldText, { color: colors.foreground }]}>
                              {meld.map((card) => `${rankLabel(card.rank)}${suitGlyph(card.suit)}`).join('  ')}
                            </Text>
                          </View>
                        ))}
                      </View>
                    ) : null}
                  </View>
                ) : null}

                {game.id === 'bundles' ? (
                  <View style={styles.contentBlock}>
                    <SectionLabel colors={colors} right="MATCH THE RANK">
                      CENTRE TABLE
                    </SectionLabel>
                    <View
                      style={[
                        styles.centerTable,
                        { backgroundColor: colors.muted, borderColor: colors.border },
                      ]}
                    >
                      {game.center.length > 0 ? (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                          <View style={styles.cardRow}>
                            {game.center.map((card) => (
                              <CardFace key={cardKey(card)} card={card} colors={colors} compact />
                            ))}
                          </View>
                        </ScrollView>
                      ) : (
                        <Text style={[styles.hint, { color: colors.mutedForeground }]}>
                          No cards in the centre
                        </Text>
                      )}
                    </View>
                    <View style={styles.bundleSeats}>
                      {game.players.map((player, index) => {
                        const top = player.bundle.at(-1);
                        return (
                          <View
                            key={player.name}
                            style={[
                              styles.bundleSeat,
                              {
                                borderColor: index === game.current ? colors.primary : colors.border,
                                backgroundColor: colors.secondary,
                              },
                            ]}
                          >
                            <View style={styles.bundleSeatHeading}>
                              <Text
                                style={[
                                  styles.bundleName,
                                  { color: index === game.current ? colors.primary : colors.foreground },
                                ]}
                              >
                                {player.name}
                              </Text>
                              <Text style={[styles.bundleCount, { color: colors.mutedForeground }]}>
                                {player.bundle.length} cards
                              </Text>
                            </View>
                            {top ? (
                              <View style={styles.bundleTopCard}>
                                <CardFace card={top} colors={colors} compact />
                              </View>
                            ) : (
                              <Text style={[styles.emptyBundle, { color: colors.mutedForeground }]}>
                                Empty bundle
                              </Text>
                            )}
                          </View>
                        );
                      })}
                    </View>
                  </View>
                ) : null}

                {game.id === 'crazy-eights' ? (
                  <View style={styles.contentBlock}>
                    <SectionLabel
                      colors={colors}
                      right={`${game.stock.length} IN STOCK`}
                    >
                      TOP DISCARD · SUIT {game.crazySuit ? suitGlyph(game.crazySuit) : '—'}
                    </SectionLabel>
                    <View
                      style={[
                        styles.centerTable,
                        { backgroundColor: colors.muted, borderColor: colors.border },
                      ]}
                    >
                      <View style={styles.cardRow}>
                        <CardFace card={game.discard.at(-1)} colors={colors} compact />
                        <Text style={[styles.hint, { color: colors.mutedForeground }]}>
                          Match rank or chosen suit
                        </Text>
                      </View>
                    </View>
                    <View style={[styles.scoreGrid, { marginTop: 10 }]}>
                      {game.players.map((player, index) => (
                        <View
                          key={player.name}
                          style={[
                            styles.scoreSeat,
                            {
                              borderColor: index === game.current ? colors.primary : colors.border,
                              backgroundColor: colors.secondary,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.scoreName,
                              { color: index === game.current ? colors.primary : colors.foreground },
                            ]}
                          >
                            {player.name}
                          </Text>
                          <Text style={[styles.scoreValue, { color: colors.foreground }]}>
                            {player.hand.length} cards · {player.score} pts
                          </Text>
                        </View>
                      ))}
                    </View>
                    {game.phase === 'declare' ? (
                      <View style={styles.actionRow}>
                        {(['S', 'H', 'D', 'C'] as const).map((suit) => (
                          <ActionButton
                            key={suit}
                            label={suitGlyph(suit)}
                            onPress={() => act((state) => chooseCrazyEightsSuit(state, suit))}
                            colors={colors}
                            testID={`crazy-eights-suit-${suit}`}
                          />
                        ))}
                      </View>
                    ) : null}
                  </View>
                ) : null}

                {game.id === 'blackjack' ? (
                  <View style={styles.contentBlock}>
                    <SectionLabel colors={colors} right="DEALER STANDS ON 17">
                      THE TABLE
                    </SectionLabel>
                    <View
                      style={[
                        styles.blackjackTable,
                        { backgroundColor: colors.secondary, borderColor: colors.border },
                      ]}
                    >
                      <View style={styles.blackjackHand}>
                        <Text style={[styles.scoreName, { color: colors.foreground }]}>
                          Dealer
                        </Text>
                        <View style={styles.cardRow}>
                          {game.players[1].hand.map((card, index) => (
                            <CardFace
                              key={cardKey(card)}
                              card={card}
                              faceDown={index > 0 && !game.dealerRevealed}
                              colors={colors}
                              compact
                            />
                          ))}
                        </View>
                        <Text style={[styles.hint, { color: colors.mutedForeground }]}>
                          {game.dealerRevealed
                            ? `Total ${blackjackTotal(game.players[1].hand)}`
                            : `Showing ${blackjackTotal([game.players[1].hand[0]])}`}
                        </Text>
                      </View>
                      <View style={[styles.blackjackDivider, { backgroundColor: colors.border }]} />
                      <View style={styles.blackjackHand}>
                        <Text style={[styles.scoreName, { color: colors.foreground }]}>
                          You
                        </Text>
                        <View style={styles.cardRow}>
                          {game.players[0].hand.map((card) => (
                            <CardFace key={cardKey(card)} card={card} colors={colors} compact />
                          ))}
                        </View>
                        <Text style={[styles.hint, { color: colors.mutedForeground }]}>
                          Total {blackjackTotal(game.players[0].hand)}
                        </Text>
                      </View>
                    </View>
                    {game.phase === 'play' && game.current === 0 ? (
                      <View style={[styles.actionRow, { marginTop: 11 }]}>
                        <ActionButton
                          label="Hit"
                          onPress={() => act(blackjackHit)}
                          colors={colors}
                          testID="blackjack-hit"
                        />
                        <ActionButton
                          label="Stand"
                          onPress={() => act(blackjackStand)}
                          colors={colors}
                          secondary
                          testID="blackjack-stand"
                        />
                      </View>
                    ) : null}
                  </View>
                ) : null}

                {(game.id === 'hearts' || game.id === 'spades') ? (
                  <View style={styles.contentBlock}>
                    <SectionLabel
                      colors={colors}
                      right={
                        game.id === 'spades' && game.phase === 'bid'
                          ? 'BID'
                          : game.id === 'hearts'
                            ? 'POINTS'
                            : 'TRICKS'
                      }
                    >
                      {game.id === 'hearts' ? 'SEATS' : 'PARTNERSHIPS'}
                    </SectionLabel>
                    <View style={styles.scoreGrid}>
                      {game.players.map((player, index) => (
                        <View
                          key={player.name}
                          style={[
                            styles.scoreSeat,
                            {
                              borderColor: index === game.current ? colors.primary : colors.border,
                              backgroundColor: colors.secondary,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.scoreName,
                              { color: index === game.current ? colors.primary : colors.foreground },
                            ]}
                          >
                            {player.name}
                          </Text>
                          <Text style={[styles.scoreValue, { color: colors.foreground }]}>
                            {game.id === 'hearts'
                              ? `${player.score} pts`
                              : game.phase === 'bid'
                                ? player.bid >= 0
                                  ? `Bid ${player.bid}`
                                  : 'No bid'
                                : `${player.tricks} tricks`}
                          </Text>
                          {game.id === 'spades' && game.phase === 'trick' ? (
                            <Text style={[styles.seatCount, { color: colors.mutedForeground }]}>
                              bid {player.bid}
                            </Text>
                          ) : null}
                        </View>
                      ))}
                    </View>
                  </View>
                ) : null}

                {(game.id === 'hearts' || game.id === 'spades') &&
                game.phase === 'trick' ? (
                  <View
                    style={[
                      styles.trickTable,
                      { backgroundColor: colors.muted, borderColor: colors.border },
                    ]}
                  >
                    <Text style={[styles.tinyLabel, { color: colors.mutedForeground }]}>
                      {game.trick.length ? `TRICK ${Math.ceil((game.moves + game.trick.length) / 4)}` : 'NEXT TRICK'}
                    </Text>
                    <View style={styles.trickCards}>
                      {game.trick.length > 0 ? (
                        game.trick.map((play) => (
                          <View key={`${play.player}-${cardKey(play.card)}`} style={styles.trickCard}>
                            <Text style={[styles.trickPlayerName, { color: colors.mutedForeground }]}>
                              {game.players[play.player].name}
                            </Text>
                            <CardFace card={play.card} colors={colors} compact />
                          </View>
                        ))
                      ) : (
                        <Text style={[styles.hint, { color: colors.mutedForeground }]}>
                          {game.id === 'hearts' ? 'Lead with the two of clubs' : 'Choose a card to lead'}
                        </Text>
                      )}
                    </View>
                  </View>
                ) : null}

                {game.id === 'spades' && game.phase === 'bid' ? (
                  <View style={styles.contentBlock}>
                    <SectionLabel colors={colors} right="0–13 · 0 = NIL">
                      CHOOSE YOUR BID
                    </SectionLabel>
                    <View style={styles.bidGrid}>
                      {Array.from({ length: 14 }, (_, bid) => (
                        <Pressable
                          key={bid}
                          accessibilityRole="button"
                          testID={`spades-bid-${bid}`}
                          onPress={() => act((state) => setSpadesBid(state, bid))}
                          style={({ pressed }) => [
                            styles.bidButton,
                            {
                              backgroundColor: colors.secondary,
                              borderColor: colors.border,
                              opacity: pressed ? 0.7 : 1,
                            },
                          ]}
                        >
                          <Text style={[styles.bidText, { color: colors.foreground }]}>
                            {bid}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                ) : null}

                {game.id !== 'blackjack' ? (
                <View style={styles.handBlock}>
                  <SectionLabel
                    colors={colors}
                    right={
                      game.id === 'poker'
                        ? 'SELECT UP TO 3 TO EXCHANGE'
                        : game.id === 'rummy'
                          ? `${hand.length} CARDS`
                          : game.id === 'bundles'
                            ? `${hand.length} CARDS`
                            : game.id === 'spades'
                              ? `${hand.length} CARDS`
                              : `${hand.length} CARDS`
                    }
                  >
                    {currentPlayer?.name?.toUpperCase() ?? 'YOUR HAND'}
                  </SectionLabel>
                  <ScrollView
                    horizontal
                    contentContainerStyle={styles.handRow}
                    showsHorizontalScrollIndicator={false}
                  >
                    {hand.map((card) => {
                      const selected = game.selectedKeys.includes(cardKey(card));
                      const isTrickGame = game.id === 'hearts' || game.id === 'spades';
                      const isSelectable =
                        game.id === 'poker' ||
                        game.id === 'rummy' ||
                        game.id === 'bundles' ||
                        (game.id === 'crazy-eights' && game.phase === 'play') ||
                        (isTrickGame && game.phase === 'trick');
                      const invalidTrick =
                        isTrickGame &&
                        game.phase === 'trick' &&
                        !legalKeys.has(cardKey(card));
                      return (
                        <CardFace
                          key={cardKey(card)}
                          card={card}
                          colors={colors}
                          selected={selected}
                          disabled={!isSelectable || invalidTrick}
                          onPress={
                            !isSelectable || invalidTrick
                              ? undefined
                              : isTrickGame
                                ? () => selectCard(card, false)
                                : () => selectCard(
                                    card,
                                    game.id !== 'bundles' && game.id !== 'crazy-eights',
                                  )
                          }
                          testID={`hand-${cardKey(card)}`}
                        />
                      );
                    })}
                  </ScrollView>

                  {game.id === 'poker' ? (
                    <ActionButton
                      label={`Exchange ${game.selectedKeys.length} ${game.selectedKeys.length === 1 ? 'card' : 'cards'}`}
                      onPress={() =>
                        act((state) => exchangeSelectedPoker(state))
                      }
                      colors={colors}
                      disabled={game.selectedKeys.length > 3}
                      testID="poker-exchange"
                    />
                  ) : null}
                  {game.id === 'rummy' && game.phase === 'play' ? (
                    <View style={styles.actionRow}>
                      <ActionButton
                        label="Lay meld"
                        onPress={() => act(layRummyMeld)}
                        colors={colors}
                        disabled={!canLayMeld}
                        testID="rummy-lay-meld"
                      />
                      <ActionButton
                        label="Discard"
                        onPress={() => act(discardRummy)}
                        colors={colors}
                        secondary
                        disabled={game.selectedKeys.length !== 1}
                        testID="rummy-discard"
                      />
                    </View>
                  ) : null}
                  {game.id === 'bundles' ? (
                    <ActionButton
                      label="Play selected card"
                      onPress={() =>
                        game.selectedKeys.length === 1 &&
                        act((state) => playBundleCard(state, state.selectedKeys[0]))
                      }
                      colors={colors}
                      disabled={game.selectedKeys.length !== 1}
                      testID="bundles-play"
                    />
                  ) : null}
                  {game.id === 'crazy-eights' && game.phase === 'play' ? (
                    <View style={styles.actionRow}>
                      <ActionButton
                        label="Play selected card"
                        onPress={() =>
                          game.selectedKeys.length === 1 &&
                          act((state) => playCrazyEights(state, state.selectedKeys[0]))
                        }
                        colors={colors}
                        disabled={
                          game.selectedKeys.length !== 1 ||
                          !legalCrazyKeys.has(game.selectedKeys[0])
                        }
                        testID="crazy-eights-play"
                      />
                      <ActionButton
                        label="Draw"
                        onPress={() => act(drawCrazyEights)}
                        colors={colors}
                        secondary
                        disabled={legalCrazyKeys.size > 0}
                        testID="crazy-eights-draw"
                      />
                    </View>
                  ) : null}
                  {(game.id === 'hearts' || game.id === 'spades') &&
                  game.phase === 'trick' ? (
                    <ActionButton
                      label="Play selected card"
                      onPress={playTrick}
                      colors={colors}
                      disabled={game.selectedKeys.length !== 1}
                      testID="trick-play"
                    />
                  ) : null}
                </View>
                ) : null}
              </>
            )}
          </ScrollView>
        )}

        <View style={[styles.bottomBar, { borderTopColor: colors.border }]}>
          <Text style={[styles.bottomHint, { color: colors.mutedForeground }]}>
            {game.phase === 'done'
              ? 'Ready for another hand?'
              : game.id === 'solitaire'
                ? 'A little patience goes a long way.'
                : game.mode === 'pass'
                  ? 'One phone. Everyone gets a turn.'
                  : 'Your next move is on the table.'}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Start a new game"
            testID="new-game"
            onPress={restart}
            style={({ pressed }) => ({ opacity: pressed ? 0.55 : 1 })}
          >
            <Ionicons name="refresh" size={20} color={colors.primary} />
          </Pressable>
        </View>

        {passBlock ? (
          <View style={[styles.passOverlay, { backgroundColor: colors.background }]}>
            <View style={[styles.passIcon, { backgroundColor: colors.secondary }]}>
              <Ionicons name="phone-portrait-outline" size={28} color={colors.primary} />
            </View>
            <Text style={[styles.passEyebrow, { color: colors.primary }]}>PASS THE PHONE</Text>
            <Text style={[styles.passTitle, { color: colors.foreground }]}>
              {currentPlayer?.name}, your turn.
            </Text>
            <Text style={[styles.passCopy, { color: colors.mutedForeground }]}>
              Make sure the previous player has put the phone down before you look at your cards.
            </Text>
            <ActionButton
              label="I'm ready"
              onPress={() => setReady(true)}
              colors={colors}
              testID="pass-ready"
            />
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

function exchangeSelectedPoker(state: GameState): GameState {
  return exchangePoker(state, state.selectedKeys);
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  page: { flex: 1, paddingHorizontal: 17 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { fontSize: 14, fontWeight: '600' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 9 },
  iconButton: {
    width: 42,
    height: 42,
    borderWidth: 1,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleWrap: { flex: 1 },
  headerTitle: { fontSize: 20, fontWeight: '700', letterSpacing: -0.4 },
  headerSub: { fontSize: 9, fontWeight: '700', letterSpacing: 1.4, marginTop: 2 },
  rulesPanel: { borderWidth: 1, borderRadius: 17, padding: 15, marginBottom: 12 },
  rulesHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  rulesTitle: { fontSize: 15, fontWeight: '700' },
  rulesText: { fontSize: 13, lineHeight: 19 },
  sourceNote: { fontSize: 10, lineHeight: 15, marginTop: 9, fontStyle: 'italic' },
  boardScroll: { flex: 1 },
  boardContent: { paddingBottom: 18 },
  turnBanner: {
    minHeight: 42,
    borderWidth: 1,
    borderRadius: 13,
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 5,
    marginBottom: 17,
  },
  turnDot: { width: 7, height: 7, borderRadius: 4 },
  turnText: { flex: 1, fontSize: 12, fontWeight: '700' },
  turnMeta: { fontSize: 9, fontWeight: '700', letterSpacing: 0.7 },
  contentBlock: { marginBottom: 20 },
  sectionLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 9,
  },
  sectionLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 1.3 },
  seatStrip: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  seatPill: {
    flexDirection: 'row',
    minHeight: 33,
    paddingHorizontal: 9,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 11,
  },
  seatDot: { width: 6, height: 6, borderRadius: 4 },
  seatName: { fontSize: 10, fontWeight: '700' },
  seatCount: { fontSize: 9, fontWeight: '600' },
  rummyPiles: { flexDirection: 'row', gap: 15, alignItems: 'center' },
  pileWrap: { gap: 6 },
  tinyLabel: { fontSize: 8, fontWeight: '700', letterSpacing: 1.15 },
  rummyInstruction: { flex: 1, justifyContent: 'center', gap: 5 },
  rummyStage: { fontSize: 13, fontWeight: '700' },
  meldRow: { gap: 7, marginTop: 15 },
  meldPill: { borderWidth: 1, borderRadius: 10, padding: 8, alignSelf: 'flex-start' },
  meldText: { fontSize: 11, fontWeight: '600' },
  centerTable: {
    minHeight: 92,
    borderWidth: 1,
    borderRadius: 15,
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 12,
  },
  cardRow: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  bundleSeats: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  bundleSeat: { width: '48%', minHeight: 82, borderWidth: 1, borderRadius: 13, padding: 9 },
  bundleSeatHeading: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  bundleName: { fontSize: 10, fontWeight: '700' },
  bundleCount: { fontSize: 9 },
  bundleTopCard: { marginTop: 9, alignSelf: 'flex-start' },
  emptyBundle: { fontSize: 10, marginTop: 13 },
  scoreGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  scoreSeat: { width: '48%', borderWidth: 1, borderRadius: 13, padding: 10 },
  scoreName: { fontSize: 11, fontWeight: '700' },
  scoreValue: { fontSize: 13, fontWeight: '700', marginTop: 5 },
  blackjackTable: { borderWidth: 1, borderRadius: 15, padding: 13, gap: 12 },
  blackjackHand: { gap: 7 },
  blackjackDivider: { height: 1 },
  trickTable: { minHeight: 120, borderWidth: 1, borderRadius: 15, padding: 12, marginBottom: 20 },
  trickCards: {
    flex: 1,
    minHeight: 74,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  trickCard: { alignItems: 'center', gap: 4 },
  trickPlayerName: { fontSize: 9, fontWeight: '600' },
  bidGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  bidButton: {
    width: '12%',
    height: 39,
    borderWidth: 1,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bidText: { fontSize: 13, fontWeight: '700' },
  handBlock: { marginBottom: 8 },
  handRow: { gap: 7, paddingTop: 7, paddingHorizontal: 1, minHeight: 94 },
  actionButton: {
    minHeight: 45,
    paddingHorizontal: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  actionButtonText: { fontSize: 13, fontWeight: '700' },
  actionRow: { flexDirection: 'row', gap: 9, marginTop: 11 },
  bottomBar: {
    minHeight: 47,
    borderTopWidth: 1,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
  },
  bottomHint: { fontSize: 11, fontWeight: '500' },
  passOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 35,
    zIndex: 10,
  },
  passIcon: {
    width: 65,
    height: 65,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 21,
  },
  passEyebrow: { fontSize: 10, fontWeight: '700', letterSpacing: 1.8 },
  passTitle: { fontSize: 27, fontWeight: '700', marginTop: 8, textAlign: 'center' },
  passCopy: { fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: 11, marginBottom: 21 },
  resultPanel: {
    flex: 1,
    marginVertical: 12,
    borderWidth: 1,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  resultIcon: {
    width: 59,
    height: 59,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  resultEyebrow: { fontSize: 10, fontWeight: '700', letterSpacing: 1.7 },
  resultText: { fontSize: 19, fontWeight: '700', lineHeight: 28, textAlign: 'center', marginTop: 10, marginBottom: 22 },
  solitaireArea: { paddingBottom: 12 },
  solitaireTop: { flexDirection: 'row', alignItems: 'flex-end', gap: 9 },
  stockGroup: { gap: 7 },
  wasteGroup: { gap: 7 },
  foundations: { flexDirection: 'row', flex: 1, justifyContent: 'space-between', gap: 4 },
  foundationItem: { gap: 7, alignItems: 'center' },
  recycleSlot: {
    width: 54,
    height: 76,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  solitaireTools: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    marginBottom: 13,
  },
  hint: { fontSize: 10, fontWeight: '500' },
  textLink: { fontSize: 10, fontWeight: '700' },
  tableau: { flexDirection: 'row', justifyContent: 'space-between', gap: 2 },
  tableauColumn: { width: '13.8%', position: 'relative' },
  tableauCard: { position: 'absolute', left: 0 },
  card: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 5,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  cardBack: { padding: 4 },
  cardBackInset: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backSuit: { fontSize: 18, fontWeight: '700' },
  emptyCard: { borderStyle: 'dashed', backgroundColor: 'transparent' },
  cardRank: { fontSize: 13, lineHeight: 15, fontWeight: '700' },
  compactRank: { fontSize: 11, lineHeight: 13 },
  cardSuit: { fontSize: 18, textAlign: 'center', fontWeight: '700' },
  compactSuit: { fontSize: 15 },
  cardCorner: { fontSize: 9, textAlign: 'right', lineHeight: 10 },
});
