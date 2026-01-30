# Firebase Deployment Instructions

## After completing Firebase Console setup, run these commands:

### 1. Login to Firebase CLI
```bash
firebase login
```

### 2. Initialize Firebase project
```bash
firebase use vilko-puota
```

### 3. Deploy Firestore rules
```bash
firebase deploy --only firestore:rules
```

### 4. Deploy the complete app
```bash
npm run firebase:deploy
```

## Your app will be live at:
https://vilko-puota.web.app

## Test credentials:
- Email: admin@vilko.com
- Password: admin123

## What's included:
✅ PWA with offline support
✅ Firebase Authentication
✅ Firestore real-time database
✅ Firebase Hosting with HTTPS
✅ Install prompts on mobile devices