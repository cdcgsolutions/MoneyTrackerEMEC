/**
 * storage.js
 * Gestor de persistencia local para MoneyTrackerEMEC.
 * Administra el almacenamiento de transacciones en localStorage, sin dependencias de Firestore.
 */

export class StorageManager {
  static STORAGE_KEY = 'money_tracker_emec_transacciones';

  // Datos iniciales de cortesía para mostrar en la primera visita (Wow Factor)
  static DEFAULT_DATA = [
    {
      id: 'tx-1',
      fecha: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // hace 4 días
      descripcion: 'Ingreso Sueldo Mensual',
      tipo: 'ingreso',
      monto: 9500.00,
      categoria: 'Sueldo'
    },
    {
      id: 'tx-2',
      fecha: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // hace 3 días
      descripcion: 'Compra mensual de Supermercado',
      tipo: 'egreso',
      monto: 1250.50,
      categoria: 'Comida'
    },
    {
      id: 'tx-3',
      fecha: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // hace 2 días
      descripcion: 'Servicios de Internet Fibra y Luz',
      tipo: 'egreso',
      monto: 380.00,
      categoria: 'Servicios'
    },
    {
      id: 'tx-4',
      fecha: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // ayer
      descripcion: 'Freelance Frontend Rediseño',
      tipo: 'ingreso',
      monto: 2400.00,
      categoria: 'Inversión'
    },
    {
      id: 'tx-5',
      fecha: new Date().toISOString().split('T')[0], // hoy
      descripcion: 'Salida Restaurante / Almuerzo de negocios',
      tipo: 'egreso',
      monto: 180.00,
      categoria: 'Ocio'
    }
  ];

  /**
   * Obtiene todas las transacciones almacenadas.
   * Si no hay registros previos, inicializa el almacenamiento con datos demo elegantes.
   */
  static getTransactions() {
    try {
      const dataStr = localStorage.getItem(this.STORAGE_KEY);
      if (!dataStr) {
        // Inicializar con datos por defecto
        this.setTransactions(this.DEFAULT_DATA);
        return [...this.DEFAULT_DATA];
      }
      return JSON.parse(dataStr);
    } catch (error) {
      console.error('Error leyendo desde localStorage:', error);
      return [];
    }
  }

  /**
   * Sobrescribe el almacenamiento completo.
   */
  static setTransactions(transactions) {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(transactions));
    } catch (error) {
      console.error('Error escribiendo en localStorage:', error);
    }
  }

  /**
   * Guarda una nueva transacción o actualiza una existente.
   * @param {Object} transaction - Objeto con datos de la transacción
   * @returns {Object} La transacción guardada con su ID asignado
   */
  static saveTransaction(transaction) {
    const transactions = this.getTransactions();
    
    // Validar y castear valores numéricos
    const formattedTx = {
      id: transaction.id || 'tx-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 7),
      fecha: transaction.fecha || new Date().toISOString().split('T')[0],
      descripcion: transaction.descripcion.trim(),
      tipo: transaction.tipo === 'ingreso' ? 'ingreso' : 'egreso',
      monto: Math.abs(parseFloat(transaction.monto)) || 0,
      categoria: transaction.categoria || 'Otros'
    };

    if (transaction.id) {
      // Editar
      const index = transactions.findIndex(t => t.id === transaction.id);
      if (index !== -1) {
        transactions[index] = formattedTx;
      } else {
        transactions.push(formattedTx);
      }
    } else {
      // Crear nueva
      transactions.push(formattedTx);
    }

    this.setTransactions(transactions);
    return formattedTx;
  }

  /**
   * Elimina una transacción por su ID.
   * @param {string} id - Identificador de la transacción
   * @returns {boolean} true si se eliminó con éxito
   */
  static deleteTransaction(id) {
    const transactions = this.getTransactions();
    const filtered = transactions.filter(t => t.id !== id);
    
    if (filtered.length !== transactions.length) {
      this.setTransactions(filtered);
      return true;
    }
    return false;
  }
}
