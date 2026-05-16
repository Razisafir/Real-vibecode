# Product Surface Redesign

**Phase 23** | Reference spec for all visible UI surfaces

## Sidebar

- Width: 240px (collapsible)
- Sections: collapsible, 32px headers
- Icons: 16px, `icon.muted` fill
- Background: `surface.base`
- Section dividers: 1px, `border.subtle`

## Activity Bar

- Width: 48px
- Icons: 20px, `icon.muted` fill, `icon.active` on focus
- Background: `surface.sunken`
- Active indicator: 2px left border, `accent.primary`
- Tooltip: 200ms delay, `surface.overlay` bg

## Command Surface

- Input: 32px height, `text.body` font, `surface.overlay` bg
- Results: 28px row height
- Max-height: 400px scrollable
- Background: `surface.overlay`
- Border: 1px `border.default`, 4px border-radius
- Shadow: `shadow.overlay`

## AI Panel

- Width: 320px
- Layout: message list + 80px fixed input area
- Messages: 14px font, 20px line-height
- Input: `surface.sunken` bg, 1px `border.subtle`
- Background: `surface.base`

## Execution Timeline

- Item height: 40px
- Connection lines: 1px, `border.muted`
- State dots: 8px diameter
  - Running: `accent.primary` filled
  - Success: `status.success` filled
  - Failed: `status.error` filled
  - Pending: `border.default` outline
- Labels: 11px, `text.muted`

## Status Surface

- Height: 22px
- Font: 11px, `text.muted`
- Background: `surface.sunken`
- Items: 16px icon + label pairs, 12px gap
- Left section: branch, sync
- Right section: errors, warnings, encoding, line

## Settings

- Layout: 2-column
- Labels: 160px fixed width, `text.muted`
- Controls: right column, full width
- Sections: collapsible, 28px headers
- Search: 28px input at top

## Onboarding

- Max-width: 480px, centered
- Step indicator: 6px dots, `accent.primary` active, `border.default` inactive
- Title: `text.heading`, 24px
- Body: `text.body`, 14px
- Actions: primary button + text link
- Background: `surface.base`

## Design Language

Five words: **restrained, premium, calm, technical, minimal.**

Spacing uses the 4px grid. Typography uses two weights (400, 600). Color uses the token system, never raw hex. Motion uses 150ms ease for micro, 250ms ease-out for transitions. Everything is dark-first.

## Prohibited

- NO glow effects
- NO neon colors
- NO emoji in UI
- NO oversized cards
- NO fake futurism (holograms, particle effects, "intelligent" pulsing)
- NO animation duration over 300ms
- NO more than 3 font sizes per surface
