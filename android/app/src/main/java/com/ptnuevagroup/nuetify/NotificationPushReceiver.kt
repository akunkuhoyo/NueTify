package com.ptnuevagroup.nuetify

import android.app.AlarmManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
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
                val endpoint = listOf("https:", "", "nuetify.vercel.app", "api", "notifications", "latest").joinToString("/")
                val conn = URL(endpoint).openConnection() as HttpURLConnection
                conn.connectTimeout = 8000
                conn.readTimeout = 8000
                conn.requestMethod = "GET"
                val code = conn.responseCode
                if (code in 200..299) {
                    val text = conn.inputStream.bufferedReader().use { it.readText() }
                    val notif = JSONObject(text).optJSONObject("notification")
                    if (notif != null) {
                        val id = notif.optString("id", "")
                        val title = notif.optString("title", "NueTify")
                        val body = notif.optString("body", "")
                        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                        val lastId = prefs.getString(KEY_LAST_ID, "") ?: ""
                        if (id.isNotEmpty() && id != lastId) {
                            showNotification(context, id, title, body)
                        }
                    }
                }
                conn.disconnect()
            } catch (_: Exception) {
            } finally {
                pendingResult.finish()
            }
        }.start()
    }

    companion object {
        const val ACTION_POLL = "com.ptnuevagroup.nuetify.ACTION_POLL_NOTIFICATIONS"
        const val CHANNEL_ID = "nuetify_broadcast"
        const val PREFS_NAME = "nuetify_push_prefs"
        const val KEY_LAST_ID = "last_notif_id"

        fun scheduleNext(context: Context) {
            try {
                val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager ?: return
                val intent = Intent(context, NotificationPushReceiver::class.java).apply {
                    action = ACTION_POLL
                }
                val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                } else {
                    PendingIntent.FLAG_UPDATE_CURRENT
                }
                val pendingIntent = PendingIntent.getBroadcast(context, 1001, intent, flags)
                val triggerAt = System.currentTimeMillis() + 60_000L
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pendingIntent)
                } else {
                    alarmManager.set(AlarmManager.RTC_WAKEUP, triggerAt, pendingIntent)
                }
            } catch (_: Exception) {
            }
        }

        fun showNotification(context: Context, id: String, title: String, body: String) {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            prefs.edit().putString(KEY_LAST_ID, id).apply()

            val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager ?: return
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val channel = NotificationChannel(
                    CHANNEL_ID,
                    "Notifikasi NueTify",
                    NotificationManager.IMPORTANCE_HIGH
                )
                manager.createNotificationChannel(channel)
            }

            val openIntent = Intent(context, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            val piFlags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            } else {
                PendingIntent.FLAG_UPDATE_CURRENT
            }
            val contentIntent = PendingIntent.getActivity(context, id.hashCode(), openIntent, piFlags)

            val notification = NotificationCompat.Builder(context, CHANNEL_ID)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle(title)
                .setContentText(body)
                .setStyle(NotificationCompat.BigTextStyle().bigText(body))
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setAutoCancel(true)
                .setContentIntent(contentIntent)
                .build()

            manager.notify(id.hashCode(), notification)
        }
    }
}
