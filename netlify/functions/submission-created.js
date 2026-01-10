const https = require('https');

exports.handler = async function(event, context) {
    console.log("--- New Form Submission Detected ---");

    // 1. Parse the Netlify event body
    let payload;
    try {
        const body = JSON.parse(event.body);
        payload = body.payload;
    } catch (e) {
        console.error("Critical Error: Could not parse event body.", e);
        return { statusCode: 400, body: "Invalid Request Body" };
    }
    
    // Netlify provides the form name in payload.form_name
    const netlifyFormName = payload.form_name || "Unknown Form";
    const data = payload.data || {};
    
    // 2. Your Hardcoded Discord Webhook URL
    const DISCORD_URL = "https://discord.com/api/webhooks/1459433932553584703/H1hmPninZQ888hL7lFDrtIzAVo0mnMs0axjYm0i6nfsmTLqi1F7t7YHsXyqySxKyp91k";

    // 3. Define Branding & Terminology (Oren Klaff / Tactical Style)
    let title = "🚨 NEW INTEL: Site Lead";
    let typeLabel = "General Site Form";
    let color = 3447003; // Default Blue

    // Check against official Netlify form names
    if (netlifyFormName === 'solar-inquiry') {
        title = "☀️ HOT LEAD: Solar Form Submission";
        typeLabel = "Solar Form"; // Exact wording requested
        color = 16761095; // High-visibility Yellow/Orange
    } 
    else if (netlifyFormName === 'contact-v8') {
        title = "🛡️ MSP INTEL: MSP Information Request";
        typeLabel = "MSP Information Request"; // Exact wording requested
        color = 4906624; // Caprock Brand Blue (#4ade80)
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
                value: String(data.email || "No Email Provided"),
                inline: true
            },
            {
                name: "Lead Details",
                value: String(data.message || "Request for direct contact."),
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
        content: "@everyone", // Ensure the notification "dings" everyone
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
                    console.log(`Success: Dispatched ${typeLabel} alert to Discord.`);
                    resolve({ statusCode: 200, body: 'Alert Sent' });
                } else {
                    console.error(`Discord API Error: ${res.statusCode}. Response: ${responseBody}`);
                    resolve({ statusCode: res.statusCode, body: 'Discord API Error' });
                }
            });
        });

        request.on('error', (e) => {
            console.error('Network level error occurred:', e);
            resolve({ statusCode: 500, body: 'Network Error' });
        });

        request.write(discordPayload);
        request.end();
    });
};
