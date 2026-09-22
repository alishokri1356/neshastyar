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
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
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
import androidx.compose.ui.graphics.Color
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
                            RecordBanner(onClick = onRecord)
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
    val greetingName = name?.takeIf { it.isNotBlank() } ?: "کاربر"
    Column(modifier = Modifier.fillMaxWidth().padding(bottom = 4.dp)) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                text = "نشست یار",
                fontWeight = FontWeight.Bold,
                fontSize = 20.sp,
                color = NeshastyarColors.Primary,
            )
            UserAvatarChip(label = greetingName)
        }
        Text(
            text = "سلام، وقت بخیر",
            fontSize = 22.sp,
            fontWeight = FontWeight.Bold,
            color = NeshastyarColors.TextPrimary,
            modifier = Modifier.padding(top = 12.dp),
        )
        Text(
            text = "جلسات اخیر، خلاصه‌ها و وضعیت تحلیل",
            color = NeshastyarColors.TextMuted,
            fontSize = 13.sp,
            modifier = Modifier.padding(top = 2.dp),
        )
    }
}

@Composable
private fun RecordBanner(onClick: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(20.dp))
            .background(
                Brush.horizontalGradient(
                    listOf(Color(0xFFB91C1C), Color(0xFFE11D48)),
                ),
            )
            .clickable(onClick = onClick)
            .padding(horizontal = 18.dp, vertical = 16.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        Box(
            modifier = Modifier
                .size(52.dp)
                .background(Color.White.copy(alpha = 0.18f), CircleShape),
            contentAlignment = Alignment.Center,
        ) {
            Icon(
                Icons.Default.Mic,
                contentDescription = null,
                tint = Color.White,
                modifier = Modifier.size(28.dp),
            )
        }
        Text(
            text = "ضبط و خلاصه سازی جلسه",
            color = Color.White,
            fontWeight = FontWeight.Bold,
            fontSize = 16.sp,
        )
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
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                text = meeting.title?.ifBlank { null } ?: "جلسه",
                fontWeight = FontWeight.SemiBold,
                color = NeshastyarColors.TextPrimary,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier.weight(1f),
            )
            Spacer(Modifier.width(8.dp))
            StatusChip(meeting.status)
        }
        if (whenText.isNotBlank()) {
            Spacer(Modifier.height(8.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Default.AccessTime, null, tint = NeshastyarColors.TextMuted, modifier = Modifier.size(14.dp))
                Spacer(Modifier.width(6.dp))
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
                "برای شروع، «ضبط و خلاصه سازی جلسه» را بزنید",
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
