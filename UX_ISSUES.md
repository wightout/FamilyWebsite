# Velvet Runway — UX Issues

Audit date: 2026-03-14

---

## 1. Non-functional Buttons

**Severity:** High

Several interactive elements have no backing logic and do nothing when clicked.

| Element | Location | Problem |
|---------|----------|---------|
| "Add Next Event" | `index.html:135` | No click handler — button is decorative |
| "Share the Calendar" | `index.html:136` | No click handler |
| "Save Entry" (logbook form) | `index.html:290` | `type="button"` with no JS — form data goes nowhere |
| "Print the Logbook" | `index.html:338` | No click handler |
| "Send an Update" | `index.html:339` | No click handler |
| Newsletter "Join Our Flight List" | `index.html:28-35` | Uses `mailto:` action — opens the user's email client instead of actually subscribing |

**Suggested fix:** Either wire up real functionality or remove/disable buttons with a "Coming soon" tooltip so users aren't left clicking dead controls.

---

## 2. Stale / Incorrect Content

**Severity:** High

### Past events displayed as current
- `index.html:239` — "Hangar Talk & Flight" is dated **Feb 7, 2026** (past).
- `index.html:245` — "A Heart for Riverside" is dated **Feb 14, 2026** (past).
- Both render with a "Past Event" badge and reduced opacity, making the section look abandoned.

### Wrong geography in hero section
- `index.html:141` — Hero meta lists **Z99 · KSQL · KOAK** as "Nearest Airfields." These are Bay Area airports, not near ZIP 91767 (Pomona, CA).
- `index.html:159-180` — "Next On The Radar" panel lists events at **San Carlos Airport**, **Hiller Aviation**, and **Oakland North Field** — all 350+ miles from the site's actual location.

**Suggested fix:** Update hero airfields to KPOC / KCCB / KRAL (matches the weather section). Replace or remove stale events.

---

## 3. Information Architecture

**Severity:** Medium

- The page leads with three dense, data-heavy sections (METAR/TAF, Sun & Twilight, Winds Aloft) before the hero at `index.html:126`.
- A first-time visitor sees raw aviation weather data before understanding what the site even is.
- The hero section ("Your family HQ for aviation adventures") provides the site's purpose and should appear first.

**Suggested fix:** Move the `<section class="hero">` block above the weather sections so visitors get context before data.

---

## 4. Mobile Navigation

**Severity:** Medium

- `index.html:19-27` — Seven navigation links in a single horizontal `<nav>` row. On screens below ~900px these will wrap awkwardly or overflow.
- The header packs **brand + nav + newsletter form** into one area with no mobile-specific layout (no hamburger menu, no collapsible nav).

**Suggested fix:** Add a hamburger toggle for screens below 768px, or collapse the nav into a dropdown.

---

## 5. Gallery Performance

**Severity:** Medium

- `index.html:302-325` — Six full-resolution JPGs (~13 MB combined) load eagerly on page load.
- No `loading="lazy"` attribute on any `<img>` tag in the gallery.
- This significantly hurts load time on mobile / slow connections, especially since the gallery is near the bottom of the page.

**Suggested fix:** Add `loading="lazy"` to all gallery `<img>` elements. Consider serving smaller thumbnails or using `srcset`.

---

## 6. Accessibility Gaps

**Severity:** Medium

### Dropdowns lack visual affordance
- `styles.css` sets `appearance: none` on `<select>` elements but provides no custom arrow/chevron icon, so users (especially on desktop) may not recognize them as dropdowns.

### Color-only flight category indicators
- The decoded METAR badges (VFR, MVFR, IFR, LIFR) rely on background color alone to convey meaning. Users with color vision deficiency cannot distinguish them.

### Scrollable table has no scroll hint
- The airport table (`index.html:198-228`) overflows horizontally on mobile but has no visual indicator (gradient fade, scroll shadow, or arrow) to signal that more content is available off-screen.

**Suggested fix:** Add a CSS chevron to selects, add an icon or pattern to flight-category badges, and add a scroll-shadow gradient to the table wrapper.

---

## 7. Form UX

**Severity:** Low

- `index.html:285` — "Date & location" uses a plain `<input type="text">` with a placeholder like "Feb 18 · Palo Alto." This should be split into a proper `<input type="date">` and a separate location field.
- No client-side validation feedback on any form (logbook or newsletter). Users get no confirmation or error messages after interaction.

**Suggested fix:** Use appropriate input types (`date`, `email`) and add inline validation messages.
