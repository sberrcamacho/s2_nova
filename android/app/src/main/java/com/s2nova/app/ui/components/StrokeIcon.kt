package com.s2nova.app.ui.components

import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.graphics.vector.addPathNodes
import androidx.compose.ui.unit.dp

// Builds an ImageVector from the v2 mockup's own outline glyphs (its
// `svg(paths, …)` helper: 24-unit viewBox, round 1.9 stroke, no fill), so
// chrome icons match the mockup exactly instead of a Material look-alike.
// Icon() tints the stroke.
fun strokeIcon(name: String, vararg paths: String, strokeWidth: Float = 1.9f): ImageVector =
    ImageVector.Builder(name = name, defaultWidth = 24.dp, defaultHeight = 24.dp, viewportWidth = 24f, viewportHeight = 24f)
        .apply {
            paths.forEach { d ->
                addPath(
                    pathData = addPathNodes(d),
                    fill = null,
                    stroke = SolidColor(Color.Black),
                    strokeLineWidth = strokeWidth,
                    strokeLineCap = StrokeCap.Round,
                    strokeLineJoin = StrokeJoin.Round,
                )
            }
        }
        .build()

object MockupIcons {
    val Inicio = strokeIcon("Inicio", "M3 10.2 12 3.4l9 6.8V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z")
    // Same four glyphs on Web (NAV_ICON_PATHS in web/src/components/v2/icons.tsx).
    val Movimientos = strokeIcon("Movimientos", "M4 8h16", "M16 4l4 4-4 4", "M20 16H4", "M8 12l-4 4 4 4")
    val Planes = strokeIcon("Planes", "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z", "M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10z", "M12 11a1 1 0 1 0 0 2 1 1 0 0 0 0-2z")
    val Reportes = strokeIcon("Reportes", "M4 4v16h16", "M9 16v-5", "M13 16V7", "M17 16v-3")
    val Bell = strokeIcon("Bell", "M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9", "M10.3 21a1.94 1.94 0 0 0 3.4 0")
    val Pencil = strokeIcon("Pencil", "M12 20h9", "M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z")
    val Calendar = strokeIcon("Calendar", "M4 5h16a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z", "M3 10h18", "M8 3v4", "M16 3v4")
    // Perfil row glyphs (the mockup's CAT_GLYPHS, drawn at stroke 2.25).
    val Billeteras = strokeIcon("Billeteras", "M3 7h18a1 1 0 0 1 1 1v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h12", "M17 13h.01", strokeWidth = 2.25f)
    val Programados = strokeIcon("Programados", "M3 12a9 9 0 0 1 15-6.7L21 8", "M21 3v5h-5", "M21 12a9 9 0 0 1-15 6.7L3 16", "M3 21v-5h5", strokeWidth = 2.25f)
    val Ajustes = strokeIcon(
        "Ajustes",
        "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
        "M4.5 9.5a2 2 0 0 1 .3-2.4l.7-.7a2 2 0 0 1 2.4-.3",
        "M14.1 4.6a2 2 0 0 1 2.4.3l.7.7a2 2 0 0 1 .3 2.4",
        "M19.5 14.5a2 2 0 0 1-.3 2.4l-.7.7a2 2 0 0 1-2.4.3",
        "M9.9 19.4a2 2 0 0 1-2.4-.3l-.7-.7a2 2 0 0 1-.3-2.4",
        strokeWidth = 2.25f,
    )
    val Scan = strokeIcon("Scan", "M3 7V5a2 2 0 0 1 2-2h2", "M17 3h2a2 2 0 0 1 2 2v2", "M21 17v2a2 2 0 0 1-2 2h-2", "M7 21H5a2 2 0 0 1-2-2v-2", "M3 12h18")
}
