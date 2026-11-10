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

    /** Jalali input shown on the shareable minutes form: `1405/08/11 - 16:54`. */
    fun formatReportInput(raw: String?): String {
        val date = parseApiDate(raw) ?: return ""
        val cal = persianCalendar(date)
        val year = cal.get(Calendar.YEAR)
        val month = cal.get(Calendar.MONTH) + 1
        val day = cal.get(Calendar.DAY_OF_MONTH)
        val clock = java.text.SimpleDateFormat("HH:mm", Locale.US).apply {
            timeZone = TimeZone.getDefault()
        }.format(date)
        return "%04d/%02d/%02d - %s".format(Locale.US, year, month, day, clock)
    }

    /**
     * Empty input clears the date and returns "".
     * A valid Jalali date returns an ISO-8601 string. Invalid input returns null.
     */
    fun parseReportDateInput(value: String): String? {
        val digits = toAsciiDigits(value).trim()
        if (digits.isEmpty()) return ""
        val match = REPORT_DATE.matchEntire(digits) ?: return null
        val year = match.groupValues[1].toInt()
        val month = match.groupValues[2].toInt()
        val day = match.groupValues[3].toInt()
        val hour = match.groupValues[4].toInt()
        val minute = match.groupValues[5].toInt()
        if (month !in 1..12 || day !in 1..31 || hour !in 0..23 || minute !in 0..59) return null
        val cal = Calendar.getInstance(ULocale("fa_IR@calendar=persian"))
        cal.clear()
        cal.set(Calendar.YEAR, year)
        cal.set(Calendar.MONTH, month - 1)
        cal.set(Calendar.DAY_OF_MONTH, day)
        cal.set(Calendar.HOUR_OF_DAY, hour)
        cal.set(Calendar.MINUTE, minute)
        cal.set(Calendar.SECOND, 0)
        if (cal.get(Calendar.YEAR) != year ||
            cal.get(Calendar.MONTH) != month - 1 ||
            cal.get(Calendar.DAY_OF_MONTH) != day
        ) {
            return null
        }
        val formatter = java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSSXXX", Locale.US)
        formatter.timeZone = TimeZone.getDefault()
        return formatter.format(cal.time)
    }

    private val REPORT_DATE = Regex("""(\d{4})/(\d{1,2})/(\d{1,2})\s*-\s*(\d{1,2}):(\d{2})""")

    private fun toAsciiDigits(value: String): String {
        val persian = "۰۱۲۳۴۵۶۷۸۹"
        val arabic = "٠١٢٣٤٥٦٧٨٩"
        val out = StringBuilder(value.length)
        for (ch in value) {
            val p = persian.indexOf(ch)
            if (p >= 0) {
                out.append('0' + p)
                continue
            }
            val a = arabic.indexOf(ch)
            if (a >= 0) {
                out.append('0' + a)
                continue
            }
            out.append(ch)
        }
        return out.toString()
    }

    private fun persianCalendar(date: Date): Calendar {
        val cal = Calendar.getInstance(ULocale("fa_IR@calendar=persian"))
        cal.time = date
        return cal
    }
}