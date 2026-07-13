# Phase 1 PR Slice Guide

## Branching and Slice Boundaries

- one extracted workflow per PR where possible
- keep each PR focused on transport thinning + service extraction + parity tests

## Required Checks Per Slice

1. compile check for touched backend modules
2. delegation and parity tests for touched workflow
3. if frontend touched, run smoke tests
4. update changelog with no-behavior-change note

## PR Template Notes

- scope: internal refactor only
- behavior: no intentional API behavior changes
- tests: include exact test command and output summary
- risk: list any environment-dependent tests skipped with reason

## Merge Policy

- do not merge if parity tests fail
- do not merge if response contract tests regress
- maintain centralized router registration and service boundaries

## Post-Phase Consolidated Regression

- run delegation suites (applications + meetings)
- run meetings + notifications verification tests
- run frontend smoke tests
- capture final summary in changelog
