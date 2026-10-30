
import { collection, getDocs } from "firebase/firestore";
import { db } from "./firebase";

export async function getFirestoreListings() {
  const snapshot = await getDocs(collection(db, "listings"));

  return snapshot.docs.map((item) => ({
    id: item.id,
    ...item.data(),
  }));
}
