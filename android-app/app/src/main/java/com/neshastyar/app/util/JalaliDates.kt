package com.neshastyar.app.util

import android.icu.text.SimpleDateFormat
import android.icu.util.Calendar
import android.icu.util.ULocale
import java.text.ParseException
import java.util.Date
import java.util.Locale
import java.util.TimeZone

object JalaliDates {
    private val persianDays = arrayOf(
        "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنج‌شنبه", "جمعه", "شنبه",
    )
    private val persianMonths = arrayOf(
        "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور",
        "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند",
    )

    private val parseFormats = listOf(
        "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'",
        "yyyy-MM-dd'T'HH:mm:ss'Z'",
        "yyyy-MM-dd'T'HH:mm:ss.SSSXXX",
        "yyyy-MM-dd'T'HH:mm:ssXXX",
        "yyyy-MM-dd HH:mm:ss",
        "yyyy-MM-dd",
    )

    fun parseApiDate(raw: String?): Date? {
        if (raw.isNullOrBlank()) return null
        for (pattern in parseFormats) {
            try {
                val sdf = java.text.SimpleDateFormat(pattern, Locale.US)
                if (pattern.contains("'Z'") || pattern.contains("XXX")) {
                    sdf.timeZone = TimeZone.getTimeZone("UTC")
                }
                return sdf.parse(raw)
            } catch (_: ParseException) {
            }
        }
        return null
    }

    fun groupLabel(date: Date): String {
        val cal = persianCalendar(date)
        val jWeekday = java.util.Calendar.getInstance().apply { time = date }
            .get(java.util.Calendar.DAY_OF_WEEK)
        val dayName = persianDays[jWeekday - 1]
        val monthIndex = cal.get(Calendar.MONTH).coerceIn(0, 11)
        val month = persianMonths[monthIndex]
        val day = cal.get(Calendar.DAY_OF_MONTH)
        return "$dayName، $day $month"
    }

    fun formatDateTime(date: Date): String {
        val cal = persianCalendar(date)
        val monthIndex = cal.get(Calendar.MONTH).coerceIn(0, 11)
        val month = persianMonths[monthIndex]
        val day = cal.get(Calendar.DAY_OF_MONTH)
        val year = cal.get(Calendar.YEAR)
        val time = SimpleDateFormat("HH:mm", ULocale.ENGLISH).format(date)
        return "$day $month $year - $time"
    }

    private fun persianCalendar(date: Date): Calendar {
        val cal = Calendar.getInstance(ULocale("fa_IR@calendar=persian"))
        cal.time = date
        return cal
    }
}