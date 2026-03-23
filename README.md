# x402-NGN Facilitator

**A fully x402 V1 Protocol compliant facilitator for Nigerian Naira payments via Paycrest**

> "1 line of code to accept digital dollars. No fee, 2 second settlement, $0.001 minimum payment."

##  The Magic

**Merchants receive Naira 🇳🇬 → Clients pay in USDC 💵**

- **Client:** Pays in USDC on Base (crypto)
- **Paycrest:** Converts USDC → NGN instantly
- **Merchant:** Receives Naira in their Nigerian bank account (fiat)

**No crypto knowledge required for merchants!** They just get paid in Naira via bank transfer.

This facilitator enables seamless USDC → NGN settlements using the [x402 payment protocol](https://x402.org) and [Paycrest's](https://paycrest.io) decentralized liquidity network.

##  What is x402?

x402 is an open, HTTP-native payment protocol that revives the unused HTTP `402 Payment Required` status code. It enables:

- **Permissionless payments**: No middleman, no API keys for merchants
- **Gasless for merchants**: Facilitators handle all blockchain complexity
- **Micropayments**: Pay as low as ₦500 (~$0.30)
- **2-second settlement**: Instant Naira payouts via NIP/Open Banking
- **AI agent ready**: Perfect for autonomous payments

##  Architecture

The x402 protocol separates concerns into three roles:

```
┌─────────────┐      ┌──────────────────┐      ┌─────────────┐
│   Client    │─────▶│ Resource Server  │─────▶│ Facilitator │
│  (Wallet)   │◀─────│   (Merchant)     │◀─────│  (This!)    │
└─────────────┘      └──────────────────┘      └─────────────┘
                              │                        │
                              │                        │
                              ▼                        ▼
                        Delivers API/          Handles crypto
                        content/service        & fiat settlement
```

### This Facilitator's Role

1. **Verification** (`POST /verify`): Validates payment payloads from clients
2. **Settlement** (`POST /settle`): Executes USDC → NGN conversion via Paycrest
3. **Discovery** (`GET /supported`): Advertises supported schemes/networks

##  Quick Start

### Prerequisites

- Node.js v18+
- Paycrest API key ([get one here](https://paycrest.io))
- Base network RPC (e.g., via [Alchemy](https://alchemy.com))

### Installation

```bash
npm install
```

### Configuration

Create a `.env` file:

```env
# Paycrest API
PAYCREST_API_KEY=your_api_key_here
PAYCREST_API_URL=https://api.paycrest.io/v1

# Facilitator settings
FACILITATOR_URL=https://x402-agent-x-paycrest.vercel.app
PORT=3000

# Resource server (for examples)
RESOURCE_SERVER_PORT=4000
RESOURCE_SERVER_ACCOUNT=9115375399  # Your bank account
RESOURCE_SERVER_BANK=palmpay        # Your bank code
RESOURCE_SERVER_NAME=Your Name
```

### Run the Facilitator

```bash
npm run facilitator
```

You should see:

```
 x402-NGN Facilitator v1.0.0
 Running at http://localhost:3000
 x402 V1 Protocol Compliant
 Scheme: ngn+paycrest on Base

Endpoints:
  GET  /           - Discovery & health check
  GET  /supported  - List supported schemes
  POST /verify     - Verify payment payload
  POST /settle     - Execute payment settlement
  POST /webhook    - Paycrest callback handler
```

## 📚 Usage Examples

### For Merchants (Resource Servers)

Add x402 payments to your API in **one line**:

```typescript
import axios from 'axios';

app.get('/api/premium-data', async (req, res) => {
  const paymentHeader = req.headers['x-payment'];
  
  if (!paymentHeader) {
    // Return 402 with payment requirements
    return res.status(402).json({
      x402Version: 1,
      accepts: [{
        scheme: 'ngn+paycrest',
        network: 'base',
        maxAmountRequired: '5000', // ₦500 in kobo
        resource: '/api/premium-data',
        description: 'Premium API access',
        mimeType: 'application/json',
        payTo: 'YOUR_BANK_ACCOUNT',
        maxTimeoutSeconds: 30,
        asset: 'USDC',
        extra: { bank: 'palmpay', accountName: 'Your Name' }
      }]
    });
  }

  // Verify payment with facilitator
  const verifyResult = await axios.post('https://x402-agent-x-paycrest.vercel.app/verify', {
    x402Version: 1,
    paymentHeader,
    paymentRequirements: { /* same as above */ }
  });

  if (!verifyResult.data.isValid) {
    return res.status(402).json({ error: verifyResult.data.invalidReason });
  }

  // Settle payment
  await axios.post('https://x402-agent-x-paycrest.vercel.app/settle', {
    x402Version: 1,
    paymentHeader,
    paymentRequirements: { /* same as above */ }
  });

  // Deliver the resource
  res.json({ data: 'Your premium content here' });
});
```

See [`examples/resource-server.ts`](./examples/resource-server.ts) for a complete example.

### For Clients (Wallets/Agents)

```typescript
import axios from 'axios';

// 1. Request resource (get 402)
try {
  await axios.get('http://localhost:4000/api/weather');
} catch (error) {
  if (error.response.status === 402) {
    const requirements = error.response.data.accepts[0];
    
    // 2. Create payment intent
    const intent = await createPaymentIntent(
      requirements.maxAmountRequired / 100,
      requirements.payTo,
      requirements.extra.bank,
      requirements.extra.accountName
    );
    
    // 3. Send USDC to intent.depositAddress
    // ... (blockchain transaction)
    
    // 4. Retry with payment proof
    const paymentPayload = {
      x402Version: 1,
      scheme: 'ngn+paycrest',
      network: 'base',
      payload: intent
    };
    
    const response = await axios.get('http://localhost:4000/api/weather', {
      headers: {
        'X-PAYMENT': Buffer.from(JSON.stringify(paymentPayload)).toString('base64')
      }
    });
    
    console.log('Got weather data:', response.data);
  }
}
```

See [`examples/client.ts`](./examples/client.ts) for a complete example.

## Testing the Full Flow

### Terminal 1: Start Facilitator
```bash
npm run facilitator
```

### Terminal 2: Start Example Resource Server
```bash
npm run resource-server
```

### Terminal 3: Run Client Demo
```bash
npm run client
```

You should see the full x402 flow:
1. Client requests weather data
2. Server returns 402 with payment requirements
3. Client creates payment intent via Paycrest
4. Client sends USDC (simulated)
5. Client retries with payment proof
6. Server verifies & settles via facilitator
7. Client receives weather data + settlement proof

## API Reference

### `GET /supported`

Returns supported payment schemes.

**Response:**
```json
{
  "kinds": [
    { "scheme": "ngn+paycrest", "network": "base" }
  ]
}
```

**Headers:**
- `Accept-Pay: ngn+paycrest+https://x402-agent-x-paycrest.vercel.app/v1`

### `POST /verify`

Validates a payment payload.

**Request:**
```json
{
  "x402Version": 1,
  "paymentHeader": "base64-encoded-payment-payload",
  "paymentRequirements": {
    "scheme": "ngn+paycrest",
    "network": "base",
    "maxAmountRequired": "5000",
    "resource": "/api/weather",
    "payTo": "9115375399",
    "maxTimeoutSeconds": 30,
    "asset": "USDC",
    "extra": { "bank": "palmpay", "accountName": "Merchant" }
  }
}
```

**Response:**
```json
{
  "isValid": true,
  "invalidReason": null
}
```

### `POST /settle`

Executes payment settlement.

**Request:** Same as `/verify`

**Response:**
```json
{
  "success": true,
  "error": null,
  "txHash": "paycrest-order-id-123",
  "networkId": "base"
}
```

### `POST /webhook`

Paycrest callback for order status updates.

**Request:**
```json
{
  "orderId": "order-123",
  "status": "completed",
  "txHash": "0x..."
}
```

##  Custom Scheme: `ngn+paycrest`

This facilitator implements a custom x402 scheme for Naira settlements:

### Payload Structure

```typescript
{
  orderId: string;           // Paycrest order ID
  depositAddress: string;    // USDC deposit address on Base
  sendAmount: string;        // Exact USDC amount (with fees)
  recipient: {
    accountIdentifier: string;  // Bank account or meter number
    institution: string;        // Bank code (e.g., 'palmpay')
    accountName: string;        // Account holder name
  };
  expiresAt: number;         // Unix timestamp
  nonce: string;             // Unique nonce
}
```

### Verification Logic

1. Check scheme is `ngn+paycrest` and network is `base`
2. Validate payload structure
3. Check expiration
4. Verify USDC amount matches NGN requirement (with 1% slippage)
5. Confirm recipient matches requirements

### Settlement Logic

1. Create/confirm Paycrest order
2. Monitor for USDC receipt (via webhook)
3. Trigger Naira payout via Paycrest
4. Return order ID as transaction reference

## Supported Banks

All Nigerian banks via Paycrest, including:
- GTBank, Access, Zenith, First Bank, UBA
- Fintechs: Opay, Palmpay, Kuda, Moniepoint
- See full list: `npm run fetch-institutions`

##  Security

- **Trust-minimized**: Facilitator can't move funds arbitrarily
- **Nonce-based**: Prevents replay attacks
- **Expiration**: Payment intents expire after 15 minutes
- **Webhook verification**: Validates Paycrest signatures (TODO in production)

##  Roadmap

- [ ] Add webhook signature verification
- [ ] Support multiple schemes (e.g., `exact`, `upto`)
- [ ] Add Solana network support
- [ ] Implement order status tracking (database)
- [ ] Add rate limiting & DDoS protection
- [ ] Deploy to production (Railway/Fly.io)
- [ ] Register with x402 ecosystem directory

##  Contributing

This facilitator follows the [x402 protocol spec](https://x402.org). Contributions welcome!

1. Fork the repo
2. Create a feature branch
3. Test with `npm run demo`
4. Submit a PR

##  License

MIT

##  Acknowledgments

- [x402 Protocol](https://x402.org) by Coinbase
- [Paycrest](https://paycrest.io) for Naira liquidity
- Nigerian crypto community 🇳🇬

---

**Built with  for the future of internet payments**
