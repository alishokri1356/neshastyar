package com.neshastyar.app.ui.screens.chat

import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.combinedClickable
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
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.outlined.Description
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.neshastyar.app.data.api.ChatSessionDto
import com.neshastyar.app.ui.theme.NeshastyarColors
import com.neshastyar.app.util.JalaliDates

@OptIn(ExperimentalFoundationApi::class)
@Composable
fun ChatHistoryScreen(
    onBack: () -> Unit,
    onOpenSession: (sessionId: String, meetingId: String?) -> Unit,
    viewModel: ChatHistoryViewModel = hiltViewModel(),
) {
    val state by viewModel.ui.collectAsStateWithLifecycle()
    var pendingDelete by remember { mutableStateOf<ChatSessionDto?>(null) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(NeshastyarColors.Background)
            .statusBarsPadding(),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 14.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(
                modifier = Modifier
                    .size(44.dp)
                    .clip(CircleShape)
                    .border(1.dp, NeshastyarColors.Outline, CircleShape)
                    .clickable(onClick = onBack),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    Icons.AutoMirrored.Filled.ArrowBack,
                    contentDescription = "بازگشت",
                    tint = NeshastyarColors.TextPrimary,
                )
            }
            Text(
                text = "تاریخچه گفتگو",
                color = NeshastyarColors.TextPrimary,
                fontWeight = FontWeight.Bold,
                fontSize = 18.sp,
                modifier = Modifier
                    .weight(1f)
                    .padding(horizontal = 12.dp),
            )
        }

        when {
            state.loading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = NeshastyarColors.Primary)
            }
            state.error != null && state.sessions.isEmpty() -> Box(
                Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center,
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(state.error!!, color = NeshastyarColors.Error)
                    Spacer(Modifier.height(8.dp))
                    TextButton(onClick = viewModel::refresh) {
                        Text("تلاش مجدد", color = NeshastyarColors.PrimaryBright)
                    }
                }
            }
            state.sessions.isEmpty() -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(
                        Icons.Outlined.Description,
                        contentDescription = null,
                        tint = NeshastyarColors.TextMuted,
                        modifier = Modifier.size(42.dp),
                    )
                    Spacer(Modifier.height(10.dp))
                    Text("هنوز گفتگویی ندارید", color = NeshastyarColors.TextMuted, fontSize = 15.sp)
                }
            }
            else -> {
                LazyColumn(
                    contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                    modifier = Modifier.fillMaxSize(),
                ) {
                    items(state.sessions, key = { it.id }) { session ->
                        HistoryCard(
                            session = session,
                            onClick = { onOpenSession(session.id, session.meeting_id ?: state.meetingId) },
                            onLongClick = { pendingDelete = session },
                        )
                    }
                }
            }
        }
    }

    pendingDelete?.let { session ->
        AlertDialog(
            onDismissRequest = { pendingDelete = null },
            title = { Text("حذف گفتگو") },
            text = { Text("این گفتگو حذف شود؟") },
            confirmButton = {
                TextButton(
                    onClick = {
                        viewModel.delete(session.id)
                        pendingDelete = null
                    },
                ) {
                    Text("حذف", color = NeshastyarColors.Error)
                }
            },
            dismissButton = {
                TextButton(onClick = { pendingDelete = null }) {
                    Text("انصراف")
                }
            },
        )
    }
}

@OptIn(ExperimentalFoundationApi::class)
@Composable
private fun HistoryCard(
    session: ChatSessionDto,
    onClick: () -> Unit,
    onLongClick: () -> Unit,
) {
    val whenText = JalaliDates.parseApiDate(session.last_message_at ?: session.created_at)
        ?.let { JalaliDates.formatDateTime(it) }
        .orEmpty()

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(18.dp))
            .background(NeshastyarColors.Surface)
            .border(1.dp, NeshastyarColors.Outline, RoundedCornerShape(18.dp))
            .combinedClickable(onClick = onClick, onLongClick = onLongClick)
            .padding(horizontal = 16.dp, vertical = 14.dp),
    ) {
        Text(
            text = session.title?.ifBlank { null } ?: "گفتگو",
            color = NeshastyarColors.TextPrimary,
            fontWeight = FontWeight.SemiBold,
            fontSize = 15.sp,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
        if (!session.last_message_preview.isNullOrBlank()) {
            Spacer(Modifier.height(4.dp))
            Text(
                text = session.last_message_preview,
                color = NeshastyarColors.TextMuted,
                fontSize = 13.sp,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
            )
        }
        if (whenText.isNotBlank()) {
            Spacer(Modifier.height(6.dp))
            Text(whenText, color = NeshastyarColors.TextMuted, fontSize = 12.sp)
        }
    }
}
