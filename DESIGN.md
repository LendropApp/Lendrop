---
name: Lendrop
description: Peer-to-peer rentals in El Salvador, handed off through lockers.
colors:
  deep-purple: "#433075"
  lavender: "#a58cf4"
  soft-white: "#fafafa"
  jet-black: "#0d0d0d"
  surface: "#ffffff"
  surface-raised: "#f4f3f7"
  text-muted: "#5d5a6b"
  border: "#e6e5ec"
  steel: "#b9b7c2"
  cta-dark: "#7050d4"
  success: "#1d6b45"
  danger: "#b42318"
typography:
  display:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(3rem, 8vw, 6rem)"
    fontWeight: 800
    lineHeight: 0.98
    letterSpacing: "-0.025em"
    fontVariation: "'wdth' 125"
  headline:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: "-0.025em"
    fontVariation: "'wdth' 125"
  title:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 700
    letterSpacing: "-0.015em"
    fontVariation: "'wdth' 112"
  body:
    fontFamily: "Manrope, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
  number:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontWeight: 800
    fontFeature: "'tnum'"
    fontVariation: "'wdth' 125"
  code:
    fontFamily: "JetBrains Mono, ui-monospace, monospace"
    fontWeight: 400
    letterSpacing: "0.05em"
    fontFeature: "'tnum'"
rounded:
  lg: "8px"
  xl: "10px"
  2xl: "12px"
  3xl: "14px"
spacing:
  gutter: "24px"
  gutter-sm: "40px"
  section: "80px"
  section-lg: "112px"
components:
  button-primary:
    backgroundColor: "{colors.deep-purple}"
    textColor: "{colors.soft-white}"
    rounded: "{rounded.xl}"
    padding: "12px 24px"
  button-primary-dark:
    backgroundColor: "{colors.cta-dark}"
    textColor: "{colors.soft-white}"
    rounded: "{rounded.xl}"
    padding: "12px 24px"
  stamp:
    backgroundColor: "{colors.lavender}"
    textColor: "{colors.jet-black}"
    rounded: "{rounded.lg}"
    padding: "6px 12px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.jet-black}"
    rounded: "{rounded.xl}"
    padding: "10px 16px"
  panel:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.2xl}"
    padding: "24px"
---

# Design System: Lendrop

## Overview

**Creative North Star: "The Lettered Shutter"**

Lendrop's handoff is a locker door opening, so the brand is drawn from the roll-down metal shutters of Salvadoran storefronts and the sign-painted lettering on them, redrawn with machined precision. Brand moments are flat Deep Purple fields ribbed like shutter steel, carrying wide, heavy lettering. The one signature motion is the shutter rolling up to reveal what is behind it.

Everything else is quiet. App screens are plain Soft White or Jet Black grounds with solid panels, hairline borders and purple used precisely. Real item photos and real states (statuses, prices, PINs, locker events) carry the interface; there is no decorative imagery.

The system rejects the aurora/glass look on app screens: no frosted panels, no glowing blobs, no gradient washes, no lavender halos. Two deliberate exceptions: primary buttons keep the brand gradient, and the login, signup and password screens keep their original animated backdrop (the locker wall, drifting aurora and sliding tabs).

**Key Characteristics:**
- Flat Deep Purple shutter fields with a ribbed steel texture, only on brand moments
- Expanded Archivo lettering at sign scale; numbers set as part of the lettering
- One Lavender stamp for anything the user has selected
- Rental states shown as a shape plus a word, never colour alone
- Solid panels, hairline borders, small machined radii

## Colors

Two brand purples do all the expressive work; everything else is neutral.

### Primary
- **Shutter Purple** (deep-purple): the shutter field, the primary button fill in light mode, and `primary` text/icons in light mode (10.5:1 on Soft White).
- **Dark-mode CTA Purple** (cta-dark): the primary button fill in dark mode, where Shutter Purple would sink into black. White text on it measures 5.3:1.

### Secondary
- **Stamp Lavender** (lavender): the selection stamp, and `primary` text/icons in dark mode (7.1:1 on Jet Black). In light mode it is a fill only, never text (2.6:1).

### Neutral
- **Soft White** (soft-white) / **Jet Black** (jet-black): page grounds for light and dark, and each other's text colour.
- **Panel White** (surface) and **Raised Grey** (surface-raised): panels and insets in light mode; dark mode steps up from black (#16161a, #1f1f25).
- **Muted Ink** (text-muted): secondary text (6.4:1 light, 5.5:1 dark as #8a8797).
- **Hairline** (border): every divider and panel edge.
- **Shutter Steel** (steel): scrollbar thumbs and texture only, never text.
- **Success Green** (success) and **Alert Red** (danger): status text and message tints, with soft backgrounds per theme.

### Named Rules
**The Stamp Rule.** Lavender with black text means "selected". Use it for chosen segments, categories, dates and lockers, and for nothing else.

**The Shutter Is Always Dark Rule.** The shutter field stays purple in both themes (#433075 light, #2a1f4d dark); only panels and grounds follow the theme.

## Typography

**Display Font:** Archivo, loaded with its width axis (with ui-sans-serif)
**Body Font:** Manrope (with ui-sans-serif)
**Label/Mono Font:** JetBrains Mono, for locker codes, PINs and timestamps only

**Character:** Archivo stretched to 125% width reads as painted shop lettering; Manrope underneath keeps body text calm and legible.

### Hierarchy
- **Display** (800, up to 6rem, 0.98): the hero line on the shutter and closing bands.
- **Headline** (800, 1.875–3rem, 1.1): section headings, fully expanded.
- **Title** (700, 1rem): card and step titles, 112% width.
- **Body** (400, 1rem, 1.6): paragraphs, capped around 48–60ch.
- **Number** (800, tabular): prices, counts and step numbers at sign scale.
- **Code** (400, tabular, 0.05em tracking): locker codes, PINs, log timestamps.

### Named Rules
**The Sign Scale Rule.** Prices, dates and PINs are lettering, not body text: set them in the number or code style, large, never buried in a sentence.

**The No Eyebrow Rule.** Headings stand alone. No uppercase labels above them.

## Layout

Content sits in a 72rem (max-w-6xl) container with 24px side gutters, 40px from the small breakpoint. Sections are separated by hairline borders and 80–112px of vertical space. Brand pages alternate a shutter band, a two-column split, and plain sections; app screens use a sticky header and a single column (max-w-3xl) with a fixed bottom bar on mobile. Layouts collapse to one column below 768px.

## Elevation & Depth

Mostly flat. Depth comes from solid panels on a contrasting ground and hairline borders; shadows are reserved for floating panels.

### Shadow Vocabulary
- **Hairline** (`0 1px 2px rgb(13 13 13 / 0.12)`): small raised controls.
- **Panel** (`0 2px 4px rgb(13 13 13 / 0.06), 0 8px 20px -6px rgb(67 48 117 / 0.18)`): menus and raised cards.
- **Floating** (`0 4px 8px rgb(13 13 13 / 0.06), 0 20px 40px -12px rgb(67 48 117 / 0.24)`): the auth panel on the shutter.

### Named Rules
**The One Edge Rule.** A panel gets a border or a shadow, not a border under a wide soft shadow, except a floating panel over the shutter.

## Shapes

Cut-metal corners: 8px for small controls, 10px for buttons and inputs, 12px for panels, 14px at most. Pills are only for avatars and dots. The shutter texture is 14px horizontal ribs, each a 1px lit top edge and a 2px shaded bottom edge.

## Components

### Buttons
- **Shape:** gently cut corners (10px).
- **Primary:** the brand gradient, left to right from Shutter Purple (#433075) to Dark-mode CTA Purple (#7050d4), with Soft White text (5.3:1 at the light end), the same in both themes. Hover brightens it slightly. It never runs to Lavender: white text fails there.
- **Every action button uses it:** primary and secondary actions alike (Log in, Sign up, Search, Message host, Cancel). Hierarchy comes from size and weight: the one main action on a screen is larger and bolder.
- **On the shutter:** the same gradient with a thin white ring (white at 30%) so it separates from the purple field.
- **Not buttons in this sense:** selection chips and toggles take the Lavender stamp, icon-only buttons stay neutral, and destructive confirmations stay red.

**The One Gradient Rule.** If it performs an action and has a text label, it wears the brand gradient.

### Chips
- **Style:** hairline border on a panel fill, 8px corners, category icon in primary.
- **State:** selected chips take the Lavender stamp.

### Cards / Containers
- **Corner Style:** 12px.
- **Background:** panel colour on the page ground.
- **Shadow Strategy:** none at rest; see Elevation.
- **Border:** hairline.
- **Internal Padding:** 16–24px.

### Inputs / Fields
- **Style:** hairline border, panel fill, 10px corners, Muted Ink placeholder.
- **Focus:** a 2px primary outline, offset 2px, used for every focusable element.
- **Error:** message below in Alert Red on its soft tint, with an alert icon.

### Navigation
- **Header:** sticky, solid panel with a bottom hairline; logo mask filled with primary; links in Muted Ink turning primary on hover.
- **Mobile:** a two-action bottom bar (Publish, Profile) and a drawer for everything else.

### Shutter
A ribbed Shutter Purple panel lettered with a label that rolls up once (1.1s, `cubic-bezier(0.7, 0, 0.2, 1)`, 350ms delay) to reveal the content beneath. The content is always rendered and readable; with reduced motion the shutter never appears. Use it for reveals only: the hero compartment, a confirmed rental, a pickup PIN.

### Rental Status
A 12px shape plus a label: hollow circle pending, filled square confirmed, triangle active, ticked square completed, struck circle cancelled, diamond disputed.

## Do's and Don'ts

### Do:
- **Do** put the shutter texture only on shutter bands and reveal moments.
- **Do** give every labelled action button the brand gradient; use size and weight, not a different style, for hierarchy.
- **Do** use the Lavender stamp for every selected state, the same way everywhere.
- **Do** show rental states with the Rental Status shape and label.
- **Do** label sample or illustrative data on the page.

### Don't:
- **Don't** use frosted glass, backdrop blur, glowing blobs or gradient washes outside the auth screens. The primary-button gradient is the only gradient elsewhere.
- **Don't** use Lavender as text in light mode.
- **Don't** put uppercase eyebrow labels above headings.
- **Don't** use monospace for anything but codes, PINs and timestamps.
- **Don't** publish invented counts, ratings or testimonials.
