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
import androidx.compose.runtime.LaunchedEffect
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
import com.neshastyar.app.data.api.TagDto
import com.neshastyar.app.data.repository.MeetingsRepository
import com.neshastyar.app.data.repository.MeetingsResult
import com.neshastyar.app.data.repository.TagsRepository
import com.neshastyar.app.ui.components.NeshastyarCard
import com.neshastyar.app.ui.components.StatusChip
import com.neshastyar.app.ui.theme.NeshastyarColors

data class TagListItem(val id: String, val name: String, val count: Int)

@HiltViewModel
class TagListViewModel @Inject constructor(
    private val tagsRepository: TagsRepository,
    private val meetingsRepository: MeetingsRepository,
) : ViewModel() {
    private val _ui = MutableStateFlow(TagListState())
    val ui = _ui.asStateFlow()
    init { refresh() }
    fun refresh() = viewModelScope.launch {
        _ui.update { it.copy(loading = true) }
        val tags = tagsRepository.list().getOrElse { emptyList() }
        val items = tags.map { tag ->
            val count = tagsRepository.meetingsForTag(tag.id).getOrElse { emptyList() }.size
            TagListItem(tag.id, tag.name ?: tag.id, count)
        }.filter { it.count > 0 }
        val untagged = meetingsRepository.untaggedMeetings().getOrElse { emptyList() }.size
        _ui.update { it.copy(loading = false, items = items, untaggedCount = untagged) }
    }
}
data class TagListState(val loading: Boolean = true, val items: List<TagListItem> = emptyList(), val untaggedCount: Int = 0)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TagListScreen(
    onBack: () -> Unit,
    onOpenTag: (String) -> Unit,
    onManage: () -> Unit,
    vm: TagListViewModel = hiltViewModel(),
) {
    val state by vm.ui.collectAsStateWithLifecycle()
    Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(bottom = 16.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            IconButton(onClick = onBack) {
                Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "بازگشت", tint = NeshastyarColors.Primary)
            }
            Text(
                "لیست جلسات بر حسب برچسب",
                style = MaterialTheme.typography.titleLarge,
                color = NeshastyarColors.TextPrimary,
                modifier = Modifier.weight(1f),
            )
            IconButton(onClick = onManage) {
                Icon(Icons.Default.Settings, contentDescription = "مدیریت", tint = NeshastyarColors.PrimaryBright)
            }
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
                if (state.untaggedCount > 0) {
                    item {
                        TagBrowseRow(
                            title = "بدون برچسب",
                            count = state.untaggedCount,
                            onClick = { onOpenTag("untagged") },
                        )
                    }
                }
                items(state.items, key = { it.id }) { item ->
                    TagBrowseRow(
                        title = item.name,
                        count = item.count,
                        onClick = { onOpenTag(item.id) },
                    )
                }
            }
        }
    }
}

@Composable
private fun TagBrowseRow(title: String, count: Int, onClick: () -> Unit) {
    NeshastyarCard(
        modifier = Modifier.clickable(onClick = onClick),
        contentPadding = androidx.compose.foundation.layout.PaddingValues(14.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(
                text = "$title ($count)",
                color = NeshastyarColors.TextPrimary,
                modifier = Modifier.weight(1f),
            )
            Icon(
                Icons.AutoMirrored.Filled.ArrowBack,
                contentDescription = null,
                tint = NeshastyarColors.TextMuted,
            )
        }
    }
}

@HiltViewModel
class TagDetailViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val tagsRepository: TagsRepository,
    private val meetingsRepository: MeetingsRepository,
) : ViewModel() {
    val tagId: String = checkNotNull(savedStateHandle["tagId"])
    private val _ui = MutableStateFlow(TagDetailState())
    val ui = _ui.asStateFlow()
    init { load() }
    fun load() = viewModelScope.launch {
        _ui.update { it.copy(loading = true) }
        if (tagId == "untagged") {
            val meetings = meetingsRepository.untaggedMeetings().getOrElse { emptyList() }
            _ui.update { it.copy(loading = false, title = "بدون برچسب", meetings = meetings) }
        } else {
            val tag = tagsRepository.get(tagId).getOrNull()
            val meetings = tagsRepository.meetingsForTag(tagId).getOrElse { emptyList() }
            _ui.update { it.copy(loading = false, title = tag?.name ?: "برچسب", meetings = meetings, rename = tag?.name.orEmpty()) }
        }
    }
    fun rename() = viewModelScope.launch {
        if (tagId == "untagged") return@launch
        tagsRepository.rename(tagId, _ui.value.rename).onSuccess { load() }
    }
    fun onRename(v: String) = _ui.update { it.copy(rename = v) }
    fun delete(onDone: () -> Unit) = viewModelScope.launch {
        if (tagId == "untagged") return@launch
        tagsRepository.delete(tagId).onSuccess { onDone() }
    }
}
data class TagDetailState(val loading: Boolean = true, val title: String = "", val meetings: List<MeetingDto> = emptyList(), val rename: String = "")

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TagDetailScreen(onBack: () -> Unit, onOpenMeeting: (String) -> Unit, vm: TagDetailViewModel = hiltViewModel()) {
    val state by vm.ui.collectAsStateWithLifecycle()
    var showRename by remember { mutableStateOf(false) }
    var showDelete by remember { mutableStateOf(false) }
    val canManage = vm.tagId != "untagged"

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
                                contentDescription = "حذف برچسب",
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
            contentPadding = androidx.compose.foundation.layout.PaddingValues(vertical = 12.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            items(state.meetings, key = { it.id }) { m ->
                MeetingListCard(
                    title = m.title?.ifBlank { null } ?: "جلسه",
                    status = m.status,
                    onClick = { onOpenMeeting(m.id) },
                )
            }
        }
    }

    if (showRename) {
        androidx.compose.material3.AlertDialog(
            onDismissRequest = { showRename = false },
            title = { Text("ویرایش نام برچسب") },
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
                        vm.rename()
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
            title = { Text("حذف برچسب") },
            text = { Text("آیا از حذف برچسب «${state.title}» مطمئن هستید؟") },
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

@Composable
private fun MeetingListCard(
    title: String,
    status: String?,
    onClick: () -> Unit,
) {
    NeshastyarCard(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        contentPadding = androidx.compose.foundation.layout.PaddingValues(16.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = title,
                    color = NeshastyarColors.TextPrimary,
                    style = MaterialTheme.typography.titleMedium,
                    maxLines = 3,
                )
                if (!status.isNullOrBlank()) {
                    Spacer(modifier = Modifier.height(8.dp))
                    StatusChip(status)
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

@HiltViewModel
class TagManageViewModel @Inject constructor(private val tagsRepository: TagsRepository) : ViewModel() {
    private val _ui = MutableStateFlow(TagManageState())
    val ui = _ui.asStateFlow()
    init { refresh() }
    fun refresh() = viewModelScope.launch {
        tagsRepository.management().fold(
            onSuccess = { data ->
                val similar = similarTagGroups(data.tags)
                val ids = similar.map { it.id }.toSet()
                _ui.update {
                    it.copy(
                        tags = similar,
                        loading = false,
                        selected = it.selected.intersect(ids),
                    )
                }
            },
            onFailure = { e -> _ui.update { it.copy(loading = false, error = e.message) } },
        )
    }
    fun toggle(id: String) = _ui.update {
        val s = it.selected.toMutableSet()
        if (!s.add(id)) s.remove(id)
        it.copy(selected = s)
    }
    fun openMerge() {
        if (_ui.value.selected.size < 2) return
        val suggested = _ui.value.tags.firstOrNull { it.id in _ui.value.selected }?.name.orEmpty()
        _ui.update { it.copy(mergeOpen = true, targetName = suggested, error = null) }
    }
    fun cancelMerge() = _ui.update { it.copy(mergeOpen = false) }
    fun onTarget(v: String) = _ui.update { it.copy(targetName = v) }
    fun merge() = viewModelScope.launch {
        val names = _ui.value.tags.filter { it.id in _ui.value.selected }.mapNotNull { it.name?.trim() }.filter { it.isNotEmpty() }
        if (names.size < 2) {
            _ui.update { it.copy(error = "حداقل دو برچسب انتخاب کنید") }
            return@launch
        }
        val target = _ui.value.targetName.trim()
        if (target.isEmpty()) {
            _ui.update { it.copy(error = "نام برچسب را وارد کنید") }
            return@launch
        }
        tagsRepository.merge(names, target)
            .onSuccess {
                _ui.update { it.copy(selected = emptySet(), mergeOpen = false, targetName = "", message = "ادغام شد", error = null) }
                refresh()
            }
            .onFailure { e -> _ui.update { it.copy(error = e.message) } }
    }
}

data class TagManageState(
    val loading: Boolean = true,
    val tags: List<TagDto> = emptyList(),
    val selected: Set<String> = emptySet(),
    val mergeOpen: Boolean = false,
    val targetName: String = "",
    val error: String? = null,
    val message: String? = null,
)

/** Tags that resemble at least one other tag, kept next to their matches. */
private fun similarTagGroups(tags: List<TagDto>): List<TagDto> {
    val named = tags.filter { !it.name.isNullOrBlank() }
    if (named.size < 2) return emptyList()
    val parent = IntArray(named.size) { it }
    fun find(i: Int): Int {
        var x = i
        while (parent[x] != x) {
            parent[x] = parent[parent[x]]
            x = parent[x]
        }
        return x
    }
    for (i in named.indices) {
        for (j in i + 1 until named.size) {
            if (tagNamesSimilar(named[i].name.orEmpty(), named[j].name.orEmpty())) {
                parent[find(i)] = find(j)
            }
        }
    }
    return named.indices
        .groupBy { find(it) }
        .values
        .filter { it.size >= 2 }
        .sortedBy { named[it.first()].name.orEmpty() }
        .flatMap { group -> group.map { named[it] }.sortedBy { it.name.orEmpty() } }
}

private fun tagNamesSimilar(left: String, right: String): Boolean {
    val a = normalizeTagName(left)
    val b = normalizeTagName(right)
    if (a.isEmpty() || b.isEmpty()) return false
    if (a == b) return true
    val shorter = if (a.length <= b.length) a else b
    val longer = if (a.length <= b.length) b else a
    if (shorter.length >= 2 && longer.contains(shorter)) return true
    val distance = levenshtein(a, b)
    val limit = if (maxOf(a.length, b.length) <= 6) 1 else 2
    return distance in 1..limit
}

private fun normalizeTagName(value: String): String =
    value.trim()
        .lowercase()
        .replace('ي', 'ی')
        .replace('ك', 'ک')
        .replace('ة', 'ه')
        .replace(Regex("[\\u064B-\\u0652]"), "")
        .replace(Regex("[^\\p{L}\\p{N}]+"), "")

private fun levenshtein(left: String, right: String): Int {
    val prev = IntArray(right.length + 1) { it }
    val curr = IntArray(right.length + 1)
    for (i in left.indices) {
        curr[0] = i + 1
        for (j in right.indices) {
            val cost = if (left[i] == right[j]) 0 else 1
            curr[j + 1] = minOf(curr[j] + 1, prev[j + 1] + 1, prev[j] + cost)
        }
        for (j in prev.indices) prev[j] = curr[j]
    }
    return prev[right.length]
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TagManageScreen(onBack: () -> Unit, vm: TagManageViewModel = hiltViewModel()) {
    val state by vm.ui.collectAsStateWithLifecycle()
    Scaffold(topBar = {
        TopAppBar(
            title = { Text("مدیریت برچسب‌ها") },
            navigationIcon = {
                IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, null) }
            },
        )
    }) { padding ->
        Column(modifier = Modifier.fillMaxSize().padding(padding).padding(16.dp)) {
            when {
                state.loading -> CircularProgressIndicator(color = NeshastyarColors.Primary)
                state.tags.isEmpty() -> Text(
                    "برچسب مشابهی برای ادغام نیست",
                    color = NeshastyarColors.TextSecondary,
                )
                else -> LazyColumn(modifier = Modifier.weight(1f)) {
                    items(state.tags, key = { it.id }) { tag ->
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { vm.toggle(tag.id) }
                                .padding(vertical = 8.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Checkbox(
                                checked = tag.id in state.selected,
                                onCheckedChange = { vm.toggle(tag.id) },
                            )
                            Text(
                                text = "${tag.name.orEmpty()} (${tag.meeting_count ?: 0})",
                                color = NeshastyarColors.TextPrimary,
                                modifier = Modifier.weight(1f),
                            )
                        }
                    }
                }
            }
            if (state.error != null && !state.mergeOpen) {
                Text(state.error!!, color = MaterialTheme.colorScheme.error)
            }
            if (state.message != null) {
                Text(state.message!!, color = MaterialTheme.colorScheme.primary)
            }
            if (state.selected.size >= 2) {
                Button(
                    onClick = vm::openMerge,
                    modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
                ) { Text("ادغام") }
            }
        }
    }
    if (state.mergeOpen) {
        androidx.compose.material3.AlertDialog(
            onDismissRequest = vm::cancelMerge,
            title = { Text("نام برچسب") },
            text = {
                Column {
                    OutlinedTextField(
                        value = state.targetName,
                        onValueChange = vm::onTarget,
                        label = { Text("نام برچسب") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth(),
                    )
                    if (state.error != null) {
                        Text(
                            state.error!!,
                            color = MaterialTheme.colorScheme.error,
                            modifier = Modifier.padding(top = 8.dp),
                        )
                    }
                }
            },
            confirmButton = {
                Button(onClick = vm::merge) { Text("تأیید") }
            },
            dismissButton = {
                OutlinedButton(onClick = vm::cancelMerge) { Text("انصراف") }
            },
            containerColor = NeshastyarColors.Surface,
        )
    }
}