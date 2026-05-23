# Extension Marketplace Decision

## Decision: Hybrid Approach (Option C)

**Status:** Approved  
**Date:** May 2026

### Options Considered

**Option A: VS Code Marketplace Only**
- Pros: 40K+ extensions available immediately, zero cold-start problem, familiar to users
- Cons: Microsoft dependency, no AI-specific extension hooks, legal/branding risk, Microsoft could block access

**Option B: Separate VibeCode Marketplace**
- Pros: Full brand control, AI-native extension API, revenue from listings, curated quality
- Cons: Zero extensions on day one, chicken-and-egg problem, massive development effort

**Option C: Hybrid (Recommended)**
- Pros: Immediate extension availability via VS Code compat + curated AI extensions via VibeCode Registry
- Cons: Dual maintenance, some VS Code extensions may not work perfectly with AI kernel

### Implementation Plan

**Phase 1 (Weeks 1-4): VS Code Compatibility Layer**
- Keep existing VS Code extension loading
- Test top 100 popular extensions for compatibility
- Document known incompatibilities with AI kernel

**Phase 2 (Weeks 5-10): VibeCode Extension Registry MVP**
- Create extension registry API at registry.vibecode.dev
- Support VibeCode-specific extension APIs: `vibecode.aiExecution`, `vibecode.agentOrchestra`, `vibecode.memory`
- CLI tool for publishing: `vibecode ext publish`

**Phase 3 (Weeks 11-16): Curation & Monetization**
- Featured AI extensions section
- Extension review process for AI-safety
- Revenue sharing for paid extensions

**Phase 4 (Ongoing): Ecosystem Growth**
- Extension hackathons
- Developer documentation and SDK
- Community-contributed extensions

### Fallback Chain
When loading extensions, VibeCode checks in this order:
1. VibeCode Registry (curated AI extensions)
2. VS Code Marketplace (compat mode)
3. Open VSX Registry (open source alternative)
4. Local VSIX files
