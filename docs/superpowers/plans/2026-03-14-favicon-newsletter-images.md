# Favicon, Newsletter Integration & Image Optimization

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a favicon, replace the localStorage-only newsletter form with Formspree for real email collection, and optimize gallery images from ~12.7MB to under 1MB total.

**Architecture:** Three independent tasks that can execute in any order. Favicon is a new SVG asset + HTML `<link>` tags. Newsletter swaps the JS form handler from localStorage to a Formspree POST while keeping the same UI. Image optimization uses macOS `sips` to resize originals in-place and adds `width`/`height` attributes to `<img>` tags to prevent layout shift.

**Tech Stack:** Vanilla HTML/CSS/JS, macOS `sips` CLI for image processing, Formspree (free tier) for form submissions.

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `images/favicon.svg` | Create | SVG favicon matching the brand-mark aesthetic |
| `index.html` (lines 3-25) | Modify | Add `<link rel="icon">` tags in `<head>` |
| `index.html` (lines 46-52) | Modify | Add Formspree `action` attribute to newsletter form |
| `index.html` (lines 1212-1256) | Modify | Replace localStorage handler with Formspree fetch POST |
| `index.html` (lines 289-312) | Modify | Add `width`/`height` attributes to gallery `<img>` tags |
| `images/*.jpg` | Modify | Resize to max 1600px wide, compress to quality 80 |

---

### Task 1: Add Favicon

**Files:**
- Create: `images/favicon.svg`
- Modify: `index.html:3-25` (inside `<head>`)

The site currently has no favicon. We'll create an SVG that echoes the existing `.brand-mark` gradient (a warm amber/teal orb from the mid-century design system) and link it in the HTML head.

- [ ] **Step 1: Create the SVG favicon**

Create `images/favicon.svg` — a simple circular gradient mark using the site's brand colors (`--teal: #2a4d4f`, `--sun: #c0922a`, `--coral: #b55a3a`):

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <defs>
    <radialGradient id="g" cx="40%" cy="35%" r="60%">
      <stop offset="0%" stop-color="#c0922a"/>
      <stop offset="55%" stop-color="#b55a3a"/>
      <stop offset="100%" stop-color="#2a4d4f"/>
    </radialGradient>
  </defs>
  <circle cx="16" cy="16" r="14" fill="url(#g)"/>
</svg>
```

- [ ] **Step 2: Add favicon links to HTML `<head>`**

In `index.html`, after line 12 (`<link rel="canonical" ...>`), add:

```html
  <!-- Favicon -->
  <link rel="icon" href="images/favicon.svg" type="image/svg+xml" />
  <link rel="apple-touch-icon" href="images/favicon.svg" />
```

SVG favicons are supported by all modern browsers and scale perfectly. The `apple-touch-icon` provides iOS home-screen support.

- [ ] **Step 3: Verify in browser**

Open the site in the browser preview and confirm:
- Favicon appears in the browser tab
- The gradient circle matches the brand-mark visual identity

- [ ] **Step 4: Commit**

```bash
git add images/favicon.svg index.html
git commit -m "feat: add SVG favicon matching brand-mark gradient"
```

---

### Task 2: Integrate Formspree for Newsletter Signups

**Files:**
- Modify: `index.html:46-52` (newsletter `<form>` element)
- Modify: `index.html:1212-1256` (newsletter JS handler)

Currently the newsletter form only saves emails to `localStorage`, which means signups are lost when the user clears browser data and the family never actually receives the emails. We'll integrate Formspree's free tier (50 submissions/month) to POST form data to a real endpoint while keeping the same UX.

**Formspree setup (manual, before implementation):**
1. Go to https://formspree.io and sign up (free)
2. Create a new form — Formspree gives you an endpoint like `https://formspree.io/f/xABCDEFG`
3. Note the form ID (the `xABCDEFG` part)

- [ ] **Step 1: Update the `<form>` element**

In `index.html`, modify the newsletter form (around line 46) to add the Formspree `action` and `method` attributes:

```html
    <form class="newsletter-form" id="newsletterForm" action="https://formspree.io/f/FORM_ID" method="POST" novalidate>
      <label class="sr-only" for="newsletterEmail">Email address</label>
      <input id="newsletterEmail" name="email" type="email" placeholder="Email for the quarterly aviation roundup" required />
      <span class="newsletter-note">Quarterly newsletter with our family aviation highlights.</span>
      <button class="primary-cta" type="submit" id="newsletterBtn">Join Our Flight List</button>
      <span class="newsletter-success" id="newsletterSuccess" aria-live="polite"></span>
    </form>
```

Replace `FORM_ID` with the actual Formspree form ID from setup.

- [ ] **Step 2: Replace the JS handler with Formspree fetch POST**

Replace the entire newsletter JS section (`index.html` lines 1211-1256) with:

```javascript
    /* ========== NEWSLETTER FORM (Formspree) ========== */
    const newsletterForm = document.getElementById("newsletterForm");
    const newsletterBtn = document.getElementById("newsletterBtn");
    const newsletterEmailEl = document.getElementById("newsletterEmail");
    const newsletterSuccess = document.getElementById("newsletterSuccess");

    function setNewsletterSignedUp(msg) {
      if (!newsletterBtn || !newsletterEmailEl) return;
      newsletterBtn.textContent = "You're on the list!";
      newsletterBtn.disabled = true;
      newsletterEmailEl.disabled = true;
      if (newsletterSuccess) {
        newsletterSuccess.textContent = msg || "Thanks! We'll add you to our flight list.";
      }
      try { localStorage.setItem("velvetrunway-newsletter-done", "1"); } catch { /* ok */ }
    }

    // Restore signed-up state on page load
    if (localStorage.getItem("velvetrunway-newsletter-done")) {
      setNewsletterSignedUp();
    }

    if (newsletterForm) {
      newsletterForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const email = newsletterEmailEl ? newsletterEmailEl.value.trim() : "";
        if (!email) return;

        newsletterBtn.disabled = true;
        newsletterBtn.textContent = "Sending…";

        try {
          const resp = await fetch(newsletterForm.action, {
            method: "POST",
            headers: { "Accept": "application/json", "Content-Type": "application/json" },
            body: JSON.stringify({ email })
          });
          if (resp.ok) {
            setNewsletterSignedUp("Thanks! You're on our flight list.");
          } else {
            newsletterBtn.textContent = "Oops — try again";
            newsletterBtn.disabled = false;
          }
        } catch {
          newsletterBtn.textContent = "Oops — try again";
          newsletterBtn.disabled = false;
        }
      });
    }
```

Key changes from the old implementation:
- Removes the `NEWSLETTER_KEY` array storage (no longer storing email addresses in localStorage)
- Uses a simple boolean `velvetrunway-newsletter-done` flag instead (just to remember UI state)
- POSTs to Formspree via `fetch()` with JSON body
- Shows "Sending…" during the request for UX feedback
- Handles errors gracefully with a retry prompt
- Falls back to non-JS form submission via the `action`/`method` attributes

- [ ] **Step 3: Test the form**

1. Open the site in browser preview
2. Enter a test email and submit
3. Confirm the button changes to "Sending…" then "You're on the list!"
4. Refresh the page — confirm the form stays in signed-up state
5. Check Formspree dashboard to confirm the submission arrived

Note: If testing without a real Formspree endpoint, the fetch will fail and show "Oops — try again" — this is expected. The form's `action` attribute ensures it still works as a plain HTML form if JS fails.

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat: integrate Formspree for newsletter signups (replaces localStorage-only)"
```

---

### Task 3: Optimize Gallery Images

**Files:**
- Modify: `images/cockpit-kid-adventure.jpg` (1280×720, 117KB — skip, already small)
- Modify: `images/family-plane-portrait.jpg` (3600×2400, 894KB → resize to 1600w)
- Modify: `images/helicopter-family-visit.jpg` (5712×4284, 3.6MB → resize to 1600w)
- Modify: `images/museum-jet-moment.jpg` (4032×3024, 2.8MB → resize to 1600w)
- Modify: `images/runway-plane-portrait.jpg` (4032×3024, 2.3MB → resize to 1600w)
- Modify: `images/warbird-field-selfie.jpg` (4032×3024, 3.0MB → resize to 1600w)
- Modify: `index.html:289-312` (add `width`/`height` to `<img>` tags)

The gallery images are raw iPhone 15 Pro photos (up to 5712×4284). The gallery grid shows them at ~400-600px wide. Resizing to 1600px wide (2× retina coverage) and compressing to JPEG quality 80 will reduce total size from ~12.7MB to roughly 500KB–1MB with no visible quality loss.

- [ ] **Step 1: Resize large images using macOS `sips`**

Run these commands to resize each image wider than 1600px. `sips` preserves JPEG format and applies in-place:

```bash
cd images

# Skip cockpit-kid-adventure.jpg — already 1280px wide

# family-plane-portrait.jpg: 3600×2400 → 1600×1067
sips --resampleWidth 1600 family-plane-portrait.jpg

# helicopter-family-visit.jpg: 5712×4284 → 1600×1200
sips --resampleWidth 1600 helicopter-family-visit.jpg

# museum-jet-moment.jpg: 4032×3024 → 1600×1200
sips --resampleWidth 1600 museum-jet-moment.jpg

# runway-plane-portrait.jpg: 4032×3024 → 1600×1200
sips --resampleWidth 1600 runway-plane-portrait.jpg

# warbird-field-selfie.jpg: 4032×3024 → 1600×1200
sips --resampleWidth 1600 warbird-field-selfie.jpg
```

- [ ] **Step 2: Compress with `sips` quality setting**

`sips` doesn't support quality-on-resize directly, so re-export each at quality 80. Note: must `cd` into the images directory (shell state doesn't persist between commands):

```bash
cd "/Users/markenriquez/AI's WorkSpace/Family Website/images"
for img in family-plane-portrait.jpg helicopter-family-visit.jpg museum-jet-moment.jpg runway-plane-portrait.jpg warbird-field-selfie.jpg; do
  sips -s formatOptions 80 "$img"
done
```

- [ ] **Step 3: Verify file sizes**

```bash
ls -lh images/*.jpg
```

Expected: each file should be roughly 100-250KB (total under 1MB). If any file is still over 300KB, re-run with `formatOptions 70`.

- [ ] **Step 4: Add `width` and `height` attributes to `<img>` tags**

In `index.html`, update each gallery `<img>` tag with explicit dimensions to prevent layout shift (CLS). After resizing, the dimensions will be:

```html
          <img src="images/warbird-field-selfie.jpg" alt="Warbird Field Selfie." width="1600" height="1200" loading="lazy" decoding="async" />

          <img src="images/family-plane-portrait.jpg" alt="Family Plane Portrait." width="1600" height="1067" loading="lazy" decoding="async" />

          <img src="images/runway-plane-portrait.jpg" alt="Runway Plane Portrait." width="1600" height="1200" loading="lazy" decoding="async" />

          <img src="images/cockpit-kid-adventure.jpg" alt="Cockpit Kid Adventure." width="1280" height="720" loading="lazy" decoding="async" />

          <img src="images/museum-jet-moment.jpg" alt="Museum Jet Moment." width="1600" height="1200" loading="lazy" decoding="async" />

          <img src="images/helicopter-family-visit.jpg" alt="Helicopter Family Visit." width="1600" height="1200" loading="lazy" decoding="async" />
```

Note: Verify actual dimensions after resize with `sips -g pixelWidth -g pixelHeight images/*.jpg` and adjust height values if they differ.

- [ ] **Step 5: Verify in browser**

Open the site and scroll to the gallery:
- Images should look sharp (no visible quality loss at gallery card size)
- Lightbox should still look good at expanded size
- No layout shift when images lazy-load

- [ ] **Step 6: Commit**

```bash
git add images/*.jpg index.html
git commit -m "perf: optimize gallery images — resize to 1600w, compress to q80 (~12.7MB → <1MB)"
```

---

## Verification Checklist

After all three tasks:

- [ ] Favicon visible in browser tab
- [ ] Newsletter form submits to Formspree (check dashboard)
- [ ] Newsletter form shows signed-up state on page refresh
- [ ] Gallery images load quickly (total page size under 2MB)
- [ ] Gallery lightbox still looks sharp at expanded size
- [ ] Site works on mobile viewport (375px)
- [ ] Push to `main` and verify GitHub Pages deployment
