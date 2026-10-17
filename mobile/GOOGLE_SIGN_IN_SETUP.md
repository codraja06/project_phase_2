# CivicTrack Google sign-in setup

Google sign-in requires OAuth credentials from your own Google Cloud project. The
client ID is public configuration; never place a Google client secret in the app.

1. In [Google Auth Platform](https://console.cloud.google.com/auth/overview),
   configure Branding and Audience. For an External app in Testing, add the
   Google accounts you will use under Test users.
2. In [Clients](https://console.cloud.google.com/auth/clients), create a **Web
   application** OAuth client. For local web testing, add
   `http://localhost:8081` as an authorized JavaScript origin and redirect URI.
   Add your actual web domain and matching redirect URI if you host the web app.
   Copy the Web client ID, which ends in `.apps.googleusercontent.com`.
3. Create a second OAuth client of type **Android** in the same Google project:
   - Package name: `com.yourorganization.swacchaai`
   - SHA-1 of the current EAS preview signing certificate:
     `6F:3B:AD:C2:33:D5:E6:8C:E0:48:31:08:17:BB:33:B2:38:88:F3:1A`
   If the EAS signing key changes, get the new SHA-1 from the signed APK and
   register it in another Android OAuth client.
4. Put the **Web client ID** in `mobile/.env` as
   `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=...` and in `backend/.env` as
   `GOOGLE_CLIENT_ID=...`. Use the same value in both places. Restart the
   backend and Expo after changing these files. If the API is hosted, deploy
   the updated backend and set `GOOGLE_CLIENT_ID` in that service's environment.
5. Set `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` to the same value in the Expo EAS
   **preview** environment. Rebuild the Android APK with
   `eas build -p android --profile preview`. The previous APK lacks the native
   Google sign-in module and will not work for this feature.
6. Install the new APK. A new Citizen can use **Continue with Google** directly.
   An existing Citizen or Officer must first sign in with their password, open
   Profile, and use **Connect Google Account** with the same email address.
   Afterwards they can use **Continue with Google** on their respective portal.

The preview APK still uses the LAN backend URL in `eas.json`. The phone and
backend must be on the same network. For internet access, configure a reachable
HTTPS backend URL and rebuild the APK.
