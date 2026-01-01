const https = require('https');

const apiKey = "AIzaSyCMz9CFOq-wBF7FF_tzcLfZQuF5F3V5xNc";
const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

console.log("🔍 Querying Google API directly (bypassing SDK)...");
console.log("URL:", url.replace(apiKey, "HIDDEN_KEY"));

https.get(url, (res) => {
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        console.log(`\n📡 Status Code: ${res.statusCode}`);
        if (res.statusCode === 200) {
            try {
                const json = JSON.parse(data);
                console.log("\n✅ API Key is working!");
                console.log("📜 Available Models:");
                json.models.forEach(m => {
                    if (m.name.includes('gemini')) {
                        console.log(` - ${m.name} (${m.supportedGenerationMethods.join(', ')})`);
                    }
                });
            } catch (e) {
                console.error("❌ Failed to parse JSON:", e.message);
                console.log("Raw body:", data);
            }
        } else {
            console.error("❌ Request Failed!");
            console.error("Body:", data);

            if (data.includes("API_KEY_INVALID")) {
                console.error("\n👉 DIAGNOSIS: The API Key is incorrect or revoked.");
            } else if (data.includes("PERMISSION_DENIED")) {
                console.error("\n👉 DIAGNOSIS: Key valid but lacks permissions (probably 'Generative Language API' not enabled).");
            } else {
                console.error("\n👉 DIAGNOSIS: Unknown error. Check the body above.");
            }
        }
    });

}).on("error", (err) => {
    console.error("❌ Network Error:", err.message);
});
