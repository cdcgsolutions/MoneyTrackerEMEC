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

const firebaseConfig = {
  apiKey: "AIzaSyBr-jYD7m6-uZ3uMq4KwciV0HQAOXqf2bs",
  authDomain: "moneytrackeremec.firebaseapp.com",
  projectId: "moneytrackeremec",
  storageBucket: "moneytrackeremec.firebasestorage.app",
  messagingSenderId: "648669955820",
  appId: "1:648669955820:web:dafecdde6959f0f48207c9",
  measurementId: "G-M7MVCJLM7L"
};

const app = initializeApp(firebaseConfig);

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
