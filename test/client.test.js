import test from "node:test";
import assert from "node:assert/strict";
import { EXECUTION_PATHS, READ_ONLY_PATHS, Trading212Client, Trading212Error, pageQuery, portfolioFromPositions } from "../src/client.js";

const config = { baseUrl: "https://example.test", key: "key", secret: "secret", timeoutMs: 1000 };
test("only allowlisted GET endpoints can be requested", async () => {
  let received;
  const client = new Trading212Client({ config, fetchImpl: async (url, init) => {
    received = { url, init };
    return new Response('{"ok":true}', { status: 200 });
  }});
  assert.deepEqual(await client.get(READ_ONLY_PATHS.positions), { ok: true });
  assert.equal(received.init.method, "GET");
  assert.match(received.init.headers.Authorization, /^Basic /);
  await assert.rejects(() => client.request("POST", "/api/v0/equity/orders/limit", { body: {} }), Trading212Error);
});
test("only market orders and numeric-id cancellations are mutation allowlisted", async () => {
  const calls = [];
  const client = new Trading212Client({ config, fetchImpl: async (url, init) => {
    calls.push({ url, init });
    return new Response("", { status: 200 });
  }});
  await client.placeMarketOrder({ ticker: "AAPL_US_EQ", quantity: 1, extendedHours: false });
  await client.cancelPendingOrder(123);
  assert.equal(calls[0].init.method, "POST");
  assert.equal(calls[0].url, `https://example.test${EXECUTION_PATHS.marketOrder}`);
  assert.equal(calls[1].init.method, "DELETE");
  await assert.rejects(() => client.request("POST", "/api/v0/equity/orders/stop", { body: {} }), Trading212Error);
  await assert.rejects(() => client.cancelPendingOrder("abc"), Trading212Error);
});
test("pagination is bounded and URL encoded", () => {
  assert.equal(pageQuery({ limit: 999, cursor: "a&b", ticker: "AAPL_US_EQ" }), "?limit=50&cursor=a%26b&ticker=AAPL_US_EQ");
});
test("portfolio calculation derives allocation", () => {
  const portfolio = portfolioFromPositions([{ currentPrice: 10, quantity: 2 }, { currentPrice: 30, quantity: 1 }]);
  assert.equal(portfolio.totalMarketValue, 50);
  assert.equal(portfolio.positions[0].allocationPercent, 40);
  assert.equal(portfolio.positions[1].allocationPercent, 60);
});
