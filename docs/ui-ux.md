# CueBracket mobile redesign

## Audit and scope

The previous interface had useful route guards, a functioning bracket, safe score confirmations, and persisted focus-based refresh. Those behaviors are retained. Its main usability problems were repeated full-width action buttons, an undifferentiated home/history screen, dense always-visible filters, small secondary text, and few visual cues for live progress or setup stages.

| Area            | Updated experience                                                                                                                                                       |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Navigation      | Home, Tournaments, Players, and Settings bottom tabs; contextual screens stay in the existing stack.                                                                     |
| Home            | Stored active events, recent events, playable pending matches, and actual event/match counts.                                                                            |
| Library         | Search, status chips, optional game filters, explicit empty/error states.                                                                                                |
| Setup           | Information, game/format, and scoring steps, followed by existing registration, preview, and native confirmation. Hardware Back moves between form steps before leaving. |
| Registration    | Compact player cards, contextual action sheet, inline validation, keyboard submission, search for larger rosters, removal confirmation.                                  |
| Draw            | Counts, distinct BYE cards, random/manual modes, searchable assignment sheet, fixed confirmation action.                                                                 |
| Live tournament | Current round and played-match progress, immediate score action, separate matches/roster/bracket/standings views, round filtering.                                       |
| Scores          | Large scores and player names, compact plus/minus controls, target/winner feedback, fixed review action and existing final confirmation.                                 |
| Results         | Highlighted champion/tied-leader presentation and retained standings.                                                                                                    |

There are no database, migration, scheduling, draw, scoring-validation, or advancement algorithm changes in this feature. No new runtime dependencies or remote services are introduced. Existing `/`, `/create`, and `/tournament/:id/...` URLs remain valid; the home route moves into a pathless Expo Router tab group.

## Design system

`src/theme.ts` defines color, spacing, typography, radii, elevation, icon, touch-size, and motion tokens. The interface combines near-black emerald backgrounds, muted surfaces, mint highlights, green primary actions, and reserved gold completion states. System fonts, native line icons, and layered translucent lighting require no downloads. Body text is 16 points; supporting text is 14. Touch controls are at least 48 points and wrap or stack at larger font scales.

`src/ui.tsx` provides AppHeader, Page with optional fixed action area, primary/secondary buttons, accessible choices/fields, StatusBadge, EmptyState, LoadingState, SetupProgress, progress bars, BottomSheet, Avatar, ScoreDisplay, responsive rows, and subtle reveal feedback. TournamentCard and PlayerCard live with the shared MatchCard. Confirmation remains native Android Alert so existing destructive/start/score safeguards stay intact.

A shared MotionProvider listens to the Android reduced-motion setting once. Screen transitions, reveals, automatic scrolls, and button opacity respect that preference. Sheets use native Modal with hardware-back dismissal, keyboard-aware layout, and screen-reader announcements. Full player names remain available in round lists and accessible match labels.

The Settings tab reports real app/storage behavior and links to tournament settings; it does not offer simulated preference toggles. The player directory groups registrations by their owning event and preserves historical edit restrictions.

## Validation and acceptance

Automated checks cover TypeScript, Prettier, presentation labels/dates, text-token contrast, navigation guards, bracket geometry, draw/scoring rules, and existing SQLite tournament simulations. JavaScript/Hermes export checks bundling, not a release APK.

Device screenshots and temporary verification output belong in ignored `.verification/`, not source control. Native smoke checks use Expo Go and do not imply release APK, TalkBack, all font scales, or complete-tournament acceptance.

During this implementation the connected Android phone was used to inspect Home/library rendering, keyboard entry, the three initial setup steps, fixed-action placement, and hardware Back with draft preservation. The draft was not saved. The automated regression suite and Android/Hermes export passed; text-token contrast and scoring/date display checks passed separately.

Before release, verify:

1. Every bottom tab, keyboard dismissal, deep links, and hardware/visible Back navigation. Back within setup must retain the draft and return to the previous step.
2. Register many players; search, edit a long name, cancel edits, remove with confirmation, and check inline duplicate-name errors. Continue must stay accessible while the roster scrolls.
3. Preview all three tournament formats. Swap players and BYE recipients, search the sheet, dismiss via hardware Back, reshuffle, and cancel the final start dialog.
4. Complete even/odd Dynamic Knockout rounds, a standard bracket, and round robin. Check current/all-round views, bracket scrolling, winner indicators, standings, and champion/tied-leader results.
5. Increment/decrement scores, test ties and targets, cancel confirmation, and save valid results. The fixed action must remain reachable on small screens and at large font sizes.
6. Test empty/error/retry states, TalkBack focus in action sheets, Android reduced motion, long names, and small/large displays.
7. Reopen existing histories and test an installed APK in airplane mode. Android system navigation-bar appearance must be verified in a rebuilt APK; Expo Go controls its own native shell.

The owner makes all commits and pushes. This redesign remains a single reviewable feature branch; it does not merge or publish anything.
