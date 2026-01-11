const https = require('https');

/**
 * Netlify Background Function: submission-created
 * This runs automatically every time a form is submitted on your site.
 * It dispatches a tactical alert to your Discord Command Center.
 * Updated to handle high-status Solar Sentry leads with priority routing.
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
    
    // Extract form identity
    const data = payload.data || {};
    const netlifyFormName = payload.form_name || data['form-name'] || "Unknown Form";
    
    console.log(`Detected Form Name: ${netlifyFormName}`);
    
    // 2. Caprock Discord Webhook URL
    const DISCORD_URL = "https://discord.com/api/webhooks/1459433932553584703/H1hmPninZQ888hL7lFDrtIzAVo0mnMs0axjYm0i6nfsmTLqi1F7t7YHsXyqySxKyp91k";

    // 3. Strategic Branding & Escalation Logic
    let title = "🚨 NEW INTEL: Site Lead";
    let typeLabel = "General Site Form";
    let color = 3447003; // Default Blue
    let mention = "";

    // Specific logic for the Solar Sentry ($44,999.95 asset)
    if (netlifyFormName === 'sentry-lead' || netlifyFormName === 'solar-inquiry') {
        title = "⚡ HIGH-VALUE TARGET: Solar Sentry Inquiry";
        typeLabel = "Solar Sentry Strategic Assessment";
        color = 16347926; // Safety Orange (#f97316)
        mention = "@everyone"; // Immediate escalation for high-ticket inquiries
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

    // 4. Construct the Payload for Discord
    const embed = {
        title: title,
        color: color,
        fields: [
            {
                name: "Lead Type",
                value: String(typeLabel),
                inline: true
            },
            {
                name: "Commander / Contact",
                value: String(data.name || data['full-name'] || "Anonymous"),
                inline: true
            },
            {
                name: "Direct Line",
                value: String(data.phone || "No Phone Provided"), 
                inline: false 
            },
            {
                name: "Secure Email",
                value: String(data.email || "No Email Provided"),
                inline: true
            },
            {
                name: "Site Intel / Project Scope",
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
        content: mention, 
        embeds: [embed]
    });

    // 5. Dispatch to Discord
    return new Promise((resolve, reject) => {
        const url = new URL(DISCORD_URL);
        const options = {
            hostname: url.hostname,
            path: url.pathname + url.search,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(discordPayload),
                'User-Agent': 'Caprock-Dispatch-Bot/3.0'
            },
        };

        const request = https.request(options, (res) => {
            let responseBody = '';
            res.on('data', (chunk) => { responseBody += chunk; });
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
