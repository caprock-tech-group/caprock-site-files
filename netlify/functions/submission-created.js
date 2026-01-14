const https = require('https');

/**
 * Netlify Background Function: submission-created
 * This version uses the Netlify Environment Variable for security.
 */
exports.handler = async function(event, context) {
    console.log("--- New Form Submission Received ---");

    // 1. Parse the Netlify event body
    let payload;
    try {
        const body = JSON.parse(event.body);
        payload = body.payload;
    } catch (e) {
        console.error("Critical Error: Could not parse event body.", e);
        return { statusCode: 400, body: "Invalid Request Body" };
    }
    
    const data = payload.data || {};
    const netlifyFormName = payload.form_name || data['form-name'] || "Unknown Form";
    
    // 2. Access the Discord Webhook from Netlify Environment Variables
    const DISCORD_URL = process.env.DISCORD_WEBHOOK_URL;

    if (!DISCORD_URL) {
        console.error("CRITICAL ERROR: DISCORD_WEBHOOK_URL environment variable is missing.");
        return { statusCode: 500, body: "Configuration Error" };
    }

    // 3. Define Branding & Terminology
    let title = "🚨 NEW INTEL: Site Lead";
    let typeLabel = "General Site Form";
    let color = 3447003; // Default Blue

    // Tactical Differentiation Logic
    if (netlifyFormName === 'risk-audit') {
        title = "🔥 HIGH PRIORITY: Risk Audit Lead";
        typeLabel = "Customer Risk Assessment";
        color = 15548997; // Tactical Red
    } 
    else if (netlifyFormName === 'solar-inquiry') {
        title = "☀️ HOT LEAD: Solar Form Submission";
        typeLabel = "Solar Form";
        color = 16761095; // Yellow
    } 
    else if (netlifyFormName === 'contact-v8') {
        title = "🛡️ MSP INTEL: MSP Information Request";
        typeLabel = "MSP Information Request";
        color = 4906624; // Green/Blue
    }
    else if (netlifyFormName === 'surveillance-inquiry') {
        title = "👁️ SURVEILLANCE INTEL: Security Camera Inquiry";
        typeLabel = "Security Camera Inquiry";
        color = 4906624; // Green/Blue
    }

    // 4. Construct the Fields
    const fields = [
        { name: "Submission Type", value: String(typeLabel), inline: true },
        { name: "Contact Person", value: String(data.name || data['full-name'] || "Anonymous"), inline: true },
        { name: "Mobile / Phone", value: String(data.phone || "No Phone Provided"), inline: false },
        { name: "Email Address", value: String(data.email || "No Email Provided"), inline: true }
    ];

    // Map the Immunity Score if the lead came from the /risk page
    if (data['immunity-score']) {
        fields.push({ 
            name: "Immunity Score", 
            value: `**${data['immunity-score']}/100**`, 
            inline: true 
        });
    }

    fields.push({ 
        name: "Lead Details / Project Scope", 
        value: String(data.message || "Request for direct contact via Risk Audit."), 
        inline: false 
    });

    // 5. Construct the Payload for Discord
    const discordPayload = JSON.stringify({
        username: "Caprock Bot",
        content: "@everyone", 
        embeds: [{
            title: title,
            color: color,
            fields: fields,
            footer: { text: "Caprock Command Center • Amarillo, TX" },
            timestamp: new Date().toISOString()
        }]
    });

    // 6. Dispatch to Discord
    return new Promise((resolve, reject) => {
        const url = new URL(DISCORD_URL);
        const options = {
            hostname: url.hostname,
            path: url.pathname + url.search,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(discordPayload),
                'User-Agent': 'Caprock-Lead-Bot/3.0'
            },
        };

        const request = https.request(options, (res) => {
            res.on('data', () => {});
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    console.log(`Success: Dispatched ${typeLabel} alert.`);
                    resolve({ statusCode: 200, body: 'Alert Dispatched' });
                } else {
                    console.error(`Discord API Error: ${res.statusCode}.`);
                    resolve({ statusCode: res.statusCode, body: 'Discord API Error' });
                }
            });
        });

        request.on('error', (e) => {
            console.error('Network Error:', e);
            resolve({ statusCode: 500, body: 'Network Error' });
        });

        request.write(discordPayload);
        request.end();
    });
};
