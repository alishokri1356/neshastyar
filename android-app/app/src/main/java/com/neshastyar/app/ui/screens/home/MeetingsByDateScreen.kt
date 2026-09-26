package com.neshastyar.app.ui.screens.home

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
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.AccessTime
import androidx.compose.material.icons.outlined.Mic
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.neshastyar.app.data.api.MeetingDto
import com.neshastyar.app.ui.components.NeshastyarCard
import com.neshastyar.app.ui.components.StatusChip
import com.neshastyar.app.ui.theme.NeshastyarColors
import com.neshastyar.app.util.JalaliDates

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MeetingsByDateScreen(
    onBack: () -> Unit,
    onOpenMeeting: (String) -> Unit,
    viewModel: HomeViewModel = hiltViewModel(),
) {
    val state by viewModel.ui.collectAsStateWithLifecycle()

    Column(modifier = Modifier.fillMaxSize()) {
        ListScreenHeader(title = "لیست جلسات بر حسب تاریخ", onBack = onBack)
        PullToRefreshBox(
            isRefreshing = state.refreshing,
            onRefresh = viewModel::refresh,
            modifier = Modifier.fillMaxSize(),
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
                state.groups.isEmpty() -> {
                    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Icon(
                                Icons.Outlined.Mic,
                                contentDescription = null,
                                tint = NeshastyarColors.Primary,
                                modifier = Modifier.size(40.dp),
                            )
                            Text(
                                "هنوز جلسه‌ای ندارید",
                                fontWeight = FontWeight.SemiBold,
                                color = NeshastyarColors.TextPrimary,
                                modifier = Modifier.padding(top = 12.dp),
                            )
                        }
                    }
                }
                else -> {
                    LazyColumn(
                        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 12.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp),
                        modifier = Modifier.fillMaxSize(),
                    ) {
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
                                MeetingListCard(
                                    meeting = meeting,
                                    onClick = { onOpenMeeting(meeting.id) },
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun ListScreenHeader(title: String, onBack: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 4.dp, vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        IconButton(onClick = onBack) {
            Icon(
                Icons.AutoMirrored.Filled.ArrowBack,
                contentDescription = "بازگشت",
                tint = NeshastyarColors.Primary,
            )
        }
        Text(
            text = title,
            color = NeshastyarColors.TextPrimary,
            fontWeight = FontWeight.Bold,
            fontSize = 18.sp,
            modifier = Modifier.weight(1f),
        )
    }
}

@Composable
fun MeetingListCard(meeting: MeetingDto, onClick: () -> Unit) {
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
                Icon(
                    Icons.Default.AccessTime,
                    contentDescription = null,
                    tint = NeshastyarColors.TextMuted,
                    modifier = Modifier.size(14.dp),
                )
                Spacer(Modifier.width(6.dp))
                Text(whenText, color = NeshastyarColors.TextMuted, fontSize = 12.sp, maxLines = 1)
            }
        }
    }
}
