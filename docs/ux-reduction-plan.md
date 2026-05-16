# UX Service Reduction Plan

**Phase 23** | Status: Proposed

## Current State

30 UX services exist from Phases 13-16. Most model behavior but do not render. The service layer is overbuilt relative to what ships in the product.

## Proposed Merge: 30 -> 8 Systems

| Merged System | Absorbs |
|---|---|
| Visual | SignatureIdentityService, SignatureProductFeelService, VisualLanguageService |
| Motion | CinematicMotionService, MotionSystemService, PerceivedPerformanceService |
| Interaction | PremiumInteractionsService, AdaptiveInterfaceService, ExpertModeService, AutonomyTrustService |
| Cognitive | CognitiveLoadSystemService, FlowStatePreservationService, EmotionalFrictionService |
| Layout | LayoutArchitectureService, PanelHierarchyService, ContextualMinimalismService |
| AISurface | AISurfaceExperienceService, AITransparencyService, ProgressiveDisclosureService |
| Feedback | ExperienceStateSurfaceService, FeedbackLoopService, WorkRhythmService |
| Navigation | EditorDominanceService, EditorFirstPhilosophyService, IntentPersistenceService |

## 9 Deletion Candidates

These services have zero render participation and no downstream consumers:

1. SignatureIdentityService (identity is tokens, not a service)
2. SignatureProductFeelService (feel is motion+visual, not separate)
3. CinematicMotionService (over-engineered, basic transitions suffice)
4. ExperienceStateSurfaceService (no surface renders from this)
5. SystemConsciousnessModelService (not a UX concern)
6. EmotionalFrictionService (unmeasurable, no DOM output)
7. WorkRhythmService (no user-facing behavior)
8. IntentPersistenceService (persistence is a data layer concern)
9. WorkspaceMemoryService (memory is a runtime concern)

## 4 Fake Adaptive Services

These claim to adapt the UI based on user behavior but contain no adaptation logic:

1. **AdaptiveInterfaceService** -- defines types, never reads user state
2. **ProgressiveDisclosureService** -- defines disclosure levels, never transitions between them
3. **ExpertModeService** -- defines expert behaviors, never detects expertise
4. **AutonomyTrustService** -- defines trust levels, never measures trust

## 6 Duplicate Pairs

| Pair | Overlap |
|---|---|
| SignatureIdentityService / SignatureProductFeelService | Both define visual identity |
| CinematicMotionService / MotionSystemService | Both define motion |
| EditorFirstPhilosophyService / EditorDominanceService | Both constrain UI to editor priority |
| ContextualMinimalismService / FlowStatePreservationService | Both reduce UI density |
| AdaptiveInterfaceService / ProgressiveDisclosureService | Both conditionally show/hide UI |
| ExperienceStateSurfaceService / FeedbackLoopService | Both communicate system state |

## Reduction Target

**60% reduction: 30 -> 12 services**

8 merged systems + 4 standalone services that earn their independence (IconRegistry, DesignTokenSystem, ComponentStandards, SurfaceMaterials).

## Honest Assessment

Most UX services model behavior in TypeScript but do not render. They are specifications dressed as services. The reduction is not just cleanup -- it is an admission that 30 services for a UI that currently looks like stock VS Code is absurd. The target of 12 still may be high. Ship fewer things that actually render.
