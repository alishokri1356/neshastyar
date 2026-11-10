package com.neshastyar.app.ui.screens.report

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.net.Uri
import android.print.PrintAttributes
import android.print.PrintManager
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.foundation.layout.Box
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.neshastyar.app.data.api.MeetingDecisionDto
import com.neshastyar.app.data.api.PublicReportDto
import com.neshastyar.app.ui.theme.NeshastyarColors
import com.neshastyar.app.util.JalaliDates

private class ReportEditor(
    val title: String,
    val initial: String,
    val hint: String = "",
    val singleLine: Boolean = true,
    val onSave: (String) -> Unit,
)

@Composable
fun MeetingReportScreen(
    onBack: () -> Unit,
    viewModel: MeetingReportViewModel = hiltViewModel(),
) {
    val state by viewModel.ui.collectAsStateWithLifecycle()
    val context = LocalContext.current
    var editor by remember { mutableStateOf<ReportEditor?>(null) }
    var pendingDelete by remember { mutableStateOf<Int?>(null) }
    var copied by remember { mutableStateOf(false) }
    var printJob by remember { mutableIntStateOf(0) }
    var printHtml by remember { mutableStateOf("") }
    val logoPicker = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri ->
        if (uri != null) viewModel.uploadLogo(uri)
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(NeshastyarColors.Background),
    ) {
    Column(modifier = Modifier.fillMaxSize()) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 4.dp, vertical = 4.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            IconButton(onClick = onBack) {
                Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "بازگشت")
            }
            Text(
                text = "صورتجلسه",
                style = MaterialTheme.typography.titleLarge,
                modifier = Modifier.weight(1f),
            )
            TextButton(
                onClick = {
                    val report = state.report ?: return@TextButton
                    printHtml = reportHtml(report)
                    printJob += 1
                },
                enabled = state.report != null,
            ) { Text("چاپ") }
            TextButton(
                onClick = { shareReport(context, viewModel.token) },
                enabled = viewModel.token.isNotBlank(),
            ) { Text("اشتراک") }
        }

        when {
            state.loading -> LoadingPane()
            state.report == null -> {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center,
                ) {
                    Text(
                        text = state.error ?: "صورتجلسه پیدا نشد",
                        color = MaterialTheme.colorScheme.error,
                        textAlign = TextAlign.Center,
                    )
                    Button(onClick = viewModel::refresh, modifier = Modifier.padding(top = 16.dp)) {
                        Text("تلاش دوباره")
                    }
                }
            }
            else -> ReportBody(
                report = state.report!!,
                logo = state.logo,
                saving = state.saving,
                error = state.error,
                notice = if (copied) "لینک کپی شد" else state.notice,
                onDismissMessage = {
                    copied = false
                    viewModel.clearNotice()
                },
                onEdit = { editor = it },
                onSaveTitle = viewModel::saveTitle,
                onSaveDate = viewModel::saveDate,
                onSaveLocation = viewModel::saveLocation,
                onSaveOrgName = viewModel::saveOrgName,
                onSaveParticipants = viewModel::saveParticipants,
                onSaveDecision = viewModel::saveDecision,
                onAddDecision = viewModel::addDecision,
                onDeleteDecision = { pendingDelete = it },
                onPickLogo = { logoPicker.launch("image/*") },
                onCopy = {
                    copyText(context, publicReportUrl(viewModel.token))
                    copied = true
                },
            )
        }
    }

    editor?.let { current ->
        var draft by remember(current) { mutableStateOf(current.initial) }
        AlertDialog(
            onDismissRequest = { editor = null },
            title = { Text(current.title) },
            text = {
                Column {
                    if (current.hint.isNotBlank()) {
                        Text(
                            text = current.hint,
                            style = MaterialTheme.typography.bodySmall,
                            color = NeshastyarColors.TextMuted,
                            modifier = Modifier.padding(bottom = 8.dp),
                        )
                    }
                    OutlinedTextField(
                        value = draft,
                        onValueChange = { draft = it },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = current.singleLine,
                        minLines = if (current.singleLine) 1 else 3,
                    )
                }
            },
            confirmButton = {
                TextButton(onClick = {
                    current.onSave(draft)
                    editor = null
                }) { Text("ذخیره") }
            },
            dismissButton = {
                TextButton(onClick = { editor = null }) { Text("انصراف") }
            },
        )
    }

    pendingDelete?.let { index ->
        AlertDialog(
            onDismissRequest = { pendingDelete = null },
            title = { Text("حذف ردیف") },
            text = { Text("این ردیف تصمیم حذف شود؟") },
            confirmButton = {
                TextButton(onClick = {
                    viewModel.deleteDecision(index)
                    pendingDelete = null
                }) { Text("حذف") }
            },
            dismissButton = {
                TextButton(onClick = { pendingDelete = null }) { Text("انصراف") }
            },
        )
    }

    if (printJob > 0) {
        AndroidView(
            factory = { ctx -> WebView(ctx) },
            update = { webView ->
                if (webView.tag == printJob) return@AndroidView
                webView.tag = printJob
                webView.webViewClient = object : WebViewClient() {
                    private var printed = false
                    override fun onPageFinished(view: WebView?, url: String?) {
                        if (printed) return
                        printed = true
                        val manager = webView.context.getSystemService(Context.PRINT_SERVICE) as PrintManager
                        manager.print(
                            "صورتجلسه",
                            webView.createPrintDocumentAdapter("صورتجلسه"),
                            PrintAttributes.Builder().build(),
                        )
                    }
                }
                webView.loadDataWithBaseURL(null, printHtml, "text/html", "UTF-8", null)
            },
            modifier = Modifier
                .size(1.dp)
                .align(Alignment.TopStart),
        )
    }
    }
}

@Composable
private fun LoadingPane() {
    Column(
        modifier = Modifier.fillMaxSize(),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        CircularProgressIndicator()
    }
}

@Composable
private fun ReportBody(
    report: PublicReportDto,
    logo: Bitmap?,
    saving: Boolean,
    error: String?,
    notice: String?,
    onDismissMessage: () -> Unit,
    onEdit: (ReportEditor) -> Unit,
    onSaveTitle: (String) -> Unit,
    onSaveDate: (String) -> Unit,
    onSaveLocation: (String) -> Unit,
    onSaveOrgName: (String) -> Unit,
    onSaveParticipants: (String) -> Unit,
    onSaveDecision: (Int, String, String) -> Unit,
    onAddDecision: () -> Unit,
    onDeleteDecision: (Int) -> Unit,
    onPickLogo: () -> Unit,
    onCopy: () -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 16.dp, vertical = 8.dp),
    ) {
        if (saving) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                CircularProgressIndicator(modifier = Modifier.size(18.dp), strokeWidth = 2.dp)
                Text("در حال ذخیره...", modifier = Modifier.padding(start = 8.dp))
            }
        }
        if (!error.isNullOrBlank()) {
            Text(error, color = MaterialTheme.colorScheme.error, modifier = Modifier.padding(bottom = 4.dp))
            TextButton(onClick = onDismissMessage) { Text("بستن") }
        }
        if (!notice.isNullOrBlank()) {
            Text(notice, color = NeshastyarColors.PrimaryBright, modifier = Modifier.padding(bottom = 8.dp))
        }

        if (logo != null) {
            Image(
                bitmap = logo.asImageBitmap(),
                contentDescription = "لوگو",
                modifier = Modifier
                    .height(72.dp)
                    .padding(bottom = 8.dp),
                contentScale = ContentScale.Fit,
            )
        }
        OutlinedButton(onClick = onPickLogo, enabled = !saving) {
            Text(if (report.logoUrl.isNullOrBlank()) "افزودن لوگو" else "تغییر لوگو")
        }

        Spacer(Modifier.height(12.dp))
        EditableLine("نام سازمان", report.orgName.orEmpty().ifBlank { "—" }) {
            onEdit(ReportEditor("نام سازمان", report.orgName.orEmpty(), onSave = onSaveOrgName))
        }
        EditableLine("عنوان جلسه", report.title.ifBlank { "—" }) {
            onEdit(ReportEditor("عنوان جلسه", report.title, onSave = onSaveTitle))
        }
        EditableLine("تاریخ", JalaliDates.formatReportInput(report.meetingDate).ifBlank { "—" }) {
            onEdit(
                ReportEditor(
                    title = "تاریخ جلسه",
                    initial = JalaliDates.formatReportInput(report.meetingDate),
                    hint = "مثال: ۱۴۰۵/۰۸/۱۱ - ۱۶:۵۴. خالی کردن، تاریخ را پاک می‌کند.",
                    onSave = onSaveDate,
                ),
            )
        }
        EditableLine("مکان", report.location.ifBlank { "—" }) {
            onEdit(ReportEditor("مکان", report.location, onSave = onSaveLocation))
        }
        EditableLine("حاضرین", report.participants.joinToString("، ").ifBlank { "—" }) {
            onEdit(
                ReportEditor(
                    title = "حاضرین",
                    initial = report.participants.joinToString("، "),
                    hint = "نام‌ها را با ویرگول جدا کنید.",
                    singleLine = false,
                    onSave = onSaveParticipants,
                ),
            )
        }

        Text(
            text = "تصمیم‌ها",
            style = MaterialTheme.typography.titleMedium,
            modifier = Modifier.padding(top = 16.dp, bottom = 8.dp),
        )
        report.decisions.forEachIndexed { index, decision ->
            DecisionCard(
                index = index,
                decision = decision,
                enabled = !saving,
                onEdit = { part, title, value, multiline ->
                    onEdit(
                        ReportEditor(title, value, singleLine = !multiline) { draft ->
                            onSaveDecision(index, part, draft)
                        },
                    )
                },
                onDelete = { onDeleteDecision(index) },
            )
        }
        OutlinedButton(
            onClick = onAddDecision,
            enabled = !saving,
            modifier = Modifier.padding(top = 8.dp),
        ) {
            Icon(Icons.Filled.Add, contentDescription = null)
            Text("ردیف خالی", modifier = Modifier.padding(start = 6.dp))
        }
        TextButton(onClick = onCopy, modifier = Modifier.padding(top = 8.dp)) {
            Text("کپی لینک صورتجلسه")
        }
        Spacer(Modifier.height(24.dp))
    }
}

@Composable
private fun EditableLine(label: String, value: String, onClick: () -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp)
            .background(NeshastyarColors.Surface, RoundedCornerShape(12.dp))
            .padding(horizontal = 12.dp, vertical = 10.dp),
    ) {
        Text(label, style = MaterialTheme.typography.labelMedium, color = NeshastyarColors.TextMuted)
        Text(value, style = MaterialTheme.typography.bodyLarge, modifier = Modifier.padding(top = 2.dp))
        TextButton(onClick = onClick) { Text("ویرایش") }
    }
}

@Composable
private fun DecisionCard(
    index: Int,
    decision: MeetingDecisionDto,
    enabled: Boolean,
    onEdit: (part: String, title: String, value: String, multiline: Boolean) -> Unit,
    onDelete: () -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 6.dp)
            .background(NeshastyarColors.Surface, RoundedCornerShape(12.dp))
            .padding(12.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text("ردیف ${index + 1}", style = MaterialTheme.typography.titleMedium, modifier = Modifier.weight(1f))
            IconButton(onClick = onDelete, enabled = enabled) {
                Icon(Icons.Filled.Delete, contentDescription = "حذف ردیف", tint = NeshastyarColors.Error)
            }
        }
        DecisionField("متن تصمیم", decision.text.ifBlank { "—" }) {
            onEdit("text", "متن تصمیم", decision.text, true)
        }
        DecisionField("مسئول", decision.assignee.ifBlank { "—" }) {
            onEdit("assignee", "مسئول", decision.assignee, false)
        }
        DecisionField("مهلت", decision.deadline.ifBlank { "—" }) {
            onEdit("deadline", "مهلت", decision.deadline, false)
        }
    }
}

@Composable
private fun DecisionField(label: String, value: String, onClick: () -> Unit) {
    Text(label, style = MaterialTheme.typography.labelMedium, color = NeshastyarColors.TextMuted)
    Text(value, style = MaterialTheme.typography.bodyMedium, modifier = Modifier.padding(top = 2.dp))
    TextButton(onClick = onClick) { Text("ویرایش") }
}

private fun publicReportUrl(token: String): String =
    "https://www.neshastyar.com/report/${Uri.encode(token)}"

private fun copyText(context: Context, text: String) {
    val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
    clipboard.setPrimaryClip(ClipData.newPlainText("صورتجلسه", text))
}

private fun shareReport(context: Context, token: String) {
    val send = Intent(Intent.ACTION_SEND).apply {
        type = "text/plain"
        putExtra(Intent.EXTRA_TEXT, publicReportUrl(token))
    }
    context.startActivity(Intent.createChooser(send, "اشتراک صورتجلسه"))
}

private fun reportHtml(report: PublicReportDto): String {
    val rows = report.decisions.mapIndexed { index, decision ->
        "<tr><td>${index + 1}</td><td>${esc(decision.text)}</td><td>${esc(decision.assignee)}</td><td>${esc(decision.deadline)}</td></tr>"
    }.joinToString("")
    val people = esc(report.participants.joinToString("، "))
    return """
        <!DOCTYPE html>
        <html lang="fa" dir="rtl">
        <head>
          <meta charset="utf-8" />
          <style>
            body { font-family: sans-serif; color: #1c1b18; }
            h1 { font-size: 22px; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            th, td { border: 1px solid #e8e2d5; padding: 8px; vertical-align: top; }
            th { background: #f5f2eb; }
            .meta { margin: 4px 0; }
          </style>
        </head>
        <body>
          <h1>${esc(report.orgName.orEmpty())}</h1>
          <h2>${esc(report.title)}</h2>
          <p class="meta">تاریخ: ${esc(JalaliDates.formatReportInput(report.meetingDate))}</p>
          <p class="meta">مکان: ${esc(report.location)}</p>
          <p class="meta">حاضرین: $people</p>
          <table>
            <thead><tr><th>ردیف</th><th>تصمیم</th><th>مسئول</th><th>مهلت</th></tr></thead>
            <tbody>$rows</tbody>
          </table>
        </body>
        </html>
    """.trimIndent()
}

private fun esc(value: String): String = value
    .replace("&", "&amp;")
    .replace("<", "&lt;")
    .replace(">", "&gt;")
    .replace("\"", "&quot;")
