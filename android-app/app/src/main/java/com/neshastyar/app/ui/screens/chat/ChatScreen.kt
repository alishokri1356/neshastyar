package com.neshastyar.app.ui.screens.chat

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.icons.outlined.ContentCopy
import androidx.compose.material.icons.outlined.History
import androidx.compose.material.icons.outlined.Mic
import androidx.compose.material.icons.outlined.Refresh
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.neshastyar.app.data.api.ChatMessageDto
import com.neshastyar.app.ui.theme.NeshastyarColors

@Composable
fun ChatScreen(
    onBack: () -> Unit,
    onOpenHistory: (meetingId: String?) -> Unit,
    viewModel: ChatViewModel = hiltViewModel(),
) {
    val state by viewModel.ui.collectAsStateWithLifecycle()
    val listState = rememberLazyListState()
    val startSpeech = rememberSpeechInputLauncher(onResult = viewModel::appendDictation)
    val suggestions = if (state.meetingId != null) {
        listOf("فهرست اقدامات", "نوشتن ایمیل پیگیری", "خلاصه تصمیم‌ها")
    } else {
        listOf("اقدامات باز اخیر", "جلسات این هفته", "تصمیم‌های مهم")
    }

    LaunchedEffect(state.messages.size, state.sending) {
        if (state.messages.isNotEmpty() || state.sending) {
            listState.animateScrollToItem(0)
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(NeshastyarColors.Background)
            .statusBarsPadding()
            .navigationBarsPadding()
            .imePadding(),
    ) {
        ChatHeader(
            onBack = onBack,
            onHistory = { onOpenHistory(state.meetingId) },
        )

        when {
            state.loadingSession -> {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = NeshastyarColors.Primary)
                }
            }
            state.messages.isEmpty() && !state.sending -> {
                EmptyChatState(
                    meetingScoped = state.meetingId != null,
                    scopeLabel = state.scopeLabel,
                    modifier = Modifier.weight(1f),
                )
            }
            else -> {
                LazyColumn(
                    state = listState,
                    reverseLayout = true,
                    modifier = Modifier
                        .weight(1f)
                        .fillMaxWidth(),
                    contentPadding = PaddingValues(horizontal = 16.dp, vertical = 12.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    if (state.sending) {
                        item(key = "thinking") {
                            ThinkingBubble()
                        }
                    }
                    items(state.messages.asReversed(), key = { it.id }) { message ->
                        MessageBubble(
                            message = message,
                            onRetry = viewModel::retryLast,
                        )
                    }
                }
            }
        }

        if (state.error != null && state.messages.isEmpty()) {
            Text(
                text = state.error!!,
                color = NeshastyarColors.Error,
                fontSize = 13.sp,
                modifier = Modifier.padding(horizontal = 18.dp, vertical = 4.dp),
            )
        }

        if (state.messages.isEmpty() && !state.sending) {
            SuggestionRow(
                suggestions = suggestions,
                onSuggestion = viewModel::send,
            )
        }

        ChatInputBar(
            value = state.input,
            enabled = !state.sending,
            onValueChange = viewModel::onInput,
            onMic = startSpeech,
            onSend = { viewModel.send() },
        )
    }
}

@Composable
private fun ChatHeader(onBack: () -> Unit, onHistory: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 14.dp, vertical = 10.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        RoundIconButton(onClick = onBack) {
            Icon(
                Icons.AutoMirrored.Filled.ArrowBack,
                contentDescription = "بازگشت",
                tint = NeshastyarColors.TextPrimary,
            )
        }
        RoundIconButton(onClick = onHistory) {
            Icon(
                Icons.Outlined.History,
                contentDescription = "تاریخچه گفتگو",
                tint = NeshastyarColors.TextPrimary,
            )
        }
    }
}

@Composable
private fun RoundIconButton(onClick: () -> Unit, content: @Composable () -> Unit) {
    Box(
        modifier = Modifier
            .size(44.dp)
            .clip(CircleShape)
            .border(1.dp, NeshastyarColors.Outline, CircleShape)
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        content()
    }
}

@Composable
private fun EmptyChatState(
    meetingScoped: Boolean,
    scopeLabel: String,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Text(
            text = if (meetingScoped) {
                "هر چیزی درباره این جلسه بپرسید"
            } else {
                "هر چیزی درباره جلسات‌تان بپرسید"
            },
            color = NeshastyarColors.TextPrimary,
            fontFamily = FontFamily.Serif,
            fontSize = 28.sp,
            lineHeight = 40.sp,
            textAlign = TextAlign.Center,
            fontWeight = FontWeight.Medium,
        )
        Spacer(Modifier.height(18.dp))
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text("گفتگو درباره", color = NeshastyarColors.TextMuted, fontSize = 14.sp)
            Spacer(Modifier.size(8.dp))
            Box(
                modifier = Modifier
                    .clip(RoundedCornerShape(999.dp))
                    .border(1.dp, NeshastyarColors.Outline, RoundedCornerShape(999.dp))
                    .padding(horizontal = 12.dp, vertical = 6.dp),
            ) {
                Text(scopeLabel, color = NeshastyarColors.TextPrimary, fontSize = 13.sp)
            }
        }
    }
}

@Composable
private fun SuggestionRow(suggestions: List<String>, onSuggestion: (String) -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .horizontalScroll(rememberScrollState())
            .padding(horizontal = 16.dp, vertical = 8.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        suggestions.forEach { text ->
            Box(
                modifier = Modifier
                    .clip(RoundedCornerShape(999.dp))
                    .border(1.dp, NeshastyarColors.Outline, RoundedCornerShape(999.dp))
                    .clickable { onSuggestion(text) }
                    .padding(horizontal = 14.dp, vertical = 10.dp),
            ) {
                Text(text, color = NeshastyarColors.TextPrimary, fontSize = 13.sp)
            }
        }
    }
}

@Composable
private fun ThinkingBubble() {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .padding(end = 48.dp)
            .clip(RoundedCornerShape(18.dp))
            .background(NeshastyarColors.Surface)
            .border(1.dp, NeshastyarColors.Outline, RoundedCornerShape(18.dp))
            .padding(horizontal = 14.dp, vertical = 12.dp),
    ) {
        Text("در حال فکر کردن…", color = NeshastyarColors.TextMuted, fontSize = 14.sp)
    }
}

@Composable
private fun MessageBubble(message: ChatMessageDto, onRetry: () -> Unit) {
    val context = LocalContext.current
    val isUser = message.role == "user"
    val failed = message.role == "assistant" && message.status == "error"

    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = if (isUser) Arrangement.Start else Arrangement.End,
    ) {
        Column(
            modifier = Modifier.widthIn(max = 320.dp),
            horizontalAlignment = if (isUser) Alignment.Start else Alignment.End,
        ) {
            Box(
                modifier = Modifier
                    .clip(RoundedCornerShape(18.dp))
                    .background(
                        when {
                            failed -> NeshastyarColors.ErrorContainer
                            isUser -> NeshastyarColors.PrimaryContainer
                            else -> NeshastyarColors.Surface
                        },
                    )
                    .then(
                        if (!isUser && !failed) {
                            Modifier.border(1.dp, NeshastyarColors.Outline, RoundedCornerShape(18.dp))
                        } else {
                            Modifier
                        },
                    )
                    .padding(horizontal = 14.dp, vertical = 12.dp),
            ) {
                Text(
                    text = message.content,
                    color = if (failed) NeshastyarColors.Error else NeshastyarColors.TextPrimary,
                    fontSize = 15.sp,
                    lineHeight = 24.sp,
                )
            }
            if (!isUser) {
                Row(
                    modifier = Modifier.padding(top = 4.dp),
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    if (failed) {
                        Icon(
                            Icons.Outlined.Refresh,
                            contentDescription = "تلاش مجدد",
                            tint = NeshastyarColors.TextMuted,
                            modifier = Modifier
                                .size(18.dp)
                                .clickable(onClick = onRetry),
                        )
                    } else {
                        Icon(
                            Icons.Outlined.ContentCopy,
                            contentDescription = "کپی",
                            tint = NeshastyarColors.TextMuted,
                            modifier = Modifier
                                .size(18.dp)
                                .clickable {
                                    copyText(context, message.content)
                                },
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun ChatInputBar(
    value: String,
    enabled: Boolean,
    onValueChange: (String) -> Unit,
    onMic: () -> Unit,
    onSend: () -> Unit,
) {
    val canSend = value.trim().isNotBlank() && enabled
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 14.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Row(
            modifier = Modifier
                .weight(1f)
                .height(54.dp)
                .clip(RoundedCornerShape(28.dp))
                .background(NeshastyarColors.Surface)
                .border(1.dp, NeshastyarColors.Outline, RoundedCornerShape(28.dp))
                .padding(horizontal = 16.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            BasicTextField(
                value = value,
                onValueChange = onValueChange,
                enabled = enabled,
                singleLine = true,
                textStyle = TextStyle(
                    color = NeshastyarColors.TextPrimary,
                    fontSize = 15.sp,
                ),
                cursorBrush = SolidColor(NeshastyarColors.Primary),
                modifier = Modifier.weight(1f),
                decorationBox = { inner ->
                    if (value.isBlank()) {
                        Text("هر چیزی بپرسید", color = NeshastyarColors.TextMuted, fontSize = 15.sp)
                    }
                    inner()
                },
            )
        }
        Box(
            modifier = Modifier
                .size(48.dp)
                .clip(CircleShape)
                .border(1.dp, NeshastyarColors.Outline, CircleShape)
                .clickable(enabled = enabled, onClick = onMic),
            contentAlignment = Alignment.Center,
        ) {
            Icon(Icons.Outlined.Mic, contentDescription = "ورودی صوتی", tint = NeshastyarColors.TextPrimary)
        }
        Box(
            modifier = Modifier
                .size(48.dp)
                .clip(CircleShape)
                .background(if (canSend) NeshastyarColors.Primary else NeshastyarColors.Outline)
                .clickable(enabled = canSend, onClick = onSend),
            contentAlignment = Alignment.Center,
        ) {
            Icon(
                Icons.AutoMirrored.Filled.Send,
                contentDescription = "ارسال",
                tint = if (canSend) NeshastyarColors.OnPrimary else NeshastyarColors.TextMuted,
            )
        }
    }
}

private fun copyText(context: Context, text: String) {
    val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
    clipboard.setPrimaryClip(ClipData.newPlainText("chat", text))
    Toast.makeText(context, "کپی شد", Toast.LENGTH_SHORT).show()
}
