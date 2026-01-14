const https = require('https');

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
    const formName = payload.form_name || "Unknown";

    let title = "🚨 NEW LEAD";
    let color = 3447003;

    if (formName === 'risk-audit') {
        title = "🔥 RISK AUDIT BRIEFING";
        color = 15548997;
    }

    const fields = [
        { name: "Company", value: data['company-name-hidden'] || data['bizName'] || "Unknown", inline: true },
        { name: "Contact", value: data.name || "Anonymous", inline: true },
        { name: "Score", value: data['immunity-score'] ? `**${data['immunity-score']}/100**` : "N/A", inline: true }
    ];

    if (formName === 'risk-audit') {
        fields.push({ 
            name: "Audit Breakdown", 
            value: `MFA: ${data.q1 == '25' ? '✅' : '❌'}\nBackup: ${data.q2 == '35' ? '✅' : '❌'}\nDefense: ${data.q3 == '25' ? '✅' : '❌'}`, 
            inline: false 
        });
    }

    const discordPayload = JSON.stringify({
        username: "Caprock Bot",
        content: "@everyone", 
        embeds: [{ title, color, fields, timestamp: new Date().toISOString() }]
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
