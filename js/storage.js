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

  static DEFAULT_CATEGORIES = [
    { id: '1', nombre: 'Sueldo' },
    { id: '2', nombre: 'Comida' },
    { id: '3', nombre: 'Servicios' },
    { id: '4', nombre: 'Transporte' },
    { id: '5', nombre: 'Ocio' },
    { id: '6', nombre: 'Inversión' },
    { id: '7', nombre: 'Otros' }
  ];

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

  static async initializeDefaultCategories(userNumericId) {
    const batchPromises = this.DEFAULT_CATEGORIES.map(cat => {
      const catRef = doc(db, 'users', userNumericId, 'categorias', cat.id);
      return setDoc(catRef, { nombre: cat.nombre });
    });

    await Promise.all(batchPromises);

    const userRef = doc(db, 'users', userNumericId);
    await updateDoc(userRef, { currentCategoryId: 7 });
  }

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
          activo: data.activo !== false
        };
      });

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

  static async saveTransaction(userNumericId, transactionData) {
    if (!userNumericId) throw new Error('Usuario no autenticado.');

    let targetId = transactionData.id;

    if (targetId) {

      const txDocRef = doc(db, 'users', userNumericId, 'transacciones', targetId);
      const txSnap = await getDoc(txDocRef);

      if (txSnap.exists()) {
        const oldData = txSnap.data();
        const oldDescription = oldData.descripcion || '';
        const newDescription = transactionData.descripcion.trim();

        await updateDoc(txDocRef, { descripcion: newDescription });

        if (oldDescription !== newDescription) {
          await this.createAuditLog(userNumericId, targetId, oldDescription, newDescription);
        }
      }
    } else {

      targetId = await this.getNextTransactionId(userNumericId);
      const txDocRef = doc(db, 'users', userNumericId, 'transacciones', targetId);

      const payload = {
        fecha: transactionData.fecha,
        descripcion: transactionData.descripcion.trim(),
        tipo: transactionData.tipo === 'ingreso' ? 'ingreso' : 'egreso',
        monto: Math.abs(parseFloat(transactionData.monto)) || 0,
        categoriaId: transactionData.categoriaId,
        saldoDespues: 0,
        activo: true
      };

      await setDoc(txDocRef, payload);
    }

    await this.recalculateBalances(userNumericId);
  }

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

      return logs.sort((a, b) => Number(b.id) - Number(a.id));
    } catch (error) {
      console.error('Error obteniendo bitácora:', error);
      return [];
    }
  }

  static async deleteTransaction(userNumericId, id) {
    if (!userNumericId) throw new Error('Usuario no autenticado.');

    const txDocRef = doc(db, 'users', userNumericId, 'transacciones', id);
    await updateDoc(txDocRef, { activo: false });

    await this.recalculateBalances(userNumericId);
    return true;
  }

  static async recalculateBalances(userNumericId) {
    const transactions = await this.getTransactions(userNumericId);

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
