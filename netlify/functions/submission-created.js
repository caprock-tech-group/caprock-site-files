const https = require('https');

exports.handler = async function(event, context) {
    // Parse the Netlify event body
    let payload;
    try {
        payload = JSON.parse(event.body).payload;
    } catch (e) {
        console.error("Error parsing event body:", e);
        return { statusCode: 400, body: "Invalid Request Body" };
    }
    
    const { data } = payload;
    
    // Your Hardcoded Discord Webhook URL for Caprock Command Center
    const DISCORD_URL = "https://discord.com/api/webhooks/1459433932553584703/H1hmPninZQ888hL7lFDrtIzAVo0mnMs0axjYm0i6nfsmTLqi1F7t7YHsXyqySxKyp91k";

    // Determine form type for the header to differentiate between MSP leads and Solar leads
    const formName = data['form-name'] || 'Unknown Form';
    let title = "🚨 NEW INTEL: Site Lead";
    let color = 4906624; // Brand Blue (#4ade80)

    if (formName === 'solar-inquiry') {
        title = "☀️ HOT LEAD: Tactical Solar Trailer";
        color = 16761095; // Bright Yellow for high-impact visibility
    }

    // Construct the Discord Embed structure for a professional "Ops Center" look
    const embed = {
        title: title,
        color: color,
        fields: [
            {
                name: "Lead Source",
                value: formName,
                inline: true
            },
            {
                name: "Contact Person",
                value: data.name || data['full-name'] || "N/A",
                inline: true
            },
            {
                name: "Mobile / Phone",
                value: data.phone || "N/A", 
                inline: false 
            },
            {
                name: "Email Address",
                value: data.email || "N/A",
                inline: true
            },
            {
                name: "Intel / Message",
                value: data.message || "Request for information only.",
                inline: false
            }
        ],
        footer: {
            text: "Caprock Command Center • Amarillo, TX",
        },
        timestamp: new Date().toISOString()
    };

    const body = JSON.stringify({ embeds: [embed] });

    // Send the POST request to Discord
    return new Promise((resolve, reject) => {
        const url = new URL(DISCORD_URL);
        const options = {
            hostname: url.hostname,
            path: url.pathname + url.search,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(body),
            },
        };

        const request = https.request(options, (res) => {
            let responseBody = '';
            res.on('data', (chunk) => { responseBody += chunk; });
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve({ statusCode: 200, body: 'Alert Dispatched to Discord' });
                } else {
                    console.error(`Discord API Error: ${res.statusCode} ${responseBody}`);
                    resolve({ statusCode: res.statusCode, body: `Discord Error: ${responseBody}` });
                }
            });
        });

        request.on('error', (e) => {
            console.error('Network Error:', e);
            reject({ statusCode: 500, body: e.message });
        });

        request.write(body);
        request.end();
    });
};
