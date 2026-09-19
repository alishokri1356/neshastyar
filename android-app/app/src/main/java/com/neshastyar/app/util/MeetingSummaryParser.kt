package com.neshastyar.app.util

import org.json.JSONArray
import org.json.JSONObject

data class ParsedMeetingSummary(
    val subject: String = "",
    val summaryText: String = "",
    val people: List<String> = emptyList(),
    val bulletPoints: List<String> = emptyList(),
    val tags: List<String> = emptyList(),
    val rawText: String = "",
    val isJson: Boolean = false,
)

object MeetingSummaryParser {
    private val peopleKeys = listOf("People in meetings", "People in Meetings", "participants", "Participants")
    private val bulletKeys = listOf("Bolet Points", "Bullet Points")
    private val tagKeys = listOf("Tags", "tags")

    fun parse(summary: String?, peopleField: String? = null): ParsedMeetingSummary {
        val fromPeopleColumn = parsePeopleField(peopleField)
        if (summary.isNullOrBlank()) {
            return ParsedMeetingSummary(people = fromPeopleColumn)
        }
        val raw = summary.trim()
        val obj = parseSummaryObject(raw)
            ?: return ParsedMeetingSummary(
                summaryText = raw,
                people = fromPeopleColumn,
                rawText = raw,
                isJson = false,
            )

        val fromSummary = firstStringList(obj, peopleKeys)
        return ParsedMeetingSummary(
            subject = obj.optString("Subject").ifBlank { obj.optString("subject") },
            summaryText = obj.optString("Summary").ifBlank { obj.optString("summary") },
            people = (fromSummary + fromPeopleColumn).distinct(),
            bulletPoints = firstBulletList(obj, bulletKeys),
            tags = firstStringList(obj, tagKeys),
            rawText = raw,
            isJson = true,
        )
    }

    private fun parsePeopleField(peopleField: String?): List<String> {
        if (peopleField.isNullOrBlank()) return emptyList()
        val trimmed = peopleField.trim()
        tryParseObject(trimmed)?.let { obj ->
            val nested = normalizeStringList(obj.opt("people"))
            if (nested.isNotEmpty()) return nested
        }
        try {
            val arr = JSONArray(trimmed)
            val values = normalizeStringList(arr)
            if (values.isNotEmpty()) return values
        } catch (_: Exception) {
            // fall through to comma-separated
        }
        return trimmed.split(',', '\n').map { it.trim() }.filter { it.isNotEmpty() }
    }

    private fun parseSummaryObject(summaryText: String): JSONObject? {
        val cleaned = stripFences(summaryText)

        tryParseObject(cleaned)?.let { return it }

        val extracted = extractJsonObject(cleaned)
        if (extracted != null) {
            tryParseObject(extracted)?.let { return it }
            tryParseObject(sanitizeJsonControlChars(extracted))?.let { return it }
        }

        return tryParseObject(sanitizeJsonControlChars(cleaned))
    }

    private fun tryParseObject(text: String): JSONObject? {
        return try {
            val value = JSONObject(text)
            value
        } catch (_: Exception) {
            null
        }
    }

    private fun stripFences(text: String): String {
        val fenced = Regex("^```(?:json)?\\s*([\\s\\S]*?)\\s*```$", RegexOption.IGNORE_CASE)
        return fenced.find(text.trim())?.groupValues?.getOrNull(1)?.trim() ?: text.trim()
    }

    private fun extractJsonObject(text: String): String? {
        val start = text.indexOf('{')
        if (start < 0) return null
        var depth = 0
        var inString = false
        var escaped = false
        for (i in start until text.length) {
            val ch = text[i]
            if (inString) {
                if (escaped) {
                    escaped = false
                } else if (ch == '\\') {
                    escaped = true
                } else if (ch == '"') {
                    inString = false
                }
                continue
            }
            when (ch) {
                '"' -> inString = true
                '{' -> depth++
                '}' -> {
                    depth--
                    if (depth == 0) return text.substring(start, i + 1)
                }
            }
        }
        return null
    }

    /** Escape raw control characters inside JSON strings (common AI output issue). */
    private fun sanitizeJsonControlChars(text: String): String {
        val result = StringBuilder()
        var inString = false
        var escaped = false
        for (ch in text) {
            val code = ch.code
            if (inString) {
                if (escaped) {
                    result.append(ch)
                    escaped = false
                    continue
                }
                if (ch == '\\') {
                    result.append(ch)
                    escaped = true
                    continue
                }
                if (ch == '"') {
                    result.append(ch)
                    inString = false
                    continue
                }
                if (code < 0x20) {
                    when (ch) {
                        '\n' -> result.append("\\n")
                        '\r' -> result.append("\\r")
                        '\t' -> result.append("\\t")
                        else -> result.append("\\u%04x".format(code))
                    }
                    continue
                }
                result.append(ch)
                continue
            }
            if (ch == '"') inString = true
            result.append(ch)
        }
        return result.toString()
    }

    private fun firstStringList(obj: JSONObject, keys: List<String>): List<String> {
        for (key in keys) {
            if (!obj.has(key) || obj.isNull(key)) continue
            val values = normalizeStringList(obj.opt(key))
            if (values.isNotEmpty()) return values
        }
        return emptyList()
    }

    private fun firstBulletList(obj: JSONObject, keys: List<String>): List<String> {
        for (key in keys) {
            if (!obj.has(key) || obj.isNull(key)) continue
            val values = normalizeBulletList(obj.opt(key))
            if (values.isNotEmpty()) return values
        }
        return emptyList()
    }

    private fun normalizeStringList(value: Any?): List<String> {
        return when (value) {
            null, JSONObject.NULL -> emptyList()
            is JSONArray -> buildList {
                for (i in 0 until value.length()) {
                    val item = value.opt(i) ?: continue
                    val text = when (item) {
                        is String -> item.trim()
                        is Number, is Boolean -> item.toString()
                        is JSONObject -> item.optString("name").ifBlank {
                            item.optString("Name").ifBlank { item.toString() }
                        }.trim()
                        else -> item.toString().trim()
                    }
                    if (text.isNotEmpty() && text != "null") add(text)
                }
            }
            is String -> value.split(',', '\n')
                .map { it.trim() }
                .filter { it.isNotEmpty() }
            else -> emptyList()
        }
    }

    private fun normalizeBulletList(value: Any?): List<String> {
        return when (value) {
            null, JSONObject.NULL -> emptyList()
            is JSONArray -> buildList {
                for (i in 0 until value.length()) {
                    val line = formatBullet(value.opt(i))
                    if (line.isNotEmpty()) add(line)
                }
            }
            is String -> value.split('\n').map { it.trim() }.filter { it.isNotEmpty() }
            is JSONObject -> listOfNotNull(formatBullet(value).ifBlank { null })
            else -> listOfNotNull(value.toString().trim().ifBlank { null })
        }
    }

    private fun formatBullet(item: Any?): String {
        return when (item) {
            null, JSONObject.NULL -> ""
            is String -> item.trim()
            is JSONObject -> {
                val keys = item.keys().asSequence().toList()
                if (keys.isEmpty()) ""
                else keys.joinToString(" — ") { k ->
                    "$k: ${item.opt(k)}"
                }.trim()
            }
            is Number, is Boolean -> item.toString()
            else -> item.toString().trim()
        }
    }
}