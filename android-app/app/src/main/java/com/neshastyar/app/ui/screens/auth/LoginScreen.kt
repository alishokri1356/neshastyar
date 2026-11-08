package com.neshastyar.app.ui.screens.auth

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.systemBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material.icons.filled.Workspaces
import androidx.compose.material.icons.outlined.Email
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LocalTextStyle
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.style.TextDirection
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.neshastyar.app.R
import com.neshastyar.app.ui.components.NeshastyarPrimaryButton
import com.neshastyar.app.ui.components.NeshastyarTextField
import com.neshastyar.app.ui.theme.NeshastyarColors

private val LandingButtonColor = NeshastyarColors.PrimaryDeep
private val LandingButtonShape = RoundedCornerShape(30.dp)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LoginScreen(
    onLoggedIn: () -> Unit,
    onSignUp: () -> Unit,
    onForgotPassword: () -> Unit,
    viewModel: LoginViewModel = hiltViewModel(),
) {
    val state by viewModel.ui.collectAsStateWithLifecycle()
    val context = LocalContext.current
    var showEmailSheet by remember { mutableStateOf(false) }

    LaunchedEffect(state.loggedIn) {
        if (state.loggedIn) onLoggedIn()
    }

    Box(modifier = Modifier.fillMaxSize()) {
        Image(
            painter = painterResource(R.drawable.login_background),
            contentDescription = null,
            contentScale = ContentScale.Crop,
            modifier = Modifier.fillMaxSize(),
        )

        Column(
            modifier = Modifier
                .fillMaxSize()
                .systemBarsPadding()
                .padding(horizontal = 24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            LandingLogo(modifier = Modifier.padding(top = 36.dp))

            Spacer(Modifier.weight(1f))

            Text(
                text = "شما در جلسه حاضر باشید،\nنشست‌یار یادداشت‌ها را می‌نویسد.",
                color = NeshastyarColors.PrimaryDeep,
                fontFamily = FontFamily.Serif,
                fontSize = 26.sp,
                lineHeight = 42.sp,
                textAlign = TextAlign.Center,
            )

            Spacer(Modifier.weight(1.1f))

            if (state.error != null && !showEmailSheet) {
                Text(
                    text = state.error!!,
                    color = Color.White,
                    fontSize = 13.sp,
                    textAlign = TextAlign.Center,
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(12.dp))
                        .background(NeshastyarColors.Error.copy(alpha = 0.85f))
                        .padding(horizontal = 12.dp, vertical = 8.dp),
                )
                Spacer(Modifier.height(12.dp))
            }

            LandingButton(
                text = "ادامه با گوگل",
                loading = state.loading && !showEmailSheet,
                enabled = !state.loading,
                onClick = { viewModel.googleSignIn(context) },
                icon = { GoogleLogo(modifier = Modifier.size(22.dp)) },
            )
            Spacer(Modifier.height(12.dp))
            LandingButton(
                text = "ادامه با ایمیل",
                enabled = !state.loading,
                onClick = { showEmailSheet = true },
                icon = {
                    Icon(
                        Icons.Outlined.Email,
                        contentDescription = null,
                        tint = Color.White,
                        modifier = Modifier.size(22.dp),
                    )
                },
            )

            Text(
                text = "با ادامه، شرایط استفاده و حریم خصوصی نشست‌یار را می‌پذیرید.",
                color = Color.White.copy(alpha = 0.92f),
                fontSize = 13.sp,
                lineHeight = 22.sp,
                textAlign = TextAlign.Center,
                modifier = Modifier.padding(top = 16.dp, bottom = 20.dp),
            )
        }
    }

    if (showEmailSheet) {
        ModalBottomSheet(
            onDismissRequest = { showEmailSheet = false },
            sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true),
            containerColor = NeshastyarColors.Background,
        ) {
            EmailLoginForm(
                state = state,
                onEmail = viewModel::onEmail,
                onPassword = viewModel::onPassword,
                onLogin = viewModel::login,
                onForgotPassword = {
                    showEmailSheet = false
                    onForgotPassword()
                },
                onSignUp = {
                    showEmailSheet = false
                    onSignUp()
                },
            )
        }
    }
}

@Composable
private fun LandingLogo(modifier: Modifier = Modifier) {
    Row(
        modifier = modifier,
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Box(
            modifier = Modifier
                .size(38.dp)
                .clip(CircleShape)
                .background(NeshastyarColors.PrimaryDeep),
            contentAlignment = Alignment.Center,
        ) {
            Icon(
                Icons.Default.Workspaces,
                contentDescription = null,
                tint = NeshastyarColors.OnPrimary,
                modifier = Modifier.size(22.dp),
            )
        }
        Text(
            text = "نشست‌یار",
            color = NeshastyarColors.PrimaryDeep,
            fontWeight = FontWeight.Black,
            fontSize = 28.sp,
        )
    }
}

@Composable
private fun LandingButton(
    text: String,
    onClick: () -> Unit,
    icon: @Composable () -> Unit,
    enabled: Boolean = true,
    loading: Boolean = false,
) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(58.dp)
            .clip(LandingButtonShape)
            .background(LandingButtonColor)
            .clickable(enabled = enabled, onClick = onClick)
            .padding(horizontal = 22.dp),
        contentAlignment = Alignment.Center,
    ) {
        if (loading) {
            CircularProgressIndicator(
                color = Color.White,
                strokeWidth = 2.dp,
                modifier = Modifier.size(22.dp),
            )
        } else {
            Box(modifier = Modifier.align(Alignment.CenterStart)) { icon() }
            Text(
                text = text,
                color = Color.White,
                fontWeight = FontWeight.SemiBold,
                fontSize = 16.sp,
            )
        }
    }
}

@Composable
private fun EmailLoginForm(
    state: LoginUiState,
    onEmail: (String) -> Unit,
    onPassword: (String) -> Unit,
    onLogin: () -> Unit,
    onForgotPassword: () -> Unit,
    onSignUp: () -> Unit,
) {
    var passwordVisible by remember { mutableStateOf(false) }

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .navigationBarsPadding()
            .imePadding()
            .padding(horizontal = 24.dp)
            .padding(bottom = 24.dp),
    ) {
        Text(
            text = "ورود با ایمیل",
            color = NeshastyarColors.TextPrimary,
            fontWeight = FontWeight.Bold,
            fontSize = 22.sp,
        )
        Spacer(Modifier.height(20.dp))
        NeshastyarTextField(
            value = state.email,
            onValueChange = onEmail,
            label = "ایمیل",
            placeholder = "example@mail.com",
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
            textStyle = LocalTextStyle.current.copy(textDirection = TextDirection.Ltr, textAlign = TextAlign.Left),
            leadingIcon = {
                Icon(Icons.Default.Email, null, tint = NeshastyarColors.PrimaryBright)
            },
        )
        Spacer(Modifier.height(12.dp))
        NeshastyarTextField(
            value = state.password,
            onValueChange = onPassword,
            label = "رمز عبور",
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
            textStyle = LocalTextStyle.current.copy(textDirection = TextDirection.Ltr, textAlign = TextAlign.Left),
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
        TextButton(onClick = onForgotPassword) {
            Text("فراموشی رمز عبور؟", color = NeshastyarColors.TextMuted, fontSize = 13.sp)
        }

        if (state.error != null) {
            Text(
                text = state.error,
                color = NeshastyarColors.Error,
                modifier = Modifier.padding(bottom = 8.dp),
            )
        }

        NeshastyarPrimaryButton(
            text = "ورود",
            onClick = onLogin,
            loading = state.loading,
        )

        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = 12.dp),
            horizontalArrangement = Arrangement.Center,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text("حساب کاربری ندارید؟", color = NeshastyarColors.TextSecondary, fontSize = 14.sp)
            Spacer(Modifier.width(4.dp))
            Text(
                text = "ثبت‌نام کنید",
                color = NeshastyarColors.PrimaryBright,
                fontWeight = FontWeight.SemiBold,
                fontSize = 14.sp,
                textDecoration = TextDecoration.Underline,
                modifier = Modifier.clickable(onClick = onSignUp),
            )
        }
    }
}
