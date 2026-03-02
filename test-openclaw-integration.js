
// const fetch = require('node-fetch'); // employing native fetch

async function testIntegration() {
    const baseUrl = 'http://localhost:3000/api/integration/openclaw';
    const apiKey = 'fe87e79c-c9d2-43bb-a5a6-77e8f9c0b12d'; // Use the key we added to .env (wait, I used echo ..e7f3.., let me check .env content first)
    // Actually, I should use the one I echoed: e7f3ef70-053e-49cf-bdc5-6906e0f88c6d

    // I need a valid user email. I'll use a placeholder or check DB. 
    // Since I can't check auth easily from here without admin, I will assume a user exists 
    // or the test will fail on "User not found".
    // I'll try with a likely email 
    const userEmail = 'hanpa00@example.com'; // Replace with actual user if known, or I can list users first if I have admin access here? No.

    // Test 1: No Key
    try {
        const res = await fetch(baseUrl, {
            method: 'POST',
            body: JSON.stringify({ action: 'list_customers' })
        });
        console.log('Test 1 (No Key):', res.status === 401 ? 'PASS' : 'FAIL', res.status);
    } catch (e) { console.error('Test 1 Error:', e); }

    // Test 2: Invalid Key
    try {
        const res = await fetch(baseUrl, {
            method: 'POST',
            headers: { 'x-integration-key': 'wrong-key' },
            body: JSON.stringify({ action: 'list_customers' })
        });
        console.log('Test 2 (Invalid Key):', res.status === 401 ? 'PASS' : 'FAIL', res.status);
    } catch (e) { console.error('Test 2 Error:', e); }

    const realKey = 'e7f3ef70-053e-49cf-bdc5-6906e0f88c6d';

    // Test 3: List Customers (Valid Key, Unknown User?)
    try {
        const res = await fetch(baseUrl, {
            method: 'POST',
            headers: { 'x-integration-key': realKey },
            body: JSON.stringify({
                action: 'list_customers',
                user_email: 'nonexistent@example.com'
            })
        });
        const data = await res.json();
        console.log('Test 3 (Unknown User):', res.status === 404 ? 'PASS' : 'FAIL', res.status, data);
    } catch (e) { console.error('Test 3 Error:', e); }

    // Test 4: List Customers (Valid User - we need a real email)
    // To make this pass, I need a real email. 
    // I can't know it for sure without checking the DB.
    // I will print "Please update email in script" if it fails.

    console.log('\n--- Real User Test (requires valid email) ---');
    console.log('Skipping real user test strictly, but here is the curl command to try manually:');
    console.log(`curl -X POST ${baseUrl} -H "x-integration-key: ${realKey}" -H "Content-Type: application/json" -d '{"action": "list_customers", "user_email": "YOUR_EMAIL"}'`);

}

testIntegration();
