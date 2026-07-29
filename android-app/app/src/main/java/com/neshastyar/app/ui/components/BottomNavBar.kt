package com.neshastyar.app.ui.components

import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Label
import androidx.compose.material.icons.filled.People
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp
import com.neshastyar.app.navigation.Routes
import com.neshastyar.app.ui.theme.NeshastyarColors

enum class BottomTab(val label: String, val icon: ImageVector, val route: String) {
    Home("خانه", Icons.Default.Home, Routes.Home.route),
    Tags("برچسب‌ها", Icons.Default.Label, Routes.Tags.route),
    Participants("افراد", Icons.Default.People, Routes.Participants.route),
    Account("تنظیمات", Icons.Default.Settings, Routes.Account.route),
}

fun routeMatchesTab(route: String?, tab: BottomTab): Boolean = when (tab) {
    BottomTab.Home -> route == Routes.Home.route
    BottomTab.Tags -> route == Routes.Tags.route || route?.startsWith("tag/") == true || route?.startsWith("tags/") == true
    BottomTab.Participants -> route == Routes.Participants.route || route?.startsWith("participant") == true
    BottomTab.Account -> route == Routes.Account.route
}

@Composable
fun NeshastyarBottomBar(
    currentRoute: String?,
    onTab: (BottomTab) -> Unit,
) {
    NavigationBar(
        containerColor = NeshastyarColors.Surface,
        contentColor = NeshastyarColors.TextPrimary,
        tonalElevation = 0.dp,
    ) {
        BottomTab.entries.forEach { tab ->
            val selected = routeMatchesTab(currentRoute, tab)
            NavigationBarItem(
                selected = selected,
                onClick = { onTab(tab) },
                icon = {
                    Icon(
                        tab.icon,
                        contentDescription = tab.label,
                        modifier = Modifier.size(22.dp),
                    )
                },
                label = { Text(tab.label) },
                colors = NavigationBarItemDefaults.colors(
                    selectedIconColor = NeshastyarColors.PrimaryBright,
                    selectedTextColor = NeshastyarColors.PrimaryBright,
                    unselectedIconColor = NeshastyarColors.TextMuted,
                    unselectedTextColor = NeshastyarColors.TextMuted,
                    indicatorColor = NeshastyarColors.PrimaryContainer,
                ),
            )
        }
    }
}
