const ENVIRONMENTS = Object.freeze({
  demo: "https://demo.trading212.com",
  live: "https://live.trading212.com",
});

export const READ_ONLY_PATHS = Object.freeze({
  accountSummary: "/api/v0/equity/account/summary",
  positions: "/api/v0/equity/positions",
  pendingOrders: "/api/v0/equity/orders",
  historicalOrders: "/api/v0/equity/history/orders",
  dividends: "/api/v0/equity/history/dividends",
  transactions: "/api/v0/equity/history/transactions",
});

// The live API currently supports Market order execution only. Keep all other
// account-changing paths unavailable, including transfers, withdrawals, exports,
// Pies, and non-market order placement.
export const EXECUTION_PATHS = Object.freeze({
  marketOrder: "/api/v0/equity/orders/market",
});

export class Trading212Error extends Error {
  constructor(message, status) {
    super(message);
    this.name = "Trading212Error";
    this.status = status;
  }
}

export function readConfig(env = process.env) {
  const environment = env.TRADING212_ENVIRONMENT ?? "demo";
  if (!(environment in ENVIRONMENTS)) {
    throw new Trading212Error("TRADING212_ENVIRONMENT must be 'demo' or 'live'.");
  }
  if (!env.TRADING212_API_KEY || !env.TRADING212_API_SECRET) {
    throw new Trading212Error(
      "Trading 212 credentials are not configured. Set TRADING212_API_KEY and TRADING212_API_SECRET in a local .env file or your MCP host environment.",
    );
  }
  const parsedTimeout = Number(env.TRADING212_TIMEOUT_MS ?? 15000);
  const timeoutMs = Number.isFinite(parsedTimeout)
    ? Math.min(Math.max(parsedTimeout, 1000), 60000)
    : 15000;
  return { baseUrl: ENVIRONMENTS[environment], key: env.TRADING212_API_KEY, secret: env.TRADING212_API_SECRET, timeoutMs };
}

export function pageQuery({ limit, cursor, ticker, time } = {}) {
  const params = new URLSearchParams();
  if (limit !== undefined) params.set("limit", String(Math.min(Math.max(limit, 1), 50)));
  if (cursor) params.set("cursor", cursor);
  if (ticker) params.set("ticker", ticker);
  if (time) params.set("time", time);
  const query = params.toString();
  return query ? `?${query}` : "";
}

export class Trading212Client {
  constructor({ config = readConfig(), fetchImpl = fetch } = {}) {
    this.config = config;
    this.fetch = fetchImpl;
  }

  async request(method, path, { query = "", body } = {}) {
    const isRead = method === "GET" && Object.values(READ_ONLY_PATHS).includes(path);
    const isMarketOrder = method === "POST" && path === EXECUTION_PATHS.marketOrder;
    const isCancellation = method === "DELETE" && /^\/api\/v0\/equity\/orders\/\d+$/.test(path);
    if (!isRead && !isMarketOrder && !isCancellation) {
      throw new Trading212Error("Blocked request: endpoint or method is not in the approved allowlist.");
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.config.timeoutMs);
    try {
      const response = await this.fetch(`${this.config.baseUrl}${path}${query}`, {
        method,
        headers: {
          Authorization: `Basic ${Buffer.from(`${this.config.key}:${this.config.secret}`).toString("base64")}`,
          Accept: "application/json",
          "User-Agent": "trading212-mcp/1.1",
          ...(body ? { "Content-Type": "application/json" } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
        signal: controller.signal,
      });
      const responseBody = await response.text();
      if (!response.ok) {
        // Never include Authorization or credentials in an error message.
        throw new Trading212Error(`Trading 212 returned ${response.status}: ${responseBody.slice(0, 500)}`, response.status);
      }
      if (!responseBody.trim()) return { accepted: true };
      try { return JSON.parse(responseBody); }
      catch { throw new Trading212Error("Trading 212 returned a non-JSON response.", response.status); }
    } catch (error) {
      if (error.name === "AbortError") throw new Trading212Error("Trading 212 request timed out.");
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  get(path, query = "") { return this.request("GET", path, { query }); }
  accountSummary() { return this.get(READ_ONLY_PATHS.accountSummary); }
  positions(ticker) { return this.get(READ_ONLY_PATHS.positions, pageQuery({ ticker })); }
  pendingOrders() { return this.get(READ_ONLY_PATHS.pendingOrders); }
  historicalOrders(options) { return this.get(READ_ONLY_PATHS.historicalOrders, pageQuery(options)); }
  dividends(options) { return this.get(READ_ONLY_PATHS.dividends, pageQuery(options)); }
  transactions(options) { return this.get(READ_ONLY_PATHS.transactions, pageQuery(options)); }
  placeMarketOrder(order) { return this.request("POST", EXECUTION_PATHS.marketOrder, { body: order }); }
  cancelPendingOrder(id) { return this.request("DELETE", `/api/v0/equity/orders/${id}`); }
}

export function portfolioFromPositions(positions) {
  const valued = positions.map((position) => ({
    ...position,
    marketValue: Number(position.currentPrice ?? 0) * Number(position.quantity ?? 0),
  }));
  const totalMarketValue = valued.reduce((total, position) => total + position.marketValue, 0);
  return {
    totalMarketValue,
    positions: valued.map((position) => ({
      ...position,
      allocationPercent: totalMarketValue === 0 ? 0 : Number(((position.marketValue / totalMarketValue) * 100).toFixed(4)),
    })),
    note: "Market value and allocation are calculated from currentPrice × quantity; prices are in the instrument currency.",
  };
}
