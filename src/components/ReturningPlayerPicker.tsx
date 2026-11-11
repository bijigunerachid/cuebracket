import { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import type { Player } from '../engine';
import { BottomSheet, Btn, C, Field, styles } from '../ui';
import AppIcon from './AppIcon';

export default function ReturningPlayerPicker({
  players,
  onAdd,
  onClose,
}: {
  players: Player[];
  onAdd: (ids: number[]) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<number[]>([]);
  const [limit, setLimit] = useState(30);
  const [error, setError] = useState<string | null>(null);
  const visible = players.filter((p) => p.name.toLowerCase().includes(query.trim().toLowerCase()));
  const add = () => {
    try {
      onAdd(selected);
      onClose();
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
    }
  };
  return (
    <BottomSheet visible title="Returning players" onClose={onClose}>
      <Text style={[styles.muted, { marginTop: 12 }]}>
        Choose names from previous registrations. Players already on this roster are hidden. Each
        tournament keeps its own names.
      </Text>
      <Field
        label="Search returning players"
        placeholder="Player name"
        value={query}
        onChangeText={(value) => {
          setQuery(value);
          setLimit(30);
        }}
      />
      <Text style={styles.muted} accessibilityLiveRegion="polite">
        {selected.length} selected · {visible.length} available
      </Text>
      <Btn
        title={`Add selected players (${selected.length})`}
        icon="user-plus"
        disabled={!selected.length}
        onPress={add}
      />
      {error ? (
        <Text style={{ color: C.danger, marginTop: 12 }} accessibilityRole="alert">
          {error}
        </Text>
      ) : null}
      {!visible.length ? (
        <Text style={[styles.muted, { marginTop: 16 }]}>
          {players.length
            ? 'No matching players. Try another name.'
            : 'No returning players available. Add a new name on the Players screen.'}
        </Text>
      ) : null}
      {visible.slice(0, limit).map((player) => {
        const checked = selected.includes(player.id);
        return (
          <TouchableOpacity
            key={player.id}
            accessibilityRole="checkbox"
            accessibilityLabel={player.name}
            accessibilityState={{ checked }}
            onPress={() => {
              setSelected((current) =>
                current.includes(player.id)
                  ? current.filter((id) => id !== player.id)
                  : [...current, player.id],
              );
              setError(null);
            }}
            style={{
              minHeight: 56,
              paddingVertical: 12,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              borderBottomWidth: 1,
              borderBottomColor: C.border,
            }}
          >
            <View
              style={{
                width: 24,
                height: 24,
                borderRadius: 4,
                borderWidth: 1,
                borderColor: checked ? C.green : C.muted,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {checked ? <AppIcon name="check" size={18} color={C.green} /> : null}
            </View>
            <Text style={[styles.text, { flex: 1 }]}>{player.name}</Text>
          </TouchableOpacity>
        );
      })}
      {visible.length > limit ? (
        <Btn
          title="Show more players"
          secondary
          onPress={() => setLimit((current) => current + 30)}
        />
      ) : null}
    </BottomSheet>
  );
}
