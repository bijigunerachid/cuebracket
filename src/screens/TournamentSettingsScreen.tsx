import React, { useState } from 'react';
import { Text } from 'react-native';
import {
  Format,
  Game,
  Tournament,
  TournamentSettings,
  validateSettings,
  ScoringRule,
  ScoringOptions,
} from '../engine';
import ScoringRuleEditor from '../components/ScoringRuleEditor';
import {
  baseScoringRule,
  scoringOptions,
  scoringTarget,
  validateScoringOptions,
  roundStages,
  stageNames,
} from '../rules';
import { Btn, Card, Choice, Field, Page, errorAlert, styles } from '../ui';

type Props = {
  initial?: Tournament;
  onSave: (settings: TournamentSettings) => void;
  onCancel: () => void;
};

export default function TournamentSettingsScreen({ initial, onSave, onCancel }: Props) {
  const [name, setName] = useState(initial?.name ?? '');
  const [game, setGame] = useState<Game>(initial?.game ?? '8ball');
  const [format, setFormat] = useState<Format>(initial?.format ?? 'knockout');
  const [rule, setRule] = useState<ScoringRule>(() =>
    initial ? baseScoringRule(initial) : { mode: 'best_of', value: 5 },
  );
  const [options, setOptions] = useState<ScoringOptions>(() =>
    initial ? scoringOptions(initial) : { mode: 'best_of', label: 'First to', rounds: {} },
  );
  const save = () => {
    try {
      if (!name.trim()) throw Error('Tournament name is required');
      const target = scoringTarget(rule);
      const bestOf = rule.mode === 'best_of' ? rule.value : 2 * target - 1;
      const scoring = {
        ...options,
        mode: rule.mode,
        label: options.label.trim(),
        rounds: format !== 'round_robin' ? options.rounds : {},
      };
      validateSettings(game, format, bestOf);
      validateScoringOptions(scoring);
      onSave({ name: name.trim(), game, format, bestOf, scoring });
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
          { label: 'Dynamic Knockout', value: 'dynamic_knockout' },
          { label: 'Round robin', value: 'round_robin' },
        ]}
      />
      <Text style={styles.label}>Default match scoring</Text>
      <ScoringRuleEditor rule={rule} onChange={setRule} />
      <Field
        label="Local First-to label (e.g. First to, A)"
        value={options.label}
        onChangeText={(label) => setOptions((current) => ({ ...current, label }))}
      />
      <Text style={styles.muted}>
        A3 can be used here for first to 3. This is configurable local terminology, not an official
        universal Pool or Snooker rule.
      </Text>
      {format !== 'round_robin' ? (
        <>
          <Text style={styles.label}>Optional round-specific scoring</Text>
          <Text style={styles.muted}>
            {format === 'dynamic_knockout'
              ? 'Dynamic rounds use the number of rounds remaining: final, semifinals, quarterfinals, then preliminary. Pairings are reshuffled after each completed round. Supports 2-128 players.'
              : 'The opening round with BYEs uses Preliminary. Later rounds use their bracket stage.'}{' '}
            Unconfigured stages inherit the default. Some stages may not exist for your player
            count.
          </Text>
          {roundStages.map((stage) => (
            <Card key={stage}>
              <Text style={styles.label}>{stageNames[stage]}</Text>
              <Choice
                value={options.rounds[stage] ? 'custom' : 'default'}
                options={[
                  { label: 'Default', value: 'default' },
                  { label: 'Custom', value: 'custom' },
                ]}
                onChange={(value) =>
                  setOptions((current) => {
                    const rounds = { ...current.rounds };
                    if (value === 'default') delete rounds[stage];
                    else rounds[stage] = { ...rule };
                    return { ...current, rounds };
                  })
                }
              />
              {options.rounds[stage] ? (
                <ScoringRuleEditor
                  rule={options.rounds[stage]!}
                  onChange={(next) =>
                    setOptions((current) => ({
                      ...current,
                      rounds: { ...current.rounds, [stage]: next },
                    }))
                  }
                />
              ) : null}
            </Card>
          ))}
        </>
      ) : null}
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
