import { Text, View } from 'react-native';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { Btn, C, Page, SectionHeading, styles } from '../ui';
export default function AppSettingsScreen() {
  return (
    <Page
      title="Settings"
      subtitle={`CueBracket ${Constants.expoConfig?.version ?? '1.0.0'} · Android`}
    >
      <SectionHeading title="Appearance" />
      <View
        style={{ paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: C.border, gap: 6 }}
      >
        <Text style={styles.text}>Dark theme</Text>
        <Text style={styles.muted}>
          System text sizing and reduced motion are applied automatically.
        </Text>
      </View>
      <SectionHeading title="Tournament settings" />
      <Text style={styles.muted}>
        Game, format, scoring targets, and local A labels are configured per event before the draw
        starts.
      </Text>
      <Btn
        title="Open tournaments"
        icon="arrow-right"
        secondary
        onPress={() => router.navigate('/tournaments')}
      />
      <SectionHeading title="Offline storage" />
      <Text style={styles.text}>Stored on this device</Text>
      <Text style={[styles.muted, { marginTop: 6 }]}>
        Tournaments, players, and scores work without an account or internet connection.
      </Text>
      <View
        style={{ paddingVertical: 16, marginTop: 8, borderTopWidth: 1, borderTopColor: C.border }}
      >
        <Text style={styles.muted}>
          Clearing Android app data or uninstalling can remove tournament history. Backup and
          restore are not available yet.
        </Text>
      </View>
    </Page>
  );
}
