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
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import android.support.v4.media.MediaMetadataCompat
import android.support.v4.media.session.MediaSessionCompat
import android.support.v4.media.session.PlaybackStateCompat
import androidx.core.app.NotificationCompat
import androidx.media.app.NotificationCompat.MediaStyle
import java.net.URL
import java.util.concurrent.Executors

class MusicForegroundService : Service() {

    companion object {
        const val CHANNEL_ID = "nuetify_playback_channel"
        const val NOTIF_ID = 1001

        const val ACTION_UPDATE = "com.ptnuevagroup.nuetify.ACTION_UPDATE"
        const val ACTION_LIKE = "com.ptnuevagroup.nuetify.ACTION_LIKE"
        const val ACTION_PREV = "com.ptnuevagroup.nuetify.ACTION_PREV"
        const val ACTION_PLAY_PAUSE = "com.ptnuevagroup.nuetify.ACTION_PLAY_PAUSE"
        const val ACTION_NEXT = "com.ptnuevagroup.nuetify.ACTION_NEXT"
        const val ACTION_REPEAT = "com.ptnuevagroup.nuetify.ACTION_REPEAT"

        @Volatile
        var onActionListener: ((String) -> Unit)? = null
    }

    private lateinit var mediaSession: MediaSessionCompat
    private var wakeLock: PowerManager.WakeLock? = null
    private val executor = Executors.newSingleThreadExecutor()

    private var currentTitle = "NueTify"
    private var currentArtist = "PT Nueva Group"
    private var currentIsPlaying = false
    private var currentIsLiked = false
    private var currentRepeatMode = "off"
    private var currentArtworkUrl = ""
    private var currentArtworkBitmap: Bitmap? = null

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()

        mediaSession = MediaSessionCompat(this, "NueTifyMediaSession").apply {
            setCallback(object : MediaSessionCompat.Callback() {
                override fun onPlay() {
                    onActionListener?.invoke("PLAY_PAUSE")
                }

                override fun onPause() {
                    onActionListener?.invoke("PLAY_PAUSE")
                }

                override fun onSkipToNext() {
                    onActionListener?.invoke("NEXT")
                }

                override fun onSkipToPrevious() {
                    onActionListener?.invoke("PREV")
                }
            })
            isActive = true
        }

        val pm = getSystemService(Context.POWER_SERVICE) as PowerManager
        wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "NueTify::PlaybackWakeLock").apply {
            setReferenceCounted(false)
            acquire()
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_LIKE -> onActionListener?.invoke("LIKE")
            ACTION_PREV -> onActionListener?.invoke("PREV")
            ACTION_PLAY_PAUSE -> onActionListener?.invoke("PLAY_PAUSE")
            ACTION_NEXT -> onActionListener?.invoke("NEXT")
            ACTION_REPEAT -> onActionListener?.invoke("REPEAT")
            ACTION_UPDATE, null -> {
                currentTitle = intent?.getStringExtra("title") ?: currentTitle
                currentArtist = intent?.getStringExtra("artist") ?: currentArtist
                currentIsPlaying = intent?.getBooleanExtra("isPlaying", currentIsPlaying) ?: currentIsPlaying
                currentIsLiked = intent?.getBooleanExtra("isLiked", currentIsLiked) ?: currentIsLiked
                currentRepeatMode = intent?.getStringExtra("repeatMode") ?: currentRepeatMode
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

    private fun updateSessionAndNotification() {
        val state = if (currentIsPlaying) PlaybackStateCompat.STATE_PLAYING else PlaybackStateCompat.STATE_PAUSED
        val playbackState = PlaybackStateCompat.Builder()
            .setActions(
                PlaybackStateCompat.ACTION_PLAY or
                    PlaybackStateCompat.ACTION_PAUSE or
                    PlaybackStateCompat.ACTION_PLAY_PAUSE or
                    PlaybackStateCompat.ACTION_SKIP_TO_NEXT or
                    PlaybackStateCompat.ACTION_SKIP_TO_PREVIOUS
            )
            .setState(state, PlaybackStateCompat.PLAYBACK_POSITION_UNKNOWN, 1f)
            .build()
        mediaSession.setPlaybackState(playbackState)

        val largeIcon = currentArtworkBitmap ?: BitmapFactory.decodeResource(resources, R.mipmap.ic_launcher)
        val metadata = MediaMetadataCompat.Builder()
            .putString(MediaMetadataCompat.METADATA_KEY_TITLE, currentTitle)
            .putString(MediaMetadataCompat.METADATA_KEY_ARTIST, currentArtist)
            .putString(MediaMetadataCompat.METADATA_KEY_ALBUM, "NueTify")
            .putBitmap(MediaMetadataCompat.METADATA_KEY_ALBUM_ART, largeIcon)
            .build()
        mediaSession.setMetadata(metadata)

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

        val likeIcon = if (currentIsLiked) android.R.drawable.btn_star_big_on else android.R.drawable.btn_star_big_off
        val playPauseIcon = if (currentIsPlaying) android.R.drawable.ic_media_pause else android.R.drawable.ic_media_play
        val playPauseLabel = if (currentIsPlaying) "Pause" else "Play"
        val repeatLabel = if (currentRepeatMode == "off") "Repeat" else "Repeat ($currentRepeatMode)"

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setLargeIcon(largeIcon)
            .setContentTitle(currentTitle)
            .setContentText(currentArtist)
            .setSubText("NueTify")
            .setContentIntent(contentIntent)
            .setOngoing(currentIsPlaying)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .addAction(likeIcon, "Like", serviceActionIntent(ACTION_LIKE, 1))
            .addAction(android.R.drawable.ic_media_previous, "Previous", serviceActionIntent(ACTION_PREV, 2))
            .addAction(playPauseIcon, playPauseLabel, serviceActionIntent(ACTION_PLAY_PAUSE, 3))
            .addAction(android.R.drawable.ic_media_next, "Next", serviceActionIntent(ACTION_NEXT, 4))
            .addAction(android.R.drawable.ic_menu_rotate, repeatLabel, serviceActionIntent(ACTION_REPEAT, 5))
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

    override fun onDestroy() {
        wakeLock?.let { if (it.isHeld) it.release() }
        mediaSession.isActive = false
        mediaSession.release()
        executor.shutdownNow()
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null
}
