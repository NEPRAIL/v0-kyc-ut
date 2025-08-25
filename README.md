# KYCut

*Automatically synced with your [v0.app](https://v0.app) deployments*

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com/neprails-projects/v0-kyc-ut-5o)
[![Built with v0](https://img.shields.io/badge/Built%20with-v0.app-black?style=for-the-badge)](https://v0.app/chat/projects/Q2J9jKmqRYn)

## Overview

This repository will stay in sync with your deployed chats on [v0.app](https://v0.app).
Any changes you make to your deployed app will be automatically pushed to this repository from [v0.app](https://v0.app).

## Deployment

Your project is live at:

**[https://vercel.com/neprails-projects/v0-kyc-ut-5o](https://vercel.com/neprails-projects/v0-kyc-ut-5o)**

## Build your app

Continue building your app on:

**[https://v0.app/chat/projects/Q2J9jKmqRYn](https://v0.app/chat/projects/Q2J9jKmqRYn)**

## How It Works

1. Create and modify your project using [v0.app](https://v0.app)
2. Deploy your chats from the v0 interface
3. Changes are automatically pushed to this repository
4. Vercel deploys the latest version from this repository

### Update a user password (CLI)

\`\`\`bash
# username
DATABASE_URL=... npm run pw:update:username --silent
# email
DATABASE_URL=... npm run pw:update:email --silent

# Or manual:
node scripts/update-password.js --username=TEST --password=StrongPass123
node scripts/update-password.js --email=usr@mail.com --hash=$2b$12$...
