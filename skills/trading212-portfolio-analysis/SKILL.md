---
name: trading212-portfolio-analysis
description: Analyse a user's Trading 212 account for allocation, returns, income, cash, and concentration, with a controlled preview-and-confirm flow for requested market orders or cancellations.
---

# Trading 212 Portfolio Analysis

Use the `trading212-controlled` MCP tools to obtain current data before discussing a portfolio. Never attempt transfers, withdrawals, report generation, account changes, limit/stop orders, or credential-management actions.

Start with `get_account_summary` and `get_portfolio` for an overall review. Use `get_cash`, `get_pending_orders`, `get_historical_orders`, `get_transactions`, or `get_dividends` only when they answer the user's question. Historical collection tools are paginated: pass a cursor only from the prior response's `nextPagePath` and say if the review covers only a page of history.

When reporting analysis:

- State the account currency and the data retrieval time when available.
- Separate facts reported by Trading 212 from calculations and assumptions.
- Treat `currentPrice × quantity` as a snapshot estimate; do not imply it is a tax basis, realised return, or guaranteed execution price.
- Explain concentration with both percentage and position value. Flag unavailable or incomplete history rather than estimating it.
- Describe educational risk considerations neutrally. Do not give personalised investment advice or certainty about performance.
- Keep financial data in the conversation; do not copy credentials into summaries, files, or messages.

For a concise account check, give total portfolio value, cash, largest holdings, allocation, unrealised P/L if present, pending orders, and any obvious data limitations. For income, retrieve dividends and report the requested period, currency, gross/net fields if supplied, and pagination coverage.

## Requested execution

Only act when the user explicitly requests a specific transaction. First call `preview_market_order` or `preview_order_cancellation`, then present the complete preview: ticker or order ID, buy/sell direction, quantity, extended-hours setting, material warnings, and expiry. Do not call `execute_confirmed_action` until the user directly confirms that exact preview. Pass the issued token and the exact confirmation word `EXECUTE` only then.

Market-order previews are not price guarantees and may fill at a different price. If a confirmation token is consumed and the execution result is uncertain or fails, do not automatically retry; inspect pending orders or history and tell the user what happened.
