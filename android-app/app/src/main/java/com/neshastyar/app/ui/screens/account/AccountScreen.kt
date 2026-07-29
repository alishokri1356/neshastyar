package com.neshastyar.app.ui.screens.account

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.neshastyar.app.ui.components.NeshastyarCard
import com.neshastyar.app.ui.components.NeshastyarPrimaryButton
import com.neshastyar.app.ui.components.NeshastyarSecondaryButton
import com.neshastyar.app.ui.components.NeshastyarTextField
import com.neshastyar.app.ui.theme.NeshastyarColors

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AccountScreen(
    onLoggedOut: () -> Unit,
    viewModel: AccountViewModel = hiltViewModel(),
) {
    val state by viewModel.ui.collectAsStateWithLifecycle()
    LaunchedEffect(state.loggedOut) { if (state.loggedOut) onLoggedOut() }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
    ) {
        Text(
            text = "تنظیمات",
            fontSize = 24.sp,
            fontWeight = FontWeight.Bold,
            color = NeshastyarColors.TextPrimary,
            modifier = Modifier.padding(bottom = 16.dp),
        )

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
    }
}
