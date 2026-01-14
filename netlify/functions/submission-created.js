const https = require('https');

/**
 * Netlify Background Function: submission-created
 * Hardened version to ensure Phone and Company data are captured.
 */
exports.handler = async function(event, context) {
    const DISCORD_URL = process.env.DISCORD_WEBHOOK_URL;
    if (!DISCORD_URL) return { statusCode: 500, body: "Webhook missing" };

    let payload;
    try {
        payload = JSON.parse(event.body).payload;
    } catch (e) {
        return { statusCode: 400, body: "Invalid Body" };
    }
    
    const data = payload.data || {};
    const formName = payload.form_name || data['form-name'] || "Unknown";

    // Branding logic
    let title = "🚨 NEW LEAD";
    let color = 3447003;
    if (formName === 'risk-audit') {
        title = "🔥 RISK AUDIT BRIEFING";
        color = 15548997;
    }

    // Hardened data extraction to prevent missing fields
    const company = data['company-name-hidden'] || data['bizName'] || "Not Provided";
    const contact = data.name || data['full-name'] || "Anonymous";
    const phone = data.phone || data['Phone Number'] || "No Phone Provided";
    const email = data.email || "No Email Provided";
    const score = data['immunity-score'] ? `**${data['immunity-score']}/100**` : "N/A";

    const fields = [
        { name: "Company", value: company, inline: true },
        { name: "Contact", value: contact, inline: true },
        { name: "Phone", value: phone, inline: true },
        { name: "Email", value: email, inline: true },
        { name: "Score", value: score, inline: true }
    ];

    if (formName === 'risk-audit') {
        // Detailed breakdown based on actual answer values
        const mfa = data.q1 == '25' ? '✅ Enforced' : '❌ Not Enforced';
        const backup = data.q2 == '35' ? '✅ Tested' : '❌ Unverified';
        const defense = data.q3 == '25' ? '✅ Managed EDR' : '❌ Basic/None';
        
        fields.push({ 
            name: "Audit Breakdown", 
            value: `**Identity:** ${mfa}\n**Survival:** ${backup}\n**Defense:** ${defense}`, 
            inline: false 
        });
    }

    const discordPayload = JSON.stringify({
        username: "Caprock Bot",
        content: "@everyone", 
        embeds: [{ 
            title, 
            color, 
            fields, 
            footer: { text: "Caprock Command Center • Amarillo, TX" },
            timestamp: new Date().toISOString() 
        }]
    });

    return new Promise((resolve) => {
        const url = new URL(DISCORD_URL);
        const req = https.request({
            hostname: url.hostname,
            path: url.pathname + url.search,
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, (res) => resolve({ statusCode: res.statusCode }));
        req.write(discordPayload);
        req.end();
    });
};
