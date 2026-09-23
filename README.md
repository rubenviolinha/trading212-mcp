# Trading 212 Controlled MCP

An open-source MCP server for Trading 212 account access. It supports Codex and Claude Desktop locally today, with a portable Agent Plugins manifest for future broader distribution. It exposes portfolio tools plus a controlled, two-step process for live Market orders and pending-order cancellations.

It cannot transfer money, withdraw money, manage Pies, generate exports, or create limit, stop, or stop-limit orders.

> This project is not affiliated with or endorsed by Trading 212, Anthropic, or OpenAI. It is software tooling, not investment advice.

## Included tools

| Tool | Trading 212 source |
| --- | --- |
| `get_account_summary`, `get_cash` | `GET /api/v0/equity/account/summary` |
| `get_positions`, `get_portfolio` | `GET /api/v0/equity/positions` |
| `get_pending_orders` | `GET /api/v0/equity/orders` |
| `get_historical_orders` | `GET /api/v0/equity/history/orders` |
| `get_transactions` | `GET /api/v0/equity/history/transactions` |
| `get_dividends` | `GET /api/v0/equity/history/dividends` |
| `preview_market_order` → `execute_confirmed_action` | `POST /api/v0/equity/orders/market` after a five-minute, single-use confirmation |
| `preview_order_cancellation` → `execute_confirmed_action` | `DELETE /api/v0/equity/orders/{id}` after a five-minute, single-use confirmation |

`get_portfolio` is a calculated view over positions because the current Trading 212 documentation exposes open positions rather than the older portfolio endpoint.

## Secure setup

1. In this folder, copy `.env.example` to `.env`.
2. Set `TRADING212_API_KEY` and `TRADING212_API_SECRET` locally. Do not paste them into chat, source code, or any committed file.
3. Keep `TRADING212_ENVIRONMENT=demo` for an initial verification. Use `live` only to read the live Invest/Stocks ISA account supported by Trading 212's public API.
4. Install dependencies with `npm install`, then run `npm test` and `npm start`.
5. Add or install this folder as a local Codex plugin/MCP server. Its `.mcp.json` starts `src/server.js` over standard input/output. Configure credentials in the MCP host environment if it does not load the local `.env` file.

For extra protection, restrict the API key to the machine/server IP in Trading 212 if your account settings offer that control. Revoke and recreate the key if it is ever disclosed.

## Use with Claude and Codex

After cloning the repository, run `npm install`, copy `.env.example` to `.env`, and add your own Trading 212 credentials locally. Never commit `.env`.

- **Claude Desktop (one click):** download the `.mcpb` bundle from a GitHub Actions artifact or release, then open it with Claude Desktop and select **Install**. Claude will prompt for your Trading 212 API key and secret and stores them in the operating system's secure credential store. Build it locally with `npm run build:claude`.
- **Claude Desktop (manual):** alternatively, adapt `claude-desktop-config.example.json` with this repository's absolute path.
- **Codex:** install the local plugin or configure `mcp.json`. The portable `plugin.json` and `mcp.json` are at the repository root; `.codex-plugin/plugin.json` remains as a Codex compatibility manifest.

## Public ChatGPT and Claude connector

GitHub distribution supports local installation, but it is not a public connector by itself. A public ChatGPT or Claude connector needs a hosted Streamable HTTP MCP service that securely stores each user's own credentials and authorizes each request. See [the public-hosting plan](docs/public-hosting.md) before attempting deployment.

Public-distribution documents: [privacy policy](docs/privacy-policy.md), [terms of use](docs/terms-of-use.md), [financial-risk disclaimer](docs/financial-risk-disclaimer.md), and [support](SUPPORT.md).

## API and data notes

- Authentication is HTTP Basic authentication using API key as username and API secret as password. The server creates this header in memory and never logs it.
- Trading 212 documents cursor pagination for historical orders, dividends, and transactions. Use the returned `nextPagePath` to obtain the next cursor; the MCP tools accept a cursor, not a custom URL.
- Historical list calls accept at most 50 items. Some endpoints have rate limits, so avoid bulk repeated calls.
- This project uses the official current documentation: <https://docs.trading212.com/api/accounts/getaccountsummary>, <https://docs.trading212.com/api/positions>, <https://docs.trading212.com/api/historical-events/transactions>, and <https://docs.trading212.com/api/section/authentication/building-the-authorization-header>.

## Security model

- No credentials are stored in the skill, plugin manifest, source, tests, or example environment file.
- The client blocks every path outside the read-only allowlist before making a network request and always uses `GET`.
- Errors truncate upstream response text and never include authorization headers.
- The process communicates over MCP stdio; do not expose it as a public HTTP service without an authenticated proxy and secret manager.
- A market order must be previewed before it can be submitted. Its confirmation token expires after five minutes, is consumed before submission, and is never retried because Trading 212 states that Market order requests are not idempotent.
- For live accounts, Trading 212 currently documents Market orders as the supported API execution type. The tool supports positive quantities for buys and negative quantities for sells.
