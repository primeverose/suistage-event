# 🎫 SuiStage - Web3 Event Management Platform

<div align="center">

![Sui](https://img.shields.io/badge/Sui-Testnet-4DA2FF?style=for-the-badge&logo=sui&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Move](https://img.shields.io/badge/Move-000000?style=for-the-badge&logo=aptos&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-07405E?style=for-the-badge&logo=sqlite&logoColor=white)

**A decentralized event management system built on Sui blockchain with SQLite backend**

[Live Demo](#) · [Documentation](./docs) · [Report Bug](../../issues) · [Request Feature](../../issues)

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Quick Start](#-quick-start)
- [Architecture](#-architecture)
- [Deployed Contracts](#-deployed-contracts)
- [Development](#-development)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🌟 Overview

SuiStage is a Web3 event ticketing platform that combines:
- **Sui Move Smart Contracts** for trustless event management
- **SQLite Database** for fast querying and caching
- **Walrus Storage** for decentralized image hosting
- **RESTful API** for easy integration

### Why SuiStage?

✅ **Zero-configuration** - Works out of the box with SQLite
✅ **Decentralized** - Events and tickets on Sui blockchain
✅ **Fast** - Local database caching for instant queries
✅ **Portable** - Single database file, easy to backup
✅ **Production-ready** - Battle-tested with comprehensive tests

---

## ✨ Features

### Smart Contract Features
- 🎟️ **Event Creation** - Create events with customizable parameters
- 🪑 **Seat Reservation** - Reserve seats with on-chain verification
- ✏️ **Event Updates** - Update event details (organizer only)
- ❌ **Event Cancellation** - Cancel events with refund support
- 📊 **Event Registry** - Shared object tracking all events

### Backend Features
- 🔄 **Blockchain Sync** - Auto-sync events from Sui network
- 🗄️ **SQLite Caching** - Fast queries without blockchain calls
- 🖼️ **Walrus Integration** - Decentralized image storage
- 📈 **Analytics** - Event statistics and metrics
- 🔍 **Search & Filter** - Advanced event discovery

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ (recommended: v20 or v22)
- Python 3.9+ (for building native modules)
- Sui CLI (for contract deployment)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/yourusername/suistage-role2-sqlite.git
cd suistage-role2-sqlite

# 2. Install backend dependencies
cd backend
npm install

# 3. Configure environment
cp .env.example .env
# Edit .env with your configuration (see below)

# 4. Start the server
npm run dev
```

### Environment Configuration

Edit `backend/.env`:

```bash
# Database (SQLite - auto-created)
DATABASE_PATH=./suistage.db

# Sui Network (Testnet contracts already deployed!)
SUI_NETWORK=testnet
PACKAGE_ID=0xb92f19ffd39c8794ea05a95b0d1d29e4aab8b7866e86da3b01d01404d7d0a0a6
EVENT_REGISTRY_ID=0xa26eb769643f9388f5c4b381fc197ec0f0f20c9a0fe1294a29a63522a31f7905

# Server
PORT=3000
```

That's it! The server will start on `http://localhost:3000` 🎉

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     SuiStage Platform                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌───────────────┐      ┌──────────────┐                  │
│  │   Frontend    │─────▶│   Backend    │                  │
│  │  (React/Vue)  │      │  (Express)   │                  │
│  └───────────────┘      └──────┬───────┘                  │
│                                 │                           │
│                        ┌────────┴────────┐                 │
│                        │                 │                 │
│                   ┌────▼─────┐    ┌─────▼──────┐          │
│                   │  SQLite  │    │ Sui Network│          │
│                   │ (Cache)  │    │  (Source)  │          │
│                   └──────────┘    └─────┬──────┘          │
│                                         │                  │
│                                   ┌─────▼──────┐          │
│                                   │Move Smart  │          │
│                                   │ Contracts  │          │
│                                   └────────────┘          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Tech Stack

**Smart Contracts:**
- Sui Move (Framework 2024.beta)
- Shared objects for event registry
- Event emission for indexing

**Backend:**
- TypeScript + Express.js
- SQLite (better-sqlite3)
- Sui SDK (@mysten/sui)
- Walrus integration

**Frontend:** (not included in this repo)
- React/Vue.js recommended
- @mysten/dapp-kit for wallet connection

---

## 📜 Deployed Contracts

### Testnet Deployment

Our contracts are live on Sui Testnet!

| Component | Address |
|-----------|---------|
| **Package ID** | `0xb92f19ffd39c8794ea05a95b0d1d29e4aab8b7866e86da3b01d01404d7d0a0a6` |
| **Event Registry** | `0xa26eb769643f9388f5c4b381fc197ec0f0f20c9a0fe1294a29a63522a31f7905` |

**Explorer Links:**
- [View Package on SuiVision](https://testnet.suivision.xyz/package/0xb92f19ffd39c8794ea05a95b0d1d29e4aab8b7866e86da3b01d01404d7d0a0a6)
- [View Deployment Tx](https://testnet.suivision.xyz/txblock/6ZecMMUfpQ9Byr5JcZcTanQ8HJT5GSJNpMnyNVYoYNC9)

### Contract Functions

```move
// Create an event
public entry fun create_event(
    registry: &mut EventRegistry,
    name: vector<u8>,
    description: vector<u8>,
    venue: vector<u8>,
    date: u64,
    total_seats: u64,
    price_per_seat: u64,
    image_url: vector<u8>,
    clock: &Clock,
    ctx: &mut TxContext
)

// Reserve seats
public entry fun reserve_seats(
    event: &mut Event,
    seat_count: u64,
    clock: &Clock,
    ctx: &mut TxContext
)

// Update event details
public entry fun update_event(...)

// Cancel event
public entry fun cancel_event(...)
```

---

## 💻 Development

### Project Structure

```
suistage-role2-sqlite/
├── contracts/           # Sui Move smart contracts
│   ├── sources/
│   │   ├── event.move          # Main event contract
│   │   └── event_tests.move    # Contract tests
│   └── Move.toml
│
├── backend/            # Express.js backend
│   ├── src/
│   │   ├── controllers/        # API controllers
│   │   ├── services/          # Business logic
│   │   ├── routes/            # API routes
│   │   ├── middleware/        # Express middleware
│   │   └── config/            # Configuration
│   ├── .env.example
│   └── package.json
│
└── docs/              # Documentation
```

### Running Tests

**Smart Contract Tests:**
```bash
cd contracts
sui move test
```

**Backend Tests:**
```bash
cd backend
npm test
```

### Building for Production

```bash
# Build backend
cd backend
npm run build
npm start
```

### Database Management

```bash
# Backup database
cp backend/suistage.db backend/backups/suistage_$(date +%Y%m%d).db

# Check database stats
node backend/scripts/stats.js
```

---

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](./CONTRIBUTING.md) for details.

### Quick Contribution Guide

1. **Fork** this repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Development Workflow

1. Check [Issues](../../issues) for tasks
2. Comment on an issue to claim it
3. Follow our coding standards
4. Write tests for new features
5. Update documentation

---

## 📚 Additional Resources

- [Detailed Architecture](./SIMPLIFIED_ARCHITECTURE.md)
- [File Explanations](./FILE_EXPLANATIONS_AND_COLLABORATION.md)
- [Quick Start Guide](./QUICKSTART.md)
- [Project Overview](./PROJECT_OVERVIEW.md)
- [Sui Documentation](https://docs.sui.io/)
- [Move Language Guide](https://move-language.github.io/move/)

---

## 🐛 Troubleshooting

### Common Issues

**1. `better-sqlite3` build fails**
```bash
# Install Python 3.9+ and rebuild
PYTHON=/path/to/python3.9 npm install
```

**2. Contract verification errors**
```bash
# Ensure you're using the correct network
sui client active-env
# Should show: testnet
```

**3. Database locked error**
```bash
# Close all connections to the database
# Or delete suistage.db and restart (data will be lost)
```

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👥 Team & Contributors

Built with ❤️ by the SuiStage Team

**Core Contributors:**
- [@yourusername](https://github.com/yourusername) - Project Lead

Want to be listed here? [Contribute](#-contributing) to the project!

---

## 🙏 Acknowledgments

- [Sui Foundation](https://sui.io/) for the amazing blockchain platform
- [Walrus](https://www.walrus.xyz/) for decentralized storage
- The Move language community
- All our contributors and supporters

---

## 📞 Contact & Support

- **Issues:** [GitHub Issues](../../issues)
- **Discussions:** [GitHub Discussions](../../discussions)
- **Twitter:** [@SuiStage](#)
- **Discord:** [Join our Discord](#)

---

<div align="center">

**⭐ Star this repo if you find it helpful!**

Made with 🎫 on [Sui](https://sui.io/)

</div>
