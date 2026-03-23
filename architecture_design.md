# Synthesis 2026: x402 Agent-X Paytech

## 🏆 The Winning Narrative
**"Bridging the Gap: Autonomous AI Agents Paying for Real-World Assets on Base"**

This project is not just an application; it is **agentic infrastructure**. We are building the rails that allow AI Agents (compliant with **ERC-8004**) to interact with the off-chain economy (Banks, Utilities) using on-chain funds (Base USDC).

---

## 🏗️ System Overview

The system consists of two distinct components working in harmony:

1.  **The Infrastructure (x402 Facilitator):** A middleware server that translates crypto (USDC on Base) into fiat (NGN) for real-world settlement via Paycrest.
2.  **The Consumer (Demo Agent):** An autonomous AI agent ("LightNeverDies") that lives on-chain (Base Mainnet) and pays its own bills.

```mermaid
graph TD
    subgraph "On-Chain (Base Mainnet)"
        Agent["🤖 AI Agent (ERC-8004)"]
        USDC[💰 USDC Contract]
    end

    subgraph "The Bridge (Our Project)"
        Facilitator[⚡ x402 Facilitator API]
        Paycrest[🔌 Paycrest Integration]
    end

    subgraph "Off-Chain (Real World)"
        Merchant[🏢 Resource Server (Electricity Co.)]
        Bank[🏦 Nigerian Bank/Utility]
    end

    %% Flow
    Agent -- "1. Request Resource" --> Merchant
    Merchant -- "2. 402 Payment Required" --> Agent
    Agent -- "3. Pay USDC" --> Facilitator
    Facilitator -- "4. Settle Fiat" --> Paycrest
    Paycrest -- "5. Deposit NGN" --> Bank
    Facilitator -- "6. Proof of Payment" --> Merchant
    Merchant -- "7. Release Token" --> Agent
```

---

## 🆔 Component 1: ERC-8004 Agent Identity
*Target Track: Synthesis Open Track / Base*

To ensure trustless interactions and build reputation within the Synthesis ecosystem, our agent utilizes the **ERC-8004 (Trustless Agents)** standard.

-   **Identity**: Verifiable on-chain identity via the Base Identity Registry.
-   **Reputation**: Builds a transaction history with every successful real-world settlement.
-   **Verification**: Cryptographic proof of payment provided by the x402 Facilitator.

---

## 🧩 Component 2: The x402 Facilitator (Infrastructure)
*Target Track: Dev Tooling & Data Virtualization*

This is a standardized API that any merchant can use to accept crypto payments without knowing anything about crypto.

### Key Features
-   **Network:** Base Mainnet
-   **Input:** USDC (via x402 Protocol)
-   **Output:** NGN (via Paycrest)
-   **Endpoints:**
    -   `POST /verify`: Checks if a payment intent is valid.
    -   `POST /settle`: Executes the fiat settlement.
    -   `GET /supported`: Lists supported payment schemes (e.g., `ngn+paycrest`).
-   `POST /create-intent`: Helper to generate x402 headers for testing.

### Why it Wins
It solves the "Chicken and Egg" problem. Merchants won't accept crypto because it's hard. Agents can't pay fiat because they don't have bank accounts. This Facilitator solves both.
Live at: [https://x402-agent-x-paycrest.vercel.app/](https://x402-agent-x-paycrest.vercel.app/)

---

## 🤖 Component 3: The Demo Agent (Consumer)
*Target Track: Main Track (x402 Applications)*

This is the "showcase." We use the most relatable real-world transaction in emerging markets: **Mobile Airtime Top-up**.

### Persona: "LightNeverDies"
An autonomous agent that ensures its own infrastructure (and yours) never loses connectivity.

### The User Flow
1.  **Trigger:** User types: *"I'm out of airtime, top me up ₦1,000."*
2.  **Action:** Agent calls the Airtime Provider API.
3.  **Obstacle:** Provider returns `402 Payment Required`.
4.  **Resolution:**
    -   Agent detects `scheme: ngn+paycrest` on **Base**.
    -   Agent pays 1 USDC on Base.
5.  **Success:**
    -   Facilitator settles NGN to the Telco.
    -   **User receives an SMS alert instantly.**
    -   Agent confirms: *"Done! ₦1,000 airtime sent to 08012345678."*

### Why this is the Perfect Demo
-   **Universal:** Everyone understands phone credit.
-   **Instant Feedback:** The SMS alert is a powerful "real world" proof of on-chain action.
-   **Simple:** Minimal inputs (Phone Number + Amount).

---

## 🛠️ Tech Stack

| Component | Technology |
| :--- | :--- |
| **Facilitator** | Node.js, Express, Ethers.js (**Base**), Paycrest SDK |
| **Agent/Client** | TypeScript, Viem (for Base interaction), AI SDK |
| **Merchant** | Simple Express Server (Mocking a Utility Company) |
| **Protocol** | **x402** (HTTP 402 Payment Required Standard) |
| **Identity** | **ERC-8004** (Trustless Agents Standard) |

---

## 🚀 Execution Summary
1.  **Network Moved**: RPCs and Chain IDs updated to **Base Mainnet (8453)**.
2.  **Identity Standard**: Integration of ERC-8004 compliant identity placeholders.
3.  **Real-world Settlement**: Proof-of-concept for NGN settlement via Paycrest.
