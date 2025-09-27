# Cloud Proxy Deployment

## Vercel Deployment (Recommended)

1. Install Vercel CLI:
```bash
npm install -g vercel
```

2. Deploy the proxy:
```bash
cd ethglobal-trading-bot/deploy
vercel --prod
```

3. Set environment variable:
```bash
vercel env add AUTHORIZATION
# Enter: Bearer YOUR_ONEINCH_API_KEY
```

4. Update your bot's .env:
```
ONEINCH_PROXY_URL=https://your-deployment.vercel.app
```

## Railway Deployment (Alternative)

1. Install Railway CLI:
```bash
npm install -g @railway/cli
```

2. Deploy:
```bash
railway login
railway init
railway add
railway deploy
```

3. Set environment:
```bash
railway variables set AUTHORIZATION="Bearer YOUR_ONEINCH_API_KEY"
```

## Heroku Deployment (Alternative)

1. Create Heroku app:
```bash
heroku create your-oneinch-proxy
```

2. Set environment:
```bash
heroku config:set AUTHORIZATION="Bearer YOUR_ONEINCH_API_KEY"
```

3. Deploy:
```bash
git push heroku main
```

## Local Testing

1. Install dependencies:
```bash
cd ethglobal-trading-bot/deploy
npm install
```

2. Set environment:
```bash
export AUTHORIZATION="Bearer YOUR_ONEINCH_API_KEY"
```

3. Run locally:
```bash
npm start
```

4. Test:
```bash
curl "http://localhost:3000/?url=https://api.1inch.dev/orderbook/v4.0/42161/orders"
```

## Environment Variables

- `AUTHORIZATION`: Your 1inch API key in format `Bearer YOUR_API_KEY`

## Usage

The proxy forwards requests to 1inch API with proper authentication:

```
GET/POST https://your-proxy.com/?url=https://api.1inch.dev/endpoint
```

All headers and body are forwarded to the 1inch API with the Authorization header added automatically.
