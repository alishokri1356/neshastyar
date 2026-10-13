package com.neshastyar.app.ui.screens.meeting

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.FormatListBulleted
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Label
import androidx.compose.material.icons.filled.Menu
import androidx.compose.material.icons.filled.People
import androidx.compose.material.icons.filled.Save
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.neshastyar.app.ui.components.NeshastyarCard
import com.neshastyar.app.ui.components.NeshastyarSecondaryButton
import com.neshastyar.app.ui.components.NeshastyarTextField
import com.neshastyar.app.ui.components.SectionHeader
import com.neshastyar.app.ui.components.StatusChip
import com.neshastyar.app.ui.theme.NeshastyarColors
import com.neshastyar.app.util.JalaliDates

@Composable
fun MeetingDetailScreen(
    onBack: () -> Unit,
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

    Column(modifier = Modifier.fillMaxSize()) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 8.dp, vertical = 4.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            IconButton(onClick = onBack) {
                Icon(Icons.AutoMirrored.Filled.ArrowBack, null, tint = NeshastyarColors.TextPrimary)
            }
            Spacer(Modifier.weight(1f))
            IconButton(
                onClick = {
                    if (state.editing) viewModel.saveEditing() else viewModel.startEditing()
                },
                enabled = state.meeting != null,
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
                        Row(
                            modifier = Modifier.padding(top = 10.dp),
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            val date = JalaliDates.parseApiDate(meeting.meeting_date)
                                ?: JalaliDates.parseApiDate(meeting.created_at)
                            if (date != null) {
                                Text(JalaliDates.formatDateTime(date), color = NeshastyarColors.TextMuted, fontSize = 12.sp)
                            }
                            StatusChip(meeting.status)
                        }
                    }

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

                    item {
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

@Composable
fun MeetingDetailBottomBar(
    onParticipants: () -> Unit,
    onTags: () -> Unit,
    onBulletPoints: () -> Unit,
    onMenu: () -> Unit,
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
                .padding(horizontal = 4.dp, vertical = 2.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            MeetingDetailBarAction(Icons.Default.People, "حاضرین", onParticipants)
            MeetingDetailBarAction(Icons.Default.Label, "برچسب‌ها", onTags)
            MeetingDetailBarAction(Icons.AutoMirrored.Filled.FormatListBulleted, "نکات", onBulletPoints)
            MeetingDetailBarAction(Icons.Default.Menu, "گزینه‌ها", onMenu)
        }
    }
}

@Composable
private fun RowScope.MeetingDetailBarAction(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    label: String,
    onClick: () -> Unit,
) {
    Column(
        modifier = Modifier
            .weight(1f)
            .clickable(onClick = onClick)
            .padding(vertical = 2.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Icon(
            icon,
            contentDescription = label,
            tint = NeshastyarColors.Primary,
            modifier = Modifier.size(20.dp),
        )
        Text(
            text = label,
            color = NeshastyarColors.TextSecondary,
            fontSize = 11.sp,
            lineHeight = 13.sp,
        )
    }
}
