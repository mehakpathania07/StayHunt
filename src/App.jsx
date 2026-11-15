
import { useEffect, useMemo, useState } from "react";
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
} from "lucide-react";
import { getFirestoreListings } from "./firestoreTest";
import { db } from "./firebase";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
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
  const [stays, setStays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [institution, setInstitution] = useState("All institutions");
  const [locationFilter, setLocationFilter] = useState("All locations");
  const [selectedStay, setSelectedStay] = useState(null);
  const [bookingStay, setBookingStay] = useState(null);
  const [bookingMessage, setBookingMessage] = useState("");
  const [roomType, setRoomType] = useState("All types");
  const [maxRent, setMaxRent] = useState("10000");
  const [wifiOnly, setWifiOnly] = useState(false);
  const [mealsOnly, setMealsOnly] = useState(false);
  const [wishlist, setWishlist] = useState([]);
  const [showWishlist, setShowWishlist] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
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
        return;
      }

      try {
        const wishlistRef = doc(db, "wishlists", currentUser.uid);
        const snapshot = await getDoc(wishlistRef);
        if (!cancelled) {
          setWishlist(snapshot.exists() ? snapshot.data().listingIds || [] : []);
        }
      } catch (err) {
        console.error("Wishlist loading error:", err);
        if (!cancelled) setWishlist([]);
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

    const updated = wishlist.includes(id)
      ? wishlist.filter((item) => item !== id)
      : [...wishlist, id];

    try {
      await setDoc(doc(db, "wishlists", currentUser.uid), { listingIds: updated }, { merge: true });
      setWishlist(updated);
    } catch (err) {
      console.error("Wishlist saving error:", err);
      openAuth("login");
      setAuthError("Wishlist could not be saved. Please check Firebase rules and try again.");
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
      setAdminMessage(`Visit request ${status.toLowerCase()}.`);
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
    document.getElementById("stays")?.scrollIntoView({ behavior: "smooth" });
  }

  function openWishlist() {
    if (!currentUser) {
      openAuth("login");
      setAuthError("Please log in to view your wishlist.");
      return;
    }
    setShowWishlist(true);
    document.getElementById("stays")?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <div className="min-h-screen bg-[#fffaf5] text-stone-800">
      <header className="sticky top-0 z-20 border-b border-orange-100 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
          <a href="#home" className="text-2xl font-extrabold tracking-tight">
            Stay<span className="text-orange-700">Hunt</span>
          </a>

          <div className="flex items-center gap-1.5 sm:gap-4">
            <button
              type="button"
              onClick={openStays}
              className="inline-flex items-center gap-1 rounded-full px-1.5 py-2 text-xs font-semibold hover:text-orange-700 sm:px-3 sm:text-sm"
            >
              <Search size={15} />
              <span>Explore</span>
            </button>
            <button
              type="button"
              onClick={openWishlist}
              className={`inline-flex items-center gap-1.5 rounded-full px-2 py-2 text-sm font-semibold hover:text-orange-700 sm:px-3 ${showWishlist ? "text-orange-700" : ""}`}
            >
              <Heart size={17} className={showWishlist ? "fill-red-500 text-red-500" : ""} />
              <span>Wishlist ({wishlist.length})</span>
            </button>
            <a
              href="#about"
              className="inline-flex rounded-full px-1.5 py-2 text-xs font-semibold hover:text-orange-700 sm:px-2 sm:text-sm"
            >
              About
            </a>
            {currentUser && isAdmin && !adminChecking && (
              <button
                type="button"
                onClick={() => { setShowAdminDashboard(true); setAdminTab("overview"); setShowWishlist(false); }}
                className="rounded-full bg-orange-700 px-3 py-2 text-xs font-semibold text-white hover:bg-orange-800 sm:px-4 sm:text-sm"
              >
                Admin Dashboard
              </button>
            )}
            {currentUser && !isAdmin && !adminChecking && (
              <button
                type="button"
                onClick={() => setShowMyRequests(true)}
                className="rounded-full border border-orange-200 px-3 py-2 text-xs font-semibold text-orange-800 hover:bg-orange-50 sm:px-4 sm:text-sm"
              >
                My Requests{studentRequests.filter((item) => item.status === "Pending").length > 0 ? ` (${studentRequests.filter((item) => item.status === "Pending").length})` : ""}
              </button>
            )}
            {currentUser ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowProfile((open) => !open)}
                  aria-label="Open profile menu"
                  aria-expanded={showProfile}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-700 transition hover:border-orange-500 hover:bg-orange-50 hover:text-orange-800"
                >
                  <UserRound size={21} />
                </button>
                {showProfile && (
                  <div className="absolute right-0 top-12 z-50 w-64 rounded-2xl border border-orange-100 bg-white p-4 shadow-xl">
                    <p className="font-bold text-stone-800">My Profile</p>
                    <p className="mt-1 break-all text-sm text-slate-500">
                      {currentUser.displayName || currentUser.email || "Signed in"}
                    </p>
                    <div className="my-3 border-t border-slate-100" />
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50"
                    >
                      <LogOut size={17} /> Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => openAuth("login")}
                className="rounded-full bg-orange-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-800 sm:px-5"
              >
                Login
              </button>
            )}
          </div>
        </div>
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
                  <div className="flex flex-wrap items-start justify-between gap-2"><div><h3 className="font-bold text-stone-800">{request.listingName || "Stay visit"}</h3><p className="mt-1 text-sm text-stone-500">Preferred date: {request.visitDate || "Not specified"}</p></div><span className={`rounded-full px-3 py-1 text-xs font-bold ${request.status === "Accepted" ? "bg-green-50 text-green-700" : request.status === "Rejected" ? "bg-red-50 text-red-700" : "bg-orange-50 text-orange-800"}`}>{request.status || "Pending"}</span></div>
                  {request.status === "Accepted" && <p className="mt-3 text-sm text-green-700">Your visit request has been accepted.</p>}
                  {request.status === "Rejected" && <p className="mt-3 text-sm text-red-700">Your visit request was not accepted. You can explore other stays.</p>}
                  {(!request.status || request.status === "Pending") && <p className="mt-3 text-sm text-stone-600">Your request is waiting for admin review.</p>}
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
                <div className="mt-6 rounded-2xl border border-orange-100 bg-white p-5"><h3 className="font-bold">Quick note</h3><p className="mt-2 text-sm leading-6 text-stone-600">Use Manage Listings to add or update sample accommodation data. Visit requests submitted by signed-in students will appear in the Visit Requests section.</p></div>
              </div>
            )}

            {adminTab === "listings" && (
              <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                <form onSubmit={saveListing} className="rounded-2xl border border-orange-100 bg-white p-5">
                  <div className="mb-4 flex items-center justify-between gap-2"><h2 className="text-xl font-extrabold">{editingListingId ? "Edit listing" : "Add a listing"}</h2>{editingListingId && <button type="button" onClick={resetListingForm} className="text-sm font-semibold text-orange-700">Cancel edit</button>}</div>
                  <div className="space-y-3">
                    <label className="block text-sm font-semibold">Property name<input required value={listingForm.name} onChange={(e) => setListingForm({...listingForm,name:e.target.value})} className="mt-1 w-full rounded-xl border border-orange-100 px-3 py-2.5 font-normal" placeholder="e.g. Sample Girls PG" /></label>
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
              <div><h2 className="mb-5 text-2xl font-extrabold">Visit requests</h2>{visitRequests.length === 0 ? <div className="rounded-2xl border border-orange-100 bg-white p-8 text-center text-stone-600">No visit requests received yet.</div> : <div className="grid gap-4 md:grid-cols-2">{visitRequests.map((request) => <article key={request.id} className="rounded-2xl border border-orange-100 bg-white p-5"><div className="flex items-start justify-between gap-3"><div><h3 className="font-bold">{request.listingName || "Stay visit"}</h3><p className="mt-1 text-sm text-stone-500">{request.studentName || "Student"} · {request.studentEmail || "No email"}</p></div><span className={`rounded-full px-3 py-1 text-xs font-bold ${request.status === "Accepted" ? "bg-green-50 text-green-700" : request.status === "Rejected" ? "bg-red-50 text-red-700" : "bg-orange-50 text-orange-800"}`}>{request.status || "Pending"}</span></div><div className="mt-3 space-y-1 text-sm text-stone-600"><p>Phone: {request.phone || "Not provided"}</p><p>Preferred date: {request.visitDate || "Not provided"}</p></div>{request.status === "Pending" && <div className="mt-4 flex gap-2"><button type="button" onClick={() => updateVisitRequest(request.id,"Accepted")} className="rounded-full bg-green-700 px-4 py-2 text-sm font-semibold text-white">Accept</button><button type="button" onClick={() => updateVisitRequest(request.id,"Rejected")} className="rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white">Reject</button></div>}</article>)}</div>}</div>
            )}
          </div>
        </section>
      )}

      <main id="home">
        <section className="relative overflow-hidden bg-[#fff0e5]">
          <div className="mx-auto grid max-w-7xl items-center gap-8 px-5 py-16 md:grid-cols-2 md:py-24">
            <div>
              <p className="mb-4 inline-flex rounded-full bg-white px-4 py-2 text-sm font-semibold text-orange-800">
                Student stays in Palampur
              </p>

              <h1 className="max-w-xl text-4xl font-extrabold leading-tight tracking-tight md:text-6xl">
                Find a place that feels like{" "}
                <span className="text-orange-700">home.</span>
              </h1>

              <p className="mt-5 max-w-lg leading-7 text-stone-600">
                Explore student-friendly PGs and rooms near selected colleges
                and universities in Palampur, Himachal Pradesh.
              </p>

              <a
                href="#stays"
                className="mt-7 inline-flex items-center gap-2 rounded-full bg-orange-700 px-6 py-3 font-semibold text-white hover:bg-orange-800"
              >
                Find your stay <Search size={18} />
              </a>
            </div>

            <div className="overflow-hidden rounded-4xl">
              <img
                src="https://i.pinimg.com/736x/f7/b7/3d/f7b73d08eaff9d2b99f0847c4fce1c35.jpg?auto=format&fit=crop&w=1200&q=85"
                alt="Comfortable room interior"
                className="h-72 w-full object-cover md:h-105"
              />
            </div>
          </div>
        </section>

        <section id="stays" className="mx-auto max-w-7xl px-5 py-14">
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
            <div className="rounded-2xl border border-orange-100 bg-white p-10 text-center">
              <p className="font-semibold">Loading StayHunt listings...</p>
              <p className="mt-2 text-sm text-slate-500">
                Connecting to Firestore.
              </p>
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
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#fff0e5]">
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
                    className="overflow-hidden rounded-3xl border border-orange-100 bg-white transition hover:-translate-y-1 hover:shadow-lg"
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
                          className={
                            wishlist.includes(stay.id)
                              ? "fill-red-500 text-red-500"
                              : "text-stone-600"
                          }
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
                        <span className="text-xs text-slate-500">
                          Sample listing
                        </span>
                      </div>

                      {stay.description && (
                        <p className="mt-3 text-sm leading-6 text-stone-600">
                          {stay.description}
                        </p>
                      )}
                      <button
                        type="button"
                        onClick={() => { setBookingMessage(""); setBookingStay(stay); }}
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
              className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl"
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
            <section role="dialog" aria-modal="true" aria-label="Stay details" className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
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
              <button type="button" onClick={() => { setBookingMessage(""); setBookingStay(selectedStay); setSelectedStay(null); }} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-orange-700 px-4 py-3 font-semibold text-white hover:bg-orange-800"><CalendarDays size={18} /> Book a visit</button>
            </section>
          </div>
        )}

        {bookingStay && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4" onClick={() => setBookingStay(null)}>
            <section role="dialog" aria-modal="true" aria-label="Book a visit" className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
              <div className="flex items-start justify-between gap-4"><div><p className="text-sm font-bold uppercase tracking-wide text-orange-700">Visit request</p><h2 className="mt-1 text-2xl font-extrabold">Book a visit</h2><p className="mt-1 text-sm text-stone-600">{bookingStay.name || bookingStay.title}</p></div><button type="button" onClick={() => setBookingStay(null)} aria-label="Close booking form" className="rounded-full p-2 hover:bg-orange-50"><X size={20} /></button></div>
              {!currentUser && <p className="mt-4 rounded-xl bg-orange-50 p-3 text-sm text-orange-800">Please log in to submit a visit request.</p>}
              {bookingMessage ? <div className="mt-5 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">{bookingMessage}</div> : <form className="mt-5 space-y-4" onSubmit={async (event) => {
                event.preventDefault();
                if (!currentUser) {
                  setBookingStay(null);
                  openAuth("login");
                  setAuthError("Please log in before sending a visit request.");
                  return;
                }
                const form = new FormData(event.currentTarget);
                try {
                  await addDoc(collection(db, "visitRequests"), {
                    listingId: bookingStay.id,
                    listingName: bookingStay.name || bookingStay.title || "Stay",
                    studentId: currentUser.uid,
                    studentEmail: currentUser.email || "",
                    studentName: String(form.get("visitorName") || "").trim(),
                    phone: String(form.get("visitorPhone") || "").trim(),
                    visitDate: String(form.get("visitDate") || ""),
                    status: "Pending",
                    createdAt: serverTimestamp(),
                  });
                  setBookingMessage("Your visit request has been sent successfully. You can check its status after the admin reviews it.");
                } catch (err) {
                  console.error("Visit request submission failed:", err);
                  setBookingMessage("The request could not be sent. Please check your connection and Firestore rules.");
                }
              }}>
                <label className="block text-sm font-semibold">Your name<input required name="visitorName" className="mt-1 w-full rounded-xl border border-orange-100 px-3 py-3 font-normal" placeholder="Enter your name" /></label>
                <label className="block text-sm font-semibold">Phone number<input required name="visitorPhone" type="tel" pattern="[0-9+() -]{7,18}" className="mt-1 w-full rounded-xl border border-orange-100 px-3 py-3 font-normal" placeholder="Enter phone number" /></label>
                <label className="block text-sm font-semibold">Preferred visit date<input required name="visitDate" type="date" min={new Date().toISOString().split("T")[0]} className="mt-1 w-full rounded-xl border border-orange-100 px-3 py-3 font-normal" /></label>
                <button type="submit" className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-orange-700 px-4 py-3 font-semibold text-white hover:bg-orange-800"><CalendarDays size={18} /> Send visit request</button>
              </form>}
              {bookingMessage && <button type="button" onClick={() => setBookingStay(null)} className="mt-4 w-full rounded-xl bg-orange-700 px-4 py-3 font-semibold text-white">Done</button>}
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
          <div className="overflow-hidden rounded-2rem border border-orange-100 bg-[#fff0e5] p-6 sm:p-8 md:p-12">
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

      <footer className="border-t border-orange-100 bg-white px-5 py-6">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-2 text-sm text-slate-500 sm:flex-row">
          <p>
            <span className="font-extrabold text-stone-800">StayHunt</span>{" "}
            · Student accommodation finder
          </p>
          <p>Focused on Palampur, Himachal Pradesh</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
