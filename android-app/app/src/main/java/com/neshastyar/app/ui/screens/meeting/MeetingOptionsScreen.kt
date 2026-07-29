package com.neshastyar.app.ui.screens.meeting

import android.media.MediaPlayer
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Slider
import androidx.compose.material3.SliderDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import java.net.URLEncoder
import javax.inject.Inject
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import com.neshastyar.app.BuildConfig
import com.neshastyar.app.data.api.AudioFileDto
import com.neshastyar.app.data.api.UpdateMeetingRequest
import com.neshastyar.app.data.local.SessionStore
import com.neshastyar.app.data.repository.MeetingsRepository
import com.neshastyar.app.data.repository.MeetingsResult
import com.neshastyar.app.ui.components.NeshastyarCard
import com.neshastyar.app.ui.components.NeshastyarPrimaryButton
import com.neshastyar.app.ui.components.NeshastyarTextField
import com.neshastyar.app.ui.theme.NeshastyarColors

@HiltViewModel
class MeetingOptionsViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val meetingsRepository: MeetingsRepository,
    private val sessionStore: SessionStore,
) : ViewModel() {
    private val meetingId: String = checkNotNull(savedStateHandle["meetingId"])
    private var mediaPlayer: MediaPlayer? = null
    private var positionJob: Job? = null

    data class State(
        val comment: String = "",
        val files: List<AudioFileDto> = emptyList(),
        val message: String? = null,
        val playingFileId: String? = null,
        val playbackPositionMs: Long = 0L,
        val playbackDurationMs: Long = 0L,
        val playbackError: String? = null,
    )

    private val _ui = MutableStateFlow(State())
    val ui = _ui.asStateFlow()

    init {
        viewModelScope.launch {
            val meeting = when (val r = meetingsRepository.getById(meetingId)) {
                is MeetingsResult.Ok -> r.data
                else -> null
            }
            val files = meetingsRepository.getAudioFiles(meetingId)
            _ui.update { it.copy(comment = meeting?.commentText.orEmpty(), files = files) }
        }
    }

    fun onComment(v: String) = _ui.update { it.copy(comment = v) }

    fun save() = viewModelScope.launch {
        meetingsRepository.update(meetingId, UpdateMeetingRequest(commentText = _ui.value.comment)).fold(
            onSuccess = { _ui.update { it.copy(message = "ذخیره شد") } },
            onFailure = { e -> _ui.update { it.copy(message = e.message) } },
        )
    }

    fun seekTo(positionMs: Long) {
        val player = mediaPlayer ?: return
        val duration = _ui.value.playbackDurationMs.coerceAtLeast(1L)
        val clamped = positionMs.coerceIn(0L, duration)
        player.seekTo(clamped.toInt())
        _ui.update { it.copy(playbackPositionMs = clamped) }
    }

    fun togglePlay(file: AudioFileDto) {
        val fileId = file.id ?: run {
            _ui.update { it.copy(playbackError = "شناسه فایل صوتی موجود نیست") }
            return
        }
        if (_ui.value.playingFileId == fileId) {
            stopPlayback()
            return
        }
        stopPlayback()
        val url = audioPlayUrl(file) ?: run {
            _ui.update { it.copy(playbackError = "آدرس پخش فایل در دسترس نیست") }
            return
        }
        try {
            mediaPlayer = MediaPlayer().apply {
                setDataSource(url)
                setOnPreparedListener { player ->
                    player.start()
                    _ui.update {
                        it.copy(
                            playingFileId = fileId,
                            playbackError = null,
                            playbackPositionMs = 0L,
                            playbackDurationMs = player.duration.toLong().coerceAtLeast(0L),
                        )
                    }
                    startPositionUpdates()
                }
                setOnCompletionListener {
                    stopPositionUpdates()
                    releasePlayer()
                    _ui.update { it.copy(playingFileId = null, playbackPositionMs = 0L, playbackDurationMs = 0L) }
                }
                setOnErrorListener { _, _, _ ->
                    stopPositionUpdates()
                    releasePlayer()
                    _ui.update {
                        it.copy(
                            playingFileId = null,
                            playbackPositionMs = 0L,
                            playbackDurationMs = 0L,
                            playbackError = "پخش فایل ناموفق بود",
                        )
                    }
                    true
                }
                prepareAsync()
            }
        } catch (e: Exception) {
            releasePlayer()
            _ui.update { it.copy(playbackError = e.message ?: "پخش فایل ناموفق بود") }
        }
    }

    override fun onCleared() {
        stopPlayback()
        super.onCleared()
    }

    private fun stopPlayback() {
        stopPositionUpdates()
        releasePlayer()
        _ui.update { it.copy(playingFileId = null, playbackPositionMs = 0L, playbackDurationMs = 0L) }
    }

    private fun startPositionUpdates() {
        stopPositionUpdates()
        positionJob = viewModelScope.launch {
            while (isActive) {
                val player = mediaPlayer ?: break
                if (_ui.value.playingFileId == null) break
                if (player.isPlaying) {
                    _ui.update { it.copy(playbackPositionMs = player.currentPosition.toLong()) }
                }
                delay(250)
            }
        }
    }

    private fun stopPositionUpdates() {
        positionJob?.cancel()
        positionJob = null
    }

    private fun releasePlayer() {
        mediaPlayer?.run {
            if (isPlaying) stop()
            release()
        }
        mediaPlayer = null
    }

    private fun audioPlayUrl(file: AudioFileDto): String? {
        file.id?.let { return "${BuildConfig.API_BASE_URL}audio/$it" }
        val userId = sessionStore.userId()
        val fileName = file.file_name
        val token = sessionStore.accessTokenBlocking()
        if (userId != null && fileName != null && token != null) {
            val encoded = URLEncoder.encode(fileName, Charsets.UTF_8.name())
            return "${BuildConfig.API_BASE_URL}audio/$userId/$encoded?token=$token"
        }
        return null
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MeetingOptionsScreen(onBack: () -> Unit, vm: MeetingOptionsViewModel = hiltViewModel()) {
    val state by vm.ui.collectAsStateWithLifecycle()
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = onBack) {
                Icon(Icons.AutoMirrored.Filled.ArrowBack, null, tint = NeshastyarColors.TextPrimary)
            }
            Text("گزینه‌های جلسه", fontWeight = FontWeight.Bold, color = NeshastyarColors.TextPrimary)
        }
        Spacer(Modifier.height(12.dp))
        NeshastyarCard {
            NeshastyarTextField(
                value = state.comment,
                onValueChange = vm::onComment,
                label = "توضیحات خاص",
                placeholder = "توضیحات خاص خود را وارد کنید…",
                singleLine = false,
                minLines = 4,
            )
            Spacer(Modifier.height(10.dp))
            NeshastyarPrimaryButton(text = "ذخیره", onClick = vm::save)
            if (state.message != null) {
                Text(state.message!!, color = NeshastyarColors.PrimaryBright, modifier = Modifier.padding(top = 8.dp))
            }
        }
        Spacer(Modifier.height(16.dp))
        Text("فایل‌های صوتی", fontWeight = FontWeight.SemiBold, color = NeshastyarColors.TextSecondary)
        Spacer(Modifier.height(8.dp))
        if (state.playbackError != null) {
            Text(state.playbackError!!, color = NeshastyarColors.Error, modifier = Modifier.padding(bottom = 8.dp))
        }
        LazyColumn(verticalArrangement = androidx.compose.foundation.layout.Arrangement.spacedBy(8.dp)) {
            items(state.files, key = { it.id ?: it.file_name ?: it.hashCode().toString() }) { f ->
                val isPlaying = f.id != null && f.id == state.playingFileId
                NeshastyarCard(contentPadding = PaddingValues(12.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        IconButton(onClick = { vm.togglePlay(f) }) {
                            Icon(
                                imageVector = if (isPlaying) Icons.Default.Pause else Icons.Default.PlayArrow,
                                contentDescription = if (isPlaying) "توقف" else "پخش",
                                tint = NeshastyarColors.PrimaryBright,
                            )
                        }
                        Column(modifier = Modifier.weight(1f).padding(horizontal = 10.dp)) {
                            Text(
                                f.file_name ?: f.id ?: "فایل",
                                color = NeshastyarColors.TextPrimary,
                                fontWeight = FontWeight.Medium,
                            )
                            if (!isPlaying) {
                                val totalMs = f.duration?.let { (it * 1000).toLong() } ?: 0L
                                if (totalMs > 0L) {
                                    Text(formatDurationMs(totalMs), color = NeshastyarColors.TextMuted)
                                }
                            }
                        }
                    }
                    if (isPlaying) {
                        val totalMs = state.playbackDurationMs.coerceAtLeast(1L)
                        Spacer(Modifier.height(8.dp))
                        AudioPlaybackTimeline(
                            positionMs = state.playbackPositionMs,
                            durationMs = totalMs,
                            onSeek = vm::seekTo,
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun AudioPlaybackTimeline(
    positionMs: Long,
    durationMs: Long,
    onSeek: (Long) -> Unit,
) {
    var sliderValue by remember { mutableFloatStateOf(positionMs.toFloat()) }
    var isDragging by remember { mutableStateOf(false) }

    LaunchedEffect(positionMs) {
        if (!isDragging) {
            sliderValue = positionMs.toFloat().coerceIn(0f, durationMs.toFloat())
        }
    }

    Column(modifier = Modifier.fillMaxWidth()) {
        Slider(
            value = sliderValue.coerceIn(0f, durationMs.toFloat()),
            onValueChange = {
                isDragging = true
                sliderValue = it
            },
            onValueChangeFinished = {
                isDragging = false
                onSeek(sliderValue.toLong())
            },
            valueRange = 0f..durationMs.toFloat(),
            modifier = Modifier.fillMaxWidth(),
            colors = SliderDefaults.colors(
                thumbColor = NeshastyarColors.PrimaryBright,
                activeTrackColor = NeshastyarColors.PrimaryBright,
                inactiveTrackColor = NeshastyarColors.Outline,
            ),
        )
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            Text(
                formatDurationMs(positionMs),
                color = NeshastyarColors.PrimaryBright,
                fontWeight = FontWeight.Medium,
            )
            Text(
                formatDurationMs(durationMs),
                color = NeshastyarColors.TextMuted,
            )
        }
    }
}

private fun formatDurationMs(ms: Long): String {
    val totalSec = (ms / 1000).toInt().coerceAtLeast(0)
    return "%d:%02d:%02d".format(totalSec / 3600, (totalSec % 3600) / 60, totalSec % 60)
}
