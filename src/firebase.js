
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBeHeuUx_Jx5cNtQbYi4wdc5sesN73IKzs",
  authDomain: "stayhunt-740b0.firebaseapp.com",
  projectId: "stayhunt-740b0",
  storageBucket: "stayhunt-740b0.firebasestorage.app",
  messagingSenderId: "692031425269",
  appId: "1:692031425269:web:a7be29e1125c673416d3bc",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

