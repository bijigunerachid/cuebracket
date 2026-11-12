# CueBracket

Offline Android tournament manager for 8-Ball Pool and Snooker, built with React Native, Expo SDK 54, TypeScript, Expo Router, and SQLite. The interface uses a dark emerald theme.

Normal tournament operation uses local storage and does not require an account or backend. Installation, dependency downloads, and cloud builds require internet access. Offline operation on an installed APK still needs device verification.

## Implemented features

- Tournament creation, setup editing, and deletion, game selection, knockout or single round-robin format, and configurable First-to or odd-length Best-of matches.
- Player registration, editing, and removal during setup, with blank-name and duplicate-name validation within each tournament.
- Random draws and direct manual opponent selection, with a first-round preview for both formats and selectable knockout BYE recipients.
- Automatic knockout BYEs, score recording, winner advancement, and a connected knockout bracket with a Round List alternative.
- Random BYE recipients and opponents for arbitrary player counts of at least two, manual assignment overrides, draw totals, and optional round-specific scoring.
- Round-robin scheduling and standings based on wins and rack/frame difference. Tied leaders are shown without declaring a champion.
- SQLite tournament history, transactions, schema migration, validation triggers, and startup retry handling.
- Offline JSON backup export and append-only restore, with validation, import preview, ID remapping, and transactional rollback.
- The Tournaments tab includes name search, combined status/game filters, result counts, creation dates, and Clear filters. Filters stay selected while navigating within the current session and reset when the library screen is remounted; filtering never deletes stored events.
- Home, Tournaments, Players, and Settings bottom tabs, a guided setup flow, contextual action sheets, fixed primary actions, live progress, and accessible score controls share a premium dark emerald design system. Home statistics and pending matches come from stored events; no example data is inserted.

The UI audit, design system, and Android acceptance checklist are documented in [docs/ui-ux.md](docs/ui-ux.md). This redesign changes presentation and navigation without altering SQLite schema or tournament algorithms.

- Separate Expo Router screens, native Android back-stack navigation, visible back controls, focus-based data refresh, safe-area padding, and accessible controls with at least 48-point touch targets.

## Requirements

- Node.js 22.13 or later; Node.js 24 LTS is suitable for the regression runner, which uses `node:sqlite`.
- npm.
- An Android device with a compatible Expo Go version, or an Android Studio emulator.
- For cloud APK builds: an Expo account and access to EAS Build.

## Draw and scoring rules

### Dynamic Knockout

Choose **Dynamic Knockout** for a new event with 2–128 players. This limit is checked when registering players, switching format, and starting a draw. The algorithm is generic for every integer count in that range.

Each round has `floor(N / 2)` played matches, `N % 2` BYEs, and `ceil(N / 2)` qualifiers. The initial preview shuffles everyone; Manual mode can swap opening opponents and the single BYE recipient. Confirming saves exactly the preview. After all matches in a round are confirmed, winners plus the BYE recipient are shuffled and the next round is saved automatically. Later draws are automatic. BYEs receive no score; a player may randomly receive a BYE in more than one round.

For example, 5 players progress through 5 → 3 → 2 → 1; 7 through 7 → 4 → 2 → 1; 10 through 10 → 5 → 3 → 2 → 1; and 12 through 12 → 6 → 3 → 2 → 1. Even-player rounds never have a BYE. Only generated rounds appear in the round list, with played-match, BYE, and pending-result counts. There are no fixed connections between rounds because qualifiers are reshuffled.

First-to, local A labels, and Best-of scoring remain available. Optional stage overrides use rounds remaining: final, semifinals, quarterfinals, then preliminary for earlier rounds. A new round snapshots its scoring rule when generated. The last score and the next draw are written in one SQLite transaction; failure rolls both back. Confirmed scores cannot be submitted again. Restarting reloads persisted rounds without reshuffling them.

Schema version 3 widens the allowed tournament formats transactionally without changing existing tournament rows, matches, or scoring rules. Standard knockout and round robin keep their existing behavior. Automated tests simulate every Dynamic Knockout size from 2 through 128, including complete tournaments, module reloads, duplicate submissions, and rollback. A separate test closes and reopens a file-backed SQLite connection after each result. Android process restart and upgrade testing remain necessary.

On Android, create 5-, 7-, 10-, and 12-player dynamic events, review random/manual opening draws, and confirm no next round appears before the last result. Close the app mid-round and after advancement, reopen, and finish the event. Check score targets, automatic BYEs, final champion, large text, and offline operation. Also reopen existing standard knockout and round-robin events after upgrading.

The knockout bracket expands to the next power of two. BYEs equal bracket size minus registered players; each BYE occupies a separate opening-round match. A shuffled player order randomly selects BYE recipients and pairs everyone else. Every registered player appears once. Manual mode swaps assignments to choose opponents or BYE recipients without duplicates. The confirmed order is saved exactly as previewed, without another shuffle.

For example, 5 players produce 3 BYEs and 1 match to play, leaving 4 players. With 10 players, 6 BYEs and 2 matches leave 8 players. Power-of-two counts need no BYEs. There is no special 10-player format or fixed player-count limit in the draw algorithm; device memory and rendering still limit very large events. Automated checks cover 2-128 players.

First-to and Best-of are different settings:

| Setting    | Winning target |
| ---------- | -------------- |
| First to 3 | 3 racks/frames |
| Best of 3  | 2 racks/frames |
| Best of 5  | 3 racks/frames |

The First-to label is configurable. Choosing `A` displays `A3` for first to 3, `A5` for first to 5, and so on. This is an organizer's local terminology, not an official universal Pool or Snooker rule. The UI also spells out the winning target. First-to accepts positive integer targets; Best-of accepts positive odd lengths. Scores must finish exactly at the winning target, with the opponent below it; ties, negative scores, and overshoots are rejected.

Knockout organizers may override the default rule independently for preliminary rounds, quarterfinals, semifinals, and the final. The opening round with BYEs is classified as preliminary. Later stages follow the remaining bracket rounds; stages absent from a small event are not used. Larger earlier rounds also use the preliminary rule. Unconfigured stages inherit the default. Round robin always uses its default rule for every match.

Draw preview lists opening matches, BYE recipients, matches to play, the number of players remaining afterward, and scoring by round. BYEs advance automatically with no score. New matches store their own scoring mode, value, and winning target when the draw is confirmed. Settings lock after starting, so every later score uses that saved match rule.

## Returning player registration

During tournament setup, open **Players → Add returning players**. Search names from earlier registrations, select several, and choose **Add selected players**. Selection stays available while searching; closing the picker cancels the selection without saving. Names already registered in the current event are hidden. Repeated names across past events appear once, ignoring capitalization and surrounding whitespace. This is name reuse, not a unique person identity system; two people with the same name need distinct registration names.

Each added name gets an independent player record for the new event. Editing or removing that registration does not rename players in previous tournaments or change historical matches. Source records must still exist when adding; deleted selections, repeated IDs, duplicate names, and registrations after starting are rejected. A batch is saved in one SQLite transaction or not at all. Dynamic Knockout's 128-player limit includes existing registrations and the entire selected batch. Registration order follows selection order and appends to the current roster.

No schema migration, new dependency, or backup format change is required. Returning names come from existing player rows; deleting every registration containing a name can remove it from the available list. Automated checks cover independent IDs, historical results, Unicode, duplicate handling, batch rollback, ordering, all formats, lifecycle locks, the Dynamic Knockout limit, backup restore, and file-backed restart persistence.

Expo Go emulator verification exercised the real registration screen and picker: existing-name exclusion, selection cancellation, and adding two returning names to an event with one registration. A temporary native SQLite test harness checked independent IDs, renaming the copied record without changing completed source history, backup validation, and persistence after force-stopping/reopening Expo Go. Test records were removed with an unchanged-data check. The harness is not shipped. Physical-phone testing was deferred at the owner's request; keyboard/search interactions, TalkBack, and APK acceptance still need manual testing.

## Correcting match results

Open a tournament's **Matches** view and tap a played match marked **Correct result**, or tap a played match in the standard knockout bracket. The saved scores are prefilled. Adjust them, choose **Review correction**, and confirm. To reach an earlier match, choose its round or **All rounds**. Cancel or Back leaves the saved result unchanged.

The original match target still applies. A correction that keeps the winner can change the losing score even after later rounds are played. Round-robin winner changes update standings immediately, including completed events. A knockout winner change replaces that qualifier in the existing unplayed next match, preserving pairings and scoring rules. Dynamic Knockout also follows any automatic BYE advancement into later unplayed matches without reshuffling. If an affected later match already has a confirmed result, the winner change is rejected; existing later results are never erased. A completed final can be corrected and its champion updates while the event stays completed.

BYEs and pending matches cannot use the correction operation. Stale corrections are rejected if the saved scores or opponents changed after opening the form. Every correction, including affected advancement, uses one SQLite transaction; errors roll back all changes. This feature replaces the current result and does not keep a separate edit history or offer undo. Database schema and backup format remain unchanged.

Automated tests exercise both knockout formats for every count 2–128, protected descendants, score-only corrections, champions, round-robin standings, Dynamic Knockout BYE propagation, stale edits, invalid scores, rollback, restart persistence, and backup integrity. On Android, verify opening a played match from Matches and Bracket, prefilled scores, disabled unchanged-score submission, Cancel/Back, confirmation, readable errors for blocked winner changes, refreshed standings/champion, and persistence after closing/reopening the app.

## Backup and restore

Open **Settings → Backup & restore → Export backup**, then choose a save or share destination in Android. Save the file outside CueBracket (for example in Downloads or on another device). Closing the share sheet does not confirm a saved copy. Files kept only in the app's cache are temporary and will not survive clearing app data or uninstalling. Backups contain player names and results in unencrypted JSON; choose the destination accordingly.

To restore, choose a CueBracket JSON file, review its date and record counts, then select **Import tournaments** and confirm. Imported events are added as separate copies with new IDs; existing tournaments are never replaced. Importing the same file again creates additional copies. Setup, active, and completed tournaments retain registrations, dates, scoring rules, BYEs, match progress, and results. Imported active events can continue normally. The file is validated before writing, and all import writes use one SQLite transaction. No database schema change is required.

Backup format version 1 supports files up to 10 MB, 1,000 tournaments, 10,000 player records, 50,000 registrations, and 50,000 matches per file. Unsupported versions, malformed files, invalid references, and inconsistent draws/results are rejected. These are backup safety limits, separate from the existing Dynamic Knockout limit of 128 participants. Exports exceeding these limits fail without changing stored data.

Automated restore tests cover every knockout and Dynamic Knockout size from 2–128, round robin from 2–12, continued play, scoring overrides, Unicode names, ID collisions, repeated imports, malformed files, rollback, and reopening a file-backed SQLite database. On Android, test saving through the share sheet, picker cancellation, importing a saved local file in airplane mode, preview cancellation, repeat imports, and continuing an imported event after closing/reopening the app. Verify the original event remains unchanged. Native file-provider behavior still requires device testing.

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

The automated tests cover route ID validation, tournament lifecycle redirects, stale match-link protection, and connected bracket geometry, plus real in-memory SQLite through an adapter for the Expo SQLite API. Bracket checks cover 2-128 players, several font-scale layouts, connector targets, bounds, round alignment, and preservation of input data. Connections are also checked against persisted winner advancement. Tests include deterministic random-draw/BYE distribution samples, manual assignments, both score modes, migration failure/rollback/retry from version 1, legacy score preservation, and round-robin compatibility. Alongside the original 186 complete tournament simulations, 127 additional knockout simulations cover every size from 2 through 128 with mixed round-specific rules. Tests do not open the Android device database, render native views, or simulate a native navigation stack.

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
3. Create 5- and 6-player knockout events. In Manual mode, choose players in each match and BYE slot, check that assignments swap without duplicates, confirm the draw, and play through the final. Confirm that canceling the start dialog leaves the draft editable and that going back to Players discards the draft without starting the event. In Connected Bracket, swipe sideways and scroll down to follow rounds, tap a ready match to score it, and verify the winner appears in the connected destination. Check BYEs, a two-player final, larger brackets, larger text, and the Round List alternative.
4. Complete an odd-player round robin and a scenario with tied leaders. Select first-round opponents and the resting player; verify everyone still meets once over the complete schedule. Switching from Manual to Random reshuffles the draft; review it before starting.
5. Try invalid scores, confirm valid results, and check advancement and completion.
6. Close and reopen the app; verify tournament data and scores remain available.
7. Repeat core flows in an installed APK with airplane mode enabled.
8. Check hardware Back and visible Back controls through Home, Create, Details, Settings, Players, Draw, Score, and Results. Confirm returning to Home or Details refreshes changes, canceled scores are discarded, and deleted events disappear. Check keyboard behavior, long names, larger text, screen readers, small/large displays, and status/navigation bars. Open valid and invalid `cuebracket://tournament/<id>` links, an active event's edit link, and a completed match's score link; confirm unavailable or locked pages fail safely.
9. Upgrade an installation containing existing tournaments and confirm native SQLite migration preserves results.
10. In the Tournaments tab, search using mixed case and surrounding spaces, combine status and game filters, and try a search with no results. Clear filters to restore all events. Open an event and return, complete an event or delete it, and check that the refreshed list still respects the selected filters. Check dates, large text, keyboard dismissal, and screen-reader filter labels. Verify Home statistics and ready matches refresh, and test all bottom tabs and the setup wizard's hardware Back behavior.

## Build an Android APK

The existing `eas.json` provides an internal APK profile and a production AAB profile.

Use the [Android APK acceptance guide](docs/android-acceptance.md) for source verification, build setup, safe installation, offline scenarios, and the test report. Run `npm.cmd run verify:android` before building; this verifies source and bundling, not an APK. APK acceptance is still pending.

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
  (tabs)/                     Home, tournament library, player directory, app information
    _layout.tsx               Android bottom-tab navigation
    index.tsx                 Home route (URL remains /)
  create.tsx                  Tournament creation route
  +not-found.tsx              Invalid path recovery
  tournament/[id]/            Details, settings, players, draw, results routes
    match/[matchId].tsx       Match score route
src/
  DatabaseGate.tsx            Startup, retry, and render error handling for all routes
  navigation.ts              Route ID validation and lifecycle guards
  components/TournamentRoute.tsx  Shared focus-based data loading and route recovery
  components/MatchCard.tsx    Accessible reusable match summary
  components/ReturningPlayerPicker.tsx  Search and multiple selection of returning names
  components/KnockoutBracket.tsx  Scrollable connected knockout diagram
  components/ScoringRuleEditor.tsx  First-to / Best-of rule controls
  bracket.ts                 Pure bracket layout and connector geometry
  rules.ts                   Draw summaries, scoring targets, and round-stage rules
  migrations.ts              Additive scoring schema migration
  theme.ts                    Shared colors, typography, spacing, touch and motion tokens
  presentation.ts             Scoring labels and SQLite UTC date presentation
  screens/TournamentApp.tsx   Home and searchable tournament library
  screens/PlayerDirectoryScreen.tsx    Registrations grouped by tournament
  screens/AppSettingsScreen.tsx        App, theme, and backup/import controls
  screens/TournamentDetailScreen.tsx   Details, rounds, and standings
  screens/MatchScoreScreen.tsx         Responsive score controls
  screens/TournamentResultsScreen.tsx  Champion/tied leaders and final standings
  screens/PlayersScreen.tsx   Player registration and editing form
  screens/DrawScreen.tsx      Random draw preview and direct slot selection
  screens/TournamentSettingsScreen.tsx  Shared creation and setup editing form
  db.ts                       SQLite schema, migration, CRUD, advancement, standings
  backup.ts                   Versioned backup validation and schedule integrity checks
  backupFiles.ts              Native file picker and backup sharing
  engine.ts                   Types, draws, scheduling, and validation
  ui.tsx                      Theme and reusable controls
tests/
  presentation.cjs            Scoring/date display and text-token contrast checks
  rules.cjs                   Random BYE distribution and scoring-rule checks
  bracket.cjs                 Bracket geometry and font-scale layout checks
  navigation.cjs              Route validation and lifecycle guard checks
  tournaments.cjs             Engine and SQLite regression checks
  corrections.cjs             Score correction, downstream protection, and restart checks
  players.cjs                 Reusable registrations, isolation, limits, and persistence
  backup.cjs                  Restore simulations, rollback, restart, and file API checks
app.json                      Android-only Expo configuration
eas.json                      APK and AAB build profiles
package-lock.json             Locked dependency versions
tsconfig.json                 Strict TypeScript configuration
```

## Database behavior and limitations

SQLite stores data in `cuebracket.db` on the device. Schema version 1 normalizes legacy participant positions and adds a unique position index and validation triggers while preserving existing results.

Schema version 2 adds scoring configuration and per-match scoring snapshots in a transaction. Existing tournament IDs, registrations, pairings, scores, winners, and statuses are preserved. Legacy tournaments remain Best-of; existing matches receive the corresponding legacy targets. Migration errors roll back and can be retried. The legacy `best_of` column remains an odd equivalent length for compatibility; for First-to rules the UI and saved scoring mode determine the displayed meaning. Existing tournament histories and confirmed draws are not reshuffled.

Legacy knockout draws with empty first-round matches are flagged, but their draws and recorded results are not rewritten. Create a new tournament to use the corrected BYE algorithm. Backup validation rejects inconsistent legacy draws rather than importing broken advancement; such records can also prevent a full export. Validation errors do not alter existing data. Uninstalling the application or clearing its data can remove local tournament history; save a backup outside the app beforehand.

- Player changes are allowed only during setup. Returning names can be selected in batches; each event gets independent player records. Shared legacy player records or records referenced by matches cannot be renamed, to protect other tournaments and history. Each registration creates a player record; unreferenced records are cleaned up when registrations or tournaments are removed.
- Manual draw assigns players by swapping occupied first-round slots. The number and bracket positions of knockout BYEs are automatic; their recipients can be chosen. Round robin lets you choose first-round opponents and the resting player, with later rounds generated automatically so every pair meets once. Unconfirmed draw drafts are discarded when leaving the draw screen.
- Tournament name, game, format, scoring mode, winning target, and optional round overrides can be edited during setup. Settings lock after starting or if a legacy setup event already has match records. Saving preserves player registrations, tournament identity, and creation time. Cancel and hardware Back discard unsaved changes. New events default to best-of-5; legacy match lengths are retained when editing.
- Confirmed played scores support guarded corrections; affected played descendants block winner changes. Corrections replace the current result without edit history or undo.
- Standings use alphabetical ordering only to display otherwise tied rows; ties require a manual resolution outside the application.
- Knockout events offer Connected Bracket and Round List views. The diagram shows saved pairings, BYEs, scores, and winners; it does not change tournament data. Names may be shortened visually inside diagram cards, but screen-reader labels include full names, and Round List remains available. Invalid stored match positions fall back to a message directing the organizer to Round List.
- Each view has an Expo Router route. Tournament data refreshes when a route gains focus, and invalid/deleted tournament links have recovery actions. Locked setup pages and unavailable score links redirect to valid routes. Navigation history and unsaved form drafts are not persisted across application restarts.
- Device persistence, accessibility, and fully offline APK operation still require Android acceptance testing.

## Local Git workflow

Use a separate branch for each independent feature or fix. Review the working tree and base history before branching, preserve existing work, run relevant checks, and provide a suggested conventional commit message for the owner to use.

The repository owner creates every commit and performs every push. Do not automatically commit, push, merge, delete branches, modify remote repositories, or open pull requests. Establishing the initial baseline as stable `main` requires the owner's approval before subsequent feature work.

`.gitignore` excludes dependencies, generated outputs, local databases and sidecars, local editor settings, environment files, Android packages, and common signing credentials. Review staged files for secrets even when ignore rules are present. Do not place real credentials in example environment files.
