const https = require('https');

/**
 * Netlify Background Function: submission-created
 * Full Briefing Version: Includes Scores, Company Intel, and Q&A Breakdown.
 */
exports.handler = async function(event, context) {
    console.log("--- New Form Submission Received ---");

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
    
    // Security: Access the Discord Webhook from Netlify Environment Variables
    const DISCORD_URL = process.env.DISCORD_WEBHOOK_URL;

    if (!DISCORD_URL) {
        console.error("CRITICAL ERROR: DISCORD_WEBHOOK_URL environment variable is missing.");
        return { statusCode: 500, body: "Configuration Error" };
    }

    // Define Branding Based on Source
    let title = "🚨 NEW INTEL: Site Lead";
    let typeLabel = "General Site Form";
    let color = 3447003; // Default Blue

    if (netlifyFormName === 'risk-audit') {
        title = "🔥 HIGH PRIORITY: Risk Audit Briefing";
        typeLabel = "Strategic Risk Assessment";
        color = 15548997; // Tactical Red
    } else if (netlifyFormName === 'solar-inquiry') {
        title = "☀️ HOT LEAD: Solar Trailer Inquiry";
        typeLabel = "Solar Fleet Inquiry";
        color = 16761095; 
    }

    [span_1](start_span)// Build the Core Contact Fields[span_1](end_span)
    const fields = [
        { name: "Company", value: `**${data['company-name-hidden'] || data['bizName'] || "Not Provided"}**`, inline: true },
        { name: "Contact", value: String(data.name || "Anonymous"), inline: true },
        { name: "Phone", value: String(data.phone || "No Phone"), inline: true },
        { name: "Email", value: String(data.email || "No Email"), inline: true }
    ];

    // Map Immunity Score for Risk Audit Leads
    if (data['immunity-score']) {
        fields.push({ 
            name: "Final Immunity Score", 
            value: `🚀 **${data['immunity-score']}/100**`, 
            inline: false 
        });
    }

    // TACTICAL Q&A BREAKDOWN
    // These match the IDs in your risk.html form logic
    if (netlifyFormName === 'risk-audit') {
        const qaSummary = [
            `**1. MFA Enforced?** ${data.q1 === '25' ? '✅ YES' : '❌ NO'}`,
            `**2. Backup Tested?** ${data.q2 === '35' ? '✅ YES' : '❌ NO'}`,
            `**3. Active Defense?** ${data.q3 === '25' ? '✅ YES' : '❌ NO'}`,
        ].join('\n');

        fields.push({ 
            name: "Audit Response Data", 
            value: qaSummary, 
            inline: false 
        });
    }

    fields.push({ 
        name: "Lead Comments", 
        value: String(data.message || "User requested a strategic consultation."), 
        inline: false 
    });

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
                    resolve({ statusCode: 200, body: 'Alert Dispatched' });
                } else {
                    resolve({ statusCode: res.statusCode, body: 'Discord API Error' });
                }
            });
        });

        request.on('error', (e) => resolve({ statusCode: 500, body: 'Network Error' }));
        request.write(discordPayload);
        request.end();
    });
};
