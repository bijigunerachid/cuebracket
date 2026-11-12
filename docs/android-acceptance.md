# Android APK acceptance

Status: **Not yet tested with an installed APK.** Expo Go checks, SQLite regression tests, and Hermes exports do not establish APK acceptance.

## 1. Verify the source

From the project directory in PowerShell:

```powershell
git status --short
npm.cmd ci
npm.cmd run verify:android
```

`verify:android` runs strict TypeScript validation, formatting checks, the complete automated suite, and an Android/Hermes export into the ignored `.verification/android-release-check` directory. It does not generate an APK. Install dependencies only while Metro and other npm installs are stopped.

Record the exact source commit used for the build. If changes are uncommitted, record that fact and review the uploaded source; a commit hash alone will not identify those changes. The owner makes all commits and pushes.

## 2. Build the APK

The existing `eas.json` preview profile uses `distribution: internal` and `android.buildType: apk`. It does not set `developmentClient`, so this is the profile for testing an app without Metro or Expo Go. The production profile generates an AAB for store distribution.

```powershell
npx.cmd eas-cli@latest login
npx.cmd eas-cli@latest whoami
npx.cmd eas-cli@latest build:configure --platform android
npx.cmd eas-cli@latest build --platform android --profile preview
```

Run the cloud build when ready to upload this project's source to Expo and use your account's build allowance. The project currently has no checked-in EAS project ID; initial configuration may link/create an Expo project and update local files. Check the account and project selected by the CLI, then review any configuration changes. Do not invent a project ID. If asked for a keystore, preserve existing signing credentials for an existing app; generate credentials only for the intended new application. Never commit credentials or paste authentication tokens into the repository or test report.

Download the completed APK from its EAS build page. Internal distribution is for testing; do not submit it to a store as part of this procedure. A first APK build is still needed before any checks below can be marked passed.

References: [Expo APK builds](https://docs.expo.dev/build-reference/apk/), [build setup](https://docs.expo.dev/build/setup/), [preview profiles](https://docs.expo.dev/build/eas-json/).

## 3. Install without removing existing data

Transfer the APK to your Android phone and install it, allowing installation from the chosen source if Android asks. Launch **CueBracket**, not Expo Go. The configured Android package is `com.cuebracket.app`.

If that package is already installed, use an update signed with the same key. Do not uninstall or clear app data to work around a signature mismatch. Export and verify a backup first, and resolve the signing mismatch. Expo Go and the standalone app have separate storage; use CueBracket's JSON export/import to move tournaments rather than expecting an automatic transfer.

USB installation is optional and only needed when you choose to use ADB:

```powershell
$cueAdb = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
& $cueAdb devices
$cueDevice = 'REPLACE_WITH_YOUR_DEVICE_SERIAL'
$cueApk = 'C:\path\to\cuebracket.apk'
Get-FileHash -Algorithm SHA256 -LiteralPath $cueApk
& $cueAdb -s $cueDevice install -r $cueApk
```

`install -r` requests an update; it does not make a differently signed APK compatible. Select the intended phone explicitly when more than one device is connected. No port reversal is required for an installed preview APK.

## 4. Test matrix

Create events named `TEST APK ...` with fictional player names. Preserve existing events. Record Pass, Fail, or Not run with a short note for every row.

| Check                  | Steps and expected result                                                                                                                                                                                                                         | Result  |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| Cold offline launch    | Stop Metro. Enable airplane mode, disable Wi-Fi, force-stop CueBracket through Android Settings, then open it from its icon. No connection to a development server is required.                                                                   | Not run |
| Game and scoring setup | Create Pool and Snooker events. Check First-to 3/A3, Best-of 5, and a final-stage override. A3 means first to 3; Best-of 5 also needs 3 wins.                                                                                                     | Not run |
| Standard knockout      | Use 5 players: 3 automatic BYEs and 1 opening match to play. Inspect random/manual previews and finish to one champion. BYEs have no scores.                                                                                                      | Not run |
| Dynamic Knockout       | Use 10 players: 10 → 5 → 3 → 2 → 1. Even rounds have no BYEs; odd rounds have exactly one. No next draw appears before the current round is complete.                                                                                             | Not run |
| Manual draw            | Select opening opponents and BYE recipients. Each player appears once, and the saved draw matches the confirmed preview.                                                                                                                          | Not run |
| Round robin            | Use 5 players and complete 10 matches. Every pair meets once. Check standings and tied-leader display.                                                                                                                                            | Not run |
| Returning players      | From a new event, select several previous names. Already registered names are hidden. Test search, selection across searches, cancellation, and an empty search result. Rename a copied registration and check the earlier event stays unchanged. | Not run |
| Score validation       | Reject tied, negative, and over-target results. Confirm a valid score, then check advancement and the match's saved scoring target.                                                                                                               | Not run |
| Corrections            | Change a losing score, change a winner before the next affected match is played, and reject a winner change after that match is played. Check a corrected final champion and updated round-robin standings.                                       | Not run |
| Restart mid-round      | Record part of a round, force-stop and reopen. Scores, BYEs, player order, generated rounds, and pending matches are unchanged. Finish the event.                                                                                                 | Not run |
| History                | Reopen completed events, search/filter them, and verify scores and champions after an app restart.                                                                                                                                                | Not run |
| Backup export          | Export to an accessible local destination, confirm the JSON file exists outside the app, and cancel another export without a false success claim.                                                                                                 | Not run |
| Backup import          | While offline, pick the saved file, review its preview, cancel once, then import. Separate copies appear; originals stay unchanged. Continue an imported active event. Reject a malformed JSON file.                                              | Not run |
| Android usability      | Check keyboard open/close and hardware Back in setup, selection sheets, score forms, and confirmation dialogs. Try large text, a narrow screen, long names, and TalkBack labels.                                                                  | Not run |
| Update preservation    | With a second compatible APK signed by the same key, update using `install -r` and verify previously created events and results. One APK cannot establish upgrade acceptance.                                                                     | Not run |

Keep airplane mode enabled for the offline checks. A local Android file provider can work offline; a cloud-backed provider may need a connection. APK installation and cloud building are separate from offline app operation.

After testing, remove only events you deliberately created for this session. Keep a backup before deleting any test event that now contains data you want to retain. No real player data belongs in committed screenshots or reports.

## 5. Record the outcome

Copy this template into an ignored `.verification` file or fill it with fictional/redacted data before committing a report:

```text
Source commit / uncommitted changes:
EAS build ID / profile:
APK SHA256:
App version / Android package:
Phone model / Android version:
Test date:
Airplane mode and Metro stopped:
Checks passed / failed / not run:
Reproduction steps for each failure:
Expected result / actual result:
Screenshots or relevant error logs (redacted):
Upgrade test build IDs and result:
```

Keep unexecuted rows as **Not run**. A successful bundle, a successful cloud build, installation, and device acceptance are four separate milestones.
