package com.neshastyar.app.ui.screens.record

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.EditNote
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Stop
import androidx.compose.material.icons.filled.UploadFile
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilledIconButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.IconButtonDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.neshastyar.app.data.local.DraftAudioFileEntity
import com.neshastyar.app.recording.RecorderPhase
import com.neshastyar.app.ui.components.NeshastyarCard
import com.neshastyar.app.ui.components.NeshastyarPrimaryButton
import com.neshastyar.app.ui.components.NeshastyarSecondaryButton
import com.neshastyar.app.ui.components.NeshastyarTextField
import com.neshastyar.app.ui.theme.NeshastyarColors

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RecordScreen(
    onBack: () -> Unit,
    onContinue: (draftId: String) -> Unit,
    viewModel: RecordViewModel = hiltViewModel(),
) {
    val ui by viewModel.ui.collectAsStateWithLifecycle()
    val live by viewModel.liveRecording.collectAsStateWithLifecycle()
    val files by viewModel.files.collectAsStateWithLifecycle()
    val context = LocalContext.current
    var permissionError by remember { mutableStateOf<String?>(null) }

    val importLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.OpenMultipleDocuments(),
    ) { uris ->
        if (uris.isNotEmpty()) viewModel.importUris(uris)
    }

    val permissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions(),
    ) { result ->
        val micOk = result[Manifest.permission.RECORD_AUDIO] == true
        val notifOk = if (Build.VERSION.SDK_INT >= 33) {
            result[Manifest.permission.POST_NOTIFICATIONS] == true
        } else true
        if (micOk && notifOk) {
            permissionError = null
            viewModel.startRecording()
        } else {
            permissionError = "برای ضبط باید دسترسی میکروفون (و اعلان) را بدهید"
        }
    }

    fun ensurePermissionsAndStart() {
        val need = mutableListOf(Manifest.permission.RECORD_AUDIO)
        if (Build.VERSION.SDK_INT >= 33) need += Manifest.permission.POST_NOTIFICATIONS
        val missing = need.filter {
            ContextCompat.checkSelfPermission(context, it) != PackageManager.PERMISSION_GRANTED
        }
        if (missing.isEmpty()) {
            viewModel.startRecording()
        } else {
            permissionLauncher.launch(missing.toTypedArray())
        }
    }

    Scaffold(containerColor = NeshastyarColors.Background) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(horizontal = 16.dp),
            contentPadding = PaddingValues(bottom = 24.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            item {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "بازگشت", tint = NeshastyarColors.TextPrimary)
                    }
                    Spacer(Modifier.weight(1f))
                    Text("نشست یار", fontWeight = FontWeight.Bold, color = NeshastyarColors.TextPrimary)
                }
            }

            item {
                Column(modifier = Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(
                        text = when (live.phase) {
                            RecorderPhase.Recording -> "در حال ضبط جلسه"
                            RecorderPhase.Paused -> "ضبط متوقف موقت"
                            RecorderPhase.Idle -> "آماده ضبط جلسه"
                        },
                        color = NeshastyarColors.TextMuted,
                    )
                    Text(
                        text = formatMs(live.elapsedMs),
                        fontSize = 42.sp,
                        fontWeight = FontWeight.Bold,
                        color = NeshastyarColors.TextPrimary,
                        modifier = Modifier.padding(top = 8.dp),
                    )
                }
            }

            item {
                WaveformPlaceholder(
                    active = live.phase == RecorderPhase.Recording,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(48.dp),
                )
            }

            item {
                Box(modifier = Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
                    when (live.phase) {
                        RecorderPhase.Idle -> {
                            FilledIconButton(
                                onClick = { ensurePermissionsAndStart() },
                                modifier = Modifier
                                    .size(88.dp)
                                    .shadow(20.dp, CircleShape, ambientColor = NeshastyarColors.Primary, spotColor = NeshastyarColors.Primary),
                                shape = CircleShape,
                                colors = IconButtonDefaults.filledIconButtonColors(
                                    containerColor = NeshastyarColors.PrimaryBright,
                                    contentColor = NeshastyarColors.Background,
                                ),
                            ) {
                                Icon(Icons.Default.Mic, contentDescription = "شروع", modifier = Modifier.size(36.dp))
                            }
                        }
                        RecorderPhase.Recording, RecorderPhase.Paused -> {
                            Row(
                                horizontalArrangement = Arrangement.spacedBy(20.dp),
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                FilledIconButton(
                                    onClick = if (live.phase == RecorderPhase.Recording) {
                                        viewModel::pauseRecording
                                    } else {
                                        viewModel::resumeRecording
                                    },
                                    modifier = Modifier.size(56.dp),
                                    shape = CircleShape,
                                    colors = IconButtonDefaults.filledIconButtonColors(
                                        containerColor = NeshastyarColors.SurfaceElevated,
                                        contentColor = NeshastyarColors.PrimaryBright,
                                    ),
                                ) {
                                    Icon(
                                        if (live.phase == RecorderPhase.Recording) Icons.Default.Pause else Icons.Default.PlayArrow,
                                        contentDescription = null,
                                    )
                                }
                                FilledIconButton(
                                    onClick = viewModel::stopRecording,
                                    modifier = Modifier
                                        .size(88.dp)
                                        .shadow(20.dp, CircleShape, ambientColor = NeshastyarColors.Primary, spotColor = NeshastyarColors.Primary),
                                    shape = CircleShape,
                                    colors = IconButtonDefaults.filledIconButtonColors(
                                        containerColor = NeshastyarColors.PrimaryBright,
                                        contentColor = NeshastyarColors.Background,
                                    ),
                                ) {
                                    Icon(Icons.Default.Stop, contentDescription = "پایان", modifier = Modifier.size(36.dp))
                                }
                            }
                        }
                    }
                }
            }

            val banner = permissionError ?: ui.error ?: ui.message
            if (banner != null) {
                item {
                    Text(
                        text = banner,
                        color = if (ui.error != null || permissionError != null) NeshastyarColors.Error else NeshastyarColors.PrimaryBright,
                    )
                }
            }

            item {
                NeshastyarCard {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.EditNote, null, tint = NeshastyarColors.PrimaryBright)
                        Text(
                            "یادداشت‌های سریع",
                            fontWeight = FontWeight.SemiBold,
                            color = NeshastyarColors.TextPrimary,
                            modifier = Modifier.padding(start = 8.dp),
                        )
                    }
                    Spacer(Modifier.height(10.dp))
                    NeshastyarTextField(
                        value = ui.comment,
                        onValueChange = viewModel::onComment,
                        label = "یادداشت",
                        placeholder = "نکته مهمی در این لحظه رخ داد؟ اینجا بنویسید…",
                        singleLine = false,
                        minLines = 3,
                    )
                }
            }

            item {
                NeshastyarSecondaryButton(
                    text = "افزودن فایل صوتی",
                    onClick = { importLauncher.launch(arrayOf("audio/*", "*/*")) },
                    enabled = live.phase == RecorderPhase.Idle,
                )
            }

            if (files.isNotEmpty()) {
                item {
                    Text(
                        "فایل‌ها (${files.size})",
                        fontWeight = FontWeight.SemiBold,
                        color = NeshastyarColors.TextSecondary,
                        modifier = Modifier.padding(top = 4.dp),
                    )
                }
                items(files, key = { it.id }) { file ->
                    FileRow(file = file, onDelete = { viewModel.deleteFile(file) })
                }
            }

            item {
                NeshastyarPrimaryButton(
                    text = "ادامه و انتخاب برچسب‌ها",
                    onClick = {
                        val id = ui.draftId ?: return@NeshastyarPrimaryButton
                        onContinue(id)
                    },
                    enabled = viewModel.canContinue(files),
                    icon = Icons.AutoMirrored.Filled.ArrowForward,
                )
            }

            if (live.phase != RecorderPhase.Idle) {
                item {
                    NeshastyarSecondaryButton(
                        text = "لغو ضبط جلسه",
                        onClick = viewModel::stopRecording,
                    )
                }
            }
        }
    }
}

@Composable
private fun WaveformPlaceholder(active: Boolean, modifier: Modifier = Modifier) {
    val heights = listOf(12, 28, 18, 36, 22, 40, 16, 32, 24, 38, 14, 30, 20, 34, 18, 26, 12, 28, 22, 36)
    Row(
        modifier = modifier,
        horizontalArrangement = Arrangement.SpaceEvenly,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        heights.forEach { h ->
            Box(
                modifier = Modifier
                    .width(4.dp)
                    .height(if (active) h.dp else (h / 2).dp)
                    .background(
                        if (active) NeshastyarColors.PrimaryBright.copy(alpha = 0.85f)
                        else NeshastyarColors.Outline,
                        RoundedCornerShape(2.dp),
                    ),
            )
        }
    }
}

@Composable
private fun FileRow(
    file: DraftAudioFileEntity,
    onDelete: () -> Unit,
) {
    NeshastyarCard(contentPadding = PaddingValues(12.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Column(modifier = Modifier.weight(1f)) {
                Text(file.displayName, fontWeight = FontWeight.Medium, color = NeshastyarColors.TextPrimary, maxLines = 1)
                val source = if (file.source == "recording") "ضبط" else "وارد شده"
                val dur = if (file.durationSec > 0) " · ${file.durationSec} ثانیه" else ""
                Text(
                    text = source + dur,
                    color = NeshastyarColors.TextMuted,
                    fontSize = 12.sp,
                )
            }
            IconButton(onClick = onDelete) {
                Icon(Icons.Default.Delete, contentDescription = "حذف", tint = NeshastyarColors.Error)
            }
        }
    }
}

private fun formatMs(ms: Long): String {
    val total = (ms / 1000L).toInt().coerceAtLeast(0)
    val h = total / 3600
    val m = (total % 3600) / 60
    val s = total % 60
    return "%02d:%02d:%02d".format(h, m, s)
}
