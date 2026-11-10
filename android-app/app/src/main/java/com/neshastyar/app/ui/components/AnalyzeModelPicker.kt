package com.neshastyar.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowDropDown
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Check
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.neshastyar.app.data.api.AnalyzeModelDto
import com.neshastyar.app.data.repository.MeetingsRepository
import com.neshastyar.app.ui.theme.NeshastyarColors

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AnalyzeModelPicker(
    value: String,
    models: List<AnalyzeModelDto>,
    autoKey: String = "auto",
    label: String = "مدل تحلیل هوش مصنوعی",
    enabled: Boolean = true,
    onValueChange: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    var open by remember { mutableStateOf(false) }
    val effectiveList = models.ifEmpty { MeetingsRepository.fallbackAnalyzeModels().models }
    val selectedKey = value.ifBlank { autoKey }
    val selectedLabel = MeetingsRepository.modelLabel(selectedKey, effectiveList, autoKey)

    val majorModels = remember(effectiveList) {
        effectiveList.filter { it.kind == "major" }
    }
    val openWeightModels = remember(effectiveList) {
        effectiveList.filter { it.kind == "open_weight" }
    }
    val otherModels = remember(effectiveList) {
        effectiveList.filter { it.kind != "major" && it.kind != "open_weight" }
    }

    Column(modifier = modifier.fillMaxWidth()) {
        if (label.isNotBlank()) {
            Text(
                text = label,
                color = NeshastyarColors.TextMuted,
                fontSize = 12.sp,
                fontWeight = FontWeight.Medium,
                modifier = Modifier.padding(bottom = 6.dp),
            )
        }
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .height(52.dp)
                .clip(NeshastyarFieldShape)
                .background(if (enabled) NeshastyarColors.SurfaceElevated else NeshastyarColors.Surface)
                .border(1.dp, NeshastyarColors.Outline, NeshastyarFieldShape)
                .clickable(enabled = enabled) { open = true }
                .padding(horizontal = 14.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Icon(
                Icons.Default.AutoAwesome,
                contentDescription = null,
                tint = NeshastyarColors.Secondary,
                modifier = Modifier.size(18.dp),
            )
            Text(
                text = selectedLabel,
                color = if (enabled) NeshastyarColors.TextPrimary else NeshastyarColors.TextMuted,
                fontSize = 14.sp,
                fontWeight = FontWeight.Medium,
                modifier = Modifier.weight(1f),
            )
            Icon(
                Icons.Default.ArrowDropDown,
                contentDescription = null,
                tint = NeshastyarColors.TextMuted,
            )
        }
    }

    if (open) {
        ModalBottomSheet(
            onDismissRequest = { open = false },
            sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true),
            containerColor = NeshastyarColors.Background,
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .navigationBarsPadding()
                    .verticalScroll(rememberScrollState())
                    .padding(horizontal = 20.dp)
                    .padding(bottom = 24.dp),
            ) {
                SectionHeader(
                    title = "انتخاب مدل تحلیل",
                    subtitle = "مدل هوش مصنوعی برای تحلیل و خلاصه‌سازی جلسه",
                    icon = Icons.Default.AutoAwesome,
                    iconTint = NeshastyarColors.Secondary,
                )
                Spacer(Modifier.height(12.dp))

                ModelOptionRow(
                    title = "Auto (پیشنهادی)",
                    subtitle = "انتخاب هوشمند بهترین مدل با جایگزین خودکار",
                    selected = selectedKey == autoKey,
                    onClick = {
                        onValueChange(autoKey)
                        open = false
                    },
                )

                if (majorModels.isNotEmpty()) {
                    HorizontalDivider(
                        modifier = Modifier.padding(vertical = 8.dp),
                        color = NeshastyarColors.Outline,
                    )
                    Text(
                        text = "مدل‌های اصلی",
                        color = NeshastyarColors.TextMuted,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.SemiBold,
                        modifier = Modifier.padding(vertical = 4.dp),
                    )
                    majorModels.forEach { model ->
                        ModelOptionRow(
                            title = model.label,
                            selected = selectedKey == model.key,
                            onClick = {
                                onValueChange(model.key)
                                open = false
                            },
                        )
                    }
                }

                if (openWeightModels.isNotEmpty()) {
                    HorizontalDivider(
                        modifier = Modifier.padding(vertical = 8.dp),
                        color = NeshastyarColors.Outline,
                    )
                    Text(
                        text = "مدل‌های متن‌باز",
                        color = NeshastyarColors.TextMuted,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.SemiBold,
                        modifier = Modifier.padding(vertical = 4.dp),
                    )
                    openWeightModels.forEach { model ->
                        ModelOptionRow(
                            title = model.label,
                            selected = selectedKey == model.key,
                            onClick = {
                                onValueChange(model.key)
                                open = false
                            },
                        )
                    }
                }

                otherModels.forEach { model ->
                    ModelOptionRow(
                        title = model.label,
                        selected = selectedKey == model.key,
                        onClick = {
                            onValueChange(model.key)
                            open = false
                        },
                    )
                }
            }
        }
    }
}

@Composable
private fun ModelOptionRow(
    title: String,
    subtitle: String? = null,
    selected: Boolean,
    onClick: () -> Unit,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(if (selected) NeshastyarColors.PrimaryContainer else NeshastyarColors.Surface)
            .border(
                width = 1.dp,
                color = if (selected) NeshastyarColors.Primary else NeshastyarColors.Outline,
                shape = RoundedCornerShape(12.dp),
            )
            .clickable(onClick = onClick)
            .padding(horizontal = 14.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = title,
                color = NeshastyarColors.TextPrimary,
                fontWeight = if (selected) FontWeight.Bold else FontWeight.Medium,
                fontSize = 14.sp,
            )
            if (!subtitle.isNullOrBlank()) {
                Text(
                    text = subtitle,
                    color = NeshastyarColors.TextMuted,
                    fontSize = 12.sp,
                )
            }
        }
        if (selected) {
            Icon(
                Icons.Default.Check,
                contentDescription = null,
                tint = NeshastyarColors.Primary,
                modifier = Modifier.size(20.dp),
            )
        }
    }
    Spacer(Modifier.height(6.dp))
}
