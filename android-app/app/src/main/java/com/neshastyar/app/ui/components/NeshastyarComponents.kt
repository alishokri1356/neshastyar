package com.neshastyar.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Person
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import com.neshastyar.app.ui.theme.NeshastyarColors
import com.neshastyar.app.util.StatusStyle

val NeshastyarCardShape = RoundedCornerShape(16.dp)
val NeshastyarFieldShape = RoundedCornerShape(14.dp)
val NeshastyarButtonShape = RoundedCornerShape(14.dp)

@Composable
fun NeshastyarBackground(modifier: Modifier = Modifier, content: @Composable () -> Unit) {
    Box(
        modifier = modifier.background(
            Brush.verticalGradient(
                listOf(
                    NeshastyarColors.Background,
                    NeshastyarColors.BackgroundAlt,
                    NeshastyarColors.Background,
                ),
            ),
        ),
    ) {
        content()
    }
}

@Composable
fun NeshastyarCard(
    modifier: Modifier = Modifier,
    accentBar: Boolean = false,
    contentPadding: PaddingValues = PaddingValues(16.dp),
    content: @Composable ColumnScope.() -> Unit,
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .clip(NeshastyarCardShape)
            .background(NeshastyarColors.Surface)
            .border(
                width = 1.dp,
                color = if (accentBar) {
                    NeshastyarColors.Primary.copy(alpha = 0.45f)
                } else {
                    NeshastyarColors.Outline.copy(alpha = 0.45f)
                },
                shape = NeshastyarCardShape,
            )
            .padding(contentPadding),
        content = content,
    )
}
@Composable
fun NeshastyarPrimaryButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    loading: Boolean = false,
    icon: ImageVector? = null,
) {
    Button(
        onClick = onClick,
        enabled = enabled && !loading,
        modifier = modifier
            .fillMaxWidth()
            .height(52.dp),
        shape = NeshastyarButtonShape,
        colors = ButtonDefaults.buttonColors(
            containerColor = NeshastyarColors.Primary,
            contentColor = NeshastyarColors.OnPrimary,
            disabledContainerColor = NeshastyarColors.Primary.copy(alpha = 0.4f),
        ),
    ) {
        if (loading) {
            CircularProgressIndicator(
                color = NeshastyarColors.OnPrimary,
                strokeWidth = 2.dp,
                modifier = Modifier.size(22.dp),
            )
        } else {
            if (icon != null) {
                Icon(icon, contentDescription = null, modifier = Modifier.size(20.dp))
                Spacer(Modifier.width(8.dp))
            }
            Text(text, fontWeight = FontWeight.SemiBold)
        }
    }
}

@Composable
fun NeshastyarSecondaryButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
) {
    OutlinedButton(
        onClick = onClick,
        enabled = enabled,
        modifier = modifier
            .fillMaxWidth()
            .height(52.dp),
        shape = NeshastyarButtonShape,
        colors = ButtonDefaults.outlinedButtonColors(
            contentColor = NeshastyarColors.PrimaryBright,
        ),
        border = androidx.compose.foundation.BorderStroke(1.dp, NeshastyarColors.Primary.copy(alpha = 0.55f)),
    ) {
        Text(text, fontWeight = FontWeight.Medium)
    }
}

@Composable
fun NeshastyarTextField(
    value: String,
    onValueChange: (String) -> Unit,
    label: String,
    modifier: Modifier = Modifier,
    placeholder: String? = null,
    singleLine: Boolean = true,
    minLines: Int = 1,
    enabled: Boolean = true,
    leadingIcon: (@Composable () -> Unit)? = null,
    trailingIcon: (@Composable () -> Unit)? = null,
    visualTransformation: VisualTransformation = VisualTransformation.None,
    keyboardOptions: KeyboardOptions = KeyboardOptions.Default,
) {
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        label = { Text(label) },
        placeholder = placeholder?.let { { Text(it, color = NeshastyarColors.TextMuted) } },
        singleLine = singleLine,
        minLines = minLines,
        enabled = enabled,
        leadingIcon = leadingIcon,
        trailingIcon = trailingIcon,
        visualTransformation = visualTransformation,
        keyboardOptions = keyboardOptions,
        modifier = modifier.fillMaxWidth(),
        shape = NeshastyarFieldShape,
        colors = OutlinedTextFieldDefaults.colors(
            focusedContainerColor = NeshastyarColors.SurfaceElevated,
            unfocusedContainerColor = NeshastyarColors.SurfaceElevated,
            disabledContainerColor = NeshastyarColors.Surface,
            focusedBorderColor = NeshastyarColors.Primary,
            unfocusedBorderColor = NeshastyarColors.Outline,
            focusedLabelColor = NeshastyarColors.PrimaryBright,
            unfocusedLabelColor = NeshastyarColors.TextMuted,
            cursorColor = NeshastyarColors.PrimaryBright,
            focusedTextColor = NeshastyarColors.TextPrimary,
            unfocusedTextColor = NeshastyarColors.TextPrimary,
        ),
    )
}

@Composable
fun StatusChip(status: String?) {
    val label = StatusStyle.displayLabel(status)
    Surface(
        color = StatusStyle.background(status),
        shape = RoundedCornerShape(999.dp),
    ) {
        Text(
            text = label,
            color = StatusStyle.labelColor(status),
            style = MaterialTheme.typography.labelSmall,
            fontWeight = FontWeight.SemiBold,
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp),
        )
    }
}

@Composable
fun UserAvatarChip(label: String = "کاربر") {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Box(
            modifier = Modifier
                .size(36.dp)
                .clip(CircleShape)
                .background(NeshastyarColors.PrimaryContainer),
            contentAlignment = Alignment.Center,
        ) {
            Icon(
                Icons.Default.Person,
                contentDescription = null,
                tint = NeshastyarColors.PrimaryBright,
                modifier = Modifier.size(20.dp),
            )
        }
        Text(
            text = label,
            style = MaterialTheme.typography.labelLarge,
            color = NeshastyarColors.TextSecondary,
        )
    }
}

@Composable
fun SectionHeader(
    title: String,
    subtitle: String? = null,
    icon: ImageVector? = null,
    iconTint: Color = NeshastyarColors.PrimaryBright,
) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        if (icon != null) {
            Icon(icon, contentDescription = null, tint = iconTint, modifier = Modifier.size(20.dp))
            Spacer(Modifier.width(8.dp))
        }
        Column {
            Text(
                text = title,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold,
                color = NeshastyarColors.TextPrimary,
            )
            if (subtitle != null) {
                Text(
                    text = subtitle,
                    style = MaterialTheme.typography.bodySmall,
                    color = NeshastyarColors.TextMuted,
                )
            }
        }
    }
}
