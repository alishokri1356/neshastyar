package com.neshastyar.app.ui.components

import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Menu
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.neshastyar.app.ui.theme.NeshastyarColors

@Composable
fun NeshastyarBottomBar(
    onSettings: () -> Unit,
) {
    NavigationBar(
        containerColor = Color.White,
        contentColor = NeshastyarColors.TextPrimary,
        tonalElevation = 0.dp,
    ) {
        NavigationBarItem(
            selected = false,
            onClick = onSettings,
            icon = {
                Icon(
                    Icons.Default.Menu,
                    contentDescription = "تنظیمات",
                    tint = NeshastyarColors.TextMuted,
                    modifier = Modifier.size(26.dp),
                )
            },
            colors = NavigationBarItemDefaults.colors(
                selectedIconColor = NeshastyarColors.Primary,
                unselectedIconColor = NeshastyarColors.TextMuted,
                indicatorColor = Color.Transparent,
            ),
        )
    }
}
