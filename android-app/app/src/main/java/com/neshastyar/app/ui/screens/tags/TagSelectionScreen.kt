package com.neshastyar.app.ui.screens.tags

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
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
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
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
import com.neshastyar.app.ui.components.NeshastyarTextField
import com.neshastyar.app.ui.theme.NeshastyarColors

private sealed class CatalogRow {
    abstract val key: String
    abstract val name: String
    data class Tag(val id: String, override val name: String) : CatalogRow() {
        override val key: String = "tag:$id"
    }
    data class Person(val id: String, override val name: String) : CatalogRow() {
        override val key: String = "person:$id"
    }
}

@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun TagSelectionScreen(
    onBack: () -> Unit,
    onUploaded: () -> Unit,
    viewModel: TagSelectionViewModel = hiltViewModel(),
) {
    val state by viewModel.ui.collectAsStateWithLifecycle()
    LaunchedEffect(state.done) { if (state.done) onUploaded() }

    val query = normalizeCatalogQuery(state.newTagName)
    val rows = buildList {
        state.tags.forEach { tag ->
            add(CatalogRow.Tag(tag.id, tag.name?.takeIf { it.isNotBlank() } ?: tag.id))
        }
        state.participants.forEach { person ->
            add(CatalogRow.Person(person.id, person.name?.takeIf { it.isNotBlank() } ?: person.id))
        }
    }.filter { row ->
        query.isEmpty() || normalizeCatalogQuery(row.name).contains(query)
    }.sortedBy { normalizeCatalogQuery(it.name) }

    val selectedTags = state.tags.filter { it.id in state.selected }
    val selectedPeople = state.participants.filter { it.id in state.selectedParticipants }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            IconButton(onClick = onBack) {
                Icon(Icons.AutoMirrored.Filled.ArrowBack, null, tint = NeshastyarColors.TextPrimary)
            }
            Text(
                "برچسب‌گذاری و ارسال به هوش مصنوعی",
                fontWeight = FontWeight.Bold,
                color = NeshastyarColors.TextPrimary,
                modifier = Modifier.weight(1f),
            )
        }

        Spacer(Modifier.height(12.dp))
        NeshastyarCard {
            Text("جستجو", color = NeshastyarColors.TextMuted)
            Spacer(Modifier.height(8.dp))
            NeshastyarTextField(
                value = state.newTagName,
                onValueChange = viewModel::onNewTagName,
                label = "برچسب یا شرکت‌کننده",
                placeholder = "نام را وارد کنید",
                enabled = !state.uploading,
            )
            Spacer(Modifier.height(8.dp))
            NeshastyarPrimaryButton(
                text = "افزودن",
                onClick = viewModel::addFromQuery,
                enabled = !state.uploading,
            )
        }

        if (selectedTags.isNotEmpty() || selectedPeople.isNotEmpty()) {
            Spacer(Modifier.height(12.dp))
            NeshastyarCard {
                if (selectedTags.isNotEmpty()) {
                    Text("برچسب‌ها", color = NeshastyarColors.TextSecondary, fontWeight = FontWeight.SemiBold)
                    Spacer(Modifier.height(8.dp))
                    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        selectedTags.forEach { tag ->
                            SelectedNameChip(
                                name = tag.name?.takeIf { it.isNotBlank() } ?: tag.id,
                                onRemove = { viewModel.removeTag(tag.id) },
                                enabled = !state.uploading,
                            )
                        }
                    }
                }
                if (selectedPeople.isNotEmpty()) {
                    if (selectedTags.isNotEmpty()) Spacer(Modifier.height(12.dp))
                    Text("شرکت‌کنندگان", color = NeshastyarColors.TextSecondary, fontWeight = FontWeight.SemiBold)
                    Spacer(Modifier.height(8.dp))
                    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        selectedPeople.forEach { person ->
                            SelectedNameChip(
                                name = person.name?.takeIf { it.isNotBlank() } ?: person.id,
                                onRemove = { viewModel.removeParticipant(person.id) },
                                enabled = !state.uploading,
                            )
                        }
                    }
                }
            }
        }

        Spacer(Modifier.height(12.dp))
        if (state.loading) {
            Box(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth(),
                contentAlignment = Alignment.Center,
            ) {
                CircularProgressIndicator(color = NeshastyarColors.Primary)
            }
        } else if (rows.isEmpty()) {
            Text(
                text = if (query.isEmpty()) "برچسب یا شرکت‌کننده‌ای وجود ندارد" else "موردی با این نام پیدا نشد",
                color = NeshastyarColors.TextMuted,
                modifier = Modifier
                    .weight(1f)
                    .padding(top = 8.dp),
            )
        } else {
            LazyColumn(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(6.dp),
                userScrollEnabled = !state.uploading,
            ) {
                items(rows, key = { it.key }) { row ->
                    val selected = when (row) {
                        is CatalogRow.Tag -> row.id in state.selected
                        is CatalogRow.Person -> row.id in state.selectedParticipants
                    }
                    NeshastyarCard(
                        modifier = Modifier.clickable(enabled = !state.uploading && !selected) {
                            when (row) {
                                is CatalogRow.Tag -> viewModel.selectTag(row.id)
                                is CatalogRow.Person -> viewModel.selectParticipant(row.id)
                            }
                        },
                        accentBar = selected,
                        contentPadding = PaddingValues(horizontal = 14.dp, vertical = 12.dp),
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Text(
                                row.name,
                                color = NeshastyarColors.TextPrimary,
                                modifier = Modifier.weight(1f),
                            )
                            Text(
                                when (row) {
                                    is CatalogRow.Tag -> "برچسب"
                                    is CatalogRow.Person -> "شرکت‌کننده"
                                },
                                color = NeshastyarColors.TextMuted,
                                fontSize = 12.sp,
                            )
                        }
                    }
                }
            }
        }

        if (state.error != null) {
            Text(state.error!!, color = NeshastyarColors.Error, modifier = Modifier.padding(bottom = 8.dp))
        }

        if (state.uploading) {
            Column(modifier = Modifier.fillMaxWidth().padding(bottom = 12.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                ) {
                    Text(
                        uploadStatusLabel(state),
                        color = NeshastyarColors.TextSecondary,
                        modifier = Modifier.weight(1f),
                    )
                    Text("${state.progress}%", color = NeshastyarColors.PrimaryBright, fontWeight = FontWeight.SemiBold)
                }
                Spacer(Modifier.height(8.dp))
                LinearProgressIndicator(
                    progress = { state.progress.coerceIn(0, 100) / 100f },
                    modifier = Modifier.fillMaxWidth().height(8.dp),
                    color = NeshastyarColors.Primary,
                    trackColor = NeshastyarColors.SurfaceVariant,
                )
            }
        }

        NeshastyarPrimaryButton(
            text = if (state.uploading) "در حال آپلود…" else "تأیید و شروع تحلیل هوشمند",
            onClick = viewModel::upload,
            enabled = !state.uploading,
            loading = state.uploading,
            modifier = Modifier.padding(bottom = 8.dp),
        )
    }
}

private fun uploadStatusLabel(state: TagSelectionUiState): String {
    val counter = if (state.fileCount > 0 && state.fileIndex > 0) {
        "فایل ${state.fileIndex} از ${state.fileCount}"
    } else {
        ""
    }
    val detail = state.progressMessage.ifBlank { "در حال آپلود فایل…" }
    return if (counter.isBlank() || detail.contains(counter)) detail else "$counter — $detail"
}

@Composable
private fun SelectedNameChip(
    name: String,
    onRemove: () -> Unit,
    enabled: Boolean,
) {
    Row(
        modifier = Modifier
            .clip(RoundedCornerShape(20.dp))
            .background(NeshastyarColors.PrimaryContainer)
            .padding(start = 12.dp, end = 2.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(name, color = NeshastyarColors.Primary, fontSize = 13.sp)
        IconButton(
            onClick = onRemove,
            enabled = enabled,
            modifier = Modifier.size(32.dp),
        ) {
            Icon(
                Icons.Default.Close,
                contentDescription = "حذف",
                tint = NeshastyarColors.Primary,
                modifier = Modifier.size(16.dp),
            )
        }
    }
}
