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
    val Movimientos = strokeIcon("Movimientos", "M8 6h13", "M8 12h13", "M8 18h13", "M3.5 6h.01", "M3.5 12h.01", "M3.5 18h.01")
    val Planes = strokeIcon("Planes", "M3 8h15a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3H5a2 2 0 0 1-2-2z", "M3 8V6a2 2 0 0 1 2-2h11", "M17 14h.01")
    val Reportes = strokeIcon("Reportes", "M5 21V10", "M12 21V4", "M19 21v-7")
    val Bell = strokeIcon("Bell", "M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9", "M10.3 21a1.94 1.94 0 0 0 3.4 0")
    val Pencil = strokeIcon("Pencil", "M12 20h9", "M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z")
    val Scan = strokeIcon("Scan", "M3 7V5a2 2 0 0 1 2-2h2", "M17 3h2a2 2 0 0 1 2 2v2", "M21 17v2a2 2 0 0 1-2 2h-2", "M7 21H5a2 2 0 0 1-2-2v-2", "M3 12h18")
}
