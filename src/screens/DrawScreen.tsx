import AppIcon from '../components/AppIcon';
import { displayScoringLabel } from '../presentation';
import React, { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import {
  Format,
  dynamicPairs,
  dynamicSummary,
  formatLabel,
  Tournament,
  Player,
  assignDrawPlayer,
  knockoutPairs,
  roundRobinPairs,
  shuffle,
} from '../engine';
import {
  randomKnockoutDraw,
  baseScoringRule,
  knockoutSummary,
  ruleForRound,
  roundStage,
  stageNames,
} from '../rules';
import {
  Avatar,
  BottomSheet,
  Btn,
  Card,
  Choice,
  Field,
  Page,
  ResponsiveRow,
  SetupProgress,
  StatusBadge,
  styles,
  C,
  Reveal,
} from '../ui';

type Props = {
  tournamentName: string;
  tournament?: Tournament;
  format: Format;
  players: Player[];
  onStart: (order: number[]) => void;
  onBack: () => void;
};

export default function DrawScreen({
  tournamentName,
  tournament,
  format,
  players,
  onStart,
  onBack,
}: Props) {
  const [order, setOrder] = useState(() =>
    format === 'knockout'
      ? randomKnockoutDraw(players.map((player) => player.id)).order
      : shuffle(players.map((player) => player.id)),
  );
  const [mode, setMode] = useState<'random' | 'manual'>('random');
  const [editingPosition, setEditingPosition] = useState<number | null>(null);
  const [query, setQuery] = useState('');
  const [showRules, setShowRules] = useState(false);
  const names = new Map(players.map((player) => [player.id, player.name]));
  const ready =
    order.length >= 2 &&
    order.length === players.length &&
    new Set(order).size === order.length &&
    order.every((id) => names.has(id));
  const pairs = ready
    ? format === 'knockout'
      ? knockoutPairs(order)
      : format === 'dynamic_knockout'
        ? dynamicPairs(order)
        : roundRobinPairs(order)
    : [];
  const firstRound = pairs.filter((match) => match.round === 1);
  const summary =
    ready && format !== 'round_robin'
      ? format === 'dynamic_knockout'
        ? dynamicSummary(order.length)
        : knockoutSummary(order.length)
      : null;
  const byeRecipients = firstRound
    .filter((match) => match.p1 === null || match.p2 === null)
    .map((match) => match.p1 ?? match.p2!);
  const playing = new Set(firstRound.flatMap((match) => [match.p1, match.p2]));
  const resting = format === 'round_robin' ? order.filter((id) => !playing.has(id)) : [];

  const playerSlot = (id: number, label: string) => {
    const position = order.indexOf(id);
    const editing = editingPosition === position;
    return (
      <React.Fragment key={label}>
        <TouchableOpacity
          disabled={mode !== 'manual'}
          accessibilityRole={mode === 'manual' ? 'button' : 'text'}
          accessibilityLabel={`${label}: ${names.get(id)}${mode === 'manual' ? ', change assignment' : ''}`}
          onPress={() => {
            setQuery('');
            setEditingPosition(editing ? null : position);
          }}
          style={[styles.row, { minHeight: 60, marginVertical: 6 }]}
        >
          <Avatar name={names.get(id) ?? ''} />
          <Text style={[styles.text, { flex: 1 }]}>{names.get(id)}</Text>
          {mode === 'manual' ? <Text style={{ color: C.green }}>Swap</Text> : null}
        </TouchableOpacity>
      </React.Fragment>
    );
  };

  return (
    <Page
      title="Draw preview"
      subtitle={`${tournamentName} · ${formatLabel(format)}`}
      onBack={onBack}
      footer={
        <Btn
          title="Review & start tournament"
          disabled={!ready || editingPosition !== null}
          onPress={() => onStart([...order])}
        />
      }
    >
      <SetupProgress step={5} />
      <Choice
        value={mode}
        options={[
          { label: 'Random', value: 'random' },
          { label: 'Manual', value: 'manual' },
        ]}
        onChange={(value) => {
          if (value === 'random' && mode !== 'random')
            setOrder((current) =>
              format === 'knockout' ? randomKnockoutDraw(current).order : shuffle(current),
            );
          setMode(value);
          setEditingPosition(null);
        }}
      />
      <Text style={[styles.muted, { marginVertical: 12 }]}>
        {mode === 'manual'
          ? format !== 'round_robin'
            ? 'Tap a player to swap their match or BYE assignment.'
            : 'Tap a player to swap first-round opponents or the resting player.'
          : 'Review the pairings or shuffle before confirming.'}
      </Text>
      {mode === 'random' ? (
        <Btn
          title="Shuffle Again"
          haptic="selection"
          icon="shuffle"
          secondary
          disabled={!ready}
          onPress={() => {
            setOrder((current) =>
              format === 'knockout' ? randomKnockoutDraw(current).order : shuffle(current),
            );
            setEditingPosition(null);
          }}
        />
      ) : null}
      {!ready ? (
        <Card>
          <Text style={styles.muted}>
            Return to Players and register at least two players before creating a draw.
          </Text>
        </Card>
      ) : null}
      {summary ? (
        <Card>
          <ResponsiveRow>
            {[
              { value: summary.players, label: 'Players' },
              { value: summary.matches, label: 'Matches' },
              { value: summary.byes, label: 'BYEs' },
            ].map((stat) => (
              <View key={stat.label} style={{ flex: 1 }}>
                <Text style={[styles.heading, { fontSize: 24, fontVariant: ['tabular-nums'] }]}>
                  {stat.value}
                </Text>
                <Text style={styles.muted}>{stat.label}</Text>
              </View>
            ))}
          </ResponsiveRow>
          <Text style={styles.muted}>
            {summary.advancing} advance: {summary.matches} winners + {summary.byes} BYEs.
          </Text>
          <Text style={styles.muted}>
            BYE recipients:{' '}
            {byeRecipients.length ? byeRecipients.map((id) => names.get(id)).join(', ') : 'None'}
          </Text>
        </Card>
      ) : null}
      <Btn
        title={showRules ? 'Hide draw rules' : 'Draw rules & scoring'}
        secondary
        icon="info"
        onPress={() => setShowRules(!showRules)}
      />
      {format === 'dynamic_knockout' && showRules ? (
        <View style={{ marginVertical: 12 }}>
          <Text style={styles.muted}>
            Only this round is drawn now. After every match is confirmed, qualifiers are shuffled
            for the next round. Odd-player rounds have exactly one randomly assigned BYE;
            even-player rounds have none. Manual assignments apply to this opening round only.
            Maximum 128 players.
          </Text>
        </View>
      ) : null}
      {showRules && format === 'round_robin' ? (
        <Text style={[styles.muted, { marginVertical: 12 }]}>
          {tournament
            ? `${displayScoringLabel(baseScoringRule(tournament), tournament.first_to_label)}. `
            : ''}
          Every pair meets once. A resting player stays in the schedule and plays in later rounds.
        </Text>
      ) : null}
      {summary && tournament && showRules ? (
        <Card>
          <Text style={styles.label}>SCORING BY ROUND</Text>
          {Array.from({ length: summary.rounds }, (_, index) => index + 1).map((round) => (
            <Text key={round} style={styles.muted}>
              Round {round}
              {format === 'knockout'
                ? ` (${stageNames[roundStage(round, summary.rounds, players.length)]})`
                : ''}
              :{' '}
              {displayScoringLabel(
                ruleForRound(tournament, round, summary.rounds, players.length),
                tournament.first_to_label,
              )}
            </Text>
          ))}
        </Card>
      ) : null}
      <Text style={styles.label}>
        {summary?.byes ? 'PRELIMINARY MATCHES AND BYEs' : 'OPENING ROUND'}
      </Text>
      <Reveal change={order.join(',')}>
        {firstRound.map((match) => (
          <Card key={match.slot}>
            <View style={[styles.row, { flexWrap: 'wrap' }]}>
              <Text style={styles.label}>
                {match.p2 === null ? 'AUTOMATIC ADVANCE' : `MATCH ${match.slot + 1}`}
              </Text>
              <StatusBadge
                label={match.p2 === null ? 'BYE · No score' : 'Round 1'}
                tone={match.p2 === null ? 'muted' : 'green'}
              />
            </View>
            {match.p1 !== null ? playerSlot(match.p1, 'Player 1') : null}
            {match.p2 !== null ? (
              playerSlot(match.p2, 'Player 2')
            ) : (
              <Text style={styles.muted}>BYE - advances automatically</Text>
            )}
          </Card>
        ))}
        {resting.map((id) => (
          <Card key={id}>
            {playerSlot(id, 'Resting player')}
            <Text style={styles.muted}>
              No match in round 1. This player remains in the full schedule.
            </Text>
          </Card>
        ))}
      </Reveal>
      <Text style={styles.muted}>
        {format !== 'round_robin'
          ? summary?.byes
            ? 'BYE recipients advance automatically without entering a score. Choose recipients in Manual mode, or reshuffle in Random mode.'
            : 'No BYEs are needed. Each opening-round winner advances.'
          : `Single round robin: ${(players.length * (players.length - 1)) / 2} matches. Selecting opponents changes the schedule order, not who participates.`}
      </Text>
      <BottomSheet
        visible={editingPosition !== null}
        title="Choose a player"
        onClose={() => setEditingPosition(null)}
      >
        <Text style={styles.muted}>
          Their current assignment swaps with this slot. Every player stays in the draw once.
        </Text>
        <Field
          label="Find player"
          value={query}
          onChangeText={setQuery}
          placeholder="Player name"
        />
        {!players.some((player) =>
          player.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
        ) ? (
          <Text style={styles.muted}>No players match this search.</Text>
        ) : null}
        {players
          .filter((player) =>
            player.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
          )
          .map((player) => (
            <Btn
              key={player.id}
              title={player.name}
              secondary
              onPress={() => {
                if (editingPosition !== null)
                  setOrder((current) => assignDrawPlayer(current, editingPosition, player.id));
                setEditingPosition(null);
              }}
            />
          ))}
      </BottomSheet>
    </Page>
  );
}
