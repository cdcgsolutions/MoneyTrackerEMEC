export class TransactionsTable {
  constructor(containerId, { onEdit, onDelete, onOpenModal, onOpenAuditLog }) {
    this.container = document.getElementById(containerId);
    this.onEdit = onEdit;
    this.onDelete = onDelete;
    this.onOpenModal = onOpenModal;
    this.onOpenAuditLog = onOpenAuditLog;
    this.currentFilter = 'todas';
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

  processTransactions(transactions) {
    let filtered = transactions;

    if (this.currentFilter === 'ingresos') {
      filtered = filtered.filter(t => t.tipo === 'ingreso');
    } else if (this.currentFilter === 'egresos') {
      filtered = filtered.filter(t => t.tipo === 'egreso');
    }

    if (this.selectedMonth !== 'all' && this.selectedYear !== 'all') {
      filtered = filtered.filter(t => {
        if (!t.fecha) return false;
        const [yyyy, mm] = t.fecha.split('-');
        return (parseInt(mm, 10) - 1).toString() === this.selectedMonth && yyyy === this.selectedYear;
      });
    }

    return [...filtered].reverse();
  }

  render(transactions, categoryMap = {}) {
    if (!this.container) return;

    const processedData = this.processTransactions(transactions);

    const totalItems = processedData.length;
    const totalPages = Math.ceil(totalItems / this.pageSize) || 1;
    if (this.currentPage > totalPages) {
      this.currentPage = 1;
    }

    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = Math.min(startIndex + this.pageSize, totalItems);
    const paginatedData = processedData.slice(startIndex, endIndex);

    this.container.innerHTML = `
      <div class="transactions-header animate-fade-in" style="align-items: center; flex-wrap: wrap; gap: 1rem;">
        <div class="transactions-title-group" style="display: flex; align-items: center; gap: 0.75rem;">
          <div style="background-color: var(--primary-red-light); color: var(--primary-red); width: 2.75rem; height: 2.75rem; border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(217, 20, 41, 0.15); flex-shrink: 0;">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="8" y1="6" x2="21" y2="6"></line>
              <line x1="8" y1="12" x2="21" y2="12"></line>
              <line x1="8" y1="18" x2="21" y2="18"></line>
              <line x1="3" y1="6" x2="3.01" y2="6"></line>
              <line x1="3" y1="12" x2="3.01" y2="12"></line>
              <line x1="3" y1="18" x2="3.01" y2="18"></line>
            </svg>
          </div>
          <div>
            <h1 style="margin: 0; line-height: 1.2;">Transacciones</h1>
          </div>
        </div>

        <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; margin-left: auto;">
          <!-- Barra de filtros -->
          <div class="filter-bar" style="margin: 0;">
            <button class="filter-btn ${this.currentFilter === 'todas' ? 'active' : ''}" data-filter="todas" style="padding: 0.25rem 0.5rem; font-size: 0.85rem;">Todas</button>
            <button class="filter-btn ${this.currentFilter === 'ingresos' ? 'active' : ''}" data-filter="ingresos" style="padding: 0.25rem 0.5rem; font-size: 0.85rem;">Ingresos</button>
            <button class="filter-btn ${this.currentFilter === 'egresos' ? 'active' : ''}" data-filter="egresos" style="padding: 0.25rem 0.5rem; font-size: 0.85rem;">Egresos</button>
          </div>

          <select id="tx-month" class="form-control" style="width: auto; padding: 0.35rem 0.75rem; font-size: 0.85rem; height: auto;">
            <option value="all" ${this.selectedMonth === 'all' ? 'selected' : ''}>Todos</option>
            <option value="0" ${this.selectedMonth === '0' ? 'selected' : ''}>Ene</option>
            <option value="1" ${this.selectedMonth === '1' ? 'selected' : ''}>Feb</option>
            <option value="2" ${this.selectedMonth === '2' ? 'selected' : ''}>Mar</option>
            <option value="3" ${this.selectedMonth === '3' ? 'selected' : ''}>Abr</option>
            <option value="4" ${this.selectedMonth === '4' ? 'selected' : ''}>May</option>
            <option value="5" ${this.selectedMonth === '5' ? 'selected' : ''}>Jun</option>
            <option value="6" ${this.selectedMonth === '6' ? 'selected' : ''}>Jul</option>
            <option value="7" ${this.selectedMonth === '7' ? 'selected' : ''}>Ago</option>
            <option value="8" ${this.selectedMonth === '8' ? 'selected' : ''}>Sep</option>
            <option value="9" ${this.selectedMonth === '9' ? 'selected' : ''}>Oct</option>
            <option value="10" ${this.selectedMonth === '10' ? 'selected' : ''}>Nov</option>
            <option value="11" ${this.selectedMonth === '11' ? 'selected' : ''}>Dic</option>
          </select>
          
          <select id="tx-year" class="form-control" style="width: auto; padding: 0.35rem 0.75rem; font-size: 0.85rem; height: auto;">
            <option value="all" ${this.selectedYear === 'all' ? 'selected' : ''}>Todos</option>
            ${this.getYearOptions(transactions)}
          </select>

          <button id="transactions-add-btn" class="btn btn-primary" style="padding: 0.35rem 0.75rem; font-size: 0.85rem; height: auto;">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 0.25rem;"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            Nuevo
          </button>
        </div>
      </div>

      <!-- Tabla de Datos -->
      <div class="table-container animate-slide-up">
        <div class="table-responsive">
          <table class="tx-table">
            <thead>
              <tr>
                <th style="width: 9%">Fecha</th>
                <th style="width: 19%">Descripción</th>
                <th style="width: 10%">Categoría</th>
                <th style="width: 8%; text-align: center;">Estado</th>
                <th style="text-align: right; width: 11%">Antes</th>
                <th style="text-align: right; width: 10%">Ingreso</th>
                <th style="text-align: right; width: 10%">Egreso</th>
                <th style="text-align: right; width: 10%">Total</th>
                <th style="text-align: center; width: 13%">Acciones</th>
              </tr>
            </thead>
            <tbody id="tx-table-body">
              ${paginatedData.length === 0 ? this.renderEmptyRow() : paginatedData.map(t => this.renderTableRow(t, categoryMap)).join('')}
            </tbody>
          </table>
        </div>

        <!-- Paginación estilo MudBlazor -->
        <div class="pagination-container">
          <div class="pagination-left">
            <span class="pagination-info">${totalItems > 0 ? `${startIndex + 1}-${endIndex} de ${totalItems}` : '0-0 de 0'}</span>
          </div>
          <div class="pagination-right">
            <button class="pagination-btn btn-first" ${this.currentPage === 1 ? 'disabled' : ''} title="Primera página">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="11 17 6 12 11 7"></polyline><polyline points="18 17 13 12 18 7"></polyline></svg>
            </button>
            <button class="pagination-btn btn-prev" ${this.currentPage === 1 ? 'disabled' : ''} title="Página anterior">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
            </button>
            <span class="pagination-page-indicator">Pág. ${this.currentPage} de ${totalPages}</span>
            <button class="pagination-btn btn-next" ${this.currentPage === totalPages ? 'disabled' : ''} title="Página siguiente">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </button>
            <button class="pagination-btn btn-last" ${this.currentPage === totalPages ? 'disabled' : ''} title="Última página">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="13 17 18 12 13 7"></polyline><polyline points="6 17 11 12 6 7"></polyline></svg>
            </button>
          </div>
        </div>
      </div>
    `;

    const filterButtons = this.container.querySelectorAll('.filter-btn');
    filterButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.currentFilter = e.target.getAttribute('data-filter');
        this.currentPage = 1;
        this.render(transactions, categoryMap);
      });
    });

    const btnFirst = this.container.querySelector('.btn-first');
    const btnPrev = this.container.querySelector('.btn-prev');
    const btnNext = this.container.querySelector('.btn-next');
    const btnLast = this.container.querySelector('.btn-last');

    if (btnFirst) {
      btnFirst.addEventListener('click', () => {
        this.currentPage = 1;
        this.render(transactions, categoryMap);
      });
    }
    if (btnPrev) {
      btnPrev.addEventListener('click', () => {
        if (this.currentPage > 1) {
          this.currentPage--;
          this.render(transactions, categoryMap);
        }
      });
    }
    if (btnNext) {
      btnNext.addEventListener('click', () => {
        if (this.currentPage < totalPages) {
          this.currentPage++;
          this.render(transactions, categoryMap);
        }
      });
    }
    if (btnLast) {
      btnLast.addEventListener('click', () => {
        this.currentPage = totalPages;
        this.render(transactions, categoryMap);
      });
    }

    document.getElementById('transactions-add-btn').addEventListener('click', () => {
      if (this.onOpenModal) this.onOpenModal();
    });

    const monthSelect = document.getElementById('tx-month');
    const yearSelect = document.getElementById('tx-year');

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

    const tableBody = document.getElementById('tx-table-body');

    tableBody.querySelectorAll('.btn-audit').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        if (this.onOpenAuditLog) this.onOpenAuditLog(id);
      });
    });

    tableBody.querySelectorAll('.btn-edit:not([disabled])').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        if (this.onEdit) this.onEdit(id);
      });
    });

    tableBody.querySelectorAll('.btn-delete:not([disabled])').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        if (confirm('¿Estás seguro de anular este registro? Se dará de baja lógica y se recalculará todo el historial contable.')) {
          if (this.onDelete) this.onDelete(id);
        }
      });
    });
  }

  renderEmptyRow() {
    return `
      <tr>
        <td colspan="8" style="text-align: center; padding: 3rem 1.5rem; color: var(--text-secondary);">
          <div style="font-size: 1.5rem; color: var(--text-muted); margin-bottom: 0.5rem;">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
          </div>
          No se encontraron registros de movimientos en esta sección.
        </td>
      </tr>
    `;
  }

  renderTableRow(t, categoryMap) {
    const isIncome = t.tipo === 'ingreso';
    const categoryName = categoryMap[t.categoriaId] || 'Otros';
    const cleanCategorySlug = categoryName.toLowerCase();
    const cleanTxId = t.id;
    const isActive = t.activo !== false;
    const amt = parseFloat(t.monto) || 0;
    const saldoDespues = parseFloat(t.saldoDespues) || 0;

    const amtApplied = isActive ? amt : 0;
    const saldoAntes = isIncome ? (saldoDespues - amtApplied) : (saldoDespues + amtApplied);

    const statusBadge = isActive
      ? `<span class="status-badge active-status" style="background-color: rgba(40, 167, 69, 0.08); color: #28a745; border: 1px solid rgba(40, 167, 69, 0.15); padding: 0.25rem 0.5rem; border-radius: var(--radius-sm); font-size: 0.75rem; font-weight: 600;">Activo</span>`
      : `<span class="status-badge inactive-status" style="background-color: rgba(108, 117, 125, 0.08); color: #6c757d; border: 1px solid rgba(108, 117, 125, 0.15); padding: 0.25rem 0.5rem; border-radius: var(--radius-sm); font-size: 0.75rem; font-weight: 600;">Anulado</span>`;

    return `
      <tr class="${t.tipo}-row ${isActive ? '' : 'tx-inactive'}" style="${isActive ? '' : 'background-color: #f8f9fa;'}">
        <td class="tx-date cell-date">${t.fecha ? t.fecha.replace('T', ' ') : ''}</td>
        <td class="tx-desc cell-desc" title="ID: ${cleanTxId}" style="${isActive ? '' : 'text-decoration: line-through;'}">${this.escapeHtml(t.descripcion)}</td>
        <td class="cell-category" style="color: var(--text-secondary); font-weight: 500;">
          ${categoryName}
        </td>
        <td class="cell-status" style="text-align: center;">
          ${statusBadge}
        </td>
        <td class="tx-balance cell-balance-before" style="text-align: right; color: var(--text-secondary); font-variant-numeric: tabular-nums; ${isActive ? '' : 'text-decoration: line-through;'}">
          ${this.formatMoney(saldoAntes)}
        </td>
        <td class="tx-amount income cell-amount-in" style="text-align: right; ${isActive ? '' : 'text-decoration: line-through;'}">
          ${isIncome ? this.formatMoney(t.monto) : '—'}
        </td>
        <td class="tx-amount expense cell-amount-out" style="text-align: right; ${isActive ? '' : 'text-decoration: line-through;'}">
          ${!isIncome ? this.formatMoney(t.monto) : '—'}
        </td>
        <td class="tx-balance cell-balance ${t.saldoDespues >= 0 ? 'positive' : 'negative'}" style="text-align: right; font-weight: 600; ${isActive ? '' : 'text-decoration: line-through;'}">
          ${isActive ? this.formatMoney(t.saldoDespues) : '—'}
        </td>
        <td class="cell-actions">
          <div class="actions-cell">
            <button class="action-btn btn-audit" data-id="${t.id}" title="Ver Bitácora del Movimiento #${cleanTxId}" style="color: var(--primary-red); border-color: rgba(220,53,69,0.15); background: rgba(220,53,69,0.03);">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
            </button>
            <button class="action-btn btn-edit" data-id="${t.id}" title="Editar Movimiento #${cleanTxId}" ${isActive ? '' : 'disabled style="pointer-events: none; opacity: 0.25;"'}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4Z"></path></svg>
            </button>
            <button class="action-btn btn-delete" data-id="${t.id}" title="Eliminar Movimiento #${cleanTxId}" ${isActive ? '' : 'disabled style="pointer-events: none; opacity: 0.25;"'}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
            </button>
          </div>
        </td>
      </tr>
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
