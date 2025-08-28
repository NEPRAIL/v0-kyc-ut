# KYCut Telegram Bot

A Telegram bot for order management and account linking for KYCut.

This package contains everything you need to run the bot locally against your site.

## Files
- `kycut_telegram_bot.py` — the bot implementation.
- `requirements.txt` — Python dependencies.
- `.env.example` — copy to `.env` and fill your values.
- `run_bot.sh` — convenience launcher.

## Quick start

1) Create and activate a Python 3.12+ venv (recommended)

\`\`\`bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
\`\`\`

2) Configure environment

Copy `.env.example` to `.env` and set:

- `BOT_TOKEN` (or `TELEGRAM_BOT_TOKEN`)
- `WEBSITE_URL` (e.g., `https://kycut.com` or `http://localhost:3000`)
- `WEBHOOK_SECRET` (must match your site)
- optionally `ADMIN_ID`

3) Run the bot

\`\`\`bash
python3 kycut_telegram_bot.py
\`\`\`

Or use the helper:

\`\`\`bash
./run_bot.sh
\`\`\`

Logs are written to stdout; a PID-based single-instance lock prevents multiple pollers.

## Notes
- The bot stores lightweight session state in `BOT_LOCAL_DB` (SQLite) for local persistence.
- For local testing, you can set `WEBSITE_URL=http://localhost:3000` and use your Next.js dev server.
- Endpoints used are listed near the top of `kycut_telegram_bot.py` (API_ENDPOINTS).
