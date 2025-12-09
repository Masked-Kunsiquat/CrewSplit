# CrewSplit Documentation

**Project:** CrewSplit (formerly CrewLedger)
**Purpose:** A deterministic, family-focused trip expense-splitting app built with Expo (iOS + Android).

## Overview

CrewSplit is a subscription-free, glitch-proof trip expense splitter built on deterministic math, zero friction, and transparent UX.

## Documentation Structure

- `settlement-spec.md` - Settlement algorithm specification (MODELER)
- `trip-schema.md` - Database schema reference (SYSTEM ARCHITECT)
- `api-reference.md` - Local & sync API reference (LOCAL DATA ENGINEER)

## Quick Start

See [AGENTS.md](../AGENTS.md) for agent-specific responsibilities.

## Tech Stack

- **Framework:** Expo (React Native)
- **Routing:** Expo Router
- **Language:** TypeScript
- **Database:** SQLite (expo-sqlite)
- **ORM:** Drizzle ORM
- **State:** Zustand
- **Testing:** Jest

## Core Principles

1. **Deterministic:** Same inputs always produce same outputs
2. **Local-first:** Fully functional offline
3. **Auditable:** All computations traceable to source data
4. **Zero friction:** Minimal input, maximum clarity
