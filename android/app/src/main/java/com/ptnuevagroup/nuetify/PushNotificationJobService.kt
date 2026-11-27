package com.ptnuevagroup.nuetify

import android.app.job.JobInfo
import android.app.job.JobParameters
import android.app.job.JobScheduler
import android.app.job.JobService
import android.content.ComponentName
import android.content.Context

class PushNotificationJobService : JobService() {

    override fun onStartJob(params: JobParameters?): Boolean {
        Thread {
            try {
                NotificationPushReceiver.pollSync(applicationContext)
            } finally {
                schedule(applicationContext)
                jobFinished(params, false)
            }
        }.start()
        return true
    }

    override fun onStopJob(params: JobParameters?): Boolean {
        return true
    }

    companion object {
        const val JOB_ID = 9042

        fun schedule(context: Context) {
            try {
                val scheduler = context.getSystemService(Context.JOB_SCHEDULER_SERVICE) as? JobScheduler ?: return
                val component = ComponentName(context, PushNotificationJobService::class.java)
                val jobInfo = JobInfo.Builder(JOB_ID, component)
                    .setRequiredNetworkType(JobInfo.NETWORK_TYPE_ANY)
                    .setMinimumLatency(15_000L)
                    .setOverrideDeadline(30_000L)
                    .setPersisted(true)
                    .build()
                scheduler.schedule(jobInfo)
            } catch (_: Exception) {
            }
        }
    }
}
