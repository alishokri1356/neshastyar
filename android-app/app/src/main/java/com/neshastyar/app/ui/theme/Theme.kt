package com.neshastyar.app.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.Typography
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.sp
import androidx.core.view.WindowCompat
import android.app.Activity

private val PremiumPurpleScheme = darkColorScheme(
    primary = NeshastyarColors.Primary,
    onPrimary = NeshastyarColors.OnPrimary,
    primaryContainer = NeshastyarColors.PrimaryContainer,
    onPrimaryContainer = NeshastyarColors.PrimaryBright,
    secondary = NeshastyarColors.Secondary,
    onSecondary = NeshastyarColors.OnSecondary,
    secondaryContainer = NeshastyarColors.WarningContainer,
    onSecondaryContainer = NeshastyarColors.Warning,
    tertiary = NeshastyarColors.PrimaryBright,
    onTertiary = NeshastyarColors.OnPrimary,
    background = NeshastyarColors.Background,
    onBackground = NeshastyarColors.TextPrimary,
    surface = NeshastyarColors.Surface,
    onSurface = NeshastyarColors.TextPrimary,
    surfaceVariant = NeshastyarColors.SurfaceVariant,
    onSurfaceVariant = NeshastyarColors.TextSecondary,
    outline = NeshastyarColors.Outline,
    outlineVariant = NeshastyarColors.SurfaceElevated,
    error = NeshastyarColors.Error,
    onError = Color.White,
    errorContainer = NeshastyarColors.ErrorContainer,
    onErrorContainer = NeshastyarColors.Error,
)

/**
 * Persian-friendly typography.
 * Vazirmatn font files can be dropped into res/font later; until then system fallback is used.
 */
private val NeshastyarTypography = Typography(
    displayLarge = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.Bold,
        fontSize = 32.sp,
        lineHeight = 40.sp,
    ),
    headlineMedium = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.SemiBold,
        fontSize = 24.sp,
        lineHeight = 32.sp,
    ),
    titleLarge = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.SemiBold,
        fontSize = 20.sp,
        lineHeight = 28.sp,
    ),
    titleMedium = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.SemiBold,
        fontSize = 16.sp,
        lineHeight = 24.sp,
    ),
    bodyLarge = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.Normal,
        fontSize = 16.sp,
        lineHeight = 24.sp,
    ),
    bodyMedium = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.Normal,
        fontSize = 14.sp,
        lineHeight = 20.sp,
    ),
    bodySmall = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.Normal,
        fontSize = 12.sp,
        lineHeight = 16.sp,
    ),
    labelLarge = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.Medium,
        fontSize = 14.sp,
        lineHeight = 20.sp,
    ),
    labelMedium = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.Medium,
        fontSize = 12.sp,
        lineHeight = 16.sp,
    ),
    labelSmall = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.Medium,
        fontSize = 11.sp,
        lineHeight = 14.sp,
    ),
)

@Composable
fun NeshastyarTheme(
    content: @Composable () -> Unit,
) {
    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as? Activity)?.window ?: return@SideEffect
            WindowCompat.setDecorFitsSystemWindows(window, false)
            window.statusBarColor = android.graphics.Color.TRANSPARENT
            window.navigationBarColor = android.graphics.Color.parseColor("#0A0414")
            WindowCompat.getInsetsController(window, view).isAppearanceLightStatusBars = false
            WindowCompat.getInsetsController(window, view).isAppearanceLightNavigationBars = false
        }
    }

    CompositionLocalProvider(LocalLayoutDirection provides LayoutDirection.Rtl) {
        MaterialTheme(
            colorScheme = PremiumPurpleScheme,
            typography = NeshastyarTypography,
            content = content,
        )
    }
}
