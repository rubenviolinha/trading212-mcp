import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import dotenv from "dotenv";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { Trading212Client, Trading212Error, portfolioFromPositions } from "./client.js";

// Prefer explicit MCP-host environment variables; otherwise load the private
// .env that lives beside this installed plugin rather than the caller's cwd.
const sourceDirectory = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(sourceDirectory, "..", ".env") });

const server = new McpServer({ name: "trading212-controlled", version: "1.1.0" });
const paging = {
  limit: z.number().int().min(1).max(50).optional().describe("Items to return (1–50; API default is 20)."),
  cursor: z.string().optional().describe("Cursor from a previous response's nextPagePath."),
};
const client = () => new Trading212Client();
const json = (value) => ({ content: [{ type: "text", text: JSON.stringify(value, null, 2) }] });
const toolError = (error) => ({ content: [{ type: "text", text: error instanceof Trading212Error ? error.message : "Trading 212 request failed." }], isError: true });
const use = (handler) => async (args) => { try { return json(await handler(args)); } catch (error) { return toolError(error); } };
const confirmations = new Map();
const confirmationTtlMs = 5 * 60 * 1000;

function createConfirmation(action, details) {
  const token = randomUUID();
  const expiresAt = new Date(Date.now() + confirmationTtlMs).toISOString();
  confirmations.set(token, { action, details, expiresAt: Date.parse(expiresAt) });
  return { confirmationToken: token, expiresAt, action, details, requiredConfirmation: "EXECUTE" };
}

function consumeConfirmation(token) {
  const pending = confirmations.get(token);
  confirmations.delete(token); // Never retry an execution: market orders are non-idempotent.
  if (!pending) throw new Trading212Error("Confirmation token was not found, has already been used, or the server restarted.");
  if (Date.now() > pending.expiresAt) throw new Trading212Error("Confirmation token expired. Create a fresh preview.");
  return pending;
}

server.tool("get_account_summary", "Retrieve the current account summary. Read-only.", {}, use(() => client().accountSummary()));
server.tool("get_cash", "Retrieve account summary for cash information only. Read-only; no transfers or withdrawals.", {}, use(async () => {
  const summary = await client().accountSummary();
  return { summary, note: "Trading 212's current public API provides cash information through account summary." };
}));
server.tool("get_positions", "List open positions, optionally for one exact Trading 212 ticker. Read-only.", { ticker: z.string().min(1).optional() }, use(({ ticker }) => client().positions(ticker)));
server.tool("get_portfolio", "Build a current portfolio view with market values and allocation from open positions. Read-only.", {}, use(async () => portfolioFromPositions(await client().positions())));
server.tool("get_pending_orders", "List currently pending orders. Read-only.", {}, use(() => client().pendingOrders()));
server.tool("get_historical_orders", "List completed/cancelled historical orders with cursor pagination. Read-only.", paging, use((args) => client().historicalOrders(args)));
server.tool("get_transactions", "List account cash movements with cursor pagination, optionally from an ISO-8601 time. Read-only.", { ...paging, time: z.string().datetime().optional().describe("ISO-8601 start time.") }, use((args) => client().transactions(args)));
server.tool("get_dividends", "List paid dividends with cursor pagination and optional ticker filter. Read-only.", { ...paging, ticker: z.string().min(1).optional() }, use((args) => client().dividends(args)));

server.tool("preview_market_order", "Create a five-minute preview for a real buy or sell Market order. It does not place an order. Present every detail and wait for the user to directly confirm before calling execute_confirmed_action.", {
  ticker: z.string().regex(/^[A-Za-z0-9_]+$/).describe("Exact Trading 212 ticker, for example AAPL_US_EQ."),
  quantity: z.number().finite().refine((value) => value !== 0, "Quantity must not be zero.").describe("Positive to buy; negative to sell."),
  extendedHours: z.boolean().optional().default(false).describe("Allow execution outside normal market hours."),
}, use((order) => createConfirmation("market_order", {
  ticker: order.ticker,
  quantity: order.quantity,
  side: order.quantity > 0 ? "BUY" : "SELL",
  extendedHours: order.extendedHours,
  warning: "Market orders can execute at a different price than the current quote. This preview expires in five minutes.",
})));

server.tool("preview_order_cancellation", "Check a pending order and create a five-minute cancellation preview. It does not cancel anything. Present the order details and wait for direct user confirmation before calling execute_confirmed_action.", {
  orderId: z.number().int().positive().safe().describe("The numeric ID of the pending order to cancel."),
}, use(async ({ orderId }) => {
  const orders = await client().pendingOrders();
  const order = orders.find((item) => Number(item.id) === orderId);
  if (!order) throw new Trading212Error("That order is not currently pending, so no cancellation preview was created.");
  return createConfirmation("cancel_order", { orderId, order, warning: "Cancellation is not guaranteed if the order is already filling." });
}));

server.tool("execute_confirmed_action", "Execute exactly one previously previewed market order or pending-order cancellation. Call only after the user directly confirms the exact preview. The confirmation token is single-use and expires after five minutes; executions are never retried automatically.", {
  confirmationToken: z.string().uuid(),
  confirmation: z.literal("EXECUTE").describe("Must be the exact word EXECUTE after the user directly confirms this preview."),
}, use(async ({ confirmationToken }) => {
  const pending = consumeConfirmation(confirmationToken);
  if (pending.action === "market_order") {
    const receipt = await client().placeMarketOrder({
      ticker: pending.details.ticker,
      quantity: pending.details.quantity,
      extendedHours: pending.details.extendedHours,
    });
    return { executed: true, action: pending.action, submittedOrder: pending.details, receipt, note: "Trading 212 accepted the submission. Check order status; a market order's final execution price can differ from the preview." };
  }
  const receipt = await client().cancelPendingOrder(pending.details.orderId);
  return { executed: true, action: pending.action, cancelledOrderId: pending.details.orderId, receipt, note: "Trading 212 accepted the cancellation request. Cancellation is not guaranteed if filling had already begun." };
}));

await server.connect(new StdioServerTransport());
