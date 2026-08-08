## Deployment Checklist

This project now has the internship features implemented in the original training codebase. To finish the submission requirements, deploy:

1. Backend from `server`
2. Frontend from `yourtube`

## 1. Backend deployment

Recommended: Render

Files prepared:
- [render.yaml](c:/Users/ADMIN/Downloads/you_tube2.0-main/you_tube2.0-main/render.yaml)
- [server/.env.example](c:/Users/ADMIN/Downloads/you_tube2.0-main/you_tube2.0-main/server/.env.example)

Steps:
1. Create a MongoDB Atlas cluster.
2. Create a Render web service using the `server` folder.
3. Set all environment variables from `server/.env.example`.
4. Make sure `MONGO_URI` points to Atlas, not localhost.
5. After deploy, note the backend URL, for example `https://yourtube-backend.onrender.com`.

## 2. Frontend deployment

Recommended: Vercel

Files prepared:
- [vercel.json](c:/Users/ADMIN/Downloads/you_tube2.0-main/you_tube2.0-main/vercel.json)
- [yourtube/.env.example](c:/Users/ADMIN/Downloads/you_tube2.0-main/you_tube2.0-main/yourtube/.env.example)

Steps:
1. Import the repo into Vercel.
2. Set the root directory to `yourtube`.
3. Add the frontend environment variables from `yourtube/.env.example`.
4. Set `NEXT_PUBLIC_BACKEND_URL` to the live backend URL.
5. Add your Firebase web app credentials as the `NEXT_PUBLIC_FIREBASE_*` variables.

## Required external services

You still need real account credentials for:
- MongoDB Atlas
- Razorpay test keys
- SMTP mail provider
- Twilio SMS
- Translation API
- Firebase project / Firestore

These cannot be created automatically from inside the local workspace.

## Final submission checks

After deployment, verify on the live URL:
- South India login uses email OTP
- Other states use mobile OTP
- Theme follows login time and region rule
- Free plan stops video at 5 minutes
- Bronze/Silver/Gold upgrade works
- Invoice email sends after plan payment
- Free user can download one video per day only
- Downloads page lists downloaded videos
- Call, screen share, and local recording work
- Comment translation works
- Special-character comments are blocked
- A comment is removed after 2 dislikes
- Mobile and tablet layouts are usable
