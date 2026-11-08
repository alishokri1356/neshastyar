package com.neshastyar.app.ui.screens.chat

import android.app.Activity
import android.content.ActivityNotFoundException
import android.content.Intent
import android.speech.RecognizerIntent
import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.platform.LocalContext
import java.util.Locale

@Composable
fun rememberSpeechInputLauncher(onResult: (String) -> Unit): () -> Unit {
    val context = LocalContext.current
    val launcher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.StartActivityForResult(),
    ) { result ->
        if (result.resultCode != Activity.RESULT_OK) return@rememberLauncherForActivityResult
        val matches = result.data?.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS)
        val text = matches?.firstOrNull()?.trim().orEmpty()
        if (text.isNotBlank()) onResult(text)
    }

    return remember(launcher) {
        {
            val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
                putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
                putExtra(RecognizerIntent.EXTRA_LANGUAGE, "fa-IR")
                putExtra(RecognizerIntent.EXTRA_LANGUAGE_PREFERENCE, "fa-IR")
                putExtra(RecognizerIntent.EXTRA_ONLY_RETURN_LANGUAGE_PREFERENCE, Locale("fa", "IR").toLanguageTag())
                putExtra(RecognizerIntent.EXTRA_PROMPT, "سؤال خود را بگویید")
            }
            try {
                launcher.launch(intent)
            } catch (_: ActivityNotFoundException) {
                Toast.makeText(
                    context,
                    "تشخیص گفتار روی این دستگاه در دسترس نیست",
                    Toast.LENGTH_SHORT,
                ).show()
            }
        }
    }
}
