package com.neshastyar.app.ui.screens.meeting

import android.content.Context
import androidx.annotation.OptIn
import androidx.media3.common.AudioAttributes
import androidx.media3.common.C
import androidx.media3.common.MediaItem
import androidx.media3.common.PlaybackException
import androidx.media3.common.Player
import androidx.media3.common.util.UnstableApi
import androidx.media3.datasource.okhttp.OkHttpDataSource
import androidx.media3.exoplayer.DefaultLoadControl
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.source.DefaultMediaSourceFactory
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Forward10
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Replay10
import androidx.compose.material.icons.filled.Stop
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CheckboxDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Slider
import androidx.compose.material3.SliderDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import java.net.URLEncoder
import javax.inject.Inject
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import okhttp3.OkHttpClient
import com.neshastyar.app.BuildConfig
import com.neshastyar.app.data.api.AudioFileDto
import com.neshastyar.app.data.api.UpdateMeetingRequest
import com.neshastyar.app.data.local.SessionStore
import com.neshastyar.app.data.repository.MeetingsRepository
import com.neshastyar.app.data.repository.MeetingsResult
import com.neshastyar.app.data.repository.TagsRepository
import com.neshastyar.app.ui.components.NeshastyarCard
import com.neshastyar.app.ui.components.NeshastyarPrimaryButton
import com.neshastyar.app.ui.components.NeshastyarSecondaryButton
import com.neshastyar.app.ui.components.NeshastyarTextField
import com.neshastyar.app.ui.theme.NeshastyarColors
import com.neshastyar.app.util.StatusStyle

@HiltViewModel
class MeetingOptionsViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val meetingsRepository: MeetingsRepository,
    private val tagsRepository: TagsRepository,
    private val sessionStore: SessionStore,
    private val okHttp: OkHttpClient,
    @ApplicationContext private val appContext: Context,
) : ViewModel() {
    private val meetingId: String = checkNotNull(savedStateHandle["meetingId"])
    private var player: ExoPlayer? = null
    private var positionJob: Job? = null
    private var playbackGeneration = 0

    data class State(
        val comment: String = "",
        val files: List<AudioFileDto> = emptyList(),
        val message: String? = null,
        val preparingFileId: String? = null,
        val playingFileId: String? = null,
        val playbackPaused: Boolean = false,
        val playbackPositionMs: Long = 0L,
        val playbackDurationMs: Long = 0L,
        val playbackError: String? = null,
        val reanalyzing: Boolean = false,
        val processed: Boolean = false,
        val deleting: Boolean = false,
        val deleted: Boolean = false,
        val deleteError: String? = null,
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
            _ui.update {
                it.copy(
                    comment = meeting?.commentText.orEmpty(),
                    files = files,
                    processed = StatusStyle.isProcessedStatus(meeting?.status),
                )
            }
        }
    }

    fun onComment(v: String) = _ui.update { it.copy(comment = v) }

    fun reanalyze() = viewModelScope.launch {
        if (_ui.value.reanalyzing) return@launch
        _ui.update { it.copy(reanalyzing = true, message = null) }
        meetingsRepository.update(meetingId, UpdateMeetingRequest(commentText = _ui.value.comment)).fold(
            onSuccess = {
                meetingsRepository.analyze(meetingId).fold(
                    onSuccess = {
                        _ui.update { it.copy(reanalyzing = false, message = "درخواست پردازش ارسال شد") }
                    },
                    onFailure = { e ->
                        _ui.update { it.copy(reanalyzing = false, message = e.message) }
                    },
                )
            },
            onFailure = { e -> _ui.update { it.copy(reanalyzing = false, message = e.message) } },
        )
    }

    fun deleteMeeting() = viewModelScope.launch {
        if (_ui.value.deleting) return@launch
        _ui.update { it.copy(deleting = true, deleteError = null) }
        stopPlayback()
        val tags = tagsRepository.tagsForMeeting(meetingId).getOrElse { emptyList() }
        tags.forEach { tagsRepository.unlink(meetingId, it.id) }
        meetingsRepository.delete(meetingId).fold(
            onSuccess = { _ui.update { it.copy(deleting = false, deleted = true) } },
            onFailure = { e ->
                _ui.update {
                    it.copy(deleting = false, deleteError = e.message ?: "حذف جلسه ناموفق بود")
                }
            },
        )
    }

    fun seekTo(positionMs: Long) {
        val exo = player ?: return
        val duration = _ui.value.playbackDurationMs.coerceAtLeast(1L)
        val clamped = positionMs.coerceIn(0L, duration)
        exo.seekTo(clamped)
        _ui.update { it.copy(playbackPositionMs = clamped) }
    }

    fun seekBy(deltaMs: Long) {
        seekTo(_ui.value.playbackPositionMs + deltaMs)
    }

    fun togglePlay(file: AudioFileDto) {
        val fileId = file.id ?: run {
            _ui.update { it.copy(playbackError = "شناسه فایل صوتی موجود نیست") }
            return
        }
        if (_ui.value.preparingFileId == fileId) {
            stopPlayback()
            return
        }
        if (_ui.value.playingFileId == fileId) {
            if (_ui.value.playbackPaused) resumePlayback()
            return
        }
        stopPlayback()
        val urls = audioPlayUrls(file)
        if (urls.isEmpty()) {
            _ui.update { it.copy(playbackError = "آدرس پخش فایل در دسترس نیست") }
            return
        }
        playbackGeneration += 1
        _ui.update { it.copy(preparingFileId = fileId, playbackError = null) }
        startStream(fileId, urls, 0, file.duration, playbackGeneration)
    }

    @OptIn(UnstableApi::class)
    private fun startStream(
        fileId: String,
        urls: List<String>,
        index: Int,
        knownDurationSec: Double?,
        generation: Int,
    ) {
        val url = urls.getOrNull(index) ?: run {
            _ui.update {
                it.copy(preparingFileId = null, playbackError = "پخش فایل ناموفق بود")
            }
            return
        }
        releasePlayer()
        val httpFactory = OkHttpDataSource.Factory(okHttp)
        val exo = ExoPlayer.Builder(appContext)
            .setMediaSourceFactory(DefaultMediaSourceFactory(httpFactory))
            .setLoadControl(
                DefaultLoadControl.Builder()
                    .setBufferDurationsMs(2_000, 20_000, 500, 1_000)
                    .build(),
            )
            .build()
        player = exo
        exo.setAudioAttributes(
            AudioAttributes.Builder()
                .setUsage(C.USAGE_MEDIA)
                .setContentType(C.AUDIO_CONTENT_TYPE_SPEECH)
                .build(),
            true,
        )
        exo.addListener(object : Player.Listener {
            override fun onPlaybackStateChanged(playbackState: Int) {
                if (generation != playbackGeneration) return
                when (playbackState) {
                    Player.STATE_READY -> {
                        val durationMs = exo.duration.takeIf { it > 0 }
                            ?: knownDurationSec?.let { (it * 1000).toLong() }
                            ?: _ui.value.playbackDurationMs
                        if (_ui.value.playingFileId != fileId) {
                            _ui.update {
                                it.copy(
                                    preparingFileId = null,
                                    playingFileId = fileId,
                                    playbackError = null,
                                    playbackPositionMs = exo.currentPosition.coerceAtLeast(0L),
                                    playbackDurationMs = durationMs,
                                )
                            }
                            startPositionUpdates()
                        } else if (durationMs > 0) {
                            _ui.update { it.copy(playbackDurationMs = durationMs) }
                        }
                    }
                    Player.STATE_ENDED -> viewModelScope.launch {
                        if (generation == playbackGeneration) stopPlayback()
                    }
                }
            }

            override fun onPlayerError(error: PlaybackException) {
                if (generation != playbackGeneration) return
                viewModelScope.launch {
                    if (generation != playbackGeneration) return@launch
                    if (index + 1 < urls.size) {
                        startStream(fileId, urls, index + 1, knownDurationSec, generation)
                    } else {
                        stopPlayback()
                        _ui.update { it.copy(playbackError = "پخش فایل ناموفق بود") }
                    }
                }
            }
        })
        exo.setMediaItem(MediaItem.fromUri(url))
        exo.prepare()
        exo.playWhenReady = true
    }

    fun pauseOrResume() {
        val exo = player ?: return
        if (exo.isPlaying) {
            exo.pause()
            _ui.update { it.copy(playbackPaused = true) }
        } else {
            resumePlayback()
        }
    }

    private fun resumePlayback() {
        player?.play()
        _ui.update { it.copy(playbackPaused = false) }
    }

    override fun onCleared() {
        stopPlayback()
        super.onCleared()
    }

    fun stopPlayback() {
        playbackGeneration += 1
        stopPositionUpdates()
        releasePlayer()
        _ui.update {
            it.copy(
                preparingFileId = null,
                playingFileId = null,
                playbackPaused = false,
                playbackPositionMs = 0L,
                playbackDurationMs = 0L,
            )
        }
    }

    private fun startPositionUpdates() {
        stopPositionUpdates()
        positionJob = viewModelScope.launch {
            while (isActive) {
                val exo = player ?: break
                if (_ui.value.playingFileId == null) break
                if (exo.isPlaying) {
                    val duration = exo.duration.takeIf { it > 0 } ?: _ui.value.playbackDurationMs
                    _ui.update {
                        it.copy(
                            playbackPositionMs = exo.currentPosition.coerceAtLeast(0L),
                            playbackDurationMs = duration,
                        )
                    }
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
        val exo = player
        player = null
        exo?.release()
    }

    private fun audioPlayUrls(file: AudioFileDto): List<String> {
        val urls = mutableListOf<String>()
        file.id?.let { urls += "${BuildConfig.API_BASE_URL}audio/$it" }
        val userId = sessionStore.userId()
        val fileName = file.file_name
        val token = sessionStore.accessTokenBlocking()
        if (userId != null && fileName != null && token != null) {
            val encodedName = URLEncoder.encode(fileName, Charsets.UTF_8.name()).replace("+", "%20")
            val encodedToken = URLEncoder.encode(token, Charsets.UTF_8.name())
            urls += "${BuildConfig.API_BASE_URL}audio/$userId/$encodedName?token=$encodedToken"
        }
        return urls
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MeetingOptionsScreen(
    onBack: () -> Unit,
    onShowConversation: () -> Unit,
    onDeleted: () -> Unit,
    vm: MeetingOptionsViewModel = hiltViewModel(),
) {
    val state by vm.ui.collectAsStateWithLifecycle()
    var confirmDelete by remember { mutableStateOf(false) }
    var deleteConfirmed by remember { mutableStateOf(false) }
    LaunchedEffect(state.deleted) { if (state.deleted) onDeleted() }
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
                "گزینه‌های جلسه",
                fontWeight = FontWeight.Bold,
                color = NeshastyarColors.TextPrimary,
                modifier = Modifier.weight(1f),
            )
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
            NeshastyarPrimaryButton(
                text = "پردازش مجدد",
                onClick = vm::reanalyze,
                loading = state.reanalyzing,
            )
            if (state.processed) {
                Spacer(Modifier.height(10.dp))
                NeshastyarSecondaryButton(
                    text = "نمایش جزییات مکالمات",
                    onClick = onShowConversation,
                )
            }
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
        LazyColumn(
            modifier = Modifier.weight(1f),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            items(state.files, key = { it.id ?: it.file_name ?: it.hashCode().toString() }) { f ->
                val isPlaying = f.id != null && f.id == state.playingFileId
                val isPreparing = f.id != null && f.id == state.preparingFileId
                NeshastyarCard(contentPadding = PaddingValues(12.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        IconButton(
                            onClick = { vm.togglePlay(f) },
                            enabled = !isPlaying || state.playbackPaused,
                        ) {
                            when {
                                isPreparing -> CircularProgressIndicator(
                                    color = NeshastyarColors.PrimaryBright,
                                    strokeWidth = 2.dp,
                                    modifier = Modifier.size(22.dp),
                                )
                                else -> Icon(
                                    Icons.Default.PlayArrow,
                                    contentDescription = "پخش",
                                    tint = NeshastyarColors.PrimaryBright,
                                )
                            }
                        }
                        Column(modifier = Modifier.weight(1f).padding(horizontal = 10.dp)) {
                            Text(
                                f.file_name ?: f.id ?: "فایل",
                                color = NeshastyarColors.TextPrimary,
                                fontWeight = FontWeight.Medium,
                            )
                            if (isPreparing) {
                                Text("در حال شروع پخش…", color = NeshastyarColors.TextMuted)
                            } else if (!isPlaying) {
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
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceEvenly,
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            AudioSkipButton(
                                icon = Icons.Default.Replay10,
                                label = "۱۰ ثانیه عقب",
                                onClick = { vm.seekBy(-10_000) },
                            )
                            AudioSkipButton(
                                icon = if (state.playbackPaused) Icons.Default.PlayArrow else Icons.Default.Pause,
                                label = if (state.playbackPaused) "ادامه" else "مکث",
                                onClick = vm::pauseOrResume,
                            )
                            AudioSkipButton(
                                icon = Icons.Default.Stop,
                                label = "توقف",
                                onClick = vm::stopPlayback,
                            )
                            AudioSkipButton(
                                icon = Icons.Default.Forward10,
                                label = "۱۰ ثانیه جلو",
                                onClick = { vm.seekBy(10_000) },
                            )
                        }
                    }
                }
            }
            item {
                Spacer(Modifier.height(8.dp))
                NeshastyarCard {
                    Text(
                        "حذف جلسه",
                        fontWeight = FontWeight.SemiBold,
                        color = NeshastyarColors.TextPrimary,
                    )
                    Text(
                        "این جلسه و ضبط صوتی آن را برای همیشه حذف کنید.",
                        color = NeshastyarColors.TextMuted,
                        modifier = Modifier.padding(top = 4.dp, bottom = 10.dp),
                    )
                    Button(
                        onClick = {
                            deleteConfirmed = false
                            confirmDelete = true
                        },
                        enabled = !state.deleting,
                        modifier = Modifier.fillMaxWidth(),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = NeshastyarColors.Error,
                            contentColor = androidx.compose.ui.graphics.Color.White,
                        ),
                    ) {
                        Text(if (state.deleting) "در حال حذف..." else "حذف جلسه")
                    }
                    if (state.deleteError != null) {
                        Text(
                            state.deleteError!!,
                            color = NeshastyarColors.Error,
                            modifier = Modifier.padding(top = 8.dp),
                        )
                    }
                }
            }
        }
    }

    if (confirmDelete) {
        AlertDialog(
            onDismissRequest = {
                if (!state.deleting) {
                    confirmDelete = false
                    deleteConfirmed = false
                }
            },
            title = { Text("آیا مطمئن هستید؟") },
            text = {
                Column {
                    Text("این عمل قابل بازگشت نیست. جلسه، ضبط صوتی، خلاصه و برچسب‌های آن برای همیشه حذف می‌شود.")
                    Row(
                        modifier = Modifier.padding(top = 12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Checkbox(
                            checked = deleteConfirmed,
                            onCheckedChange = { deleteConfirmed = it },
                            colors = CheckboxDefaults.colors(
                                checkedColor = NeshastyarColors.Error,
                                uncheckedColor = NeshastyarColors.Outline,
                            ),
                        )
                        Text(
                            "حذف این جلسه را تأیید می‌کنم",
                            color = NeshastyarColors.TextSecondary,
                            modifier = Modifier.clickable { deleteConfirmed = !deleteConfirmed },
                        )
                    }
                }
            },
            confirmButton = {
                TextButton(
                    onClick = {
                        confirmDelete = false
                        deleteConfirmed = false
                        vm.deleteMeeting()
                    },
                    enabled = deleteConfirmed && !state.deleting,
                ) {
                    Text(
                        "حذف جلسه",
                        color = if (deleteConfirmed) NeshastyarColors.Error else NeshastyarColors.TextMuted,
                    )
                }
            },
            dismissButton = {
                OutlinedButton(
                    onClick = {
                        confirmDelete = false
                        deleteConfirmed = false
                    },
                    enabled = !state.deleting,
                ) { Text("لغو") }
            },
            containerColor = NeshastyarColors.Surface,
        )
    }
}

@Composable
private fun RowScope.AudioSkipButton(
    icon: ImageVector,
    label: String,
    onClick: () -> Unit,
) {
    Column(
        modifier = Modifier
            .weight(1f)
            .clickable(onClick = onClick)
            .padding(vertical = 4.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Icon(icon, contentDescription = label, tint = NeshastyarColors.Primary, modifier = Modifier.size(26.dp))
        Text(
            label,
            color = NeshastyarColors.Primary,
            fontSize = 11.sp,
            lineHeight = 13.sp,
            textAlign = TextAlign.Center,
        )
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

@HiltViewModel
class MeetingConversationViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val meetingsRepository: MeetingsRepository,
) : ViewModel() {
    private val meetingId: String = checkNotNull(savedStateHandle["meetingId"])

    data class State(
        val loading: Boolean = true,
        val text: String = "",
        val error: String? = null,
    )

    private val _ui = MutableStateFlow(State())
    val ui = _ui.asStateFlow()

    init {
        viewModelScope.launch { load() }
    }

    fun retry() {
        viewModelScope.launch { load() }
    }

    private suspend fun load() {
        _ui.update { it.copy(loading = true, error = null) }
        when (val result = meetingsRepository.getById(meetingId)) {
            is MeetingsResult.Ok -> _ui.update {
                it.copy(loading = false, text = conversationPlain(result.data.transcription.orEmpty()))
            }
            is MeetingsResult.Err -> _ui.update { it.copy(loading = false, error = result.message) }
        }
    }
}

@Composable
fun MeetingConversationScreen(
    onBack: () -> Unit,
    vm: MeetingConversationViewModel = hiltViewModel(),
) {
    val state by vm.ui.collectAsStateWithLifecycle()
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
                "جزییات مکالمات",
                fontWeight = FontWeight.Bold,
                color = NeshastyarColors.TextPrimary,
            )
        }
        when {
            state.loading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = NeshastyarColors.Primary)
            }
            state.error != null -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(state.error!!, color = NeshastyarColors.Error)
                    TextButton(onClick = vm::retry) {
                        Text("تلاش مجدد", color = NeshastyarColors.PrimaryBright)
                    }
                }
            }
            else -> Column(
                modifier = Modifier
                    .fillMaxSize()
                    .verticalScroll(rememberScrollState())
                    .padding(16.dp),
            ) {
                NeshastyarCard {
                    Text(
                        state.text.ifBlank { "جزییات مکالمات این جلسه موجود نیست." },
                        color = if (state.text.isBlank()) NeshastyarColors.TextMuted else NeshastyarColors.TextPrimary,
                    )
                }
            }
        }
    }
}

private fun conversationPlain(raw: String): String {
    val trimmed = raw.trim()
    if (trimmed.isEmpty() || !trimmed.contains('<')) return trimmed
    return trimmed
        .replace(Regex("(?i)<br\\s*/?>"), "\n")
        .replace(Regex("(?i)</p>"), "\n")
        .replace(Regex("(?i)</div>"), "\n")
        .replace(Regex("<[^>]+>"), "")
        .replace("&nbsp;", " ")
        .replace("&amp;", "&")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace(Regex("\n{3,}"), "\n\n")
        .trim()
}
