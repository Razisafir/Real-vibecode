# UI Migration Plan

> Phase 12 — Real Vibecode AI-Native IDE
> Component Audit Results, Migration Timeline, and Priority Ordering

This document catalogs the results of the Phase 12 component audit, classifies each component's compliance status, and defines the migration timeline and steps to bring every component into the design system.

---

## Table of Contents

1. [Audit Methodology](#audit-methodology)
2. [Compliance Classifications](#compliance-classifications)
3. [Component Audit Results](#component-audit-results)
4. [Migration Timeline](#migration-timeline)
5. [Priority Ordering](#priority-ordering)
6. [Migration Steps Per Component](#migration-steps-per-component)
7. [Risk Assessment](#risk-assessment)
8. [Success Criteria](#success-criteria)

---

## Audit Methodology

### Audit Process

The component audit was performed using the `IDesignSystemService` consistency enforcer:

1. **Static scan** — Parse all component source files for raw hex colors, inline styles, and arbitrary spacing
2. **Runtime check** — Run `runConsistencyCheck()` against rendered components
3. **Manual review** — Visual inspection of each component for design system adherence
4. **Token mapping** — Verify each component's visual properties map to design tokens

### Audit Scope

| Category | Components Audited |
|----------|-------------------|
| Buttons | 8 variants |
| Panels | 6 variants |
| Inputs | 4 variants |
| Sidebar items | 3 variants |
| Status indicators | 6 levels |
| AI indicators | 5 types |
| Navigation | 2 components |
| Tabs | 3 variants |
| Modals/Dialogs | 4 variants |
| Notifications | 3 variants |
| Tooltips | 2 variants |
| Menu items | 3 variants |
| **Total** | **49 components** |

---

## Compliance Classifications

### Three-Tier System

| Classification | Symbol | Meaning | Action Required |
|---------------|--------|---------|-----------------|
| Replace | ❌ | Must be replaced — inconsistent styling, no design token usage | Full rewrite using design system tokens |
| Partial | ⚠️ | Partially compliant — uses some tokens but has violations | Targeted fixes for specific violations |
| Compliant | ✅ | Compliant — follows design system fully | No changes needed |

### Classification Criteria

| Criterion | ❌ Replace | ⚠️ Partial | ✅ Compliant |
|-----------|-----------|------------|-------------|
| Raw hex colors | >3 instances | 1-3 instances | 0 instances |
| Spacing violations | >5 instances | 1-5 instances | 0 instances |
| Typography violations | >3 instances | 1-3 instances | 0 instances |
| Missing interaction states | Any critical | Non-critical only | All present |
| Elevation violations | Any | None | None |
| Z-index violations | Any | None | None |

---

## Component Audit Results

### Button Components (8 variants)

| Component | Classification | Issues |
|-----------|---------------|--------|
| Primary Button (Sm) | ⚠️ Partial | 2 raw hex, 1 spacing violation |
| Primary Button (Md) | ⚠️ Partial | 2 raw hex, 1 spacing violation |
| Primary Button (Lg) | ⚠️ Partial | 2 raw hex, 1 spacing violation |
| Secondary Button (Md) | ❌ Replace | 4 raw hex, 3 spacing violations, missing hover transition |
| Ghost Button (Md) | ❌ Replace | 3 raw hex, missing hover state, arbitrary border-radius |
| Danger Button (Md) | ⚠️ Partial | 1 raw hex, missing confirmation dialog |
| Icon Button | ❌ Replace | 5 raw hex, no design tokens, arbitrary sizing |
| Split Button | ❌ Replace | 6 raw hex, 4 spacing violations, no tokens |

### Panel Components (6 variants)

| Component | Classification | Issues |
|-----------|---------------|--------|
| Flat Panel | ✅ Compliant | Already uses design tokens |
| Raised Panel | ⚠️ Partial | 1 raw hex in border, custom shadow |
| Elevated Panel | ❌ Replace | 3 raw hex, custom box-shadow, no elevation token |
| Overlay Panel (Modal) | ❌ Replace | 4 raw hex, 2 spacing violations, wrong z-index |
| Side Panel | ⚠️ Partial | 2 raw hex in header, missing enter/exit animation |
| Bottom Panel | ⚠️ Partial | 1 raw hex, missing resize animation |

### Input Components (4 variants)

| Component | Classification | Issues |
|-----------|---------------|--------|
| Text Input | ⚠️ Partial | 2 raw hex, missing focus ring animation |
| Search Input | ❌ Replace | 4 raw hex, arbitrary padding, no design tokens |
| Textarea | ❌ Replace | 3 raw hex, arbitrary font-size, missing tokens |
| Select/Dropdown | ❌ Replace | 5 raw hex, 3 spacing violations, custom shadows |

### Sidebar Components (3 variants)

| Component | Classification | Issues |
|-----------|---------------|--------|
| File Explorer | ⚠️ Partial | 2 raw hex, tree indentation not using spacing scale |
| AI Panel | ❌ Replace | 6 raw hex, no AI-specific tokens, arbitrary layout |
| Search Panel | ⚠️ Partial | 1 raw hex, section headers not using typography scale |

### Status Indicator Components (6 levels)

| Component | Classification | Issues |
|-----------|---------------|--------|
| Success Indicator | ✅ Compliant | Already uses design tokens |
| Warning Indicator | ✅ Compliant | Already uses design tokens |
| Error Indicator | ⚠️ Partial | 1 raw hex in background |
| Info Indicator | ✅ Compliant | Already uses design tokens |
| Idle Indicator | ⚠️ Partial | Missing subtle background variant |
| Active Indicator | ⚠️ Partial | Missing pulse animation token |

### AI-Specific Components (5 types)

| Component | Classification | Issues |
|-----------|---------------|--------|
| Kernel Status | ❌ Replace | 4 raw hex, no AI-specific tokens, arbitrary sizing |
| Agent Indicator | ❌ Replace | 3 raw hex, no AI tokens, missing planning state |
| Process Runner | ❌ Replace | 5 raw hex, no AI tokens, custom progress bar |
| Intent Status | ⚠️ Partial | 2 raw hex, missing blocked state token |
| Mutation Annotation | ❌ Replace | 3 raw hex, no annotation token, arbitrary opacity |

### Other Components

| Component | Classification | Issues |
|-----------|---------------|--------|
| Navigation Bar | ⚠️ Partial | 2 raw hex, icon sizes not standardized |
| Editor Tabs | ⚠️ Partial | 1 raw hex, missing tab indicator animation |
| Context Menu | ❌ Replace | 4 raw hex, 2 spacing violations, wrong z-index |
| Command Palette | ❌ Replace | 5 raw hex, 3 spacing violations, no tokens |
| Notification Toast | ⚠️ Partial | 2 raw hex, missing spring animation |
| Tooltip | ✅ Compliant | Already uses design tokens |
| Title Bar | ✅ Compliant | Already uses design tokens |
| Status Bar | ⚠️ Partial | 2 raw hex for AI status, missing AI tokens |

### Audit Summary

| Classification | Count | Percentage |
|---------------|-------|-----------|
| ❌ Replace | 16 | 32.7% |
| ⚠️ Partial | 23 | 46.9% |
| ✅ Compliant | 10 | 20.4% |
| **Total** | **49** | **100%** |

---

## Migration Timeline

### Phase 12 Migration Schedule

```
Week 1: Critical ❌ components (high user impact)
Week 2: High ⚠️ components + remaining ❌ components
Week 3: Medium ⚠️ components + verification
Week 4: Low ⚠️ components + polish pass + final validation
```

### Week 1 — Critical Replacements (Day 1–7)

| Day | Components | Priority |
|-----|-----------|----------|
| 1 | Icon Button, Split Button | Critical |
| 2 | Command Palette, Context Menu | Critical |
| 3 | Overlay Panel (Modal) | Critical |
| 4 | Search Input, Select/Dropdown | Critical |
| 5 | Kernel Status, Agent Indicator | Critical |
| 6 | Process Runner, Mutation Annotation | Critical |
| 7 | AI Panel | Critical |

### Week 2 — High Priority Fixes (Day 8–14)

| Day | Components | Priority |
|-----|-----------|----------|
| 8 | Secondary Button, Ghost Button | High |
| 9 | Elevated Panel, Textarea | High |
| 10 | Primary Buttons (Sm/Md/Lg) | High |
| 11 | Danger Button, Side Panel, Bottom Panel | High |
| 12 | File Explorer, Search Panel | High |
| 13 | Notification Toast | High |
| 14 | Status Bar AI integration | High |

### Week 3 — Medium Priority + Verification (Day 15–21)

| Day | Components | Priority |
|-----|-----------|----------|
| 15 | Error Indicator, Idle Indicator, Active Indicator | Medium |
| 16 | Intent Status, Text Input | Medium |
| 17 | Raised Panel | Medium |
| 18 | Navigation Bar, Editor Tabs | Medium |
| 19 | Cross-component integration testing | — |
| 20 | Theme switching verification (dark/light) | — |
| 21 | Consistency check across all migrated components | — |

### Week 4 — Polish + Final Validation (Day 22–28)

| Day | Activity | Priority |
|-----|----------|----------|
| 22 | Remaining ⚠️ component fixes | Low |
| 23 | Spacing normalization pass | — |
| 24 | Icon consistency pass | — |
| 25 | Motion consistency pass | — |
| 26 | Full consistency check | — |
| 27 | Accessibility audit (focus, contrast, motion) | — |
| 28 | Final validation + documentation update | — |

---

## Priority Ordering

### Priority Levels

| Priority | Criteria | Timeline |
|----------|---------|----------|
| **Critical** | User-facing, high-traffic components with >3 raw hex colors or missing interaction states | Week 1 |
| **High** | Important components with 2-3 violations or missing tokens | Week 2 |
| **Medium** | Secondary components with 1-2 minor violations | Week 3 |
| **Low** | Edge-case components with cosmetic issues only | Week 4 |

### Priority List (Ordered)

1. ❌ Command Palette — highest traffic, most visible
2. ❌ Context Menu — second highest traffic
3. ❌ Icon Button — used in every toolbar
4. ❌ AI Panel — core differentiating feature
5. ❌ Kernel Status — AI status visibility
6. ❌ Search Input — high frequency use
7. ❌ Select/Dropdown — high frequency use
8. ❌ Process Runner — AI execution visibility
9. ❌ Mutation Annotation — editor integration
10. ❌ Agent Indicator — AI feedback
11. ❌ Overlay Panel (Modal) — affects all dialogs
12. ❌ Elevated Panel — popover appearance
13. ❌ Split Button — toolbar actions
14. ❌ Textarea — code input
15. ⚠️ Secondary Button — common action button
16. ⚠️ Ghost Button — toolbar button
17. ⚠️ Primary Buttons — main CTA
18. ⚠️ File Explorer — primary navigation
19. ⚠️ Notification Toast — user feedback
20. ⚠️ Status Bar — persistent visibility

---

## Migration Steps Per Component

### For ❌ Replace Components

Every component marked for replacement follows this 7-step process:

#### Step 1: Document Current Behavior

```
Component: [name]
Current styling: [list all CSS properties]
Raw hex colors: [list each]
Spacing values: [list each]
Interaction states: [list existing/missing]
```

#### Step 2: Map to Design Tokens

```
Raw hex → ColorToken
Raw spacing → Spacing enum
Raw font-size → TypographySize enum
Custom shadow → Elevation enum
Custom z-index → ZIndex enum
Custom transition → MotionDuration + MotionEasing
```

#### Step 3: Get Component Tokens

```typescript
const tokens = designSystem.getButtonTokens(ButtonVariant.Primary, ButtonSize.Md);
// or getPanelTokens, getInputTokens, getSidebarTokens, getStatusIndicatorTokens
```

#### Step 4: Implement Token-Based Rendering

```typescript
// Replace all raw values with token resolutions
element.style.backgroundColor = designSystem.resolveColor(tokens.backgroundColor);
element.style.color = designSystem.resolveColor(tokens.textColor);
element.style.padding = `${designSystem.getSpacing(tokens.paddingY)}px ${designSystem.getSpacing(tokens.paddingX)}px`;
element.style.fontSize = `${tokens.fontSize}px`;
element.style.boxShadow = designSystem.getElevationShadow(tokens.elevation);
```

#### Step 5: Add Interaction States

```typescript
// Add hover, focus, active states using IInteractionStateSpec
element.addEventListener('mouseenter', () => {
    element.style.backgroundColor = designSystem.resolveColor(tokens.hoverBackgroundColor);
});
element.addEventListener('focus', () => {
    element.style.outline = `2px solid ${designSystem.resolveColor(ColorToken.AccentPrimary)}`;
    element.style.outlineOffset = '2px';
});
```

#### Step 6: Add Motion

```typescript
// Add transitions using MotionDuration and MotionEasing
element.style.transition = [
    `background-color ${MotionDuration.Fast}ms ${MotionEasing.Default}`,
    `border-color ${MotionDuration.Fast}ms ${MotionEasing.Default}`,
    `box-shadow ${MotionDuration.Fast}ms ${MotionEasing.Default}`
].join(', ');
```

#### Step 7: Validate

```typescript
const result = designSystem.checkElement(element.id);
if (!result.passed) {
    console.error('Migration incomplete:', result.violations);
}
```

### For ⚠️ Partial Components

Partial components follow a simplified 4-step process:

#### Step 1: Identify Violations

```typescript
const result = designSystem.checkElement(componentId);
// result.violations lists specific issues
```

#### Step 2: Fix Each Violation

```
For each violation:
  - Replace raw hex with resolveColor(ColorToken.xxx)
  - Replace invalid spacing with getSpacing(Spacing.xxx)
  - Add missing interaction state with IInteractionStateSpec
  - Replace custom shadow with getElevationShadow(Elevation.xxx)
```

#### Step 3: Re-validate

```typescript
const recheck = designSystem.checkElement(componentId);
assert(recheck.passed, 'All violations should be resolved');
```

#### Step 4: Visual Regression Test

Compare before/after screenshots to ensure visual parity (or intentional improvement).

---

## Risk Assessment

### High Risk Migrations

| Component | Risk | Mitigation |
|-----------|------|------------|
| Command Palette | High traffic, many edge cases | Incremental rollout, feature flag |
| AI Panel | Complex state, dynamic rendering | Separate branch, thorough testing |
| Mutation Annotation | Editor integration, performance | Profile before/after, measure FPS |
| Context Menu | Platform-specific behavior | Test on all platforms (Win/Mac/Linux) |

### Medium Risk Migrations

| Component | Risk | Mitigation |
|-----------|------|------------|
| Modal/Overlay | Focus trap, keyboard navigation | Accessibility testing required |
| Select/Dropdown | Complex interaction patterns | State machine validation |
| Process Runner | Continuous animation performance | Monitor frame budget |

### Low Risk Migrations

| Component | Risk | Mitigation |
|-----------|------|------------|
| Buttons | Simple, well-tested tokens | Standard migration |
| Status Indicators | Small, isolated components | Quick fix |
| Panels | Mostly tokenized already | Minor adjustments |

### Rollback Strategy

1. Each migration is on a feature flag: `designSystem.v2.[component]`
2. If a migrated component causes issues, disable the flag to revert
3. Feature flags are removed after 2 weeks of stable production use
4. All migrations are backwards-compatible with the old styling during rollout

---

## Success Criteria

### Quantitative Goals

| Metric | Target | Measurement |
|--------|--------|-------------|
| ❌ Replace components | 0 remaining | Component audit count |
| ⚠️ Partial components | 0 remaining | Component audit count |
| ✅ Compliant components | 49/49 (100%) | Component audit count |
| Raw hex violations | 0 | `runConsistencyCheck()` |
| Spacing violations | 0 | `runConsistencyCheck()` |
| Missing interaction states | 0 | `runConsistencyCheck()` |
| Consistency check pass rate | 100% | `runConsistencyCheck().passed` |

### Qualitative Goals

1. **Visual consistency** — All buttons look like they belong to the same system
2. **Theme coherence** — Dark/light themes feel equally polished
3. **Motion consistency** — Interactions feel predictable and smooth
4. **AI status clarity** — Kernel, agent, process, intent states are instantly readable
5. **Accessibility compliance** — All components pass WCAG 2.1 AA

### Verification Checklist

- [ ] All 16 ❌ Replace components migrated
- [ ] All 23 ⚠️ Partial components fixed
- [ ] 0 raw hex colors in UI code
- [ ] 0 spacing violations
- [ ] 0 typography violations
- [ ] All interactive elements have hover/focus/active states
- [ ] All animations use MotionDuration + MotionEasing tokens
- [ ] Dark theme renders correctly for all components
- [ ] Light theme renders correctly for all components
- [ ] `runConsistencyCheck()` returns `passed: true`

---

## Reference

- **Source**: `src/vs/workbench/services/aiExecution/common/designSystem.ts`
- **Enums**: `ComponentCompliance`, `DesignViolationType`, `ViolationSeverity`
- **Interfaces**: `IComponentAuditResult`, `IDesignViolation`, `IConsistencyCheckResult`
- **Service**: `IDesignSystemService`
