# Public ChatGPT and Claude distribution

The bundled MCP server is a local stdio server. It is suitable for a person running it on their own computer, where their Trading 212 API key and secret stay in a private `.env` file.

Do not deploy this local-key configuration as a shared service. A shared server using one Trading 212 key would expose one account to every user.

## What public distribution requires

Build a separate Streamable HTTP MCP service at a stable HTTPS `/mcp` URL. It needs:

1. Per-user account connection: a secure account-linking flow that receives each user's Trading 212 API credentials outside the chat interface.
2. Encrypted credential storage with rotation and deletion controls. Never log credentials or full financial responses.
3. Server-side authorization so a tool call can access only the calling user's account.
4. Explicit confirmation enforcement for all write actions, plus durable execution records and no automatic retries for Market orders.
5. A privacy policy, terms, support contact, monitoring, rate limits, and a production security review.

## ChatGPT

ChatGPT public plugins require a stable public HTTPS MCP endpoint. The endpoint is added and tested in developer mode, then submitted to OpenAI's plugin portal for review and publication. A GitHub repository is useful for source distribution but is not itself a ChatGPT connector endpoint.

## Claude

For local use, Claude Desktop can run this server using `claude-desktop-config.example.json` after the user installs dependencies and configures their own `.env`. For Claude web, mobile, and broader distribution, host the same per-user Streamable HTTP service and add it as a custom remote connector. Claude desktop extensions (`.mcpb`) are another distribution option for the local server.
