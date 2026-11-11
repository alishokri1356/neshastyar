package com.neshastyar.app.ui.screens.meeting

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.FormatListBulleted
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.ContentCopy
import androidx.compose.material.icons.filled.Description
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Label
import androidx.compose.material.icons.filled.Menu
import androidx.compose.material.icons.filled.People
import androidx.compose.material.icons.filled.Save
import androidx.compose.material.icons.outlined.Mic
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.SheetValue
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.neshastyar.app.data.repository.MeetingsRepository
import com.neshastyar.app.ui.components.AnalyzeModelPicker
import com.neshastyar.app.ui.components.NeshastyarCard
import com.neshastyar.app.ui.components.NeshastyarPrimaryButton
import com.neshastyar.app.ui.components.NeshastyarSecondaryButton
import com.neshastyar.app.ui.components.NeshastyarTextField
import com.neshastyar.app.ui.components.SectionHeader
import com.neshastyar.app.ui.components.StatusChip
import com.neshastyar.app.ui.screens.chat.rememberSpeechInputLauncher
import com.neshastyar.app.ui.theme.NeshastyarColors
import com.neshastyar.app.util.JalaliDates
import com.neshastyar.app.util.StatusStyle

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun MeetingDetailScreen(
    onBack: () -> Unit,
    onParticipants: () -> Unit = {},
    onTags: () -> Unit = {},
    onOpenMinutes: () -> Unit = {},
    viewModel: MeetingDetailViewModel = hiltViewModel(),
) {
    val state by viewModel.ui.collectAsStateWithLifecycle()
    val clipboard = LocalClipboardManager.current
    val copySummary = {
        val text = viewModel.summaryClipboardText()
        if (text == null) {
            viewModel.noteCopyEmpty()
        } else {
            clipboard.setText(AnnotatedString(text))
            viewModel.noteCopied()
        }
    }
    val topMeeting = state.meeting
    val showProcessedTop = topMeeting != null &&
        !StatusStyle.isErrorStatus(topMeeting.status) &&
        !state.summarySuppressed

    Column(modifier = Modifier.fillMaxSize()) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 8.dp, vertical = 4.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            IconButton(onClick = onBack) {
                Icon(Icons.AutoMirrored.Filled.ArrowBack, "بازگشت", tint = NeshastyarColors.TextPrimary)
            }
            Spacer(Modifier.weight(1f))
            if (topMeeting != null) {
                MeetingTopSectionActions(
                    onParticipants = onParticipants,
                    onTags = onTags,
                    showParticipants = showProcessedTop,
                )
                Spacer(Modifier.width(4.dp))
            }
            IconButton(
                onClick = {
                    if (state.editing) viewModel.saveEditing() else viewModel.startEditing()
                },
                enabled = topMeeting != null,
            ) {
                Icon(
                    imageVector = if (state.editing) Icons.Default.Save else Icons.Default.Edit,
                    contentDescription = if (state.editing) "ذخیره" else "ویرایش",
                    tint = NeshastyarColors.Primary,
                )
            }
        }

        when {
            state.loading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = NeshastyarColors.Primary)
            }
            state.error != null && state.meeting == null -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(state.error!!, color = NeshastyarColors.Error)
                    TextButton(onClick = viewModel::retry) {
                        Text("تلاش مجدد", color = NeshastyarColors.PrimaryBright)
                    }
                }
            }
            state.meeting != null -> {
                val meeting = state.meeting!!
                val processingFailed = StatusStyle.isErrorStatus(meeting.status)
                val isProcessed = StatusStyle.isProcessedStatus(meeting.status)
                val showProcessed = !processingFailed && !state.summarySuppressed

                val analyzingLabel = meeting.analyzing_model?.takeIf { it.isNotBlank() }?.let {
                    MeetingsRepository.modelLabel(it, state.analyzeModels, state.autoKey)
                }
                val analyzedByLabel = meeting.analyzed_by?.takeIf { it.isNotBlank() }?.let {
                    MeetingsRepository.modelLabel(it, state.analyzeModels, state.autoKey)
                }

                LazyColumn(
                    modifier = Modifier.weight(1f),
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    item {
                        Text("جزئیات جلسه ضبط شده", color = NeshastyarColors.TextMuted, fontSize = 13.sp)
                        Spacer(Modifier.height(4.dp))
                        if (state.editing) {
                            NeshastyarTextField(
                                value = state.editTitle,
                                onValueChange = viewModel::onTitle,
                                label = "عنوان جلسه",
                            )
                        } else {
                            Text(
                                text = meeting.title?.ifBlank { null } ?: "جلسه",
                                fontSize = 22.sp,
                                fontWeight = FontWeight.Bold,
                                color = NeshastyarColors.TextPrimary,
                            )
                        }
                        FlowRow(
                            modifier = Modifier.padding(top = 10.dp),
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            verticalArrangement = Arrangement.spacedBy(6.dp),
                        ) {
                            val date = JalaliDates.parseApiDate(meeting.meeting_date)
                                ?: JalaliDates.parseApiDate(meeting.created_at)
                            if (date != null) {
                                Text(
                                    JalaliDates.formatDateTime(date),
                                    color = NeshastyarColors.TextMuted,
                                    fontSize = 12.sp,
                                    modifier = Modifier.align(Alignment.CenterVertically),
                                )
                            }
                            StatusChip(meeting.status)
                            if (!isProcessed && !processingFailed && analyzingLabel != null) {
                                Text(
                                    text = "• در حال تحلیل با $analyzingLabel",
                                    color = NeshastyarColors.TextMuted,
                                    fontSize = 11.sp,
                                    modifier = Modifier.align(Alignment.CenterVertically),
                                )
                            } else if (isProcessed && analyzedByLabel != null) {
                                Text(
                                    text = "• تحلیل شده با $analyzedByLabel",
                                    color = NeshastyarColors.TextMuted,
                                    fontSize = 11.sp,
                                    modifier = Modifier.align(Alignment.CenterVertically),
                                )
                            }
                        }
                    }

                    if (processingFailed) {
                        val errorDetail = state.summary.summaryText
                            .ifBlank { state.summary.rawText }
                            .ifBlank { meeting.summary.orEmpty() }
                            .trim()
                        if (errorDetail.isNotEmpty()) {
                            item {
                                Text(
                                    text = errorDetail,
                                    color = NeshastyarColors.Error,
                                    fontSize = 14.sp,
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .clip(RoundedCornerShape(12.dp))
                                        .background(NeshastyarColors.ErrorContainer)
                                        .padding(14.dp),
                                )
                            }
                        }
                    }

                    if (showProcessed) {
                        item {
                            NeshastyarCard {
                                SectionHeader(
                                    title = "خلاصه اجرایی هوش مصنوعی",
                                    icon = Icons.Default.AutoAwesome,
                                    iconTint = NeshastyarColors.Secondary,
                                )
                                Spacer(Modifier.height(10.dp))
                                DetailTextPart(
                                    label = "موضوع",
                                    value = state.summary.subject,
                                    draft = state.editSubject,
                                    editing = state.editing,
                                    onValueChange = viewModel::onSubject,
                                )
                                if (state.editing || state.summary.location.isNotBlank() || state.editLocation.isNotBlank()) {
                                    Spacer(Modifier.height(12.dp))
                                    DetailTextPart(
                                        label = "محل تشکیل جلسه",
                                        value = state.summary.location,
                                        draft = state.editLocation,
                                        editing = state.editing,
                                        onValueChange = viewModel::onLocation,
                                    )
                                }
                                Spacer(Modifier.height(12.dp))
                                DetailTextPart(
                                    label = "خلاصه",
                                    value = state.summary.summaryText,
                                    draft = state.editSummaryText,
                                    editing = state.editing,
                                    onValueChange = viewModel::onSummaryText,
                                    singleLine = false,
                                    minLines = 4,
                                )
                            }
                        }
                    }

                    item {
                        if (processingFailed) {
                            AnalyzeModelPicker(
                                value = state.analyzeModel,
                                models = state.analyzeModels,
                                autoKey = state.autoKey,
                                label = "مدل هوش مصنوعی تحلیل",
                                enabled = !state.reprocessing,
                                onValueChange = viewModel::onAnalyzeModel,
                                modifier = Modifier.padding(bottom = 10.dp),
                            )
                            NeshastyarPrimaryButton(
                                text = "درخواست پردازش مجدد",
                                onClick = viewModel::requestReprocess,
                                loading = state.reprocessing,
                            )
                        } else if (showProcessed) {
                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                NeshastyarSecondaryButton(
                                    text = "کپی",
                                    onClick = copySummary,
                                    modifier = Modifier.weight(1f),
                                )
                                NeshastyarSecondaryButton(
                                    text = "ایمیل",
                                    onClick = viewModel::sendEmail,
                                    modifier = Modifier.weight(1f),
                                )
                            }
                            if (isProcessed) {
                                Spacer(Modifier.height(8.dp))
                                NeshastyarSecondaryButton(
                                    text = "باز کردن و ویرایش صورتجلسه",
                                    onClick = onOpenMinutes,
                                )
                            }
                        }
                        if (state.message != null) {
                            Text(state.message!!, color = NeshastyarColors.PrimaryBright, modifier = Modifier.padding(top = 8.dp))
                        }
                        if (state.error != null) {
                            Text(state.error!!, color = NeshastyarColors.Error, modifier = Modifier.padding(top = 8.dp))
                        }
                        Spacer(Modifier.height(8.dp))
                    }
                }
            }
        }
    }

    if (state.showAiEditSheet) {
        AiEditBottomSheet(
            prompt = state.aiPrompt,
            loading = state.aiEditing,
            error = state.aiEditError,
            onPromptChange = viewModel::onAiPromptChange,
            onDictation = viewModel::appendAiDictation,
            onSubmit = viewModel::submitAiEdit,
            onDismiss = viewModel::dismissAiEditSheet,
        )
    }

}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun AiEditBottomSheet(
    prompt: String,
    loading: Boolean,
    error: String?,
    onPromptChange: (String) -> Unit,
    onDictation: (String) -> Unit,
    onSubmit: () -> Unit,
    onDismiss: () -> Unit,
) {
    val sheetState = rememberModalBottomSheetState(
        skipPartiallyExpanded = true,
        confirmValueChange = { !loading || it != SheetValue.Hidden },
    )
    val startSpeech = rememberSpeechInputLauncher(
        prompt = "تغییرات مورد نظر را بگویید",
        onResult = onDictation,
    )

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        containerColor = NeshastyarColors.Background,
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp)
                .padding(bottom = 24.dp)
                .imePadding(),
        ) {
            SectionHeader(
                title = "ویرایش با هوش مصنوعی",
                icon = Icons.Default.AutoAwesome,
                iconTint = NeshastyarColors.Secondary,
            )
            Text(
                text = "بنویسید یا بگویید چه چیزی تغییر کند؛ مثلاً تاریخ یا عنوان جلسه، محل، خلاصه، نکات، حاضرین یا برچسب‌ها. تغییرات مستقیم روی جلسه ذخیره می‌شود.",
                color = NeshastyarColors.TextMuted,
                fontSize = 13.sp,
                lineHeight = 20.sp,
                modifier = Modifier.padding(top = 8.dp, bottom = 12.dp),
            )
            NeshastyarTextField(
                value = prompt,
                onValueChange = onPromptChange,
                label = "درخواست ویرایش",
                placeholder = "مثلاً: رضا احمدی را به حاضرین اضافه کن و تاریخ را ۱۵ آبان بگذار",
                singleLine = false,
                minLines = 3,
                enabled = !loading,
                trailingIcon = {
                    IconButton(onClick = startSpeech, enabled = !loading) {
                        Icon(
                            Icons.Outlined.Mic,
                            contentDescription = "ورودی صوتی",
                            tint = NeshastyarColors.Primary,
                        )
                    }
                },
            )
            if (loading) {
                Text(
                    text = "در حال اعمال تغییرات… ممکن است تا دو دقیقه طول بکشد",
                    color = NeshastyarColors.TextMuted,
                    fontSize = 12.sp,
                    modifier = Modifier.padding(top = 10.dp),
                )
            }
            if (error != null) {
                Text(
                    text = error,
                    color = NeshastyarColors.Error,
                    fontSize = 13.sp,
                    modifier = Modifier.padding(top = 10.dp),
                )
            }
            Spacer(Modifier.height(16.dp))
            NeshastyarPrimaryButton(
                text = "اعمال تغییرات",
                onClick = onSubmit,
                enabled = prompt.isNotBlank() && !loading,
                loading = loading,
            )
        }
    }
}

@Composable
private fun DetailTextPart(
    label: String,
    value: String,
    draft: String,
    editing: Boolean,
    onValueChange: (String) -> Unit,
    singleLine: Boolean = true,
    minLines: Int = 1,
) {
    if (editing) {
        NeshastyarTextField(
            value = draft,
            onValueChange = onValueChange,
            label = label,
            singleLine = singleLine,
            minLines = minLines,
        )
    } else {
        Text(
            text = label,
            color = NeshastyarColors.TextSecondary,
            fontWeight = FontWeight.SemiBold,
            fontSize = 14.sp,
        )
        Text(
            text = value.ifBlank { "—" },
            color = if (value.isBlank()) NeshastyarColors.TextMuted else NeshastyarColors.TextPrimary,
            modifier = Modifier.padding(top = 4.dp),
        )
    }
}

enum class MeetingBottomTab {
    Summary,
    BulletPoints,
    Options,
}

@Composable
fun MeetingTopSectionActions(
    onParticipants: () -> Unit,
    onTags: () -> Unit,
    showParticipants: Boolean = true,
    participantsSelected: Boolean = false,
    tagsSelected: Boolean = false,
    modifier: Modifier = Modifier,
) {
    Row(
        modifier = modifier,
        horizontalArrangement = Arrangement.spacedBy(6.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        if (showParticipants) {
            MeetingTopActionChip(
                icon = Icons.Default.People,
                label = "حاضرین",
                selected = participantsSelected,
                onClick = onParticipants,
            )
        }
        MeetingTopActionChip(
            icon = Icons.Default.Label,
            label = "برچسب‌ها",
            selected = tagsSelected,
            onClick = onTags,
        )
    }
}

@Composable
private fun MeetingTopActionChip(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    label: String,
    selected: Boolean,
    onClick: () -> Unit,
) {
    val shape = RoundedCornerShape(999.dp)
    val containerColor = if (selected) NeshastyarColors.PrimaryContainer else NeshastyarColors.Surface
    val borderColor = if (selected) NeshastyarColors.Primary.copy(alpha = 0.5f) else NeshastyarColors.Outline
    val contentColor = if (selected) NeshastyarColors.Primary else NeshastyarColors.TextPrimary
    Row(
        modifier = Modifier
            .clip(shape)
            .background(containerColor)
            .border(1.dp, borderColor, shape)
            .clickable(onClick = onClick)
            .padding(horizontal = 10.dp, vertical = 6.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(5.dp),
    ) {
        Icon(
            imageVector = icon,
            contentDescription = label,
            tint = NeshastyarColors.Primary,
            modifier = Modifier.size(16.dp),
        )
        Text(
            text = label,
            color = contentColor,
            fontSize = 12.sp,
            fontWeight = if (selected) FontWeight.Bold else FontWeight.Medium,
            maxLines = 1,
        )
    }
}

@Composable
fun MeetingDetailBottomBar(
    onSummary: () -> Unit,
    onBulletPoints: () -> Unit,
    onAiEdit: () -> Unit,
    onMenu: () -> Unit,
    selectedTab: MeetingBottomTab? = null,
    showProcessedSections: Boolean = true,
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(Color.White)
            .navigationBarsPadding(),
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(1.dp)
                .background(NeshastyarColors.Outline.copy(alpha = 0.35f)),
        )
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 4.dp, vertical = 4.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            MeetingDetailBarAction(
                icon = Icons.Default.Description,
                label = "خلاصه",
                selected = selectedTab == MeetingBottomTab.Summary,
                onClick = onSummary,
            )
            if (showProcessedSections) {
                MeetingDetailBarAction(
                    icon = Icons.AutoMirrored.Filled.FormatListBulleted,
                    label = "نکات",
                    selected = selectedTab == MeetingBottomTab.BulletPoints,
                    onClick = onBulletPoints,
                )
                MeetingDetailBarAction(
                    icon = Icons.Default.AutoAwesome,
                    label = "ویرایش هوشمند",
                    selected = false,
                    onClick = onAiEdit,
                )
            }
            MeetingDetailBarAction(
                icon = Icons.Default.Menu,
                label = "گزینه‌ها",
                selected = selectedTab == MeetingBottomTab.Options,
                onClick = onMenu,
            )
        }
    }
}

@Composable
private fun RowScope.MeetingDetailBarAction(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    label: String,
    selected: Boolean,
    onClick: () -> Unit,
) {
    Column(
        modifier = Modifier
            .weight(1f)
            .clip(RoundedCornerShape(10.dp))
            .clickable(onClick = onClick)
            .padding(vertical = 3.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Box(
            modifier = Modifier
                .clip(RoundedCornerShape(999.dp))
                .background(if (selected) NeshastyarColors.PrimaryContainer else Color.Transparent)
                .padding(horizontal = 12.dp, vertical = 2.dp),
            contentAlignment = Alignment.Center,
        ) {
            Icon(
                icon,
                contentDescription = label,
                tint = NeshastyarColors.Primary,
                modifier = Modifier.size(20.dp),
            )
        }
        Text(
            text = label,
            color = if (selected) NeshastyarColors.Primary else NeshastyarColors.TextSecondary,
            fontWeight = if (selected) FontWeight.Bold else FontWeight.Normal,
            fontSize = 11.sp,
            lineHeight = 13.sp,
            maxLines = 1,
        )
    }
}
