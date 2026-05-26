/**
 * dashboard.js
 * Controlador para la pestaña de Resumen General / Dashboard.
 * Calcula métricas financieras en tiempo real omitiendo transacciones inactivas (soft deleted)
 * para mantener la integridad contable de balances, ingresos y egresos.
 * Renderiza los últimos movimientos con desglose de flujo contable (saldo anterior, monto y resultante).
 */

export class Dashboard {
  constructor(containerId, { onNavigateToTransactions, onOpenModal }) {
    this.container = document.getElementById(containerId);
    this.onNavigateToTransactions = onNavigateToTransactions;
    this.onOpenModal = onOpenModal;
  }

  /**
   * Formatea un número decimal como moneda BOB (Boliviano)
   */
  formatMoney(amount) {
    return new Intl.NumberFormat('es-BO', { 
      style: 'currency', 
      currency: 'BOB',
      minimumFractionDigits: 2 
    }).format(amount);
  }

  /**
   * Procesa la lista de transacciones para obtener balances consolidados.
   * Excluye las transacciones inactivas (soft delete / anuladas) del cálculo contable.
   */
  calculateMetrics(transactions) {
    let totalIncome = 0;
    let totalExpense = 0;
 
    transactions.forEach(t => {
      if (t.activo !== false) {
        const amt = parseFloat(t.monto) || 0;
        if (t.tipo === 'ingreso') {
          totalIncome += amt;
        } else {
          totalExpense += amt;
        }
      }
    });

    return {
      balance: totalIncome - totalExpense,
      income: totalIncome,
      expense: totalExpense
    };
  }

  /**
   * Dibuja toda la vista del Dashboard.
   * @param {Array} transactions - Arreglo global de transacciones
   * @param {Object} categoryMap - Mapeo id -> nombre de categorías dinámicas
   */
  render(transactions, categoryMap = {}) {
    if (!this.container) return;

    const metrics = this.calculateMetrics(transactions);
    
    // Obtener los últimos 5 movimientos (activos o anulados para fines de auditoría visual)
    // Se ordena cronológicamente descendente y, si coinciden en fecha, por ID numérico descendente
    const recentTransactions = [...transactions]
      .sort((a, b) => {
        const dateDiff = new Date(b.fecha) - new Date(a.fecha);
        if (dateDiff !== 0) return dateDiff;
        return Number(b.id) - Number(a.id);
      })
      .slice(0, 5);

    const isBalancePositive = metrics.balance >= 0;

    this.container.innerHTML = `
      <div class="dashboard-header animate-fade-in">
        <div class="dashboard-title-group">
          <h1>Resumen General</h1>
          <p>Supervisa el estado y flujo de tus finanzas personales</p>
        </div>
        <button id="dashboard-new-tx-btn" class="btn btn-primary">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          Nuevo Registro
        </button>
      </div>
 
      <!-- KPI Grid -->
      <div class="kpi-grid animate-fade-in">
        <!-- Balance -->
        <div class="kpi-card kpi-balance">
          <div class="kpi-card-header">
            <span class="kpi-title">Balance Neto</span>
            <div class="kpi-icon-container">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
            </div>
          </div>
          <div class="kpi-value ${isBalancePositive ? 'positive' : 'negative'}">
            ${this.formatMoney(metrics.balance)}
          </div>
        </div>

        <!-- Ingresos -->
        <div class="kpi-card kpi-income">
          <div class="kpi-card-header">
            <span class="kpi-title">Total Ingresos</span>
            <div class="kpi-icon-container">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
            </div>
          </div>
          <div class="kpi-value">
            ${this.formatMoney(metrics.income)}
          </div>
        </div>

        <!-- Egresos -->
        <div class="kpi-card kpi-expense">
          <div class="kpi-card-header">
            <span class="kpi-title">Total Egresos</span>
            <div class="kpi-icon-container">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"></polyline><polyline points="17 18 23 18 23 12"></polyline></svg>
            </div>
          </div>
          <div class="kpi-value">
            ${this.formatMoney(metrics.expense)}
          </div>
        </div>
      </div>

      <!-- Últimos Movimientos -->
      <div class="recent-section animate-slide-up">
        <div class="recent-header">
          <h3 class="recent-title">Últimos Movimientos</h3>
        </div>
        <div class="recent-list" id="recent-transactions-list">
          ${recentTransactions.length === 0 ? this.renderEmptyState() : recentTransactions.map(t => this.renderTransactionItem(t, categoryMap)).join('')}
        </div>
        ${transactions.length > 5 ? `
          <button id="dashboard-view-all-btn" class="view-all-link">
            Ver todo el historial
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
          </button>
        ` : ''}
      </div>
    `;

    // Asignar listeners de eventos
    document.getElementById('dashboard-new-tx-btn').addEventListener('click', () => {
      if (this.onOpenModal) this.onOpenModal();
    });

    const viewAllBtn = document.getElementById('dashboard-view-all-btn');
    if (viewAllBtn) {
      viewAllBtn.addEventListener('click', () => {
        if (this.onNavigateToTransactions) this.onNavigateToTransactions();
      });
    }
  }

  /**
   * Renderiza el estado vacío si no hay movimientos.
   */
  renderEmptyState() {
    return `
      <div class="empty-state">
        <div class="empty-state-icon">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="4" width="20" height="16" rx="2" ry="2"></rect><line x1="12" y1="1" x2="12" y2="4"></line><line x1="12" y1="20" x2="12" y2="23"></line><line x1="2" y1="10" x2="22" y2="10"></line></svg>
        </div>
        <p>Aún no has registrado ningún movimiento.</p>
        <p style="font-size: 0.85rem; margin-top: 0.25rem;">Haz clic en "Nuevo Registro" para empezar a gestionar tus cuentas.</p>
      </div>
    `;
  }

  /**
   * Genera el marcado HTML para un movimiento reciente individual.
   * Muestra el desglose de flujo contable completo:
   * Saldo Anterior, Monto Aplicado (+/-) y Saldo Resultante (acumulado).
   */
  renderTransactionItem(t, categoryMap) {
    const isIncome = t.tipo === 'ingreso';
    const isActive = t.activo !== false;
    const categoryName = categoryMap[t.categoriaId] || 'Otros';
    const amt = parseFloat(t.monto) || 0;
    const saldoDespues = parseFloat(t.saldoDespues) || 0;
    
    // Si la transacción está dada de baja, su impacto contable real en el flujo fue de 0
    const amtApplied = isActive ? amt : 0;
    const saldoAntes = isIncome ? (saldoDespues - amtApplied) : (saldoDespues + amtApplied);
    
    // Icono correspondiente con color verde para suma y rojo para resta (solo la flechita/stroke)
    const iconSvg = isIncome 
      ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="var(--color-income)" stroke-width="2.75"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline></svg>`
      : `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="var(--color-expense)" stroke-width="2.75"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"></polyline></svg>`;

    const flowMovText = isActive 
      ? `${isIncome ? '+' : '-'}${this.formatMoney(amt)}` 
      : `0,00 BOB (Anulado)`;

    return `
      <div class="recent-item ${t.tipo} ${isActive ? '' : 'tx-inactive'}" style="${isActive ? '' : 'opacity: 0.55;'}">
        <div class="recent-item-left" style="width: 100%;">
          <div class="recent-type-icon">
            ${iconSvg}
          </div>
          <div class="recent-details" style="width: 100%;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; width: 100%; gap: 1rem;">
              <h4 style="${isActive ? '' : 'text-decoration: line-through;'}">${this.escapeHtml(t.descripcion)}</h4>
              <span class="recent-amount" style="${isActive ? '' : 'text-decoration: line-through;'} font-weight: 700; white-space: nowrap;">
                ${isIncome ? '+' : '-'}&nbsp;${this.formatMoney(t.monto)}
              </span>
            </div>
            <div class="recent-meta" style="margin-top: 0.15rem;">
              <span>${t.fecha}</span>
              <span class="recent-meta-separator"></span>
              <span style="font-weight: 500;">${categoryName}</span>
              ${isActive ? '' : '<span style="color: var(--text-muted); font-size: 0.75rem; font-weight: 700; text-transform: uppercase; margin-left: 0.5rem;">[Anulado]</span>'}
            </div>
            
            <!-- Desglose elegante del flujo de caja (Antes, Movimiento, Después) -->
            <div class="recent-flow-details" style="margin-top: 0.65rem; padding-top: 0.5rem; border-top: 1px dashed var(--border-color); display: flex; gap: 0.6rem; font-size: 0.8rem; color: var(--text-secondary); flex-wrap: wrap; align-items: center;">
              <span>Antes: <strong style="color: var(--text-main); font-variant-numeric: tabular-nums;">${this.formatMoney(saldoAntes)}</strong></span>
              <span style="color: var(--text-muted); font-weight: 600;">→</span>
              <span>Mov: <strong style="color: ${isActive ? (isIncome ? 'var(--color-income)' : 'var(--color-expense)') : 'var(--text-muted)'}; font-variant-numeric: tabular-nums;">${flowMovText}</strong></span>
              <span style="color: var(--text-muted); font-weight: 600;">→</span>
              <span>Total: <strong style="color: var(--text-main); font-variant-numeric: tabular-nums;">${isActive ? this.formatMoney(saldoDespues) : '—'}</strong></span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Helper para evitar XSS al renderizar texto del usuario.
   */
  escapeHtml(str) {
    const div = document.createElement('div');
    div.innerText = str;
    return div.innerHTML;
  }
}
