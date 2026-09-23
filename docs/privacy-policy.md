# Privacy policy

**Effective date: 23 September 2026**

This policy describes the intended public hosted version of Trading 212 Controlled MCP. The downloadable local server and Claude Desktop extension process credentials locally and do not send them to a service operated by this project.

## Information handled

If a hosted version is offered, it may handle your application account identifier, Trading 212 API key ID and secret, account and portfolio information returned by Trading 212, and limited security/audit metadata such as tool name, time, result, and correlation ID.

## How information is used

Information is used only to authenticate you, connect the requested MCP tool to your own Trading 212 account, protect the service, investigate failures or abuse, and meet applicable legal obligations. It is not sold or used for advertising.

## Credential protection

Each user's Trading 212 credential pair is kept separate from every other user. A production deployment must encrypt credentials at rest with managed keys, decrypt them only when needed for a request, and redact them from logs. We will never ask you to place credentials in a chat prompt, GitHub issue, or support message.

## Sharing

Data is shared only with the infrastructure providers required to operate the hosted service and with Trading 212 when the service makes a request you initiated. We do not share credentials or portfolio data with other users.

## Retention and deletion

Credentials are retained until you remove the connection or delete your account. Audit metadata is retained only for the documented operational and security period, then deleted or anonymised. A live hosted service must publish its exact retention period and a deletion request route before launch.

## Your choices

You can revoke a Trading 212 API key in Trading 212, replace or remove a connection in the service, or request account/data deletion through the support route below. Revoking the key is the fastest way to stop further API access.

## Contact and changes

Questions or privacy requests should be submitted through the [support route](../SUPPORT.md). Material changes will be announced in this document with an updated effective date.

This template requires review and adaptation by qualified counsel before a public hosted launch, including the operator's legal name, address, applicable law, processors, and retention periods.
