import { initializeApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: "AIzaSyABYZVghn9xTe270L-ETZOS6Y7LOfLtwIQ",
  authDomain: "ai-todos-8b4bf.firebaseapp.com",
  projectId: "ai-todos-8b4bf",
  storageBucket: "ai-todos-8b4bf.firebasestorage.app",
  messagingSenderId: "83440176706",
  appId: "1:83440176706:web:5e718c725743995d0de7db",
  measurementId: "G-GML4DGHWQ0"
};

export const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app); 