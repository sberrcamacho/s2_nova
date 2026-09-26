package com.s2nova.app.ui.screens.addtransaction

import java.text.DecimalFormat
import java.text.DecimalFormatSymbols
import java.util.Locale
import kotlin.math.max
import kotlin.math.round

// The amount pad's arithmetic (NEW_MOVEMENT.md §3), ported from the
// mockup's evalExpr/press: `+ − × ÷`, "," decimal, `=`; × and ÷ bind
// tighter; ÷ 0 is ignored; results ≥ 0 with 2 decimals; max 12 digits per
// operand; one "," per operand; a second operator replaces the first.
object AmountPad {
    val OPS = listOf("+", "−", "×", "÷")
    val KEYPAD = listOf("1", "2", "3", "4", "5", "6", "7", "8", "9", ",", "0", "⌫")
    val CALC = listOf("C", "⌫", "÷", "×", "7", "8", "9", "−", "4", "5", "6", "+", "1", "2", "3", "=", "00", "0", ",")

    private val TOKEN = Regex("\\d+(?:,\\d*)?|[+−×÷]")

    fun hasOps(expr: String): Boolean = expr.any { it.toString() in OPS }

    fun eval(expr: String): Double {
        val toks = TOKEN.findAll(expr).map { it.value }.toList()
        val nums = mutableListOf<Double>()
        val ops = mutableListOf<String>()
        toks.forEach { if (it in OPS) ops += it else nums += (it.replace(',', '.').toDoubleOrNull() ?: 0.0) }
        if (nums.isEmpty()) return 0.0
        val o = ops.take(nums.size - 1)
        val n = mutableListOf(nums[0])
        val add = mutableListOf<String>()
        o.forEachIndexed { i, op ->
            val b = nums[i + 1]
            when (op) {
                "×" -> n[n.lastIndex] = n.last() * b
                "÷" -> n[n.lastIndex] = if (b != 0.0) n.last() / b else n.last()
                else -> { add += op; n += b }
            }
        }
        var r = n[0]
        add.forEachIndexed { i, op -> r = if (op == "+") r + n[i + 1] else r - n[i + 1] }
        return max(0.0, round(r * 100) / 100)
    }

    // "168500.5" → "168500,5"
    fun numStr(v: Double): String {
        val s = if (v % 1.0 == 0.0) v.toLong().toString() else (round(v * 100) / 100).toString()
        return s.replace('.', ',')
    }

    fun press(expr: String, key: String): String {
        var e = expr
        val seg = e.split(Regex("[+−×÷]")).last()
        val last = e.takeLast(1)
        when {
            key == "C" -> e = ""
            key == "⌫" -> e = e.dropLast(1)
            key in OPS -> {
                if (e.isEmpty()) return e
                e = if (last in OPS) e.dropLast(1) + key else (if (last == ",") e.dropLast(1) else e) + key
            }
            key == "=" -> {
                if (!hasOps(e)) return e
                e = numStr(eval(e))
            }
            key == "," -> {
                if (seg.contains(',')) return e
                e += if (seg.isNotEmpty()) "," else "0,"
            }
            else -> {
                if (seg.replace(",", "").length >= 12) return e
                if (key == "00" && seg.isEmpty()) return e
                if (seg == "0" && key != "00") e = e.dropLast(1)
                e += key
            }
        }
        return e
    }

    private val GROUP = DecimalFormat("#,##0", DecimalFormatSymbols(Locale.forLanguageTag("es-CO")).apply { groupingSeparator = '.' })

    // "150000+18500" → "150.000 + 18.500"
    fun format(expr: String): String =
        Regex("\\d+(,\\d*)?").replace(expr) { m ->
            val parts = m.value.split(',')
            GROUP.format(parts[0].toLong()) + (if (parts.size > 1) "," + parts[1] else "")
        }.replace(Regex("([+−×÷])"), " $1 ")

    // The value as shown in the display: live result with operators, else
    // the typed number.
    fun display(expr: String): String = when {
        hasOps(expr) -> {
            val v = eval(expr)
            val cents = round(v * 100) / 100
            if (cents % 1.0 == 0.0) GROUP.format(cents.toLong()) else GROUP.format(cents.toLong()) + "," + Math.round((cents % 1.0) * 100).toString().padStart(2, '0').trimEnd('0')
        }
        expr.isNotEmpty() -> format(expr)
        else -> "0"
    }
}
