const https = require('https');

/**
 * Netlify Background Function: submission-created
 * This runs automatically every time a form is submitted on your site.
 * It dispatches a tactical alert to your Discord Command Center.
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
    
    // Extract form identity - checking both possible Netlify locations
    const data = payload.data || {};
    const netlifyFormName = payload.form_name || data['form-name'] || "Unknown Form";
    
    console.log(`Detected Form Name: ${netlifyFormName}`);
    
    // 2. Caprock Discord Webhook URL
    const DISCORD_URL = "https://discord.com/api/webhooks/1459433932553584703/H1hmPninZQ888hL7lFDrtIzAVo0mnMs0axjYm0i6nfsmTLqi1F7t7YHsXyqySxKyp91k";

    // 3. Define Branding & Terminology
    let title = "🚨 NEW INTEL: Site Lead";
    let typeLabel = "General Site Form";
    let color = 3447003; // Default Blue
    let detailsField = data.message || "Request for direct contact.";

    // Differentiation logic
    if (netlifyFormName === 'solar-inquiry') {
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
    else if (netlifyFormName === 'recovery-lead') {
        title = "📞 RECOVERY OP: Missed-Call Scan";
        typeLabel = "Missed-Call Recovery Scan";
        color = 16753920; // Safety Orange (Urgency)
        // This form asks for Company, not a message
        detailsField = `Target Company: ${data.company || "Not Specified"}`;
    }
    else if (netlifyFormName === 'sentry-lead') {
         title = "🛡️ SENTRY INTEL: Solar Trailer Inquiry";
         typeLabel = "Tactical Assessment Request";
         color = 15158332; // Red (High Priority)
    }

    // 4. Construct the Payload for Discord
    const embed = {
        title: title,
        color: color,
        fields: [
            {
                name: "Submission Type",
                value: String(typeLabel),
                inline: true
            },
            {
                name: "Contact Person",
                value: String(data.name || data['full-name'] || "Anonymous"),
                inline: true
            },
            {
                name: "Mobile / Phone",
                value: String(data.phone || "No Phone Provided"), 
                inline: false 
            },
            {
                name: "Email Address",
                value: String(data.email || "No Email Provided (Phone Only)"),
                inline: true
            },
            {
                name: "Lead Details / Scope",
                value: String(detailsField),
                inline: false
            }
        ],
        footer: {
            text: "Caprock Command Center • Amarillo, TX",
        },
        timestamp: new Date().toISOString()
    };

    const discordPayload = JSON.stringify({
        username: "Caprock Bot",
        content: "@everyone", 
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
                'User-Agent': 'Caprock-Lead-Bot/2.0'
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
