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

There are no database, migration, scheduling, draw, scoring-validation, or advancement algorithm changes in these UI features. Existing `/`, `/create`, and `/tournament/:id/...` URLs remain valid; the home route lives in a pathless Expo Router tab group.

## Design system

`src/theme.ts` defines color, spacing, typography, radii, elevation, icon, touch-size, and motion tokens. The interface uses near-black/charcoal surfaces, emerald actions and winners, and reserved gold completion states. System text fonts and the bundled Feather icon font work offline. Body text is 16 points, supporting text 14, screen titles 24, and section headings 18. Touch controls are at least 48 points and wrap or stack at larger font scales.

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

## Visual polish follow-up

The first redesign still used marketing headings, a hero panel, three dashboard statistic tiles, decorative lighting, repeated rounded badges, handmade tab icons, and initial avatars on every match row. These have been replaced with compact headers, neutral surfaces, inline event counts, short status text, and match rows with aligned score columns. Active tournaments and recent history no longer repeat the same event on Home. Player-directory groups no longer nest cards. Settings uses simple sections instead of marketing panels.

All control/navigation icons use Feather from `@expo/vector-icons` through `AppIcon`, at 18/22/24 points. The package was already supplied by Expo; it is now declared directly at its installed 15.1.1 version for reliable imports. It adds no SVG native module or remote font service. Icons include home, award, users, sliders, arrow-left/right, chevron-right, plus/minus, check, repeat, and more-horizontal. Player initials remain personal identifiers rather than icon substitutes. Disabled buttons retain readable neutral labels and native disabled semantics.

### Environment and reference review

- The installed plugin-management skill was read and used to check integrations. Figma authentication succeeded; its available MCP tools support variables, components, screenshots, and library inspection. No CueBracket Figma file was supplied, and no remote design file was created or modified.
- Figma file-use instructions were inspected. The installed catalog also includes design-system, Code Connect, and design-to-code skills. No dedicated mobile UI/UX, React Native, Expo, accessibility, or visual-testing skill was found in the custom skill folder. Website-hosting and raster-generation skills were not needed for this repository task.
- Android ADB and a connected phone were available. Actual Home, score entry, and Settings screenshots were captured and viewed. Review identified a malformed home separator and low disabled-action contrast; both were corrected. No score was saved as part of this review. Full TalkBack, extreme font scaling, release APK, and complete visual acceptance remain manual checks.
- A configured phone emulator was also run headlessly in read-only mode. A temporary, non-persisting component preview exposed long-name score misalignment; shared measured name height now keeps both score columns and controls aligned. The corrected winning-score state, disabled/active actions, BYE bracket styling, and 1.3× system-font stacking were captured and viewed. The preview route was removed before handoff. These are native Expo Go visual checks, not release APK or complete TalkBack acceptance.

Reference patterns were reviewed from primary product/documentation pages, without copying assets or branding:

- [Sofascore home redesign](https://www.sofascore.com/news/sofascores-new-home-screen-a-smarter-faster-way-to-follow-sports): immediate access to matches, useful filters, and clear groupings.
- [FotMob app preview](https://www.fotmob.com/download): score-first sports information hierarchy.
- [Challonge bracket workflow](https://challonge.com/bracketgenerator): separate bracket/standings views and explicit preview status before starting.
- [Material lists](https://m3.material.io/components/lists/overview): readable primary/supporting text and purposeful trailing controls.
- [Expo icon documentation](https://docs.expo.dev/guides/icons/): bundled icon-font behavior. The existing SDK 54 icon package is retained for this scoped polish rather than migrating the app's graphics stack.
