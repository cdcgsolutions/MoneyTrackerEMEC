import { auth, signInWithEmailAndPassword, signOut } from './firebase-config.js';
import { StorageManager } from './storage.js';
import { Dashboard } from './dashboard.js';
import { TransactionsTable } from './transactions.js';

class App {
  constructor() {
    this.uid = null;
    this.transactions = [];
    this.categories = [];
    this.categoryMap = {};
    this.activeTab = 'dashboard';
    this.editingTxId = null;

    this.dashboardView = new Dashboard('dashboard-container', {
      onNavigateToTransactions: () => this.switchTab('tabla'),
      onOpenModal: () => this.openModal()
    });

    this.transactionsView = new TransactionsTable('transactions-container', {
      onEdit: (id) => this.openModal(id),
      onDelete: (id) => this.deleteTransaction(id),
      onOpenModal: () => this.openModal(),
      onOpenAuditLog: (id) => this.openAuditModal(id)
    });

    this.appContainer = document.getElementById('app-main-container');
    this.loginScreen = document.getElementById('login-screen');
    this.loginForm = document.getElementById('login-form');
    this.loginErrorBanner = document.getElementById('login-error-banner');
    
    // Sidebar elements
    this.sidebarMenu = document.getElementById('sidebar-menu');
    this.sidebarOverlay = document.getElementById('sidebar-overlay');
    this.sidebarOpenBtn = document.getElementById('navbar-menu-btn');
    this.sidebarCloseBtn = document.getElementById('sidebar-close-btn');

    this.loginTogglePasswordBtn = document.getElementById('login-toggle-password');
    this.loginPasswordInput = document.getElementById('login-password');
    this.eyeOpenIcon = document.getElementById('eye-open-icon');
    this.eyeClosedIcon = document.getElementById('eye-closed-icon');

    this.modalOverlay = document.getElementById('transaction-modal');
    this.transactionForm = document.getElementById('transaction-form');
    this.modalTitle = document.getElementById('modal-title');
    this.typeButtons = this.modalOverlay.querySelectorAll('.type-btn');

    this.auditModalOverlay = document.getElementById('audit-modal');
    this.auditModalTitle = document.getElementById('audit-modal-title');
    this.auditTableBody = document.getElementById('audit-table-body');

    this.qrModalOverlay = document.getElementById('qr-modal');
    this.qrButtons = document.querySelectorAll('.qr-toggle-btn');
    this.logoutButtons = document.querySelectorAll('.logout-btn');

    this.initTheme();
    this.init();
  }

  init() {

    const navButtons = document.querySelectorAll('.nav-btn');
    navButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tab = e.currentTarget.getAttribute('data-tab');
        this.switchTab(tab);
        this.closeSidebar();
      });
    });

    const closeModalBtn = document.getElementById('modal-close');
    const cancelModalBtn = document.getElementById('modal-cancel');

    closeModalBtn.addEventListener('click', () => this.closeModal());
    cancelModalBtn.addEventListener('click', () => this.closeModal());

    this.modalOverlay.addEventListener('click', (e) => {
      if (e.target === this.modalOverlay) {
        this.closeModal();
      }
    });

    this.typeButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {

        if (!e.currentTarget.classList.contains('disabled-type-btn')) {
          const selectedType = e.currentTarget.getAttribute('data-type');
          this.setModalType(selectedType);
        }
      });
    });

    this.transactionForm.addEventListener('submit', (e) => this.handleFormSubmit(e));

    const closeAuditModalBtn = document.getElementById('audit-modal-close');
    const cancelAuditModalBtn = document.getElementById('audit-modal-cancel');

    if (closeAuditModalBtn) {
      closeAuditModalBtn.addEventListener('click', () => this.closeAuditModal());
    }
    if (cancelAuditModalBtn) {
      cancelAuditModalBtn.addEventListener('click', () => this.closeAuditModal());
    }
    if (this.auditModalOverlay) {
      this.auditModalOverlay.addEventListener('click', (e) => {
        if (e.target === this.auditModalOverlay) {
          this.closeAuditModal();
        }
      });
    }

    const closeQrModalBtn = document.getElementById('qr-modal-close');

    // Sidebar open/close handlers
    if (this.sidebarOpenBtn) {
      this.sidebarOpenBtn.addEventListener('click', () => this.openSidebar());
    }
    if (this.sidebarCloseBtn) {
      this.sidebarCloseBtn.addEventListener('click', () => this.closeSidebar());
    }
    if (this.sidebarOverlay) {
      this.sidebarOverlay.addEventListener('click', () => this.closeSidebar());
    }

    this.qrButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        if (this.qrModalOverlay) {
          this.qrModalOverlay.style.display = 'flex';
          setTimeout(() => {
            this.qrModalOverlay.classList.add('active');
          }, 10);
          document.body.style.overflow = 'hidden';
        }
        this.closeSidebar();
      });
    });

    if (closeQrModalBtn) {
      closeQrModalBtn.addEventListener('click', () => this.closeQrModal());
    }

    if (this.qrModalOverlay) {
      this.qrModalOverlay.addEventListener('click', (e) => {
        if (e.target === this.qrModalOverlay) {
          this.closeQrModal();
        }
      });
    }

    const downloadQrBtn = document.getElementById('qr-download-btn');
    if (downloadQrBtn) {
      downloadQrBtn.addEventListener('click', () => this.downloadQrTicket());
    }

    this.loginForm.addEventListener('submit', (e) => this.handleLogin(e));
    this.logoutButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        this.closeSidebar();
        this.handleLogout();
      });
    });
    if (this.loginTogglePasswordBtn) {
      this.loginTogglePasswordBtn.addEventListener('click', () => this.toggleLoginPasswordVisibility());
    }

    auth.onAuthStateChanged(async (user) => {
      if (user) {
        this.showGlobalLoading('Cargando tus datos contables...');
        try {
          this.uid = await StorageManager.getOrCreateUserNumericId(user.uid, user.email);
          console.log('Autenticado en FireAuth. UID Numérico en Firestore:', this.uid);
        } catch (err) {
          this.hideGlobalLoading();
          console.error('Error al resolver ID numérico:', err);
          this.showDiagnosticError('firestore-error', err);
          return;
        }

        try {

          await this.loadInitialUserData();

          this.loginScreen.style.display = 'none';
          this.appContainer.style.display = 'block';
        } catch (error) {
          console.error('Error al cargar datos iniciales:', error);
          this.showDiagnosticError('firestore-error', error);
        } finally {
          this.hideGlobalLoading();
          this.dismissLoadingScreen();
        }
      } else {
        console.log('No autenticado. Redirigiendo a pantalla de Login...');
        this.uid = null;
        this.appContainer.style.display = 'none';
        this.loginScreen.style.display = 'flex';
        this.dismissLoadingScreen();
      }
    });
  }

  async handleLogin(e) {
    e.preventDefault();
    this.loginErrorBanner.style.display = 'none';

    const email = document.getElementById('login-email').value.trim();
    const password = this.loginPasswordInput.value;
    const submitBtn = document.getElementById('login-submit-btn');

    if (!email || !password) {
      this.loginErrorBanner.textContent = 'Por favor, completa todos los campos.';
      this.loginErrorBanner.style.display = 'block';
      return;
    }

    const originalHtml = submitBtn.innerHTML;

    submitBtn.innerHTML = `<span class="btn-spinner"></span><span>Verificando...</span>`;
    submitBtn.disabled = true;
    this.showGlobalLoading('Verificando credenciales...');

    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      this.hideGlobalLoading();
      console.error('Error en signInWithEmailAndPassword:', error);
      let friendlyMessage = 'Error al intentar conectar con Firebase. Comprueba tu conexión.';

      if (
        error.code === 'auth/wrong-password' ||
        error.code === 'auth/user-not-found' ||
        error.code === 'auth/invalid-credential'
      ) {
        friendlyMessage = 'Correo electrónico o contraseña incorrectos. Verifica tus datos.';
      } else if (error.code === 'auth/invalid-email') {
        friendlyMessage = 'El formato de correo electrónico no es válido.';
      } else if (error.code === 'auth/user-disabled') {
        friendlyMessage = 'Esta cuenta ha sido inhabilitada de forma administrativa.';
      } else if (error.code === 'auth/too-many-requests') {
        friendlyMessage = 'Demasiados intentos fallidos. Tu cuenta ha sido bloqueada temporalmente.';
      }

      this.loginErrorBanner.textContent = friendlyMessage;
      this.loginErrorBanner.style.display = 'block';
    } finally {
      submitBtn.innerHTML = originalHtml;
      submitBtn.disabled = false;
    }
  }

  async handleLogout() {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error en signOut:', error);
      alert('No se pudo cerrar la sesión de forma segura.');
    }
  }

  toggleLoginPasswordVisibility() {
    if (!this.loginPasswordInput) return;

    const isPassword = this.loginPasswordInput.type === 'password';
    this.loginPasswordInput.type = isPassword ? 'text' : 'password';

    if (isPassword) {
      this.eyeOpenIcon.style.display = 'none';
      this.eyeClosedIcon.style.display = 'block';
      this.loginTogglePasswordBtn.title = 'Ocultar contraseña';
    } else {
      this.eyeOpenIcon.style.display = 'block';
      this.eyeClosedIcon.style.display = 'none';
      this.loginTogglePasswordBtn.title = 'Mostrar contraseña';
    }
  }

  async loadInitialUserData() {
    try {

      this.categories = await StorageManager.getCategories(this.uid);

      this.categoryMap = {};
      this.categories.forEach(cat => {
        this.categoryMap[cat.id] = cat.nombre;
      });

      const categorySelect = document.getElementById('tx-categoria');
      categorySelect.innerHTML = this.categories.map(cat =>
        `<option value="${cat.id}">${cat.nombre}</option>`
      ).join('');

      await this.refreshState();
    } catch (error) {
      console.error('Error cargando los datos iniciales de Firestore:', error);
      throw error;
    }
  }

  showGlobalLoading(message = "Procesando...") {
    const overlay = document.getElementById('loading-overlay');
    const msgEl = document.getElementById('loading-message');
    if (overlay) {
      if (msgEl) msgEl.innerText = message;
      overlay.style.display = 'flex';
    }
  }

  hideGlobalLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
      overlay.style.display = 'none';
    }
  }

  dismissLoadingScreen() {
    const loadingOverlay = document.getElementById('app-loading');
    if (loadingOverlay) {
      loadingOverlay.style.opacity = '0';
      setTimeout(() => {
        loadingOverlay.remove();
      }, 250);
    }
  }

  async refreshState() {
    if (!this.uid) return;
    this.transactions = await StorageManager.getTransactions(this.uid);
    this.renderActiveTab();
  }

  switchTab(tabName) {
    if (this.activeTab === tabName) return;
    this.activeTab = tabName;

    const navButtons = document.querySelectorAll('.nav-btn');
    navButtons.forEach(btn => {
      if (btn.getAttribute('data-tab') === tabName) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

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

  updateBrowserTab(tabName) {
    let title = 'Dashboard';
    let emoji = '📊';
    if (tabName === 'tabla') {
      title = 'Transacciones';
      emoji = '📝';
    }
    document.title = title;
    let link = document.querySelector("link[rel~='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = `data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>${emoji}</text></svg>`;
  }

  renderActiveTab() {
    this.updateBrowserTab(this.activeTab);
    if (this.activeTab === 'dashboard') {
      this.dashboardView.render(this.transactions, this.categoryMap);
    } else {
      this.transactionsView.render(this.transactions, this.categoryMap);
    }
  }

  setModalType(type) {
    this.typeButtons.forEach(btn => {
      if (btn.getAttribute('data-type') === type) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
    this.transactionForm.setAttribute('data-selected-type', type);
  }

  openModal(id = null) {
    this.editingTxId = id;

    const inputMonto = document.getElementById('tx-monto');
    const inputDescripcion = document.getElementById('tx-descripcion');
    const selectCategoria = document.getElementById('tx-categoria');
    const inputFecha = document.getElementById('tx-fecha');

    if (id) {
      this.modalTitle.textContent = 'Editar Movimiento';
      const tx = this.transactions.find(t => t.id === id);

      if (tx) {
        inputMonto.value = tx.monto;
        inputDescripcion.value = tx.descripcion;
        selectCategoria.value = tx.categoriaId;
        inputFecha.value = tx.fecha;
        this.setModalType(tx.tipo);

        inputMonto.disabled = true;
        selectCategoria.disabled = true;
        inputFecha.disabled = true;
        this.typeButtons.forEach(btn => btn.classList.add('disabled-type-btn'));
      }
    } else {
      this.modalTitle.textContent = 'Nuevo Movimiento';
      this.transactionForm.reset();

      inputMonto.disabled = false;
      selectCategoria.disabled = false;
      inputFecha.disabled = false;
      this.typeButtons.forEach(btn => btn.classList.remove('disabled-type-btn'));

      inputFecha.value = new Date().toISOString().split('T')[0];

      if (this.categories.length > 0) {
        selectCategoria.value = this.categories[0].id;
      }
      this.setModalType('egreso');
    }

    this.modalOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';

    setTimeout(() => {
      inputDescripcion.focus();
    }, 150);
  }

  closeModal() {
    this.modalOverlay.classList.remove('active');
    document.body.style.overflow = '';
    this.editingTxId = null;
    this.transactionForm.reset();
  }

  async handleFormSubmit(e) {
    e.preventDefault();

    const montoVal = parseFloat(document.getElementById('tx-monto').value);
    const descripcionVal = document.getElementById('tx-descripcion').value;
    const categoriaIdVal = document.getElementById('tx-categoria').value;
    const fechaVal = document.getElementById('tx-fecha').value;
    const tipoVal = this.transactionForm.getAttribute('data-selected-type') || 'egreso';

    if (isNaN(montoVal) || montoVal <= 0) {
      alert('Por favor, ingresa un monto válido mayor a 0 BOB.');
      return;
    }

    if (!descripcionVal.trim()) {
      alert('Por favor, escribe una descripción.');
      return;
    }

    const transactionData = {
      id: this.editingTxId,
      fecha: fechaVal,
      descripcion: descripcionVal,
      tipo: tipoVal,
      monto: montoVal,
      categoriaId: categoriaIdVal
    };

    const submitBtn = document.getElementById('modal-submit');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Guardando...';
    submitBtn.disabled = true;

    const actionMessage = this.editingTxId ? 'Guardando modificaciones...' : 'Agregando nuevo registro...';
    this.showGlobalLoading(actionMessage);

    try {
      await StorageManager.saveTransaction(this.uid, transactionData);
      this.closeModal();
      await this.refreshState();
    } catch (error) {
      console.error('Error guardando la transacción en Firestore:', error);
      alert('Error de conexión al guardar. Inténtalo de nuevo.');
    } finally {
      this.hideGlobalLoading();
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
    }
  }

  async deleteTransaction(id) {
    if (!this.uid) return;

    this.showGlobalLoading('Anulando registro contable...');
    try {
      await StorageManager.deleteTransaction(this.uid, id);
      await this.refreshState();
    } catch (error) {
      console.error('Error al anular transacción:', error);
      alert('No se pudo anular la transacción. Inténtalo de nuevo.');
    } finally {
      this.hideGlobalLoading();
    }
  }

  async openAuditModal(transaccionId = null) {
    if (!this.uid) return;

    if (this.auditModalTitle) {
      this.auditModalTitle.textContent = transaccionId
        ? `Bitácora - Movimiento #${transaccionId}`
        : 'Bitácora de Cambios';
    }

    this.auditTableBody.innerHTML = `
      <tr>
        <td colspan="4" style="text-align: center; padding: 2.5rem; color: var(--text-secondary);">
          <span class="btn-spinner" style="border-top-color: var(--primary-red); display: inline-block; float: none; margin: 0 auto 0.75rem auto;"></span><br>
          Cargando historial de cambios...
        </td>
      </tr>
    `;

    this.auditModalOverlay.style.display = 'flex';

    setTimeout(() => {
      this.auditModalOverlay.classList.add('active');
    }, 10);
    document.body.style.overflow = 'hidden';

    try {
      const logs = await StorageManager.getAuditLogs(this.uid, transaccionId);

      if (logs.length === 0) {
        this.auditTableBody.innerHTML = `
          <tr>
            <td colspan="4" style="text-align: center; padding: 3rem 1.5rem; color: var(--text-muted);">
              No se han registrado modificaciones de descripción para este movimiento.
            </td>
          </tr>
        `;
        return;
      }

      this.auditTableBody.innerHTML = logs.map(log => {
        const fechaObj = new Date(log.fechaCambio);
        const fechaStr = fechaObj.toLocaleString('es-BO', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        });

        return `
          <tr style="border-bottom: 1px solid var(--border-color);">
            <td style="padding: 0.75rem; text-align: left; font-weight: 500; color: var(--text-main); white-space: nowrap;">${fechaStr}</td>
            <td style="padding: 0.75rem; text-align: center; font-weight: 600; color: var(--primary-red);">#${log.transaccionId}</td>
            <td style="padding: 0.75rem; text-align: left; color: var(--text-muted); text-decoration: line-through; max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${this.escapeHtml(log.descripcionAnterior)}">${this.escapeHtml(log.descripcionAnterior)}</td>
            <td style="padding: 0.75rem; text-align: left; color: #28a745; font-weight: 500; max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${this.escapeHtml(log.descripcionNueva)}">${this.escapeHtml(log.descripcionNueva)}</td>
          </tr>
        `;
      }).join('');
    } catch (error) {
      console.error('Error cargando historial de cambios:', error);
      this.auditTableBody.innerHTML = `
        <tr>
          <td colspan="4" style="text-align: center; padding: 2.5rem; color: var(--primary-red); font-weight: 500;">
            Ocurrió un error al obtener la bitácora.
          </td>
        </tr>
      `;
    }
  }

  closeAuditModal() {
    this.auditModalOverlay.classList.remove('active');
    setTimeout(() => {
      this.auditModalOverlay.style.display = 'none';
    }, 200);
    document.body.style.overflow = '';
  }

  closeQrModal() {
    if (this.qrModalOverlay) {
      this.qrModalOverlay.classList.remove('active');
      setTimeout(() => {
        this.qrModalOverlay.style.display = 'none';
      }, 200);
      document.body.style.overflow = '';
    }
  }

  openSidebar() {
    if (this.sidebarMenu && this.sidebarOverlay) {
      this.sidebarMenu.classList.add('active');
      this.sidebarOverlay.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  }

  closeSidebar() {
    if (this.sidebarMenu && this.sidebarOverlay) {
      this.sidebarMenu.classList.remove('active');
      this.sidebarOverlay.classList.remove('active');
      document.body.style.overflow = '';
    }
  }

  downloadQrTicket() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    canvas.width = 400;
    canvas.height = 560;
    
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 2;
    ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);
    
    ctx.textAlign = 'center';
    ctx.fillStyle = '#d91429';
    ctx.font = 'bold 28px Outfit, Arial, sans-serif';
    ctx.fillText('MoneyTrackerEMEC', canvas.width / 2, 60);
    
    ctx.fillStyle = '#64748b';
    ctx.font = '16px Outfit, Arial, sans-serif';
    ctx.fillText('Sistema de Control Financiero', canvas.width / 2, 85);
    
    const img = document.getElementById('qr-image-element');
    if (img && img.complete) {
      const imgSize = 280;
      const imgX = (canvas.width - imgSize) / 2;
      const imgY = 120;
      ctx.drawImage(img, imgX, imgY, imgSize, imgSize);
      
      const footerY = imgY + imgSize + 50;
      
      ctx.beginPath();
      ctx.setLineDash([5, 5]);
      ctx.moveTo(40, footerY - 25);
      ctx.lineTo(canvas.width - 40, footerY - 25);
      ctx.strokeStyle = '#e2e8f0';
      ctx.stroke();
      ctx.setLineDash([]);
      
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 18px Outfit, Arial, sans-serif';
      ctx.fillText('A nombre de: "Mi Esposito"', canvas.width / 2, footerY);
      
      ctx.fillStyle = '#94a3b8';
      ctx.font = '14px Outfit, Arial, sans-serif';
      ctx.fillText('Válido hasta: 25 de mayo del 2028', canvas.width / 2, footerY + 25);
      
      const link = document.createElement('a');
      link.download = 'QR_MiEsposito.jpeg';
      link.href = canvas.toDataURL('image/jpeg', 0.95);
      link.click();
    } else {
      alert('La imagen del QR aún no ha cargado completamente. Intenta de nuevo en un segundo.');
    }
  }

  escapeHtml(str) {
    const div = document.createElement('div');
    div.innerText = str;
    return div.innerHTML;
  }

  showDiagnosticError(type, error) {
    const loadingScreen = document.getElementById('app-loading') || document.body;

    let container = document.getElementById('app-loading');
    if (!container) {
      container = document.createElement('div');
      container.id = 'app-loading';
      container.className = 'app-loading-overlay animate-fade-in';
      document.body.appendChild(container);
    }

    const errorDetailHtml = `
      <div class="diagnostic-card error-generic animate-slide-up">
        <div class="diagnostic-icon">❌</div>
        <h3>Error de Conexión</h3>
        <p>Ocurrió un error al intentar conectarse o inicializar la base de datos.</p>
        <p class="error-msg"><code>${error.message || error.toString()}</code></p>

        <div class="diagnostic-steps">
          <h4>Recomendaciones de Diagnóstico:</h4>
          <ul>
            <li>Asegúrate de que tus <strong>permisos y accesos contables</strong> estén configurados de forma correcta.</li>
            <li>Revisa que tengas una conexión activa a internet e inténtalo de nuevo.</li>
          </ul>
        </div>

        <div class="diagnostic-footer">
          <button class="btn btn-primary" onclick="window.location.reload()">Reintentar Conexión</button>
        </div>
      </div>
    `;

    container.innerHTML = `
      <div class="loading-spinner-container w-full max-w-lg">
        ${errorDetailHtml}
      </div>
    `;
  }

  initTheme() {
    const themeButtons = document.querySelectorAll('.theme-toggle-btn');
    const sidebarThemeBtnLight = document.querySelector('.sidebar-theme-btn-light');
    const sidebarThemeBtnDark = document.querySelector('.sidebar-theme-btn-dark');

    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    const applyTheme = (isDark) => {
      if (isDark) {
        document.body.classList.add('dark-theme');
        localStorage.setItem('theme', 'dark');
      } else {
        document.body.classList.remove('dark-theme');
        localStorage.setItem('theme', 'light');
      }

      // Actualizar los iconos de todos los botones de tema en la página
      themeButtons.forEach(btn => {
        const sunIcon = btn.querySelector('.theme-icon-sun');
        const moonIcon = btn.querySelector('.theme-icon-moon');
        if (isDark) {
          if (sunIcon) sunIcon.style.display = 'block';
          if (moonIcon) moonIcon.style.display = 'none';
        } else {
          if (sunIcon) sunIcon.style.display = 'none';
          if (moonIcon) moonIcon.style.display = 'block';
        }
      });

      // Actualizar el estado activo de los botones divididos en el sidebar móvil
      if (sidebarThemeBtnLight && sidebarThemeBtnDark) {
        if (isDark) {
          sidebarThemeBtnLight.classList.remove('active');
          sidebarThemeBtnDark.classList.add('active');
        } else {
          sidebarThemeBtnLight.classList.add('active');
          sidebarThemeBtnDark.classList.remove('active');
        }
      }
    };

    // Cargar tema inicial (priorizando localStorage y luego preferencia del sistema operativo)
    if (savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) {
      applyTheme(true);
    } else {
      applyTheme(false);
    }

    // Escuchador del click para alternar tema en todos los botones
    themeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const isCurrentlyDark = document.body.classList.contains('dark-theme');
        applyTheme(!isCurrentlyDark);
      });
    });

    // Escuchador para el botón Claro individual en el sidebar móvil
    if (sidebarThemeBtnLight) {
      sidebarThemeBtnLight.addEventListener('click', () => {
        applyTheme(false);
      });
    }

    // Escuchador para el botón Oscuro individual en el sidebar móvil
    if (sidebarThemeBtnDark) {
      sidebarThemeBtnDark.addEventListener('click', () => {
        applyTheme(true);
      });
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
});
