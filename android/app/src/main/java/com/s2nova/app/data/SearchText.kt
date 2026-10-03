package com.s2nova.app.data

import java.text.Normalizer

private val MARKS = Regex("\\p{Mn}+")

// Text as the search compares it: lower case and without accents, so "cafe"
// finds "Café" and "ALIMENTACION" finds "Alimentación".
fun searchKey(text: String): String = MARKS.replace(Normalizer.normalize(text, Normalizer.Form.NFD), "").lowercase()

// True when every word of the query appears somewhere in the text, in any
// order. A blank query matches everything.
fun matchesSearch(text: String, query: String): Boolean {
    val haystack = searchKey(text)
    return searchKey(query).split(Regex("\\s+")).filter { it.isNotEmpty() }.all { it in haystack }
}
