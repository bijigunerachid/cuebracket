import { useRef, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { Btn, C, Card, Page, SectionHeading, errorAlert, styles } from '../ui';
import { pickBackup, shareBackup } from '../backupFiles';
import { importBackup } from '../db';
export default function AppSettingsScreen() {
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [preview, setPreview] = useState<Awaited<ReturnType<typeof pickBackup>>>(null);
  const run = async (action: () => Promise<void>) => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    try {
      await action();
    } catch (error) {
      errorAlert(error);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const restore = () => {
    if (!preview || lock.current) return;
    Alert.alert(
      'Add tournaments from backup?',
      'Existing tournaments will stay unchanged. Importing the same backup again creates additional copies.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Import',
          onPress: () =>
            void run(async () => {
              const result = importBackup(preview.backup);
              setPreview(null);
              Alert.alert(
                'Import complete',
                `${result.tournaments} tournaments added. Match progress is ready to continue.`,
              );
            }),
        },
      ],
    );
  };
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
          Clearing Android app data or uninstalling can remove tournament history. Save a backup
          outside the app to keep a copy. Backup files contain player names and results and are not
          encrypted.
        </Text>
      </View>
      <SectionHeading title="Backup & restore" />
      <Text style={styles.muted}>
        Export all tournaments, players, scoring rules, and match progress. Choose a local file to
        restore without internet.
      </Text>
      <Btn
        title={busy ? 'Please wait…' : 'Export backup'}
        icon="download"
        disabled={busy}
        onPress={() => void run(shareBackup)}
      />
      <Btn
        title="Choose backup to import"
        icon="upload"
        secondary
        disabled={busy}
        onPress={() =>
          void run(async () => {
            setPreview(await pickBackup());
          })
        }
      />
      <Text style={[styles.muted, { marginTop: 12 }]}>
        Choose a save or share destination when exporting. Closing the share sheet does not confirm
        that a copy was saved.
      </Text>
      {preview ? (
        <Card>
          <Text style={styles.heading}>Import preview</Text>
          <Text style={styles.text}>{preview.name}</Text>
          <Text style={styles.muted}>
            Created {new Date(preview.backup.createdAt).toLocaleString()}
          </Text>
          <Text style={styles.text}>
            {preview.backup.tournaments.length} tournaments · {preview.backup.players.length}{' '}
            players · {preview.backup.matches.length} matches
          </Text>
          <Text style={styles.muted}>
            Adds separate copies, including active match progress. Existing data stays unchanged.
          </Text>
          <Btn
            title="Import tournaments"
            disabled={busy || preview.backup.tournaments.length === 0}
            onPress={restore}
          />
          <Btn title="Cancel preview" secondary disabled={busy} onPress={() => setPreview(null)} />
        </Card>
      ) : null}
    </Page>
  );
}
