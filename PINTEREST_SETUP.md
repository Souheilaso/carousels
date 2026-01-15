# Pinterest Integration Setup Guide

## Overview

Pinterest integration has been added to your carousel creator app! However, there are important limitations to understand:

### ⚠️ Important Limitations

**Pinterest API does NOT support public image search** like Pexels does. The Pinterest API only allows you to:
- Search pins from **your own Pinterest account**
- Access boards and pins that **you own**

This means users must:
1. Connect their Pinterest account via OAuth
2. Search will only show results from their own pins/boards

## Setup Instructions

### Step 1: Create a Pinterest Developer App

1. Go to [Pinterest Developers](https://developers.pinterest.com/)
2. Sign in with your Pinterest account
3. Click "Create app"
4. Fill in the app details:
   - **App name**: Your app name (e.g., "Carousel Crafter")
   - **App description**: Brief description of your app
   - **Website URL**: Your app's URL
   - **Redirect URI**: Must match your app's URL exactly (e.g., `http://localhost:5173/` for local dev)
5. **Select Environment**: Choose between:
   - **Sandbox** (Recommended for development/testing)
     - Easier to get approved
     - Perfect for testing and development
     - Limited to your own account initially
     - No app review required
   - **Production Limited** (For production apps)
     - Requires app review by Pinterest
     - More restrictions initially
     - Better for production deployments
   
   **For now, choose "Sandbox"** - you can always switch to Production later after testing.

6. After creating the app, you'll get:
   - **App ID** (Client ID) - This is what you need for the integration
   - **App Secret** (not needed for PKCE flow - we use client-side OAuth)

### Step 2: Get Your App ID

After creating your app and selecting the environment (Sandbox or Production Limited):

1. Go to your app's dashboard
2. Navigate to the environment you selected (Sandbox or Production Limited)
3. You'll see your **App ID** (also called Client ID)
4. Copy this App ID - you'll need it in the next step

**Note**: The App ID is different for Sandbox vs Production Limited, so make sure you're copying from the correct environment tab.

### Step 3: Configure Environment Variables

Create a `.env.local` file in your project root (if it doesn't exist) and add:

#### Option A: OAuth Flow (Recommended)

For the full OAuth experience where users connect their own accounts:

```env
VITE_PEXELS_API_KEY=your_pexels_api_key_here
VITE_PINTEREST_APP_ID=your_pinterest_app_id_here
```

Replace `your_pinterest_app_id_here` with the **App ID** (Client ID) you copied from step 2.

**Important Notes:**
- The redirect URI in your Pinterest app settings must match your app's URL exactly
- For local development: `http://localhost:5173/`
- For production: Your actual domain URL
- Pinterest uses PKCE (Proof Key for Code Exchange) flow, so you don't need the App Secret in the frontend
- **Restart your development server** after adding/updating environment variables

#### Option B: Manual Access Token (For Testing Only)

If you have a manually generated access token (like from Pinterest's token generator), you can use it directly for testing:

```env
VITE_PEXELS_API_KEY=your_pexels_api_key_here
VITE_PINTEREST_ACCESS_TOKEN=pina_YOUR_TOKEN_HERE
```

**Note**: This bypasses OAuth and uses your token directly. This is useful for testing, but for production you should use Option A (OAuth flow) so each user can connect their own account.

### Step 4: Test the Integration

1. Start your development server: `npm run dev`
2. Open the app and navigate to the image uploader
3. Click on the "Pinterest" tab in the search section
4. Click "Connect Pinterest" to authenticate
5. After authentication, you can search your own pins

## How It Works

### OAuth Flow (PKCE)

1. User clicks "Connect Pinterest"
2. App generates a code verifier and challenge
3. User is redirected to Pinterest for authentication
4. Pinterest redirects back with an authorization code
5. App exchanges the code for an access token
6. Access token is stored in localStorage
7. User can now search their pins

### Search Functionality

- **Pexels**: Public search (no authentication needed)
- **Pinterest**: Private search (only user's own pins, requires OAuth)

## API Permissions

The integration requests the following Pinterest API scopes:
- `pins:read` - Read user's pins
- `boards:read` - Read user's boards

## Troubleshooting

### "Pinterest App ID is not configured"
- Make sure you've added `VITE_PINTEREST_APP_ID` to your `.env.local` file
- Restart your development server after adding environment variables

### "Failed to fetch" or CORS Errors
- **Development**: The app uses a Vite proxy to avoid CORS issues. Make sure your dev server is running (`npm run dev`)
- **Production**: Pinterest's OAuth token endpoint doesn't allow direct browser requests due to CORS. You have two options:
  1. **Use a backend proxy**: Set up a simple backend service to proxy OAuth token requests
  2. **Use manual access token**: For testing, you can use `VITE_PINTEREST_ACCESS_TOKEN` in your environment variables (see Option B above)
- If you see CORS errors in the browser console, the proxy isn't working. Check that:
  - Your dev server is running on the correct port (default: 8080)
  - The Vite proxy configuration in `vite.config.ts` is correct
  - You've restarted the dev server after any configuration changes

### "Pinterest authentication expired"
- The access token may have expired
- User needs to reconnect their Pinterest account

### "No pins found"
- User may not have any pins matching the search query
- Search only works on pins from the authenticated user's account

### Redirect URI Mismatch
- Ensure the redirect URI in your Pinterest app settings matches your app URL exactly
- Check for trailing slashes and protocol (http vs https)
- For local development: `http://localhost:8080/` (or your configured port)
- For production: Your actual domain URL

## Alternative: Unsplash Integration

If you want a public image search API similar to Pexels, consider adding Unsplash:
- Free API with generous rate limits
- Public search (no user authentication needed)
- High-quality stock photos

Would you like me to add Unsplash integration as well?

