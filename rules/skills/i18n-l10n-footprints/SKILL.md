---
name: i18n-l10n-footprints
description: Use whenever a product supports more than one language, region, or locale — adding translations, building any UI that will render non-English or RTL text, or reviewing existing multi-language support. Removes AI-translation tells and structural i18n mistakes so localized UI reads as built by someone who actually speaks the language, not machine-translated after the fact. Trigger on "translate," "add a language," "localize," "RTL," "Arabic/Hebrew support," or any `[REGION / LOCALE]` work.
---

# i18n/l10n footprints

Prime rule: localization is not "run the English strings through a
translator and swap them in." A localized product is designed for the
target language's grammar, length, and reading direction from the start
— retrofitting it is where every tell below comes from.

## Translation tells to eliminate

- **Literal machine-translation phrasing** — grammatically valid but
  nobody who actually speaks the language writes it that way (overly
  formal register where the source was casual, idioms translated word-
  for-word, English sentence structure preserved under a different
  vocabulary). Have translations reviewed by an actual speaker, not just
  round-tripped through a translation API.
- **String concatenation instead of full-sentence keys** — building a
  sentence from `t('part1') + name + t('part2')` breaks in any language
  with different word order or grammatical gender. Use full-sentence
  keys with interpolation (`t('greeting', { name })`), never assembled
  fragments.
- **Untranslated placeholder residue shipped to production** — a key
  that falls back to English or shows the raw key name (`homepage.hero.
  title`) because a locale file is incomplete. Fail loudly in dev, never
  ship a visible fallback key to a real user.
- **Pluralization handled as if every language works like English** —
  many languages have more plural forms than "one/other" (Arabic has
  six, Polish has four for different number ranges). Use the i18n
  library's real plural-rules API (ICU MessageFormat or equivalent),
  never a hardcoded `count === 1 ? singular : plural`.
- **Dates, numbers, and currency formatted with the source locale's
  conventions** — `MM/DD/YYYY` shown to a locale that expects
  `DD/MM/YYYY`, `.` vs `,` as the decimal separator, currency symbol
  placement and spacing wrong for the target locale. Use the platform's
  locale-aware formatter (`Intl.DateTimeFormat`, `Intl.NumberFormat`),
  never a hand-built string template.
- **Naming drift in locale files** — keys added inconsistently over
  time, some locales missing recently-added keys, no single source of
  truth for what strings exist. A locale file with suspiciously perfect
  key parity across every language is itself a tell if the product has
  any real history — real i18n accumulates minor drift and gets cleaned
  up periodically, not maintained in permanent lockstep.

## RTL (right-to-left) layout

- Never hardcode `left`/`right` in CSS for anything that should mirror —
  use logical properties (`margin-inline-start`, not `margin-left`) or
  an explicit `[dir="rtl"]` override.
- Icons implying direction (arrows, chevrons, "back" buttons) must
  mirror in RTL; icons with no directional meaning (a trash can, a
  checkmark) must not.
- Mixed-direction content (a phone number or English brand name inside
  an Arabic sentence) needs explicit Unicode bidi handling, not left to
  the browser's default guess.
- Test RTL with a full real screen, not just a mirrored screenshot —
  form alignment, table column order, and modal close-button position
  are the most common breakages.

## Structural i18n mistakes

- Text baked into images instead of rendered as real, translatable text.
- Fixed-width containers sized for English string lengths — German and
  Finnish routinely run 30–40% longer than the English source; a button
  or nav label that fits in English overflows or truncates elsewhere.
  Design for the longest expected translation, not the source string.
- Locale detection that only checks browser language and never lets the
  user override it, or that silently redirects based on IP-geolocated
  country when the person's actual preferred language differs from
  their location.
- Hardcoded English inside error messages, email templates, or push
  notifications that were added after the initial i18n pass — these are
  the strings most likely to get missed.

## Self-check

- Would a native speaker of the target language read this as natural,
  not translated?
- Does every plural form actually render correctly for languages with
  more than two plural categories?
- Does the layout survive a 40% longer string without breaking?
- Does RTL mirror what should mirror and leave alone what shouldn't?
- Are dates/numbers/currency locale-aware, not hardcoded to one format?

## Commands

`/i18n-audit [target]` — sweep for hardcoded strings, concatenated
sentences, unlocalized dates/numbers, and RTL violations. Report
file:line + severity.
`/l10n-review [locale]` — flag literal-translation phrasing and missing
keys for the named locale against the source language.
