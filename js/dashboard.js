export class Dashboard {
  constructor(containerId, { onNavigateToTransactions, onOpenModal }) {
    this.container = document.getElementById(containerId);
    this.onNavigateToTransactions = onNavigateToTransactions;
    this.onOpenModal = onOpenModal;
    this.currentPage = 1;
    this.pageSize = 10;
    const now = new Date();
    this.selectedMonth = now.getMonth().toString();
    this.selectedYear = now.getFullYear().toString();
  }

  formatMoney(amount) {
    return new Intl.NumberFormat('es-BO', {
      style: 'currency',
      currency: 'BOB',
      minimumFractionDigits: 2
    }).format(amount);
  }

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

  render(transactions, categoryMap = {}) {
    if (!this.container) return;

    let filteredTransactions = transactions;
    if (this.selectedMonth !== 'all' && this.selectedYear !== 'all') {
      filteredTransactions = transactions.filter(t => {
        if (!t.fecha) return false;
        const [yyyy, mm] = t.fecha.split('-');
        return (parseInt(mm, 10) - 1).toString() === this.selectedMonth && yyyy === this.selectedYear;
      });
    }

    const metrics = this.calculateMetrics(filteredTransactions);

    const sortedTransactions = [...filteredTransactions]
      .sort((a, b) => {
        const dateDiff = new Date(b.fecha) - new Date(a.fecha);
        if (dateDiff !== 0) return dateDiff;
        return Number(b.id) - Number(a.id);
      });

    const totalItems = sortedTransactions.length;
    const totalPages = Math.ceil(totalItems / this.pageSize) || 1;
    if (this.currentPage > totalPages) {
      this.currentPage = 1;
    }

    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = Math.min(startIndex + this.pageSize, totalItems);
    const paginatedRecent = sortedTransactions.slice(startIndex, endIndex);

    const isBalancePositive = metrics.balance >= 0;

    this.container.innerHTML = `
      <div class="dashboard-header animate-fade-in" style="align-items: center; flex-wrap: wrap; gap: 1rem;">
        <div class="dashboard-title-group" style="display: flex; align-items: center; gap: 0.75rem;">
          <div style="background-color: var(--primary-red-light); color: var(--primary-red); width: 2.75rem; height: 2.75rem; border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(217, 20, 41, 0.15); flex-shrink: 0;">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="7" height="9" rx="1"></rect>
              <rect x="14" y="3" width="7" height="5" rx="1"></rect>
              <rect x="14" y="12" width="7" height="9" rx="1"></rect>
              <rect x="3" y="16" width="7" height="5" rx="1"></rect>
            </svg>
          </div>
          <div>
            <h1 style="margin: 0; line-height: 1.2;">Dashboard</h1>
          </div>
        </div>
        
        <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; margin-left: auto;">
          <select id="dash-month" class="form-control" style="width: auto; padding: 0.35rem 0.75rem; font-size: 0.85rem; height: auto;">
            <option value="all" ${this.selectedMonth === 'all' ? 'selected' : ''}>Todos los meses</option>
            <option value="0" ${this.selectedMonth === '0' ? 'selected' : ''}>Enero</option>
            <option value="1" ${this.selectedMonth === '1' ? 'selected' : ''}>Febrero</option>
            <option value="2" ${this.selectedMonth === '2' ? 'selected' : ''}>Marzo</option>
            <option value="3" ${this.selectedMonth === '3' ? 'selected' : ''}>Abril</option>
            <option value="4" ${this.selectedMonth === '4' ? 'selected' : ''}>Mayo</option>
            <option value="5" ${this.selectedMonth === '5' ? 'selected' : ''}>Junio</option>
            <option value="6" ${this.selectedMonth === '6' ? 'selected' : ''}>Julio</option>
            <option value="7" ${this.selectedMonth === '7' ? 'selected' : ''}>Agosto</option>
            <option value="8" ${this.selectedMonth === '8' ? 'selected' : ''}>Septiembre</option>
            <option value="9" ${this.selectedMonth === '9' ? 'selected' : ''}>Octubre</option>
            <option value="10" ${this.selectedMonth === '10' ? 'selected' : ''}>Noviembre</option>
            <option value="11" ${this.selectedMonth === '11' ? 'selected' : ''}>Diciembre</option>
          </select>
          
          <select id="dash-year" class="form-control" style="width: auto; padding: 0.35rem 0.75rem; font-size: 0.85rem; height: auto;">
            <option value="all" ${this.selectedYear === 'all' ? 'selected' : ''}>Todos los años</option>
            ${this.getYearOptions(transactions)}
          </select>

          <button id="dashboard-new-tx-btn" class="btn btn-primary" style="padding: 0.35rem 0.75rem; font-size: 0.85rem; height: auto;">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 0.25rem;"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            Nuevo
          </button>
        </div>
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
        <div class="recent-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
          <h3 class="recent-title" style="margin: 0;">Últimos Movimientos</h3>
          <button id="dashboard-view-all-btn" class="view-all-link" style="margin: 0; background: none; border: none; font-size: 0.85rem; font-weight: 600; color: var(--primary-red); display: flex; align-items: center; gap: 0.25rem; cursor: pointer;">
            Historial completo
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" style="width: 14px; height: 14px;"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
          </button>
        </div>

        <div class="recent-list" id="recent-transactions-list" style="display: flex; flex-direction: column; gap: 0.75rem;">
          ${paginatedRecent.length === 0 ? this.renderEmptyState() : paginatedRecent.map(t => this.renderTransactionItem(t, categoryMap)).join('')}
        </div>

        <!-- Paginación estilo MudBlazor para Movimientos -->
        ${totalItems > 0 ? `
          <div class="pagination-container dashboard-pagination">
            <div class="pagination-left">
              <span class="pagination-info">${totalItems > 0 ? `${startIndex + 1}-${endIndex} de ${totalItems}` : '0-0 de 0'}</span>
            </div>
            <div class="pagination-right">
              <button class="pagination-btn btn-dash-first" ${this.currentPage === 1 ? 'disabled' : ''} title="Primera página">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="11 17 6 12 11 7"></polyline><polyline points="18 17 13 12 18 7"></polyline></svg>
              </button>
              <button class="pagination-btn btn-dash-prev" ${this.currentPage === 1 ? 'disabled' : ''} title="Página anterior">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
              </button>
              <span class="pagination-page-indicator">Pág. ${this.currentPage} de ${totalPages}</span>
              <button class="pagination-btn btn-dash-next" ${this.currentPage === totalPages ? 'disabled' : ''} title="Página siguiente">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
              </button>
              <button class="pagination-btn btn-dash-last" ${this.currentPage === totalPages ? 'disabled' : ''} title="Última página">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="13 17 18 12 13 7"></polyline><polyline points="6 17 11 12 6 7"></polyline></svg>
              </button>
            </div>
          </div>
        ` : ''}
      </div>
    `;

    document.getElementById('dashboard-new-tx-btn').addEventListener('click', () => {
      if (this.onOpenModal) this.onOpenModal();
    });

    const monthSelect = document.getElementById('dash-month');
    const yearSelect = document.getElementById('dash-year');

    if (monthSelect) {
      monthSelect.addEventListener('change', (e) => {
        this.selectedMonth = e.target.value;
        this.currentPage = 1;
        this.render(transactions, categoryMap);
      });
    }

    if (yearSelect) {
      yearSelect.addEventListener('change', (e) => {
        this.selectedYear = e.target.value;
        this.currentPage = 1;
        this.render(transactions, categoryMap);
      });
    }

    const viewAllBtn = document.getElementById('dashboard-view-all-btn');
    if (viewAllBtn) {
      viewAllBtn.addEventListener('click', () => {
        if (this.onNavigateToTransactions) this.onNavigateToTransactions();
      });
    }

    const btnDashFirst = this.container.querySelector('.btn-dash-first');
    const btnDashPrev = this.container.querySelector('.btn-dash-prev');
    const btnDashNext = this.container.querySelector('.btn-dash-next');
    const btnDashLast = this.container.querySelector('.btn-dash-last');

    if (btnDashFirst) {
      btnDashFirst.addEventListener('click', () => {
        this.currentPage = 1;
        this.render(transactions, categoryMap);
      });
    }
    if (btnDashPrev) {
      btnDashPrev.addEventListener('click', () => {
        if (this.currentPage > 1) {
          this.currentPage--;
          this.render(transactions, categoryMap);
        }
      });
    }
    if (btnDashNext) {
      btnDashNext.addEventListener('click', () => {
        if (this.currentPage < totalPages) {
          this.currentPage++;
          this.render(transactions, categoryMap);
        }
      });
    }
    if (btnDashLast) {
      btnDashLast.addEventListener('click', () => {
        this.currentPage = totalPages;
        this.render(transactions, categoryMap);
      });
    }
  }

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

  renderTransactionItem(t, categoryMap) {
    const isIncome = t.tipo === 'ingreso';
    const isActive = t.activo !== false;
    const categoryName = categoryMap[t.categoriaId] || 'Otros';
    const amt = parseFloat(t.monto) || 0;
    const saldoDespues = parseFloat(t.saldoDespues) || 0;

    const amtApplied = isActive ? amt : 0;
    const saldoAntes = isIncome ? (saldoDespues - amtApplied) : (saldoDespues + amtApplied);

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

  escapeHtml(str) {
    const div = document.createElement('div');
    div.innerText = str;
    return div.innerHTML;
  }

  getYearOptions(transactions) {
    const years = new Set();
    const currentYear = new Date().getFullYear().toString();
    years.add(currentYear);
    
    transactions.forEach(t => {
      if (t.fecha) {
        const [yyyy] = t.fecha.split('-');
        if (yyyy) years.add(yyyy);
      }
    });

    const sortedYears = Array.from(years).sort((a, b) => b - a);
    return sortedYears.map(year => `<option value="${year}" ${this.selectedYear === year ? 'selected' : ''}>${year}</option>`).join('');
  }
}
