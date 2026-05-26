/**
 * firebase-config.js
 * Inicialización y configuración de los servicios de Firebase para MoneyTrackerEMEC.
 * Utiliza las librerías oficiales de Firebase a través del CDN de ES Modules.
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  signOut 
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { 
  getFirestore, 
  doc, 
  collection, 
  getDocs, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  where,
  runTransaction 
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

// Configuración de Firebase provista por el usuario
const firebaseConfig = {
  apiKey: "AIzaSyBr-jYD7m6-uZ3uMq4KwciV0HQAOXqf2bs",
  authDomain: "moneytrackeremec.firebaseapp.com",
  projectId: "moneytrackeremec",
  storageBucket: "moneytrackeremec.firebasestorage.app",
  messagingSenderId: "648669955820",
  appId: "1:648669955820:web:dafecdde6959f0f48207c9",
  measurementId: "G-M7MVCJLM7L"
};

// Inicializar la aplicación de Firebase
const app = initializeApp(firebaseConfig);

// Inicializar los servicios de Auth y Firestore
const auth = getAuth(app);
const db = getFirestore(app);

export { 
  app, 
  auth, 
  db, 
  signInWithEmailAndPassword,
  signOut,
  doc, 
  collection, 
  getDocs, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  where,
  runTransaction 
};
