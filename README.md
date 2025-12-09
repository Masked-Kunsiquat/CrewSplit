# CrewSplit

A deterministic, family-focused trip expense-splitting app built with Expo.

## Project Structure

```
CrewSplit/
├── app/                    # Expo Router screens
├── src/
│   ├── modules/           # Domain modules (colocated)
│   │   ├── trips/
│   │   ├── participants/
│   │   ├── expenses/
│   │   ├── settlement/
│   │   └── sync/
│   ├── ui/                # Components, screens, design tokens
│   ├── store/             # Zustand state management
│   ├── db/                # SQLite + Drizzle ORM
│   └── utils/             # Shared utilities
├── docs/                  # Documentation
└── AGENTS.md              # Agent coordination guide
```

## Getting Started

### Installation

```bash
npm install
```

### Development

```bash
# Start Expo development server
npm start

# Run on iOS
npm run ios

# Run on Android
npm run android
```

### Type Checking

```bash
npm run type-check
```

### Testing

```bash
npm test
```

## Tech Stack

- **Expo** - Cross-platform mobile framework
- **Expo Router** - File-based routing
- **TypeScript** - Type safety
- **SQLite + Drizzle ORM** - Local database
- **Zustand** - State management

## Documentation

See [docs/README.md](./docs/README.md) for detailed documentation.

## Agent Coordination

See [AGENTS.md](./AGENTS.md) for agent responsibilities and architecture decisions.

## License

See [LICENSE](./LICENSE)
