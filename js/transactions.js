/**
 * transactions.js
 * Controlador para la pestaña de Historial de Transacciones.
 * Calcula el saldo acumulado fila a fila, filtra dinámicamente y gestiona las acciones de edición y borrado.
 */

export class TransactionsTable {
  constructor(containerId, { onEdit, onDelete, onOpenModal }) {
    this.container = document.getElementById(containerId);
    this.onEdit = onEdit;
    this.onDelete = onDelete;
    this.onOpenModal = onOpenModal;
    this.currentFilter = 'todas'; // 'todas', 'ingresos', 'egresos'
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
   * Procesa las transacciones ordenándolas cronológicamente para calcular el
   * saldo acumulado (Running Balance), luego filtra y las devuelve en orden más reciente primero.
   */
  processTransactions(transactions) {
    // 1. Clonar y ordenar ascendentemente por fecha para calcular el saldo acumulado progresivo
    const sortedAsc = [...transactions].sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
    
    let runningBalance = 0;
    const processed = sortedAsc.map(t => {
      const amt = parseFloat(t.monto) || 0;
      if (t.tipo === 'ingreso') {
        runningBalance += amt;
      } else {
        runningBalance -= amt;
      }
      return {
        ...t,
        saldoCalculado: runningBalance
      };
    });

    // 2. Aplicar el filtro de tipo seleccionado
    let filtered = processed;
    if (this.currentFilter === 'ingresos') {
      filtered = processed.filter(t => t.tipo === 'ingreso');
    } else if (this.currentFilter === 'egresos') {
      filtered = processed.filter(t => t.tipo === 'egreso');
    }

    // 3. Devolver ordenado de forma descendente (más reciente arriba) para mostrarlo al usuario
    return filtered.reverse();
  }

  /**
   * Renderiza el panel principal de historial y la tabla.
   * @param {Array} transactions - Arreglo global de transacciones
   */
  render(transactions) {
    if (!this.container) return;

    const processedData = this.processTransactions(transactions);

    this.container.innerHTML = `
      <div class="transactions-header animate-fade-in">
        <div class="transactions-title-group">
          <h1>Historial de Transacciones</h1>
        </div>
        
        <!-- Barra de filtros -->
        <div class="filter-bar">
          <button class="filter-btn ${this.currentFilter === 'todas' ? 'active' : ''}" data-filter="todas">Todas</button>
          <button class="filter-btn ${this.currentFilter === 'ingresos' ? 'active' : ''}" data-filter="ingresos">Ingresos</button>
          <button class="filter-btn ${this.currentFilter === 'egresos' ? 'active' : ''}" data-filter="egresos">Egresos</button>
        </div>

        <button id="transactions-add-btn" class="btn btn-primary">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          Agregar Registro
        </button>
      </div>

      <!-- Tabla de Datos -->
      <div class="table-container animate-slide-up">
        <div class="table-responsive">
          <table class="tx-table">
            <thead>
              <tr>
                <th style="width: 15%">Fecha</th>
                <th style="width: 35%">Descripción</th>
                <th style="width: 15%">Categoría</th>
                <th style="text-align: right; width: 12%">Ingreso</th>
                <th style="text-align: right; width: 12%">Egreso</th>
                <th style="text-align: right; width: 15%">Saldo Total</th>
                <th style="text-align: center; width: 11%">Acciones</th>
              </tr>
            </thead>
            <tbody id="tx-table-body">
              ${processedData.length === 0 ? this.renderEmptyRow() : processedData.map(t => this.renderTableRow(t)).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    // Asignar listeners de filtros
    const filterButtons = this.container.querySelectorAll('.filter-btn');
    filterButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.currentFilter = e.target.getAttribute('data-filter');
        this.render(transactions); // Re-renderizar la vista con el filtro aplicado
      });
    });

    // Botón Agregar
    document.getElementById('transactions-add-btn').addEventListener('click', () => {
      if (this.onOpenModal) this.onOpenModal();
    });

    // Botones Editar y Eliminar de las filas
    const tableBody = document.getElementById('tx-table-body');
    
    // Editar
    tableBody.querySelectorAll('.btn-edit').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        if (this.onEdit) this.onEdit(id);
      });
    });

    // Eliminar
    tableBody.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        if (confirm('¿Estás seguro de eliminar este registro? Esto recalculará todo tu historial de saldos.')) {
          if (this.onDelete) this.onDelete(id);
        }
      });
    });
  }

  /**
   * Renderiza una fila vacía indicando que no hay transacciones en ese filtro.
   */
  renderEmptyRow() {
    return `
      <tr>
        <td colspan="7" style="text-align: center; padding: 3rem 1.5rem; color: var(--text-secondary);">
          <div style="font-size: 1.5rem; color: var(--text-muted); margin-bottom: 0.5rem;">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="feather feather-info"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
          </div>
          No se encontraron registros de movimientos con el filtro seleccionado.
        </td>
      </tr>
    `;
  }

  /**
   * Renderiza el marcado HTML de una fila de tabla.
   */
  renderTableRow(t) {
    const isIncome = t.tipo === 'ingreso';
    const cleanCategory = t.categoria.toLowerCase();

    return `
      <tr class="${t.tipo}-row">
        <td class="tx-date cell-date">${t.fecha}</td>
        <td class="tx-desc cell-desc">${this.escapeHtml(t.descripcion)}</td>
        <td class="cell-category">
          <span class="category-badge" data-cat="${cleanCategory}">${t.categoria}</span>
        </td>
        <td class="tx-amount income cell-amount-in" style="text-align: right;">
          ${isIncome ? this.formatMoney(t.monto) : '—'}
        </td>
        <td class="tx-amount expense cell-amount-out" style="text-align: right;">
          ${!isIncome ? this.formatMoney(t.monto) : '—'}
        </td>
        <td class="tx-balance cell-balance ${t.saldoCalculado >= 0 ? 'positive' : 'negative'}" style="text-align: right;">
          ${this.formatMoney(t.saldoCalculado)}
        </td>
        <td class="cell-actions">
          <div class="actions-cell">
            <button class="action-btn btn-edit" data-id="${t.id}" title="Editar Transacción">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4Z"></path></svg>
            </button>
            <button class="action-btn btn-delete" data-id="${t.id}" title="Eliminar Transacción">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
            </button>
          </div>
        </td>
      </tr>
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
