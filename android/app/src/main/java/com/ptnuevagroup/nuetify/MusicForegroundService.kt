package com.ptnuevagroup.nuetify

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.media.AudioAttributes
import android.media.AudioFocusRequest
import android.media.AudioManager
import android.os.Build
import android.os.Bundle
import android.os.IBinder
import android.os.PowerManager
import android.support.v4.media.MediaMetadataCompat
import android.support.v4.media.session.MediaSessionCompat
import android.support.v4.media.session.PlaybackStateCompat
import androidx.core.app.NotificationCompat
import androidx.media.app.NotificationCompat.MediaStyle
import java.net.URL
import java.util.concurrent.Executors
import android.net.Uri
import java.util.concurrent.ScheduledExecutorService
import java.util.concurrent.TimeUnit
import org.json.JSONObject

class MusicForegroundService : Service() {

    companion object {
        const val CHANNEL_ID = "nuetify_playback_channel"
        const val NOTIF_ID = 1001

        const val ACTION_UPDATE = "com.ptnuevagroup.nuetify.ACTION_UPDATE"
        const val ACTION_POSITION = "com.ptnuevagroup.nuetify.ACTION_POSITION"
        const val ACTION_SHUFFLE = "com.ptnuevagroup.nuetify.ACTION_SHUFFLE"
        const val ACTION_PREV = "com.ptnuevagroup.nuetify.ACTION_PREV"
        const val ACTION_PLAY_PAUSE = "com.ptnuevagroup.nuetify.ACTION_PLAY_PAUSE"
        const val ACTION_NEXT = "com.ptnuevagroup.nuetify.ACTION_NEXT"
        const val ACTION_REPEAT = "com.ptnuevagroup.nuetify.ACTION_REPEAT"

        const val CUSTOM_ACTION_SHUFFLE = "CUSTOM_SHUFFLE"
        const val CUSTOM_ACTION_REPEAT = "CUSTOM_REPEAT"

        @Volatile
        var onActionListener: ((String) -> Unit)? = null

        @Volatile
        var onSeekListener: ((Long) -> Unit)? = null
    }

    private lateinit var mediaSession: MediaSessionCompat
    private var wakeLock: PowerManager.WakeLock? = null
    private var audioManager: AudioManager? = null
    private var focusRequest: AudioFocusRequest? = null
    private val executor = Executors.newSingleThreadExecutor()
    private var hasAudioFocus = false
    private val audioFocusChangeListener = AudioManager.OnAudioFocusChangeListener { focusChange ->
        when (focusChange) {
            AudioManager.AUDIOFOCUS_LOSS,
            AudioManager.AUDIOFOCUS_LOSS_TRANSIENT,
            AudioManager.AUDIOFOCUS_LOSS_TRANSIENT_CAN_DUCK -> {
                hasAudioFocus = false
                MainActivity.onExternalAudioFocusLost()
            }
            AudioManager.AUDIOFOCUS_GAIN -> {
                hasAudioFocus = true
                MainActivity.onExternalAudioFocusGained()
            }
        }
    }
    private val updateScheduler: ScheduledExecutorService = Executors.newSingleThreadScheduledExecutor()
    private var currentTitle = "NueTify"
    private var currentArtist = "PT Nueva Group"
    private var currentIsPlaying = false
    private var currentShuffleOn = false
    private var currentRepeatMode = "off"
    private var currentPositionMs = 0L
    private var currentDurationMs = 0L
    private var currentArtworkUrl = ""
    private var currentArtworkBitmap: Bitmap? = null

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        audioManager = getSystemService(Context.AUDIO_SERVICE) as AudioManager
        requestAudioFocus()

        mediaSession = MediaSessionCompat(this, "NueTifyMediaSession").apply {
            setCallback(object : MediaSessionCompat.Callback() {
                override fun onPlay() {
                    requestAudioFocus()
                    onActionListener?.invoke("PLAY")
                }

                override fun onPause() {
                    onActionListener?.invoke("PAUSE")
                }

                override fun onSkipToNext() {
                    onActionListener?.invoke("NEXT")
                }

                override fun onSkipToPrevious() {
                    onActionListener?.invoke("PREV")
                }

                override fun onSeekTo(pos: Long) {
                    currentPositionMs = pos
                    onSeekListener?.invoke(pos)
                    updatePlaybackStateOnly()
                }

                override fun onCustomAction(action: String?, extras: Bundle?) {
                    when (action) {
                        CUSTOM_ACTION_SHUFFLE -> onActionListener?.invoke("SHUFFLE")
                        CUSTOM_ACTION_REPEAT -> onActionListener?.invoke("REPEAT")
                    }
                }
            })
            isActive = true
        }

        val pm = getSystemService(Context.POWER_SERVICE) as PowerManager
        wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "NueTify::PlaybackWakeLock").apply {
            setReferenceCounted(false)
            acquire()
        }
        updateScheduler.scheduleAtFixedRate({ checkForAppUpdate() }, 1, 15, TimeUnit.MINUTES)
    }

    private fun requestAudioFocus() {
        if (hasAudioFocus) return; val am = audioManager ?: return
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val attrs = AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_MEDIA)
                .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                .build()
            val req = AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN)
                .setAudioAttributes(attrs)
                .setOnAudioFocusChangeListener(audioFocusChangeListener) 
                .build()
            focusRequest = req
            am.requestAudioFocus(req)
        } else {
            @Suppress("DEPRECATION")
            am.requestAudioFocus(audioFocusChangeListener, AudioManager.STREAM_MUSIC, AudioManager.AUDIOFOCUS_GAIN)
        }; hasAudioFocus = true
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_SHUFFLE -> { onActionListener?.invoke("SHUFFLE"); return START_STICKY }
            ACTION_PREV -> onActionListener?.invoke("PREV")
            ACTION_PLAY_PAUSE -> onActionListener?.invoke("PLAY_PAUSE")
            ACTION_NEXT -> onActionListener?.invoke("NEXT")
            ACTION_REPEAT -> { onActionListener?.invoke("REPEAT"); return START_STICKY }
            ACTION_POSITION -> {
                currentPositionMs = intent.getLongExtra("positionMs", currentPositionMs)
                val newDur = intent.getLongExtra("durationMs", currentDurationMs)
                val durChanged = newDur > 0L && newDur != currentDurationMs
                if (newDur > 0L) currentDurationMs = newDur
                currentIsPlaying = intent.getBooleanExtra("isPlaying", currentIsPlaying)
                if (durChanged) {
                    updateSessionAndNotification()
                } else {
                    updatePlaybackStateOnly()
                }
                return START_STICKY
            }
            ACTION_UPDATE, null -> {
                currentTitle = intent?.getStringExtra("title") ?: currentTitle
                currentArtist = intent?.getStringExtra("artist") ?: currentArtist
                currentIsPlaying = intent?.getBooleanExtra("isPlaying", currentIsPlaying) ?: currentIsPlaying
                currentShuffleOn = intent?.getBooleanExtra("shuffleOn", currentShuffleOn) ?: currentShuffleOn
                currentRepeatMode = intent?.getStringExtra("repeatMode") ?: currentRepeatMode
                currentPositionMs = intent?.getLongExtra("positionMs", currentPositionMs) ?: currentPositionMs
                val newDur = intent?.getLongExtra("durationMs", currentDurationMs) ?: currentDurationMs
                if (newDur > 0L) currentDurationMs = newDur
                if (currentIsPlaying) requestAudioFocus()
                val newArtUrl = intent?.getStringExtra("artworkUrl") ?: ""
                if (newArtUrl.isNotBlank() && newArtUrl != currentArtworkUrl) {
                    currentArtworkUrl = newArtUrl
                    fetchArtworkAsync(newArtUrl)
                }
            }
        }

        updateSessionAndNotification()
        return START_STICKY
    }

    private fun fetchArtworkAsync(urlStr: String) {
        executor.execute {
            try {
                val stream = URL(urlStr).openStream()
                val bmp = BitmapFactory.decodeStream(stream)
                stream.close()
                if (bmp != null) {
                    currentArtworkBitmap = bmp
                    updateSessionAndNotification()
                }
            } catch (_: Exception) {
            }
        }
    }

    private fun updatePlaybackStateOnly() {
        val state = if (currentIsPlaying) PlaybackStateCompat.STATE_PLAYING else PlaybackStateCompat.STATE_PAUSED
        val speed = if (currentIsPlaying) 1.0f else 0.0f
        val shuffleLabel = if (currentShuffleOn) "Shuffle On" else "Shuffle"
   val shuffleIcon = if (currentShuffleOn) R.drawable.ic_shuffle_on else R.drawable.ic_shuffle_off
        val repeatIcon = when (currentRepeatMode) {
            "one" -> R.drawable.ic_repeat_one
            "all" -> R.drawable.ic_repeat_all
            else -> R.drawable.ic_repeat_off
        }
        val repeatLabel = when (currentRepeatMode) {
            "one" -> "Repeat One"
            "all" -> "Repeat All"
            else -> "Repeat"
        }

        val playbackState = PlaybackStateCompat.Builder()
            .setActions(
                PlaybackStateCompat.ACTION_PLAY or
                    PlaybackStateCompat.ACTION_PAUSE or
                    PlaybackStateCompat.ACTION_PLAY_PAUSE or
                    PlaybackStateCompat.ACTION_SKIP_TO_NEXT or
                    PlaybackStateCompat.ACTION_SKIP_TO_PREVIOUS or
                    PlaybackStateCompat.ACTION_SEEK_TO
            )
            .addCustomAction(
                PlaybackStateCompat.CustomAction.Builder(
                    CUSTOM_ACTION_SHUFFLE,
                    shuffleLabel,
                    shuffleIcon
                ).build()
            )
            .addCustomAction(
                PlaybackStateCompat.CustomAction.Builder(
                    CUSTOM_ACTION_REPEAT,
                    repeatLabel,
                    repeatIcon
                ).build()
            )
            .setState(state, currentPositionMs, speed)
            .build()
        mediaSession.setPlaybackState(playbackState)
    }

    private fun updateSessionAndNotification() {
        updatePlaybackStateOnly()

        val largeIcon = currentArtworkBitmap ?: BitmapFactory.decodeResource(resources, R.mipmap.ic_launcher)
        val metadataBuilder = MediaMetadataCompat.Builder()
            .putString(MediaMetadataCompat.METADATA_KEY_TITLE, currentTitle)
            .putString(MediaMetadataCompat.METADATA_KEY_ARTIST, currentArtist)
            .putString(MediaMetadataCompat.METADATA_KEY_ALBUM, "NueTify")
            .putBitmap(MediaMetadataCompat.METADATA_KEY_ALBUM_ART, largeIcon)
        if (currentDurationMs > 0L) {
            metadataBuilder.putLong(MediaMetadataCompat.METADATA_KEY_DURATION, currentDurationMs)
        }
        mediaSession.setMetadata(metadataBuilder.build())

        val notification = buildNotification(largeIcon)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(NOTIF_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK)
        } else {
            startForeground(NOTIF_ID, notification)
        }
    }

    private fun serviceActionIntent(action: String, reqCode: Int): PendingIntent {
        val intent = Intent(this, MusicForegroundService::class.java).apply { this.action = action }
        return PendingIntent.getService(
            this,
            reqCode,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
    }

    private fun buildNotification(largeIcon: Bitmap?): Notification {
        val openAppIntent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val contentIntent = PendingIntent.getActivity(
            this,
            0,
            openAppIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val playPauseIcon = if (currentIsPlaying) android.R.drawable.ic_media_pause else android.R.drawable.ic_media_play
        val playPauseLabel = if (currentIsPlaying) "Pause" else "Play"
           val shuffleIcon = if (currentShuffleOn) R.drawable.ic_shuffle_on else R.drawable.ic_shuffle_off
        val repeatIcon = when (currentRepeatMode) {
            "one" -> R.drawable.ic_repeat_one
            "all" -> R.drawable.ic_repeat_all
            else -> R.drawable.ic_repeat_off
        }
        val statusParts = mutableListOf("NueTify")
        if (currentShuffleOn) statusParts.add("Shuffle ON")
        when (currentRepeatMode) {
            "one" -> statusParts.add("Repeat 1")
            "all" -> statusParts.add("Repeat All")
        }

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setLargeIcon(largeIcon)
            .setContentTitle(currentTitle)
            .setContentText(currentArtist)
            .setSubText(statusParts.joinToString(" · "))
            .setContentIntent(contentIntent)
            .setOngoing(currentIsPlaying)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .addAction(shuffleIcon, "Shuffle", serviceActionIntent(ACTION_SHUFFLE, 1))
            .addAction(android.R.drawable.ic_media_previous, "Previous", serviceActionIntent(ACTION_PREV, 2))
            .addAction(playPauseIcon, playPauseLabel, serviceActionIntent(ACTION_PLAY_PAUSE, 3))
            .addAction(android.R.drawable.ic_media_next, "Next", serviceActionIntent(ACTION_NEXT, 4))
            .addAction(repeatIcon, "Repeat", serviceActionIntent(ACTION_REPEAT, 5))
            .setStyle(
                MediaStyle()
                    .setMediaSession(mediaSession.sessionToken)
                    .setShowActionsInCompactView(1, 2, 3)
            )
            .build()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "NueTify Playback",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Kontrol pemutaran musik latar belakang 24 jam NueTify"
                setShowBadge(false)
            }
            val nm = getSystemService(NotificationManager::class.java)
            nm.createNotificationChannel(channel)
        }
    }

    private fun checkForAppUpdate() {
        try {
            val conn = java.net.URL("https://" + "nuetify.vercel.app/api/app-release").openConnection() as java.net.HttpURLConnection
            conn.requestMethod = "GET"
            conn.connectTimeout = 10000
            conn.readTimeout = 10000
            if (conn.responseCode != 200) return
            val body = conn.inputStream.bufferedReader().use { it.readText() }
            conn.disconnect()

            val json = JSONObject(body)
            val latestVer = json.optString("version", "").removePrefix("v").trim()
            val downloadUrl = json.optString("downloadUrl", "").trim()
            if (latestVer.isEmpty() || downloadUrl.isEmpty()) return

            val currentVer = packageManager.getPackageInfo(packageName, 0).versionName?.removePrefix("v")?.trim() ?: return
            if (latestVer == currentVer || !isNewerVersion(latestVer, currentVer)) return

            val prefs = getSharedPreferences("nuetify_update_prefs", Context.MODE_PRIVATE)
            if (prefs.getString("notified_version", "") == latestVer) return
            prefs.edit().putString("notified_version", latestVer).apply()

            val nm = getSystemService(NotificationManager::class.java)
            val updateChannelId = "nuetify_updates_channel"
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val channel = NotificationChannel(
                    updateChannelId,
                    "NueTify Updates",
                    NotificationManager.IMPORTANCE_DEFAULT
                ).apply {
                    description = "Notifikasi pembaruan aplikasi NueTify"
                }
                nm.createNotificationChannel(channel)
            }

            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(downloadUrl)).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            val pendingIntent = PendingIntent.getActivity(
                this,
                1001,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )

            val notification = NotificationCompat.Builder(this, updateChannelId)
                .setSmallIcon(android.R.drawable.stat_sys_download_done)
                .setContentTitle("Update NueTify Tersedia ($latestVer)")
                .setContentText("Ketuk untuk mengunduh versi terbaru.")
                .setContentIntent(pendingIntent)
                .setAutoCancel(true)
                .build()

            nm.notify(1002, notification)
        } catch (_: Exception) {
        }
    }

    private fun isNewerVersion(latest: String, current: String): Boolean {
        val lParts = latest.split(".").mapNotNull { it.toIntOrNull() }
        val cParts = current.split(".").mapNotNull { it.toIntOrNull() }
        val maxLen = maxOf(lParts.size, cParts.size)
        for (i in 0 until maxLen) {
            val l = lParts.getOrElse(i) { 0 }
            val c = cParts.getOrElse(i) { 0 }
            if (l > c) return true
            if (l < c) return false
        }
        return false
    }

    override fun onDestroy() {
        MainActivity.onExternalAudioFocusLost()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            focusRequest?.let { audioManager?.abandonAudioFocusRequest(it) }
        }
        wakeLock?.let { if (it.isHeld) it.release() }
        mediaSession.isActive = false
        mediaSession.release()
        executor.shutdownNow()
        updateScheduler.shutdownNow()
        hasAudioFocus = false; super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null
}
