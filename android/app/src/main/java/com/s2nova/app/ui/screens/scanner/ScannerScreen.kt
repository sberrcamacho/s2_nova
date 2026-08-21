package com.s2nova.app.ui.screens.scanner

import android.Manifest
import android.content.pm.PackageManager
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.QrCodeScanner
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.s2nova.app.data.AppContainer
import com.s2nova.app.data.mock.paymentMethods
import com.s2nova.app.data.model.NewTransactionInput
import com.s2nova.app.data.model.NotificationTone
import com.s2nova.app.data.model.PaymentMethod
import com.s2nova.app.data.model.Product
import com.s2nova.app.data.model.TransactionType
import com.s2nova.app.data.todayISO
import com.s2nova.app.ui.categoryStringKey
import com.s2nova.app.ui.components.CategoryIcon
import com.s2nova.app.ui.paymentMethodStringKey
import com.s2nova.app.ui.rememberCurrencyFormatter
import com.s2nova.app.ui.rememberStrings
import com.s2nova.app.ui.StringKey
import com.s2nova.app.ui.theme.NovaColors
import kotlinx.coroutines.launch

private sealed interface ScanState {
    data object Scanning : ScanState
    data class Found(val product: Product) : ScanState
    data class NotFound(val code: String) : ScanState
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ScannerScreen(
    onClose: () -> Unit,
    onPurchaseRegistered: () -> Unit,
) {
    val context = LocalContext.current
    val colors = NovaColors.current
    val format = rememberCurrencyFormatter()
    val t = rememberStrings()

    var hasPermission by remember {
        mutableStateOf(ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED)
    }
    val permissionLauncher = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
        hasPermission = granted
    }
    LaunchedEffect(Unit) {
        if (!hasPermission) permissionLauncher.launch(Manifest.permission.CAMERA)
    }

    var scanState by remember { mutableStateOf<ScanState>(ScanState.Scanning) }
    var manualCode by remember { mutableStateOf("") }
    var paymentMethod by remember { mutableStateOf(PaymentMethod.DEBIT_CARD) }
    val scope = rememberCoroutineScope()
    val wallets by AppContainer.walletRepository.wallets.collectAsStateWithLifecycle()

    fun runScan(code: String) {
        if (scanState !is ScanState.Scanning) return
        val product = AppContainer.productRepository.lookupBarcode(code)
        scanState = if (product != null) ScanState.Found(product) else ScanState.NotFound(code)
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(colors.scanSurface),
    ) {
        if (hasPermission) {
            CameraPreview(
                active = scanState is ScanState.Scanning,
                onBarcodeDetected = ::runScan,
            )
        } else {
            Column(
                modifier = Modifier.fillMaxSize().padding(32.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center,
            ) {
                Icon(Icons.Filled.QrCodeScanner, contentDescription = null, tint = androidx.compose.ui.graphics.Color.White.copy(alpha = 0.6f), modifier = Modifier.size(48.dp))
                Text(
                    t(StringKey.SCANNER_PERMISSION_MESSAGE),
                    color = androidx.compose.ui.graphics.Color.White,
                    style = MaterialTheme.typography.bodyLarge,
                    modifier = Modifier.padding(top = 16.dp),
                    textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                )
                Button(
                    onClick = { permissionLauncher.launch(Manifest.permission.CAMERA) },
                    modifier = Modifier.padding(top = 20.dp),
                ) { Text(t(StringKey.SCANNER_PERMISSION_BUTTON)) }
            }
        }

        // Corner-bracket reticle overlay
        if (hasPermission && scanState is ScanState.Scanning) {
            ScanReticle(modifier = Modifier.align(Alignment.Center))
        }

        Column(modifier = Modifier.fillMaxSize()) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(t(StringKey.SCANNER_TITLE), color = androidx.compose.ui.graphics.Color.White, style = MaterialTheme.typography.titleLarge)
                IconButton(onClick = onClose) {
                    Icon(Icons.Filled.Close, contentDescription = t(StringKey.SCANNER_CLOSE_CD), tint = androidx.compose.ui.graphics.Color.White)
                }
            }

            Spacer(Modifier.weight(1f))

            if (scanState is ScanState.NotFound) {
                Text(
                    t(StringKey.SCANNER_NOT_FOUND),
                    color = androidx.compose.ui.graphics.Color.White,
                    style = MaterialTheme.typography.bodyLarge,
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 24.dp),
                    textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                )
                TextButton(onClick = { scanState = ScanState.Scanning }, modifier = Modifier.fillMaxWidth()) {
                    Text(t(StringKey.SCANNER_TRY_AGAIN), color = colors.negative)
                }
            } else {
                Text(
                    t(StringKey.SCANNER_HINT),
                    color = androidx.compose.ui.graphics.Color.White.copy(alpha = 0.75f),
                    style = MaterialTheme.typography.bodyMedium,
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 24.dp),
                    textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                )
            }

            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(20.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                OutlinedTextField(
                    value = manualCode,
                    onValueChange = { manualCode = it },
                    placeholder = { Text(t(StringKey.SCANNER_MANUAL_PLACEHOLDER), color = androidx.compose.ui.graphics.Color.White.copy(alpha = 0.4f)) },
                    singleLine = true,
                    textStyle = androidx.compose.ui.text.TextStyle(color = androidx.compose.ui.graphics.Color.White),
                    shape = RoundedCornerShape(14.dp),
                    modifier = Modifier.weight(1f),
                )
                Button(
                    onClick = { if (manualCode.isNotBlank()) runScan(manualCode.trim()) },
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary),
                    shape = RoundedCornerShape(14.dp),
                    modifier = Modifier.padding(start = 10.dp),
                ) {
                    Icon(Icons.Filled.Search, contentDescription = null)
                }
            }
        }
    }

    val found = scanState as? ScanState.Found
    if (found != null) {
        ModalBottomSheet(onDismissRequest = { scanState = ScanState.Scanning }) {
            ProductFoundSheet(
                product = found.product,
                paymentMethod = paymentMethod,
                onPaymentMethodChange = { paymentMethod = it },
                onDiscard = { scanState = ScanState.Scanning },
                onConfirm = {
                    // Scanner has no wallet picker of its own — uses the
                    // first wallet, same "must have a wallet first" rule
                    // AddTransactionScreen enforces. Confirm is a no-op if
                    // none exists yet rather than silently failing.
                    val walletId = wallets.firstOrNull()?.id
                    if (walletId != null) {
                        scope.launch {
                            AppContainer.transactionRepository.add(
                                NewTransactionInput(
                                    walletId = walletId,
                                    description = found.product.name,
                                    amount = found.product.price,
                                    type = TransactionType.EXPENSE,
                                    category = found.product.category,
                                    date = todayISO(),
                                    paymentMethod = paymentMethod,
                                    merchant = found.product.brand,
                                    productId = found.product.barcode,
                                ),
                            )
                            AppContainer.walletRepository.refresh()
                            AppContainer.notificationRepository.add(
                                title = t(StringKey.SCANNER_NOTIF_TITLE),
                                message = "${t(StringKey.SCANNER_NOTIF_MESSAGE_PREFIX)}${found.product.name}${t(StringKey.SCANNER_NOTIF_MESSAGE_MIDDLE)}${format(found.product.price)}.",
                                tone = NotificationTone.INFO,
                            )
                            onPurchaseRegistered()
                        }
                    }
                },
            )
        }
    }
}

@Composable
private fun CameraPreview(active: Boolean, onBarcodeDetected: (String) -> Unit) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current

    AndroidView(
        modifier = Modifier.fillMaxSize(),
        factory = { ctx ->
            val previewView = PreviewView(ctx)
            val cameraProviderFuture = ProcessCameraProvider.getInstance(ctx)
            cameraProviderFuture.addListener({
                val cameraProvider = cameraProviderFuture.get()
                val preview = Preview.Builder().build().also {
                    it.surfaceProvider = previewView.surfaceProvider
                }
                val analysis = ImageAnalysis.Builder()
                    .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                    .build()
                    .also { analysisUseCase ->
                        analysisUseCase.setAnalyzer(
                            ContextCompat.getMainExecutor(ctx),
                            BarcodeAnalyzer { code -> if (active) onBarcodeDetected(code) },
                        )
                    }
                try {
                    cameraProvider.unbindAll()
                    cameraProvider.bindToLifecycle(lifecycleOwner, CameraSelector.DEFAULT_BACK_CAMERA, preview, analysis)
                } catch (_: Exception) {
                    // Camera unavailable (e.g. emulator with no camera) — the manual-entry
                    // fallback below still lets the flow be exercised end-to-end.
                }
            }, ContextCompat.getMainExecutor(ctx))
            previewView
        },
    )
}

@Composable
private fun ScanReticle(modifier: Modifier = Modifier) {
    val accent = MaterialTheme.colorScheme.secondary
    Box(modifier = modifier.size(224.dp)) {
        // Simple corner marks via 4 small L-shapes made of two thin boxes each.
        Corner(Alignment.TopStart, accent)
        Corner(Alignment.TopEnd, accent)
        Corner(Alignment.BottomStart, accent)
        Corner(Alignment.BottomEnd, accent)
    }
}

@Composable
private fun Corner(alignment: Alignment, color: androidx.compose.ui.graphics.Color) {
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = alignment) {
        Box(
            modifier = Modifier
                .size(28.dp)
                .background(androidx.compose.ui.graphics.Color.Transparent),
        ) {
            Box(modifier = Modifier.fillMaxWidth().height(3.dp).background(color, RoundedCornerShape(2.dp)))
            Box(modifier = Modifier.fillMaxHeight().width(3.dp).background(color, RoundedCornerShape(2.dp)))
        }
    }
}

@Composable
private fun ProductFoundSheet(
    product: Product,
    paymentMethod: PaymentMethod,
    onPaymentMethodChange: (PaymentMethod) -> Unit,
    onDiscard: () -> Unit,
    onConfirm: () -> Unit,
) {
    val t = rememberStrings()
    Column(modifier = Modifier.padding(horizontal = 24.dp, vertical = 8.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            CategoryIcon(category = product.category, size = com.s2nova.app.ui.components.CategoryIconSize.LG)
            Column(modifier = Modifier.padding(start = 14.dp)) {
                Text(product.name, style = MaterialTheme.typography.titleLarge, color = MaterialTheme.colorScheme.onBackground)
                Text(
                    "${product.brand} · ${product.unit} · ${t(categoryStringKey(product.category))}",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
        val format = rememberCurrencyFormatter()
        Text(
            format(product.price),
            style = MaterialTheme.typography.headlineMedium,
            fontWeight = FontWeight.ExtraBold,
            color = MaterialTheme.colorScheme.onBackground,
            modifier = Modifier.padding(top = 16.dp),
        )

        Text(t(StringKey.ADD_TXN_PAYMENT_METHOD), style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 20.dp, bottom = 8.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            paymentMethods.take(3).forEach { pm ->
                val selected = paymentMethod == pm.id
                Text(
                    t(paymentMethodStringKey(pm.id)),
                    color = if (selected) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onBackground,
                    style = MaterialTheme.typography.bodyMedium,
                    modifier = Modifier
                        .background(if (selected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surfaceVariant, RoundedCornerShape(50))
                        .clickable { onPaymentMethodChange(pm.id) }
                        .padding(horizontal = 14.dp, vertical = 8.dp),
                )
            }
        }

        Row(modifier = Modifier.fillMaxWidth().padding(top = 24.dp, bottom = 12.dp), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            TextButton(onClick = onDiscard, modifier = Modifier.weight(1f)) { Text(t(StringKey.SCANNER_DISCARD)) }
            Button(
                onClick = onConfirm,
                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary),
                shape = RoundedCornerShape(14.dp),
                modifier = Modifier.weight(1f),
            ) { Text(t(StringKey.SCANNER_CONFIRM_PURCHASE)) }
        }
    }
}
