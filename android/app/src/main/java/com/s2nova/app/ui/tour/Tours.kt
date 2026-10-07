package com.s2nova.app.ui.tour

import com.s2nova.app.ui.StringKey
import com.s2nova.app.ui.nav.NovaDestinations
import com.s2nova.app.ui.nav.baseRoute

// One step: the element to highlight (a `tourTarget` id; null is a centred
// step) and its copy. A step whose element isn't on screen is left out.
data class TourStep(val target: String?, val title: StringKey, val body: StringKey)

// Product tours (DESIGN-SYSTEM.md §6.13): a general one on the first visit
// to Inicio and one per main screen. A finished or skipped tour's key goes
// into the server's guidesSeen, shared with Web, so it never starts on its
// own again; Ajustes › "Ver los recorridos otra vez" clears the list.
object Tours {
    const val WELCOME = "tour.welcome"
    const val MOVIMIENTOS = "tour.movimientos"
    const val PLANES = "tour.planes"
    const val REPORTES = "tour.reportes"
    const val BILLETERAS = "tour.billeteras"
    const val NUEVO = "tour.nuevo"

    val all: Map<String, List<TourStep>> = mapOf(
        WELCOME to listOf(
            TourStep(null, StringKey.TOUR_WELCOME_INTRO_TITLE, StringKey.TOUR_WELCOME_INTRO_BODY),
            TourStep("inicio.balance", StringKey.TOUR_WELCOME_BALANCE_TITLE, StringKey.TOUR_WELCOME_BALANCE_BODY),
            TourStep("inicio.wallets", StringKey.TOUR_WELCOME_WALLETS_TITLE, StringKey.TOUR_WELCOME_WALLETS_BODY),
            TourStep("inicio.month", StringKey.TOUR_WELCOME_MONTH_TITLE, StringKey.TOUR_WELCOME_MONTH_BODY),
            TourStep("inicio.alerts", StringKey.TOUR_WELCOME_ALERTS_TITLE, StringKey.TOUR_WELCOME_ALERTS_BODY),
            TourStep("nav.add", StringKey.TOUR_WELCOME_ADD_TITLE, StringKey.TOUR_WELCOME_ADD_BODY),
            TourStep("nav.main", StringKey.TOUR_WELCOME_NAV_TITLE, StringKey.TOUR_WELCOME_NAV_BODY),
        ),
        MOVIMIENTOS to listOf(
            TourStep("mov.search", StringKey.TOUR_MOV_SEARCH_TITLE, StringKey.TOUR_MOV_SEARCH_BODY),
            TourStep("mov.filters", StringKey.TOUR_MOV_FILTERS_TITLE, StringKey.TOUR_MOV_FILTERS_BODY),
            TourStep("mov.scheduled", StringKey.TOUR_MOV_SCHEDULED_TITLE, StringKey.TOUR_MOV_SCHEDULED_BODY),
            TourStep("mov.row", StringKey.TOUR_MOV_ROW_TITLE, StringKey.TOUR_MOV_ROW_BODY),
        ),
        PLANES to listOf(
            TourStep("planes.tabs", StringKey.TOUR_PLANES_TABS_TITLE, StringKey.TOUR_PLANES_TABS_BODY),
            TourStep("planes.create", StringKey.TOUR_PLANES_CREATE_TITLE, StringKey.TOUR_PLANES_CREATE_BODY),
            TourStep("planes.card", StringKey.TOUR_PLANES_CARD_TITLE, StringKey.TOUR_PLANES_CARD_BODY),
        ),
        REPORTES to listOf(
            TourStep("rep.range", StringKey.TOUR_REP_RANGE_TITLE, StringKey.TOUR_REP_RANGE_BODY),
            TourStep("rep.totals", StringKey.TOUR_REP_TOTALS_TITLE, StringKey.TOUR_REP_TOTALS_BODY),
            TourStep("rep.breakdown", StringKey.TOUR_REP_BREAKDOWN_TITLE, StringKey.TOUR_REP_BREAKDOWN_BODY),
        ),
        BILLETERAS to listOf(
            TourStep("wal.total", StringKey.TOUR_WAL_TOTAL_TITLE, StringKey.TOUR_WAL_TOTAL_BODY),
            TourStep("wal.card", StringKey.TOUR_WAL_CARD_TITLE, StringKey.TOUR_WAL_CARD_BODY),
            TourStep("wal.add", StringKey.TOUR_WAL_ADD_TITLE, StringKey.TOUR_WAL_ADD_BODY),
        ),
        NUEVO to listOf(
            TourStep("nm.type", StringKey.TOUR_NM_TYPE_TITLE, StringKey.TOUR_NM_TYPE_BODY),
            TourStep("nm.amount", StringKey.TOUR_NM_AMOUNT_TITLE, StringKey.TOUR_NM_AMOUNT_BODY),
            TourStep("nm.category", StringKey.TOUR_NM_CATEGORY_TITLE, StringKey.TOUR_NM_CATEGORY_BODY),
            TourStep("nm.more", StringKey.TOUR_NM_MORE_TITLE, StringKey.TOUR_NM_MORE_BODY),
        ),
    )

    // The screen's tour. Editing a movement (its own route) has none.
    fun forRoute(route: String?): String? = when (baseRoute(route)) {
        NovaDestinations.HOME -> WELCOME
        NovaDestinations.TRANSACTIONS -> MOVIMIENTOS
        NovaDestinations.BUDGETS -> PLANES
        NovaDestinations.REPORTS -> REPORTES
        NovaDestinations.WALLETS -> BILLETERAS
        NovaDestinations.ADD_TRANSACTION -> NUEVO
        else -> null
    }

    // The steps that can run now: centred ones always, the rest only when
    // their element is on screen. Empty when nothing of the screen is there
    // yet (only centred steps left), so the tour waits.
    fun runnable(key: String, present: (String) -> Boolean): List<TourStep> {
        val steps = all[key].orEmpty().filter { it.target == null || present(it.target) }
        return if (steps.any { it.target != null }) steps else emptyList()
    }
}
