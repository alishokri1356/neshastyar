package com.neshastyar.app

import android.app.Application
import androidx.hilt.work.HiltWorkerFactory
import androidx.work.Configuration
import dagger.hilt.android.HiltAndroidApp
import javax.inject.Inject
import com.neshastyar.app.recording.RecordingDraftWriter

@HiltAndroidApp
class NeshastyarApp : Application(), Configuration.Provider {
    @Inject lateinit var workerFactory: HiltWorkerFactory
    @Inject lateinit var recordingDraftWriter: RecordingDraftWriter

    override fun onCreate() {
        super.onCreate()
        recordingDraftWriter.start()
    }

    override val workManagerConfiguration: Configuration
        get() = Configuration.Builder()
            .setWorkerFactory(workerFactory)
            .build()
}