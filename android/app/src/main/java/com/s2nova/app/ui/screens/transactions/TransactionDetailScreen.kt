package com.s2nova.app.ui.screens.transactions

import android.content.Intent
import android.graphics.BitmapFactory
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.core.content.FileProvider
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.s2nova.app.data.AppContainer
import com.s2nova.app.data.fmtDate
import com.s2nova.app.data.fmtDateLong
import com.s2nova.app.data.formatMoney
import com.s2nova.app.data.model.BudgetKind
import com.s2nova.app.data.model.Transaction
import com.s2nova.app.data.model.TransactionStatus
import com.s2nova.app.data.model.TransactionType
import com.s2nova.app.data.repository.CategoryRepository
import com.s2nova.app.data.repository.displayName
import com.s2nova.app.ui.Confirm
import com.s2nova.app.ui.ConfirmRequest
import com.s2nova.app.ui.Snack
import com.s2nova.app.ui.components.CatMark
import com.s2nova.app.ui.components.MockupIcons
import com.s2nova.app.ui.components.NovaDraftSheet
import com.s2nova.app.ui.components.SheetHeader
import com.s2nova.app.ui.components.TNUM
import com.s2nova.app.ui.components.V2Icon
import com.s2nova.app.ui.components.V2Icons
import com.s2nova.app.ui.components.noRippleClick
import com.s2nova.app.ui.screens.addtransaction.AttachOptions
import com.s2nova.app.ui.screens.addtransaction.shortWallet
import com.s2nova.app.ui.screens.addtransaction.sizeLabel
import com.s2nova.app.ui.theme.NovaColors
import kotlinx.coroutines.launch
import java.io.ByteArrayOutputStream
import java.io.File
import kotlin.math.abs

// Movement detail (NEW_MOVEMENT.md §10): hero with the category mark, signed
// amount in its original currency, conversion line and status; the rows;
// "Comprobante" (thumbnail, Ver / Reemplazar / Quitar, full-screen viewer);
// and "Eliminar movimiento" with the two-step confirmation when significant.

// Significant movements need the two-step confirmation (NEW_MOVEMENT.md §9).
fun isSignificant(tx: Transaction): Boolean {
    val principal = AppContainer.currencyRepository.principal
    val absP = abs(tx.amount) * AppContainer.currencyRepository.rate(tx.currency, principal)
    return absP >= 200_000 || tx.attachment != null || tx.recurringSeriesId != null
}

// Deletes a movement: a minor one at once with "Deshacer" (the backend call
// waits until the snackbar closes), a significant one after both steps.
fun requestDelete(tx: Transaction, walletName: String, scope: kotlinx.coroutines.CoroutineScope, onDeleted: () -> Unit) {
    val repo = AppContainer.transactionRepository
    val finish = {
        AppContainer.appScope.launch {
            runCatching { repo.delete(tx.id, stopSeries = tx.recurringSeriesId != null) }
            if (!AppContainer.isGuest) {
                runCatching { AppContainer.walletRepository.refresh() }
                runCatching { AppContainer.budgetRepository.refresh() }
            }
        }
        Unit
    }
    if (!isSignificant(tx)) {
        repo.hideLocal(tx.id)
        if (AppContainer.isGuest) com.s2nova.app.data.repository.DemoLedger.applyToWallets(tx, -1)
        onDeleted()
        Snack.show("Movimiento eliminado", onUndo = {
            if (AppContainer.isGuest) repo.restoreLocal(tx) else repo.restoreLocal(tx)
        }, onTimeout = { if (!AppContainer.isGuest) finish() })
        return
    }
    val sign = if (tx.type == TransactionType.INCOME) "+" else "−"
    Confirm.ask(
        ConfirmRequest(
            title = "Eliminar “${tx.displayName(AppContainer.categoryRepository)}”",
            lines = listOfNotNull(
                sign + formatMoney(tx.amount, tx.currency) + " · " + fmtDateLong(tx.date) + " · " + walletName,
                tx.attachment?.let { "Su comprobante: " + it.name },
                if (tx.recurringSeriesId != null) "Las repeticiones futuras de este movimiento" else null,
                "El saldo de $walletName y tus presupuestos se recalculan",
            ),
            ack = "Entiendo que el movimiento" + (if (tx.attachment != null) " y su comprobante se eliminan" else " se elimina") + " para siempre.",
            cta = "Eliminar movimiento",
            onConfirm = { onDeleted(); finish() },
        ),
    )
}

@Composable
fun TransactionDetailScreen(
    transactionId: String,
    onBack: () -> Unit,
    onEdit: (String) -> Unit,
    onDeleted: () -> Unit,
) {
    val transactions by AppContainer.transactionRepository.transactions.collectAsStateWithLifecycle()
    val wallets by AppContainer.walletRepository.wallets.collectAsStateWithLifecycle()
    val budgets by AppContainer.budgetRepository.budgetProgress.collectAsStateWithLifecycle()
    val tx = transactions.firstOrNull { it.id == transactionId }
    val colors = NovaColors.current
    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    var viewer by remember { mutableStateOf(false) }
    var attachSheet by remember { mutableStateOf(false) }
    var bytes by remember(tx?.attachment?.id) { mutableStateOf<ByteArray?>(null) }
    val principal = AppContainer.currencyRepository.principal
    val repo = AppContainer.categoryRepository

    LaunchedEffect(tx?.attachment?.id) {
        if (tx?.attachment != null) bytes = AppContainer.transactionRepository.attachmentBytes(tx.id)
    }

    Column(Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)) {
        Row(Modifier.padding(start = 18.dp, end = 18.dp, top = 10.dp, bottom = 12.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            Box(Modifier.size(38.dp).clip(CircleShape).noRippleClick(onBack), contentAlignment = Alignment.Center) {
                Text("←", fontSize = 19.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            Text("Movimiento", fontSize = 17.sp, fontWeight = FontWeight.ExtraBold, letterSpacing = (-0.25).sp, color = MaterialTheme.colorScheme.onBackground, modifier = Modifier.weight(1f))
            if (tx != null && tx.loanKind == null && tx.parentLoanId == null) {
                Box(Modifier.size(38.dp).clip(CircleShape).noRippleClick { onEdit(tx.id) }, contentAlignment = Alignment.Center) {
                    Icon(MockupIcons.Pencil, contentDescription = "Editar", tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(17.dp))
                }
            }
        }
        if (tx == null) {
            Text("Este movimiento ya no existe.", fontSize = 12.5.sp, color = colors.textDim, modifier = Modifier.padding(24.dp))
            return@Column
        }
        val wallet = wallets.firstOrNull { it.id == tx.walletId }
        val walletName = wallet?.name?.let(::shortWallet) ?: ""
        val scheduled = tx.status == TransactionStatus.PLANNED
        val income = tx.type == TransactionType.INCOME
        val transfer = tx.type == TransactionType.TRANSFER
        Column(Modifier.weight(1f).verticalScroll(rememberScrollState()).padding(start = 20.dp, end = 20.dp, top = 4.dp, bottom = 24.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
            Column(
                Modifier.fillMaxWidth().clip(RoundedCornerShape(22.dp)).background(MaterialTheme.colorScheme.surface)
                    .border(1.dp, MaterialTheme.colorScheme.outline, RoundedCornerShape(22.dp)).padding(horizontal = 18.dp, vertical = 22.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                CatMark(if (transfer) CategoryRepository.TRANSFER else tx.subcategoryId ?: tx.category, 56.dp)
                Text(if (transfer) "Transferencia" else repo.label(tx.subcategoryId ?: tx.category), fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 4.dp))
                Text(
                    (if (income) "+" else if (transfer) "" else "−") + formatMoney(abs(tx.amount), tx.currency),
                    fontSize = 30.sp, lineHeight = 34.sp, fontWeight = FontWeight.ExtraBold, letterSpacing = (-0.9).sp, maxLines = 1,
                    color = if (scheduled || transfer) MaterialTheme.colorScheme.onBackground else if (income) colors.positive else colors.negative,
                    style = TextStyle(fontFeatureSettings = TNUM),
                )
                val wcur = wallet?.currency ?: principal
                if (tx.currency != wcur || tx.currency != principal) {
                    val rate = AppContainer.currencyRepository.rate(tx.currency, principal)
                    Text("≈ " + formatMoney(abs(tx.amount) * rate, principal) + " $principal · 1 ${tx.currency} = " + formatMoney(rate, principal), fontSize = 11.5.sp, color = colors.textDim, style = TextStyle(fontFeatureSettings = TNUM))
                }
                Text(
                    if (scheduled) "Programado · no afecta el saldo todavía" else "Registrado",
                    fontSize = 11.sp, fontWeight = FontWeight.ExtraBold, color = if (scheduled) colors.warning else colors.positive,
                    modifier = Modifier.padding(top = 4.dp).clip(RoundedCornerShape(999.dp)).background(if (scheduled) Color(0x29F0B429) else Color(0x2432C98A)).padding(horizontal = 10.dp, vertical = 4.dp),
                )
            }

            val autoBudget = if (!income && !transfer) budgets.firstOrNull { it.budget.kind == BudgetKind.CATEGORY && repo.isIn(tx.subcategoryId ?: tx.category, it.budget.category) } else null
            val series = tx.recurringSeriesId?.let { id -> AppContainer.recurringSeriesRepository.series.value.firstOrNull { it.id == id } }
            val rows = listOfNotNull(
                "Título" to tx.displayName(repo),
                if (tx.description.isNotBlank() && !tx.note.isNullOrBlank()) "Nota" to tx.note else null,
                "Fecha y hora" to fmtDateLong(tx.date) + " · " + tx.time,
                "Billetera" to walletName + " · " + (wallet?.currency ?: principal),
                tx.counterpartyName?.takeIf { income && it.isNotBlank() }?.let { "De" to it },
                tx.merchant?.takeIf { it.isNotBlank() }?.let { "Comercio" to it },
                autoBudget?.let { "Presupuesto" to (it.budget.name ?: repo.name(it.budget.category)) + " · " + it.percentage + "%" },
                series?.let { "Se repite" to "Cada " + mapOf("DAILY" to "día", "WEEKLY" to "semana", "MONTHLY" to "mes", "YEARLY" to "año")[it.interval.name] + (it.occurrences?.let { n -> " × $n" } ?: " · sin fecha de fin") },
            )
            Column(
                Modifier.fillMaxWidth().clip(RoundedCornerShape(18.dp)).background(MaterialTheme.colorScheme.surface)
                    .border(1.dp, MaterialTheme.colorScheme.outline, RoundedCornerShape(18.dp)).padding(horizontal = 16.dp, vertical = 2.dp),
            ) {
                rows.forEachIndexed { i, (label, value) ->
                    Row(
                        Modifier.fillMaxWidth().then(if (i < rows.size - 1) Modifier.drawBehind {
                            drawLine(colors.dividerSubtle, Offset(0f, size.height), Offset(size.width, size.height), 1.dp.toPx())
                        } else Modifier).padding(vertical = 12.dp),
                        horizontalArrangement = Arrangement.spacedBy(16.dp),
                        verticalAlignment = Alignment.Bottom,
                    ) {
                        Text(label, fontSize = 12.sp, color = colors.textDim, maxLines = 1)
                        Text(value, fontSize = 12.5.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onBackground, textAlign = TextAlign.End, modifier = Modifier.weight(1f), style = TextStyle(fontFeatureSettings = TNUM))
                    }
                }
            }

            Text("Comprobante", fontSize = 13.5.sp, fontWeight = FontWeight.ExtraBold, color = MaterialTheme.colorScheme.onBackground, modifier = Modifier.padding(top = 4.dp))
            val a = tx.attachment
            if (a != null) {
                Row(
                    Modifier.fillMaxWidth().clip(RoundedCornerShape(18.dp)).background(MaterialTheme.colorScheme.surface)
                        .border(1.dp, MaterialTheme.colorScheme.outline, RoundedCornerShape(18.dp)).padding(12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(14.dp),
                ) {
                    Thumb(a.isPdf, bytes, Modifier.size(width = 64.dp, height = 80.dp).noRippleClick { viewer = true })
                    Column(Modifier.weight(1f)) {
                        Text(a.name, fontSize = 13.sp, fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis, color = MaterialTheme.colorScheme.onBackground)
                        Text((if (a.isPdf) "PDF" else "Foto") + " · " + sizeLabel(a.size) + " · agregado el " + fmtDate(a.createdAt), fontSize = 11.sp, color = colors.textDim, modifier = Modifier.padding(top = 2.dp))
                        Row(Modifier.padding(top = 10.dp), horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                            Text("Ver", fontSize = 12.5.sp, fontWeight = FontWeight.ExtraBold, color = colors.accentText, modifier = Modifier.noRippleClick { viewer = true })
                            Text("Reemplazar", fontSize = 12.5.sp, fontWeight = FontWeight.ExtraBold, color = colors.accentText, modifier = Modifier.noRippleClick { attachSheet = true })
                            Text("Quitar", fontSize = 12.5.sp, fontWeight = FontWeight.ExtraBold, color = colors.negative, modifier = Modifier.noRippleClick {
                                val repoTx = AppContainer.transactionRepository
                                repoTx.hideAttachmentLocal(tx.id)
                                Snack.show("Comprobante quitado", onUndo = { repoTx.restoreAttachment(tx.id, a) }, onTimeout = {
                                    AppContainer.appScope.launch { runCatching { repoTx.removeAttachment(tx.id) } }
                                })
                            })
                        }
                    }
                }
            } else {
                val line2 = MaterialTheme.colorScheme.outlineVariant
                Row(
                    Modifier.fillMaxWidth().drawBehind {
                        drawRoundRect(line2, style = Stroke(1.5.dp.toPx(), pathEffect = PathEffect.dashPathEffect(floatArrayOf(6.dp.toPx(), 4.dp.toPx()))), cornerRadius = androidx.compose.ui.geometry.CornerRadius(16.dp.toPx()))
                    }.clip(RoundedCornerShape(16.dp)).noRippleClick { attachSheet = true }.padding(14.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp, Alignment.CenterHorizontally),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    V2Icon(V2Icons.clip, colors.accentText, 16.dp)
                    Text("Adjuntar recibo o factura", fontSize = 12.5.sp, fontWeight = FontWeight.ExtraBold, color = colors.accentText)
                }
            }
            Box(
                Modifier.padding(top = 6.dp).fillMaxWidth().clip(RoundedCornerShape(16.dp)).border(1.dp, colors.negative.copy(alpha = 0.3f), RoundedCornerShape(16.dp))
                    .noRippleClick { requestDelete(tx, walletName, scope, onDeleted) }.padding(14.dp),
                contentAlignment = Alignment.Center,
            ) { Text("Eliminar movimiento", fontSize = 13.sp, fontWeight = FontWeight.ExtraBold, color = colors.negative) }
        }

        if (viewer && tx.attachment != null) {
            val att = tx.attachment
            Dialog(onDismissRequest = { viewer = false }, properties = DialogProperties(usePlatformDefaultWidth = false)) {
                Column(Modifier.fillMaxSize().background(Color(0xF0050507)).padding(start = 20.dp, end = 20.dp, top = 16.dp, bottom = 28.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        Text(att.name, fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Color.White, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.weight(1f))
                        Box(Modifier.size(38.dp).clip(CircleShape).background(Color.White.copy(alpha = 0.1f)).noRippleClick { viewer = false }, contentAlignment = Alignment.Center) {
                            Text("✕", fontSize = 15.sp, color = Color.White)
                        }
                    }
                    Box(Modifier.weight(1f).fillMaxWidth().padding(vertical = 20.dp), contentAlignment = Alignment.Center) {
                        val bmp = remember(bytes) { bytes?.takeIf { !att.isPdf }?.let { BitmapFactory.decodeByteArray(it, 0, it.size) } }
                        if (bmp != null) {
                            Image(bmp.asImageBitmap(), contentDescription = att.name, contentScale = ContentScale.Fit, modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(14.dp)))
                        } else {
                            Column(
                                Modifier.widthIn(max = 300.dp).fillMaxWidth().aspectRatio(3f / 4f).clip(RoundedCornerShape(14.dp)).background(Color(0xFF13131D))
                                    .border(1.dp, Color.White.copy(alpha = 0.14f), RoundedCornerShape(14.dp)),
                                horizontalAlignment = Alignment.CenterHorizontally,
                                verticalArrangement = Arrangement.spacedBy(10.dp, Alignment.CenterVertically),
                            ) {
                                V2Icon(if (att.isPdf) V2Icons.file else V2Icons.image, if (att.isPdf) colors.negative else Color(0xFFA8A8B8), 22.dp)
                                Text("Vista previa del comprobante", fontSize = 12.sp, color = Color(0xFFA8A8B8))
                            }
                        }
                    }
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        Box(
                            Modifier.weight(1f).clip(RoundedCornerShape(14.dp)).border(1.dp, Color.White.copy(alpha = 0.2f), RoundedCornerShape(14.dp))
                                .noRippleClick { shareFile(context, att.name, att.mime, bytes, send = true) }.padding(13.dp),
                            contentAlignment = Alignment.Center,
                        ) { Text("Compartir", fontSize = 13.sp, fontWeight = FontWeight.ExtraBold, color = Color.White) }
                        Box(
                            Modifier.weight(1f).clip(RoundedCornerShape(14.dp)).background(MaterialTheme.colorScheme.primary)
                                .noRippleClick { shareFile(context, att.name, att.mime, bytes, send = false) }.padding(13.dp),
                            contentAlignment = Alignment.Center,
                        ) { Text("Descargar", fontSize = 13.sp, fontWeight = FontWeight.ExtraBold, color = Color.White) }
                    }
                }
            }
        }

        if (attachSheet) {
            val camera = rememberLauncherForActivityResult(ActivityResultContracts.TakePicturePreview()) { bmp ->
                if (bmp != null) {
                    val out = ByteArrayOutputStream()
                    bmp.compress(android.graphics.Bitmap.CompressFormat.JPEG, 90, out)
                    attachSheet = false
                    scope.launch { runCatching { AppContainer.transactionRepository.attach(tx.id, "foto-recibo.jpg", "image/jpeg", out.toByteArray()) }.onSuccess { Snack.show("Comprobante guardado en el movimiento") } }
                }
            }
            val pick = { uri: android.net.Uri? ->
                if (uri != null) {
                    val resolver = context.contentResolver
                    val mime = resolver.getType(uri) ?: "image/jpeg"
                    var name = "comprobante"
                    resolver.query(uri, arrayOf(android.provider.OpenableColumns.DISPLAY_NAME), null, null, null)?.use { c -> if (c.moveToFirst()) name = c.getString(0) ?: name }
                    val data = resolver.openInputStream(uri)?.use { it.readBytes() }
                    attachSheet = false
                    if (data != null && data.size <= 10 * 1024 * 1024) {
                        scope.launch { runCatching { AppContainer.transactionRepository.attach(tx.id, name, mime, data) }.onSuccess { Snack.show("Comprobante guardado en el movimiento") } }
                    } else if (data != null) Snack.show("El archivo supera 10 MB.")
                }
            }
            val gallery = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { pick(it) }
            val document = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) { pick(it) }
            NovaDraftSheet(onDismiss = { attachSheet = false }) {
                SheetHeader("Adjuntar comprobante", "Queda guardado con el movimiento y lo ves luego en su detalle.", bottom = 10.dp)
                AttachOptions({ camera.launch(null) }, { gallery.launch("image/*") }, { document.launch(arrayOf("application/pdf", "image/jpeg", "image/png")) })
            }
        }
    }
}

@Composable
private fun Thumb(isPdf: Boolean, bytes: ByteArray?, modifier: Modifier) {
    val colors = NovaColors.current
    val bmp = remember(bytes) { bytes?.takeIf { !isPdf }?.let { BitmapFactory.decodeByteArray(it, 0, it.size) } }
    val sheet = colors.sheetSurface
    val subtle = colors.dividerSubtle
    Box(
        modifier.clip(RoundedCornerShape(12.dp)).background(if (isPdf) colors.negativeBorder else sheet)
            .then(if (!isPdf && bmp == null) Modifier.drawBehind {
                // repeating-linear-gradient(135deg, surface2 0 8px, subtle 8px 16px)
                val step = 16.dp.toPx()
                var x = -size.height
                while (x < size.width) {
                    drawLine(subtle, Offset(x, size.height), Offset(x + size.height, 0f), 8.dp.toPx() * 0.7f)
                    x += step
                }
            } else Modifier)
            .border(1.dp, MaterialTheme.colorScheme.outlineVariant, RoundedCornerShape(12.dp)),
        contentAlignment = Alignment.Center,
    ) {
        if (bmp != null) Image(bmp.asImageBitmap(), contentDescription = null, contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize())
        else V2Icon(if (isPdf) V2Icons.file else V2Icons.image, if (isPdf) colors.negative else MaterialTheme.colorScheme.onSurfaceVariant, 22.dp)
    }
}

// "Compartir" / "Descargar": hands the file to the system share sheet or a
// viewer through the app's FileProvider.
private fun shareFile(context: android.content.Context, name: String, mime: String, bytes: ByteArray?, send: Boolean) {
    if (bytes == null) {
        Snack.show("El comprobante aún se está cargando.")
        return
    }
    val dir = File(context.cacheDir, "comprobantes").apply { mkdirs() }
    val file = File(dir, name).apply { writeBytes(bytes) }
    val uri = FileProvider.getUriForFile(context, context.packageName + ".files", file)
    val intent = if (send) Intent(Intent.ACTION_SEND).apply { type = mime; putExtra(Intent.EXTRA_STREAM, uri) }
    else Intent(Intent.ACTION_VIEW).apply { setDataAndType(uri, mime) }
    intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
    runCatching { context.startActivity(Intent.createChooser(intent, name)) }
}

