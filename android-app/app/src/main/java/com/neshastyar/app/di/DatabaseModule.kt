package com.neshastyar.app.di

import android.content.Context
import androidx.room.Room
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import com.neshastyar.app.data.local.DraftDao
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
        ).fallbackToDestructiveMigration().build()

    @Provides
    fun provideDraftDao(db: NeshastyarDatabase): DraftDao = db.draftDao()
}