package com.s2nova.app.ui

import com.s2nova.app.data.model.WalletType

// The v2 mockup's wallet kinds (WALLET_KINDS / WALLET_GLYPHS), mapped onto
// the backend's AccountType. Shared by Billeteras and the first run.
enum class WalletKind(val label: String, val type: WalletType, val glyph: List<String>) {
    SAVINGS("Cuenta de ahorros", WalletType.SAVINGS, BANK),
    CHECKING("Cuenta corriente", WalletType.BANK_DEBIT, BANK),
    NEQUI("Nequi", WalletType.NEQUI, PHONE),
    DAVIPLATA("Daviplata", WalletType.DAVIPLATA, PHONE),
    CREDIT("Tarjeta de crédito", WalletType.BANK_CREDIT, listOf("M2 6h20v12H2z", "M2 10h20", "M6 14h4")),
    CASH("Efectivo", WalletType.CASH, listOf("M2 7h20a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1z", "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"));

    companion object {
        fun of(type: WalletType): WalletKind = when (type) {
            WalletType.SAVINGS, WalletType.CRYPTO, WalletType.OTHER -> SAVINGS
            WalletType.BANK_DEBIT -> CHECKING
            WalletType.NEQUI -> NEQUI
            WalletType.DAVIPLATA -> DAVIPLATA
            WalletType.BANK_CREDIT -> CREDIT
            WalletType.CASH -> CASH
        }

        private val KEYWORDS = listOf(
            NEQUI to listOf("nequi"),
            DAVIPLATA to listOf("daviplata", "davi plata"),
            CREDIT to listOf("tarjeta", "credito", "crédito", "visa", "master", "amex"),
            CHECKING to listOf("corriente"),
            SAVINGS to listOf("ahorro", "bancolombia", "davivienda", "bbva", "banco", "cuenta", "lulo", "scotia", "itau", "itaú"),
            CASH to listOf("efectivo", "caja", "billetera", "bolsillo", "cash"),
        )

        // guessWalletKind: the type suggested by the name.
        fun guess(name: String): WalletKind? {
            val n = name.lowercase().trim()
            if (n.isEmpty()) return null
            return KEYWORDS.firstOrNull { (_, keys) -> keys.any { n.contains(it) } }?.first
        }
    }
}

private val BANK = listOf("M12 3 2 8h20z", "M4 8v9", "M20 8v9", "M2 21h20", "M9 12v5", "M15 12v5")
private val PHONE = listOf("M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z", "M11 18h2")
