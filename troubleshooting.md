# Troubleshooting a Blank White Page on Vercel

A blank white page on a deployed Vercel application is a common issue that often points to missing environment variables. This document provides steps to resolve this issue for the Expense Manager application.

## Cause

The Expense Manager application uses Firebase for its backend services and potentially other APIs (like Gemini). These services require API keys and other configuration details to be available to the application at runtime. These keys are stored in environment variables. When these variables are not set in the Vercel project, the application will fail to initialize properly, resulting in a blank white page.

## Solution

To fix this, you need to add the required environment variables to your Vercel project settings.

### Required Environment Variables

You need to add the following environment variables to your Vercel project:

**Firebase:**
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_MEASUREMENT_ID`

**Gemini:**
- `GEMINI_API_KEY`

### Steps to Add Environment Variables in Vercel

1.  **Open your Vercel Dashboard:** Go to [https://vercel.com/dashboard](https://vercel.com/dashboard).
2.  **Select your Project:** Click on the Expense Manager project.
3.  **Go to Settings:** Navigate to the "Settings" tab.
4.  **Go to Environment Variables:** In the left sidebar, click on "Environment Variables".
5.  **Add the Variables:** For each variable listed above, add a new environment variable:
    -   **Key:** The name of the variable (e.g., `VITE_FIREBASE_API_KEY`).
    -   **Value:** The corresponding value from your Firebase project configuration and your Gemini API key.
    -   **Environment:** Select the environments (Production, Preview, Development) where the variable should be available.
6.  **Save:** Click "Save" to add the variable.
7.  **Redeploy:** After adding all the variables, you need to redeploy your application for the changes to take effect. Go to the "Deployments" tab, select the latest deployment, and click "Redeploy".

After the new deployment is complete, the application should be accessible and the blank white page issue should be resolved.
