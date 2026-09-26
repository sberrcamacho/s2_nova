package com.s2nova.app.data.mock

import com.s2nova.app.data.model.PaymentMethod
import com.s2nova.app.data.model.PaymentMethodOption

// Mirrors web/src/data/categories.ts — keep colors/icons/labels in sync if
// either side changes, since both surfaces are meant to look like one product.
val paymentMethods: List<PaymentMethodOption> = listOf(
    PaymentMethodOption(PaymentMethod.CASH, "Efectivo"),
    PaymentMethodOption(PaymentMethod.DEBIT_CARD, "Tarjeta débito"),
    PaymentMethodOption(PaymentMethod.CREDIT_CARD, "Tarjeta crédito"),
    PaymentMethodOption(PaymentMethod.BANK_TRANSFER, "Transferencia"),
    PaymentMethodOption(PaymentMethod.NEQUI, "Nequi"),
    PaymentMethodOption(PaymentMethod.DAVIPLATA, "Daviplata"),
)

val paymentMethodMap: Map<PaymentMethod, PaymentMethodOption> = paymentMethods.associateBy { it.id }
