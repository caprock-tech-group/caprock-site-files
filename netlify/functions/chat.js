export const handler = async (event) => {
  // Only allow POST from your site
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST,OPTIONS" } };
  }
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method Not Allowed" }) };
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const backend = process.env.BACKEND_URL;        // e.g. https://api.caprocktech.com
    const apikey  = process.env.BACKEND_API_KEY;    // your long hex key

    if (!backend || !apikey) {
      return { statusCode: 500, body: JSON.stringify({ error: "Missing BACKEND_URL or BACKEND_API_KEY" }) };
    }

    const r = await fetch(backend.replace(/\/$/, "") + "/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apikey },
      body: JSON.stringify(body)
    });

    const text = await r.text(); // pass through whatever JSON the API returns
    return { statusCode: r.status, body: text };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: String(e) }) };
  }
};
