import axios from 'axios';

const FACILITATOR_URL = 'http://localhost:3000';

// ERC-8004 Trustless Agent Identity (Base Mainnet)
// This ID is used for reputation and validation on the Synthesis platform.
const AGENT_ID_ERC8004 = process.env.AGENT_ID_ERC8004 || '0x74727573746c6573732d6167656e742d32303236'; 

async function payElectricityBill() {
    const billAmount = 55000; // 5500.00 NGN (in kobo)
    const meterNumber = '9115375399';
    const bankCode = 'Palmpay'; // Using name to test resolution
    const accountName = 'Ugwu Isaac Onyemaechi';

    console.log(` Checking electricity bill... Amount: ₦${billAmount / 100}`);

    try {
        console.log(`Attempting to pay via x402 facilitator: ${FACILITATOR_URL}/pay`);
        // We expect a 402 response
        await axios.post(`${FACILITATOR_URL}/pay`, {
            amount: billAmount,
            account: meterNumber,
            bank: bankCode,
            accountName: accountName
        });
    } catch (error: any) {
        if (error.response && error.response.status === 402) {
            console.log(' Received 402 Payment Required');
            const payHeader = error.response.headers['pay'];
            console.log(' Pay Header:', payHeader);

            const paymentIntent = error.response.data;
            console.log(' Payment Intent:', JSON.stringify(paymentIntent, null, 2));

            if (paymentIntent.exactUSDC) {
                console.log(`\n AGENT ACTION: Sending ${paymentIntent.exactUSDC} USDC to ${paymentIntent.payAddress} on Base...`);
                // In a real agent, we would sign and send the transaction here.
                console.log(' Crypto sent! Waiting for settlement...');
            } else {
                console.log('\n No exact USDC amount returned (likely due to mock/error), skipping send simulation.');
            }

            // Simulate webhook callback (since we don't have a real Paycrest callback in this demo)
            console.log('\n(Simulating Paycrest Webhook Callback...)');
            try {
                await axios.post(`${FACILITATOR_URL}/webhook`, {
                    status: 'crypto_received',
                    orderId: 'mock-order-123',
                    amount: billAmount / 100,
                    metadata: { account: meterNumber, bank: bankCode }
                });
                console.log(' Webhook triggered successfully.');
            } catch (webhookError: any) {
                console.error(' Webhook simulation failed:', webhookError.message);
            }

        } else {
            console.error(' Unexpected error:', error.message);
            if (error.response) {
                console.error('Response data:', error.response.data);
            }
        }
    }
}

payElectricityBill();
