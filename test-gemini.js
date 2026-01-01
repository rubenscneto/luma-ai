const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require('fs');
const path = require('path');

// Manually parse .env.local
function getEnvValue(key) {
    try {
        const envPath = path.resolve(__dirname, '.env.local');
        if (!fs.existsSync(envPath)) return null;
        const fileContent = fs.readFileSync(envPath, 'utf8');
        const lines = fileContent.split('\n');
        for (const line of lines) {
            const parts = line.split('=');
            if (parts[0].trim() === key) {
                return parts.slice(1).join('=').trim().replace(/^"|"$/g, '');
            }
        }
    } catch (e) {
        return null;
    }
    return null;
}

async function testGemini() {
    const apiKey = getEnvValue('GEMINI_API_KEY');

    if (!apiKey) {
        console.error("❌ ERROR: GEMINI_API_KEY not found in .env.local (or file missing)");
        return;
    }
    console.log("✅ Key found (starts with):", apiKey.substring(0, 5) + "...");

    const genAI = new GoogleGenerativeAI(apiKey);
    const models = ['gemini-2.0-flash', 'gemini-flash-latest', 'gemini-1.5-flash']; // Prioritize 2.0 found in list

    for (const modelName of models) {
        try {
            console.log(`\n🔄 Testing generation with model: ${modelName}`);
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent("Respond with JSON: {\"status\": \"ok\"}");
            const text = result.response.text();
            console.log(`✅ SUCCESS with ${modelName}! Response:`, text);
            return; // Exit on first success
        } catch (error) {
            console.error(`❌ Failed with ${modelName}:`, error);
        }
    }
    console.log("\n❌ ALL models failed.");
}

testGemini();
