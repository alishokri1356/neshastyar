package com.neshastyar.app.ui.screens.search

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import com.neshastyar.app.data.api.MeetingDto
import com.neshastyar.app.data.repository.MeetingsRepository
import com.neshastyar.app.data.repository.MeetingsResult
import com.neshastyar.app.ui.components.NeshastyarTextField
import com.neshastyar.app.ui.screens.home.MeetingListCard
import com.neshastyar.app.ui.theme.NeshastyarColors

data class SearchUiState(
    val query: String = "",
    val loading: Boolean = true,
    val error: String? = null,
    val meetings: List<MeetingDto> = emptyList(),
)

@HiltViewModel
class SearchViewModel @Inject constructor(
    private val meetingsRepository: MeetingsRepository,
) : ViewModel() {
    private val _ui = MutableStateFlow(SearchUiState())
    val ui = _ui.asStateFlow()

    init {
        load()
    }

    fun onQuery(value: String) = _ui.update { it.copy(query = value) }

    fun load() {
        viewModelScope.launch {
            _ui.update { it.copy(loading = true, error = null) }
            when (val result = meetingsRepository.listRecent(200)) {
                is MeetingsResult.Ok -> _ui.update { it.copy(loading = false, meetings = result.data) }
                is MeetingsResult.Err -> _ui.update { it.copy(loading = false, error = result.message) }
            }
        }
    }
}

@Composable
fun SearchScreen(
    onOpenMeeting: (String) -> Unit,
    viewModel: SearchViewModel = hiltViewModel(),
) {
    val state by viewModel.ui.collectAsStateWithLifecycle()
    val query = state.query.trim()
    val results = if (query.isEmpty()) {
        emptyList()
    } else {
        state.meetings.filter { meeting ->
            meeting.title.orEmpty().contains(query, ignoreCase = true)
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 16.dp, vertical = 12.dp),
    ) {
        Text(
            text = "جستجو",
            color = NeshastyarColors.TextPrimary,
            fontWeight = FontWeight.Bold,
            fontSize = 22.sp,
            modifier = Modifier.padding(bottom = 12.dp),
        )
        NeshastyarTextField(
            value = state.query,
            onValueChange = viewModel::onQuery,
            label = "نام جلسه",
            placeholder = "نام جلسه را بنویسید",
        )
        when {
            state.loading -> {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = NeshastyarColors.Primary)
                }
            }
            state.error != null -> {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text(state.error!!, color = NeshastyarColors.Error)
                }
            }
            query.isEmpty() -> {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text("برای دیدن نتیجه، نام جلسه را بنویسید", color = NeshastyarColors.TextMuted)
                }
            }
            results.isEmpty() -> {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text("جلسه‌ای با این نام پیدا نشد", color = NeshastyarColors.TextMuted)
                }
            }
            else -> {
                LazyColumn(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 16.dp),
                    contentPadding = PaddingValues(bottom = 24.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    items(results, key = { it.id }) { meeting ->
                        MeetingListCard(meeting = meeting, onClick = { onOpenMeeting(meeting.id) })
                    }
                }
            }
        }
    }
}
