import React, { useState } from 'react';
import { Text } from 'react-native';
import { Player } from '../engine';
import { Btn, Card, Field, Page, styles, errorAlert } from '../ui';

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
    } catch (error) {
      errorAlert(error);
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
    >
      <Card>
        {editing ? <Text style={styles.text}>Editing {editing.name}</Text> : null}
        <Field
          label={editingId === null ? 'Player name' : 'New player name'}
          value={name}
          onChangeText={setName}
          placeholder="Enter a name"
        />
        <Btn
          title={editingId === null ? 'Add Player' : 'Save Player'}
          disabled={!name.trim()}
          onPress={save}
        />
        {editingId !== null ? <Btn title="Cancel Edit" secondary onPress={cancelEdit} /> : null}
      </Card>
      <Text style={styles.label}>PARTICIPANTS</Text>
      {players.length === 0 ? (
        <Card>
          <Text style={styles.muted}>Add at least two players to generate a draw.</Text>
        </Card>
      ) : null}
      {players.map((player, index) => (
        <Card key={player.id}>
          <Text style={[styles.text, { flexShrink: 1 }]}>
            {index + 1}. {player.name}
          </Text>
          <Btn
            title={`Edit ${player.name}`}
            secondary
            onPress={() => {
              setEditingId(player.id);
              setName(player.name);
            }}
          />
          <Btn title={`Remove ${player.name}`} secondary onPress={() => remove(player.id)} />
        </Card>
      ))}
      <Btn
        title="Continue to Draw"
        disabled={players.length < 2 || editingId !== null}
        onPress={onContinue}
      />
      <Btn title="Back to Tournament" secondary onPress={onBack} />
    </Page>
  );
}
