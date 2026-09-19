package com.neshastyar.app.ui.screens.participants

import androidx.compose.foundation.clickable
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
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.Button
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import androidx.compose.ui.Modifier
import androidx.compose.ui.Alignment
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.neshastyar.app.data.api.MeetingDto
import com.neshastyar.app.data.api.ParticipantDto
import com.neshastyar.app.data.repository.ParticipantsRepository
import com.neshastyar.app.ui.components.NeshastyarCard
import com.neshastyar.app.ui.components.StatusChip
import com.neshastyar.app.ui.theme.NeshastyarColors

@HiltViewModel
class ParticipantsListViewModel @Inject constructor(
    private val repo: ParticipantsRepository,
) : ViewModel() {
    data class State(val loading: Boolean = true, val items: List<ParticipantDto> = emptyList(), val noneCount: Int = 0, val error: String? = null)
    private val _ui = MutableStateFlow(State())
    val ui = _ui.asStateFlow()
    init { refresh() }
    fun refresh() = viewModelScope.launch {
        _ui.update { it.copy(loading = true) }
        repo.list().fold(
            onSuccess = { data -> _ui.update { it.copy(loading = false, items = data.participants, noneCount = data.noParticipantsCount) } },
            onFailure = { e -> _ui.update { it.copy(loading = false, error = e.message) } },
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ParticipantsListScreen(
    onOpen: (String) -> Unit,
    onManage: () -> Unit,
    vm: ParticipantsListViewModel = hiltViewModel(),
) {
    val state by vm.ui.collectAsStateWithLifecycle()
    Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(bottom = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            IconButton(onClick = onManage) {
                Icon(Icons.Default.Settings, null, tint = NeshastyarColors.PrimaryBright)
            }
            Text(
                "افراد",
                style = MaterialTheme.typography.headlineMedium,
                color = NeshastyarColors.TextPrimary,
                modifier = Modifier.weight(1f),
            )
        }
        if (state.loading) {
            CircularProgressIndicator(
                color = NeshastyarColors.Primary,
                modifier = Modifier.padding(24.dp).align(Alignment.CenterHorizontally),
            )
        } else {
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                if (state.noneCount > 0) {
                    item {
                        ParticipantBrowseRow(
                            title = "بدون شرکت‌کننده",
                            subtitle = "${state.noneCount} جلسه",
                            onClick = { onOpen("no-participants") },
                        )
                    }
                }
                items(state.items, key = { it.id }) { p ->
                    ParticipantBrowseRow(
                        title = p.name ?: p.id,
                        subtitle = "${p.meetingCount ?: 0} جلسه",
                        onClick = { onOpen(p.id) },
                    )
                }
            }
        }
    }
}

@Composable
private fun ParticipantBrowseRow(title: String, subtitle: String, onClick: () -> Unit) {
    NeshastyarCard(
        modifier = Modifier.clickable(onClick = onClick),
        contentPadding = PaddingValues(14.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Column(modifier = Modifier.weight(1f)) {
                Text(title, color = NeshastyarColors.TextPrimary)
                Text(subtitle, color = NeshastyarColors.TextMuted, style = MaterialTheme.typography.bodySmall)
            }
            Icon(
                Icons.AutoMirrored.Filled.ArrowBack,
                contentDescription = null,
                tint = NeshastyarColors.TextMuted,
            )
        }
    }
}

@HiltViewModel
class ParticipantDetailViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val repo: ParticipantsRepository,
) : ViewModel() {
    val id: String = checkNotNull(savedStateHandle["participantId"])
    data class State(val loading: Boolean = true, val title: String = "", val meetings: List<MeetingDto> = emptyList(), val rename: String = "")
    private val _ui = MutableStateFlow(State())
    val ui = _ui.asStateFlow()
    init { load() }
    fun load() = viewModelScope.launch {
        _ui.update { it.copy(loading = true) }
        if (id == "no-participants") {
            val meetings = repo.meetingsWithoutParticipants().getOrElse { emptyList() }
            _ui.update { it.copy(loading = false, title = "بدون شرکت‌کننده", meetings = meetings) }
        } else {
            val (p, meetings) = repo.meetings(id).getOrElse { null to emptyList() }
            _ui.update { it.copy(loading = false, title = p?.name ?: "فرد", meetings = meetings, rename = p?.name.orEmpty()) }
        }
    }
    fun onRename(v: String) = _ui.update { it.copy(rename = v) }
    fun saveRename() = viewModelScope.launch {
        if (id == "no-participants") return@launch
        repo.rename(id, _ui.value.rename).onSuccess { load() }
    }
    fun delete(onDone: () -> Unit) = viewModelScope.launch {
        if (id == "no-participants") return@launch
        repo.delete(id).onSuccess { onDone() }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ParticipantDetailScreen(onBack: () -> Unit, onOpenMeeting: (String) -> Unit, vm: ParticipantDetailViewModel = hiltViewModel()) {
    val state by vm.ui.collectAsStateWithLifecycle()
    var showRename by remember { mutableStateOf(false) }
    var showDelete by remember { mutableStateOf(false) }
    val canManage = vm.id != "no-participants"

    Scaffold(
        containerColor = NeshastyarColors.Background,
        topBar = {
            TopAppBar(
                title = { Text(state.title) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, null, tint = NeshastyarColors.TextPrimary)
                    }
                },
                actions = {
                    if (canManage) {
                        IconButton(onClick = {
                            vm.onRename(state.rename.ifBlank { state.title })
                            showRename = true
                        }) {
                            Icon(
                                Icons.Default.Edit,
                                contentDescription = "ویرایش نام",
                                tint = NeshastyarColors.PrimaryBright,
                            )
                        }
                        IconButton(onClick = { showDelete = true }) {
                            Icon(
                                Icons.Default.Delete,
                                contentDescription = "حذف فرد",
                                tint = NeshastyarColors.Error,
                            )
                        }
                    }
                },
                colors = androidx.compose.material3.TopAppBarDefaults.topAppBarColors(
                    containerColor = NeshastyarColors.Background,
                    titleContentColor = NeshastyarColors.TextPrimary,
                ),
            )
        },
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(horizontal = 16.dp),
            contentPadding = PaddingValues(vertical = 12.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            items(state.meetings, key = { it.id }) { m ->
                NeshastyarCard(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { onOpenMeeting(m.id) },
                    contentPadding = PaddingValues(16.dp),
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = m.title?.ifBlank { null } ?: "جلسه",
                                color = NeshastyarColors.TextPrimary,
                                style = MaterialTheme.typography.titleMedium,
                                maxLines = 3,
                            )
                            if (!m.status.isNullOrBlank()) {
                                Spacer(modifier = Modifier.height(8.dp))
                                StatusChip(m.status)
                            }
                        }
                        Icon(
                            Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = null,
                            tint = NeshastyarColors.TextMuted,
                        )
                    }
                }
            }
        }
    }

    if (showRename) {
        androidx.compose.material3.AlertDialog(
            onDismissRequest = { showRename = false },
            title = { Text("ویرایش نام") },
            text = {
                OutlinedTextField(
                    value = state.rename,
                    onValueChange = vm::onRename,
                    label = { Text("نام") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                )
            },
            confirmButton = {
                Button(
                    onClick = {
                        vm.saveRename()
                        showRename = false
                    },
                ) { Text("ذخیره") }
            },
            dismissButton = {
                OutlinedButton(onClick = { showRename = false }) { Text("انصراف") }
            },
            containerColor = NeshastyarColors.Surface,
        )
    }

    if (showDelete) {
        androidx.compose.material3.AlertDialog(
            onDismissRequest = { showDelete = false },
            title = { Text("حذف فرد") },
            text = { Text("آیا از حذف «${state.title}» مطمئن هستید؟") },
            confirmButton = {
                Button(
                    onClick = {
                        showDelete = false
                        vm.delete(onBack)
                    },
                    colors = androidx.compose.material3.ButtonDefaults.buttonColors(
                        containerColor = NeshastyarColors.Error,
                    ),
                ) { Text("حذف") }
            },
            dismissButton = {
                OutlinedButton(onClick = { showDelete = false }) { Text("انصراف") }
            },
            containerColor = NeshastyarColors.Surface,
        )
    }
}

@HiltViewModel
class ParticipantsManageViewModel @Inject constructor(private val repo: ParticipantsRepository) : ViewModel() {
    data class State(
        val loading: Boolean = true,
        val items: List<ParticipantDto> = emptyList(),
        val selected: Set<String> = emptySet(),
        val targetName: String = "",
        val error: String? = null,
        val message: String? = null,
    )
    private val _ui = MutableStateFlow(State())
    val ui = _ui.asStateFlow()
    init { refresh() }
    fun refresh() = viewModelScope.launch {
        repo.list().fold(
            onSuccess = { d -> _ui.update { it.copy(loading = false, items = d.participants) } },
            onFailure = { e -> _ui.update { it.copy(loading = false, error = e.message) } },
        )
    }
    fun toggle(id: String) = _ui.update {
        val s = it.selected.toMutableSet(); if (!s.add(id)) s.remove(id); it.copy(selected = s)
    }
    fun onTarget(v: String) = _ui.update { it.copy(targetName = v) }
    fun deleteSelected() = viewModelScope.launch {
        _ui.value.selected.forEach { repo.delete(it) }
        _ui.update { it.copy(selected = emptySet(), message = "حذف شد") }
        refresh()
    }
    fun merge() = viewModelScope.launch {
        val ids = _ui.value.selected.toList()
        if (ids.size < 2) { _ui.update { it.copy(error = "حداقل دو نفر انتخاب کنید") }; return@launch }
        val target = _ui.value.targetName.ifBlank {
            _ui.value.items.firstOrNull { it.id == ids.first() }?.name ?: "ادغام"
        }
        repo.merge(ids, target).onSuccess {
            _ui.update { it.copy(selected = emptySet(), message = "ادغام شد", error = null) }
            refresh()
        }.onFailure { e -> _ui.update { it.copy(error = e.message) } }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ParticipantsManageScreen(onBack: () -> Unit, vm: ParticipantsManageViewModel = hiltViewModel()) {
    val state by vm.ui.collectAsStateWithLifecycle()
    Scaffold(topBar = {
        TopAppBar(title = { Text("مدیریت افراد") }, navigationIcon = {
            IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, null) }
        })
    }) { padding ->
        Column(modifier = Modifier.fillMaxSize().padding(padding).padding(16.dp)) {
            LazyColumn(modifier = Modifier.weight(1f)) {
                items(state.items, key = { it.id }) { p ->
                    Row(modifier = Modifier.fillMaxWidth().clickable { vm.toggle(p.id) }.padding(8.dp), verticalAlignment = Alignment.CenterVertically) {
                        Checkbox(checked = p.id in state.selected, onCheckedChange = { vm.toggle(p.id) })
                        Text(" ()")
                    }
                }
            }
            OutlinedTextField(value = state.targetName, onValueChange = vm::onTarget, label = { Text("نام مقصد برای ادغام") }, modifier = Modifier.fillMaxWidth())
            if (state.error != null) Text(state.error!!, color = MaterialTheme.colorScheme.error)
            if (state.message != null) Text(state.message!!, color = MaterialTheme.colorScheme.primary)
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(top = 8.dp)) {
                Button(onClick = vm::merge, modifier = Modifier.weight(1f)) { Text("ادغام") }
                OutlinedButton(onClick = vm::deleteSelected, modifier = Modifier.weight(1f)) { Text("حذف") }
            }
        }
    }
}