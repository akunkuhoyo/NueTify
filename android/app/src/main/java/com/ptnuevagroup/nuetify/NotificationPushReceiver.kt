package com.ptnuevagroup.nuetify

import android.app.AlarmManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.graphics.BitmapFactory
import android.graphics.Color
import androidx.core.app.NotificationCompat
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

class NotificationPushReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent?) {
        scheduleNext(context)
        val pendingResult = goAsync()
        Thread {
            try {
                pollSync(context.applicationContext)
            } finally {
                pendingResult.finish()
            }
        }.start()
    }

    companion object {
        private const val PREFS_NAME = "nuetify_push_prefs"
        private const val KEY_LAST_NOTIF_ID = "last_notif_id"
        private const val CHANNEL_ID = "nuetify_broadcast_v2"
        private const val REQUEST_CODE_ALARM = 4201

        fun pollNow(context: Context) {
            Thread { pollSync(context) }.start()
        }

        fun pollSync(context: Context) {
            try {
                val endpoint = listOf("https:", "", "nuetify.vercel.app", "api", "notifications", "latest").joinToString("/")
                val conn = URL(endpoint).openConnection() as HttpURLConnection
                conn.connectTimeout = 8000
                conn.readTimeout = 8000
                conn.requestMethod = "GET"
                conn.useCaches = false
                conn.setRequestProperty("Cache-Control", "no-cache")
                val code = conn.responseCode
                if (code in 200..299) {
                    val text = conn.inputStream.bufferedReader().use { it.readText() }
                    val notif = JSONObject(text).optJSONObject("notification")
                    if (notif != null) {
                        val id = notif.optString("id", "")
                        val title = notif.optString("title", "NueTify")
                        val body = notif.optString("body", "")
                        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                        val lastId = prefs.getString(KEY_LAST_NOTIF_ID, "") ?: ""
                        if (id.isNotEmpty() && id != lastId) {
                            prefs.edit().putString(KEY_LAST_NOTIF_ID, id).apply()
                            showNotification(context, id, title, body)
                        }
                    }
                }
                conn.disconnect()
            } catch (_: Exception) {
            }
        }

        fun scheduleNext(context: Context) {
            try {
                val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager ?: return
                val intent = Intent(context, NotificationPushReceiver::class.java)
                val flags = PendingIntent.FLAG_UPDATE_CURRENT or
                    (if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0)
                val pendingIntent = PendingIntent.getBroadcast(context, REQUEST_CODE_ALARM, intent, flags)
                val triggerAt = System.currentTimeMillis() + 30_000L
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pendingIntent)
                } else {
                    alarmManager.set(AlarmManager.RTC_WAKEUP, triggerAt, pendingIntent)
                }
            } catch (_: Exception) {
            }
            PushNotificationJobService.schedule(context)
            PushKeepAliveWorker.ensureScheduled(context)
        }

        fun showNotification(context: Context, id: String, title: String, body: String) {
            val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager ?: return
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val channel = NotificationChannel(
                    CHANNEL_ID,
                    "NueTify Broadcast",
                    NotificationManager.IMPORTANCE_HIGH
                ).apply {
                    description = "Notifikasi broadcast real-time dari NueTify"
                    enableVibration(true)
                    enableLights(true)
                    lockscreenVisibility = android.app.Notification.VISIBILITY_PUBLIC
                }
                manager.createNotificationChannel(channel)
            }

            val openIntent = Intent(context, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            val flags = PendingIntent.FLAG_UPDATE_CURRENT or
                (if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0)
            val pendingIntent = PendingIntent.getActivity(context, id.hashCode(), openIntent, flags)
        val largeIcon = try { BitmapFactory.decodeResource(context.resources, R.mipmap.ic_launcher) } catch (_: Exception) { null }

            val notification = NotificationCompat.Builder(context, CHANNEL_ID)
                .setSmallIcon(R.mipmap.ic_launcher)
            .setLargeIcon(largeIcon)
            .setColor(Color.parseColor("#121212"))
            .setSubText("NueTify")
            .setOnlyAlertOnce(false)
                .setContentTitle(title.ifBlank { "NueTify" })
                .setContentText(body)
                .setStyle(NotificationCompat.BigTextStyle().setBigContentTitle(title).bigText(body))
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setDefaults(NotificationCompat.DEFAULT_ALL)
                .setCategory(NotificationCompat.CATEGORY_MESSAGE)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setAutoCancel(true)
                .setContentIntent(pendingIntent)
                .build()

            manager.notify(id.hashCode(), notification)
        }
    }
}
