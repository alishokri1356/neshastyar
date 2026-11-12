package com.neshastyar.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Share
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.neshastyar.app.ui.theme.NeshastyarColors

val LocalGoHome = staticCompositionLocalOf<() -> Unit> { {} }

@Composable
fun HomeIconButton(modifier: Modifier = Modifier) {
    val onHome = LocalGoHome.current
    TopBarCornerButton(
        icon = Icons.Default.Home,
        contentDescription = "خانه",
        onClick = onHome,
        modifier = modifier,
    )
}

@Composable
private fun TopBarCornerButton(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    contentDescription: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Box(
        modifier = modifier
            .size(40.dp)
            .clip(RoundedCornerShape(10.dp))
            .background(NeshastyarColors.Primary)
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        Icon(
            icon,
            contentDescription = contentDescription,
            tint = Color.White,
            modifier = Modifier.size(22.dp),
        )
    }
}

data class MeetingShareActions(
    val copyEnabled: Boolean,
    val emailEnabled: Boolean,
    val minutesEnabled: Boolean,
    val minutesLoading: Boolean,
    val onCopy: () -> Unit,
    val onEmail: () -> Unit,
    val onMinutes: () -> Unit,
)

@Composable
fun NeshastyarTopBar(
    onSearch: () -> Unit,
    onOptions: (() -> Unit)? = null,
    share: MeetingShareActions? = null,
) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .background(NeshastyarColors.Background)
            .statusBarsPadding()
            .padding(horizontal = 12.dp, vertical = 8.dp),
    ) {
        if (share != null) {
            MeetingShareButton(
                share = share,
                modifier = Modifier.align(Alignment.CenterStart),
            )
        } else {
            IconButton(
                onClick = onSearch,
                modifier = Modifier.align(Alignment.CenterStart),
            ) {
                Icon(
                    Icons.Default.Search,
                    contentDescription = "جستجو",
                    tint = NeshastyarColors.Primary,
                    modifier = Modifier.size(26.dp),
                )
            }
        }
        Text(
            text = "نشست یار",
            color = NeshastyarColors.Primary,
            fontWeight = FontWeight.Bold,
            fontSize = 22.sp,
            textAlign = TextAlign.Center,
            modifier = Modifier.align(Alignment.Center),
        )
        if (onOptions != null) {
            TopBarCornerButton(
                icon = Icons.Default.MoreVert,
                contentDescription = "گزینه‌ها",
                onClick = onOptions,
                modifier = Modifier.align(Alignment.CenterEnd),
            )
        } else {
            HomeIconButton(modifier = Modifier.align(Alignment.CenterEnd))
        }
    }
}

@Composable
private fun MeetingShareButton(
    share: MeetingShareActions,
    modifier: Modifier = Modifier,
) {
    var open by remember { mutableStateOf(false) }
    Box(modifier) {
        IconButton(onClick = { open = true }) {
            Icon(
                Icons.Default.Share,
                contentDescription = "اشتراک",
                tint = NeshastyarColors.Primary,
                modifier = Modifier.size(26.dp),
            )
        }
        DropdownMenu(
            expanded = open,
            onDismissRequest = { open = false },
        ) {
            DropdownMenuItem(
                text = { Text("کپی") },
                enabled = share.copyEnabled,
                onClick = {
                    open = false
                    share.onCopy()
                },
            )
            DropdownMenuItem(
                text = { Text("ایمیل") },
                enabled = share.emailEnabled,
                onClick = {
                    open = false
                    share.onEmail()
                },
            )
            DropdownMenuItem(
                text = { Text(if (share.minutesLoading) "در حال باز کردن..." else "صورتجلسه") },
                enabled = share.minutesEnabled && !share.minutesLoading,
                onClick = {
                    open = false
                    share.onMinutes()
                },
            )
        }
    }
}
