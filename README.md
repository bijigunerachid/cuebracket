# CueBracket

Offline Android tournament manager for 8-Ball Pool and Snooker, built with React Native, Expo SDK 54, TypeScript, Expo Router, and SQLite. The interface uses a dark emerald theme.

Normal tournament operation uses local storage and does not require an account or backend. Installation, dependency downloads, and cloud builds require internet access. Offline operation on an installed APK still needs device verification.

## Implemented features

- Tournament creation, setup editing, and deletion, game selection, knockout or single round-robin format, and best-of-3/5/7/9 matches.
- Player registration, editing, and removal during setup, with blank-name and duplicate-name validation within each tournament.
- Random draws and direct manual opponent selection, with a first-round preview for both formats and selectable knockout BYE recipients.
- Automatic knockout BYEs, score recording, winner advancement, and round lists.
- Round-robin scheduling and standings based on wins and rack/frame difference. Tied leaders are shown without declaring a champion.
- SQLite tournament history, transactions, schema migration, validation triggers, and startup retry handling.
- Separate Expo Router screens, native Android back-stack navigation, visible back controls, focus-based data refresh, safe-area padding, and accessible controls with at least 48-point touch targets.

## Requirements

- Node.js 22.13 or later; Node.js 24 LTS is suitable for the regression runner, which uses `node:sqlite`.
- npm.
- An Android device with a compatible Expo Go version, or an Android Studio emulator.
- For cloud APK builds: an Expo account and access to EAS Build.

## Installation and development

Run these commands in PowerShell:

```powershell
Set-Location C:\Users\hp\Desktop\cuebracket
npm.cmd ci
npm.cmd run android
```

Alternatively, run `npm.cmd start` and connect an Android device using Expo Go. For LAN development, the device must be able to reach the development computer. Use an Expo Go version compatible with SDK 54; an installed APK is the intended offline deployment.

The `.cmd` commands avoid PowerShell script-execution restrictions without changing the machine's execution policy. The committed lockfile keeps dependency installation reproducible.

## Validation

```powershell
npm.cmd run typecheck
npm.cmd test
npm.cmd run format:check
npx.cmd expo install --check
npx.cmd expo config --type public
```

The automated tests cover route ID validation, tournament lifecycle redirects, and stale match-link protection, plus real in-memory SQLite through an adapter for the Expo SQLite API. They do not open the Android device database or simulate a native navigation stack. Database coverage includes legacy migration and result preservation, write constraints, transaction rollback, setup configuration editing and locks, player editing, manual assignment swaps and persisted pairings/BYE recipients, tied standings, pairing checks for 2-128 players, score validation, and 186 complete tournament simulations.

To check Android JavaScript bundling and Hermes compilation:

```powershell
npx.cmd expo export --platform android --output-dir .verification/android
```

This export is not an APK, a native Android build, or a device test. Generated verification output is ignored by Git. Expo's dependency check uses installed SDK metadata when run offline; it is not a vulnerability audit.

## Code formatting

Prettier keeps TypeScript, JSX, JSON configuration, tests, and documentation consistently formatted. Source code uses two-space indentation, single quotes, semicolons, and a 100-character target line width. JSX elements and long expressions are expanded across lines for readability.

```powershell
npm.cmd run format
npm.cmd run format:check
```

The first command formats files; the second checks them without writing changes. Generated output, dependencies, local editor settings, and `package-lock.json` are excluded. npm manages the lockfile; do not format or edit its dependency entries manually.

`.gitattributes` keeps text files in LF format on every platform, matching Prettier even when Windows Git has `core.autocrlf` enabled. Windows command scripts retain CRLF endings.

## Manual Android testing

Before treating a release as ready:

1. Create Pool and Snooker events using both formats and each match length. Open Edit Tournament before starting, change all settings, and confirm registered players remain unchanged. Test Cancel and hardware Back without saving, then reopen the form to verify the saved values. Confirm the draw and score target follow the updated settings; active and completed events must not offer editing.
2. Add, rename, and remove players; confirm blank and duplicate names are rejected. Cancel an edit, navigate away and back, and check that no draft name is saved. Confirm player IDs and ordering remain unchanged after renaming.
3. Create 5- and 6-player knockout events. In Manual mode, choose players in each match and BYE slot, check that assignments swap without duplicates, confirm the draw, and play through the final. Confirm that canceling the start dialog leaves the draft editable and that going back to Players discards the draft without starting the event.
4. Complete an odd-player round robin and a scenario with tied leaders. Select first-round opponents and the resting player; verify everyone still meets once over the complete schedule. Switching from Manual to Random reshuffles the draft; review it before starting.
5. Try invalid scores, confirm valid results, and check advancement and completion.
6. Close and reopen the app; verify tournament data and scores remain available.
7. Repeat core flows in an installed APK with airplane mode enabled.
8. Check hardware Back and visible Back controls through Home, Create, Details, Settings, Players, Draw, Score, and Results. Confirm returning to Home or Details refreshes changes, canceled scores are discarded, and deleted events disappear. Check keyboard behavior, long names, larger text, screen readers, small/large displays, and status/navigation bars. Open valid and invalid `cuebracket://tournament/<id>` links, an active event's edit link, and a completed match's score link; confirm unavailable or locked pages fail safely.
9. Upgrade an installation containing existing tournaments and confirm native SQLite migration preserves results.

## Build an Android APK

The existing `eas.json` provides an internal APK profile and a production AAB profile.

```powershell
npx.cmd eas-cli login
npx.cmd eas-cli build:configure --platform android
npx.cmd eas-cli build --platform android --profile preview
```

The first setup may link the app to an Expo project and update local configuration. Review those changes before committing. EAS may prompt to generate Android signing credentials; keep signing material and credential files out of Git.

Download the APK from the completed build and install it on an Android device. Cloud building requires internet access and an Expo account. No APK build or device acceptance is implied by passing TypeScript or bundle checks.

For a production Android App Bundle:

```powershell
npx.cmd eas-cli build --platform android --profile production
```

## Project structure

```text
app/
  _layout.tsx                 Router stack, database startup gate, and status bar
  index.tsx                   Home route
  create.tsx                  Tournament creation route
  +not-found.tsx              Invalid path recovery
  tournament/[id]/            Details, settings, players, draw, results routes
    match/[matchId].tsx       Match score route
src/
  DatabaseGate.tsx            Startup, retry, and render error handling for all routes
  navigation.ts              Route ID validation and lifecycle guards
  components/TournamentRoute.tsx  Shared focus-based data loading and route recovery
  components/MatchCard.tsx    Accessible reusable match summary
  screens/TournamentApp.tsx   Home and tournament history
  screens/TournamentDetailScreen.tsx   Details, rounds, and standings
  screens/MatchScoreScreen.tsx         Responsive score controls
  screens/TournamentResultsScreen.tsx  Champion/tied leaders and final standings
  screens/PlayersScreen.tsx   Player registration and editing form
  screens/DrawScreen.tsx      Random draw preview and direct slot selection
  screens/TournamentSettingsScreen.tsx  Shared creation and setup editing form
  db.ts                       SQLite schema, migration, CRUD, advancement, standings
  engine.ts                   Types, draws, scheduling, and validation
  ui.tsx                      Theme and reusable controls
tests/
  navigation.cjs              Route validation and lifecycle guard checks
  tournaments.cjs             Engine and SQLite regression checks
app.json                      Android-only Expo configuration
eas.json                      APK and AAB build profiles
package-lock.json             Locked dependency versions
tsconfig.json                 Strict TypeScript configuration
```

## Database behavior and limitations

SQLite stores data in `cuebracket.db` on the device. Schema version 1 normalizes legacy participant positions and adds a unique position index and validation triggers while preserving existing results.

Legacy knockout draws with empty first-round matches are flagged, but their draws and recorded results are not rewritten. Create a new tournament to use the corrected BYE algorithm. Uninstalling the application or clearing its data can remove local tournament history; backup and restore are not implemented.

- Player changes are allowed only during setup. Reusable player selection is not implemented. Shared legacy player records or records referenced by matches cannot be renamed, to protect other tournaments and history. Each registration creates a player record; unreferenced records are cleaned up when registrations or tournaments are removed.
- Manual draw assigns players by swapping occupied first-round slots. The number and bracket positions of knockout BYEs are automatic; their recipients can be chosen. Round robin lets you choose first-round opponents and the resting player, with later rounds generated automatically so every pair meets once. Unconfirmed draw drafts are discarded when leaving the draw screen.
- Tournament name, game, format, and match length can be edited during setup. Settings lock after starting or if a legacy setup event already has match records. Saving preserves player registrations, tournament identity, and creation time. Cancel and hardware Back discard unsaved changes. New events default to best-of-5; valid legacy match lengths remain available when editing.
- Confirmed scores cannot be edited or undone.
- Standings use alphabetical ordering only to display otherwise tied rows; ties require a manual resolution outside the application.
- Knockout brackets use round lists rather than connected diagrams.
- Each view has an Expo Router route. Tournament data refreshes when a route gains focus, and invalid/deleted tournament links have recovery actions. Locked setup pages and unavailable score links redirect to valid routes. Navigation history and unsaved form drafts are not persisted across application restarts.
- Device persistence, accessibility, and fully offline APK operation still require Android acceptance testing.

## Local Git workflow

Use a separate branch for each independent feature or fix. Review the working tree and base history before branching, preserve existing work, run relevant checks, and provide a suggested conventional commit message for the owner to use.

The repository owner creates every commit and performs every push. Do not automatically commit, push, merge, delete branches, modify remote repositories, or open pull requests. Establishing the initial baseline as stable `main` requires the owner's approval before subsequent feature work.

`.gitignore` excludes dependencies, generated outputs, local databases and sidecars, local editor settings, environment files, Android packages, and common signing credentials. Review staged files for secrets even when ignore rules are present. Do not place real credentials in example environment files.
