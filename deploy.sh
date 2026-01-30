#!/bin/bash

echo "🔥 Firebase Deployment Script for Vilko Puoja RestaurantOrder"
echo "============================================="
echo ""

# Step 1: Login to Firebase
echo "Step 1: Login to Firebase"
echo "Please follow the browser prompt to login..."
firebase login

# Step 2: Select the project
echo ""
echo "Step 2: Selecting project 'vilko-puota'..."
firebase use vilko-puota

# Step 3: Build the app
echo ""
echo "Step 3: Building the app..."
npm run build:firebase

# Step 4: Deploy Firestore rules
echo ""
echo "Step 4: Deploying Firestore security rules..."
firebase deploy --only firestore:rules

# Step 5: Deploy to Firebase Hosting
echo ""
echo "Step 5: Deploying to Firebase Hosting..."
firebase deploy --only hosting

echo ""
echo "============================================="
echo "✅ Deployment Complete!"
echo ""
echo "🌐 Your app is now live at:"
echo "   https://vilko-puota.web.app"
echo "   https://vilko-puota.firebaseapp.com"
echo ""
echo "📱 Test Credentials:"
echo "   Email: admin@vilko.com"
echo "   Password: admin123"
echo ""
echo "🚀 Features:"
echo "   ✅ PWA with offline support"
echo "   ✅ Firebase Authentication"
echo "   ✅ Firestore real-time database"
echo "   ✅ Offline persistence enabled"
echo "   ✅ Install on mobile devices"
echo "============================================="