package com.neshastyar.app.ui.screens.auth

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material.icons.filled.Workspaces
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CheckboxDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.neshastyar.app.ui.components.NeshastyarCard
import com.neshastyar.app.ui.components.NeshastyarPrimaryButton
import com.neshastyar.app.ui.components.NeshastyarTextField
import com.neshastyar.app.ui.theme.NeshastyarColors

@Composable
fun LoginScreen(
    onLoggedIn: () -> Unit,
    onSignUp: () -> Unit,
    onForgotPassword: () -> Unit,
    viewModel: LoginViewModel = hiltViewModel(),
) {
    val state by viewModel.ui.collectAsStateWithLifecycle()
    var passwordVisible by remember { mutableStateOf(false) }
    var rememberMe by remember { mutableStateOf(true) }

    LaunchedEffect(state.loggedIn) {
        if (state.loggedIn) onLoggedIn()
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.verticalGradient(
                    listOf(NeshastyarColors.Background, Color(0xFF160B28), NeshastyarColors.Background),
                ),
            ),
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp, vertical = 32.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
        ) {
            Box(
                modifier = Modifier
                    .size(72.dp)
                    .shadow(16.dp, CircleShape, ambientColor = NeshastyarColors.Primary, spotColor = NeshastyarColors.Primary)
                    .background(
                        Brush.radialGradient(listOf(NeshastyarColors.PrimaryBright, NeshastyarColors.PrimaryDeep)),
                        CircleShape,
                    ),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    Icons.Default.Workspaces,
                    contentDescription = null,
                    tint = NeshastyarColors.OnPrimary,
                    modifier = Modifier.size(36.dp),
                )
            }
            Spacer(Modifier.height(20.dp))
            Text(
                text = "خوش آمدید",
                fontSize = 28.sp,
                fontWeight = FontWeight.Bold,
                color = NeshastyarColors.TextPrimary,
            )
            Text(
                text = "نشست یار؛ همراه هوشمند شما در مدیریت کسب‌وکار",
                color = NeshastyarColors.TextSecondary,
                textAlign = TextAlign.Center,
                modifier = Modifier.padding(top = 8.dp, bottom = 24.dp),
            )

            NeshastyarCard {
                NeshastyarTextField(
                    value = state.email,
                    onValueChange = viewModel::onEmail,
                    label = "ایمیل یا نام کاربری",
                    placeholder = "example@mail.com",
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                    leadingIcon = {
                        Icon(Icons.Default.Email, null, tint = NeshastyarColors.PrimaryBright)
                    },
                )
                Spacer(Modifier.height(12.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    TextButton(onClick = onForgotPassword) {
                        Text("فراموشی رمز عبور؟", color = NeshastyarColors.TextMuted, fontSize = 13.sp)
                    }
                    Text("رمز عبور", color = NeshastyarColors.TextSecondary, fontSize = 13.sp)
                }
                NeshastyarTextField(
                    value = state.password,
                    onValueChange = viewModel::onPassword,
                    label = "رمز عبور",
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                    visualTransformation = if (passwordVisible) {
                        VisualTransformation.None
                    } else {
                        PasswordVisualTransformation()
                    },
                    leadingIcon = {
                        Icon(Icons.Default.Lock, null, tint = NeshastyarColors.PrimaryBright)
                    },
                    trailingIcon = {
                        IconButton(onClick = { passwordVisible = !passwordVisible }) {
                            Icon(
                                if (passwordVisible) Icons.Default.VisibilityOff else Icons.Default.Visibility,
                                contentDescription = null,
                                tint = NeshastyarColors.TextMuted,
                            )
                        }
                    },
                )
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.padding(top = 8.dp),
                ) {
                    Checkbox(
                        checked = rememberMe,
                        onCheckedChange = { rememberMe = it },
                        colors = CheckboxDefaults.colors(
                            checkedColor = NeshastyarColors.Primary,
                            uncheckedColor = NeshastyarColors.Outline,
                        ),
                    )
                    Text("مرا به خاطر بسپار", color = NeshastyarColors.TextSecondary)
                }

                if (state.error != null) {
                    Text(
                        text = state.error!!,
                        color = NeshastyarColors.Error,
                        modifier = Modifier.padding(vertical = 8.dp),
                    )
                }

                Spacer(Modifier.height(8.dp))
                NeshastyarPrimaryButton(
                    text = "ورود به پنل کاربری",
                    onClick = viewModel::login,
                    loading = state.loading,
                )

                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 16.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    HorizontalDivider(modifier = Modifier.weight(1f), color = NeshastyarColors.Outline)
                    Text(
                        "یا ورود با",
                        color = NeshastyarColors.TextMuted,
                        modifier = Modifier.padding(horizontal = 12.dp),
                        fontSize = 12.sp,
                    )
                    HorizontalDivider(modifier = Modifier.weight(1f), color = NeshastyarColors.Outline)
                }

                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    SocialPlaceholder("گوگل", Modifier.weight(1f))
                    SocialPlaceholder("اپل", Modifier.weight(1f))
                }
            }

            TextButton(onClick = onSignUp, modifier = Modifier.padding(top = 20.dp)) {
                Text(
                    text = "حساب کاربری ندارید؟ ثبت‌نام کنید",
                    color = NeshastyarColors.TextPrimary,
                )
            }
        }
    }
}

@Composable
private fun SocialPlaceholder(label: String, modifier: Modifier = Modifier) {
    Box(
        modifier = modifier
            .height(48.dp)
            .background(NeshastyarColors.SurfaceElevated, androidx.compose.foundation.shape.RoundedCornerShape(12.dp))
            .padding(horizontal = 12.dp),
        contentAlignment = Alignment.Center,
    ) {
        Text(label, color = NeshastyarColors.TextSecondary, fontWeight = FontWeight.Medium)
    }
}
