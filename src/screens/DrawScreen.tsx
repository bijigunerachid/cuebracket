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
          {mode === 'manual' ? <Text style={{ color: C.green }}>Swap ↔</Text> : null}
        </TouchableOpacity>
      </React.Fragment>
    );
  };

  return (
    <Page
      title="The opening draw."
      subtitle={`${tournamentName} · ${formatLabel(format)}`}
      onBack={onBack}
      footer={
        <Btn
          title="Review & start tournament  →"
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
      <Card>
        <Text style={styles.muted}>
          {mode === 'manual'
            ? format !== 'round_robin'
              ? 'Choose the players in each first-round match or BYE slot. Assignments swap, so each player appears exactly once.'
              : 'Choose first-round opponents or the resting player. All players will still meet once over the full schedule.'
            : 'Review the random draw below, or shuffle again before starting.'}
        </Text>
      </Card>
      {mode === 'random' ? (
        <Btn
          title="Shuffle Again"
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
        <Card highlight>
          <ResponsiveRow>
            {[
              { value: summary.players, label: 'Players' },
              { value: summary.matches, label: 'Matches' },
              { value: summary.byes, label: 'BYEs' },
            ].map((stat) => (
              <View key={stat.label} style={{ flex: 1 }}>
                <Text style={[styles.heading, { fontSize: 32 }]}>{stat.value}</Text>
                <Text style={styles.muted}>{stat.label}</Text>
              </View>
            ))}
          </ResponsiveRow>
          <Text style={styles.muted}>
            {summary.advancing} players remain after this round: {summary.matches} match winners
            plus {summary.byes} automatic BYE advances.
          </Text>
          <Text style={styles.muted}>
            BYE recipients:{' '}
            {byeRecipients.length ? byeRecipients.map((id) => names.get(id)).join(', ') : 'None'}
          </Text>
        </Card>
      ) : null}
      {format === 'dynamic_knockout' ? (
        <Card>
          <Text style={styles.muted}>
            Only this round is drawn now. After every match is confirmed, qualifiers are shuffled
            for the next round. Odd-player rounds have exactly one randomly assigned BYE;
            even-player rounds have none. Manual assignments apply to this opening round only.
            Maximum 128 players.
          </Text>
        </Card>
      ) : null}
      {summary && tournament && format !== 'dynamic_knockout' ? (
        <Card>
          <Text style={styles.label}>SCORING BY ROUND</Text>
          {Array.from({ length: summary.rounds }, (_, index) => index + 1).map((round) => (
            <Text key={round} style={styles.muted}>
              Round {round} ({stageNames[roundStage(round, summary.rounds, players.length)]}):{' '}
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
