package com.neshastyar.app.ui.update

import android.content.Intent
import android.net.Uri
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import com.neshastyar.app.data.repository.AppUpdateInfo
import com.neshastyar.app.ui.theme.NeshastyarColors

@Composable
fun AppUpdateDialog(
    update: AppUpdateInfo,
    onDismiss: () -> Unit,
) {
    val context = LocalContext.current

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Text("نسخه جدید آماده است", fontWeight = FontWeight.SemiBold)
        },
        text = {
            Text(
                "نسخه ${update.latestVersion} روی سایت منتشر شده است. نسخه فعلی شما ${update.currentVersion} است. مایلید همین حالا دانلود کنید؟",
            )
        },
        confirmButton = {
            Button(
                onClick = {
                    val intent = Intent(Intent.ACTION_VIEW, Uri.parse(update.downloadUrl))
                    context.startActivity(intent)
                    onDismiss()
                },
            ) {
                Text("دانلود")
            }
        },
        dismissButton = {
            OutlinedButton(onClick = onDismiss) {
                Text("بعداً")
            }
        },
        containerColor = NeshastyarColors.Surface,
    )
}
