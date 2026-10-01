package com.feirafacil.app;

import android.content.Context;
import android.content.SharedPreferences;
import android.content.pm.PackageInfo;
import android.graphics.Bitmap;
import android.os.Build;
import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebChromeClient;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        try {
            WebView webView = getBridge() != null ? getBridge().getWebView() : null;
            if (webView != null) {
                WebSettings settings = webView.getSettings();
                settings.setMediaPlaybackRequiresUserGesture(false);
                settings.setJavaScriptEnabled(true);
                settings.setDomStorageEnabled(true);
                settings.setAllowFileAccess(true);
                settings.setAllowContentAccess(true);
                settings.setDatabaseEnabled(true);

                // Detect APK version change and clear WebView cache immediately
                SharedPreferences prefs = getSharedPreferences("feira_facil_app_prefs", Context.MODE_PRIVATE);
                int lastVersionCode = prefs.getInt("last_version_code", -1);
                
                PackageInfo pInfo = getPackageManager().getPackageInfo(getPackageName(), 0);
                int currentVersionCode = Build.VERSION.SDK_INT >= Build.VERSION_CODES.P 
                    ? (int) pInfo.getLongVersionCode() 
                    : pInfo.versionCode;

                if (lastVersionCode != currentVersionCode) {
                    // Instantly flush WebView cache on app upgrade so the new APK assets load on the very first launch
                    webView.clearCache(true);
                    prefs.edit().putInt("last_version_code", currentVersionCode).apply();
                }

                // Provide a transparent 1x1 video poster so Android WebView never displays
                // the default black circle play button placeholder on video surfaces
                webView.setWebChromeClient(new BridgeWebChromeClient(getBridge()) {
                    @Override
                    public Bitmap getDefaultVideoPoster() {
                        return Bitmap.createBitmap(1, 1, Bitmap.Config.ARGB_8888);
                    }
                });
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}



