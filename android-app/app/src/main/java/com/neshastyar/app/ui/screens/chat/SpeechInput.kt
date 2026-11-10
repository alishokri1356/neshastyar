package com.neshastyar.app.ui.screens.chat

import android.Manifest
import android.content.pm.PackageManager
import android.os.SystemClock
import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import com.neshastyar.app.data.repository.DictationEntryPoint
import com.neshastyar.app.recording.DictationRecorder
import com.neshastyar.app.ui.theme.NeshastyarColors
import dagger.hilt.android.EntryPointAccessors
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import java.io.File
import kotlin.math.sqrt

private const val LEVEL_BAR_COUNT = 5
private val LevelGreen = Color(0xFF6CC24A)
private val PillShape = RoundedCornerShape(28.dp)

private sealed interface DictationPhase {
    data object Hidden : DictationPhase
    data object Recording : DictationPhase
    data object Transcribing : DictationPhase
    data class Failed(val message: String) : DictationPhase
}

/**
 * Records a short clip in-app and sends it to the backend (Gemini 3.5 Transcribe via n8n).
 * [onFinished] runs once the microphone is released, before transcription completes.
 */
@Composable
fun rememberSpeechInputLauncher(
    prompt: String = "سؤال خود را بگویید",
    onFinished: () -> Unit = {},
    onResult: (String) -> Unit,
): () -> Unit {
    val context = LocalContext.current
    val appContext = context.applicationContext
    val scope = rememberCoroutineScope()
    val currentOnFinished by rememberUpdatedState(onFinished)
    val currentOnResult by rememberUpdatedState(onResult)
    val recorder = remember { DictationRecorder(appContext) }
    val repository = remember {
        EntryPointAccessors.fromApplication(appContext, DictationEntryPoint::class.java).dictationRepository()
    }

    var phase by remember { mutableStateOf<DictationPhase>(DictationPhase.Hidden) }
    var paused by remember { mutableStateOf(false) }
    var clip by remember { mutableStateOf<File?>(null) }
    var job by remember { mutableStateOf<Job?>(null) }
    var segmentStartedAt by remember { mutableLongStateOf(0L) }
    var accumulatedMs by remember { mutableLongStateOf(0L) }
    var elapsedMs by remember { mutableLongStateOf(0L) }
    var levels by remember { mutableStateOf(List(LEVEL_BAR_COUNT) { 0f }) }

    fun toast(message: String) {
        Toast.makeText(context, message, Toast.LENGTH_SHORT).show()
    }

    fun close() {
        job?.cancel()
        job = null
        clip?.delete()
        clip = null
        phase = DictationPhase.Hidden
    }

    fun transcribe(file: File) {
        phase = DictationPhase.Transcribing
        job = scope.launch {
            repository.transcribe(file)
                .onSuccess { text ->
                    job = null
                    close()
                    if (text.isBlank()) toast("صحبتی تشخیص داده نشد") else currentOnResult(text)
                }
                .onFailure { error ->
                    if (error is CancellationException) return@onFailure
                    phase = DictationPhase.Failed(error.message ?: "تبدیل گفتار به متن ناموفق بود")
                }
        }
    }

    fun stopAndTranscribe() {
        if (!recorder.isRecording) return
        val file = recorder.stop()
        currentOnFinished()
        if (file == null) {
            phase = DictationPhase.Hidden
            toast("صدایی ضبط نشد")
            return
        }
        clip = file
        transcribe(file)
    }

    fun cancelRecording() {
        recorder.cancel()
        currentOnFinished()
        phase = DictationPhase.Hidden
    }

    fun togglePause() {
        val now = SystemClock.elapsedRealtime()
        if (paused) {
            if (recorder.resume()) {
                segmentStartedAt = now
                paused = false
            }
        } else if (recorder.pause()) {
            accumulatedMs += now - segmentStartedAt
            paused = true
        }
    }

    fun beginRecording() {
        try {
            recorder.start()
        } catch (_: Exception) {
            toast("شروع ضبط ناموفق بود")
            currentOnFinished()
            return
        }
        segmentStartedAt = SystemClock.elapsedRealtime()
        accumulatedMs = 0L
        elapsedMs = 0L
        paused = false
        levels = List(LEVEL_BAR_COUNT) { 0f }
        phase = DictationPhase.Recording
    }

    val permissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission(),
    ) { granted ->
        if (granted) {
            beginRecording()
        } else {
            toast("برای ورودی صوتی باید دسترسی میکروفون را بدهید")
            currentOnFinished()
        }
    }

    LaunchedEffect(phase, paused) {
        while (phase == DictationPhase.Recording) {
            val running = if (paused) 0L else SystemClock.elapsedRealtime() - segmentStartedAt
            elapsedMs = accumulatedMs + running
            if (elapsedMs >= DictationRecorder.MAX_DURATION_MS) {
                stopAndTranscribe()
                break
            }
            if (!paused) {
                val level = sqrt(recorder.amplitude() / 32767f).coerceIn(0f, 1f)
                levels = levels.drop(1) + level
            }
            delay(100)
        }
    }

    DisposableEffect(Unit) {
        onDispose {
            job?.cancel()
            if (recorder.isRecording) {
                recorder.cancel()
                currentOnFinished()
            }
            clip?.delete()
        }
    }

    val current = phase
    if (current != DictationPhase.Hidden) {
        DictationSheet(
            title = prompt,
            phase = current,
            paused = paused,
            elapsedMs = elapsedMs,
            levels = levels,
            onTogglePause = ::togglePause,
            onStop = ::stopAndTranscribe,
            onRetry = { clip?.let(::transcribe) },
            onCancel = {
                if (current == DictationPhase.Recording) cancelRecording() else close()
            },
        )
    }

    return remember(permissionLauncher) {
        {
            if (phase == DictationPhase.Hidden) {
                val granted = ContextCompat.checkSelfPermission(
                    context,
                    Manifest.permission.RECORD_AUDIO,
                ) == PackageManager.PERMISSION_GRANTED
                if (granted) beginRecording() else permissionLauncher.launch(Manifest.permission.RECORD_AUDIO)
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun DictationSheet(
    title: String,
    phase: DictationPhase,
    paused: Boolean,
    elapsedMs: Long,
    levels: List<Float>,
    onTogglePause: () -> Unit,
    onStop: () -> Unit,
    onRetry: () -> Unit,
    onCancel: () -> Unit,
) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    ModalBottomSheet(
        onDismissRequest = onCancel,
        sheetState = sheetState,
        containerColor = NeshastyarColors.Background,
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 24.dp)
                .padding(bottom = 20.dp),
        ) {
            Text(
                text = title,
                fontFamily = FontFamily.Serif,
                fontSize = 28.sp,
                lineHeight = 38.sp,
                color = NeshastyarColors.TextMuted,
            )
            Spacer(Modifier.height(14.dp))
            Text(
                text = when (phase) {
                    DictationPhase.Recording -> if (paused) {
                        "ضبط متوقف شده است"
                    } else {
                        "صحبت کنید؛ پس از «پایان» متن در کادر قرار می‌گیرد"
                    }
                    DictationPhase.Transcribing -> "در حال تبدیل گفتار به متن…"
                    is DictationPhase.Failed -> phase.message
                    DictationPhase.Hidden -> ""
                },
                fontSize = 16.sp,
                lineHeight = 24.sp,
                color = if (phase is DictationPhase.Failed) NeshastyarColors.Error else NeshastyarColors.TextMuted,
            )
            Spacer(Modifier.height(96.dp))
            when (phase) {
                DictationPhase.Recording -> RecordingControls(
                    paused = paused,
                    elapsedMs = elapsedMs,
                    levels = levels,
                    onTogglePause = onTogglePause,
                    onStop = onStop,
                )
                DictationPhase.Transcribing -> Row(verticalAlignment = Alignment.CenterVertically) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(22.dp),
                        strokeWidth = 2.dp,
                        color = NeshastyarColors.Primary,
                    )
                    Spacer(Modifier.weight(1f))
                    Pill(onClick = onCancel, filled = false) {
                        Text("انصراف", fontSize = 17.sp, color = NeshastyarColors.TextPrimary)
                    }
                }
                is DictationPhase.Failed -> Row(verticalAlignment = Alignment.CenterVertically) {
                    Pill(onClick = onCancel, filled = false) {
                        Text("انصراف", fontSize = 17.sp, color = NeshastyarColors.TextPrimary)
                    }
                    Spacer(Modifier.weight(1f))
                    Pill(onClick = onRetry, filled = true) {
                        Text("تلاش مجدد", fontSize = 17.sp, fontWeight = FontWeight.SemiBold, color = Color.White)
                    }
                }
                DictationPhase.Hidden -> Unit
            }
        }
    }
}

@Composable
private fun RecordingControls(
    paused: Boolean,
    elapsedMs: Long,
    levels: List<Float>,
    onTogglePause: () -> Unit,
    onStop: () -> Unit,
) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Pill(onClick = onTogglePause, filled = false) {
            Icon(
                if (paused) Icons.Default.PlayArrow else Icons.Default.Pause,
                contentDescription = if (paused) "ادامه ضبط" else "توقف موقت",
                tint = NeshastyarColors.TextPrimary,
            )
        }
        Spacer(Modifier.weight(1f))
        Text(
            text = formatClock(elapsedMs),
            fontSize = 20.sp,
            fontWeight = FontWeight.SemiBold,
            color = NeshastyarColors.TextPrimary,
        )
        Spacer(Modifier.width(10.dp))
        LevelBars(levels = levels, active = !paused)
        Spacer(Modifier.weight(1f))
        Pill(onClick = onStop, filled = true) {
            Text("پایان", fontSize = 18.sp, fontWeight = FontWeight.SemiBold, color = Color.White)
        }
    }
}

@Composable
private fun Pill(
    onClick: () -> Unit,
    filled: Boolean,
    content: @Composable RowScope.() -> Unit,
) {
    Row(
        modifier = Modifier
            .height(56.dp)
            .widthIn(min = 110.dp)
            .clip(PillShape)
            .then(
                if (filled) {
                    Modifier.background(NeshastyarColors.TextPrimary)
                } else {
                    Modifier
                        .background(NeshastyarColors.Background)
                        .border(1.dp, NeshastyarColors.Outline, PillShape)
                },
            )
            .clickable(onClick = onClick)
            .padding(horizontal = 24.dp),
        horizontalArrangement = Arrangement.Center,
        verticalAlignment = Alignment.CenterVertically,
        content = content,
    )
}

@Composable
private fun LevelBars(levels: List<Float>, active: Boolean) {
    Row(
        modifier = Modifier.height(24.dp),
        horizontalArrangement = Arrangement.spacedBy(3.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        levels.forEach { level ->
            val fraction by animateFloatAsState(
                targetValue = if (active) 0.3f + 0.7f * level else 0.3f,
                animationSpec = tween(120),
                label = "dictation-level",
            )
            Box(
                modifier = Modifier
                    .width(3.dp)
                    .fillMaxHeight(fraction)
                    .clip(RoundedCornerShape(2.dp))
                    .background(if (active) LevelGreen else NeshastyarColors.Outline),
            )
        }
    }
}

private fun formatClock(ms: Long): String {
    val total = (ms / 1000L).toInt().coerceAtLeast(0)
    return "%02d:%02d".format(total / 60, total % 60)
}
