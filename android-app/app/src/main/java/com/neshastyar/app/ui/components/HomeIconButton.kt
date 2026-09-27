package com.neshastyar.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.neshastyar.app.ui.theme.NeshastyarColors

val LocalGoHome = staticCompositionLocalOf<() -> Unit> { {} }

@Composable
fun HomeIconButton(modifier: Modifier = Modifier) {
    val onHome = LocalGoHome.current
    Box(
        modifier = modifier
            .size(40.dp)
            .clip(RoundedCornerShape(10.dp))
            .background(NeshastyarColors.Primary)
            .clickable(onClick = onHome),
        contentAlignment = Alignment.Center,
    ) {
        Icon(
            Icons.Default.Home,
            contentDescription = "خانه",
            tint = Color.White,
            modifier = Modifier.size(22.dp),
        )
    }
}

@Composable
fun NeshastyarTopBar(onSearch: () -> Unit) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .background(NeshastyarColors.Background)
            .statusBarsPadding()
            .padding(horizontal = 12.dp, vertical = 8.dp),
    ) {
        IconButton(
            onClick = onSearch,
            modifier = Modifier.align(Alignment.CenterStart),
        ) {
            Icon(
                Icons.Default.Search,
                contentDescription = "جستجو",
                tint = NeshastyarColors.Primary,
                modifier = Modifier.size(26.dp),
            )
        }
        Text(
            text = "نشست یار",
            color = NeshastyarColors.Primary,
            fontWeight = FontWeight.Bold,
            fontSize = 22.sp,
            textAlign = TextAlign.Center,
            modifier = Modifier.align(Alignment.Center),
        )
        HomeIconButton(modifier = Modifier.align(Alignment.CenterEnd))
    }
}
