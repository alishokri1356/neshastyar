package com.neshastyar.app.ui.screens.home

import android.app.Activity
import android.icu.text.SimpleDateFormat
import android.icu.util.ULocale
import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Description
import androidx.compose.material.icons.outlined.Mic
import androidx.compose.material.icons.outlined.Person
import androidx.compose.material.icons.outlined.Phone
import androidx.compose.material.icons.outlined.Refresh
import androidx.compose.material.icons.outlined.Search
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.view.WindowCompat
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.neshastyar.app.data.api.MeetingDto
import com.neshastyar.app.data.local.DraftStatus
import com.neshastyar.app.ui.theme.NeshastyarColors
import com.neshastyar.app.util.JalaliDates
import com.neshastyar.app.util.StatusStyle
import java.util.Date
import kotlinx.coroutines.delay

private val HomeBackground = NeshastyarColors.Background
private val HomeCard = NeshastyarColors.Surface
private val HomeCardBorder = NeshastyarColors.Outline
private val HomeText = NeshastyarColors.TextPrimary
private val HomeMuted = NeshastyarColors.TextMuted
private val HomeIconTile = NeshastyarColors.PrimaryContainer
private val HomeIconTint = NeshastyarColors.Primary
private val HomeDraftTile = NeshastyarColors.SurfaceElevated
private const val HomeSyncIntervalMs = 15_000L

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(
    onRecord: () -> Unit,
    onSearch: () -> Unit,
    onAsk: () -> Unit,
    onAccount: () -> Unit,
    onOpenMeeting: (String) -> Unit,
    onOpenLocalDraft: (draftId: String, status: String) -> Unit,
    viewModel: HomeViewModel = hiltViewModel(),
) {
    val state by viewModel.ui.collectAsStateWithLifecycle()
    HomeSystemBars()

    LaunchedEffect(Unit) {
        while (true) {
            delay(HomeSyncIntervalMs)
            viewModel.syncFromServer()
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(HomeBackground),
    ) {
        Column(modifier = Modifier.fillMaxSize()) {
            HomeHeader(
                userName = state.name,
                onRecord = onRecord,
                onSearch = onSearch,
                onAccount = onAccount,
            )

            PullToRefreshBox(
                isRefreshing = state.refreshing,
                onRefresh = viewModel::refresh,
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f),
            ) {
                when {
                    state.loading && state.localDraft == null -> HomeLoading()
                    state.error != null && state.groups.isEmpty() && state.localDraft == null -> {
                        HomeError(message = state.error.orEmpty(), onRetry = viewModel::refresh)
                    }
                    state.groups.isEmpty() && state.localDraft == null -> HomeEmpty()
                    else -> HomeTimeline(
                        state = state,
                        onOpenMeeting = onOpenMeeting,
                        onOpenLocalDraft = onOpenLocalDraft,
                        onRetry = viewModel::refresh,
                    )
                }
            }
        }

        HomeActions(
            onRecord = onRecord,
            onAsk = onAsk,
            modifier = Modifier.align(Alignment.BottomCenter),
        )
    }
}

@Composable
private fun HomeSystemBars() {
    val view = LocalView.current
    DisposableEffect(view) {
        val window = (view.context as? Activity)?.window
        if (window != null) {
            window.navigationBarColor = android.graphics.Color.parseColor("#FBF9F4")
            WindowCompat.getInsetsController(window, view).apply {
                isAppearanceLightStatusBars = true
                isAppearanceLightNavigationBars = true
            }
        }
        onDispose {
            if (window != null) {
                window.navigationBarColor = android.graphics.Color.parseColor("#FBF9F4")
                WindowCompat.getInsetsController(window, view).apply {
                    isAppearanceLightStatusBars = true
                    isAppearanceLightNavigationBars = true
                }
            }
        }
    }
}

@Composable
private fun HomeHeader(
    userName: String?,
    onRecord: () -> Unit,
    onSearch: () -> Unit,
    onAccount: () -> Unit,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 18.dp, vertical = 18.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Row(
            horizontalArrangement = Arrangement.spacedBy(10.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            RoundHomeButton(onClick = onAccount) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(4.dp)
                        .clip(CircleShape)
                        .background(NeshastyarColors.PrimaryContainer),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(
                        text = userName?.trim()?.firstOrNull()?.toString() ?: "ک",
                        color = NeshastyarColors.Primary,
                        fontWeight = FontWeight.Bold,
                        fontSize = 18.sp,
                    )
                }
            }
            RoundHomeButton(onClick = onSearch) {
                Icon(
                    Icons.Outlined.Search,
                    contentDescription = "جست‌وجو",
                    tint = HomeMuted,
                    modifier = Modifier.size(27.dp),
                )
            }
        }
        RoundHomeButton(onClick = onRecord) {
            Icon(
                Icons.Outlined.Phone,
                contentDescription = "یادداشت صوتی جدید",
                tint = HomeMuted,
                modifier = Modifier.size(25.dp),
            )
        }
    }
}

@Composable
private fun RoundHomeButton(onClick: () -> Unit, content: @Composable () -> Unit) {
    Box(
        modifier = Modifier
            .size(52.dp)
            .clip(CircleShape)
            .border(1.dp, HomeCardBorder, CircleShape)
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        content()
    }
}

@Composable
private fun HomeTimeline(
    state: HomeUiState,
    onOpenMeeting: (String) -> Unit,
    onOpenLocalDraft: (draftId: String, status: String) -> Unit,
    onRetry: () -> Unit,
) {
    val draftLabel = state.localDraft?.let { JalaliDates.groupLabel(Date(it.createdAt)) }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(start = 18.dp, top = 10.dp, end = 18.dp, bottom = 108.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        if (state.localDraft != null && state.groups.none { it.label == draftLabel }) {
            item(key = "draft-header") { TimelineHeader(draftLabel.orEmpty()) }
            item(key = "draft-${state.localDraft.id}") {
                DraftCard(
                    draft = state.localDraft,
                    onClick = { onOpenLocalDraft(state.localDraft.id, state.localDraft.status) },
                )
            }
        }

        state.groups.forEach { group ->
            item(key = "header-${group.label}") { TimelineHeader(group.label) }
            if (state.localDraft != null && group.label == draftLabel) {
                item(key = "draft-${state.localDraft.id}") {
                    DraftCard(
                        draft = state.localDraft,
                        onClick = { onOpenLocalDraft(state.localDraft.id, state.localDraft.status) },
                    )
                }
            }
            items(group.meetings, key = { it.id }) { meeting ->
                MeetingCard(
                    meeting = meeting,
                    onClick = { onOpenMeeting(meeting.id) },
                    onRetry = onRetry,
                )
            }
        }
    }
}

@Composable
private fun TimelineHeader(label: String) {
    Text(
        text = label,
        color = HomeMuted,
        fontSize = 15.sp,
        modifier = Modifier.padding(top = 14.dp, bottom = 2.dp),
    )
}

@Composable
private fun MeetingCard(meeting: MeetingDto, onClick: () -> Unit, onRetry: () -> Unit) {
    val date = JalaliDates.parseApiDate(meeting.meeting_date)
        ?: JalaliDates.parseApiDate(meeting.created_at)
    val failed = StatusStyle.isErrorStatus(meeting.status)
    TimelineCard(
        title = meeting.title?.ifBlank { null } ?: "یادداشت جلسه",
        subtitle = if (failed) "مشکلی پیش آمد" else date?.let(::formatHomeTime).orEmpty(),
        isDraft = false,
        failed = failed,
        onClick = onClick,
        onRetry = onRetry,
    )
}

@Composable
private fun DraftCard(draft: LocalDraftUi, onClick: () -> Unit) {
    val status = when (draft.status) {
        DraftStatus.ON_RECORDING -> "در حال ضبط"
        DraftStatus.ON_UPLOADING -> "در حال بارگذاری"
        DraftStatus.ON_TAG_SELECTION -> "آماده تکمیل"
        else -> formatHomeTime(Date(draft.createdAt))
    }
    TimelineCard(
        title = "پیش‌نویس: ${draft.title}",
        subtitle = status,
        isDraft = true,
        failed = false,
        onClick = onClick,
    )
}

@Composable
private fun TimelineCard(
    title: String,
    subtitle: String,
    isDraft: Boolean,
    failed: Boolean,
    onClick: () -> Unit,
    onRetry: (() -> Unit)? = null,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(28.dp))
            .background(HomeCard)
            .border(1.dp, HomeCardBorder, RoundedCornerShape(28.dp))
            .clickable(onClick = onClick)
            .padding(horizontal = 18.dp, vertical = 17.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        Box(
            modifier = Modifier
                .size(58.dp)
                .clip(RoundedCornerShape(14.dp))
                .background(if (isDraft) HomeDraftTile else HomeIconTile),
            contentAlignment = Alignment.Center,
        ) {
            Icon(
                if (isDraft) Icons.Outlined.Description else Icons.Outlined.Mic,
                contentDescription = null,
                tint = if (isDraft) HomeMuted else HomeIconTint,
                modifier = Modifier.size(29.dp),
            )
        }
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = title,
                color = HomeText,
                fontWeight = FontWeight.Bold,
                fontSize = 16.sp,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            if (subtitle.isNotBlank()) {
                Spacer(Modifier.height(3.dp))
                Text(
                    text = subtitle,
                    color = HomeMuted,
                    fontSize = 14.sp,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }
        }
        if (failed && onRetry != null) {
            Icon(
                Icons.Outlined.Refresh,
                contentDescription = "تلاش مجدد",
                tint = HomeMuted,
                modifier = Modifier
                    .size(25.dp)
                    .clickable(onClick = onRetry),
            )
        }
    }
}

@Composable
private fun HomeActions(
    onRecord: () -> Unit,
    onAsk: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .padding(start = 18.dp, end = 18.dp, top = 12.dp, bottom = 18.dp),
        horizontalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        HomePill(
            text = "ضبط جدید",
            icon = Icons.Outlined.Mic,
            light = true,
            onClick = onRecord,
            modifier = Modifier.weight(1.12f),
        )
        HomePill(
            text = "هر چیزی بپرس",
            icon = Icons.Outlined.Search,
            light = false,
            onClick = onAsk,
            modifier = Modifier.weight(1f),
        )
    }
}

@Composable
private fun HomePill(
    text: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    light: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val shape = RoundedCornerShape(30.dp)
    Row(
        modifier = modifier
            .height(60.dp)
            .shadow(
                elevation = if (light) 16.dp else 12.dp,
                shape = shape,
                ambientColor = if (light) Color(0x520D4D4D) else Color(0x291C1B18),
                spotColor = if (light) Color(0x520D4D4D) else Color(0x291C1B18),
            )
            .clip(shape)
            .background(if (light) NeshastyarColors.Primary else NeshastyarColors.Surface)
            .then(
                if (light) Modifier else Modifier.border(
                    width = 1.dp,
                    color = NeshastyarColors.Outline,
                    shape = shape,
                ),
            )
            .clickable(onClick = onClick)
            .padding(horizontal = 18.dp),
        horizontalArrangement = Arrangement.Center,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(
            icon,
            contentDescription = null,
            tint = if (light) NeshastyarColors.OnPrimary else HomeText,
            modifier = Modifier.size(22.dp),
        )
        Spacer(Modifier.size(10.dp))
        Text(
            text = text,
            color = if (light) NeshastyarColors.OnPrimary else HomeText,
            fontWeight = FontWeight.Medium,
            fontSize = 15.sp,
            maxLines = 1,
        )
    }
}

@Composable
private fun HomeLoading() {
    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        CircularProgressIndicator(color = NeshastyarColors.Primary)
    }
}

@Composable
private fun HomeError(message: String, onRetry: () -> Unit) {
    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text(message, color = HomeMuted, fontSize = 14.sp)
            Spacer(Modifier.height(12.dp))
            Text(
                text = "تلاش مجدد",
                color = NeshastyarColors.PrimaryBright,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.clickable(onClick = onRetry),
            )
        }
    }
}

@Composable
private fun HomeEmpty() {
    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Icon(
                Icons.Outlined.Person,
                contentDescription = null,
                tint = HomeMuted,
                modifier = Modifier.size(36.dp),
            )
            Spacer(Modifier.height(10.dp))
            Text("هنوز یادداشتی ندارید", color = HomeMuted, fontSize = 15.sp)
        }
    }
}

private fun formatHomeTime(date: Date): String =
    SimpleDateFormat("HH:mm", ULocale("fa_IR")).format(date)
