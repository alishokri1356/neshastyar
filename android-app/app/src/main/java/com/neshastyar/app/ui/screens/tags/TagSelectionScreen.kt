package com.neshastyar.app.ui.screens.tags

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CheckboxDefaults
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.neshastyar.app.ui.components.NeshastyarCard
import com.neshastyar.app.ui.components.NeshastyarPrimaryButton
import com.neshastyar.app.ui.components.NeshastyarTextField
import com.neshastyar.app.ui.theme.NeshastyarColors

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TagSelectionScreen(
    onBack: () -> Unit,
    onUploaded: () -> Unit,
    viewModel: TagSelectionViewModel = hiltViewModel(),
) {
    val state by viewModel.ui.collectAsStateWithLifecycle()
    LaunchedEffect(state.done) { if (state.done) onUploaded() }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = onBack) {
                Icon(Icons.AutoMirrored.Filled.ArrowBack, null, tint = NeshastyarColors.TextPrimary)
            }
            Text(
                "انتخاب برچسب",
                fontWeight = FontWeight.Bold,
                color = NeshastyarColors.TextPrimary,
            )
        }

        Spacer(Modifier.height(12.dp))
        NeshastyarCard {
            Text("برچسب جدید", color = NeshastyarColors.TextMuted)
            Spacer(Modifier.height(8.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                NeshastyarTextField(
                    value = state.newTagName,
                    onValueChange = viewModel::onNewTagName,
                    label = "نام برچسب",
                    placeholder = "نام برچسب را وارد کنید",
                    enabled = !state.uploading,
                    modifier = Modifier.weight(1f),
                )
            }
            Spacer(Modifier.height(8.dp))
            NeshastyarPrimaryButton(
                text = "افزودن",
                onClick = viewModel::createTag,
                enabled = !state.uploading,
            )
        }

        Spacer(Modifier.height(12.dp))
        if (state.loading) {
            CircularProgressIndicator(
                color = NeshastyarColors.Primary,
                modifier = Modifier
                    .padding(24.dp)
                    .align(Alignment.CenterHorizontally),
            )
        } else {
            LazyColumn(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(6.dp),
                userScrollEnabled = !state.uploading,
            ) {
                items(state.tags, key = { it.id }) { tag ->
                    NeshastyarCard(
                        modifier = Modifier.clickable(enabled = !state.uploading) { viewModel.toggle(tag.id) },
                        contentPadding = androidx.compose.foundation.layout.PaddingValues(10.dp),
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Checkbox(
                                checked = tag.id in state.selected,
                                onCheckedChange = { if (!state.uploading) viewModel.toggle(tag.id) },
                                enabled = !state.uploading,
                                colors = CheckboxDefaults.colors(
                                    checkedColor = NeshastyarColors.Primary,
                                    uncheckedColor = NeshastyarColors.Outline,
                                ),
                            )
                            Text(tag.name ?: tag.id, color = NeshastyarColors.TextPrimary)
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
                        state.progressMessage.ifBlank { "در حال آپلود فایل…" },
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
            text = if (state.uploading) "در حال آپلود…" else "آپلود جلسه",
            onClick = viewModel::upload,
            enabled = !state.uploading,
            loading = state.uploading,
            modifier = Modifier.padding(bottom = 8.dp),
        )
    }
}
