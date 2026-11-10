import React from 'react';
import { Text } from 'react-native';
import type { ScoringRule } from '../engine';
import { Choice, Field, styles } from '../ui';

export default function ScoringRuleEditor({
  rule,
  onChange,
}: {
  rule: ScoringRule;
  onChange: (rule: ScoringRule) => void;
}) {
  return (
    <>
      <Choice
        value={rule.mode}
        options={[
          { label: 'First-to', value: 'first_to' },
          { label: 'Best-of', value: 'best_of' },
        ]}
        onChange={(mode) =>
          onChange({
            mode,
            value:
              mode === rule.mode
                ? rule.value
                : mode === 'first_to'
                  ? Math.floor(rule.value / 2) + 1
                  : 2 * rule.value - 1,
          })
        }
      />
      <Field
        label={
          rule.mode === 'first_to'
            ? 'Wins required (First-to)'
            : 'Maximum racks/frames (odd Best-of length)'
        }
        keyboardType="number-pad"
        value={Number.isNaN(rule.value) ? '' : String(rule.value)}
        onChangeText={(value) => onChange({ ...rule, value: value.trim() ? Number(value) : NaN })}
      />
      <Text style={styles.muted}>
        {rule.mode === 'first_to'
          ? 'First to 3 means the winner needs 3 racks/frames.'
          : 'Best of 5 means the winner needs 3 racks/frames. Use an odd number.'}
      </Text>
    </>
  );
}
