import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Pressable,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { catalog, GameId, GameMode } from '@/src/game-engine';

const ACTIVE_KEY = '@card-table:last-game';

type ResumeTarget = { id: GameId; mode: GameMode } | null;

export default function HomeScreen() {
  const colors = useColors();
  const router = useRouter();
  const [resume, setResume] = useState<ResumeTarget>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(ACTIVE_KEY)
      .then((value) => {
        if (value) setResume(JSON.parse(value) as ResumeTarget);
      })
      .catch(() => setResume(null))
      .finally(() => setIsReady(true));
  }, []);

  const openGame = useCallback(
    async (id: GameId, mode: GameMode, isResume = false) => {
      await AsyncStorage.setItem(ACTIVE_KEY, JSON.stringify({ id, mode }));
      router.push({
        pathname: '/game/[id]',
        params: {
          id,
          mode,
          ...(isResume ? { resume: '1' } : { fresh: `${Date.now()}` }),
        },
      });
    },
    [router],
  );

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
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topline}>
          <View style={[styles.brandMark, { borderColor: colors.border }]}>
            <Text style={[styles.brandSuit, { color: colors.primary }]}>♠</Text>
            <Text style={[styles.brandSuit, { color: colors.destructive }]}>♥</Text>
          </View>
          <Text style={[styles.eyebrow, { color: colors.mutedForeground }]}>
            YOUR PRIVATE CARD ROOM
          </Text>
        </View>

        <Text style={[styles.title, { color: colors.foreground }]}>
          Cards on the{'\n'}table.
        </Text>
        <Text style={[styles.intro, { color: colors.mutedForeground }]}>
          Six familiar games. No signal needed. Take a seat.
        </Text>

        {resume && isReady ? (
          <Pressable
            accessibilityRole="button"
            testID="continue-game"
            onPress={() => openGame(resume.id, resume.mode, true)}
            style={({ pressed }) => [
              styles.resume,
              { backgroundColor: colors.primary, opacity: pressed ? 0.86 : 1 },
            ]}
          >
            <View style={styles.resumeText}>
              <Text style={[styles.resumeEyebrow, { color: colors.primaryForeground }]}>
                PICK UP WHERE YOU LEFT OFF
              </Text>
              <Text style={[styles.resumeTitle, { color: colors.primaryForeground }]}>
                {catalog.find((game) => game.id === resume.id)?.title ?? 'Your game'}
              </Text>
            </View>
            <Ionicons name="arrow-forward" size={23} color={colors.primaryForeground} />
          </Pressable>
        ) : null}

        <View style={styles.sectionHeading}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            The collection
          </Text>
          <Text style={[styles.count, { color: colors.mutedForeground }]}>06 GAMES</Text>
        </View>

        <View style={styles.grid}>
          {catalog.map((game, index) => {
            const isSolitaire = game.id === 'solitaire';
            const markColor =
              game.mark === '♥' || game.mark === '♦'
                ? colors.destructive
                : colors.primary;
            return (
              <View
                key={game.id}
                style={[
                  styles.gameCard,
                  { backgroundColor: colors.secondary, borderColor: colors.border },
                  index === catalog.length - 1 && catalog.length % 2 === 1
                    ? styles.lastCard
                    : null,
                ]}
              >
                <View style={styles.gameCardTop}>
                  <View
                    style={[
                      styles.gameMark,
                      { backgroundColor: colors.muted, borderColor: colors.border },
                    ]}
                  >
                    <Text style={[styles.markText, { color: markColor }]}>{game.mark}</Text>
                  </View>
                  <Text style={[styles.players, { color: colors.mutedForeground }]}>
                    {game.players}
                  </Text>
                </View>
                <Text style={[styles.gameTitle, { color: colors.foreground }]}>
                  {game.title}
                </Text>
                <Text style={[styles.subtitle, { color: colors.primary }]}>
                  {game.subtitle}
                </Text>
                <Text style={[styles.description, { color: colors.mutedForeground }]}>
                  {game.description}
                </Text>
                <View style={styles.actions}>
                  <Pressable
                    accessibilityRole="button"
                    testID={`play-${game.id}-ai`}
                    onPress={() => openGame(game.id, 'ai')}
                    style={({ pressed }) => [
                      styles.primaryAction,
                      { backgroundColor: colors.primary, opacity: pressed ? 0.78 : 1 },
                    ]}
                  >
                    <Text style={[styles.actionText, { color: colors.primaryForeground }]}>
                      {isSolitaire ? 'Play' : 'Vs computer'}
                    </Text>
                  </Pressable>
                  {!isSolitaire ? (
                    <Pressable
                      accessibilityRole="button"
                      testID={`play-${game.id}-pass`}
                      onPress={() => openGame(game.id, 'pass')}
                      style={({ pressed }) => [
                        styles.secondaryAction,
                        {
                          borderColor: colors.border,
                          opacity: pressed ? 0.72 : 1,
                        },
                      ]}
                    >
                      <Text style={[styles.passText, { color: colors.foreground }]}>
                        Pass & play
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>

        <LinearGradient
          colors={[colors.secondary, colors.muted]}
          style={[styles.footerNote, { borderColor: colors.border }]}
        >
          <Ionicons name="phone-portrait-outline" size={20} color={colors.primary} />
          <Text style={[styles.footerText, { color: colors.mutedForeground }]}>
            Your games stay on this phone. Hand it around for a table game, or play
            a hand against the computer.
          </Text>
        </LinearGradient>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 38, paddingTop: 10 },
  topline: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 24 },
  brandMark: {
    width: 36,
    height: 36,
    borderWidth: 1,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
  },
  brandSuit: { fontSize: 17, fontWeight: '700' },
  eyebrow: { fontSize: 10, fontWeight: '700', letterSpacing: 1.7 },
  title: {
    fontSize: 43,
    fontWeight: '700',
    letterSpacing: -1.8,
    lineHeight: 46,
  },
  intro: { fontSize: 15, lineHeight: 22, marginTop: 10, marginBottom: 24 },
  resume: {
    minHeight: 78,
    borderRadius: 19,
    paddingHorizontal: 18,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 25,
  },
  resumeText: { gap: 5 },
  resumeEyebrow: { fontSize: 9, fontWeight: '700', letterSpacing: 1.4 },
  resumeTitle: { fontSize: 18, fontWeight: '700' },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 13,
  },
  sectionTitle: { fontSize: 21, fontWeight: '700', letterSpacing: -0.4 },
  count: { fontSize: 10, fontWeight: '700', letterSpacing: 1.3 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 11 },
  gameCard: {
    width: '48%',
    minHeight: 229,
    borderWidth: 1,
    borderRadius: 19,
    padding: 13,
    justifyContent: 'space-between',
  },
  lastCard: { width: '100%' },
  gameCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  gameMark: {
    width: 37,
    height: 37,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markText: { fontSize: 22, fontWeight: '600' },
  players: { fontSize: 10, fontWeight: '600' },
  gameTitle: { fontSize: 17, fontWeight: '700', marginTop: 13 },
  subtitle: { fontSize: 11, fontWeight: '700', marginTop: 3 },
  description: { fontSize: 11, lineHeight: 16, marginTop: 8, flex: 1 },
  actions: { gap: 7, marginTop: 15 },
  primaryAction: {
    minHeight: 37,
    paddingHorizontal: 10,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: { fontSize: 11, fontWeight: '700' },
  secondaryAction: {
    minHeight: 34,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  passText: { fontSize: 10, fontWeight: '600' },
  footerNote: {
    marginTop: 20,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  footerText: { flex: 1, fontSize: 12, lineHeight: 18 },
});
