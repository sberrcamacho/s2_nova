package com.s2nova.app.data

import java.math.BigInteger
import java.time.LocalDate

// Guest mode's copy of the backend's loan rule (backend/src/lib/loans.ts
// loanBalance): what a loan still owes on a day, given its abonos. Same
// integer arithmetic in minor units, so a guest sees what a real account
// would; a real account reads the server's figures instead. Keep the copies
// in step (LoanBalanceTest uses the backend's cases).
object LoanBalance {
    enum class Mode { NONE, FIXED, ON_BALANCE }
    enum class Period { MONTHLY, ANNUAL }

    data class Terms(
        val amountMinor: Long,
        val date: String, // yyyy-MM-dd
        val mode: Mode = Mode.NONE,
        val rate: Double = 0.0, // a percentage
        val period: Period = Period.MONTHLY,
        val from: String? = null, // yyyy-MM-dd
    )

    data class Payment(val amountMinor: Long, val date: String)

    data class Result(val principalOutstanding: Long, val interestAccrued: Long, val interestPaid: Long, val outstanding: Long)

    private val RATE_SCALE = BigInteger.valueOf(10_000)
    private val HUNDRED = BigInteger.valueOf(100)
    private val TWO = BigInteger.valueOf(2)

    private fun divRoundHalfUp(numerator: BigInteger, denominator: BigInteger): BigInteger =
        (numerator * TWO + denominator) / (denominator * TWO)

    private fun day(iso: String): Long = LocalDate.parse(iso.take(10)).toEpochDay()

    fun balance(loan: Terms, payments: List<Payment>, asOf: String): Result {
        val due = payments.filter { it.date.take(10) <= asOf.take(10) }.sortedBy { it.date }
        val paid = due.sumOf { it.amountMinor }
        val rate = BigInteger.valueOf(Math.round(loan.rate * 10_000))
        if (loan.mode == Mode.NONE || rate.signum() <= 0) {
            val principal = (loan.amountMinor - paid).coerceAtLeast(0)
            return Result(principal, 0, 0, principal)
        }
        if (loan.mode == Mode.FIXED) {
            val interest = divRoundHalfUp(BigInteger.valueOf(loan.amountMinor) * rate, HUNDRED * RATE_SCALE).toLong()
            val interestPaid = minOf(paid, interest)
            val principal = (loan.amountMinor - (paid - interestPaid)).coerceAtLeast(0)
            return Result(principal, interest, interestPaid, principal + interest - interestPaid)
        }
        val periodDays = BigInteger.valueOf(if (loan.period == Period.ANNUAL) 365 else 30)
        var cursor = maxOf(day(loan.date), day(loan.from ?: loan.date))
        var principal = loan.amountMinor
        var unpaidInterest = 0L
        var interestAccrued = 0L
        var interestPaid = 0L
        fun accrueTo(target: Long) {
            if (target <= cursor) return
            if (principal > 0) {
                val interest = divRoundHalfUp(BigInteger.valueOf(principal) * rate * BigInteger.valueOf(target - cursor), HUNDRED * RATE_SCALE * periodDays).toLong()
                unpaidInterest += interest
                interestAccrued += interest
            }
            cursor = target
        }
        for (payment in due) {
            accrueTo(day(payment.date))
            val toInterest = minOf(payment.amountMinor, unpaidInterest)
            unpaidInterest -= toInterest
            interestPaid += toInterest
            principal = (principal - (payment.amountMinor - toInterest)).coerceAtLeast(0)
        }
        accrueTo(day(asOf))
        return Result(principal, interestAccrued, interestPaid, principal + unpaidInterest)
    }

    // Where a loan stands now: every abono counts, even one dated after today.
    fun current(loan: Terms, payments: List<Payment>, today: String): Result {
        val last = payments.maxOfOrNull { it.date.take(10) }
        return balance(loan, payments, if (last != null && last > today.take(10)) last else today)
    }
}
