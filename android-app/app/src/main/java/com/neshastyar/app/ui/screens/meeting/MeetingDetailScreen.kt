package com.neshastyar.app.ui.screens.meeting

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material.icons.filled.People
import androidx.compose.material.icons.filled.PlaylistAddCheck
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.neshastyar.app.ui.components.NeshastyarCard
import com.neshastyar.app.ui.components.NeshastyarPrimaryButton
import com.neshastyar.app.ui.components.NeshastyarSecondaryButton
import com.neshastyar.app.ui.components.NeshastyarTextField
import com.neshastyar.app.ui.components.SectionHeader
import com.neshastyar.app.ui.components.StatusChip
import com.neshastyar.app.ui.theme.NeshastyarColors
import com.neshastyar.app.util.JalaliDates

@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun MeetingDetailScreen(
    onBack: () -> Unit,
    onDeleted: () -> Unit,
    onOptions: (String) -> Unit,
    viewModel: MeetingDetailViewModel = hiltViewModel(),
) {
    val state by viewModel.ui.collectAsStateWithLifecycle()
    var menu by remember { mutableStateOf(false) }
    LaunchedEffect(state.deleted) { if (state.deleted) onDeleted() }

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
            Text(
                "نشست یار",
                color = NeshastyarColors.PrimaryBright,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.weight(1f),
            )
            Box {
                IconButton(onClick = { menu = true }) {
                    Icon(Icons.Default.MoreVert, null, tint = NeshastyarColors.TextPrimary)
                }
                DropdownMenu(expanded = menu, onDismissRequest = { menu = false }) {
                    DropdownMenuItem(
                        text = { Text("گزینه‌ها / صوت") },
                        onClick = {
                            menu = false
                            state.meeting?.id?.let(onOptions)
                        },
                    )
                    DropdownMenuItem(
                        text = { Text("حذف جلسه") },
                        onClick = {
                            menu = false
                            viewModel.deleteMeeting()
                        },
                    )
                }
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
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    item {
                        Text("جزئیات جلسه ضبط شده", color = NeshastyarColors.TextMuted, fontSize = 13.sp)
                        Text(
                            text = meeting.title?.ifBlank { null } ?: "جلسه",
                            fontSize = 22.sp,
                            fontWeight = FontWeight.Bold,
                            color = NeshastyarColors.TextPrimary,
                            modifier = Modifier.padding(top = 4.dp),
                        )
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
                            NeshastyarTextField(
                                value = state.editTitle,
                                onValueChange = viewModel::onTitle,
                                label = "عنوان جلسه",
                                trailingIcon = {
                                    IconButton(onClick = viewModel::saveTitle) {
                                        Icon(
                                            imageVector = Icons.Default.Check,
                                            contentDescription = "ذخیره عنوان",
                                            tint = NeshastyarColors.PrimaryBright,
                                        )
                                    }
                                },
                            )
                        }
                    }

                    item {
                        NeshastyarCard {
                            SectionHeader(
                                title = "خلاصه هوشمند هوش مصنوعی",
                                icon = Icons.Default.AutoAwesome,
                                iconTint = NeshastyarColors.Secondary,
                            )
                            Spacer(Modifier.height(10.dp))
                            NeshastyarTextField(
                                value = state.editSubject,
                                onValueChange = viewModel::onSubject,
                                label = "موضوع",
                            )
                            Spacer(Modifier.height(8.dp))
                            NeshastyarTextField(
                                value = state.editSummaryText,
                                onValueChange = viewModel::onSummaryText,
                                label = "خلاصه",
                                singleLine = false,
                                minLines = 4,
                            )
                            Spacer(Modifier.height(8.dp))
                            NeshastyarPrimaryButton(text = "ذخیره خلاصه", onClick = viewModel::saveSummary)

                            if (state.tags.isNotEmpty()) {
                                FlowRow(
                                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                                    modifier = Modifier.padding(top = 12.dp),
                                ) {
                                    state.tags.forEach { tag ->
                                        FilterChip(
                                            selected = true,
                                            onClick = { viewModel.unlinkTag(tag.id) },
                                            label = { Text(tag.name ?: tag.id) },
                                            colors = FilterChipDefaults.filterChipColors(
                                                selectedContainerColor = NeshastyarColors.PrimaryContainer,
                                                selectedLabelColor = NeshastyarColors.PrimaryBright,
                                            ),
                                        )
                                    }
                                }
                            }
                        }
                    }

                    if (state.summary.bulletPoints.isNotEmpty()) {
                        item {
                            NeshastyarCard {
                                SectionHeader(
                                    title = "نکات / نقاط تصمیم‌گیری",
                                    icon = Icons.Default.CheckCircle,
                                )
                                Spacer(Modifier.height(8.dp))
                                state.summary.bulletPoints.forEach { point ->
                                    Text("• $point", color = NeshastyarColors.TextPrimary, modifier = Modifier.padding(vertical = 3.dp))
                                }
                            }
                        }
                    }

                    if (state.summary.people.isNotEmpty() || state.participants.isNotEmpty()) {
                        item {
                            NeshastyarCard {
                                SectionHeader(
                                    title = "حاضرین در جلسه",
                                    subtitle = "${state.participants.size.coerceAtLeast(state.summary.people.size)} نفر",
                                    icon = Icons.Default.People,
                                )
                                Spacer(Modifier.height(10.dp))
                                state.participants.forEach { p ->
                                    Row(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .padding(vertical = 6.dp),
                                        verticalAlignment = Alignment.CenterVertically,
                                    ) {
                                        Box(
                                            modifier = Modifier
                                                .size(36.dp)
                                                .clip(CircleShape)
                                                .then(
                                                    Modifier.background(NeshastyarColors.PrimaryContainer),
                                                ),
                                            contentAlignment = Alignment.Center,
                                        ) {
                                            Text(
                                                text = (p.name ?: "?").take(1),
                                                color = NeshastyarColors.PrimaryBright,
                                                fontWeight = FontWeight.Bold,
                                            )
                                        }
                                        Text(
                                            p.name ?: p.id,
                                            color = NeshastyarColors.TextPrimary,
                                            modifier = Modifier
                                                .weight(1f)
                                                .padding(horizontal = 10.dp),
                                        )
                                        TextButton(onClick = { viewModel.removeParticipant(p.id) }) {
                                            Text("حذف", color = NeshastyarColors.Error)
                                        }
                                    }
                                }
                                state.summary.people.filter { name ->
                                    state.participants.none { it.name == name }
                                }.forEach { name ->
                                    Text("• $name", color = NeshastyarColors.TextSecondary, modifier = Modifier.padding(vertical = 2.dp))
                                }
                                Spacer(Modifier.height(8.dp))
                                NeshastyarTextField(
                                    value = state.newParticipantName,
                                    onValueChange = viewModel::onNewParticipant,
                                    label = "نام فرد جدید",
                                )
                                Spacer(Modifier.height(8.dp))
                                NeshastyarSecondaryButton(text = "افزودن فرد", onClick = viewModel::addParticipant)
                            }
                        }
                    }

                    item {
                        NeshastyarCard {
                            SectionHeader(title = "برچسب‌ها", icon = Icons.Default.PlaylistAddCheck)
                            Spacer(Modifier.height(8.dp))
                            Text("افزودن برچسب:", color = NeshastyarColors.TextMuted, fontSize = 12.sp)
                            FlowRow(
                                horizontalArrangement = Arrangement.spacedBy(8.dp),
                                modifier = Modifier.padding(top = 6.dp),
                            ) {
                                state.allTags.filter { t -> state.tags.none { it.id == t.id } }.take(12).forEach { tag ->
                                    FilterChip(
                                        selected = false,
                                        onClick = { viewModel.linkTag(tag.id) },
                                        label = { Text(tag.name ?: tag.id) },
                                        colors = FilterChipDefaults.filterChipColors(
                                            containerColor = NeshastyarColors.SurfaceElevated,
                                            labelColor = NeshastyarColors.TextSecondary,
                                        ),
                                    )
                                }
                            }
                        }
                    }

                    if (state.audioFiles.isNotEmpty()) {
                        item {
                            NeshastyarCard {
                                SectionHeader(title = "فایل‌های صوتی")
                                Spacer(Modifier.height(8.dp))
                                state.audioFiles.forEach {
                                    Text(
                                        "• ${it.file_name ?: it.file_path ?: it.id.orEmpty()}",
                                        color = NeshastyarColors.TextSecondary,
                                        modifier = Modifier.padding(vertical = 2.dp),
                                    )
                                }
                            }
                        }
                    }

                    item {
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            NeshastyarPrimaryButton(
                                text = "پردازش",
                                onClick = viewModel::analyze,
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
                        Spacer(Modifier.height(24.dp))
                    }
                }
            }
        }
    }
}
