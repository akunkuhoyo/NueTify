package com.ptnuevagroup.nuetify

import android.Manifest
import android.annotation.SuppressLint
import android.app.DownloadManager
import android.content.BroadcastReceiver
import android.content.IntentFilter
import androidx.core.content.FileProvider
import android.content.ContentValues
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Color
import android.media.AudioManager
import android.media.audiofx.BassBoost
import android.media.audiofx.Equalizer
import android.media.audiofx.LoudnessEnhancer
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.NetworkRequest
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
import android.webkit.WebResourceError
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
       super.onWindowVisibilityChanged(View.VISIBLE)
    }

    override fun onVisibilityChanged(changedView: View, visibility: Int) {
        super.onVisibilityChanged(changedView, View.VISIBLE)
    }
}

class MainActivity : AppCompatActivity() {

    private val appUrl = "https://nuetify.vercel.app/"
    private var triedOfflineCacheFallback = false
    private var showingFallbackScreen = false
    private var networkCallback: ConnectivityManager.NetworkCallback? = null
    private lateinit var webView: BackgroundWebView
    private var equalizer: Equalizer? = null
    private var bassBoost: BassBoost? = null
    private var loudnessEnhancer: LoudnessEnhancer? = null
    private var lastEqBandsJson: String = ""
    private var lastBassBoostOn: Boolean = false
    private var desiredEqEnabled = false
    private var desiredBassBoostEnabled = false
    private var desiredLoudnessEnabled = false

    private fun getInstalledAppVersion(): String {
        return try {
            val info = packageManager.getPackageInfo(packageName, 0)
            info.versionName ?: "1.0.0"
        } catch (_: Exception) {
            "1.0.0"
        }
    }
    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        activeInstance = java.lang.ref.WeakReference(this)
        NotificationPushReceiver.scheduleNext(this)

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
            settings.userAgentString = "${settings.userAgentString} NueTifyAndroid/1.3 NueTifyAppVer/${getInstalledAppVersion()}"
            settings.cacheMode = if (isNetworkAvailable()) WebSettings.LOAD_DEFAULT else WebSettings.LOAD_CACHE_ELSE_NETWORK
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
                override fun onPageFinished(view: WebView?, url: String?) {
                    super.onPageFinished(view, url)
                    if (url?.startsWith("https://nuetify.vercel.app") == true) {
                        triedOfflineCacheFallback = false
                        showingFallbackScreen = false
                    }
                }

                override fun onReceivedError(
                    view: WebView?,
                    request: WebResourceRequest?,
                    error: WebResourceError?
                ) {
                    super.onReceivedError(view, request, error)
                    if (request?.isForMainFrame == true) {
                        if (!triedOfflineCacheFallback) {
                            triedOfflineCacheFallback = true
                            view?.settings?.cacheMode = WebSettings.LOAD_CACHE_ONLY
                            view?.loadUrl(appUrl)
                        } else {
                            showingFallbackScreen = true
                            view?.loadDataWithBaseURL(
                                appUrl,
                                buildOfflineShellHtml(),
                                "text/html",
                                "UTF-8",
                                null
                            )
                        }
                    }
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
                if (action != "REPEAT" && action != "SHUFFLE") webView.onResume()
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
        try {
            val cm = getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager
            val callback = object : ConnectivityManager.NetworkCallback() {
                override fun onAvailable(network: Network) {
                    runOnUiThread {
                        if (::webView.isInitialized) {
                            webView.settings.cacheMode = WebSettings.LOAD_DEFAULT
                            if (showingFallbackScreen) {
                                triedOfflineCacheFallback = false
                                showingFallbackScreen = false
                                webView.loadUrl(appUrl)
                            }
                        }
                    }
                }
            }
            networkCallback = callback
            val request = NetworkRequest.Builder()
                .addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
                .build()
            cm?.registerNetworkCallback(request, callback)
        } catch (_: Exception) {
        }
    }

    private fun isNetworkAvailable(): Boolean {
        return try {
            val cm = getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                val network = cm.activeNetwork ?: return false
                val capabilities = cm.getNetworkCapabilities(network) ?: return false
                capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
            } else {
                @Suppress("DEPRECATION")
                cm.activeNetworkInfo?.isConnected == true
            }
        } catch (_: Exception) {
            false
        }
    }

    private fun buildOfflineShellHtml(): String {
        return """
            <!DOCTYPE html>
            <html lang="id">
            <head>
                <meta charset="UTF-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
                <style>
                    * { box-sizing: border-box; margin: 0; padding: 0; }
                    html, body {
                        width: 100%;
                        height: 100%;
                        background-color: #121212;
                        color: #FFFFFF;
                        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        text-align: center;
                        padding: 24px;
                    }
                    .container {
                        max-width: 340px;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        gap: 16px;
                    }
                    .icon-wrap {
                        width: 72px;
                        height: 72px;
                        border-radius: 50%;
                        background: rgba(192, 192, 192, 0.12);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        margin-bottom: 4px;
                    }
                    h1 {
                        font-size: 22px;
                        font-weight: 700;
                        color: #FFFFFF;
                    }
                    p {
                        font-size: 14px;
                        line-height: 1.5;
                        color: #B3B3B3;
                    }
                    button {
                        margin-top: 8px;
                        background-color: #C0C0C0;
                        color: #121212;
                        border: none;
                        border-radius: 9999px;
                        padding: 12px 28px;
                        font-size: 14px;
                        font-weight: 600;
                        cursor: pointer;
                    }
                    button:active {
                        opacity: 0.85;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="icon-wrap">
                        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#C0C0C0" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M9 18V5l12-2v13"></path>
                            <circle cx="6" cy="18" r="3"></circle>
                            <circle cx="18" cy="16" r="3"></circle>
                        </svg>
                    </div>
                    <h1>Mode Offline</h1>
                    <p>Tidak ada koneksi internet saat ini. Sambungkan internet sekali untuk menyimpan data aplikasi, atau ketuk tombol di bawah.</p>
                    <button type="button" onclick="window.NueTifyNative && window.NueTifyNative.retryConnection()">Coba Hubungkan Ulang</button>
                </div>
            </body>
            </html>
        """.trimIndent()
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
            equalizer = Equalizer(0, 0).apply { enabled = false }
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

    fun updateHardwareAudioEffectsEnabled() {
        runOnUiThread {
            val shouldEnable = isNueTifyPlaying && !hasExternalAudioFocusLoss
            try { equalizer?.enabled = shouldEnable && desiredEqEnabled } catch (_: Exception) {}
            try { bassBoost?.enabled = shouldEnable && desiredBassBoostEnabled } catch (_: Exception) {}
            try { loudnessEnhancer?.enabled = shouldEnable && desiredLoudnessEnabled } catch (_: Exception) {}
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
        try {equalizer?.enabled = false;  equalizer?.release() } catch (_: Exception) {}
        try {bassBoost?.enabled = false;  bassBoost?.release() } catch (_: Exception) {}
        try {loudnessEnhancer?.enabled = false;  loudnessEnhancer?.release() } catch (_: Exception) {}
        try {
            networkCallback?.let { callback ->
                val cm = getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager
                cm?.unregisterNetworkCallback(callback)
            }
            networkCallback = null
        } catch (_: Exception) {
        }
        super.onDestroy()
    }

    inner class NativeBridge {
        @JavascriptInterface
        fun getAppVersion(): String = getInstalledAppVersion()
        @JavascriptInterface
        fun showPushNotification(id: String, title: String, body: String) {
            NotificationPushReceiver.showNotification(this@MainActivity, id, title, body)
        }
        @JavascriptInterface
        fun openExternalAuth(url: String) {
            runOnUiThread {
                launchExternalBrowser(Uri.parse(url))
            }
        }
        @JavascriptInterface
        fun retryConnection() {
            runOnUiThread {
                triedOfflineCacheFallback = false
                showingFallbackScreen = false
                webView.settings.cacheMode = if (isNetworkAvailable()) {
                    WebSettings.LOAD_DEFAULT
                } else {
                    WebSettings.LOAD_CACHE_ELSE_NETWORK
                }
                webView.loadUrl(appUrl)
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
            isNueTifyPlaying = isPlaying
            if (isPlaying) hasExternalAudioFocusLoss = false
            updateHardwareAudioEffectsEnabled()
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
            isNueTifyPlaying = isPlaying
            if (isPlaying) hasExternalAudioFocusLoss = false
            updateHardwareAudioEffectsEnabled()
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
                       //  eq.enabled = anyNonZero
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
                            // le.enabled = true
                        } else {
                            le.setTargetGain(0)
                            le.enabled = false
                        }
                    }
                    bassBoost?.let { bb ->
                        if (bassBoostOn) {
                            bb.setStrength(800.toShort())
                            // bb.enabled = true
                        } else {
                            bb.setStrength(0.toShort())
                            bb.enabled = false
                        }
                    desiredEqEnabled = gainsDb.any { it != 0.0 }
                    desiredBassBoostEnabled = bassBoostOn
                    desiredLoudnessEnabled = extraBoostMb > 0
                    updateHardwareAudioEffectsEnabled()   
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


        @JavascriptInterface
        fun downloadAndInstallApk(url: String, version: String) {
            runOnUiThread {
                try {
                    val fileName = "NueTify-${version}.apk"
                    val dm = getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager
                    val request = DownloadManager.Request(Uri.parse(url))
                        .setTitle("NueTify v${version}")
                        .setDescription("Mengunduh update aplikasi...")
                        .setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
                        .setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, fileName)
                        .setMimeType("application/vnd.android.package-archive")
                    val downloadId = dm.enqueue(request)
                    Toast.makeText(this@MainActivity, "Mengunduh update NueTify...", Toast.LENGTH_LONG).show()

                   fun reportProgress(pct: Int, statusStr: String) {
val safeFile = fileName.replace("'", "\\'")
runOnUiThread {
if (::webView.isInitialized) {
webView.evaluateJavascript(
"window.__nuetifyUpdateProgress && window.__nuetifyUpdateProgress($pct, '$statusStr', '$safeFile');",
null
)
}
}
}
reportProgress(5, "downloading")
Thread {
var downloading = true; var pendingPct = 4
while (downloading) {
val query = DownloadManager.Query().setFilterById(downloadId)
val cursor = dm.query(query)
if (cursor != null && cursor.moveToFirst()) {
val statusIdx = cursor.getColumnIndex(DownloadManager.COLUMN_STATUS)
val bytesIdx = cursor.getColumnIndex(DownloadManager.COLUMN_BYTES_DOWNLOADED_SO_FAR)
val totalIdx = cursor.getColumnIndex(DownloadManager.COLUMN_TOTAL_SIZE_BYTES)
val status = if (statusIdx >= 0) cursor.getInt(statusIdx) else -1
val bytesDownloaded = if (bytesIdx >= 0) cursor.getLong(bytesIdx) else 0L
val bytesTotal = if (totalIdx >= 0) cursor.getLong(totalIdx) else 0L
when (status) {
DownloadManager.STATUS_SUCCESSFUL -> {
downloading = false
reportProgress(100, "installing")
try {
val apkUri = dm.getUriForDownloadedFile(downloadId)
if (apkUri != null) {
val installIntent = Intent(Intent.ACTION_VIEW).apply {
setDataAndType(apkUri, "application/vnd.android.package-archive")
addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_ACTIVITY_NEW_TASK)
}
runOnUiThread {
try {
startActivity(installIntent)
} catch (_: Exception) {}
}
}
} catch (_: Exception) {}
try {
Thread.sleep(1200L)
} catch (_: InterruptedException) {}
reportProgress(100, "completed")
}
DownloadManager.STATUS_FAILED -> {
downloading = false
reportProgress(0, "error")
}
else -> {
val pct = when { bytesTotal > 0L -> ((bytesDownloaded * 100L) / bytesTotal).toInt().coerceIn(5, 99); bytesDownloaded > 0L -> ((bytesDownloaded * 100L) / 2_800_000L).toInt().coerceIn(8, 95); else -> { pendingPct = (pendingPct + 1).coerceAtMost(20); pendingPct } }
reportProgress(pct, "downloading")
}
}
} else {
downloading = false
}
cursor?.close()
if (downloading) {
try {
Thread.sleep(250L)
} catch (_: InterruptedException) {
downloading = false
}
}
}
}.start()
                } catch (_: Exception) {
                    Toast.makeText(this@MainActivity, "Gagal mengunduh update", Toast.LENGTH_SHORT).show()
                }
            }
        }
@JavascriptInterface
fun openDownloadsFolder() {
runOnUiThread {
try {
val intent = Intent(DownloadManager.ACTION_VIEW_DOWNLOADS).apply {
addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
}
startActivity(intent)
} catch (_: Exception) {
try {
val fallback = Intent(Intent.ACTION_VIEW).apply {
setDataAndType(
Uri.parse("content://com.android.externalstorage.documents/document/primary%3ADownload"),
"vnd.android.document/directory"
)
addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
}
startActivity(fallback)
} catch (_: Exception) {
Toast.makeText(this@MainActivity, "Silakan buka folder Download secara manual", Toast.LENGTH_SHORT).show()
}
}
}
}
}
    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        if (::webView.isInitialized) {
            webView.evaluateJavascript("(function(){ return window.__nuetifyHandleBack ? window.__nuetifyHandleBack() : false; })()") { res ->
                if (res != "true") {
                    if (webView.canGoBack()) webView.goBack() else moveTaskToBack(true)
                }
            }
        } else {
            moveTaskToBack(true)
        }
    }

    companion object {
        @Volatile var isNueTifyPlaying: Boolean = false
        @Volatile var hasExternalAudioFocusLoss: Boolean = false
        private var activeInstance: java.lang.ref.WeakReference<MainActivity>? = null

        fun onExternalAudioFocusLost() {
            hasExternalAudioFocusLoss = true
            isNueTifyPlaying = false
            activeInstance?.get()?.updateHardwareAudioEffectsEnabled()
        }

        fun onExternalAudioFocusGained() {
            hasExternalAudioFocusLoss = false
            activeInstance?.get()?.updateHardwareAudioEffectsEnabled()
        }
    }
}
