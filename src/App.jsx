
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Search,
  MapPin,
  Heart,
  GraduationCap,
  Wifi,
  Utensils,
  Bath,
  BedDouble,
  SlidersHorizontal,
  RefreshCw,
  Eye,
  X,
  CalendarDays,
  UserRound,
  LogOut,
  Menu,
  Sparkles,
  CheckCircle2,
  Clock3,
  PartyPopper,
  ArrowUp,
} from "lucide-react";
import { getFirestoreListings } from "./firestoreTest";
import { db } from "./firebase";
import confetti from "canvas-confetti";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import {
  getAuth,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";

const auth = getAuth();

const institutions = [
  "All institutions",
  "Sri Sai University",
  "CSK Himachal Pradesh Krishi Vishvavidyalaya",
  "Government College Palampur",
];

const locations = [
  "All locations",
  "Palampur",
  "Sungal",
  "Banuri",
  "Padhiarkhar",
  "Maranda",
  "Panchrukhi",
];

function App() {
  const [showWelcomeIntro, setShowWelcomeIntro] = useState(() => {
    if (typeof window === "undefined") return false;
    return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });
  const [stays, setStays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [institution, setInstitution] = useState("All institutions");
  const [locationFilter, setLocationFilter] = useState("All locations");
  const [selectedStay, setSelectedStay] = useState(null);
  const [bookingStay, setBookingStay] = useState(null);
  const [bookingMessage, setBookingMessage] = useState("");
  const [bookingError, setBookingError] = useState("");
  const [bookingSubmitting, setBookingSubmitting] = useState(false);
  const bookingSubmittingRef = useRef(false);
  const [toastMessage, setToastMessage] = useState("");
  const toastTimerRef = useRef(null);
  const [roomType, setRoomType] = useState("All types");
  const [maxRent, setMaxRent] = useState("10000");
  const [wifiOnly, setWifiOnly] = useState(false);
  const [mealsOnly, setMealsOnly] = useState(false);
  const [wishlist, setWishlist] = useState([]);
  const [wishlistReady, setWishlistReady] = useState(false);
  const [heartPopId, setHeartPopId] = useState(null);
  const [showWishlist, setShowWishlist] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [requestView, setRequestView] = useState("active");
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState("login");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminChecking, setAdminChecking] = useState(true);
  const [showAdminDashboard, setShowAdminDashboard] = useState(false);
  const [adminTab, setAdminTab] = useState("overview");
  const [visitRequests, setVisitRequests] = useState([]);
  const [studentRequests, setStudentRequests] = useState([]);
  const [showMyRequests, setShowMyRequests] = useState(false);
  const [adminMessage, setAdminMessage] = useState("");
  const [listingSaving, setListingSaving] = useState(false);
  const [editingListingId, setEditingListingId] = useState(null);
  const [listingForm, setListingForm] = useState({
    name: "", location: "Palampur", institution: "Sri Sai University",
    type: "Girls PG", rent: "", image: "", description: "", bathroom: "",
    meals: "", furnished: "", facilities: "", availability: "Available",
  });
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => setCurrentUser(user));
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!showWelcomeIntro) return undefined;
    const introTimer = window.setTimeout(() => setShowWelcomeIntro(false), 4600);
    return () => window.clearTimeout(introTimer);
  }, [showWelcomeIntro]);

  useEffect(() => {
    const nodes = document.querySelectorAll("[data-reveal]");
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      nodes.forEach((node) => node.classList.add("is-visible"));
      return undefined;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [stays.length, showWishlist, loading]);

  useEffect(() => () => window.clearTimeout(toastTimerRef.current), []);

  useEffect(() => {
    const handleScroll = () => setShowBackToTop(window.scrollY > 420);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  function scrollToTop() {
    window.scrollTo({
      top: 0,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    });
  }

  function showToast(message) {
    setToastMessage(message);
    window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToastMessage(""), 3200);
  }

  useEffect(() => {
    let active = true;

    async function verifyAdmin() {
      if (!currentUser) {
        setIsAdmin(false);
        setAdminChecking(false);
        setShowAdminDashboard(false);
        return;
      }

      setAdminChecking(true);
      try {
        const adminRef = doc(db, "admins", currentUser.uid);
        const adminSnap = await getDoc(adminRef);
        if (active) {
          setIsAdmin(adminSnap.exists() && adminSnap.data().role === "admin");
        }
      } catch (err) {
        console.error("Admin verification failed:", err);
        if (active) setIsAdmin(false);
      } finally {
        if (active) setAdminChecking(false);
      }
    }

    void verifyAdmin();
    return () => { active = false; };
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser || isAdmin) {
      return undefined;
    }

    const studentRequestsQuery = query(
      collection(db, "visitRequests"),
      where("studentId", "==", currentUser.uid)
    );
    const unsubscribe = onSnapshot(
      studentRequestsQuery,
      (snapshot) => {
        const requests = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
        requests.sort((a, b) => {
          const aTime = a.createdAt?.toMillis?.() || 0;
          const bTime = b.createdAt?.toMillis?.() || 0;
          return bTime - aTime;
        });
        setStudentRequests(requests);
      },
      (err) => {
        console.error("Student visit requests loading failed:", err);
      }
    );
    return unsubscribe;
  }, [currentUser, isAdmin]);

  useEffect(() => {
    if (!isAdmin || !showAdminDashboard) return undefined;

    const requestsQuery = query(
      collection(db, "visitRequests"),
      orderBy("createdAt", "desc")
    );
    const unsubscribe = onSnapshot(
      requestsQuery,
      (snapshot) => {
        setVisitRequests(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
      },
      (err) => {
        console.error("Visit requests loading failed:", err);
        setAdminMessage("Could not load visit requests. Check Firestore rules.");
      }
    );

    return unsubscribe;
  }, [isAdmin, showAdminDashboard]);

  useEffect(() => {
    let cancelled = false;

    async function loadUserWishlist() {
      if (!currentUser) {
        setWishlist([]);
        setWishlistReady(true);
        return;
      }
      if (!cancelled) setWishlistReady(false);

      try {
        const wishlistRef = doc(db, "wishlists", currentUser.uid);
        const snapshot = await getDoc(wishlistRef);
        if (!cancelled) {
          setWishlist(snapshot.exists() ? snapshot.data().listingIds || [] : []);
          setWishlistReady(true);
        }
      } catch (err) {
        console.error("Wishlist loading error:", err);
        if (!cancelled) { setWishlist([]); setWishlistReady(true); }
      }
    }

    void loadUserWishlist();
    return () => { cancelled = true; };
  }, [currentUser]);

  async function handleEmailAuth(event) {
    event.preventDefault();
    setAuthError("");
    setAuthMessage("");
    setAuthLoading(true);
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") || "").trim();
    const password = String(formData.get("password") || "");
    try {
      if (authMode === "signup") {
        await createUserWithEmailAndPassword(auth, email, password);
        setAuthMessage("Account created successfully!");
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        setAuthMessage("You are logged in!");
      }
      setShowAuth(false);
    } catch (err) {
      console.error("Authentication error:", err);
      const messages = {
        "auth/email-already-in-use": "This email already has an account. Please log in.",
        "auth/invalid-email": "Please enter a valid email address.",
        "auth/weak-password": "Password must be at least 6 characters.",
        "auth/invalid-credential": "Email or password is incorrect.",
        "auth/user-not-found": "No account found. Please sign up first.",
        "auth/too-many-requests": "Too many attempts. Please try again later.",
        "auth/operation-not-allowed": "Enable Email/Password in Firebase Authentication settings.",
      };
      setAuthError(messages[err.code] || err.message || "Could not complete authentication.");
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleLogout() {
    try {
      await signOut(auth);
      setCurrentUser(null);
      setShowProfile(false);
    } catch (err) {
      console.error("Logout error:", err);
      setAuthError("Could not log out. Please try again.");
    }
  }

  function openAuth(mode = "login") {
    setAuthMode(mode);
    setAuthError("");
    setAuthMessage("");
    setShowAuth(true);
  }

  async function loadListings() {
    try {
      setLoading(true);
      setError("");

      const data = await getFirestoreListings();
      setStays(data);
    } catch (err) {
      console.error("Firestore loading error:", err);
      setError(
        "Listings not loaded."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function loadListings() {
      try {
        setLoading(true);
        setError("");

        const data = await getFirestoreListings();
        if (!cancelled) {
          setStays(data);
        }
      } catch (err) {
        console.error("Firestore loading error:", err);
        if (!cancelled) {
          setError(
            "Listings not loaded."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadListings();

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredStays = useMemo(() => {
    return stays.filter((stay) => {
      const name = String(stay.name || stay.title || "");
      const location = String(stay.location || "Palampur");
      const college = String(stay.institution || "");
      const type = String(stay.type || stay.roomType || "");
      const facilities = Array.isArray(stay.facilities)
        ? stay.facilities
        : [];

      const rent = Number(stay.rent ?? stay.price ?? 0);

      const matchesSearch = name.toLowerCase().includes(search.trim().toLowerCase());
      const matchesInstitution =
        institution === "All institutions" || college.toLowerCase() === institution.toLowerCase();
      const matchesLocation =
        locationFilter === "All locations" || location.toLowerCase() === locationFilter.toLowerCase();

      const matchesType =
        roomType === "All types" || type === roomType;

      const matchesRent = rent <= Number(maxRent);

      const matchesWifi =
        !wifiOnly ||
        facilities.some((facility) =>
          String(facility).toLowerCase().includes("wi-fi") ||
          String(facility).toLowerCase().includes("wifi")
        );

      const matchesMeals =
        !mealsOnly ||
        stay.meals === true ||
        String(stay.meals || "").toLowerCase().includes("meal");

      return (
        matchesSearch &&
        matchesInstitution &&
        matchesLocation &&
        matchesType &&
        matchesRent &&
        matchesWifi &&
        matchesMeals
      );
    });
  }, [
    stays,
    search,
    institution,
    locationFilter,
    roomType,
    maxRent,
    wifiOnly,
    mealsOnly,
  ]);

  async function toggleWishlist(id) {
    if (!currentUser) {
      openAuth("login");
      setAuthError("Please log in to use your wishlist.");
      return;
    }
    if (!wishlistReady) {
      showToast("Your wishlist is still loading. Please try again in a moment.");
      return;
    }

    const wasSaved = wishlist.includes(id);
    const updated = wasSaved ? wishlist.filter((item) => item !== id) : [...wishlist, id];
    try {
      await setDoc(doc(db, "wishlists", currentUser.uid), { listingIds: updated }, { merge: true });
      setWishlist(updated);
      if (!wasSaved) { setHeartPopId(id); showToast("Added to your wishlist!"); }
      else setHeartPopId(null);
    } catch (err) {
      console.error("Wishlist saving error:", err);
      showToast("Wishlist could not be saved. Please check your connection and Firebase rules.");
    }
  }

  function resetListingForm() {
    setEditingListingId(null);
    setListingForm({
      name: "", location: "Palampur", institution: "Sri Sai University",
      type: "Girls PG", rent: "", image: "", description: "", bathroom: "",
      meals: "", furnished: "", facilities: "", availability: "Available",
    });
  }

  function startEditListing(stay) {
    setEditingListingId(stay.id);
    setListingForm({
      name: stay.name || stay.title || "",
      location: stay.location || "Palampur",
      institution: stay.institution || "",
      type: stay.type || stay.roomType || "Girls PG",
      rent: String(stay.rent ?? stay.price ?? ""),
      image: stay.image || stay.imageUrl || "",
      description: stay.description || "",
      bathroom: stay.bathroom || "",
      meals: stay.meals === true ? "Available" : String(stay.meals || ""),
      furnished: stay.furnished || "",
      facilities: Array.isArray(stay.facilities) ? stay.facilities.join(", ") : "",
      availability: stay.availability || "Available",
    });
    setAdminTab("listings");
    setAdminMessage("");
  }

  async function saveListing(event) {
    event.preventDefault();
    if (!isAdmin) return;
    setListingSaving(true);
    setAdminMessage("");
    const payload = {
      name: listingForm.name.trim(),
      location: listingForm.location.trim(),
      institution: listingForm.institution.trim(),
      type: listingForm.type,
      rent: Number(listingForm.rent),
      image: listingForm.image.trim(),
      description: listingForm.description.trim(),
      bathroom: listingForm.bathroom,
      meals: listingForm.meals,
      furnished: listingForm.furnished,
      facilities: listingForm.facilities.split(",").map((value) => value.trim()).filter(Boolean),
      availability: listingForm.availability,
      updatedAt: serverTimestamp(),
    };

    try {
      if (editingListingId) {
        await updateDoc(doc(db, "listings", editingListingId), payload);
        setAdminMessage("Listing updated successfully.");
      } else {
        await addDoc(collection(db, "listings"), { ...payload, createdAt: serverTimestamp() });
        setAdminMessage("New listing added successfully.");
      }
      resetListingForm();
      await loadListings();
    } catch (err) {
      console.error("Saving listing failed:", err);
      setAdminMessage("Could not save listing. Check that Firestore rules are published and your account is admin.");
    } finally {
      setListingSaving(false);
    }
  }

  async function removeListing(listingId) {
    if (!isAdmin || !window.confirm("Delete this listing permanently?")) return;
    try {
      await deleteDoc(doc(db, "listings", listingId));
      setAdminMessage("Listing deleted.");
      await loadListings();
    } catch (err) {
      console.error("Deleting listing failed:", err);
      setAdminMessage("Could not delete listing. Check Firestore permissions.");
    }
  }

  async function updateVisitRequest(requestId, status) {
    if (!isAdmin) return;
    try {
      await updateDoc(doc(db, "visitRequests", requestId), {
        status,
        reviewedAt: serverTimestamp(),
      });
      setAdminMessage(status === "Archived" ? "Rejected request archived. You can find it in Archived requests." : `Visit request ${status.toLowerCase()}.`);
    } catch (err) {
      console.error("Updating visit request failed:", err);
      setAdminMessage("Could not update request. Check Firestore permissions.");
    }
  }

  function resetFilters() {
    setSearch("");
    setInstitution("All institutions");
    setLocationFilter("All locations");
    setRoomType("All types");
    setMaxRent("10000");
    setWifiOnly(false);
    setMealsOnly(false);
  }

  const displayedStays = showWishlist
    ? stays.filter((stay) => wishlist.includes(stay.id))
    : filteredStays;

  function openStays() {
    setShowWishlist(false);
    setMobileMenuOpen(false);
    setShowAdminDashboard(false);
    requestAnimationFrame(() => document.getElementById("stays")?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" }));
  }

  function openWishlist() {
    if (!currentUser) {
      openAuth("login");
      setAuthError("Please log in to view your wishlist.");
      return;
    }
    setShowWishlist(true);
    setMobileMenuOpen(false);
    requestAnimationFrame(() => document.getElementById("stays")?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" }));
  }

  async function handleBookingSubmit(event) {
    event.preventDefault();
    if (bookingSubmittingRef.current) return;
    if (!currentUser) {
      setBookingStay(null);
      openAuth("login");
      setAuthError("Please log in before sending a visit request.");
      return;
    }
    if (!bookingStay) return;

    const form = new FormData(event.currentTarget);
    const visitorName = String(form.get("visitorName") || "").trim();
    const visitorPhone = String(form.get("visitorPhone") || "").trim();
    const visitDate = String(form.get("visitDate") || "");
    if (!visitorName || !visitorPhone || !visitDate) {
      setBookingError("Please complete all fields.");
      return;
    }

    bookingSubmittingRef.current = true;
    setBookingSubmitting(true);
    setBookingError("");
    try {
      const existingQuery = query(
        collection(db, "visitRequests"),
        where("studentId", "==", currentUser.uid),
        where("listingId", "==", bookingStay.id),
        where("status", "==", "Pending")
      );
      const existingSnapshot = await getDocs(existingQuery);
      const legacyPending = studentRequests.some((request) =>
        request.listingId === bookingStay.id && (!request.status || request.status === "Pending")
      );
      if (!existingSnapshot.empty || legacyPending) {
        setBookingError("You already have a pending visit request for this stay.");
        return;
      }

      await addDoc(collection(db, "visitRequests"), {
        listingId: bookingStay.id,
        listingName: bookingStay.name || bookingStay.title || "Stay",
        studentId: currentUser.uid,
        studentEmail: currentUser.email || "",
        studentName: visitorName,
        phone: visitorPhone,
        visitDate,
        status: "Pending",
        createdAt: serverTimestamp(),
      });
      setBookingMessage("Your visit request has been sent successfully. You can check its status after the admin reviews it.");
      try {
        confetti({ particleCount: 85, spread: 65, origin: { y: 0.65 } });
      } catch (confettiError) {
        console.warn("Confetti animation unavailable:", confettiError);
      }
    } catch (err) {
      console.error("Visit request submission failed:", err);
      setBookingError("The request could not be sent. Please check your connection and Firestore rules, then try again.");
    } finally {
      bookingSubmittingRef.current = false;
      setBookingSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-[#fffaf5] text-stone-800">
      {showWelcomeIntro && (
        <div className="welcome-overlay fixed inset-0 z-200 flex min-h-100svh items-center justify-center overflow-hidden bg-[#fff0e8] px-5" role="dialog" aria-label="Welcome to StayHunt">
          <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
            <span className="welcome-float text-3xl" style={{ left: "7%", "--duration": "6.2s", "--delay": "-.4s", "--drift": "25px" }}>☁️</span>
            <span className="welcome-float text-2xl" style={{ left: "19%", "--duration": "5.7s", "--delay": "-2.1s", "--drift": "-18px" }}>🫧</span>
            <span className="welcome-float text-2xl" style={{ left: "34%", "--duration": "6.5s", "--delay": "-1.2s", "--drift": "20px" }}>✨</span>
            <span className="welcome-float text-3xl" style={{ left: "51%", "--duration": "5.9s", "--delay": "-3s", "--drift": "-22px" }}>🧸</span>
            <span className="welcome-float text-2xl" style={{ left: "68%", "--duration": "6.4s", "--delay": "-1.8s", "--drift": "16px" }}>💗</span>
            <span className="welcome-float text-3xl" style={{ left: "83%", "--duration": "5.8s", "--delay": "-2.7s", "--drift": "-20px" }}>☁️</span>
            <span className="welcome-float text-2xl" style={{ left: "93%", "--duration": "6.1s", "--delay": "-.9s", "--drift": "14px" }}>🫧</span>
            <span className="welcome-twinkle absolute left-[17%] top-[22%] text-xl text-[#d77a50]">✦</span>
            <span className="welcome-twinkle absolute right-[18%] top-[27%] text-2xl text-[#d77a50]" style={{ animationDelay: ".7s" }}>✧</span>
            <span className="welcome-twinkle absolute bottom-[24%] left-[23%] text-lg text-[#d77a50]" style={{ animationDelay: "1.1s" }}>✦</span>
            <span className="welcome-twinkle absolute bottom-[28%] right-[24%] text-xl text-[#d77a50]" style={{ animationDelay: ".35s" }}>✧</span>
            <div className="absolute -left-20 top-16 h-52 w-52 rounded-full bg-[#f8d5c4]/55 blur-3xl" />
            <div className="absolute -right-20 bottom-12 h-56 w-56 rounded-full bg-[#f4c5b4]/45 blur-3xl" />
          </div>
          <div className="relative z-10 flex w-full max-w-sm flex-col items-center text-center">
            <div className="welcome-house relative mb-5 flex h-44 w-44 items-center justify-center rounded-[2.5rem] bg-[#f8dfd2]/80 shadow-[0_18px_55px_rgba(166,75,43,0.12)]">
              <svg viewBox="0 0 180 160" className="h-36 w-36 drop-shadow-sm" role="img" aria-label="A little home with a heart window">
                <path d="M22 76 L90 18 L158 76" fill="none" stroke="#bd542d" strokeWidth="15" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M43 68 V139 Q43 145 50 145 H130 Q137 145 137 139 V68 L90 29 Z" fill="#d8754e" />
                <path d="M90 112 C78 98 61 87 61 73 C61 60 77 54 90 69 C103 54 119 60 119 73 C119 87 102 99 90 112Z" fill="#fff4ec" />
                <path d="M31 76 L90 25 L149 76" fill="none" stroke="#f3b99f" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" opacity=".9" />
              </svg>
              <span className="welcome-twinkle absolute -right-2 top-5 text-2xl text-[#c75b32]">✦</span>
              <span className="welcome-twinkle absolute -left-3 bottom-8 text-xl text-[#c75b32]" style={{ animationDelay: ".8s" }}>✧</span>
            </div>
            <p className="welcome-text text-xs font-extrabold uppercase tracking-[0.28em] text-[#b64b27]">A little place to call home</p>
            <h1 className="welcome-text mt-3 text-4xl font-black tracking-tight text-[#34231e]" style={{ animationDelay: ".95s" }}>Welcome to <span className="text-[#c64e24]">StayHunt</span></h1>
            <p className="welcome-text mt-3 max-w-xs text-sm leading-6 text-[#806458]" style={{ animationDelay: "1.15s" }}>Find a stay that feels like home. 🏡</p>
            <button type="button" onClick={() => setShowWelcomeIntro(false)} className="welcome-text mt-7 rounded-full bg-[#c9471d] px-7 py-3.5 text-sm font-bold text-white shadow-[0_9px_24px_rgba(190,70,30,0.24)] transition hover:-translate-y-0.5 hover:bg-[#ad3917]" style={{ animationDelay: "1.35s" }}>Explore StayHunt <span aria-hidden="true">✦</span></button>
            <button type="button" onClick={() => setShowWelcomeIntro(false)} className="welcome-text mt-3 px-4 py-2 text-xs font-semibold text-[#9b705f] underline-offset-4 hover:underline" style={{ animationDelay: "1.5s" }}>Skip intro</button>
          </div>
        </div>
      )}
      <style>{`
        html, body, #root { max-width: 100%; overflow-x: hidden; scroll-behavior: smooth; }
        img { max-width: 100%; } button, a { -webkit-tap-highlight-color: transparent; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(22px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes floatPhoto { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-9px); } }
        @keyframes driftCloud { from { transform: translateX(-8vw); } to { transform: translateX(110vw); } }
        @keyframes heartPop { 0% { transform: scale(1); } 45% { transform: scale(1.35); } 100% { transform: scale(1); } }
        @keyframes modalIn { from { opacity: 0; transform: translateY(14px) scale(.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes emptyHeartFloat { 0%,100% { transform: translateY(0) rotate(-4deg); } 50% { transform: translateY(-7px) rotate(4deg); } }
        @keyframes softPulse { 0%,100% { box-shadow: 0 0 0 0 rgba(194,65,12,.12); } 50% { box-shadow: 0 0 0 12px rgba(194,65,12,0); } }
        @keyframes welcomeFade { from { opacity: 1; visibility: visible; } to { opacity: 0; visibility: hidden; } }
        @keyframes welcomeHouse { 0% { opacity: 0; transform: translateY(18px) scale(.72); } 55% { opacity: 1; transform: translateY(-5px) scale(1.06); } 75% { transform: translateY(2px) scale(.98); } 100% { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes welcomeText { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes welcomeFloat { 0% { opacity: 0; transform: translate3d(0,22px,0) rotate(-8deg) scale(.8); } 18% { opacity: .95; } 100% { opacity: 0; transform: translate3d(var(--drift, 18px),-115vh,0) rotate(18deg) scale(1.12); } }
        @keyframes welcomeTwinkle { 0%,100% { opacity: .25; transform: scale(.7) rotate(0); } 50% { opacity: 1; transform: scale(1.18) rotate(18deg); } }
        .welcome-overlay { animation: welcomeFade .55s ease 4.05s forwards; }
        .welcome-house { animation: welcomeHouse .95s cubic-bezier(.2,.8,.2,1) both; }
        .welcome-text { animation: welcomeText .7s .75s both; }
        .welcome-float { position:absolute; bottom:-8vh; pointer-events:none; animation:welcomeFloat var(--duration,5.8s) ease-in infinite; animation-delay:var(--delay,0s); }
        .welcome-twinkle { animation:welcomeTwinkle 2.1s ease-in-out infinite; }
        .empty-wishlist-icon { animation: emptyHeartFloat 3s ease-in-out infinite, softPulse 3s ease-in-out infinite; }
        .floating-action { animation: fadeUp .25s ease-out both; box-shadow: 0 10px 28px rgba(124,45,18,.18); }
        .hero-enter { animation: fadeUp .75s both; } .hero-enter-2 { animation: fadeUp .8s .12s both; } .hero-enter-3 { animation: fadeUp .8s .24s both; } .hero-photo { animation: floatPhoto 6s ease-in-out infinite; }
        [data-reveal] { opacity: 0; transform: translateY(20px); transition: opacity .65s ease, transform .65s ease; }
        [data-reveal].is-visible { opacity: 1; transform: translateY(0); }
        .stay-card:hover img { transform: scale(1.045); } .stay-card img { transition: transform .55s ease; }
        .heart-pop { animation: heartPop .38s ease; } .modal-panel { animation: modalIn .22s ease-out both; }
        .cloud { position:absolute; width:100px; height:28px; border-radius:999px; background:rgba(255,255,255,.58); filter:blur(.2px); animation:driftCloud 42s linear infinite; }
        .cloud:before,.cloud:after { content:""; position:absolute; bottom:8px; border-radius:50%; background:inherit; } .cloud:before { width:38px;height:38px;left:17px; } .cloud:after { width:48px;height:48px;left:43px; }
        @media (max-width: 767px) {
          .hero-photo { animation: none !important; border-radius: 24px; }
          .hero-photo img { height: 210px !important; object-position: center 54%; }
          .hero-clouds, .hero-mountains { display: none !important; }
          .hero-copy h1 { max-width: 12ch; font-size: clamp(2rem, 8vw, 2.45rem); line-height: 1.08; }
          .hero-copy p { font-size: 15px; line-height: 1.6; }
        }
        @media (prefers-reduced-motion: reduce) { *,*::before,*::after { animation-duration:.01ms !important; animation-iteration-count:1 !important; scroll-behavior:auto !important; transition-duration:.01ms !important; } .cloud { display:none !important; } [data-reveal] { opacity:1; transform:none; } .welcome-overlay { display:none !important; } }
      `}</style>
      <header className="sticky top-0 z-30 border-b border-orange-100 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-5 sm:py-4">
          <a href="#home" onClick={() => setMobileMenuOpen(false)} className="shrink-0 text-[1.65rem] font-extrabold tracking-tight sm:text-2xl">
            Stay<span className="text-orange-700">Hunt</span><span className="ml-1 inline-block align-top text-orange-500"><Sparkles size={13} /></span>
          </a>
          <nav className="hidden items-center gap-2 md:flex lg:gap-3">
            <button type="button" onClick={openStays} className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold hover:bg-orange-50 hover:text-orange-700"><Search size={16} /> Explore</button>
            <button type="button" onClick={openWishlist} className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold hover:bg-orange-50 hover:text-orange-700 ${showWishlist ? "text-orange-700" : ""}`}><Heart size={17} className={showWishlist ? "fill-rose-500 text-rose-500" : ""} /> Wishlist <span className="rounded-full bg-orange-50 px-2 py-0.5 text-xs text-orange-800">{wishlist.length}</span></button>
            <a href="#about" className="rounded-full px-3 py-2 text-sm font-semibold hover:bg-orange-50 hover:text-orange-700">About</a>
            {currentUser && isAdmin && !adminChecking && <button type="button" onClick={() => { setShowAdminDashboard(true); setAdminTab("overview"); setShowWishlist(false); }} className="rounded-full bg-orange-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-800"><span className="mr-1">✿</span> Admin Dashboard</button>}
            {currentUser && !isAdmin && !adminChecking && <button type="button" onClick={() => setShowMyRequests(true)} className="rounded-full border border-orange-200 px-3 py-2 text-sm font-semibold text-orange-800 hover:bg-orange-50">My Requests{studentRequests.filter((item) => item.status === "Pending").length > 0 ? ` (${studentRequests.filter((item) => item.status === "Pending").length})` : ""}</button>}
            {currentUser ? <div className="relative"><button type="button" onClick={() => setShowProfile((open) => !open)} aria-label="Open profile menu" aria-expanded={showProfile} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-orange-200 bg-white text-stone-700 transition hover:border-orange-500 hover:bg-orange-50"><UserRound size={20} /></button>{showProfile && <div className="absolute right-0 top-12 z-50 w-64 rounded-2xl border border-orange-100 bg-white p-4 shadow-xl"><p className="font-bold">My Profile</p><p className="mt-1 break-all text-sm text-slate-500">{currentUser.displayName || currentUser.email || "Signed in"}</p><div className="my-3 border-t border-slate-100" /><button type="button" onClick={handleLogout} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"><LogOut size={17} /> Logout</button></div>}</div> : <button type="button" onClick={() => openAuth("login")} className="rounded-full bg-orange-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-800">Login</button>}
          </nav>
          <button type="button" className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-orange-200 bg-white text-orange-800 md:hidden" aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"} aria-expanded={mobileMenuOpen} onClick={() => setMobileMenuOpen((open) => !open)}>{mobileMenuOpen ? <X size={21} /> : <Menu size={21} />}</button>
        </div>
        {mobileMenuOpen && <div className="border-t border-orange-100 bg-white px-4 py-3 shadow-lg md:hidden"><div className="mx-auto grid max-w-7xl grid-cols-2 gap-2">
          <button type="button" onClick={() => { openStays(); setMobileMenuOpen(false); }} className="flex items-center gap-2 rounded-2xl bg-orange-50 px-3 py-3 text-sm font-semibold text-orange-900"><Search size={17} /> Explore</button>
          <button type="button" onClick={() => { openWishlist(); setMobileMenuOpen(false); }} className="flex items-center gap-2 rounded-2xl bg-orange-50 px-3 py-3 text-sm font-semibold text-orange-900"><Heart size={17} /> Wishlist ({wishlist.length})</button>
          <a href="#about" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2 rounded-2xl bg-orange-50 px-3 py-3 text-sm font-semibold text-orange-900">About</a>
          {currentUser && isAdmin && !adminChecking && <button type="button" onClick={() => { setShowAdminDashboard(true); setAdminTab("overview"); setMobileMenuOpen(false); }} className="rounded-2xl bg-orange-700 px-3 py-3 text-sm font-semibold text-white">✿ Admin Dashboard</button>}
          {currentUser && !isAdmin && !adminChecking && <button type="button" onClick={() => { setShowMyRequests(true); setMobileMenuOpen(false); }} className="rounded-2xl border border-orange-200 px-3 py-3 text-sm font-semibold text-orange-900">My Requests</button>}
          {currentUser ? <button type="button" onClick={() => { handleLogout(); setMobileMenuOpen(false); }} className="flex items-center gap-2 rounded-2xl border border-rose-200 px-3 py-3 text-sm font-semibold text-rose-700"><LogOut size={17} /> Logout</button> : <button type="button" onClick={() => { openAuth("login"); setMobileMenuOpen(false); }} className="rounded-2xl bg-orange-700 px-3 py-3 text-sm font-semibold text-white">Login</button>}
        </div></div>}
      </header>

      {showMyRequests && currentUser && !isAdmin && (
        <div className="fixed inset-0 z-80 flex items-center justify-center bg-stone-900/50 p-4" onClick={() => setShowMyRequests(false)}>
          <section role="dialog" aria-modal="true" aria-label="My visit requests" className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-[#fffaf5] p-5 shadow-2xl sm:p-7" onClick={(event) => event.stopPropagation()}>
            <div className="mb-5 flex items-start justify-between gap-3">
              <div><p className="text-xs font-bold uppercase tracking-widest text-orange-700">StayHunt</p><h2 className="mt-1 text-2xl font-extrabold">My Visit Requests</h2><p className="mt-1 text-sm text-stone-600">Track the status of your property visit requests.</p></div>
              <button type="button" onClick={() => setShowMyRequests(false)} aria-label="Close requests" className="rounded-full p-2 hover:bg-orange-100"><X size={20} /></button>
            </div>
            {studentRequests.length === 0 ? (
              <div className="rounded-2xl border border-orange-100 bg-white p-8 text-center"><CalendarDays className="mx-auto mb-3 text-orange-700" size={30} /><p className="font-bold">No visit requests yet</p><p className="mt-1 text-sm text-stone-600">Your submitted visit requests will appear here.</p></div>
            ) : (
              <div className="space-y-3">{studentRequests.map((request) => (
                <article key={request.id} className="rounded-2xl border border-orange-100 bg-white p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2"><div><h3 className="font-bold text-stone-800">{request.listingName || "Stay visit"}</h3><p className="mt-1 text-sm text-stone-500">Preferred date: {request.visitDate || "Not specified"}</p></div><span className={`rounded-full px-3 py-1 text-xs font-bold ${request.status === "Accepted" ? "bg-green-50 text-green-700" : request.status === "Rejected" ? "bg-red-50 text-red-700" : "bg-orange-50 text-orange-800"}`}>{request.status === "Accepted" ? "✓ Accepted" : request.status === "Rejected" ? "♡ Rejected" : request.status === "Archived" ? "Archived" : "◷ Pending"}</span></div>
                  {request.status === "Accepted" && <p className="mt-3 inline-flex items-center gap-2 text-sm text-emerald-700"><CheckCircle2 size={17} /> Your visit request has been accepted.</p>}
                  {request.status === "Rejected" && <p className="mt-3 text-sm text-red-700">Your visit request was not accepted. You can explore other stays.</p>}
                  {request.status === "Archived" && <p className="mt-3 text-sm text-stone-600">This request has been archived by the admin. Its record is safely retained.</p>}
                  {(!request.status || request.status === "Pending") && <p className="mt-3 inline-flex items-center gap-2 text-sm text-stone-600"><Clock3 size={16} /> Your request is waiting for admin review.</p>}
                </article>
              ))}</div>
            )}
          </section>
        </div>
      )}

      {showAdminDashboard && isAdmin && (
        <section className="fixed inset-0 z-70 overflow-y-auto bg-[#fffaf5]">
          <div className="sticky top-0 z-10 border-b border-orange-100 bg-white/95 backdrop-blur">
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-orange-700">StayHunt</p>
                <h1 className="text-xl font-extrabold sm:text-2xl">Admin Dashboard</h1>
              </div>
              <button type="button" onClick={() => setShowAdminDashboard(false)} className="rounded-full border border-orange-200 px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-orange-50">Back to website</button>
            </div>
          </div>
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
            <div className="mb-6 flex flex-wrap gap-2">
              {[{id:"overview",label:"Overview"},{id:"listings",label:"Manage Listings"},{id:"requests",label:"Visit Requests"}].map((tab) => (
                <button key={tab.id} type="button" onClick={() => { setAdminTab(tab.id); setAdminMessage(""); }} className={`rounded-full px-4 py-2 text-sm font-semibold ${adminTab === tab.id ? "bg-orange-700 text-white" : "border border-orange-200 bg-white text-stone-700 hover:bg-orange-50"}`}>{tab.label}</button>
              ))}
            </div>
            {adminMessage && <p role="status" className="mb-5 rounded-xl border border-orange-200 bg-white p-3 text-sm text-stone-700">{adminMessage}</p>}

            {adminTab === "overview" && (
              <div>
                <h2 className="mb-5 text-2xl font-extrabold">Dashboard overview</h2>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-2xl border border-orange-100 bg-white p-5"><p className="text-sm text-stone-500">Total listings</p><p className="mt-2 text-3xl font-extrabold text-orange-800">{stays.length}</p></div>
                  <div className="rounded-2xl border border-orange-100 bg-white p-5"><p className="text-sm text-stone-500">Available listings</p><p className="mt-2 text-3xl font-extrabold text-orange-800">{stays.filter((item) => String(item.availability || "Available").toLowerCase() === "available").length}</p></div>
                  <div className="rounded-2xl border border-orange-100 bg-white p-5"><p className="text-sm text-stone-500">Pending visit requests</p><p className="mt-2 text-3xl font-extrabold text-orange-800">{visitRequests.filter((item) => item.status === "Pending").length}</p></div>
                </div>
                <div className="mt-6 rounded-2xl border border-orange-100 bg-white p-5"><h3 className="font-bold">Quick note</h3><p className="mt-2 text-sm leading-6 text-stone-600">Use Manage Listings to add or update accommodation details. Visit requests submitted by signed-in students will appear in the Visit Requests section.</p></div>
              </div>
            )}

            {adminTab === "listings" && (
              <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                <form onSubmit={saveListing} className="rounded-2xl border border-orange-100 bg-white p-5">
                  <div className="mb-4 flex items-center justify-between gap-2"><h2 className="text-xl font-extrabold">{editingListingId ? "Edit listing" : "Add a listing"}</h2>{editingListingId && <button type="button" onClick={resetListingForm} className="text-sm font-semibold text-orange-700">Cancel edit</button>}</div>
                  <div className="space-y-3">
                    <label className="block text-sm font-semibold">Property name<input required value={listingForm.name} onChange={(e) => setListingForm({...listingForm,name:e.target.value})} className="mt-1 w-full rounded-xl border border-orange-100 px-3 py-2.5 font-normal" placeholder="e.g. Katoch Girls PG" /></label>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="block text-sm font-semibold">Location<input required value={listingForm.location} onChange={(e) => setListingForm({...listingForm,location:e.target.value})} className="mt-1 w-full rounded-xl border border-orange-100 px-3 py-2.5 font-normal" /></label>
                      <label className="block text-sm font-semibold">Monthly rent<input required type="number" min="0" value={listingForm.rent} onChange={(e) => setListingForm({...listingForm,rent:e.target.value})} className="mt-1 w-full rounded-xl border border-orange-100 px-3 py-2.5 font-normal" /></label>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="block text-sm font-semibold">Room type<select value={listingForm.type} onChange={(e) => setListingForm({...listingForm,type:e.target.value})} className="mt-1 w-full rounded-xl border border-orange-100 bg-white px-3 py-2.5 font-normal"><option>Girls PG</option><option>Boys PG</option><option>Private Room</option><option>Shared Room</option></select></label>
                      <label className="block text-sm font-semibold">Availability<select value={listingForm.availability} onChange={(e) => setListingForm({...listingForm,availability:e.target.value})} className="mt-1 w-full rounded-xl border border-orange-100 bg-white px-3 py-2.5 font-normal"><option>Available</option><option>Full</option></select></label>
                    </div>
                    <label className="block text-sm font-semibold">Institution<input value={listingForm.institution} onChange={(e) => setListingForm({...listingForm,institution:e.target.value})} className="mt-1 w-full rounded-xl border border-orange-100 px-3 py-2.5 font-normal" /></label>
                    <label className="block text-sm font-semibold">Image URL<input value={listingForm.image} onChange={(e) => setListingForm({...listingForm,image:e.target.value})} className="mt-1 w-full rounded-xl border border-orange-100 px-3 py-2.5 font-normal" placeholder="https://..." /></label>
                    <label className="block text-sm font-semibold">Facilities (comma separated)<input value={listingForm.facilities} onChange={(e) => setListingForm({...listingForm,facilities:e.target.value})} className="mt-1 w-full rounded-xl border border-orange-100 px-3 py-2.5 font-normal" placeholder="Wi-Fi, Meals, Laundry" /></label>
                    <label className="block text-sm font-semibold">Description<textarea value={listingForm.description} onChange={(e) => setListingForm({...listingForm,description:e.target.value})} rows="3" className="mt-1 w-full rounded-xl border border-orange-100 px-3 py-2.5 font-normal" /></label>
                    <button disabled={listingSaving} type="submit" className="w-full rounded-xl bg-orange-700 px-4 py-3 font-semibold text-white hover:bg-orange-800 disabled:opacity-60">{listingSaving ? "Saving..." : editingListingId ? "Save changes" : "Add listing"}</button>
                  </div>
                </form>
                <div className="space-y-3"><h2 className="text-xl font-extrabold">Existing listings ({stays.length})</h2>{stays.map((stay) => <div key={stay.id} className="flex flex-col gap-3 rounded-2xl border border-orange-100 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="font-bold">{stay.name || stay.title || "Unnamed listing"}</p><p className="text-sm text-stone-500">{stay.location || "Palampur"} · ₹{Number(stay.rent ?? stay.price ?? 0).toLocaleString("en-IN")} · {stay.availability || "Availability not set"}</p></div><div className="flex shrink-0 gap-2"><button type="button" onClick={() => startEditListing(stay)} className="rounded-full border border-orange-200 px-3 py-1.5 text-sm font-semibold text-orange-800">Edit</button><button type="button" onClick={() => removeListing(stay.id)} className="rounded-full border border-red-200 px-3 py-1.5 text-sm font-semibold text-red-600">Delete</button></div></div>)}</div>
              </div>
            )}

            {adminTab === "requests" && (
              <div>
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-2xl font-extrabold">Visit requests</h2><p className="mt-1 text-sm text-stone-500">Review student visit requests and keep old decisions organized.</p></div><div className="flex rounded-full bg-orange-50 p-1"><button type="button" onClick={() => setRequestView("active")} className={`rounded-full px-4 py-2 text-sm font-semibold ${requestView === "active" ? "bg-white text-orange-800 shadow-sm" : "text-stone-600"}`}>Active</button><button type="button" onClick={() => setRequestView("archived")} className={`rounded-full px-4 py-2 text-sm font-semibold ${requestView === "archived" ? "bg-white text-orange-800 shadow-sm" : "text-stone-600"}`}>Archived ({visitRequests.filter((item) => item.status === "Archived").length})</button></div></div>
                {visitRequests.filter((item) => requestView === "archived" ? item.status === "Archived" : item.status !== "Archived").length === 0 ? <div className="rounded-3xl border border-orange-100 bg-white p-8 text-center"><div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-orange-50 text-orange-700"><PartyPopper size={27} /></div><p className="font-bold">{requestView === "archived" ? "No archived requests" : "No active visit requests"}</p><p className="mt-1 text-sm text-stone-500">{requestView === "archived" ? "Rejected requests you close will be kept here." : "New student visit requests will appear here."}</p></div> : <div className="grid gap-4 md:grid-cols-2">{visitRequests.filter((item) => requestView === "archived" ? item.status === "Archived" : item.status !== "Archived").map((request) => <article key={request.id} className="relative rounded-3xl border border-orange-100 bg-white p-5 shadow-sm transition hover:shadow-md"><div className="flex items-start justify-between gap-3 pr-1"><div className="min-w-0"><h3 className="wrap-break-word font-bold">{request.listingName || "Stay visit"}</h3><p className="mt-1 break-all text-sm text-stone-500">{request.studentName || "Student"} · {request.studentEmail || "No email"}</p></div><span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${request.status === "Accepted" ? "bg-emerald-50 text-emerald-700" : request.status === "Rejected" ? "bg-rose-50 text-rose-700" : request.status === "Archived" ? "bg-stone-100 text-stone-600" : "bg-orange-50 text-orange-800"}`}>{request.status === "Accepted" ? "✓ Accepted" : request.status === "Rejected" ? "♡ Rejected" : request.status === "Archived" ? "Archived" : "◷ Pending"}</span></div><div className="mt-3 space-y-1 wrap-break-word text-sm text-stone-600"><p>Phone: {request.phone || "Not provided"}</p><p>Preferred date: {request.visitDate || "Not provided"}</p></div>{request.status === "Pending" && <div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={() => updateVisitRequest(request.id,"Accepted")} className="inline-flex items-center gap-1.5 rounded-full bg-emerald-700 px-4 py-2 text-sm font-semibold text-white"><CheckCircle2 size={16} /> Accept</button><button type="button" onClick={() => updateVisitRequest(request.id,"Rejected")} className="inline-flex items-center gap-1.5 rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white">Reject</button></div>}{request.status === "Rejected" && requestView === "active" && <div className="mt-4 flex items-center justify-between gap-2 rounded-2xl bg-rose-50 px-3 py-2"><span className="text-xs text-rose-700">Decision saved · ready to close</span><button type="button" onClick={() => updateVisitRequest(request.id,"Archived")} aria-label="Archive rejected request" title="Move to archived requests" className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-rose-200 bg-white text-rose-700 transition hover:bg-rose-100"><X size={18} /></button></div>}{request.status === "Archived" && <div className="mt-3 flex items-center justify-between gap-2"><span className="text-xs text-stone-500">Safely archived · not deleted</span><button type="button" onClick={() => updateVisitRequest(request.id,"Rejected")} className="rounded-full border border-orange-200 px-3 py-1.5 text-xs font-semibold text-orange-800">Restore</button></div>}</article>)}</div>}
              </div>
            )}
          </div>
        </section>
      )}

      <main id="home">
        <section className="relative overflow-hidden bg-[#fff0e5]">
          <div className="hero-clouds cloud" aria-hidden="true" style={{ top: "15%", left: "-15%" }} />
          <div className="hero-clouds cloud" aria-hidden="true" style={{ top: "29%", left: "-35%", animationDelay: "-18s", transform: "scale(.72)" }} />
          <svg aria-hidden="true" className="hero-mountains pointer-events-none absolute bottom-0 left-0 h-36 w-full" viewBox="0 0 1440 180" preserveAspectRatio="none">
            <path d="M0 125 L155 35 L235 88 L360 8 L500 112 L620 45 L760 130 L900 28 L1055 112 L1190 42 L1320 105 L1440 55 L1440 180 L0 180Z" fill="#f3c5a8" opacity=".78" />
            <path d="M310 35 L360 8 L405 43 L380 36 L360 20 L340 43Z M850 55 L900 28 L950 62 L920 51 L900 39 L880 58Z M1155 58 L1190 42 L1225 67 L1200 59 L1190 51 L1178 65Z" fill="#fffaf5" opacity=".95" />
            <path d="M0 145 Q220 100 420 145 T840 142 T1260 138 T1440 130 L1440 180 L0 180Z" fill="#fffaf5" />
          </svg>
          <div className="mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-6 px-5 py-8 sm:gap-8 sm:px-5 sm:py-14 md:grid-cols-2 md:py-24">
            <div className="hero-copy">
              <p className="hero-enter mb-3 inline-flex rounded-full bg-white px-4 py-2 text-xs font-semibold text-orange-800 sm:mb-4 sm:text-sm">
                Student stays in Palampur
              </p>

              <h1 className="hero-enter-2 max-w-full wrap-break-word text-[2rem] font-extrabold leading-[1.08] tracking-tight sm:text-5xl md:max-w-xl md:text-6xl">
                Find a place that feels like{" "}
                <span className="text-orange-700">home.</span>
              </h1>

              <p className="hero-enter-3 mt-4 max-w-lg text-[15px] leading-6 text-stone-600 sm:mt-5 sm:text-lg sm:leading-7">
                Explore student-friendly PGs and rooms near selected colleges
                and universities in Palampur, Himachal Pradesh.
              </p>

              <a
                href="#stays"
                className="hero-enter-3 mt-5 inline-flex items-center gap-2 rounded-full bg-orange-700 px-6 py-3 font-semibold text-white shadow-sm hover:bg-orange-800 sm:mt-7"
              >
                Find your stay <Search size={18} />
              </a>
            </div>

            <div className="overflow-hidden rounded-3xl hero-photo md:rounded-4xl">
              <img
                src="https://i.pinimg.com/736x/69/a5/c1/69a5c13b63e30f29c9e470cde3162256.jpg?auto=format&fit=crop&w=1200&q=85"
                alt="Comfortable room interior"
                className="h-64 w-full rounded-3xl object-cover sm:h-80 md:h-26rem"
              />
            </div>
          </div>
        </section>

        <section id="stays" className="mx-auto w-full max-w-7xl px-4 py-9 sm:px-5 sm:py-14">
          <div className="mb-8">
            <p className="text-sm font-bold uppercase tracking-widest text-orange-700">
              Explore accommodation
            </p>
            <h2 className="mt-2 text-3xl font-extrabold md:text-4xl">
              {showWishlist ? "Your Saved Stays" : "Find Your Perfect Student Stay"}
            </h2>
            <p className="mt-3 max-w-2xl text-stone-600">
              {showWishlist
                ? "All the rooms and PGs you have saved, together in one place."
                : "Search nearby institutions, explore student-friendly stays, and compare rent and facilities in one place."}
            </p>
          </div>

          {!showWishlist && <div className="mb-8 rounded-3xl border border-orange-100 bg-white p-5 shadow-sm">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              

              <label className="block">
                <span className="mb-2 block text-sm font-semibold">University / college</span>
                <select
                  value={institution}
                  onChange={(event) => setInstitution(event.target.value)}
                  className="w-full rounded-xl border border-orange-100 bg-white px-3 py-3"
                >
                  {institutions.map((college) => <option key={college} value={college}>{college}</option>)}
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold">Location</span>
                <select
                  value={locationFilter}
                  onChange={(event) => setLocationFilter(event.target.value)}
                  className="w-full rounded-xl border border-orange-100 bg-white px-3 py-3"
                >
                  {locations.map((area) => <option key={area} value={area}>{area}</option>)}
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold">
                  Room type
                </span>
                <select
                  value={roomType}
                  onChange={(event) => setRoomType(event.target.value)}
                  className="w-full rounded-xl border border-orange-100 bg-white px-3 py-3"
                >
                  <option>All types</option>
                  <option>Girls PG</option>
                  <option>Boys PG</option>
                  <option>Private Room</option>
                  <option>Shared Room</option>
                  
                  
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold">
                  Maximum monthly rent
                </span>
                <select
                  value={maxRent}
                  onChange={(event) => setMaxRent(event.target.value)}
                  className="w-full rounded-xl border border-orange-100 bg-white px-3 py-3"
                >
                  <option value="5000">Up to ₹5,000</option>
                  <option value="7000">Up to ₹7,000</option>
                  <option value="10000">Up to ₹10,000</option>
                  <option value="20000">Up to ₹20,000</option>
                </select>
              </label>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-5 border-t border-slate-100 pt-4">
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={wifiOnly}
                  onChange={(event) => setWifiOnly(event.target.checked)}
                  className="h-4 w-4 accent-orange-700"
                />
                Wi-Fi available
              </label>

              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={mealsOnly}
                  onChange={(event) => setMealsOnly(event.target.checked)}
                  className="h-4 w-4 accent-orange-700"
                />
                Meals available
              </label>

              <button
                onClick={resetFilters}
                className="ml-auto inline-flex items-center gap-2 text-sm font-semibold text-orange-700 hover:text-orange-900"
              >
                <SlidersHorizontal size={16} />
                Reset filters
              </button>
            </div>
          </div>}

          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <p className="font-semibold">
              {loading
                ? "Loading listings..."
                : showWishlist
                  ? `${displayedStays.length} saved stay(s)`
                  : `${displayedStays.length} listing(s) found`}
            </p>

            <button
              onClick={loadListings}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-full border border-orange-100 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw size={15} />
              Refresh listings
            </button>
          </div>

          {loading && (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3" aria-label="Loading stays">
              {[1, 2, 3].map((item) => <div key={item} className="overflow-hidden rounded-3xl border border-orange-100 bg-white p-4 animate-pulse"><div className="h-48 rounded-2xl bg-orange-100" /><div className="mt-4 h-5 w-3/4 rounded bg-stone-100" /><div className="mt-3 h-4 w-1/2 rounded bg-stone-100" /><div className="mt-5 h-10 rounded-xl bg-stone-100" /></div>)}
            </div>
          )}

          {!loading && error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
              <p className="font-bold text-red-700">Could not load listings</p>
              <p className="mt-2 text-sm text-red-700">{error}</p>
              <button
                onClick={loadListings}
                className="mt-4 rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white"
              >
                Try again
              </button>
            </div>
          )}

          {!loading && !error && displayedStays.length === 0 && (
            <div className="mx-auto max-w-2xl rounded-3xl border border-orange-100 bg-white px-6 py-12 text-center shadow-sm sm:px-10">
              <div className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#fff0e5] ${showWishlist ? "empty-wishlist-icon" : ""}`}>
                <Heart
                  size={36}
                  className={showWishlist ? "fill-orange-200 text-orange-700" : "text-orange-700"}
                />
              </div>
              <p className="mt-5 text-xs font-bold uppercase tracking-[0.18em] text-orange-700">
                {showWishlist ? "Your favourites" : "Keep exploring"}
              </p>
              <h3 className="mt-2 text-2xl font-extrabold text-stone-800">
                {showWishlist ? "Your wishlist is waiting for a stay!" : "No stays found"}
              </h3>
              <p className="mx-auto mt-3 max-w-md leading-7 text-stone-600">
                {showWishlist
                  ? "You haven't saved any rooms or PGs yet. When you find a place you like, tap the heart on its card and it will appear here."
                  : "We couldn't find a stay matching these filters. Try adjusting your choices or clear the filters to see all available listings."}
              </p>
              {showWishlist ? (
                <button
                  type="button"
                  onClick={openStays}
                  className="mt-7 inline-flex items-center gap-2 rounded-full bg-orange-700 px-6 py-3 font-semibold text-white transition hover:bg-orange-800"
                >
                  <Search size={17} /> Explore stays
                </button>
              ) : (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="mt-7 rounded-full bg-orange-700 px-6 py-3 font-semibold text-white transition hover:bg-orange-800"
                >
                  Clear filters
                </button>
              )}
            </div>
          )}

          {!loading && !error && displayedStays.length > 0 && (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {displayedStays.map((stay) => {
                const name = stay.name || stay.title || " Unnamed stay";
                const type = stay.type || stay.roomType || "Room type not added";
                const rent = Number(stay.rent ?? stay.price ?? 0);
                const facilities = Array.isArray(stay.facilities)
                  ? stay.facilities
                  : [];

                return (
                  <article
                    key={stay.id}
                    data-reveal
                    className="stay-card overflow-hidden rounded-3xl border border-orange-100 bg-white transition hover:-translate-y-1 hover:shadow-lg"
                  >
                    <div className="relative h-56 bg-orange-50">
                      {stay.image || stay.imageUrl ? (
                        <img
                          src={stay.image || stay.imageUrl}
                          alt={name}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-slate-400">
                          <BedDouble size={42} />
                        </div>
                      )}

                      <span className="absolute left-4 top-4 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-orange-800 shadow-sm">
                        {type}
                      </span>

                      <button
                        onClick={() => toggleWishlist(stay.id)}
                        aria-label={wishlist.includes(stay.id) ? "Remove from wishlist" : "Save to wishlist"}
                        className="absolute right-4 top-4 rounded-full bg-white p-2.5 shadow-sm"
                      >
                        <Heart
                          size={18}
                          className={wishlist.includes(stay.id) ? `${heartPopId === stay.id ? "heart-pop " : ""}fill-red-500 text-red-500` : "text-stone-600"}
                        />
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedStay(stay)}
                        aria-label={`View details for ${name}`}
                        className="absolute bottom-4 right-4 inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-orange-50 hover:text-orange-800"
                      >
                        <Eye size={17} /> View
                      </button>
                    </div>

                    <div className="p-5">
                      <h3 className="text-xl font-bold">{name}</h3>

                      <p className="mt-2 flex items-start gap-2 text-sm text-slate-500">
                        <MapPin size={17} className="mt-0.5 shrink-0" />
                        {stay.location || "Palampur"}
                      </p>

                      {stay.institution && (
                        <p className="mt-2 flex items-start gap-2 text-sm text-stone-600">
                          <GraduationCap
                            size={17}
                            className="mt-0.5 shrink-0"
                          />
                          {stay.institution}
                        </p>
                      )}

                      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                        <p className="flex items-center gap-2 text-stone-600">
                          <Bath size={16} />
                          {stay.bathroom || "Bathroom not added"}
                        </p>
                        <p className="flex items-center gap-2 text-stone-600">
                          <Utensils size={16} />
                          {stay.meals || "Meal details not added"}
                        </p>
                        <p className="flex items-center gap-2 text-stone-600">
                          <BedDouble size={16} />
                          {stay.furnished || "Furnishing not added"}
                        </p>
                        <p className="flex items-center gap-2 text-stone-600">
                          <Wifi size={16} />
                          {facilities.some((item) =>
                            String(item).toLowerCase().includes("wi-fi") ||
                            String(item).toLowerCase().includes("wifi")
                          )
                            ? "Wi-Fi"
                            : "Wi-Fi not listed"}
                        </p>
                      </div>

                      {facilities.length > 0 && (
                        <div className="mt-4 flex flex-wrap gap-2">
                          {facilities.map((facility, index) => (
                            <span
                              key={`${stay.id}-${index}`}
                              className="rounded-full bg-orange-50 px-3 py-1 text-xs text-stone-600"
                            >
                              {facility}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="mt-5 flex items-end justify-between border-t border-slate-100 pt-4">
                        <div>
                          <p className="text-xs text-slate-500">
                            Monthly rent
                          </p>
                          <p className="text-2xl font-extrabold text-orange-800">
                            ₹{rent.toLocaleString("en-IN")}
                            <span className="text-sm font-medium text-slate-500">
                              /month
                            </span>
                          </p>
                        </div>

                      </div>

                      {stay.description && (
                        <p className="mt-3 text-sm leading-6 text-stone-600">
                          {stay.description}
                        </p>
                      )}
                      <button
                        type="button"
                        onClick={() => { setBookingMessage(""); setBookingError(""); setBookingStay(stay); }}
                        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-orange-700 px-4 py-3 font-semibold text-white hover:bg-orange-800"
                      >
                        <CalendarDays size={18} /> Book a visit
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          
        
        </section>

        {showAuth && (
          <div
            className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/60 p-4"
            onClick={() => setShowAuth(false)}
          >
            <section
              role="dialog"
              aria-modal="true"
              aria-label="Login or sign up"
              className="modal-panel max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-bold uppercase tracking-wide text-orange-700">Welcome to StayHunt</p>
                  <h2 className="mt-1 text-2xl font-extrabold">
                    {authMode === "signup" ? "Create your account" : "Welcome back"}
                  </h2>
                  <p className="mt-2 text-sm text-slate-500">
                    {authMode === "signup" ? "Sign up to get started." : "Log in to your StayHunt account."}
                  </p>
                </div>
                <button type="button" onClick={() => setShowAuth(false)} aria-label="Close login" className="rounded-full p-2 hover:bg-orange-50">
                  <X size={20} />
                </button>
              </div>

              <div className="mt-5 grid grid-cols-2 rounded-xl bg-orange-50 p-1 text-sm font-semibold">
                <button type="button" onClick={() => { setAuthMode("login"); setAuthError(""); setAuthMessage(""); }} className={`rounded-lg px-2 py-2 ${authMode === "login" ? "bg-white text-orange-800 shadow-sm" : "text-stone-600"}`}>Login</button>
                <button type="button" onClick={() => { setAuthMode("signup"); setAuthError(""); setAuthMessage(""); }} className={`rounded-lg px-2 py-2 ${authMode === "signup" ? "bg-white text-orange-800 shadow-sm" : "text-stone-600"}`}>Sign up</button>
              </div>

              {authError && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{authError}</p>}
              {authMessage && <p className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{authMessage}</p>}

              {(authMode === "login" || authMode === "signup") && (
                <form className="mt-5 space-y-4" onSubmit={handleEmailAuth}>
                  <label className="block text-sm font-semibold">Email address
                    <input required name="email" type="email" autoComplete="email" placeholder="you@example.com" className="mt-1 w-full rounded-xl border border-orange-100 px-3 py-3 font-normal outline-none focus:border-orange-600" />
                  </label>
                  <label className="block text-sm font-semibold">Password
                    <input required name="password" type="password" minLength={6} autoComplete={authMode === "signup" ? "new-password" : "current-password"} placeholder="At least 6 characters" className="mt-1 w-full rounded-xl border border-orange-100 px-3 py-3 font-normal outline-none focus:border-orange-600" />
                  </label>
                  <button disabled={authLoading} type="submit" className="w-full rounded-xl bg-orange-700 px-4 py-3 font-semibold text-white hover:bg-orange-800 disabled:opacity-60">
                    {authLoading ? "Please wait..." : authMode === "signup" ? "Create account" : "Login"}
                  </button>
                </form>
              )}

            </section>
          </div>
        )}

        {selectedStay && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4" onClick={() => setSelectedStay(null)}>
            <section role="dialog" aria-modal="true" aria-label="Stay details" className="modal-panel max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
              <div className="flex items-start justify-between gap-4">
                <div><p className="text-sm font-bold uppercase tracking-wide text-orange-700">Stay details</p><h2 className="mt-1 text-2xl font-extrabold">{selectedStay.name || selectedStay.title || "Stay details"}</h2></div>
                <button type="button" onClick={() => setSelectedStay(null)} aria-label="Close details" className="rounded-full p-2 hover:bg-orange-50"><X size={20} /></button>
              </div>
              {(selectedStay.image || selectedStay.imageUrl) && <img src={selectedStay.image || selectedStay.imageUrl} alt={selectedStay.name || "Accommodation room"} className="mt-4 h-56 w-full rounded-2xl object-cover" />}
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <p><span className="text-slate-500">Type</span><br /><strong>{selectedStay.type || selectedStay.roomType || "Not specified"}</strong></p>
                <p><span className="text-slate-500">Location</span><br /><strong>{selectedStay.location || "Palampur"}</strong></p>
                <p><span className="text-slate-500">Institution</span><br /><strong>{selectedStay.institution || "Not specified"}</strong></p>
                <p><span className="text-slate-500">Monthly rent</span><br /><strong>₹{Number(selectedStay.rent ?? selectedStay.price ?? 0).toLocaleString("en-IN")}</strong></p>
                <p><span className="text-slate-500">Bathroom</span><br /><strong>{selectedStay.bathroom || "Not specified"}</strong></p>
                <p><span className="text-slate-500">Meals</span><br /><strong>{selectedStay.meals === true ? "Available" : selectedStay.meals === false ? "Not included" : "Not specified"}</strong></p>
              </div>
              {selectedStay.description && <p className="mt-4 leading-6 text-stone-600">{selectedStay.description}</p>}
              {Array.isArray(selectedStay.facilities) && selectedStay.facilities.length > 0 && <div className="mt-4 flex flex-wrap gap-2">{selectedStay.facilities.map((item, index) => <span key={`${item}-${index}`} className="rounded-full bg-orange-50 px-3 py-1 text-sm">{item}</span>)}</div>}
              <button type="button" onClick={() => { setBookingMessage(""); setBookingError(""); setBookingStay(selectedStay); setSelectedStay(null); }} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-orange-700 px-4 py-3 font-semibold text-white hover:bg-orange-800"><CalendarDays size={18} /> Book a visit</button>
            </section>
          </div>
        )}

        {bookingStay && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4" onClick={() => { if (!bookingSubmitting) { setBookingStay(null); setBookingError(""); } }}>
            <section role="dialog" aria-modal="true" aria-label="Book a visit" className="modal-panel w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
              <div className="flex items-start justify-between gap-4"><div><p className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-orange-700"><Sparkles size={15} /> A little step closer</p><h2 className="mt-1 text-2xl font-extrabold">Book a visit</h2><p className="mt-1 text-sm text-stone-600">{bookingStay.name || bookingStay.title}</p></div><button type="button" onClick={() => { if (!bookingSubmitting) { setBookingStay(null); setBookingError(""); } }} disabled={bookingSubmitting} aria-label="Close booking form" className="rounded-full p-2 hover:bg-orange-50"><X size={20} /></button></div>
              {!currentUser && <p className="mt-4 rounded-xl bg-orange-50 p-3 text-sm text-orange-800">Please log in to submit a visit request.</p>}
              {bookingMessage ? <div className="mt-5 rounded-2xl border border-emerald-100 bg-emerald-50 p-5 text-center text-sm text-emerald-800"><div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-white text-emerald-600"><PartyPopper size={25} /></div><p className="font-bold">Request sent with love!</p><p className="mt-1">{bookingMessage}</p></div> : <form className="mt-5 space-y-4" onSubmit={handleBookingSubmit}>
                {bookingError && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{bookingError}</p>}
                <label className="block text-sm font-semibold">Your name<input required name="visitorName" autoComplete="name" className="mt-1 w-full rounded-xl border border-orange-100 px-3 py-3 font-normal" placeholder="Enter your name" /></label>
                <label className="block text-sm font-semibold">Phone number<input required name="visitorPhone" type="tel" pattern="[0-9+() -]{7,18}" autoComplete="tel" className="mt-1 w-full rounded-xl border border-orange-100 px-3 py-3 font-normal" placeholder="Enter phone number" /></label>
                <label className="block text-sm font-semibold">Preferred visit date<input required name="visitDate" type="date" min={new Date().toLocaleDateString("en-CA")} className="mt-1 w-full rounded-xl border border-orange-100 px-3 py-3 font-normal" /></label>
                <button type="submit" disabled={bookingSubmitting} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-orange-700 px-4 py-3 font-semibold text-white hover:bg-orange-800 disabled:cursor-not-allowed disabled:opacity-60"><CalendarDays size={18} /> {bookingSubmitting ? "Sending..." : "Send visit request"}</button>
              </form>}
              {bookingMessage && <button type="button" onClick={() => { setBookingStay(null); setBookingError(""); }} className="mt-4 w-full rounded-xl bg-orange-700 px-4 py-3 font-semibold text-white">Done</button>}
            </section>
          </div>
        )}

        <section id="colleges" className="bg-white py-14">
          <div className="mx-auto max-w-7xl px-5">
            <p className="text-sm font-bold uppercase tracking-widest text-orange-700">
              Student-focused
            </p>
            <h2 className="mt-2 text-3xl font-extrabold">
              Explore by institution
            </h2>

            <div className="mt-7 grid gap-4 md:grid-cols-3">
              {institutions.map((college) => (
                <button
                  key={college}
                  onClick={() => {
                    setInstitution(college);
                    setShowWishlist(false);
                    document
                      .getElementById("stays")
                      ?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="rounded-2xl border border-orange-100 bg-[#fffaf5] p-5 text-left font-semibold transition hover:border-orange-300 hover:bg-orange-50"
                >
                  <GraduationCap
                    className="mb-3 text-orange-700"
                    size={25}
                  />
                  {college}
                  <p className="mt-3 text-sm font-medium text-orange-700">
                    View stays →
                  </p>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section id="about" className="mx-auto max-w-7xl scroll-mt-24 px-5 py-14 sm:py-16">
          <div className="overflow-hidden rounded-4xl border border-orange-100 bg-[#fff0e5] p-6 sm:p-8 md:p-12">
            <div className="grid items-center gap-9 md:grid-cols-[1.15fr_0.85fr] md:gap-12">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-700">
                  About StayHunt
                </p>
                <h2 className="mt-3 max-w-xl text-3xl font-extrabold leading-tight text-stone-800 sm:text-4xl">
                  Finding the right stay, made simpler.
                </h2>
                <p className="mt-5 max-w-2xl leading-7 text-stone-600">
                  Moving to a new city for studies can feel overwhelming.
                  StayHunt helps students explore PGs and rooms around selected
                  colleges and universities in Palampur, compare important
                  details, and shortlist places that suit their needs.
                </p>
                <p className="mt-3 max-w-2xl leading-7 text-stone-600">
                  From room type and monthly rent to facilities and location,
                  the aim is to bring useful accommodation information together
                  in one simple place.
                </p>
                <a
                  href="#stays"
                  onClick={() => setShowWishlist(false)}
                  className="mt-7 inline-flex items-center gap-2 rounded-full bg-orange-700 px-6 py-3 font-semibold text-white transition hover:bg-orange-800"
                >
                  Browse listings <Search size={17} />
                </a>
              </div>

              <div className="rounded-3xl border border-orange-100 bg-white p-5 shadow-sm sm:p-6">
                <h3 className="text-lg font-extrabold text-stone-800">
                  What you can do on StayHunt
                </h3>
                <div className="mt-5 space-y-5">
                  <div className="flex items-start gap-4">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#fff0e5] text-orange-700">
                      <Search size={21} />
                    </span>
                    <div>
                      <p className="font-bold text-stone-800">Easy exploration</p>
                      <p className="mt-1 text-sm leading-6 text-stone-600">
                        Browse stays and compare rent, room types and listed facilities.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#fff0e5] text-orange-700">
                      <MapPin size={21} />
                    </span>
                    <div>
                      <p className="font-bold text-stone-800">Student-focused locations</p>
                      <p className="mt-1 text-sm leading-6 text-stone-600">
                        Explore accommodation around selected institutions in and near Palampur.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#fff0e5] text-orange-700">
                      <Heart size={21} />
                    </span>
                    <div>
                      <p className="font-bold text-stone-800">Save your favourites</p>
                      <p className="mt-1 text-sm leading-6 text-stone-600">
                        Keep the stays you like together in your personal wishlist.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="mt-6 rounded-2xl bg-orange-700 px-5 py-4 text-white">
                  <p className="text-lg font-extrabold">Your stay. Your comfort. Your choice.</p>
                  <p className="mt-1 text-sm leading-6 text-orange-100">
                    Making the student stay search a little easier.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>


      </main>

      <footer className="border-t border-orange-100 bg-[#fff7ef] px-5 pb-6 pt-10">
        <div className="mx-auto grid max-w-7xl gap-9 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <a href="#home" onClick={scrollToTop} className="inline-flex items-center text-2xl font-extrabold tracking-tight text-stone-800">
              Stay<span className="text-orange-700">Hunt</span><Sparkles size={15} className="ml-1 text-orange-500" />
            </a>
            <p className="mt-3 max-w-md text-sm leading-7 text-stone-600">A student-focused accommodation finder to help you explore rooms and PGs around Palampur and nearby institutions.</p>
            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-orange-700">Your stay. Your comfort. Your choice.</p>
          </div>
          <div>
            <h3 className="font-extrabold text-stone-800">Quick links</h3>
            <div className="mt-4 flex flex-col items-start gap-3 text-sm text-stone-600">
              <button type="button" onClick={openStays} className="transition hover:text-orange-700">Explore stays</button>
              <button type="button" onClick={openWishlist} className="transition hover:text-orange-700">My wishlist</button>
              <a href="#about" className="transition hover:text-orange-700">About us</a>
            </div>
          </div>
          <div>
            <h3 className="font-extrabold text-stone-800">Contact</h3>
            <div className="mt-4 space-y-3 text-sm text-stone-600">
              <a href="tel:9317424196" className="block transition hover:text-orange-700">+91 9317424196</a>
              <p>Nurpur, Kangra,<br />Himachal Pradesh, India</p>
            </div>
          </div>
        </div>
        <div className="mx-auto mt-9 flex max-w-7xl flex-col justify-between gap-2 border-t border-orange-100 pt-5 text-xs text-stone-500 sm:flex-row">
          <p>© {new Date().getFullYear()} StayHunt. All rights reserved.</p>
          <p>Made for students, with care · Palampur, Himachal Pradesh</p>
        </div>
      </footer>
      <div className="fixed bottom-5 right-4 z-40 flex flex-col items-end gap-3 sm:bottom-6 sm:right-6">
        {showBackToTop && <button type="button" onClick={scrollToTop} aria-label="Back to top" title="Back to top" className="floating-action inline-flex h-11 w-11 items-center justify-center rounded-full border border-orange-100 bg-white text-orange-800 transition hover:-translate-y-1 hover:bg-orange-50"><ArrowUp size={19} /></button>}
      </div>
      {toastMessage && <div role="status" className="fixed bottom-5 left-1/2 z-100 -translate-x-1/2 rounded-full bg-stone-900 px-5 py-3 text-sm font-semibold text-white shadow-xl">{toastMessage}</div>}
    </div>
  );
}

export default App;
