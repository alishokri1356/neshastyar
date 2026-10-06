package com.neshastyar.app.ui.screens.meeting

import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
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
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.People
import androidx.compose.material.icons.filled.PlaylistAddCheck
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.neshastyar.app.data.api.ParticipantDto
import com.neshastyar.app.data.api.TagDto
import com.neshastyar.app.ui.components.NeshastyarCard
import com.neshastyar.app.ui.components.NeshastyarPrimaryButton
import com.neshastyar.app.ui.components.NeshastyarTextField
import com.neshastyar.app.ui.components.SectionHeader
import com.neshastyar.app.ui.theme.NeshastyarColors
import com.neshastyar.app.util.MeetingSummaryParser

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun MeetingParticipantsScreen(
    onBack: () -> Unit,
    onAddParticipants: () -> Unit,
    viewModel: MeetingDetailViewModel = hiltViewModel(),
) {
    val state by viewModel.ui.collectAsStateWithLifecycle()
    var selectedId by remember { mutableStateOf<String?>(null) }
    var draftName by remember { mutableStateOf("") }
    MeetingSectionScaffold(
        title = "حاضرین در جلسه",
        onBack = onBack,
        loading = !state.tagsReady && state.error == null,
        error = if (state.meeting == null) state.error else null,
        onRetry = viewModel::retry,
    ) {
        NeshastyarCard {
            SectionHeader(
                title = "حاضرین این جلسه",
                subtitle = "${state.participants.size} نفر",
                icon = Icons.Default.People,
            )
            Text(
                "برای ویرایش نام یا حذف فرد از این جلسه، روی آن بزنید. با ویرایش نام، همان نام در متن اسکن‌شده و در خلاصه جلسه هم اصلاح می‌شود.",
                color = NeshastyarColors.TextMuted,
                fontSize = 13.sp,
                modifier = Modifier.padding(top = 6.dp, bottom = 8.dp),
            )
            if (state.participants.isEmpty()) {
                Text("فردی ثبت نشده", color = NeshastyarColors.TextMuted)
            } else {
                FlowRow(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    state.participants.forEach { person ->
                        val displayName = MeetingSummaryParser.normalizePersonName(person.name)
                            .ifBlank { person.name ?: person.id }
                        FilterChip(
                            selected = true,
                            onClick = {
                                selectedId = person.id
                                draftName = displayName
                            },
                            label = { Text(displayName) },
                            colors = FilterChipDefaults.filterChipColors(
                                selectedContainerColor = NeshastyarColors.PrimaryContainer,
                                selectedLabelColor = NeshastyarColors.PrimaryBright,
                            ),
                        )
                    }
                }
            }
            val suggestions = suggestedParticipantNames(state)
            if (suggestions.isNotEmpty()) {
                Text(
                    "شرکت‌کنندگان پیشنهادی:",
                    color = NeshastyarColors.TextMuted,
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Medium,
                    modifier = Modifier.padding(top = 14.dp, bottom = 8.dp),
                )
                FlowRow(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    suggestions.forEach { name ->
                        FilterChip(
                            selected = false,
                            onClick = { viewModel.addParticipantByName(name) },
                            label = { Text(name) },
                            colors = FilterChipDefaults.filterChipColors(
                                containerColor = NeshastyarColors.WarningContainer,
                                labelColor = NeshastyarColors.Warning,
                            ),
                            border = FilterChipDefaults.filterChipBorder(
                                enabled = true,
                                selected = false,
                                borderColor = NeshastyarColors.Secondary,
                            ),
                        )
                    }
                }
            }
        }
        Spacer(Modifier.height(12.dp))
        NeshastyarPrimaryButton(
            text = "اضافه کردن حاضر",
            onClick = onAddParticipants,
        )
        SectionMessage(message = state.message, error = state.error)
    }
    if (selectedId != null) {
        AlertDialog(
            onDismissRequest = { selectedId = null },
            title = { Text("ویرایش حاضر") },
            text = {
                Column {
                    Text(
                        "نام را تغییر دهید یا فرد را از این جلسه حذف کنید. با ذخیره، این نام در متن اسکن‌شده و هر جای خلاصه که آمده هم عوض می‌شود.",
                        color = NeshastyarColors.TextSecondary,
                        fontSize = 13.sp,
                    )
                    OutlinedTextField(
                        value = draftName,
                        onValueChange = { draftName = it },
                        label = { Text("نام") },
                        singleLine = true,
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(top = 12.dp),
                    )
                }
            },
            confirmButton = {
                TextButton(
                    onClick = {
                        val id = selectedId ?: return@TextButton
                        viewModel.renameParticipant(id, draftName)
                        selectedId = null
                    },
                ) { Text("ذخیره", color = NeshastyarColors.PrimaryBright) }
            },
            dismissButton = {
                Row {
                    TextButton(
                        onClick = {
                            val id = selectedId ?: return@TextButton
                            viewModel.removeParticipant(id)
                            selectedId = null
                        },
                    ) { Text("حذف", color = NeshastyarColors.Error) }
                    TextButton(onClick = { selectedId = null }) {
                        Text("انصراف", color = NeshastyarColors.TextMuted)
                    }
                }
            },
            containerColor = NeshastyarColors.Surface,
        )
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun MeetingAddParticipantsScreen(
    onBack: () -> Unit,
    viewModel: MeetingDetailViewModel = hiltViewModel(),
) {
    val state by viewModel.ui.collectAsStateWithLifecycle()
    var personSearch by remember { mutableStateOf("") }
    val query = personSearch.trim()
    val suggestions = suggestedParticipantNames(state)
    val visiblePeople = state.allParticipants.filter { person ->
        val name = participantDisplayName(person)
        val shownAsSuggestion = suggestions.any { it.equals(name, ignoreCase = true) }
        !shownAsSuggestion && (query.isEmpty() || name.contains(query, ignoreCase = true))
    }
    val visibleSuggestions = suggestions.filter { name ->
        query.isEmpty() || name.contains(query, ignoreCase = true)
    }
    val canAddTypedName = query.isNotEmpty() &&
        visiblePeople.none {
            MeetingSummaryParser.normalizePersonName(it.name).ifBlank { it.name ?: it.id }
                .equals(query, ignoreCase = true)
        } &&
        visibleSuggestions.none { it.equals(query, ignoreCase = true) } &&
        state.participants.none { participantDisplayName(it).equals(query, ignoreCase = true) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .imePadding(),
    ) {
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
                "افزودن حاضر",
                fontWeight = FontWeight.Bold,
                color = NeshastyarColors.TextPrimary,
                fontSize = 18.sp,
            )
        }
        when {
            !state.tagsReady && state.error == null -> Box(
                Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center,
            ) {
                CircularProgressIndicator(color = NeshastyarColors.Primary)
            }
            state.meeting == null && state.error != null -> Box(
                Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center,
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(state.error!!, color = NeshastyarColors.Error)
                    TextButton(onClick = viewModel::retry) {
                        Text("تلاش مجدد", color = NeshastyarColors.PrimaryBright)
                    }
                }
            }
            else -> Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(horizontal = 16.dp),
            ) {
                NeshastyarTextField(
                    value = personSearch,
                    onValueChange = { personSearch = it },
                    label = "جستجوی فرد",
                    placeholder = "بخشی از نام",
                )
                Spacer(Modifier.height(12.dp))
                Column(
                    modifier = Modifier
                        .weight(1f)
                        .verticalScroll(rememberScrollState()),
                ) {
                    when {
                        state.allParticipants.isEmpty() && visibleSuggestions.isEmpty() && !canAddTypedName -> {
                            Text("فردی برای این کاربر وجود ندارد", color = NeshastyarColors.TextMuted)
                        }
                        visiblePeople.isEmpty() && visibleSuggestions.isEmpty() && !canAddTypedName -> {
                            Text("فردی با این عبارت پیدا نشد", color = NeshastyarColors.TextMuted)
                        }
                        else -> {
                            FlowRow(
                                horizontalArrangement = Arrangement.spacedBy(8.dp),
                                verticalArrangement = Arrangement.spacedBy(8.dp),
                            ) {
                                if (canAddTypedName) {
                                    FilterChip(
                                        selected = false,
                                        onClick = { viewModel.addParticipantByName(query) },
                                        label = { Text("افزودن «$query»") },
                                        colors = FilterChipDefaults.filterChipColors(
                                            containerColor = NeshastyarColors.PrimaryContainer,
                                            labelColor = NeshastyarColors.PrimaryBright,
                                        ),
                                    )
                                }
                                visibleSuggestions.forEach { name ->
                                    FilterChip(
                                        selected = false,
                                        onClick = { viewModel.addParticipantByName(name) },
                                        label = { Text(name) },
                                        colors = FilterChipDefaults.filterChipColors(
                                            containerColor = NeshastyarColors.WarningContainer,
                                            labelColor = NeshastyarColors.Warning,
                                        ),
                                        border = FilterChipDefaults.filterChipBorder(
                                            enabled = true,
                                            selected = false,
                                            borderColor = NeshastyarColors.Secondary,
                                        ),
                                    )
                                }
                                visiblePeople.forEach { person ->
                                    val name = MeetingSummaryParser.normalizePersonName(person.name)
                                        .ifBlank { person.name ?: person.id }
                                    val alreadyInMeeting = state.participants.any { it.id == person.id }
                                    FilterChip(
                                        selected = alreadyInMeeting,
                                        onClick = { viewModel.linkParticipant(person.id) },
                                        label = { Text(name) },
                                        colors = FilterChipDefaults.filterChipColors(
                                            containerColor = NeshastyarColors.SurfaceElevated,
                                            labelColor = NeshastyarColors.TextSecondary,
                                            selectedContainerColor = NeshastyarColors.PrimaryContainer,
                                            selectedLabelColor = NeshastyarColors.PrimaryBright,
                                        ),
                                    )
                                }
                            }
                        }
                    }
                    SectionMessage(message = state.message, error = state.error)
                    Spacer(Modifier.height(16.dp))
                }
            }
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun MeetingTagsScreen(
    onBack: () -> Unit,
    onAddTags: () -> Unit,
    viewModel: MeetingDetailViewModel = hiltViewModel(),
) {
    val state by viewModel.ui.collectAsStateWithLifecycle()
    var selectedTagId by remember { mutableStateOf<String?>(null) }
    var draftName by remember { mutableStateOf("") }
    MeetingSectionScaffold(
        title = "برچسب‌ها",
        onBack = onBack,
        loading = !state.tagsReady && state.error == null,
        error = if (state.meeting == null) state.error else null,
        onRetry = viewModel::retry,
    ) {
        NeshastyarCard {
            SectionHeader(title = "برچسب‌های این جلسه", icon = Icons.Default.PlaylistAddCheck)
            Text(
                "برای ویرایش نام یا حذف برچسب از این جلسه، روی آن بزنید.",
                color = NeshastyarColors.TextMuted,
                fontSize = 13.sp,
                modifier = Modifier.padding(top = 6.dp, bottom = 8.dp),
            )
            if (state.tags.isEmpty()) {
                Text("برچسبی ثبت نشده", color = NeshastyarColors.TextMuted)
            } else {
                FlowRow(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    state.tags.forEach { tag ->
                        FilterChip(
                            selected = true,
                            onClick = {
                                selectedTagId = tag.id
                                draftName = tag.name.orEmpty()
                            },
                            label = { Text(tag.name ?: tag.id) },
                            colors = FilterChipDefaults.filterChipColors(
                                selectedContainerColor = NeshastyarColors.SuccessContainer,
                                selectedLabelColor = NeshastyarColors.Success,
                            ),
                            border = FilterChipDefaults.filterChipBorder(
                                enabled = true,
                                selected = true,
                                selectedBorderColor = NeshastyarColors.Success,
                                selectedBorderWidth = 1.dp,
                            ),
                        )
                    }
                }
            }
            val suggestions = suggestedTagNames(state)
            if (suggestions.isNotEmpty()) {
                Text(
                    "برچسب‌های پیشنهادی:",
                    color = NeshastyarColors.TextMuted,
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Medium,
                    modifier = Modifier.padding(top = 14.dp, bottom = 8.dp),
                )
                FlowRow(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    suggestions.forEach { name ->
                        FilterChip(
                            selected = false,
                            onClick = { viewModel.addSuggestedTag(name) },
                            label = { Text(name) },
                            colors = FilterChipDefaults.filterChipColors(
                                containerColor = NeshastyarColors.WarningContainer,
                                labelColor = NeshastyarColors.Warning,
                            ),
                            border = FilterChipDefaults.filterChipBorder(
                                enabled = true,
                                selected = false,
                                borderColor = NeshastyarColors.Secondary,
                            ),
                        )
                    }
                }
            }
        }
        Spacer(Modifier.height(12.dp))
        NeshastyarPrimaryButton(
            text = "اضافه کردن برچسب",
            onClick = onAddTags,
        )
        SectionMessage(message = state.message, error = state.error)
    }
    if (selectedTagId != null) {
        AlertDialog(
            onDismissRequest = { selectedTagId = null },
            title = { Text("ویرایش برچسب") },
            text = {
                Column {
                    Text(
                        "نام را تغییر دهید، یا برچسب را از این جلسه حذف کنید.",
                        color = NeshastyarColors.TextSecondary,
                        fontSize = 13.sp,
                    )
                    OutlinedTextField(
                        value = draftName,
                        onValueChange = { draftName = it },
                        label = { Text("نام برچسب") },
                        singleLine = true,
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(top = 12.dp),
                    )
                }
            },
            confirmButton = {
                TextButton(
                    onClick = {
                        val id = selectedTagId ?: return@TextButton
                        viewModel.renameTag(id, draftName)
                        selectedTagId = null
                    },
                ) { Text("ذخیره", color = NeshastyarColors.PrimaryBright) }
            },
            dismissButton = {
                Row {
                    TextButton(
                        onClick = {
                            val id = selectedTagId ?: return@TextButton
                            viewModel.unlinkTag(id)
                            selectedTagId = null
                        },
                    ) { Text("حذف", color = NeshastyarColors.Error) }
                    TextButton(onClick = { selectedTagId = null }) {
                        Text("انصراف", color = NeshastyarColors.TextMuted)
                    }
                }
            },
            containerColor = NeshastyarColors.Surface,
        )
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun MeetingAddTagsScreen(
    onBack: () -> Unit,
    viewModel: MeetingDetailViewModel = hiltViewModel(),
) {
    val state by viewModel.ui.collectAsStateWithLifecycle()
    var tagSearch by remember { mutableStateOf("") }
    val query = tagSearch.trim()
    val suggestions = suggestedTagNames(state)
    val visibleSuggestions = suggestions.filter { name ->
        query.isEmpty() || name.contains(query, ignoreCase = true)
    }
    val visible = state.allTags.filter { tag ->
        val name = tagDisplayName(tag)
        val shownAsSuggestion = visibleSuggestions.any { it.equals(name, ignoreCase = true) }
        !shownAsSuggestion && (query.isEmpty() || name.contains(query, ignoreCase = true))
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .imePadding(),
    ) {
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
                "افزودن برچسب",
                fontWeight = FontWeight.Bold,
                color = NeshastyarColors.TextPrimary,
                fontSize = 18.sp,
            )
        }
        when {
            !state.tagsReady && state.error == null -> Box(
                Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center,
            ) {
                CircularProgressIndicator(color = NeshastyarColors.Primary)
            }
            state.meeting == null && state.error != null -> Box(
                Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center,
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(state.error!!, color = NeshastyarColors.Error)
                    TextButton(onClick = viewModel::retry) {
                        Text("تلاش مجدد", color = NeshastyarColors.PrimaryBright)
                    }
                }
            }
            else -> Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(horizontal = 16.dp),
            ) {
                NeshastyarTextField(
                    value = tagSearch,
                    onValueChange = { tagSearch = it },
                    label = "جستجوی برچسب",
                    placeholder = "بخشی از نام برچسب",
                )
                Spacer(Modifier.height(12.dp))
                Column(
                    modifier = Modifier
                        .weight(1f)
                        .verticalScroll(rememberScrollState()),
                ) {
                    when {
                        state.allTags.isEmpty() && visibleSuggestions.isEmpty() -> {
                            Text("برچسبی برای این کاربر وجود ندارد", color = NeshastyarColors.TextMuted)
                        }
                        visible.isEmpty() && visibleSuggestions.isEmpty() -> {
                            Text("برچسبی با این عبارت پیدا نشد", color = NeshastyarColors.TextMuted)
                        }
                        else -> {
                            FlowRow(
                                horizontalArrangement = Arrangement.spacedBy(8.dp),
                                verticalArrangement = Arrangement.spacedBy(8.dp),
                            ) {
                                visibleSuggestions.forEach { name ->
                                    FilterChip(
                                        selected = false,
                                        onClick = { viewModel.addSuggestedTag(name) },
                                        label = { Text(name) },
                                        colors = FilterChipDefaults.filterChipColors(
                                            containerColor = NeshastyarColors.WarningContainer,
                                            labelColor = NeshastyarColors.Warning,
                                        ),
                                        border = FilterChipDefaults.filterChipBorder(
                                            enabled = true,
                                            selected = false,
                                            borderColor = NeshastyarColors.Secondary,
                                        ),
                                    )
                                }
                                visible.forEach { tag ->
                                    val linked = state.tags.any { it.id == tag.id }
                                    FilterChip(
                                        selected = linked,
                                        onClick = { viewModel.linkTag(tag.id) },
                                        label = { Text(tag.name ?: tag.id) },
                                        colors = FilterChipDefaults.filterChipColors(
                                            containerColor = NeshastyarColors.SurfaceElevated,
                                            labelColor = NeshastyarColors.TextSecondary,
                                            selectedContainerColor = NeshastyarColors.SuccessContainer,
                                            selectedLabelColor = NeshastyarColors.Success,
                                        ),
                                        border = FilterChipDefaults.filterChipBorder(
                                            enabled = true,
                                            selected = linked,
                                            selectedBorderColor = NeshastyarColors.Success,
                                            selectedBorderWidth = 1.dp,
                                        ),
                                    )
                                }
                            }
                        }
                    }
                    SectionMessage(message = state.message, error = state.error)
                    Spacer(Modifier.height(16.dp))
                }
            }
        }
    }
}

@Composable
fun MeetingBulletPointsScreen(
    onBack: () -> Unit,
    viewModel: MeetingDetailViewModel = hiltViewModel(),
) {
    val state by viewModel.ui.collectAsStateWithLifecycle()
    MeetingSectionScaffold(
        title = "نکات",
        onBack = onBack,
        loading = state.loading && state.meeting == null,
        error = if (state.meeting == null) state.error else null,
        onRetry = viewModel::retry,
    ) {
        NeshastyarCard {
            SectionHeader(
                title = "نکات / نقاط تصمیم‌گیری",
                icon = Icons.Default.CheckCircle,
            )
            Spacer(Modifier.height(8.dp))
            if (state.summary.bulletPoints.isEmpty()) {
                Text("نکته‌ای ثبت نشده", color = NeshastyarColors.TextMuted)
            } else {
                state.summary.bulletPoints.forEach { point ->
                    Text(
                        "• $point",
                        color = NeshastyarColors.TextPrimary,
                        modifier = Modifier.padding(vertical = 3.dp),
                    )
                }
            }
        }
    }
}

@Composable
private fun MeetingSectionScaffold(
    title: String,
    onBack: () -> Unit,
    loading: Boolean,
    error: String?,
    onRetry: () -> Unit,
    content: @Composable () -> Unit,
) {
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
                title,
                fontWeight = FontWeight.Bold,
                color = NeshastyarColors.TextPrimary,
                fontSize = 18.sp,
            )
        }
        when {
            loading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = NeshastyarColors.Primary)
            }
            error != null -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(error, color = NeshastyarColors.Error)
                    TextButton(onClick = onRetry) {
                        Text("تلاش مجدد", color = NeshastyarColors.PrimaryBright)
                    }
                }
            }
            else -> LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(16.dp),
            ) {
                item { content() }
            }
        }
    }
}

private fun tagDisplayName(tag: TagDto): String = tag.name?.trim().orEmpty().ifBlank { tag.id }

/** Names from the meeting summary that are not already linked to this meeting. */
private fun suggestedTagNames(state: MeetingDetailUiState): List<String> {
    val linked = state.tags.map { tagDisplayName(it) }
    return state.summary.tags
        .map { it.trim() }
        .filter { it.isNotEmpty() }
        .distinctBy { it.lowercase() }
        .filter { name -> linked.none { it.equals(name, ignoreCase = true) } }
}

private fun participantDisplayName(person: ParticipantDto): String {
    return MeetingSummaryParser.normalizePersonName(person.name).ifBlank { person.name ?: person.id }
}

/** Names from the meeting summary that are not already linked to this meeting. */
private fun suggestedParticipantNames(state: MeetingDetailUiState): List<String> {
    val linked = state.participants.map { participantDisplayName(it) }
    return state.summary.people
        .map { MeetingSummaryParser.normalizePersonName(it) }
        .filter { it.isNotEmpty() }
        .distinctBy { it.lowercase() }
        .filter { name -> linked.none { it.equals(name, ignoreCase = true) } }
}

@Composable
private fun SectionMessage(message: String?, error: String?) {
    if (message != null) {
        Text(message, color = NeshastyarColors.PrimaryBright, modifier = Modifier.padding(top = 8.dp))
    }
    if (error != null) {
        Text(error, color = NeshastyarColors.Error, modifier = Modifier.padding(top = 8.dp))
    }
}
