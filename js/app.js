/**
 * app.js
 * Coordinador principal y punto de entrada para MoneyTrackerEMEC.
 * Administra el estado global, navegación por pestañas y lógica del modal de transacciones.
 */

import { StorageManager } from './storage.js';
import { Dashboard } from './dashboard.js';
import { TransactionsTable } from './transactions.js';

class App {
  constructor() {
    this.transactions = [];
    this.activeTab = 'dashboard'; // 'dashboard' o 'tabla'
    this.editingTxId = null; // ID de la transacción en edición, o null si es nueva
    
    // Inicializar componentes
    this.dashboardView = new Dashboard('dashboard-container', {
      onNavigateToTransactions: () => this.switchTab('tabla'),
      onOpenModal: () => this.openModal()
    });

    this.transactionsView = new TransactionsTable('transactions-container', {
      onEdit: (id) => this.openModal(id),
      onDelete: (id) => this.deleteTransaction(id),
      onOpenModal: () => this.openModal()
    });

    // Cachear elementos de interfaz comunes
    this.modalOverlay = document.getElementById('transaction-modal');
    this.transactionForm = document.getElementById('transaction-form');
    this.modalTitle = document.getElementById('modal-title');
    this.typeButtons = this.modalOverlay.querySelectorAll('.type-btn');
    
    this.init();
  }

  /**
   * Inicializa el estado de la aplicación y enlaza los manejadores de eventos.
   */
  init() {
    // 1. Cargar datos iniciales
    this.refreshState();

    // 2. Enlazar eventos del Navbar
    const navButtons = document.querySelectorAll('.nav-btn');
    navButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tab = e.currentTarget.getAttribute('data-tab');
        this.switchTab(tab);
      });
    });

    // 3. Enlazar eventos de interacción del Modal
    const closeModalBtn = document.getElementById('modal-close');
    const cancelModalBtn = document.getElementById('modal-cancel');
    
    closeModalBtn.addEventListener('click', () => this.closeModal());
    cancelModalBtn.addEventListener('click', () => this.closeModal());

    // Cierre al presionar fuera de la tarjeta modal
    this.modalOverlay.addEventListener('click', (e) => {
      if (e.target === this.modalOverlay) {
        this.closeModal();
      }
    });

    // Cambiar tipo (Ingreso / Egreso) en el selector segmentado
    this.typeButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const selectedType = e.currentTarget.getAttribute('data-type');
        this.setModalType(selectedType);
      });
    });

    // Enviar el formulario (Guardado)
    this.transactionForm.addEventListener('submit', (e) => this.handleFormSubmit(e));
  }

  /**
   * Refresca las transacciones desde el storage y re-renderiza la pestaña activa.
   */
  refreshState() {
    this.transactions = StorageManager.getTransactions();
    this.renderActiveTab();
  }

  /**
   * Alterna de manera visible la pestaña activa y redibuja.
   * @param {string} tabName - Nombre de la pestaña ('dashboard' o 'tabla')
   */
  switchTab(tabName) {
    if (this.activeTab === tabName) return;

    this.activeTab = tabName;

    // Actualizar estados visuales del menú de navegación
    const navButtons = document.querySelectorAll('.nav-btn');
    navButtons.forEach(btn => {
      if (btn.getAttribute('data-tab') === tabName) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Visibilidad de contenedores
    const dashboardContainer = document.getElementById('dashboard-container');
    const transactionsContainer = document.getElementById('transactions-container');

    if (tabName === 'dashboard') {
      dashboardContainer.style.display = 'block';
      transactionsContainer.style.display = 'none';
    } else {
      dashboardContainer.style.display = 'none';
      transactionsContainer.style.display = 'block';
    }

    this.renderActiveTab();
  }

  /**
   * Renderiza la pestaña que está seleccionada actualmente.
   */
  renderActiveTab() {
    if (this.activeTab === 'dashboard') {
      this.dashboardView.render(this.transactions);
    } else {
      this.transactionsView.render(this.transactions);
    }
  }

  /**
   * Controla la visualización activa de ingreso/egreso dentro de los botones del modal.
   * @param {string} type - 'ingreso' o 'egreso'
   */
  setModalType(type) {
    this.typeButtons.forEach(btn => {
      if (btn.getAttribute('data-type') === type) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
    // Guardar el tipo seleccionado en un atributo de datos en el formulario
    this.transactionForm.setAttribute('data-selected-type', type);
  }

  /**
   * Abre el modal para crear o editar.
   * @param {string|null} id - ID de la transacción a editar, o null si es nueva
   */
  openModal(id = null) {
    this.editingTxId = id;
    
    // Si se pasa un ID, estamos editando
    if (id) {
      this.modalTitle.textContent = 'Editar Movimiento';
      const tx = this.transactions.find(t => t.id === id);
      
      if (tx) {
        document.getElementById('tx-monto').value = tx.monto;
        document.getElementById('tx-descripcion').value = tx.descripcion;
        document.getElementById('tx-categoria').value = tx.categoria;
        document.getElementById('tx-fecha').value = tx.fecha;
        this.setModalType(tx.tipo);
      }
    } else {
      // De lo contrario, estamos creando uno nuevo
      this.modalTitle.textContent = 'Nuevo Movimiento';
      this.transactionForm.reset();
      
      // Inicializar valores por defecto elegantes
      document.getElementById('tx-fecha').value = new Date().toISOString().split('T')[0];
      this.setModalType('egreso'); // Egreso seleccionado por defecto
    }

    // Activar overlay para mostrar el modal
    this.modalOverlay.classList.add('active');
    document.body.style.overflow = 'hidden'; // Bloquear scroll de fondo
    
    // Enfocar el primer input relevante (Monto) para una experiencia óptima
    setTimeout(() => {
      document.getElementById('tx-monto').focus();
    }, 150);
  }

  /**
   * Cierra el modal y limpia el scroll.
   */
  closeModal() {
    this.modalOverlay.classList.remove('active');
    document.body.style.overflow = ''; // Restaurar scroll
    this.editingTxId = null;
    this.transactionForm.reset();
  }

  /**
   * Procesa el envío del formulario.
   */
  handleFormSubmit(e) {
    e.preventDefault();

    const montoVal = parseFloat(document.getElementById('tx-monto').value);
    const descripcionVal = document.getElementById('tx-descripcion').value;
    const categoriaVal = document.getElementById('tx-categoria').value;
    const fechaVal = document.getElementById('tx-fecha').value;
    const tipoVal = this.transactionForm.getAttribute('data-selected-type') || 'egreso';

    // Validación extra preventiva
    if (isNaN(montoVal) || montoVal <= 0) {
      alert('Por favor, ingresa un monto válido mayor a 0.');
      return;
    }

    if (!descripcionVal.trim()) {
      alert('Por favor, escribe una descripción.');
      return;
    }

    const transactionData = {
      id: this.editingTxId, // Si es null, StorageManager asignará un nuevo ID
      fecha: fechaVal,
      descripcion: descripcionVal,
      tipo: tipoVal,
      monto: montoVal,
      categoria: categoriaVal
    };

    // Guardar usando el storage y refrescar
    StorageManager.saveTransaction(transactionData);
    
    // Cerrar modal y refrescar la pantalla completa
    this.closeModal();
    this.refreshState();
  }

  /**
   * Elimina una transacción y actualiza las vistas.
   */
  deleteTransaction(id) {
    const success = StorageManager.deleteTransaction(id);
    if (success) {
      this.refreshState();
    }
  }
}

// Inicializar la aplicación al cargar el documento DOM
document.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
});
