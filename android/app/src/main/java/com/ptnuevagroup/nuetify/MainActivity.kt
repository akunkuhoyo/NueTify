package com.ptnuevagroup.nuetify

import android.Manifest
import android.annotation.SuppressLint
import android.content.ContentValues
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Color
import android.media.AudioManager
import android.media.audiofx.BassBoost
import android.media.audiofx.Equalizer
import android.media.audiofx.LoudnessEnhancer
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Environment
import android.provider.MediaStore
import android.util.Base64
import android.view.View
import android.webkit.CookieManager
import android.webkit.JavascriptInterface
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.browser.customtabs.CustomTabsIntent
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import org.json.JSONArray
import java.io.File
import java.io.FileOutputStream

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
    private var equalizer: Equalizer? = null
    private var bassBoost: BassBoost? = null
    private var loudnessEnhancer: LoudnessEnhancer? = null
    private var lastEqBandsJson: String = ""
    private var lastBassBoostOn: Boolean = false
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

        initAudioEffects()

        webView = BackgroundWebView(this).apply {
            setBackgroundColor(Color.parseColor("#121212"))
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.databaseEnabled = true
            settings.mediaPlaybackRequiresUserGesture = false
            settings.mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
            settings.userAgentString = "${settings.userAgentString} NueTifyAndroid/1.3"
            webViewClient = object : WebViewClient() {
                override fun shouldOverrideUrlLoading(
                    view: WebView?,
                    request: WebResourceRequest?
                ): Boolean {
                    val uri = request?.url ?: return false
                    val urlStr = uri.toString()
                    val hostStr = uri.host ?: ""
                    val isOAuth =
                        hostStr.contains("accounts.google.com") ||
                        urlStr.contains("/auth/v1/authorize")
                    if (isOAuth) {
                        launchExternalBrowser(uri)
                        return true
                    }
                    return false
                }
            }
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

        if (intent?.data?.scheme == "nuetify") {
            handleAuthDeepLink(intent)
        } else {
            webView.loadUrl("https://nuetify.vercel.app/")
        }
    }

    private fun launchExternalBrowser(uri: Uri) {
        try {
            val customTabs = CustomTabsIntent.Builder()
                .setShowTitle(true)
                .build()
            customTabs.launchUrl(this, uri)
        } catch (_: Exception) {
            try {
                startActivity(Intent(Intent.ACTION_VIEW, uri))
            } catch (_: Exception) {
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        handleAuthDeepLink(intent)
    }

    private fun handleAuthDeepLink(intent: Intent?) {
        val uri = intent?.data ?: return
        if (uri.scheme == "nuetify" && uri.host == "auth") {
            val fragment = uri.encodedFragment
            val query = uri.encodedQuery
            val targetUrl = buildString {
                append("https://nuetify.vercel.app/")
                if (!query.isNullOrBlank()) append("?").append(query)
                if (!fragment.isNullOrBlank()) append("#").append(fragment)
            }
            webView.loadUrl(targetUrl)
        }
    }

    private fun initAudioEffects() {
        try {
            equalizer = Equalizer(0, 0).apply { enabled = true }
        } catch (_: Exception) {
            equalizer = null
        }
        try {
            bassBoost = BassBoost(0, 0).apply { enabled = false }
        } catch (_: Exception) {
            bassBoost = null
        }
        try {
            loudnessEnhancer = LoudnessEnhancer(0).apply { enabled = false }
        } catch (_: Exception) {
            loudnessEnhancer = null
        }
    }

    override fun onPause() {
        super.onPause()
        CookieManager.getInstance().flush()
        if (::webView.isInitialized) {
            webView.onResume()
            webView.resumeTimers()
        }
    }

    override fun onStop() {
        super.onStop()
        CookieManager.getInstance().flush()
        if (::webView.isInitialized) {
            webView.onResume()
            webView.resumeTimers()
        }
    }

    override fun onDestroy() {
        try { equalizer?.release() } catch (_: Exception) {}
        try { bassBoost?.release() } catch (_: Exception) {}
        try { loudnessEnhancer?.release() } catch (_: Exception) {}
        super.onDestroy()
    }

    inner class NativeBridge {
        @JavascriptInterface
        fun openExternalAuth(url: String) {
            runOnUiThread {
                launchExternalBrowser(Uri.parse(url))
            }
        }

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

        @JavascriptInterface
        fun setEqualizer(bandsJson: String, bassBoostOn: Boolean) {
                   if (bandsJson == lastEqBandsJson && bassBoostOn == lastBassBoostOn) return;
            lastEqBandsJson = bandsJson; lastBassBoostOn = bassBoostOn;
            runOnUiThread {
                try {
                    if (equalizer == null && bassBoost == null && loudnessEnhancer == null) {
                        initAudioEffects()
                    }
                    val arr = JSONArray(bandsJson)
                    val gainsDb = DoubleArray(arr.length()) { i -> arr.optDouble(i, 0.0) }
                    val eq = equalizer
                    var extraBoostMb = 0
                    if (eq != null) {
                        val numBands = eq.numberOfBands.toInt()
                        val minLevel = eq.bandLevelRange[0].toInt()
                        val maxLevel = eq.bandLevelRange[1].toInt()
                        val anyNonZero = gainsDb.any { it != 0.0 }
                        eq.enabled = anyNonZero
                        for (b in 0 until numBands) {
                            val idx = if (gainsDb.isNotEmpty()) {
                                ((b.toDouble() / numBands) * gainsDb.size).toInt().coerceIn(0, gainsDb.size - 1)
                            } else 0
                            val targetMb = (gainsDb[idx] * 100.0).toInt()
                            val clamped = targetMb.coerceIn(minLevel, maxLevel)
                            eq.setBandLevel(b.toShort(), clamped.toShort())
                            if (targetMb > maxLevel) {
                                val overflow = targetMb - maxLevel
                                if (overflow > extraBoostMb) extraBoostMb = overflow
                            }
                        }
                    }
                    loudnessEnhancer?.let { le ->
                        if (extraBoostMb > 0) {
                            le.setTargetGain(extraBoostMb.coerceAtMost(2500))
                            le.enabled = true
                        } else {
                            le.setTargetGain(0)
                            le.enabled = false
                        }
                    }
                    bassBoost?.let { bb ->
                        if (bassBoostOn) {
                            bb.setStrength(800.toShort())
                            bb.enabled = true
                        } else {
                            bb.setStrength(0.toShort())
                            bb.enabled = false
                        }
                    }
                } catch (_: Exception) {
                }
            }
        }

                       @JavascriptInterface
        fun setSystemVolume(percent: Int) {
    runOnUiThread {
                try {
                    val am = getSystemService(Context.AUDIO_SERVICE) as AudioManager
                    val maxVol = am.getStreamMaxVolume(AudioManager.STREAM_MUSIC)
                    val clamped = percent.coerceIn(0, 100)
                    val target = Math.round((clamped / 100.0) * maxVol).toInt().coerceIn(0, maxVol)
                    am.setStreamVolume(AudioManager.STREAM_MUSIC, target, 0)
                } catch (_: Exception) {
                }
    }
        }
        @JavascriptInterface
        fun savePngImage(base64DataUrl: String, filename: String): Boolean {
            return try {
                val cleanBase64 = base64DataUrl.substringAfter("base64,", base64DataUrl)
                val bytes = Base64.decode(cleanBase64, Base64.DEFAULT)
                val safeName = if (filename.endsWith(".png")) filename else "$filename.png"
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    val values = ContentValues().apply {
                        put(MediaStore.Images.Media.DISPLAY_NAME, safeName)
                        put(MediaStore.Images.Media.MIME_TYPE, "image/png")
                        put(MediaStore.Images.Media.RELATIVE_PATH, Environment.DIRECTORY_PICTURES + "/NueTify")
                        put(MediaStore.Images.Media.IS_PENDING, 1)
                    }
                    val uri = contentResolver.insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, values)
                        ?: return false
                    contentResolver.openOutputStream(uri)?.use { it.write(bytes) }
                    values.clear()
                    values.put(MediaStore.Images.Media.IS_PENDING, 0)
                    contentResolver.update(uri, values, null, null)
                } else {
                    @Suppress("DEPRECATION")
                    val dir = File(
                        Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_PICTURES),
                        "NueTify"
                    )
                    if (!dir.exists()) dir.mkdirs()
                    FileOutputStream(File(dir, safeName)).use { it.write(bytes) }
                }
                runOnUiThread {
                    Toast.makeText(
                        this@MainActivity,
                        "Kartu lirik disimpan ke Galeri (Pictures/NueTify)",
                        Toast.LENGTH_SHORT
                    ).show()
                }
                true
            } catch (_: Exception) {
                false
            }
        } 
        @JavascriptInterface
        fun getAppVersionName(): String {
            return try {
                packageManager.getPackageInfo(packageName, 0).versionName ?: ""
                } catch (_: Exception) {
                ""
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
