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
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import com.s2nova.app.ui.components.BackHeader
import com.s2nova.app.ui.theme.NovaType
import kotlinx.coroutines.launch
import java.io.ByteArrayOutputStream
import java.io.File
import kotlin.math.abs
import com.s2nova.app.ui.tr
import com.s2nova.app.ui.StringKey

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
        Snack.show(tr(StringKey.MV_DELETED), onUndo = {
            if (AppContainer.isGuest) repo.restoreLocal(tx) else repo.restoreLocal(tx)
        }, onTimeout = { if (!AppContainer.isGuest) finish() })
        return
    }
    val sign = if (tx.type == TransactionType.INCOME) "+" else "−"
    Confirm.ask(
        ConfirmRequest(
            title = tr(StringKey.MV_DELETE_TITLE, tx.displayName(AppContainer.categoryRepository)),
            lines = listOfNotNull(
                sign + formatMoney(tx.amount, tx.currency) + " · " + fmtDateLong(tx.date) + " · " + walletName,
                tx.attachment?.let { tr(StringKey.MV_DELETE_RECEIPT, it.name) },
                if (tx.recurringSeriesId != null) tr(StringKey.MV_DELETE_REPEATS) else null,
                tr(StringKey.MV_DELETE_BALANCE, walletName),
            ),
            ack = tr(if (tx.attachment != null) StringKey.MV_DELETE_ACK_RECEIPT else StringKey.MV_DELETE_ACK),
            cta = tr(StringKey.MV_DELETE),
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
        BackHeader(title = tr(StringKey.MV_TITLE), onBack = onBack, action = {
            if (tx != null && tx.loanKind == null && tx.parentLoanId == null) {
                val editLabel = tr(StringKey.MV_EDIT)
                Box(
                    Modifier.size(48.dp).clip(CircleShape).clickable(role = Role.Button) { onEdit(tx.id) }.semantics { contentDescription = editLabel },
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(MockupIcons.Pencil, contentDescription = null, tint = MaterialTheme.colorScheme.onBackground, modifier = Modifier.size(22.dp))
                }
            }
        })
        if (tx == null) {
            Text(tr(StringKey.MV_GONE), style = NovaType.bodySm, color = colors.textDim, modifier = Modifier.padding(24.dp))
            return@Column
        }
        val wallet = wallets.firstOrNull { it.id == tx.walletId }
        val walletName = wallet?.name?.let(::shortWallet) ?: ""
        val scheduled = tx.status == TransactionStatus.PLANNED
        val income = tx.type == TransactionType.INCOME
        val transfer = tx.type == TransactionType.TRANSFER
        Column(Modifier.weight(1f).verticalScroll(rememberScrollState()).padding(start = 16.dp, end = 16.dp, top = 8.dp, bottom = 24.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Column(
                Modifier.fillMaxWidth().clip(RoundedCornerShape(20.dp)).background(MaterialTheme.colorScheme.surface)
                    .border(1.dp, MaterialTheme.colorScheme.outline, RoundedCornerShape(20.dp)).padding(horizontal = 16.dp, vertical = 20.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                CatMark(if (transfer) CategoryRepository.TRANSFER else tx.subcategoryId ?: tx.category, 56.dp)
                Text(if (transfer) tr(StringKey.NM_TYPE_TRANSFER) else repo.label(tx.subcategoryId ?: tx.category), style = NovaType.bodySm, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 4.dp))
                Text(
                    (if (income) "+" else if (transfer) "" else "−") + formatMoney(abs(tx.amount), tx.currency),
                    style = NovaType.displaySm, maxLines = 1, softWrap = false,
                    autoSize = androidx.compose.foundation.text.TextAutoSize.StepBased(minFontSize = 20.sp, maxFontSize = 28.sp, stepSize = 1.sp),
                    color = if (scheduled || transfer) MaterialTheme.colorScheme.onSurface else if (income) colors.positive else colors.negative,
                )
                val wcur = wallet?.currency ?: principal
                if (tx.currency != wcur || tx.currency != principal) {
                    val rate = AppContainer.currencyRepository.rate(tx.currency, principal)
                    Text("≈ " + formatMoney(abs(tx.amount) * rate, principal) + " $principal · 1 ${tx.currency} = " + formatMoney(rate, principal), style = NovaType.caption.copy(fontFeatureSettings = TNUM), color = colors.textDim, textAlign = TextAlign.Center)
                }
                // The state carries an icon, not just the tone.
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(4.dp),
                    modifier = Modifier.padding(top = 4.dp).clip(RoundedCornerShape(999.dp)).background(if (scheduled) colors.warningSoft else colors.positiveSoft).padding(horizontal = 10.dp, vertical = 4.dp),
                ) {
                    V2Icon(if (scheduled) V2Icons.clock else V2Icons.check, if (scheduled) colors.warning else colors.positive, 14.dp)
                    Text(tr(if (scheduled) StringKey.MV_STATE_SCHEDULED else StringKey.MV_STATE_RECORDED), style = NovaType.caption.copy(fontWeight = FontWeight.SemiBold), color = if (scheduled) colors.warning else colors.positive, maxLines = 1, softWrap = false)
                }
            }

            val autoBudget = if (!income && !transfer) budgets.firstOrNull { it.budget.kind == BudgetKind.CATEGORY && repo.isIn(tx.subcategoryId ?: tx.category, it.budget.category) } else null
            val series = tx.recurringSeriesId?.let { id -> AppContainer.recurringSeriesRepository.series.value.firstOrNull { it.id == id } }
            val rows = listOfNotNull(
                tr(StringKey.NM_TITLE_PH) to tx.displayName(repo),
                if (tx.description.isNotBlank() && !tx.note.isNullOrBlank()) tr(StringKey.MV_NOTE) to tx.note else null,
                tr(StringKey.NM_SECTION_WHEN) to fmtDateLong(tx.date) + " · " + tx.time,
                tr(StringKey.NM_WALLET) to walletName + " · " + (wallet?.currency ?: principal),
                tx.counterpartyName?.takeIf { income && it.isNotBlank() }?.let { tr(StringKey.NM_FROM) to it },
                tx.merchant?.takeIf { it.isNotBlank() }?.let { tr(StringKey.MV_MERCHANT) to it },
                autoBudget?.let { tr(StringKey.NM_BUDGET) to (it.budget.name ?: repo.name(it.budget.category)) + " · " + it.percentage + "%" },
                series?.let { tr(StringKey.MV_REPEATS) to com.s2nova.app.ui.screens.addtransaction.repeatSummary(com.s2nova.app.ui.screens.addtransaction.repeatOf(it), java.time.LocalDate.parse(tx.date)) },
            )
            Column(
                Modifier.fillMaxWidth().clip(RoundedCornerShape(20.dp)).background(MaterialTheme.colorScheme.surface)
                    .border(1.dp, MaterialTheme.colorScheme.outline, RoundedCornerShape(20.dp)).padding(horizontal = 16.dp, vertical = 2.dp),
            ) {
                rows.forEachIndexed { i, (label, value) ->
                    Row(
                        Modifier.fillMaxWidth().then(if (i < rows.size - 1) Modifier.drawBehind {
                            drawLine(colors.dividerSubtle, Offset(0f, size.height), Offset(size.width, size.height), 1.dp.toPx())
                        } else Modifier).padding(vertical = 14.dp).semantics(mergeDescendants = true) {},
                        horizontalArrangement = Arrangement.spacedBy(16.dp),
                        verticalAlignment = Alignment.Top,
                    ) {
                        Text(label, style = NovaType.bodySm, color = colors.textDim, maxLines = 1, softWrap = false)
                        Text(value, style = NovaType.label.copy(fontFeatureSettings = TNUM), color = MaterialTheme.colorScheme.onSurface, textAlign = TextAlign.End, modifier = Modifier.weight(1f))
                    }
                }
            }

            Text(tr(StringKey.MV_RECEIPT), style = NovaType.title, color = MaterialTheme.colorScheme.onBackground, modifier = Modifier.padding(top = 8.dp).semantics { heading() })
            val a = tx.attachment
            if (a != null) {
                Row(
                    Modifier.fillMaxWidth().clip(RoundedCornerShape(20.dp)).background(MaterialTheme.colorScheme.surface)
                        .border(1.dp, MaterialTheme.colorScheme.outline, RoundedCornerShape(20.dp)).padding(start = 12.dp, top = 12.dp, end = 4.dp, bottom = 4.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(14.dp),
                ) {
                    Thumb(a.isPdf, bytes, Modifier.size(width = 64.dp, height = 80.dp).noRippleClick { viewer = true })
                    Column(Modifier.weight(1f)) {
                        Text(a.name, style = NovaType.titleSm, maxLines = 1, overflow = TextOverflow.Ellipsis, color = MaterialTheme.colorScheme.onSurface)
                        Text(tr(StringKey.MV_RECEIPT_META, if (a.isPdf) "PDF" else tr(StringKey.NM_PHOTO), sizeLabel(a.size), fmtDate(a.createdAt)), style = NovaType.bodySm, color = colors.textDim)
                        @OptIn(androidx.compose.foundation.layout.ExperimentalLayoutApi::class)
                        androidx.compose.foundation.layout.FlowRow(Modifier.offset(x = (-8).dp)) {
                            DetailLink(tr(StringKey.MV_RECEIPT_SEE), colors.link) { viewer = true }
                            DetailLink(tr(StringKey.MV_RECEIPT_REPLACE), colors.link) { attachSheet = true }
                            DetailLink(tr(StringKey.MV_RECEIPT_REMOVE), colors.negative) {
                                val repoTx = AppContainer.transactionRepository
                                repoTx.hideAttachmentLocal(tx.id)
                                Snack.show(tr(StringKey.MV_RECEIPT_REMOVED), onUndo = { repoTx.restoreAttachment(tx.id, a) }, onTimeout = {
                                    AppContainer.appScope.launch { runCatching { repoTx.removeAttachment(tx.id) } }
                                })
                            }
                        }
                    }
                }
            } else {
                val line2 = MaterialTheme.colorScheme.outlineVariant
                Row(
                    Modifier.fillMaxWidth().drawBehind {
                        drawRoundRect(line2, style = Stroke(1.5.dp.toPx(), pathEffect = PathEffect.dashPathEffect(floatArrayOf(6.dp.toPx(), 4.dp.toPx()))), cornerRadius = androidx.compose.ui.geometry.CornerRadius(16.dp.toPx()))
                    }.clip(RoundedCornerShape(16.dp)).heightIn(min = 52.dp).clickable(role = Role.Button) { attachSheet = true }.padding(14.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp, Alignment.CenterHorizontally),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    V2Icon(V2Icons.clip, colors.link, 18.dp)
                    Text(tr(StringKey.MV_RECEIPT_ATTACH), style = NovaType.label, color = colors.link)
                }
            }
            Box(
                Modifier.padding(top = 12.dp).fillMaxWidth().height(52.dp).clip(RoundedCornerShape(12.dp)).border(1.dp, colors.negative, RoundedCornerShape(12.dp))
                    .clickable(role = Role.Button) { requestDelete(tx, walletName, scope, onDeleted) },
                contentAlignment = Alignment.Center,
            ) { Text(tr(StringKey.MV_DELETE), style = NovaType.label, color = colors.negative, maxLines = 1, softWrap = false) }
        }

        if (viewer && tx.attachment != null) {
            val att = tx.attachment
            Dialog(onDismissRequest = { viewer = false }, properties = DialogProperties(usePlatformDefaultWidth = false)) {
                Column(Modifier.fillMaxSize().background(Color(0xF0050507)).padding(start = 20.dp, end = 20.dp, top = 16.dp, bottom = 28.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        Text(att.name, style = NovaType.titleSm, color = Color.White, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.weight(1f))
                        val closeLabel = tr(StringKey.COMMON_DISMISS)
                        Box(Modifier.size(48.dp).clip(CircleShape).clickable(role = Role.Button) { viewer = false }.semantics { contentDescription = closeLabel }, contentAlignment = Alignment.Center) {
                            Box(Modifier.size(40.dp).clip(CircleShape).background(Color.White.copy(alpha = 0.1f)), contentAlignment = Alignment.Center) { V2Icon(V2Icons.close, Color.White, 20.dp) }
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
                                Text(tr(StringKey.MV_RECEIPT_PREVIEW), fontSize = 12.sp, color = Color(0xFFA8A8B8))
                            }
                        }
                    }
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        Box(
                            Modifier.weight(1f).clip(RoundedCornerShape(14.dp)).border(1.dp, Color.White.copy(alpha = 0.2f), RoundedCornerShape(14.dp))
                                .clickable(role = Role.Button) { shareFile(context, att.name, att.mime, bytes, send = true) }.heightIn(min = 52.dp),
                            contentAlignment = Alignment.Center,
                        ) { Text(tr(StringKey.MV_SHARE), style = NovaType.label, color = Color.White) }
                        Box(
                            Modifier.weight(1f).clip(RoundedCornerShape(14.dp)).background(MaterialTheme.colorScheme.primary)
                                .clickable(role = Role.Button) { shareFile(context, att.name, att.mime, bytes, send = false) }.heightIn(min = 52.dp),
                            contentAlignment = Alignment.Center,
                        ) { Text(tr(StringKey.MV_RECEIPT_DOWNLOAD), style = NovaType.label, color = Color.White) }
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
                    scope.launch { runCatching { AppContainer.transactionRepository.attach(tx.id, tr(StringKey.NM_RECEIPT_PHOTO_FILE), "image/jpeg", out.toByteArray()) }.onSuccess { Snack.show(tr(StringKey.MV_RECEIPT_SAVED)) } }
                }
            }
            val pick = { uri: android.net.Uri? ->
                if (uri != null) {
                    val resolver = context.contentResolver
                    val mime = resolver.getType(uri) ?: "image/jpeg"
                    var name = tr(StringKey.NM_RECEIPT_FILE)
                    resolver.query(uri, arrayOf(android.provider.OpenableColumns.DISPLAY_NAME), null, null, null)?.use { c -> if (c.moveToFirst()) name = c.getString(0) ?: name }
                    val data = resolver.openInputStream(uri)?.use { it.readBytes() }
                    attachSheet = false
                    if (data != null && data.size <= 10 * 1024 * 1024) {
                        scope.launch { runCatching { AppContainer.transactionRepository.attach(tx.id, name, mime, data) }.onSuccess { Snack.show(tr(StringKey.MV_RECEIPT_SAVED)) } }
                    } else if (data != null) Snack.show(tr(StringKey.NM_ERR_FILE_SIZE))
                }
            }
            val gallery = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { pick(it) }
            val document = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) { pick(it) }
            NovaDraftSheet(onDismiss = { attachSheet = false }) {
                SheetHeader(tr(StringKey.NM_SECTION_ATTACH), tr(StringKey.NM_ATTACH_HINT), bottom = 10.dp)
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
        Snack.show(tr(StringKey.MV_RECEIPT_LOADING))
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


// A text action on a 48 dp target.
@Composable
private fun DetailLink(label: String, color: Color, onClick: () -> Unit) {
    Box(
        contentAlignment = Alignment.Center,
        modifier = Modifier.heightIn(min = 48.dp).clip(RoundedCornerShape(12.dp)).clickable(role = Role.Button, onClick = onClick).padding(horizontal = 8.dp),
    ) {
        Text(label, style = NovaType.label, color = color, maxLines = 1, softWrap = false)
    }
}
