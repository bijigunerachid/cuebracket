import React, { useState } from 'react';
import { Alert, Text } from 'react-native';
import { Player } from '../engine';
import {
  BottomSheet,
  Btn,
  Card,
  EmptyState,
  Field,
  Page,
  SetupProgress,
  SectionHeading,
  styles,
  errorAlert,
} from '../ui';
import PlayerCard from '../components/PlayerCard';

type Props = {
  tournamentName: string;
  players: Player[];
  onAdd: (name: string) => void;
  onRename: (id: number, name: string) => void;
  onRemove: (id: number) => void;
  onContinue: () => void;
  onBack: () => void;
};

export default function PlayersScreen({
  tournamentName,
  players,
  onAdd,
  onRename,
  onRemove,
  onContinue,
  onBack,
}: Props) {
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [selected, setSelected] = useState<Player | null>(null);
  const [query, setQuery] = useState('');
  const [validation, setValidation] = useState<string | null>(null);
  const editing = players.find((player) => player.id === editingId);
  const cancelEdit = () => {
    setEditingId(null);
    setName('');
  };
  const save = () => {
    try {
      if (editingId !== null) onRename(editingId, name);
      else onAdd(name);
      cancelEdit();
      setValidation(null);
    } catch (error) {
      setValidation(error instanceof Error ? error.message : String(error));
    }
  };
  const remove = (id: number) => {
    try {
      onRemove(id);
      if (editingId === id) cancelEdit();
    } catch (error) {
      errorAlert(error);
    }
  };

  return (
    <Page
      title="Players"
      subtitle={`${tournamentName} · ${players.length} registered`}
      onBack={onBack}
      scrollToTopKey={editingId}
      footer={
        <Btn
          title="Continue to draw"
          disabled={players.length < 2 || editingId !== null}
          onPress={onContinue}
        />
      }
    >
      <SetupProgress step={4} />
      <Card>
        {editing ? <Text style={styles.text}>Editing {editing.name}</Text> : null}
        <Field
          label={editingId === null ? 'Player name' : 'New player name'}
          value={name}
          onChangeText={setName}
          placeholder="Enter a name"
          onSubmitEditing={save}
          returnKeyType="done"
          blurOnSubmit={false}
        />
        {validation ? (
          <Text style={{ color: '#FFB4AB' }} accessibilityRole="alert">
            {validation}
          </Text>
        ) : null}
        <Btn
          title={editingId === null ? 'Add Player' : 'Save Player'}
          disabled={!name.trim()}
          onPress={save}
        />
        {editingId !== null ? <Btn title="Cancel Edit" secondary onPress={cancelEdit} /> : null}
      </Card>
      <SectionHeading title="On the roster" detail={`${players.length} registered`} />
      {players.length > 8 ? (
        <Field
          label="Search registrations"
          value={query}
          onChangeText={setQuery}
          placeholder="Player name"
        />
      ) : null}
      {players.length === 0 ? (
        <EmptyState
          title="Who’s playing?"
          description="Add at least two players. Names can be edited until the draw is confirmed."
        />
      ) : null}
      {players
        .filter(
          (player) =>
            players.length <= 8 ||
            player.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
        )
        .map((player) => (
          <PlayerCard
            key={player.id}
            player={player}
            detail={editingId === player.id ? 'Editing this player' : 'Registered'}
            onActions={() => setSelected(player)}
          />
        ))}
      {players.length > 8 &&
      !players.some((player) =>
        player.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
      ) ? (
        <EmptyState title="No players found" description="Try another name." />
      ) : null}
      <BottomSheet
        visible={selected !== null}
        title={selected?.name ?? 'Player actions'}
        onClose={() => setSelected(null)}
      >
        <Btn
          title="Edit name"
          onPress={() => {
            if (selected) {
              setEditingId(selected.id);
              setName(selected.name);
              setValidation(null);
            }
            setSelected(null);
          }}
        />
        <Btn
          title="Remove player"
          secondary
          danger
          onPress={() => {
            const player = selected;
            setSelected(null);
            if (player)
              Alert.alert('Remove player?', `Remove ${player.name} from this tournament?`, [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Remove', style: 'destructive', onPress: () => remove(player.id) },
              ]);
          }}
        />
      </BottomSheet>
    </Page>
  );
}
