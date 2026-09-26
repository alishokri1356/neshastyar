package com.neshastyar.app.ui.screens.home

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Menu
import androidx.compose.material.icons.outlined.CalendarMonth
import androidx.compose.material.icons.outlined.Label
import androidx.compose.material.icons.outlined.Mic
import androidx.compose.material.icons.outlined.People
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.neshastyar.app.ui.theme.NeshastyarColors

@Composable
fun HomeScreen(
    onRecord: () -> Unit,
    onMeetingsByDate: () -> Unit,
    onMeetingsByTag: () -> Unit,
    onMeetingsByParticipant: () -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 20.dp)
            .padding(top = 8.dp, bottom = 24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        HomeTopBar()
        Box(
            modifier = Modifier
                .padding(top = 28.dp)
                .size(132.dp)
                .shadow(
                    elevation = 18.dp,
                    shape = CircleShape,
                    clip = false,
                    ambientColor = NeshastyarColors.Primary.copy(alpha = 0.16f),
                    spotColor = NeshastyarColors.Primary.copy(alpha = 0.22f),
                )
                .clip(CircleShape)
                .background(Color.White)
                .clickable(onClick = onRecord),
            contentAlignment = Alignment.Center,
        ) {
            Icon(
                Icons.Outlined.Mic,
                contentDescription = "ضبط صدا",
                tint = NeshastyarColors.Primary,
                modifier = Modifier.size(56.dp),
            )
        }
        Text(
            text = "ضبط صدا",
            color = NeshastyarColors.TextPrimary,
            fontWeight = FontWeight.Bold,
            fontSize = 22.sp,
            modifier = Modifier.padding(top = 18.dp),
        )
        Text(
            text = "برای ثبت دقیق‌تر جلسات",
            color = NeshastyarColors.TextMuted,
            fontSize = 14.sp,
            modifier = Modifier.padding(top = 4.dp),
        )
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = 28.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            HomeActionCard(
                icon = Icons.Outlined.CalendarMonth,
                title = "لیست جلسات بر حسب تاریخ",
                subtitle = "مرتب‌شده بر اساس روز",
                onClick = onMeetingsByDate,
            )
            HomeActionCard(
                icon = Icons.Outlined.Label,
                title = "لیست جلسات بر حسب برچسب",
                subtitle = "موضوعات و دسته‌ها",
                onClick = onMeetingsByTag,
            )
            HomeActionCard(
                icon = Icons.Outlined.People,
                title = "لیست جلسات بر اساس شرکت‌کنندگان",
                subtitle = "جلسات هر فرد",
                onClick = onMeetingsByParticipant,
            )
        }
    }
}

@Composable
private fun HomeTopBar() {
    Box(modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp)) {
        Icon(
            Icons.Default.Menu,
            contentDescription = null,
            tint = NeshastyarColors.Primary,
            modifier = Modifier
                .align(Alignment.CenterStart)
                .size(26.dp),
        )
        Text(
            text = "نشست یار",
            color = NeshastyarColors.Primary,
            fontWeight = FontWeight.Bold,
            fontSize = 22.sp,
            textAlign = TextAlign.Center,
            modifier = Modifier.align(Alignment.Center),
        )
        Box(
            modifier = Modifier
                .align(Alignment.CenterEnd)
                .size(40.dp)
                .clip(RoundedCornerShape(10.dp))
                .background(NeshastyarColors.Primary),
            contentAlignment = Alignment.Center,
        ) {
            Icon(
                Icons.Default.Edit,
                contentDescription = null,
                tint = Color.White,
                modifier = Modifier.size(20.dp),
            )
        }
    }
}

@Composable
private fun HomeActionCard(
    icon: ImageVector,
    title: String,
    subtitle: String,
    onClick: () -> Unit,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .shadow(
                elevation = 8.dp,
                shape = RoundedCornerShape(18.dp),
                ambientColor = Color.Black.copy(alpha = 0.06f),
                spotColor = Color.Black.copy(alpha = 0.08f),
            )
            .clip(RoundedCornerShape(18.dp))
            .background(Color.White)
            .clickable(onClick = onClick)
            .padding(horizontal = 16.dp, vertical = 14.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        Icon(
            icon,
            contentDescription = null,
            tint = NeshastyarColors.Primary,
            modifier = Modifier.size(28.dp),
        )
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = title,
                color = NeshastyarColors.TextPrimary,
                fontWeight = FontWeight.Bold,
                fontSize = 15.sp,
            )
            Text(
                text = subtitle,
                color = NeshastyarColors.TextMuted,
                fontSize = 12.sp,
                modifier = Modifier.padding(top = 2.dp),
            )
        }
    }
}
