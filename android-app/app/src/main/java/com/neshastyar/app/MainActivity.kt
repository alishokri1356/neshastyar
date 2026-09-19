package com.neshastyar.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Surface
import androidx.compose.ui.Modifier
import dagger.hilt.android.AndroidEntryPoint
import com.neshastyar.app.navigation.NeshastyarNavHost
import com.neshastyar.app.ui.theme.NeshastyarTheme

@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            NeshastyarTheme {
                Surface(modifier = Modifier.fillMaxSize()) {
                    NeshastyarNavHost()
                }
            }
        }
    }
}