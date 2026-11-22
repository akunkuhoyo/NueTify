package com.ptnuevagroup.nuetify

import android.Manifest
import android.annotation.SuppressLint
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Color
import android.os.Build
import android.os.Bundle
import android.view.View
import android.webkit.CookieManager
import android.webkit.JavascriptInterface
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat

class BackgroundWebView(context: Context) : WebView(context) {
    override fun onWindowVisibilityChanged(visibility: Int) {
        if (visibility != View.GONE) {
            super.onWindowVisibilityChanged(visibility)
        } else {
            super.onWindowVisibilityChanged(View.VISIBLE)
        }
    }
}

class MainActivity : AppCompatActivity() {

    private lateinit var webView: BackgroundWebView

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        window.statusBarColor = Color.parseColor("#121212")
        window.navigationBarColor = Color.parseColor("#121212")

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS)
                != PackageManager.PERMISSION_GRANTED
            ) {
                ActivityCompat.requestPermissions(
                    this,
                    arrayOf(Manifest.permission.POST_NOTIFICATIONS),
                    100
                )
            }
        }

        webView = BackgroundWebView(this).apply {
            setBackgroundColor(Color.parseColor("#121212"))
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.databaseEnabled = true
            settings.mediaPlaybackRequiresUserGesture = false
            settings.mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
            settings.userAgentString = "${settings.userAgentString} NueTifyAndroid/1.1"
            webViewClient = WebViewClient()
            webChromeClient = WebChromeClient()
            addJavascriptInterface(NativeBridge(), "NueTifyNative")
        }

        CookieManager.getInstance().setAcceptCookie(true)
        CookieManager.getInstance().setAcceptThirdPartyCookies(webView, true)

        setContentView(webView)

        MusicForegroundService.onActionListener = { action ->
            runOnUiThread {
                webView.onResume()
                webView.resumeTimers()
                webView.evaluateJavascript(
                    "window.dispatchEvent(new CustomEvent('nuetify-native-action', { detail: '$action' }));",
                    null
                )
            }
        }

        MusicForegroundService.onSeekListener = { posMs ->
            runOnUiThread {
                val sec = posMs / 1000.0
                webView.onResume()
                webView.resumeTimers()
                webView.evaluateJavascript(
                    "window.dispatchEvent(new CustomEvent('nuetify-native-seek', { detail: $sec }));",
                    null
                )
            }
        }

        webView.loadUrl("https://nuetify.vercel.app/")
    }

    override fun onPause() {
        super.onPause()
        if (::webView.isInitialized) {
            webView.onResume()
            webView.resumeTimers()
        }
    }

    override fun onStop() {
        super.onStop()
        if (::webView.isInitialized) {
            webView.onResume()
            webView.resumeTimers()
        }
    }

    inner class NativeBridge {
        @JavascriptInterface
        fun updateMediaState(
            title: String,
            artist: String,
            isPlaying: Boolean,
            shuffleOn: Boolean,
            repeatMode: String,
            artworkUrl: String,
            positionMs: Long,
            durationMs: Long
        ) {
            val intent = Intent(this@MainActivity, MusicForegroundService::class.java).apply {
                action = MusicForegroundService.ACTION_UPDATE
                putExtra("title", title)
                putExtra("artist", artist)
                putExtra("isPlaying", isPlaying)
                putExtra("shuffleOn", shuffleOn)
                putExtra("repeatMode", repeatMode)
                putExtra("artworkUrl", artworkUrl)
                putExtra("positionMs", positionMs)
                putExtra("durationMs", durationMs)
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                ContextCompat.startForegroundService(this@MainActivity, intent)
            } else {
                startService(intent)
            }
        }

        @JavascriptInterface
        fun updateMediaPosition(positionMs: Long, durationMs: Long, isPlaying: Boolean) {
            val intent = Intent(this@MainActivity, MusicForegroundService::class.java).apply {
                action = MusicForegroundService.ACTION_POSITION
                putExtra("positionMs", positionMs)
                putExtra("durationMs", durationMs)
                putExtra("isPlaying", isPlaying)
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                ContextCompat.startForegroundService(this@MainActivity, intent)
            } else {
                startService(intent)
            }
        }
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        if (::webView.isInitialized && webView.canGoBack()) {
            webView.goBack()
        } else {
            moveTaskToBack(true)
        }
    }
}
