import React, { useState } from 'react';
import { Text } from 'react-native';
import {
  Format,
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
  scoringLabel,
  roundStage,
  stageNames,
} from '../rules';
import { Btn, Card, Choice, Page, styles } from '../ui';

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
  const names = new Map(players.map((player) => [player.id, player.name]));
  const ready =
    order.length >= 2 &&
    order.length === players.length &&
    new Set(order).size === order.length &&
    order.every((id) => names.has(id));
  const pairs = ready
    ? format === 'knockout'
      ? knockoutPairs(order)
      : roundRobinPairs(order)
    : [];
  const firstRound = pairs.filter((match) => match.round === 1);
  const summary = ready && format === 'knockout' ? knockoutSummary(order.length) : null;
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
        <Text style={styles.text}>
          {label}: {names.get(id)}
        </Text>
        {mode === 'manual' ? (
          <>
            <Btn
              title={editing ? 'Close Player Selection' : `Choose ${label}`}
              secondary
              onPress={() => setEditingPosition(editing ? null : position)}
            />
            {editing ? (
              <>
                <Text style={styles.muted}>
                  Choose a player. Their current assignment will swap with this slot.
                </Text>
                <Choice
                  value={String(id)}
                  options={players.map((player) => ({
                    label: player.name,
                    value: String(player.id),
                  }))}
                  onChange={(value) => {
                    setOrder((current) => assignDrawPlayer(current, position, Number(value)));
                    setEditingPosition(null);
                  }}
                />
              </>
            ) : null}
          </>
        ) : null}
      </React.Fragment>
    );
  };

  return (
    <Page
      title="Draw / Opponents"
      subtitle={`${tournamentName} · ${format === 'knockout' ? 'Knockout' : 'Round robin'}`}
      onBack={onBack}
    >
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
            ? format === 'knockout'
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
        <Card>
          <Text style={styles.text}>
            {summary.players} players - {summary.matches} matches to play - {summary.byes} BYEs
          </Text>
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
      {summary && tournament ? (
        <Card>
          <Text style={styles.label}>SCORING BY ROUND</Text>
          {Array.from({ length: summary.rounds }, (_, index) => index + 1).map((round) => (
            <Text key={round} style={styles.muted}>
              Round {round} ({stageNames[roundStage(round, summary.rounds, players.length)]}):{' '}
              {scoringLabel(
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
          <Text style={styles.label}>MATCH {match.slot + 1}</Text>
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
        {format === 'knockout'
          ? summary?.byes
            ? 'BYE recipients advance automatically without entering a score. Choose recipients in Manual mode, or reshuffle in Random mode.'
            : 'No BYEs are needed. Each opening-round winner advances.'
          : `Single round robin: ${(players.length * (players.length - 1)) / 2} matches. Selecting opponents changes the schedule order, not who participates.`}
      </Text>
      <Btn
        title="Confirm Draw & Start"
        disabled={!ready || editingPosition !== null}
        onPress={() => onStart([...order])}
      />
      <Btn title="Back to Players" secondary onPress={onBack} />
    </Page>
  );
}
