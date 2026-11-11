package com.neshastyar.app.util

import org.json.JSONArray
import org.json.JSONObject
import org.json.JSONTokener

data class MeetingDecisionRow(
    val text: String = "",
    val assignee: String = "",
    val deadline: String = "",
)

data class ParsedMeetingSummary(
    val subject: String = "",
    val summaryText: String = "",
    val location: String = "",
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
            location = firstLocation(obj),
            people = mergePeople(fromSummary, fromPeopleColumn),
            bulletPoints = firstBulletList(obj, bulletKeys),
            tags = firstStringList(obj, tagKeys),
            rawText = raw,
            isJson = true,
        )
    }

    /** One display name. Unwraps JSON quotes/backslashes left by double-encoded people values. */
    fun normalizePersonName(raw: String?): String {
        if (raw.isNullOrBlank()) return ""
        val trimmed = raw.trim()
        if (!looksEncoded(trimmed)) return cleanPersonName(trimmed)
        val decoded = decodeNameList(trimmed)
        return if (decoded.size == 1) decoded[0] else cleanPersonName(trimmed)
    }

    private fun parsePeopleField(peopleField: String?): List<String> {
        if (peopleField.isNullOrBlank()) return emptyList()
        return decodeNameList(peopleField.trim())
    }

    private fun mergePeople(primary: List<String>, extra: List<String>): List<String> {
        return (primary + extra)
            .map { cleanPersonName(it) }
            .filter { it.isNotEmpty() }
            .distinct()
    }

    /**
     * People may be a JSON array, a JSON object, or the same array encoded again as a string
     * (`"[\"Name\"]"`). A second encoding must be unwrapped before names are split, otherwise
     * each person is listed twice and the copy keeps quote and backslash characters.
     */
    private fun decodeNameList(raw: String, depth: Int = 0): List<String> {
        if (raw.isBlank() || depth > 6) return emptyList()
        val trimmed = raw.trim()

        if (trimmed.startsWith("[") || trimmed.startsWith("{") || trimmed.startsWith("\"")) {
            val parsed = try {
                JSONTokener(trimmed).nextValue()
            } catch (_: Exception) {
                null
            }
            when (parsed) {
                is JSONArray -> return finalizeNames(normalizeStringList(parsed, depth + 1))
                is JSONObject -> {
                    val fromObject = namesFromObject(parsed, depth + 1)
                    if (fromObject.isNotEmpty()) return fromObject
                }
                is String -> if (parsed != trimmed) {
                    val nested = decodeNameList(parsed, depth + 1)
                    if (nested.isNotEmpty()) return nested
                }
            }
        }

        if (trimmed.contains("\\\"")) {
            val restored = trimmed.replace("\\\"", "\"")
            if (restored != trimmed) {
                val nested = decodeNameList(restored, depth + 1)
                if (nested.isNotEmpty()) return nested
            }
        }

        return finalizeNames(trimmed.split(',', '\n').map { cleanPersonName(it) })
    }

    private fun namesFromObject(obj: JSONObject, depth: Int): List<String> {
        val nested = normalizeStringList(obj.opt("people"), depth)
        if (nested.isNotEmpty()) return finalizeNames(nested)
        return finalizeNames(firstStringList(obj, peopleKeys, depth))
    }

    private fun looksEncoded(text: String): Boolean {
        val trimmed = text.trim()
        return trimmed.startsWith("[") ||
            trimmed.startsWith("{") ||
            trimmed.startsWith("\"") ||
            trimmed.contains("\\\"")
    }

    private fun finalizeNames(names: List<String>): List<String> {
        return names.map { cleanPersonName(it) }.filter { it.isNotEmpty() }.distinct()
    }

    private fun cleanPersonName(raw: String): String {
        var name = raw.trim()
        if (name.isEmpty() || name.equals("null", ignoreCase = true)) return ""
        for (i in 0 until 4) {
            if (name.startsWith("\"") || name.startsWith("[")) {
                val decoded = try {
                    val value = JSONTokener(name).nextValue()
                    if (value is String && value != name) value.trim() else null
                } catch (_: Exception) {
                    null
                }
                if (decoded != null) {
                    name = decoded
                    continue
                }
            }
            val next = name.replace("\\\"", "").trim().trim('"', '[', ']', '\\')
            if (next == name) return name
            name = next
        }
        return name.trim()
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

    private val locationKeys = listOf("Location", "location", "محل تشکیل جلسه", "محل")

    private fun firstLocation(obj: JSONObject): String {
        for (key in locationKeys) {
            if (!obj.has(key) || obj.isNull(key)) continue
            val text = obj.optString(key).trim()
            if (text.isNotEmpty() && !text.equals("null", ignoreCase = true)) return text
        }
        return ""
    }

    private fun firstStringList(obj: JSONObject, keys: List<String>, depth: Int = 0): List<String> {
        for (key in keys) {
            if (!obj.has(key) || obj.isNull(key)) continue
            val values = normalizeStringList(obj.opt(key), depth)
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

    private fun normalizeStringList(value: Any?, depth: Int = 0): List<String> {
        if (depth > 6) return emptyList()
        return when (value) {
            null, JSONObject.NULL -> emptyList()
            is JSONArray -> buildList {
                for (i in 0 until value.length()) {
                    val item = value.opt(i) ?: continue
                    when (item) {
                        is String -> {
                            val text = item.trim()
                            if (text.isEmpty() || text == "null") continue
                            if (looksEncoded(text)) {
                                addAll(decodeNameList(text, depth + 1))
                            } else {
                                val cleaned = cleanPersonName(text)
                                if (cleaned.isNotEmpty()) add(cleaned)
                            }
                        }
                        is Number, is Boolean -> {
                            val text = item.toString().trim()
                            if (text.isNotEmpty() && text != "null") add(text)
                        }
                        is JSONObject -> {
                            val text = item.optString("name").ifBlank {
                                item.optString("Name").ifBlank { item.toString() }
                            }.trim()
                            val cleaned = cleanPersonName(text)
                            if (cleaned.isNotEmpty() && cleaned != "null") add(cleaned)
                        }
                        is JSONArray -> addAll(normalizeStringList(item, depth + 1))
                        else -> {
                            val cleaned = cleanPersonName(item.toString())
                            if (cleaned.isNotEmpty() && cleaned != "null") add(cleaned)
                        }
                    }
                }
            }
            is String -> decodeNameList(value, depth + 1)
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

    fun decisionRows(summary: String?): List<MeetingDecisionRow> {
        val obj = summary?.takeIf { it.isNotBlank() }?.let { parseSummaryObject(it) } ?: return emptyList()
        return decisionSlots(copyItems(rawBulletArray(obj))).map { it.decision }
    }

    fun summaryWithDecisionEdit(summary: String?, index: Int, part: String, value: String): String {
        val obj = editableSummaryObject(summary)
        val key = bulletArrayKey(obj)
        val items = copyItems(rawBulletArray(obj))
        val slot = decisionSlots(items).getOrNull(index) ?: return summary.orEmpty()
        val next = slot.decision.copy(
            text = if (part == "text") cleanDecisionValue(value) else slot.decision.text,
            assignee = if (part == "assignee") cleanDecisionValue(value) else slot.decision.assignee,
            deadline = if (part == "deadline") cleanDecisionValue(value) else slot.decision.deadline,
        )
        items[slot.rawIndex] = canonicalDecision(next)
        writeDecisionItems(obj, key, items)
        return obj.toString()
    }

    fun summaryWithAddedDecision(summary: String?): String {
        val obj = editableSummaryObject(summary)
        val key = bulletArrayKey(obj)
        val items = copyItems(rawBulletArray(obj))
        items.add("")
        writeDecisionItems(obj, key, items)
        return obj.toString()
    }

    fun summaryWithDeletedDecision(summary: String?, index: Int): String {
        val obj = editableSummaryObject(summary)
        val key = bulletArrayKey(obj)
        val items = copyItems(rawBulletArray(obj))
        val slot = decisionSlots(items).getOrNull(index) ?: return summary.orEmpty()
        items.removeAt(slot.rawIndex)
        writeDecisionItems(obj, key, items)
        return obj.toString()
    }

    /** Raw نکته rows, so a later summary save does not flatten مسئول and مهلت زمانی. */
    fun existingBulletArray(obj: JSONObject): JSONArray? {
        val key = bulletKeys.firstOrNull { name ->
            val value = obj.opt(name)
            value is JSONArray && value.length() > 0
        } ?: bulletKeys.firstOrNull { obj.opt(it) is JSONArray } ?: return null
        val value = obj.opt(key) as? JSONArray ?: return null
        return JSONArray(value.toString())
    }

    private fun editableSummaryObject(summary: String?): JSONObject {
        if (!summary.isNullOrBlank()) {
            parseSummaryObject(summary)?.let { return it }
            return JSONObject().put("Summary", summary.trim())
        }
        return JSONObject()
    }

    private fun bulletArrayKey(obj: JSONObject): String {
        return bulletKeys.firstOrNull { name ->
            val value = obj.opt(name)
            value is JSONArray && value.length() > 0
        } ?: bulletKeys.firstOrNull { obj.opt(it) is JSONArray } ?: bulletKeys.first()
    }

    private fun rawBulletArray(obj: JSONObject): JSONArray {
        val value = obj.opt(bulletArrayKey(obj))
        return if (value is JSONArray) value else JSONArray()
    }

    private fun copyItems(array: JSONArray): MutableList<Any?> {
        return MutableList(array.length()) { index ->
            val value = array.opt(index)
            if (value == null || value == JSONObject.NULL) "" else value
        }
    }

    private fun writeDecisionItems(obj: JSONObject, key: String, items: List<Any?>) {
        val array = JSONArray()
        for (item in items) {
            when (item) {
                null -> array.put("")
                is JSONObject -> array.put(JSONObject(item.toString()))
                is Boolean -> array.put(item)
                else -> array.put(item.toString())
            }
        }
        obj.put(key, array)
        for (other in bulletKeys) {
            if (other != key) obj.remove(other)
        }
    }

    private data class DecisionSlot(val rawIndex: Int, val decision: MeetingDecisionRow)

    private fun decisionSlots(items: List<Any?>): List<DecisionSlot> {
        val slots = mutableListOf<DecisionSlot>()
        items.forEachIndexed { index, item ->
            val decision = decisionFromItem(item)
            if (item == "" || decision.text.isNotEmpty() || decision.assignee.isNotEmpty() || decision.deadline.isNotEmpty()) {
                slots += DecisionSlot(index, decision)
            }
        }
        return slots
    }

    private fun decisionFromItem(item: Any?): MeetingDecisionRow {
        if (item is String) return decisionFromFields(splitDecisionLabels(item), item)
        if (item !is JSONObject) {
            val text = formatBullet(item)
            return decisionFromFields(splitDecisionLabels(text), text)
        }
        val keys = item.keys().asSequence().toList()
        val fields = keys.mapNotNull { key ->
            val raw = item.opt(key)
            val text = if (raw == null || raw == JSONObject.NULL) "" else raw.toString().trim()
            if (text.isEmpty()) null else DecisionField(decisionLabelKind(key), cleanDecisionValue(text))
        }
        val joined = keys.joinToString(" — ") { key -> "$key: ${item.opt(key) ?: ""}" }
        val labeled = splitDecisionLabels(joined)
        return decisionFromFields(if (labeled.isNotEmpty()) labeled else fields, joined)
    }

    private data class DecisionField(val kind: String, val value: String)

    private fun decisionFromFields(fields: List<DecisionField>, fallbackText: String): MeetingDecisionRow {
        var text = ""
        var assignee = ""
        var follower = ""
        var deadline = ""
        for (field in fields) {
            when (field.kind) {
                "deadline" -> if (deadline.isEmpty()) deadline = field.value
                "assignee" -> if (assignee.isEmpty()) assignee = field.value
                "follower" -> if (follower.isEmpty()) follower = field.value
                else -> if (text.isEmpty()) text = field.value
            }
        }
        val onlyLabeled = fields.isNotEmpty() && decisionLabelStart.containsMatchIn(fallbackText)
        if (text.isEmpty() && !onlyLabeled) {
            text = cleanDecisionValue(
                fallbackText.replace(Regex("^\\s*تصمیم(?:\\s+اتخاذ\\s+شده)?\\s*[:：]\\s*"), ""),
            )
        }
        return MeetingDecisionRow(text, assignee.ifBlank { follower }, deadline)
    }

    private fun splitDecisionLabels(source: String): List<DecisionField> {
        val matches = decisionLabelPattern.findAll(source).toList()
        if (matches.isEmpty()) return emptyList()
        return matches.mapIndexedNotNull { index, match ->
            val end = if (index + 1 < matches.size) matches[index + 1].range.first else source.length
            val value = cleanDecisionValue(
                source.substring(match.range.last + 1, end).replace(Regex("[\\s.،؛\\-—]+$"), ""),
            )
            if (value.isEmpty()) null else DecisionField(decisionLabelKind(match.groupValues[1]), value)
        }
    }

    private fun decisionLabelKind(label: String): String {
        val key = label.trim().lowercase()
        if (key == "deadline" || key == "due" || Regex("زمان|مهلت|موعد|تاریخ انجام").containsMatchIn(label)) {
            return "deadline"
        }
        if (Regex("مسئول|assignee|owner", RegexOption.IGNORE_CASE).containsMatchIn(label)) {
            return if (label.contains("پیگیری")) "follower" else "assignee"
        }
        return "text"
    }

    private fun cleanDecisionValue(value: String): String = value.replace(Regex("\\s+"), " ").trim()

    private fun canonicalDecision(row: MeetingDecisionRow): String {
        val parts = mutableListOf<String>()
        if (row.text.isNotEmpty()) parts += "تصمیم: ${row.text}"
        if (row.assignee.isNotEmpty()) parts += "مسئول: ${row.assignee}"
        if (row.deadline.isNotEmpty()) parts += "مهلت زمانی: ${row.deadline}"
        return parts.joinToString(" ")
    }

    private val decisionLabels = listOf(
        "تصمیم اتخاذ شده",
        "زمان انجام",
        "مهلت زمانی",
        "تاریخ انجام",
        "مسئول پیگیری",
        "مسئول اجرا",
        "deadline",
        "تصمیم",
        "مسئول",
        "مهلت",
        "موعد",
        "زمان",
        "due",
    )

    private val decisionLabelPattern = Regex("(${decisionLabels.joinToString("|")})\\s*[:：]")
    private val decisionLabelStart = Regex(
        "^\\s*(${decisionLabels.joinToString("|")})\\s*[:：]",
        RegexOption.IGNORE_CASE,
    )
}