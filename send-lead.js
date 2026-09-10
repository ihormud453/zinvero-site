module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch (e) {
      body = {};
    }
  }
  body = body || {};

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim() : '';
  const comment = typeof body.comment === 'string' ? body.comment.trim() : '';
  const companyWebsite = typeof body.company_website === 'string' ? body.company_website.trim() : '';

  // Honeypot: якщо приховане поле заповнене — це бот. Мовчки повертаємо
  // успіх, нічого не надсилаючи, щоб бот не намагався обійти захист інакше.
  if (companyWebsite !== '') {
    return res.status(200).json({ ok: true });
  }

  if (!name || !phone) {
    return res.status(400).json({ ok: false, error: 'Podaj imię i telefon' });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID || '-5467754477';

  if (!token) {
    console.error('TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID is not set');
    return res.status(500).json({ ok: false, error: 'Server misconfigured' });
  }

  const lines = [
    '🟧 Nowe zgłoszenie — Zinvero',
    `👤 ${name}`,
    `📞 ${phone}`,
  ];
  if (email) lines.push(`✉️ ${email}`);
  if (comment) lines.push(`📝 ${comment}`);

  try {
    const tgRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: lines.join('\n') }),
    });

    if (!tgRes.ok) {
      const errText = await tgRes.text();
      console.error('Telegram API error:', errText);
      return res.status(502).json({ ok: false, error: 'Failed to send notification' });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Telegram request failed:', err);
    return res.status(502).json({ ok: false, error: 'Failed to send notification' });
  }
};
