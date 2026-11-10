package com.neshastyar.app.ui.screens.account

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.neshastyar.app.ui.components.AnalyzeModelPicker
import com.neshastyar.app.ui.components.NeshastyarCard
import com.neshastyar.app.ui.components.NeshastyarPrimaryButton
import com.neshastyar.app.ui.components.NeshastyarSecondaryButton
import com.neshastyar.app.ui.components.NeshastyarTextField
import com.neshastyar.app.ui.theme.NeshastyarColors

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AccountScreen(
    onBack: () -> Unit,
    onLoggedOut: () -> Unit,
    viewModel: AccountViewModel = hiltViewModel(),
) {
    val state by viewModel.ui.collectAsStateWithLifecycle()
    LaunchedEffect(state.loggedOut) { if (state.loggedOut) onLoggedOut() }

    val logoPicker = rememberLauncherForActivityResult(
        ActivityResultContracts.GetContent(),
    ) { uri ->
        if (uri != null) viewModel.uploadLogo(uri)
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(bottom = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            IconButton(onClick = onBack) {
                Icon(
                    Icons.AutoMirrored.Filled.ArrowBack,
                    contentDescription = "بازگشت",
                    tint = NeshastyarColors.Primary,
                )
            }
            Text(
                text = "تنظیمات",
                fontSize = 24.sp,
                fontWeight = FontWeight.Bold,
                color = NeshastyarColors.TextPrimary,
                modifier = Modifier.weight(1f),
            )
        }

        NeshastyarCard {
            Text("ایمیل", color = NeshastyarColors.TextMuted, fontSize = 12.sp)
            Text(
                text = state.email.ifBlank { "—" },
                color = NeshastyarColors.TextPrimary,
                fontWeight = FontWeight.Medium,
                modifier = Modifier.padding(top = 4.dp, bottom = 16.dp),
            )
            NeshastyarTextField(
                value = state.name,
                onValueChange = viewModel::onName,
                label = "نام",
                placeholder = "نام خود را وارد کنید",
            )
            Spacer(Modifier.height(12.dp))
            NeshastyarTextField(
                value = state.baleID,
                onValueChange = viewModel::onBale,
                label = "شناسه بله",
                placeholder = "شناسه بله خود را وارد کنید",
            )
            Spacer(Modifier.height(12.dp))
            AnalyzeModelPicker(
                value = state.defaultAnalyzeModel,
                models = state.analyzeModels,
                autoKey = state.autoKey,
                label = "مدل تحلیل پیش‌فرض",
                enabled = !state.saving,
                onValueChange = viewModel::onDefaultModel,
            )
            Spacer(Modifier.height(12.dp))
            NeshastyarTextField(
                value = state.orgName,
                onValueChange = viewModel::onOrgName,
                label = "نام سازمان (سربرگ صورتجلسه)",
                placeholder = "نام سازمان برای سربرگ صورتجلسه",
            )
            Spacer(Modifier.height(10.dp))
            NeshastyarSecondaryButton(
                text = when {
                    state.uploadingLogo -> "در حال بارگذاری نشان…"
                    state.hasLogo -> "تغییر نشان سازمان (ثبت شده)"
                    else -> "انتخاب نشان سازمان برای صورتجلسه"
                },
                enabled = !state.uploadingLogo && !state.saving,
                onClick = { logoPicker.launch("image/*") },
            )

            if (state.message != null) {
                Text(state.message!!, color = NeshastyarColors.PrimaryBright, modifier = Modifier.padding(top = 12.dp))
            }
            if (state.error != null) {
                Text(state.error!!, color = NeshastyarColors.Error, modifier = Modifier.padding(top = 12.dp))
            }

            Spacer(Modifier.height(16.dp))
            NeshastyarPrimaryButton(
                text = "ذخیره",
                onClick = viewModel::save,
                loading = state.saving,
            )
            Spacer(Modifier.height(10.dp))
            NeshastyarSecondaryButton(
                text = "خروج",
                onClick = viewModel::logout,
            )
        }

        Spacer(Modifier.height(20.dp))
        Text(
            text = "نسخه برنامه: ${com.neshastyar.app.BuildConfig.VERSION_NAME}",
            color = NeshastyarColors.TextMuted,
            fontSize = 12.sp,
            modifier = Modifier
                .align(Alignment.CenterHorizontally)
                .padding(bottom = 16.dp),
        )
    }
}
