package com.s2nova.app.data

import com.s2nova.app.data.repository.AuthRepository
import com.s2nova.app.data.repository.BudgetRepository
import com.s2nova.app.data.repository.NotificationRepository
import com.s2nova.app.data.repository.ProductRepository
import com.s2nova.app.data.repository.TransactionRepository

// Manual DI container — a single set of in-memory repositories shared by
// every screen. No DI framework: the app has no network layer or scoped
// lifecycles yet that would justify one, and this keeps the mock-data
// stage simple to read. Swap for Hilt when a real backend/API arrives.
object AppContainer {
    val transactionRepository = TransactionRepository()
    val budgetRepository = BudgetRepository()
    val productRepository = ProductRepository()
    val notificationRepository = NotificationRepository()
    val authRepository = AuthRepository()
}
