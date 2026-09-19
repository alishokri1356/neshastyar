package com.neshastyar.app.util

import androidx.compose.ui.graphics.Color
import com.neshastyar.app.ui.theme.NeshastyarColors

object StatusStyle {
    fun labelColor(status: String?): Color = when {
        status.isProcessed() -> NeshastyarColors.Secondary
        status.isAnalyzing() -> NeshastyarColors.Analyzing
        status.isNeedReview() -> Color(0xFFF59E0B)
        else -> NeshastyarColors.TextMuted
    }

    fun background(status: String?): Color = when {
        status.isProcessed() -> NeshastyarColors.WarningContainer
        status.isAnalyzing() -> NeshastyarColors.AnalyzingContainer
        status.isNeedReview() -> Color(0xFF3D2A0A)
        else -> NeshastyarColors.SurfaceVariant
    }

    fun displayLabel(status: String?): String = when {
        status.isNullOrBlank() -> "—"
        status == "Done" -> "تکمیل شده"
        status == "Need Review" -> "نیاز به بازبینی"
        status == "On Process" -> "در حال تحلیل"
        status == "ارسال درخواست پردازش" || status == "آماده پردازش" || status == "در حال پردازش" -> "در حال تحلیل"
        status == "پردازش شده" -> "تکمیل شده"
        else -> status
    }
}

private fun String?.isProcessed(): Boolean =
    this == "Done" || this == "پردازش شده" || this == "تکمیل شده"

private fun String?.isAnalyzing(): Boolean =
    this == "On Process" ||
        this == "ارسال درخواست پردازش" ||
        this == "آماده پردازش" ||
        this == "در حال پردازش" ||
        this == "در حال تحلیل"

private fun String?.isNeedReview(): Boolean = this == "Need Review"
