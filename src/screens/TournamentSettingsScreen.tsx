import React, { useState } from 'react';
import { Text } from 'react-native';
import { Format, Game, Tournament, TournamentSettings, validateSettings } from '../engine';
import { Btn, Choice, Field, Page, errorAlert, styles } from '../ui';

type Props = {
  initial?: Tournament;
  onSave: (settings: TournamentSettings) => void;
  onCancel: () => void;
};

export default function TournamentSettingsScreen({ initial, onSave, onCancel }: Props) {
  const [name, setName] = useState(initial?.name ?? '');
  const [game, setGame] = useState<Game>(initial?.game ?? '8ball');
  const [format, setFormat] = useState<Format>(initial?.format ?? 'knockout');
  const [bestOf, setBestOf] = useState(initial?.best_of ?? 5);
  // Keep valid legacy match lengths selectable without silently replacing them.
  const matchLengths = [...new Set([3, 5, 7, 9, ...(initial ? [initial.best_of] : [])])].sort(
    (a, b) => a - b,
  );
  const save = () => {
    try {
      if (!name.trim()) throw Error('Tournament name is required');
      validateSettings(game, format, bestOf);
      onSave({ name: name.trim(), game, format, bestOf });
    } catch (error) {
      errorAlert(error);
    }
  };

  return (
    <Page
      title={initial ? 'Edit Tournament' : 'New Tournament'}
      subtitle={initial ? 'Update your event before starting' : 'Set up your competition'}
      onBack={onCancel}
    >
      <Field
        label="Tournament name"
        value={name}
        onChangeText={setName}
        placeholder="Friday 8-Ball Cup"
      />
      <Text style={styles.label}>Game</Text>
      <Choice
        value={game}
        onChange={setGame}
        options={[
          { label: '8-Ball Pool', value: '8ball' },
          { label: 'Snooker', value: 'snooker' },
        ]}
      />
      <Text style={styles.label}>Tournament format</Text>
      <Choice
        value={format}
        onChange={setFormat}
        options={[
          { label: 'Knockout', value: 'knockout' },
          { label: 'Round robin', value: 'round_robin' },
        ]}
      />
      <Text style={styles.label}>Match length</Text>
      <Choice
        value={String(bestOf)}
        onChange={(value) => setBestOf(Number(value))}
        options={matchLengths.map((value) => ({ label: `Best of ${value}`, value: String(value) }))}
      />
      <Text style={styles.muted}>
        {initial
          ? 'Registered players will be kept. These settings lock when the tournament starts.'
          : 'Add players next, then review and confirm the draw.'}
      </Text>
      <Btn
        title={initial ? 'Save Changes' : 'Create & Add Players'}
        disabled={!name.trim()}
        onPress={save}
      />
      <Btn title="Cancel" secondary onPress={onCancel} />
    </Page>
  );
}
