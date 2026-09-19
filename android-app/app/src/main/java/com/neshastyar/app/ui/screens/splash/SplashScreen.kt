package com.neshastyar.app.ui.screens.splash

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Psychology
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.neshastyar.app.ui.screens.auth.SplashViewModel
import com.neshastyar.app.ui.theme.NeshastyarColors

@Composable
fun SplashScreen(
    onGoHome: () -> Unit,
    onGoLogin: () -> Unit,
    viewModel: SplashViewModel = hiltViewModel(),
) {
    val dest by viewModel.dest.collectAsStateWithLifecycle()

    LaunchedEffect(Unit) {
        viewModel.start()
    }

    LaunchedEffect(dest) {
        when (dest) {
            SplashViewModel.Dest.Home -> onGoHome()
            SplashViewModel.Dest.Login -> onGoLogin()
            SplashViewModel.Dest.Loading -> Unit
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.verticalGradient(
                    listOf(
                        NeshastyarColors.Background,
                        Color(0xFF1A0B2E),
                        NeshastyarColors.Background,
                    ),
                ),
            ),
        contentAlignment = Alignment.Center,
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
            modifier = Modifier.padding(32.dp),
        ) {
            Box(
                modifier = Modifier
                    .size(110.dp)
                    .shadow(
                        elevation = 24.dp,
                        shape = CircleShape,
                        ambientColor = NeshastyarColors.Primary,
                        spotColor = NeshastyarColors.Primary,
                    )
                    .background(
                        Brush.radialGradient(
                            listOf(NeshastyarColors.PrimaryBright, NeshastyarColors.PrimaryDeep),
                        ),
                        CircleShape,
                    ),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    Icons.Default.Psychology,
                    contentDescription = null,
                    tint = NeshastyarColors.OnPrimary,
                    modifier = Modifier.size(56.dp),
                )
            }
            Spacer(Modifier.height(28.dp))
            Text(
                text = "نشست یار",
                fontSize = 36.sp,
                fontWeight = FontWeight.Bold,
                color = NeshastyarColors.TextPrimary,
                textAlign = TextAlign.Center,
            )
            Text(
                text = "دستیار هوشمند جلسات",
                fontSize = 16.sp,
                color = NeshastyarColors.TextSecondary,
                modifier = Modifier.padding(top = 8.dp),
                textAlign = TextAlign.Center,
            )
            Spacer(Modifier.height(28.dp))
            Box(
                modifier = Modifier
                    .width(160.dp)
                    .height(2.dp)
                    .background(
                        Brush.horizontalGradient(
                            listOf(
                                NeshastyarColors.Primary.copy(alpha = 0f),
                                NeshastyarColors.PrimaryBright,
                                NeshastyarColors.Primary.copy(alpha = 0f),
                            ),
                        ),
                    ),
            )
            Spacer(Modifier.height(20.dp))
            Text(
                text = "در حال پردازش داده‌های صوتی و سازماندهی ذهن شما…",
                fontSize = 13.sp,
                color = NeshastyarColors.TextMuted,
                textAlign = TextAlign.Center,
                modifier = Modifier.padding(horizontal = 16.dp),
            )
        }
    }
}
