# Public ChatGPT and Claude distribution

The bundled MCP server is a local stdio server. It is suitable for a person running it on their own computer, where their Trading 212 API key and secret stay in a private `.env` file.

Do not deploy this local-key configuration as a shared service. A shared server using one Trading 212 key would expose one account to every user.

## Target architecture

```text
ChatGPT / Claude
        |
        | OAuth / user session (HTTPS)
        v
Public Streamable HTTP MCP service (/mcp)
        |
        +-- Authorisation layer: resolves the caller to one application user
        |
        +-- Credential vault: decrypts only that user's Trading 212 key pair in memory
        |
        +-- Trading 212 client: calls only the user's account
        |
        +-- Audit store: records metadata and outcomes, never secrets or full portfolio data
        v
Trading 212 API
```

There is no application-wide Trading 212 key. Each person supplies and controls their own credential pair. The local `.mcpb` package is the simpler alternative because the key never leaves that person's computer.

## What public distribution requires

Build a separate Streamable HTTP MCP service at a stable HTTPS `/mcp` URL. It needs:

1. Per-user account connection: a secure account-linking flow that receives each user's Trading 212 API credentials outside the chat interface. The connection page must be protected by the application's sign-in system and HTTPS.
2. Credential vault: envelope-encrypt each key and secret with a managed key service. Store ciphertext and a key reference only; decrypt only for the outbound Trading 212 request, never in logs. Support revocation, replacement, and permanent deletion.
3. Server-side authorization: validate the MCP host identity/session on every request, map it to an internal user ID, and query credentials by that user ID only. Do not trust a user ID supplied in tool arguments.
4. Audit logs: retain minimally necessary security metadata—actor ID, action name, resource/order ID, time, outcome, and request correlation ID. Redact secrets and do not store complete account balances, positions, or raw Trading 212 responses in ordinary logs.
5. Explicit confirmation enforcement for all write actions, plus durable execution records and no automatic retries for Market orders. Bind every confirmation to one user, one exact action, and a short expiry.
6. Operational controls: rate limits, monitoring, alerts, dependency patching, backups of encrypted records, incident response, and a production security review.
7. Public-facing documents: privacy policy, terms, financial-risk disclaimer, and a monitored support contact.

## Minimum deployment decisions

Before implementing the hosted service, choose an identity provider, a managed database, a managed key service, an audit-log retention period, and the deployment region. The service should use a dedicated service identity with only the ability to decrypt the relevant credential records; engineers and support staff should not have routine access to users' API secrets.

The hosted service must start with account-information tools only. Do not expose execution tools publicly until an independent security review, confirmation UX review, and operational incident plan are complete.

## ChatGPT

ChatGPT public plugins require a stable public HTTPS MCP endpoint. The endpoint is added and tested in developer mode, then submitted to OpenAI's plugin portal for review and publication. A GitHub repository is useful for source distribution but is not itself a ChatGPT connector endpoint.

## Claude

For local use, Claude Desktop can run this server using `claude-desktop-config.example.json` after the user installs dependencies and configures their own `.env`. For Claude web, mobile, and broader distribution, host the same per-user Streamable HTTP service and add it as a custom remote connector. Claude desktop extensions (`.mcpb`) are another distribution option for the local server.
