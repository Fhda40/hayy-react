# Deploy Cloud Functions

## First time setup:
```bash
cd /root/hayy-react/functions
npm install
```

## Deploy:
```bash
firebase deploy --only functions --project fbrg87
```

## What it does:
- Watches the `coupons` collection for status changes
- When a coupon status changes to `used`, sends a push notification to the merchant
- Finds the merchant's FCM token using their phone number
