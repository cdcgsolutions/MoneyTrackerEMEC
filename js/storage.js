/**
 * storage.js
 * Adaptación del Gestor de Persistencia de MoneyTrackerEMEC para Cloud Firestore y FireAuth.
 * Implementa mapeo a IDs de usuario numéricos, contadores autoincrementables concurrentes 
 * guardados directamente en el documento del usuario, bajas lógicas (Soft Delete),
 * restricción de edición a descripción, bitácora de cambios (bitacora) secuencial y recálculo en cascada.
 */

import { 
  db, 
  doc, 
  collection, 
  getDocs, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where,
  runTransaction 
} from './firebase-config.js';

export class StorageManager {
  // Categorías por defecto del sistema
  static DEFAULT_CATEGORIES = [
    { id: '1', nombre: 'Sueldo' },
    { id: '2', nombre: 'Comida' },
    { id: '3', nombre: 'Servicios' },
    { id: '4', nombre: 'Transporte' },
    { id: '5', nombre: 'Ocio' },
    { id: '6', nombre: 'Inversión' },
    { id: '7', nombre: 'Otros' }
  ];

  /**
   * Obtiene o crea un ID numérico secuencial para el usuario autenticado.
   */
  static async getOrCreateUserNumericId(authUid, email) {
    if (!authUid) return null;
    
    try {
      const usersColl = collection(db, 'users');
      const q = query(usersColl, where('uid', '==', authUid));
      const snap = await getDocs(q);
      
      if (!snap.empty) {
        return snap.docs[0].id;
      }
      
      const globalCounterRef = doc(db, 'global_counters', 'users');
      
      return await runTransaction(db, async (transaction) => {
        const globalCounterSnap = await transaction.get(globalCounterRef);
        let nextUserId = 1;
        
        if (globalCounterSnap.exists()) {
          nextUserId = (globalCounterSnap.data().currentId || 0) + 1;
        }
        
        transaction.set(globalCounterRef, { currentId: nextUserId });
        
        const newUserRef = doc(db, 'users', nextUserId.toString());
        transaction.set(newUserRef, {
          uid: authUid,
          email: email,
          currentCategoryId: 0,
          currentTransactionId: 0,
          currentAuditLogId: 0
        });
        
        return nextUserId.toString();
      });
    } catch (error) {
      console.error('Error al mapear/crear ID numérico del usuario:', error);
      throw error;
    }
  }

  /**
   * Helper para obtener el siguiente ID de transacción secuencial para un usuario.
   */
  static async getNextTransactionId(userNumericId) {
    const userRef = doc(db, 'users', userNumericId);
    
    return await runTransaction(db, async (transaction) => {
      const userSnap = await transaction.get(userRef);
      let nextId = 1;
      
      if (userSnap.exists()) {
        nextId = (userSnap.data().currentTransactionId || 0) + 1;
      }
      
      transaction.update(userRef, { currentTransactionId: nextId });
      return nextId.toString();
    });
  }

  /**
   * Helper para obtener el siguiente ID de bitácora secuencial y autoincremental para un usuario.
   */
  static async getNextAuditLogId(userNumericId) {
    const userRef = doc(db, 'users', userNumericId);
    
    return await runTransaction(db, async (transaction) => {
      const userSnap = await transaction.get(userRef);
      let nextId = 1;
      
      if (userSnap.exists()) {
        nextId = (userSnap.data().currentAuditLogId || 0) + 1;
      }
      
      transaction.update(userRef, { currentAuditLogId: nextId });
      return nextId.toString();
    });
  }

  /**
   * Inicializa las categorías por defecto en Firestore para un nuevo usuario.
   */
  static async initializeDefaultCategories(userNumericId) {
    const batchPromises = this.DEFAULT_CATEGORIES.map(cat => {
      const catRef = doc(db, 'users', userNumericId, 'categorias', cat.id);
      return setDoc(catRef, { nombre: cat.nombre });
    });
    
    await Promise.all(batchPromises);
    
    const userRef = doc(db, 'users', userNumericId);
    await updateDoc(userRef, { currentCategoryId: 7 });
  }

  /**
   * Obtiene la lista de categorías del usuario desde Firestore.
   */
  static async getCategories(userNumericId) {
    if (!userNumericId) return [];
    
    try {
      const catCollectionRef = collection(db, 'users', userNumericId, 'categorias');
      const snap = await getDocs(catCollectionRef);
      
      if (snap.empty) {
        await this.initializeDefaultCategories(userNumericId);
        return [...this.DEFAULT_CATEGORIES];
      }
      
      const categories = snap.docs.map(d => ({
        id: d.id,
        nombre: d.data().nombre
      }));
      
      return categories.sort((a, b) => Number(a.id) - Number(b.id));
    } catch (error) {
      console.error('Error obteniendo categorías desde Firestore:', error);
      return [];
    }
  }

  /**
   * Obtiene todas las transacciones de un usuario desde Firestore.
   */
  static async getTransactions(userNumericId) {
    if (!userNumericId) return [];
    
    try {
      const txCollectionRef = collection(db, 'users', userNumericId, 'transacciones');
      const snap = await getDocs(txCollectionRef);
      
      const transactions = snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          fecha: data.fecha,
          descripcion: data.descripcion,
          tipo: data.tipo,
          monto: Number(data.monto) || 0,
          categoriaId: data.categoriaId,
          saldoDespues: Number(data.saldoDespues) || 0,
          activo: data.activo !== false // Por defecto es activa (true)
        };
      });

      // Ordenar cronológicamente (ascendente) por fecha, y si son iguales, por ID numérico
      // Esto es crucial para el cálculo correcto de balances acumulados en cascada
      return transactions.sort((a, b) => {
        const dateDiff = new Date(a.fecha) - new Date(b.fecha);
        if (dateDiff !== 0) return dateDiff;
        return Number(a.id) - Number(b.id);
      });
    } catch (error) {
      console.error('Error obteniendo transacciones desde Firestore:', error);
      return [];
    }
  }

  /**
   * Guarda una transacción (crea o edita).
   * Si es edición, restringe la modificación de forma segura únicamente al campo de descripción.
   * Graba en la subcolección 'bitacora' si hubo un cambio en la descripción.
   */
  static async saveTransaction(userNumericId, transactionData) {
    if (!userNumericId) throw new Error('Usuario no autenticado.');

    let targetId = transactionData.id;

    if (targetId) {
      // --- MODO EDICIÓN SEGURO ---
      const txDocRef = doc(db, 'users', userNumericId, 'transacciones', targetId);
      const txSnap = await getDoc(txDocRef);
      
      if (txSnap.exists()) {
        const oldData = txSnap.data();
        const oldDescription = oldData.descripcion || '';
        const newDescription = transactionData.descripcion.trim();
        
        // Solo actualizar la descripción en base de datos
        await updateDoc(txDocRef, { descripcion: newDescription });
        
        // Registrar en Bitácora si cambió la descripción
        if (oldDescription !== newDescription) {
          await this.createAuditLog(userNumericId, targetId, oldDescription, newDescription);
        }
      }
    } else {
      // --- MODO CREACIÓN ---
      targetId = await this.getNextTransactionId(userNumericId);
      const txDocRef = doc(db, 'users', userNumericId, 'transacciones', targetId);
      
      const payload = {
        fecha: transactionData.fecha,
        descripcion: transactionData.descripcion.trim(),
        tipo: transactionData.tipo === 'ingreso' ? 'ingreso' : 'egreso',
        monto: Math.abs(parseFloat(transactionData.monto)) || 0,
        categoriaId: transactionData.categoriaId,
        saldoDespues: 0,
        activo: true // Por defecto activa
      };
      
      await setDoc(txDocRef, payload);
    }

    // Recalcular saldos contables cronológicamente
    await this.recalculateBalances(userNumericId);
  }

  /**
   * Crea una entrada de auditoría secuencial y autoincremental en la subcolección 'bitacora'.
   */
  static async createAuditLog(userNumericId, transaccionId, descAnterior, descNueva) {
    try {
      const logId = await this.getNextAuditLogId(userNumericId);
      const logRef = doc(db, 'users', userNumericId, 'bitacora', logId);
      
      await setDoc(logRef, {
        transaccionId: transaccionId,
        fechaCambio: new Date().toISOString(),
        descripcionAnterior: descAnterior,
        descripcionNueva: descNueva
      });
    } catch (error) {
      console.error('Error registrando log de auditoría:', error);
    }
  }

  /**
   * Obtiene la bitácora de cambios ('bitacora') del usuario o de una transacción en específico,
   * ordenada del registro más reciente al más antiguo por ID numérico.
   */
  static async getAuditLogs(userNumericId, transaccionId = null) {
    if (!userNumericId) return [];
    
    try {
      const logsCollRef = collection(db, 'users', userNumericId, 'bitacora');
      let q = logsCollRef;
      
      if (transaccionId) {
        q = query(logsCollRef, where('transaccionId', '==', transaccionId));
      }
      
      const snap = await getDocs(q);
      
      const logs = snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          transaccionId: data.transaccionId,
          fechaCambio: data.fechaCambio,
          descripcionAnterior: data.descripcionAnterior,
          descripcionNueva: data.descripcionNueva
        };
      });
      
      // Ordenar descendente (lo más reciente primero) usando el ID numérico secuencial
      return logs.sort((a, b) => Number(b.id) - Number(a.id));
    } catch (error) {
      console.error('Error obteniendo bitácora:', error);
      return [];
    }
  }

  /**
   * Aplica baja lógica (Soft Delete) cambiando el flag 'activo' a false.
   */
  static async deleteTransaction(userNumericId, id) {
    if (!userNumericId) throw new Error('Usuario no autenticado.');

    const txDocRef = doc(db, 'users', userNumericId, 'transacciones', id);
    await updateDoc(txDocRef, { activo: false });

    // Recalcular saldos posteriores
    await this.recalculateBalances(userNumericId);
    return true;
  }

  /**
   * Algoritmo de recálculo en cascada de los saldos acumulados (Running Balance).
   * Omite del balance las transacciones que tengan activo === false.
   */
  static async recalculateBalances(userNumericId) {
    const transactions = await this.getTransactions(userNumericId); // Vienen ascendentes
    
    let runningBalance = 0;
    const updatePromises = [];

    for (const tx of transactions) {
      if (tx.activo !== false) {
        const amt = tx.monto;
        if (tx.tipo === 'ingreso') {
          runningBalance += amt;
        } else {
          runningBalance -= amt;
        }
      }

      // Si la transacción está anulada, conserva el acumulado del runningBalance actual
      const expectedBalance = runningBalance;
      
      if (tx.saldoDespues !== expectedBalance) {
        const txDocRef = doc(db, 'users', userNumericId, 'transacciones', tx.id);
        updatePromises.push(
          updateDoc(txDocRef, { saldoDespues: expectedBalance })
        );
      }
    }

    if (updatePromises.length > 0) {
      await Promise.all(updatePromises);
    }
  }
}
