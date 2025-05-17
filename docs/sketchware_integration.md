# Sketchware Integration Guide

This document provides instructions for integrating the M3U8 Stream Player with Sketchware applications. Follow these steps to incorporate the streaming features into your mobile app.

## Overview

The integration will allow your Sketchware app to:
1. Search for files using the API
2. Convert TID (TMDB ID) to IID (IMDB ID)
3. Generate encrypted stream URLs
4. Play streams directly in a WebView or external player

## Prerequisites

- Sketchware Pro (or regular Sketchware with Custom View capability)
- Basic knowledge of Sketchware blocks and WebView implementation
- Internet permission in your app

## Implementation Steps

### 1. Add Required Components to Your App

#### Required Views:
- EditText for search input
- Button for search
- ListView to display results
- WebView for playing content
- ProgressBar for loading states

#### Required Custom Libraries:
- OkHttp for API calls
- Gson for JSON parsing

### 2. API Endpoints

The following API endpoints are available for integration:

```
// Search for files
GET /api/search-files?query={searchQuery}

// Convert TID to IID
GET /api/tmdb-to-imdb/{tmdbId}

// Get extraction URL (for admin only)
GET /api/config/extraction-url
```

### 3. Basic Implementation

#### Step 1: Create the UI Layout

1. Add a search bar (EditText) and a search button
2. Add a ListView to display search results
3. Add a WebView (initially invisible) for playing content

#### Step 2: Search Implementation

```java
// Block: onClick (Search Button)
String searchQuery = editText.getText().toString();
if (!searchQuery.isEmpty()) {
    progressBar.setVisibility(View.VISIBLE);
    requestNetwork.startRequestNetwork(
        RequestNetworkController.GET,
        "https://your-app-domain.com/api/search-files?query=" + Uri.encode(searchQuery),
        "search",
        _requestListener);
}

// Block: onResponse (RequestNetwork)
if (_tag.equals("search")) {
    progressBar.setVisibility(View.GONE);
    
    try {
        JSONObject response = new JSONObject(_response);
        if (response.getBoolean("success")) {
            JSONArray results = response.getJSONArray("results");
            
            // Populate results to a list for the ListView
            ArrayList<HashMap<String, Object>> listMap = new ArrayList<>();
            for (int i = 0; i < results.length(); i++) {
                JSONObject item = results.getJSONObject(i);
                HashMap<String, Object> map = new HashMap<>();
                map.put("title", item.getString("title"));
                map.put("id", item.getInt("id"));
                
                if (item.has("release_date")) {
                    map.put("year", item.getString("release_date").substring(0, 4));
                } else {
                    map.put("year", "Unknown");
                }
                
                listMap.add(map);
            }
            
            // Set ListView adapter
            listView.setAdapter(new SimpleAdapter(
                getActivity(), 
                listMap,
                R.layout.search_item, 
                new String[] {"title", "year"}, 
                new int[] {R.id.textTitle, R.id.textYear}
            ));
        } else {
            Toast.makeText(getActivity(), "No results found", Toast.LENGTH_SHORT).show();
        }
    } catch (Exception e) {
        Toast.makeText(getActivity(), "Error: " + e.getMessage(), Toast.LENGTH_SHORT).show();
    }
}
```

#### Step 3: Handle Item Selection and TMDB to IMDB Conversion

```java
// Block: onItemClick (ListView)
HashMap<String, Object> item = (HashMap<String, Object>) listView.getItemAtPosition(_position);
int tmdbId = (Integer) item.get("id");

// Make request to convert TMDB ID to IMDB ID
requestNetwork.startRequestNetwork(
    RequestNetworkController.GET,
    "https://your-app-domain.com/api/tmdb-to-imdb/" + tmdbId,
    "convert",
    _requestListener);

// Block: onResponse (RequestNetwork) - Add this to your existing listener
if (_tag.equals("convert")) {
    try {
        JSONObject response = new JSONObject(_response);
        if (response.getBoolean("success")) {
            String imdbId = response.getString("imdbId");
            
            // Generate the encrypted URL or directly use the encrypted URL
            playContent(imdbId);
        } else {
            Toast.makeText(getActivity(), "Conversion failed", Toast.LENGTH_SHORT).show();
        }
    } catch (Exception e) {
        Toast.makeText(getActivity(), "Error: " + e.getMessage(), Toast.LENGTH_SHORT).show();
    }
}
```

#### Step 4: Play Content in WebView

```java
// Method: playContent
private void playContent(String imdbId) {
    // Show progress
    progressBar.setVisibility(View.VISIBLE);
    
    // Create encrypted player URL
    String playerUrl = "https://your-app-domain.com/secure-player?id=" + imdbId;
    
    // Load WebView
    webView.setVisibility(View.VISIBLE);
    webView.getSettings().setJavaScriptEnabled(true);
    webView.getSettings().setDomStorageEnabled(true);
    webView.loadUrl(playerUrl);
    
    // Handle WebView completion
    webView.setWebViewClient(new WebViewClient() {
        @Override
        public void onPageFinished(WebView view, String url) {
            progressBar.setVisibility(View.GONE);
        }
        
        @Override
        public void onReceivedError(WebView view, int errorCode, String description, String failingUrl) {
            Toast.makeText(getActivity(), "Error: " + description, Toast.LENGTH_SHORT).show();
            progressBar.setVisibility(View.GONE);
        }
    });
}
```

### 4. Advanced Features

#### External Player Support

To open streams in external players, add an option in your app:

```java
// Method: openInExternalPlayer
private void openInExternalPlayer(String streamUrl) {
    Intent intent = new Intent(Intent.ACTION_VIEW);
    intent.setDataAndType(Uri.parse(streamUrl), "application/x-mpegURL");
    intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
    
    try {
        startActivity(intent);
    } catch (ActivityNotFoundException e) {
        Toast.makeText(getActivity(), "No compatible player found", Toast.LENGTH_LONG).show();
    }
}
```

#### Custom Controls for WebView Player

To implement custom controls for the WebView player, you can inject JavaScript:

```java
// After WebView loads
webView.evaluateJavascript(
    "document.querySelector('video').addEventListener('pause', function() { " +
    "  window.webApp.onVideoPause(); " +
    "});", 
    null
);

// Add JavaScript interface
webView.addJavascriptInterface(new Object() {
    @JavascriptInterface
    public void onVideoPause() {
        runOnUiThread(() -> {
            Toast.makeText(getActivity(), "Video paused", Toast.LENGTH_SHORT).show();
        });
    }
}, "webApp");
```

### 5. Security Considerations

- Store API keys securely using Android's KeyStore
- Use HTTPS for all network requests
- Don't expose direct stream URLs to users
- Consider implementing user authentication for accessing premium content

## Sample Sketchware Project

You can download a sample Sketchware project that demonstrates these integrations from:

```
https://your-app-domain.com/sketchware-demo.zip
```

## Troubleshooting

**Issue**: WebView doesn't play the video
**Solution**: Ensure JavaScript is enabled and the user has a stable internet connection

**Issue**: External player doesn't open
**Solution**: Make sure the user has a compatible player installed (MX Player, VLC, etc.)

**Issue**: API calls fail
**Solution**: Check your internet connection and ensure you're using the correct endpoints

## Support

For additional support or queries, contact us through the Admin panel.