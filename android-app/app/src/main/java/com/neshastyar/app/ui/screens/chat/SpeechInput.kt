package com.neshastyar.app.ui.screens.chat

import android.Manifest
import android.content.pm.PackageManager
import android.os.SystemClock
import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
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
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.DialogProperties
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
    var clip by remember { mutableStateOf<File?>(null) }
    var job by remember { mutableStateOf<Job?>(null) }
    var startedAt by remember { mutableLongStateOf(0L) }
    var elapsedMs by remember { mutableLongStateOf(0L) }

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

    fun beginRecording() {
        try {
            recorder.start(onMaxDurationReached = { scope.launch { stopAndTranscribe() } })
        } catch (_: Exception) {
            toast("شروع ضبط ناموفق بود")
            currentOnFinished()
            return
        }
        startedAt = SystemClock.elapsedRealtime()
        elapsedMs = 0L
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

    LaunchedEffect(phase) {
        while (phase == DictationPhase.Recording) {
            elapsedMs = SystemClock.elapsedRealtime() - startedAt
            delay(250)
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
        DictationDialog(
            title = prompt,
            phase = current,
            elapsedMs = elapsedMs,
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

@Composable
private fun DictationDialog(
    title: String,
    phase: DictationPhase,
    elapsedMs: Long,
    onStop: () -> Unit,
    onRetry: () -> Unit,
    onCancel: () -> Unit,
) {
    AlertDialog(
        onDismissRequest = onCancel,
        properties = DialogProperties(dismissOnClickOutside = false),
        title = { Text(title, fontWeight = FontWeight.SemiBold) },
        text = {
            when (phase) {
                DictationPhase.Recording -> RecordingContent(elapsedMs)
                DictationPhase.Transcribing -> Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(22.dp),
                        strokeWidth = 2.dp,
                        color = NeshastyarColors.Primary,
                    )
                    Text("در حال تبدیل گفتار به متن…", color = NeshastyarColors.TextSecondary)
                }
                is DictationPhase.Failed -> Text(phase.message, color = NeshastyarColors.Error)
                DictationPhase.Hidden -> Unit
            }
        },
        confirmButton = {
            when (phase) {
                DictationPhase.Recording -> Button(
                    onClick = onStop,
                    colors = ButtonDefaults.buttonColors(containerColor = NeshastyarColors.Primary),
                ) { Text("پایان") }
                is DictationPhase.Failed -> Button(
                    onClick = onRetry,
                    colors = ButtonDefaults.buttonColors(containerColor = NeshastyarColors.Primary),
                ) { Text("تلاش مجدد") }
                else -> TextButton(onClick = onCancel) { Text("انصراف") }
            }
        },
        dismissButton = {
            if (phase != DictationPhase.Transcribing) {
                TextButton(onClick = onCancel) { Text("انصراف") }
            }
        },
    )
}

@Composable
private fun RecordingContent(elapsedMs: Long) {
    val pulse = rememberInfiniteTransition(label = "dictation-pulse")
    val dotAlpha by pulse.animateFloat(
        initialValue = 1f,
        targetValue = 0.25f,
        animationSpec = infiniteRepeatable(tween(700), RepeatMode.Reverse),
        label = "dictation-dot",
    )
    Column(
        modifier = Modifier.fillMaxWidth(),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Box(
                modifier = Modifier
                    .size(10.dp)
                    .alpha(dotAlpha)
                    .clip(CircleShape)
                    .background(NeshastyarColors.Error),
            )
            Text("در حال ضبط…", color = NeshastyarColors.TextSecondary)
        }
        Text(
            text = "${formatClock(elapsedMs)} / ${formatClock(DictationRecorder.MAX_DURATION_MS.toLong())}",
            fontSize = 26.sp,
            fontWeight = FontWeight.Bold,
            color = NeshastyarColors.TextPrimary,
        )
        Text(
            "پس از اتمام صحبت «پایان» را بزنید",
            fontSize = 12.sp,
            color = NeshastyarColors.TextMuted,
        )
    }
}

private fun formatClock(ms: Long): String {
    val total = (ms / 1000L).toInt().coerceAtLeast(0)
    return "%d:%02d".format(total / 60, total % 60)
}
