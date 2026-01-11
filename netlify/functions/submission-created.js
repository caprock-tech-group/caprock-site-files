const https = require('https');

/**
 * Netlify Background Function: submission-created
 * Dispatches tactical alerts to the Caprock Discord Command Center.
 * Optimized for high-ticket asset leads and cross-environment reliability.
 */
exports.handler = async function(event, context) {
    console.log("--- DISPATCH INITIATED: New Form Intel ---");

    // 1. Parse and Detect Netlify Event Payload
    let body;
    try {
        // Handle potential base64 encoding from Netlify environment
        const rawBody = event.isBase64Encoded 
            ? Buffer.from(event.body, 'base64').toString('utf8') 
            : event.body;
            
        body = JSON.parse(rawBody);
    } catch (e) {
        console.error("CRITICAL ERROR: Failed to parse submission body.", e);
        return { statusCode: 400, body: "Invalid Request Body" };
    }
    
    // Netlify submission-created events wrap data in a 'payload' object
    const payload = body.payload || body;
    const data = payload.data || {};
    const netlifyFormName = payload.form_name || data['form-name'] || "Unknown_Source";
    
    console.log(`SOURCE DETECTED: [${netlifyFormName}]`);
    
    // 2. Caprock Discord Webhook Configuration
    // SECURE: Prioritize the Environment Variable from Netlify Dashboard
    const DISCORD_URL = process.env.DISCORD_WEBHOOK_URL || "https://discord.com/api/webhooks/1459433932553584703/H1hmPninZQ888hL7lFDrtIzAVo0mnMs0axjYm0i6nfsmTLqi1F7t7YHsXyqySxKyp91k";

    if (!DISCORD_URL || DISCORD_URL.length < 10) {
        console.error("CRITICAL ERROR: Discord Webhook URL is missing or invalid.");
        return { statusCode: 500, body: "Configuration Error" };
    }

    // 3. Strategic Branding & Escalation Matrix
    let title = "🚨 NEW INTEL: Site Lead";
    let typeLabel = "General Site Form";
    let color = 3447003; // Default Blue
    let mention = "";

    // High-Ticket Sentry Logic (Safety Orange Branding)
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

    // 4. Construct and Sanitize the Payload
    const cleanValue = (val, fallback) => (val && String(val).trim() !== "") ? String(val) : fallback;

    const embed = {
        title: title,
        color: color,
        fields: [
            {
                name: "Lead Type",
                value: cleanValue(typeLabel, "Site Submission"),
                inline: true
            },
            {
                name: "Form Source",
                value: cleanValue(netlifyFormName, "Internal"),
                inline: true
            },
            {
                name: "Commander / Contact",
                value: cleanValue(data.name || data['full-name'] || data['commander-name'], "Anonymous / Unspecified"),
                inline: false
            },
            {
                name: "Direct Line",
                value: cleanValue(data.phone, "No Phone Provided"), 
                inline: true 
            },
            {
                name: "Secure Email",
                value: cleanValue(data.email, "No Email Provided"),
                inline: true
            },
            {
                name: "Site Intel / Message",
                value: cleanValue(data.message || data['site-details'] || data['site-message'], "Request for direct contact.").substring(0, 1000),
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

    // 5. Tactical Dispatch to Discord via HTTPS
    return new Promise((resolve, reject) => {
        try {
            const url = new URL(DISCORD_URL);
            const options = {
                hostname: url.hostname,
                path: url.pathname + url.search,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(discordPayload),
                    'User-Agent': 'Caprock-Dispatch-Bot/3.3'
                },
            };

            const request = https.request(options, (res) => {
                let responseBody = '';
                res.on('data', (chunk) => { responseBody += chunk; });
                res.on('end', () => {
                    console.log(`DISCORD RESPONSE CODE: [${res.statusCode}]`);
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        console.log("SUCCESS: Intel successfully relayed to Discord.");
                        resolve({ statusCode: 200, body: 'Alert Dispatched' });
                    } else {
                        console.error(`DISCORD API FAILURE: ${res.statusCode}. Details: ${responseBody}`);
                        resolve({ statusCode: res.statusCode, body: 'Discord API Error' });
                    }
                });
            });

            request.on('error', (e) => {
                console.error('NETWORK ERROR: Connection to Command Center lost.', e);
                resolve({ statusCode: 500, body: 'Network Error' });
            });

            request.write(discordPayload);
            request.end();
        } catch (urlError) {
            console.error("CRITICAL ERROR: Malformed Discord URL.", urlError);
            resolve({ statusCode: 500, body: 'Malformed Webhook URL' });
        }
    });
};
