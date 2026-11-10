const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
function load(file, dependencies = {}) {
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  new Function('exports', 'require', 'module', code)(
    module.exports,
    (name) => dependencies[name] ?? require(name),
    module,
  );
  return module.exports;
}
const engine = load('src/engine.ts');
const rules = load('src/rules.ts', { './engine': engine });
const { displayScoringLabel, createdDate } = load('src/presentation.ts', { './rules': rules });
assert.equal(displayScoringLabel({ mode: 'first_to', value: 3 }), 'First to 3');
assert.equal(displayScoringLabel({ mode: 'first_to', value: 5 }, ' A '), 'A5 · first to 5');
assert.equal(displayScoringLabel({ mode: 'best_of', value: 5 }), 'Best of 5 · first to 3');
assert.equal(
  createdDate('2026-11-10 23:30:00'),
  new Date('2026-11-10T23:30:00Z').toLocaleDateString(),
);
assert.equal(
  createdDate('2026-11-10T23:30:00+01:00'),
  new Date('2026-11-10T23:30:00+01:00').toLocaleDateString(),
);
assert.equal(createdDate('invalid'), null);

// Guard the actual token combinations used for body text and controls against contrast regressions.
const { colors } = load('src/theme.ts').theme;
function luminance(hex) {
  const channels = hex
    .slice(1)
    .match(/../g)
    .map((part) => parseInt(part, 16) / 255)
    .map((channel) => (channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4));
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}
for (const [foreground, background] of [
  [colors.white, colors.bg],
  [colors.white, colors.card],
  [colors.muted, colors.card],
  [colors.green, colors.glow],
  [colors.bg, colors.primary],
  [colors.danger, colors.raised],
  [colors.muted, colors.raised],
  [colors.gold, '#342F1B'],
  [colors.muted, '#1B3529'],
]) {
  const values = [luminance(foreground), luminance(background)].sort((a, b) => a - b);
  assert.ok((values[1] + 0.05) / (values[0] + 0.05) >= 4.5, `${foreground} on ${background}`);
}
console.log('Passed scoring-label/date presentation and WCAG AA text-token contrast checks.');
