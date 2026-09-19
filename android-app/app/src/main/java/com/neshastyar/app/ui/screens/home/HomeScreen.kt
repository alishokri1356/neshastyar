package com.neshastyar.app.ui.screens.home

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccessTime
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.BarChart
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.People
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.neshastyar.app.data.api.MeetingDto
import com.neshastyar.app.ui.components.NeshastyarCard
import com.neshastyar.app.ui.components.StatusChip
import com.neshastyar.app.ui.components.UserAvatarChip
import com.neshastyar.app.ui.theme.NeshastyarColors
import com.neshastyar.app.util.JalaliDates

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(
    onLoggedOut: () -> Unit,
    onOpenMeeting: (String) -> Unit,
    onRecord: () -> Unit,
    viewModel: HomeViewModel = hiltViewModel(),
) {
    val state by viewModel.ui.collectAsStateWithLifecycle()

    LaunchedEffect(state.loggedOut) {
        if (state.loggedOut) onLoggedOut()
    }

    Scaffold(
        containerColor = NeshastyarColors.Background,
        floatingActionButton = {
            FloatingActionButton(
                onClick = onRecord,
                containerColor = NeshastyarColors.Primary,
                contentColor = NeshastyarColors.OnPrimary,
                shape = CircleShape,
            ) {
                Icon(Icons.Default.Mic, contentDescription = "ضبط جلسه")
            }
        },
    ) { padding ->
        PullToRefreshBox(
            isRefreshing = state.refreshing,
            onRefresh = viewModel::refresh,
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
        ) {
            when {
                state.loading -> {
                    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(color = NeshastyarColors.Primary)
                    }
                }
                state.error != null && state.groups.isEmpty() -> {
                    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text(state.error!!, color = NeshastyarColors.Error)
                            TextButton(onClick = viewModel::refresh) {
                                Text("تلاش مجدد", color = NeshastyarColors.PrimaryBright)
                            }
                        }
                    }
                }
                else -> {
                    LazyColumn(
                        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 12.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp),
                        modifier = Modifier.fillMaxSize(),
                    ) {
                        item {
                            HomeHeader(name = state.name)
                        }
                        item {
                            Text(
                                text = "سلام، وقت بخیر",
                                fontSize = 26.sp,
                                fontWeight = FontWeight.Bold,
                                color = NeshastyarColors.TextPrimary,
                            )
                            Text(
                                text = if (state.todayCount > 0) {
                                    "${toPersianDigits(state.todayCount)} جلسه جدید برای امروز ثبت شده است."
                                } else {
                                    "جلسات اخیر شما در اینجا نمایش داده می‌شود."
                                },
                                color = NeshastyarColors.TextSecondary,
                                modifier = Modifier.padding(top = 4.dp, bottom = 8.dp),
                            )
                        }
                        item {
                            StatsRow(
                                totalMeetings = state.totalCount,
                                analyzingCount = state.analyzingCount,
                            )
                        }
                        if (state.groups.isEmpty()) {
                            item {
                                EmptyMeetingsCard()
                            }
                        } else {
                            state.groups.forEach { group ->
                                item(key = "header-${group.label}") {
                                    Text(
                                        text = group.label,
                                        style = MaterialTheme.typography.titleMedium,
                                        color = NeshastyarColors.TextSecondary,
                                        modifier = Modifier.padding(top = 8.dp, bottom = 4.dp),
                                    )
                                }
                                items(group.meetings, key = { it.id }) { meeting ->
                                    MeetingCard(
                                        meeting = meeting,
                                        onClick = { onOpenMeeting(meeting.id) },
                                    )
                                }
                            }
                        }
                        item { Spacer(Modifier.height(72.dp)) }
                    }
                }
            }
        }
    }
}

@Composable
private fun HomeHeader(name: String?) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(bottom = 8.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        UserAvatarChip(label = name?.takeIf { it.isNotBlank() } ?: "کاربر")
        Text(
            text = "نشست یار",
            fontWeight = FontWeight.Bold,
            fontSize = 18.sp,
            color = NeshastyarColors.TextPrimary,
        )
    }
}

@Composable
private fun StatsRow(totalMeetings: Int, analyzingCount: Int) {
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            StatMiniCard(
                modifier = Modifier.weight(1f),
                icon = Icons.Default.BarChart,
                iconTint = NeshastyarColors.Secondary,
                label = "کل جلسات",
                value = toPersianDigits(totalMeetings),
            )
            StatMiniCard(
                modifier = Modifier.weight(1f),
                icon = Icons.Default.Mic,
                iconTint = NeshastyarColors.PrimaryBright,
                label = "در حال تحلیل",
                value = toPersianDigits(analyzingCount),
            )
        }
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(16.dp))
                .background(
                    Brush.horizontalGradient(
                        listOf(NeshastyarColors.PrimaryContainer, NeshastyarColors.Surface),
                    ),
                )
                .padding(16.dp),
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier
                        .size(44.dp)
                        .background(NeshastyarColors.Primary.copy(alpha = 0.25f), CircleShape),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(Icons.Default.AutoAwesome, null, tint = NeshastyarColors.Secondary)
                }
                Spacer(Modifier.width(12.dp))
                Column {
                    Text("وضعیت هوش مصنوعی", color = NeshastyarColors.TextSecondary, fontSize = 13.sp)
                    Text(
                        text = if (analyzingCount > 0) "در حال تحلیل…" else "آماده",
                        fontWeight = FontWeight.Bold,
                        color = NeshastyarColors.TextPrimary,
                        fontSize = 18.sp,
                    )
                }
            }
        }
    }
}

@Composable
private fun StatMiniCard(
    modifier: Modifier = Modifier,
    icon: ImageVector,
    iconTint: androidx.compose.ui.graphics.Color,
    label: String,
    value: String,
) {
    NeshastyarCard(modifier = modifier, contentPadding = PaddingValues(14.dp)) {
        Icon(icon, null, tint = iconTint, modifier = Modifier.size(22.dp))
        Text(label, color = NeshastyarColors.TextMuted, fontSize = 12.sp, modifier = Modifier.padding(top = 8.dp))
        Text(value, fontWeight = FontWeight.Bold, fontSize = 22.sp, color = NeshastyarColors.TextPrimary)
    }
}

@Composable
private fun MeetingCard(meeting: MeetingDto, onClick: () -> Unit) {
    val date = JalaliDates.parseApiDate(meeting.meeting_date)
        ?: JalaliDates.parseApiDate(meeting.created_at)
    val whenText = date?.let { JalaliDates.formatDateTime(it) }.orEmpty()
    val analyzing = meeting.status == "On Process" ||
        meeting.status == "ارسال درخواست پردازش" ||
        meeting.status == "آماده پردازش" ||
        meeting.status == "در حال پردازش"

    NeshastyarCard(
        modifier = Modifier.clickable(onClick = onClick),
        accentBar = analyzing,
        contentPadding = PaddingValues(14.dp),
    ) {
        Text(
            text = meeting.title?.ifBlank { null } ?: "جلسه",
            fontWeight = FontWeight.SemiBold,
            color = NeshastyarColors.TextPrimary,
            maxLines = 2,
            overflow = TextOverflow.Ellipsis,
        )
        Spacer(Modifier.height(10.dp))
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            StatusChip(meeting.status)
            if (whenText.isNotBlank()) {
                Icon(Icons.Default.AccessTime, null, tint = NeshastyarColors.TextMuted, modifier = Modifier.size(14.dp))
                Text(whenText, color = NeshastyarColors.TextMuted, fontSize = 12.sp, maxLines = 1)
            }
        }
    }
}

@Composable
private fun EmptyMeetingsCard() {
    NeshastyarCard {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier = Modifier.fillMaxWidth().padding(vertical = 16.dp),
        ) {
            Icon(Icons.Default.Mic, null, tint = NeshastyarColors.Primary, modifier = Modifier.size(40.dp))
            Text(
                "هنوز جلسه‌ای ندارید",
                fontWeight = FontWeight.SemiBold,
                color = NeshastyarColors.TextPrimary,
                modifier = Modifier.padding(top = 12.dp),
            )
            Text(
                "با دکمه میکروفون یک جلسه ضبط کنید",
                color = NeshastyarColors.TextMuted,
                modifier = Modifier.padding(top = 4.dp),
            )
        }
    }
}

private fun toPersianDigits(n: Int): String {
    val persian = charArrayOf('۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹')
    return n.toString().map { if (it.isDigit()) persian[it - '0'] else it }.joinToString("")
}
