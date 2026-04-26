# Phase 3: The PWA Engine (Service Workers)

## Overview
This phase upgrades Macadam from a standard web page to a **Progressive Web App (PWA)**. By doing so, the application can be installed directly onto a Dasher's phone home screen and will function flawlessly even without an internet connection.

## Components Implemented

### 1. The Web App Manifest (`manifest.json`)
The manifest file acts as the blueprint for the browser to understand how the app should look when installed.
- **`display: standalone`**: This removes the browser's URL address bar and navigation buttons, making Macadam look exactly like a native iOS/Android app.
- **`theme_color: #dc3545`**: Matches our Bootstrap danger-red theme, coloring the phone's status bar to match the app.
- **Icons**: Outlined paths for 192x192 and 512x512 icons, which are required by modern browsers to trigger the "Add to Home Screen" installation prompt.

### 2. The Service Worker (`sw.js`)
The Service Worker acts as a client-side proxy between the browser and the network.
- **Pre-Caching**: Upon installation, the Service Worker immediately downloads and caches all critical HTML files (`/`, `/weekly`, `/expenses`), our CSS/JS, and external Bootstrap/Dexie libraries.
- **"Network First" Strategy**: When the app requests a page (e.g. `GET /weekly`), the Service Worker tries the network first to get the freshest version. If the network fails (the Dasher is completely offline), it intercepts the failure and instantly returns the cached HTML instead.
- Because Phase 2 moved all data rendering to the client side (reading from Dexie), the cached HTML still functions perfectly, allowing the user to view, edit, and add earnings completely offline.

### 3. Server Configuration (`app.py`)
Service Workers have a security restriction called "Scope." A Service Worker can only intercept requests for paths that are equal to or deeper than its own location. 
If we put `sw.js` in `/static/`, it could only intercept `/static/*` requests, which is useless for caching the main `/weekly` HTML.
To fix this without complex HTTP header manipulation, we added a specific Flask route to serve `sw.js` from the absolute root of the domain:
```python
@app.route("/sw.js")
def service_worker():
    return send_from_directory("static", "sw.js", mimetype="application/javascript")
```

### Next Developer Steps
With the PWA Engine complete, Macadam is fully offline-capable. The final step is **Phase 4: The Backup/Restore System**, which will provide users a mechanism to safely export their Dexie IndexedDB data to a JSON file and import it across devices, completely circumventing the need for a cloud backend.
