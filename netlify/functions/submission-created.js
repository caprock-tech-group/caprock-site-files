const https = require('https');

/**
 * Netlify Background Function: submission-created
 * Dispatches tactical alerts to the Caprock Discord Command Center.
 * Optimized for robustness and cross-environment payload detection.
 */
exports.handler = async function(event, context) {
    console.log("--- DISPATCH INITIATED: New Form Intel ---");

    // 1. Parse and Detect Netlify Event Payload
    let payload;
    try {
        const body = JSON.parse(event.body);
        // Netlify sometimes wraps the submission in a 'payload' key
        payload = body.payload || body;
    } catch (e) {
        console.error("CRITICAL ERROR: Failed to parse submission body.", e);
        return { statusCode: 400, body: "Invalid Request Body" };
    }
    
    // Extract form identity and data
    const data = payload.data || {};
    const netlifyFormName = payload.form_name || data['form-name'] || "Unknown_Source";
    
    console.log(`SOURCE DETECTED: [${netlifyFormName}]`);
    
    // 2. Caprock Discord Webhook Configuration
    const DISCORD_URL = "https://discord.com/api/webhooks/1459433932553584703/H1hmPninZQ888hL7lFDrtIzAVo0mnMs0axjYm0i6nfsmTLqi1F7t7YHsXyqySxKyp91k";

    // 3. Strategic Branding & Escalation Matrix
    let title = "🚨 NEW INTEL: Site Lead";
    let typeLabel = "General Site Form";
    let color = 3447003; // Default Blue
    let mention = "";

    // High-Ticket Sentry Logic
    if (netlifyFormName === 'sentry-lead' || netlifyFormName === 'solar-inquiry') {
        title = "⚡ HIGH-VALUE TARGET: Solar Sentry Inquiry";
        typeLabel = "Solar Sentry Strategic Assessment";
        color = 16347926; // Safety Orange (#f97316)
        mention = "@everyone"; 
    } 
    else if (netlifyFormName === 'contact-v8') {
        title = "🛡️ MSP INTEL: Managed Services Request";
        typeLabel = "MSP Information Request";
        color = 4906624; // Caprock Green (#4ade80)
    }
    else if (netlifyFormName === 'surveillance-inquiry') {
        title = "👁️ SURVEILLANCE INTEL: Security Camera Inquiry";
        typeLabel = "Fixed Surveillance Project";
        color = 4906624; // Caprock Green (#4ade80)
    }

    // 4. Construct the Payload for Discord Command Center
    const embed = {
        title: title,
        color: color,
        fields: [
            {
                name: "Form Name",
                value: String(netlifyFormName),
                inline: true
            },
            {
                name: "Lead Type",
                value: String(typeLabel),
                inline: true
            },
            {
                name: "Commander / Contact",
                value: String(data.name || data['full-name'] || data['name'] || "Anonymous"),
                inline: false
            },
            {
                name: "Direct Line",
                value: String(data.phone || "No Phone Provided"), 
                inline: true 
            },
            {
                name: "Secure Email",
                value: String(data.email || "No Email Provided"),
                inline: true
            },
            {
                name: "Site Intel / Message",
                value: String(data.message || data['site-details'] || "Request for direct contact."),
                inline: false
            }
        ],
        footer: {
            text: "Caprock Command Center • Amarillo, TX",
        },
        timestamp: new Date().toISOString()
    };

    const discordPayload = JSON.stringify({
        username: "Caprock Dispatch",
        content: mention || undefined, 
        embeds: [embed]
    });

    // 5. Tactical Dispatch to Discord
    return new Promise((resolve, reject) => {
        const url = new URL(DISCORD_URL);
        const options = {
            hostname: url.hostname,
            path: url.pathname + url.search,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(discordPayload),
                'User-Agent': 'Caprock-Dispatch-Bot/3.1'
            },
        };

        const request = https.request(options, (res) => {
            let responseBody = '';
            res.on('data', (chunk) => { responseBody += chunk; });
            res.on('end', () => {
                console.log(`DISCORD RESPONSE: [${res.statusCode}]`);
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    console.log("SUCCESS: Alert dispatched to Command Center.");
                    resolve({ statusCode: 200, body: 'Alert Dispatched' });
                } else {
                    console.error(`DISCORD FAILURE: Status ${res.statusCode}. Body: ${responseBody}`);
                    resolve({ statusCode: res.statusCode, body: 'Discord API Error' });
                }
            });
        });

        request.on('error', (e) => {
            console.error('NETWORK ERROR: Communication link failed.', e);
            resolve({ statusCode: 500, body: 'Network Error' });
        });

        request.write(discordPayload);
        request.end();
    });
};
