# Email Management System

This is an email management system I built that helps sort through emails using AI. It can tell which emails are from interested leads and sends notifications to Slack.

## What it does

- Uses AI to sort emails into categories (interested leads, meetings booked, etc)
- Sends Slack messages when important emails come in
- Watches multiple email accounts at once
- Suggests replies using AI
- Stores everything in Elasticsearch for easy searching
- Has webhooks so other apps can get updates

## Setting it up

You'll need:
- Node.js
- Elasticsearch running locally
- Gmail account(s) with IMAP enabled
- Some API keys (OpenAI, Slack)

Quick start:
1. Clone the repo
2. Run `npm install`
3. Copy `.env.example` to `.env` and fill in your API keys
4. Start Elasticsearch locally
5. Run `npm run dev` to start the server

## How it's built

The backend uses:
- Node.js + TypeScript
- OpenAI API for the AI stuff
- node-imap for checking emails
- Elasticsearch for storing emails
- Slack API for notifications

## Set up Docker for Elastic

Run these commands:

- `cd backend`
- `docker-compose d -v`
- `docker-compose up -v`

## Set up the .env

- Create a new .env file in the backend folder
- Copy the variable names from .env.example file
- Add the given OpenAI key for categorization and RAG to work
- Add you slack token and channel ID for slack notifications
- Add webhook URL for webhook testing


Main folders:

backend/
├── services/ # All the main logic
├── types/ # TypeScript types
└── server.ts # Express server setup


## Main features

Email Classification:
- Checks emails using IMAP
- Uses AI to figure out if it's an interested lead
- Stores results in Elasticsearch

Notifications:
- Sends Slack messages for important emails
- Has webhooks for custom integrations

AI Features:
- Categorizes emails automatically
- Suggests replies based on email content
- Uses RAG for better context

## API Endpoints

The server provides these endpoints:

### Email Retrieval
- `GET /api/emails` - Get all emails
- `GET /api/email-updates` - Real-time updates

### Search Endpoints
Basic search:
- `GET /api/emails/search?searchText=text` - Search emails containing text
- `GET /api/emails/search?folder=[Gmail]/Spam` - Get emails from Spam folder
- `GET /api/emails/search?folder=[Gmail]/Important` - Get emails from Important folder
- `GET /api/emails/search?account=imap-account@gmail.com` - Get emails from specific account

Category filters:
- `GET /api/emails/search?category=Interested` - Get interested leads
- `GET /api/emails/search?category=Spam` - Get spam emails
- `GET /api/emails/search?category=Meeting Booked` - Get confirmed meetings
- `GET /api/emails/search?category=Not Interested` - Get rejected leads
- `GET /api/emails/search?category=Out of Office` - Get out of office replies

Combined search:
- `GET /api/emails/search?folder=[Gmail]/[folder]&searchText=text` - Search with text in any folder

### Webhook Endpoint
- `GET https://webhook.site/token/{your-token}/requests` - View webhook notifications for interested leads

You can combine search parameters (searchText, folder, account, category) to create more specific queries.

## Demo

Video link: [https://drive.google.com/file/d/1tIGzlE2iJAoNe94UBzxGrNh1lgaRbtFn/view?usp=sharing]

## Environment Variables

You'll need these in your .env file:

OPENAI_API_KEY=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

(Only for testing; will be deactivated after sometime)

## Note: Using 2 gmail id's for IMAP since all other mail services (Outlook, Yahoo, iCloud) have stopped offering less-secure option.

## Challenges Faced

During development and deployment, you might encounter these common issues:

### IMAP Connection Errors
- `Error: Invalid credentials (Failure)` - Wrong email/password or 2FA is enabled
- `Error: Connection timed out` - Network issues or IMAP server unreachable
- `AUTHENTICATIONFAILED` - Less secure app access not enabled in Gmail
- `Error: self signed certificate` - SSL certificate verification issues with IMAP

### Elasticsearch Errors
- `ECONNREFUSED 127.0.0.1:9200` - Elasticsearch not running locally
- `No Living connections` - Elasticsearch cluster is down or unreachable
- `index_not_found_exception` - Trying to query an index that doesn't exist
- `cluster_block_exception` - Disk space full or read-only mode activated

### OpenAI API Errors
- `429 Too Many Requests` - Rate limit exceeded
- `401 Unauthorized` - Invalid API key
- `400 Bad Request` - Invalid request format or parameters
- `500 Internal Server Error` - OpenAI service issues

### Slack API Errors
- `not_authed` - Invalid Slack token
- `channel_not_found` - Incorrect channel ID
- `invalid_auth` - Token expired or revoked
- `rate_limited` - Too many requests to Slack API

### Docker Issues
- `Error: bind: address already in use` - Port 9200 already occupied
- `Error: max virtual memory areas vm.max_map_count [65530] is too low` - Elasticsearch container needs increased virtual memory
- `Error: Container exited with code 78` - Insufficient system resources for Elasticsearch

### Common Solutions

1. For IMAP Issues:
   - Enable "Less secure app access" in Gmail
   - Create an App Password if using 2FA
   - Check network connectivity
   - Verify IMAP is enabled in Gmail settings

2. For Elasticsearch:
   ```bash
   # Increase virtual memory for Elasticsearch
   sudo sysctl -w vm.max_map_count=262144
   
   # Clear Elasticsearch data and restart
   docker-compose down -v
   docker-compose up -d
   ```

3. For OpenAI:
   - Implement rate limiting
   - Check API key permissions
   - Verify request payload format

4. For Slack:
   - Regenerate Slack token
   - Verify bot permissions
   - Check channel ID format
