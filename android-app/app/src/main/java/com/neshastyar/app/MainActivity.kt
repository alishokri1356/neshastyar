package com.neshastyar.app

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Surface
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import dagger.hilt.android.AndroidEntryPoint
import com.neshastyar.app.navigation.AppLink
import com.neshastyar.app.navigation.AppLinks
import com.neshastyar.app.navigation.NeshastyarNavHost
import com.neshastyar.app.ui.theme.NeshastyarTheme

@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    private var pendingLink by mutableStateOf<AppLink?>(null)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        pendingLink = AppLinks.from(intent)
        enableEdgeToEdge()
        setContent {
            NeshastyarTheme {
                Surface(modifier = Modifier.fillMaxSize()) {
                    NeshastyarNavHost(
                        pendingLink = pendingLink,
                        onLinkConsumed = { pendingLink = null },
                    )
                }
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        pendingLink = AppLinks.from(intent)
    }
}
