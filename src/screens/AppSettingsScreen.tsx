import { Text } from 'react-native';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { Btn, Card, Page, SectionHeading, StatusBadge, styles } from '../ui';
export default function AppSettingsScreen() {
  return (
    <Page title="Made for your table." subtitle="CueBracket · Offline tournament companion">
      <Card highlight>
        <StatusBadge label="OFFLINE BY DESIGN" />
        <SectionHeading title="Your device. Your data." />
        <Text style={styles.text}>
          Tournaments, players, and confirmed scores are stored locally. No account is needed to
          organize a competition.
        </Text>
      </Card>
      <SectionHeading title="App & preferences" />
      <Card>
        <Text style={styles.heading}>Dark emerald</Text>
        <Text style={styles.muted}>
          Android system font sizing and reduced-motion preferences are respected automatically. The
          app uses a dark theme.
        </Text>
      </Card>
      <Card>
        <Text style={styles.heading}>Tournament settings</Text>
        <Text style={styles.muted}>
          Choose game, format, scoring, and local A labels when creating an event. Edit them before
          confirming its draw.
        </Text>
        <Btn title="Open tournaments" secondary onPress={() => router.navigate('/tournaments')} />
      </Card>
      <SectionHeading title="Local storage" />
      <Card>
        <Text style={styles.text}>Keep your tournament history safe</Text>
        <Text style={styles.muted}>
          Uninstalling the app or clearing Android app data can remove your tournaments. Backup and
          restore are not available yet.
        </Text>
      </Card>
      <Text style={styles.muted}>
        CueBracket {Constants.expoConfig?.version ?? '1.0.0'} · Android
      </Text>
    </Page>
  );
}
