package com.ptnuevagroup.nuetify

import android.content.Context
import androidx.work.Constraints
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.NetworkType
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.Worker
import androidx.work.WorkerParameters
import java.util.concurrent.TimeUnit

class PushKeepAliveWorker(
    appContext: Context,
    params: WorkerParameters
) : Worker(appContext, params) {

    override fun doWork(): Result {
        try {
            NotificationPushReceiver.pollSync(applicationContext)
        } catch (_: Exception) {
        }
        try {
            NotificationPushReceiver.scheduleNext(applicationContext)
        } catch (_: Exception) {
        }
        return Result.success()
    }

    companion object {
        private const val WORK_NAME = "nuetify_push_keepalive_periodic"

        fun ensureScheduled(context: Context) {
            try {
                val constraints = Constraints.Builder()
                    .setRequiredNetworkType(NetworkType.CONNECTED)
                    .build()

                val req = PeriodicWorkRequestBuilder<PushKeepAliveWorker>(15, TimeUnit.MINUTES)
                    .setConstraints(constraints)
                    .build()

                WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                    WORK_NAME,
                    ExistingPeriodicWorkPolicy.KEEP,
                    req
                )
            } catch (_: Exception) {
            }
        }
    }
}
