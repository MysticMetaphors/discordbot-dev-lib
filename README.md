# The Developer's Bot Arsenal

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Category](https://img.shields.io/badge/category-DevTools-orange.svg)
![Contributions](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)

**Open-source Discord bots designed to help developers build, debug, and ship faster.**

This repository is a monorepo collection of utility bots. Our goal is to turn Discord from a chat app into a **Command Center** for your development workflow. Whether you need to audit websites, monitor servers, or track deployments, you'll find a tool here.

## The Toolset

| Bot Name | Category | What it Helps You Do | Stack | Maintained By |
| :--- | :--- | :--- | :--- | :--- |
| **[MysticMetaphor's bot](./auditbot)** | **Web/QA** | Performs full audits on websites (Lighthouse, SSL, Tech Stack) directly from chat. Helps catch security leaks and performance issues. | Node.js, Lighthouse | **[@MysticMetaphors](https://github.com/MysticMetaphors)** |

---

## Getting Started

Each bot in this library is **standalone**. You don't need to install the whole library to use one bot.

1. **Clone the Repo**
  ```bash
  git clone [https://github.com/MysticMetaphors/discordbot-dev-lib.git](https://github.com/MysticMetaphors/discordbot-dev-lib.git)
  cd discordbot-dev-lib
  ```

2. **Pick Your Tool: Navigate to the folder of the bot you need**
  ```bash
  cd MysticMetaphors-bot
  ```

3. **Install & Deploy:** Follow the specific README.md inside that folder to set up your keys and run the bot.

## 🤝 How to Contribute

We welcome submissions! If you have built a tool that helps developers, submit a PR. Please ensure your bot includes its own README.md and uses .env for secrets.

---

Maintained by **MysticMetaphors** & The Open Source Community