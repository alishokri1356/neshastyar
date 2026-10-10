package com.neshastyar.app.di

import android.content.Context
import androidx.room.Room
import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import com.neshastyar.app.data.local.DraftDao
import com.neshastyar.app.data.local.DraftStatus
import com.neshastyar.app.data.local.NeshastyarDatabase
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object DatabaseModule {

    @Provides
    @Singleton
    fun provideDatabase(@ApplicationContext context: Context): NeshastyarDatabase =
        Room.databaseBuilder(
            context,
            NeshastyarDatabase::class.java,
            "neshastyar.db",
        ).addMigrations(MIGRATION_2_3)
            .fallbackToDestructiveMigration()
            .build()

    @Provides
    fun provideDraftDao(db: NeshastyarDatabase): DraftDao = db.draftDao()

    private val MIGRATION_2_3 = object : Migration(2, 3) {
        override fun migrate(db: SupportSQLiteDatabase) {
            db.execSQL(
                "ALTER TABLE recording_drafts ADD COLUMN status TEXT NOT NULL DEFAULT '${DraftStatus.ON_RECORDING}'",
            )
        }
    }
}