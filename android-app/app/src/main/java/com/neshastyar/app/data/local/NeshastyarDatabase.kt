package com.neshastyar.app.data.local

import androidx.room.Database
import androidx.room.RoomDatabase

@Database(
    entities = [
        RecordingDraftEntity::class,
        DraftAudioFileEntity::class,
    ],
    version = 2,
    exportSchema = false,
)
abstract class NeshastyarDatabase : RoomDatabase() {
    abstract fun draftDao(): DraftDao
}