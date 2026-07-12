// components/venue-qa/QASection.tsx — VENUE Q&A tab content.
//
// Top-level "Ask a question" composer + a question list. Each question shows
// its answers indented underneath (text + a toggling "▲ N" upvote chip) and
// a ghost "Answer" pressable that opens an inline per-question composer.
// Handles its own skeleton / error / empty states so the venue page only
// has to render <QASection {...qaState} />.

import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Animated from 'react-native-reanimated';

import type { VenueQuestion } from '../../types/venue';
import { durations, haptics, tearIn } from '../../lib/motion';
import { useTheme, useThemedStyles } from '../../lib/theme-context';
import { PillButton } from '../ui/PillButton';
import { SpringPressable } from '../ui/SpringPressable';
import { QuietEmpty } from '../entity/EntityBits';
import { ShimmerBlock } from '../entity/EntityStates';
import { monoDate } from '../entity/format';

type QASectionProps = {
  questions: VenueQuestion[];
  loading: boolean;
  error: string | null;
  onAsk: (text: string) => Promise<boolean>;
  onAnswer: (questionId: string, text: string) => Promise<boolean>;
  onToggleUpvote: (questionId: string, answerId: string) => void;
  onRetry: () => void;
};

function authorLine(author: VenueQuestion['author'], createdAt: string): string {
  const name = author?.username ? `@${author.username}` : 'Someone';
  return `${name} · ${monoDate(createdAt).toUpperCase()}`;
}

export function QASection({ questions, loading, error, onAsk, onAnswer, onToggleUpvote, onRetry }: QASectionProps) {
  const { tokens } = useTheme();
  const [draft, setDraft] = useState('');
  const [asking, setAsking] = useState(false);
  const [openAnswerFor, setOpenAnswerFor] = useState<string | null>(null);
  const [answerDrafts, setAnswerDrafts] = useState<Record<string, string>>({});
  const [answering, setAnswering] = useState<string | null>(null);

  const styles = useThemedStyles((t) => ({
    composer: {
      backgroundColor: t.colors.card,
      borderRadius: t.radius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: t.colors.hairline,
      padding: 14,
      gap: 10,
      marginBottom: 16,
    },
    composerLabel: {
      fontFamily: t.fontFamilies.mono,
      fontSize: 10.5,
      letterSpacing: 1.2,
      textTransform: 'uppercase',
      color: t.colors.mute,
    },
    input: {
      minHeight: 44,
      fontSize: 14,
      color: t.colors.text,
      textAlignVertical: 'top',
      padding: 0,
    },
    composerFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
    },
    questionCard: {
      backgroundColor: t.colors.card,
      borderRadius: t.radius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: t.colors.hairline,
      padding: 14,
      gap: 10,
      marginBottom: 10,
    },
    questionText: { fontSize: 15, fontWeight: '600', color: t.colors.fg, lineHeight: 21 },
    metaText: {
      fontFamily: t.fontFamilies.mono,
      fontSize: 10,
      letterSpacing: 0.4,
      color: t.colors.muteSoft,
    },
    answersWrap: {
      gap: 10,
      paddingLeft: 12,
      borderLeftWidth: 2,
      borderLeftColor: t.colors.hairline,
    },
    answerRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
    answerBody: { flex: 1, gap: 4 },
    answerText: { fontSize: 13.5, fontWeight: '400', color: t.colors.text, lineHeight: 19 },
    upvote: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      height: 28,
      paddingHorizontal: 10,
      borderRadius: t.radius.full,
      backgroundColor: t.colors.card2,
    },
    upvoteActive: { backgroundColor: t.colors.inverseBg },
    upvoteText: {
      fontFamily: t.fontFamilies.monoSemi,
      fontVariant: ['tabular-nums'],
      fontSize: 11.5,
      color: t.colors.mute,
    },
    upvoteTextActive: { color: t.colors.inverseFg },
    footerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    answerComposer: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
    answerInput: {
      flex: 1,
      fontSize: 13,
      color: t.colors.text,
      backgroundColor: t.colors.card2,
      borderRadius: t.radius.md,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    errorWrap: { alignItems: 'center', gap: 10, paddingVertical: 24 },
    errorText: { fontSize: 13, color: t.colors.mute, textAlign: 'center' },
  }));

  const trimmed = draft.trim();
  const canAsk = trimmed.length > 4 && !asking;

  const handleAsk = async () => {
    if (!canAsk) return;
    setAsking(true);
    try {
      const ok = await onAsk(trimmed);
      if (ok) setDraft('');
      else haptics.error();
    } finally {
      setAsking(false);
    }
  };

  const openAnswerComposer = (questionId: string) => {
    haptics.light();
    setOpenAnswerFor((current) => (current === questionId ? null : questionId));
  };

  const handleAnswer = async (questionId: string) => {
    const text = (answerDrafts[questionId] ?? '').trim();
    if (text.length < 2) return;
    setAnswering(questionId);
    try {
      const ok = await onAnswer(questionId, text);
      if (ok) {
        setAnswerDrafts((prev) => ({ ...prev, [questionId]: '' }));
        setOpenAnswerFor(null);
      } else {
        haptics.error();
      }
    } finally {
      setAnswering(null);
    }
  };

  return (
    <View>
      <View style={styles.composer}>
        <Text style={styles.composerLabel}>Ask a question</Text>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="What do you want to know before the show?"
          placeholderTextColor={tokens.colors.muteSoft}
          style={styles.input}
          multiline
          maxLength={300}
          accessibilityLabel="Ask a question about this venue"
        />
        <View style={styles.composerFooter}>
          <PillButton
            title={asking ? 'Posting…' : 'Post'}
            size="sm"
            springFeedback
            haptic="light"
            disabled={!canAsk}
            onPress={() => void handleAsk()}
          />
        </View>
      </View>

      {loading && questions.length === 0 ? (
        <View style={{ gap: 10 }}>
          <ShimmerBlock height={84} borderRadius={tokens.radius.lg} />
          <ShimmerBlock height={64} borderRadius={tokens.radius.lg} />
        </View>
      ) : error && questions.length === 0 ? (
        <View style={styles.errorWrap}>
          <Ionicons name="cloud-offline-outline" size={28} color={tokens.colors.muteSoft} />
          <Text style={styles.errorText}>{error}</Text>
          <PillButton title="Try again" variant="ghost" springFeedback haptic="light" onPress={onRetry} />
        </View>
      ) : questions.length === 0 ? (
        <QuietEmpty text="No questions yet — ask the crowd." />
      ) : (
        questions.map((question, i) => (
          <Animated.View
            key={question.id}
            entering={tearIn(Math.min(i, 8) * durations.stagger)}
            style={styles.questionCard}
          >
            <Text style={styles.questionText}>{question.text}</Text>
            <Text style={styles.metaText}>{authorLine(question.author, question.createdAt)}</Text>

            {question.answers.length > 0 ? (
              <View style={styles.answersWrap}>
                {question.answers.map((answer) => (
                  <View key={answer.id} style={styles.answerRow}>
                    <View style={styles.answerBody}>
                      <Text style={styles.answerText}>{answer.text}</Text>
                      <Text style={styles.metaText}>{authorLine(answer.author, answer.createdAt)}</Text>
                    </View>
                    <SpringPressable
                      onPress={() => onToggleUpvote(question.id, answer.id)}
                      accessibilityRole="button"
                      accessibilityLabel={`Upvote answer, ${answer.upvotes} upvotes`}
                      accessibilityState={{ selected: answer.yourUpvote }}
                      style={[styles.upvote, answer.yourUpvote && styles.upvoteActive]}
                    >
                      <Text style={[styles.upvoteText, answer.yourUpvote && styles.upvoteTextActive]}>
                        ▲ {answer.upvotes}
                      </Text>
                    </SpringPressable>
                  </View>
                ))}
              </View>
            ) : null}

            <View style={styles.footerRow}>
              <SpringPressable
                onPress={() => openAnswerComposer(question.id)}
                haptic="none"
                accessibilityRole="button"
                accessibilityLabel="Answer this question"
              >
                <Text style={[styles.metaText, { color: tokens.colors.fg, letterSpacing: 0.6 }]}>
                  {openAnswerFor === question.id ? 'CANCEL' : 'ANSWER'}
                </Text>
              </SpringPressable>
            </View>

            {openAnswerFor === question.id ? (
              <View style={styles.answerComposer}>
                <TextInput
                  value={answerDrafts[question.id] ?? ''}
                  onChangeText={(text) => setAnswerDrafts((prev) => ({ ...prev, [question.id]: text }))}
                  placeholder="Write an answer…"
                  placeholderTextColor={tokens.colors.muteSoft}
                  style={styles.answerInput}
                  maxLength={300}
                  autoFocus
                  accessibilityLabel={`Answer: ${question.text}`}
                />
                <PillButton
                  title={answering === question.id ? '…' : 'Post'}
                  size="sm"
                  springFeedback
                  haptic="light"
                  disabled={(answerDrafts[question.id] ?? '').trim().length < 2 || answering === question.id}
                  onPress={() => void handleAnswer(question.id)}
                />
              </View>
            ) : null}
          </Animated.View>
        ))
      )}
    </View>
  );
}
