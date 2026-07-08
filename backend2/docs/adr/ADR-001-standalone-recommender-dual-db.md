# ADR-001: Standalone Recommender Service with Dual Database Strategy

**Status**: Accepted  
**Date**: 2026-07-08  
**Branch**: feat/standalone-recommender-dual-db  

---

## Context

The current recommendation engine is tightly embedded inside `app/routers/recommendations.py`.
It scores every candidate for every job posting in-process, inside the request-response cycle.
As the candidate and job-posting volumes grow, this pattern will:
- Block request threads during large full-table scans
- Make it impossible to experiment with alternative scoring algorithms without a full deploy
- Prevent independent scaling of the recommendation compute layer

## Decision

Extract the recommendation engine into a standalone, independently deployable service with:
1. A dedicated **recommender database** that stores pre-computed scores, feature snapshots, feedback, and algorithm config
2. A **RecommendationGateway** abstraction that lets the main API call either:
   - The **local in-process adapter** (current logic, zero new infrastructure dependency)
   - A **remote standalone adapter** (future microservice or ML service)
3. A **feature flag system** (`RECOMMENDER_MODE`) to control which adapter is active at runtime
4. A **shadow mode** to run both adapters and compare scores without changing user-facing results

## Alternatives Considered

| Option | Pros | Cons |
|--------|------|------|
| Keep in-process | No new infrastructure | Blocks scaling, hard to experiment |
| Full microservice now | Clean separation | High blast radius, over-engineered for current scale |
| Dual DB + Gateway (chosen) | Incremental extraction, safe rollback, zero behavior change | Requires dual DB session management |

## Consequences

**Positive**
- Recommendation scoring is decoupled from the HTTP request cycle
- Algorithm changes can be deployed without touching core API
- Shadow mode enables safe A/B comparison before any user exposure
- Fallback to local adapter ensures zero-downtime on remote failures

**Negative**
- Additional DB connection pool to manage
- Sync pipeline introduces eventual consistency for pre-computed scores
- Feature flag configuration must be managed across environments

## Feature Flags

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `RECOMMENDER_ENABLED` | bool | `true` | Master switch for the recommender subsystem |
| `RECOMMENDER_MODE` | enum | `local` | `local` / `standalone` / `shadow` |
| `RECOMMENDER_SHADOW_COMPARE` | bool | `false` | Store drift metrics in shadow mode |

## Rollout Plan

1. **Shadow mode**: Run local + standalone in parallel, compare results, no user impact
2. **Canary**: Route 5% → 20% → 50% → 100% of traffic to standalone adapter
3. **Cutover**: Set `RECOMMENDER_MODE=standalone` globally
4. **Cleanup**: Remove local adapter after 30-day stabilization window

---

*Approved by*: Architecture Review  
*Next review date*: After Sprint 6 canary completion
