"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight,
  ChevronDown,
  Clock,
  Filter as FilterIcon,
  MapPin,
  Search,
  SlidersHorizontal,
  Star,
  X,
} from "lucide-react";
import { getSupabaseBrowserClient, hasSupabaseEnv } from "@/lib/supabase/client";
import {
  createBooking,
  listParkingSlots,
  payBooking,
  type BackendParkingSlot,
} from "@/lib/api/backend";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1655630763570-101dde22d35c?auto=format&fit=crop&w=1400&q=80";
const SLOT_IMAGES = [
  "https://images.unsplash.com/photo-1704269720184-8025fd29dc28?auto=format&fit=crop&w=1400&q=80",
  "https://images.unsplash.com/photo-1672084305798-ef85a8015c9f?auto=format&fit=crop&w=1400&q=80",
  "https://images.unsplash.com/photo-1672084306210-383820924b61?auto=format&fit=crop&w=1400&q=80",
  "https://images.unsplash.com/photo-1687158267344-0e2c97ac9b17?auto=format&fit=crop&w=1400&q=80",
  "https://images.unsplash.com/photo-1758448721043-2cc4eba0e483?auto=format&fit=crop&w=1400&q=80",
  "https://images.unsplash.com/photo-1767642320877-a339985abf83?auto=format&fit=crop&w=1400&q=80",
];
const DISTANCE_CHOICES = ["0.6 km", "0.9 km", "1.3 km", "1.8 km", "2.4 km", "3.1 km"];
const DEVICE_LOCATION_MAP: Record<string, string> = {
  GATE_001: "Yelahanka Main Rd, Bengaluru",
  GATE_002: "Indiranagar 100ft Rd, Bengaluru",
  GATE_003: "Koramangala 4th Block, Bengaluru",
  GATE_004: "Whitefield Main Rd, Bengaluru",
};

type ParkingSpace = {
  id: string;
  title: string;
  address: string;
  pricePerHour: number;
  rating: number;
  distance?: string;
  image: string;
  available: boolean;
};

const MOCK_SPACES: ParkingSpace[] = [
  {
    id: "1",
    title: "Phoenix Marketcity Mall",
    address: "Whitefield Main Rd, Bengaluru",
    pricePerHour: 60,
    rating: 4.8,
    distance: "0.8 km",
    available: true,
    image: "https://images.unsplash.com/photo-1704269720184-8025fd29dc28?auto=format&fit=crop&w=1400&q=80",
  },
  {
    id: "2",
    title: "Indiranagar 100ft Rd",
    address: "Near Toit, Indiranagar, Bengaluru",
    pricePerHour: 120,
    rating: 4.9,
    distance: "1.2 km",
    available: true,
    image: "https://images.unsplash.com/photo-1672084305798-ef85a8015c9f?auto=format&fit=crop&w=1400&q=80",
  },
  {
    id: "3",
    title: "Koramangala 80ft Spot",
    address: "4th Block, Koramangala, Bengaluru",
    pricePerHour: 70,
    rating: 4.7,
    distance: "2.5 km",
    available: false,
    image: "https://images.unsplash.com/photo-1672084306210-383820924b61?auto=format&fit=crop&w=1400&q=80",
  },
  {
    id: "4",
    title: "Manyata Tech Park Area",
    address: "Thanisandra Main Rd, Bengaluru",
    pricePerHour: 40,
    rating: 5.0,
    distance: "0.5 km",
    available: true,
    image: "https://images.unsplash.com/photo-1687158267344-0e2c97ac9b17?auto=format&fit=crop&w=1400&q=80",
  },
  {
    id: "5",
    title: "MG Road Metro Spot",
    address: "Brigade Road, Bengaluru",
    pricePerHour: 95,
    rating: 4.2,
    distance: "1.8 km",
    available: true,
    image: "https://images.unsplash.com/photo-1758448721043-2cc4eba0e483?auto=format&fit=crop&w=1400&q=80",
  },
  {
    id: "6",
    title: "HSR Layout Sector 2",
    address: "27th Main Rd, HSR, Bengaluru",
    pricePerHour: 50,
    rating: 4.6,
    distance: "3.0 km",
    available: true,
    image: "https://images.unsplash.com/photo-1767642320877-a339985abf83?auto=format&fit=crop&w=1400&q=80",
  },
];

function mapSlotToParkingSpace(slot: BackendParkingSlot, index: number): ParkingSpace {
  const price = Number(slot.price ?? 0);
  const baseRating = 4.4 + (index % 5) * 0.12;
  const rating = Math.min(5, Number(baseRating.toFixed(1)));

  return {
    id: slot.id,
    title: slot.slot_name?.trim() || `Parking Slot ${index + 1}`,
    address:
      (slot.device_id && DEVICE_LOCATION_MAP[slot.device_id]) ||
      `${slot.slot_name || "Parking node"}, Bengaluru`,
    pricePerHour: Number.isFinite(price) && price > 0 ? price : 50,
    rating,
    distance: DISTANCE_CHOICES[index % DISTANCE_CHOICES.length],
    image: SLOT_IMAGES[index % SLOT_IMAGES.length],
    available: slot.is_active !== false,
  };
}

function isUuidLike(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

const parseDistanceValue = (distStr?: string): number => {
  if (!distStr) {
    return Number.MAX_SAFE_INTEGER;
  }
  return Number.parseFloat(distStr.split(" ")[0]);
};

export default function FindParkingPage() {
  const router = useRouter();
  const [parkingSpaces, setParkingSpaces] = useState<ParkingSpace[]>(MOCK_SPACES);
  const [loadingSpaces, setLoadingSpaces] = useState(true);
  const [slotsNotice, setSlotsNotice] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [maxPrice, setMaxPrice] = useState(150);
  const [minRating, setMinRating] = useState(0);
  const [maxDistance, setMaxDistance] = useState(5);
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [sortBy, setSortBy] = useState("nearest");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  const [bookingSpaceId, setBookingSpaceId] = useState<string | null>(null);
  const [bookingNotice, setBookingNotice] = useState<string | null>(null);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [hasActiveSessionConflict, setHasActiveSessionConflict] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadSlots = async () => {
      setLoadingSpaces(true);
      setSlotsNotice(null);

      try {
        const slots = await listParkingSlots();

        if (!mounted) {
          return;
        }

        if (slots.length === 0) {
          setParkingSpaces(MOCK_SPACES);
          setSlotsNotice("No active slot rows found in parking_slots. Showing fallback data.");
          return;
        }

        setParkingSpaces(slots.map(mapSlotToParkingSpace));
      } catch (error) {
        if (!mounted) {
          return;
        }

        setParkingSpaces(MOCK_SPACES);
        setSlotsNotice(
          error instanceof Error
            ? `Live slots unavailable: ${error.message}`
            : "Live slots unavailable. Showing fallback data."
        );
      } finally {
        if (mounted) {
          setLoadingSpaces(false);
        }
      }
    };

    void loadSlots();

    return () => {
      mounted = false;
    };
  }, []);

  const filteredSpaces = useMemo(() => {
    return parkingSpaces.filter((space) => {
      const matchesSearch =
        space.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        space.address.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesPrice = space.pricePerHour <= maxPrice;
      const matchesRating = space.rating >= minRating;
      const matchesDistance = parseDistanceValue(space.distance) <= maxDistance;
      const matchesAvailability = onlyAvailable ? space.available : true;

      return (
        matchesSearch &&
        matchesPrice &&
        matchesRating &&
        matchesDistance &&
        matchesAvailability
      );
    }).sort((a, b) => {
      if (sortBy === "price-low") {
        return a.pricePerHour - b.pricePerHour;
      }
      if (sortBy === "price-high") {
        return b.pricePerHour - a.pricePerHour;
      }
      if (sortBy === "rating") {
        return b.rating - a.rating;
      }
      return parseDistanceValue(a.distance) - parseDistanceValue(b.distance);
    });
  }, [
    parkingSpaces,
    searchTerm,
    maxPrice,
    minRating,
    maxDistance,
    onlyAvailable,
    sortBy,
  ]);

  const resetFilters = () => {
    setSearchTerm("");
    setMaxPrice(150);
    setMinRating(0);
    setMaxDistance(5);
    setOnlyAvailable(false);
    setSortBy("nearest");
  };

  const handleBookNow = async (space: ParkingSpace) => {
    setBookingNotice(null);
    setBookingError(null);
    setHasActiveSessionConflict(false);

    if (!hasSupabaseEnv()) {
      setBookingError(
        "Missing Supabase env. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
      );
      return;
    }

    const supabase = getSupabaseBrowserClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      router.push("/login?intent=driver&next=/dashboard");
      return;
    }

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();
    const authToken = session?.access_token;

    if (sessionError || !authToken) {
      router.push("/login?intent=driver&next=/dashboard");
      return;
    }

    setBookingSpaceId(space.id);
    try {
      const slotId = isUuidLike(space.id) ? space.id : undefined;
      const bookingResponse = await createBooking(authToken, slotId);
      const booking = bookingResponse.booking;

      if (!booking?.id) {
        throw new Error("Booking API did not return booking details.");
      }

      await payBooking(authToken, booking.id, slotId);
      setBookingNotice(
        `Booking confirmed for ${space.title}. Session and payment rows were created.`
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to complete booking.";
      setBookingError(message);
      setHasActiveSessionConflict(/active parking session/i.test(message));
    } finally {
      setBookingSpaceId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 transition-colors duration-300 dark:bg-slate-950 dark:text-white">
      <section className="relative overflow-hidden border-b border-slate-200 bg-white pb-16 pt-28 transition-colors duration-300 dark:border-slate-800 dark:bg-slate-950 sm:pb-20 sm:pt-32">
        <div className="pointer-events-none absolute right-0 top-0 h-96 w-96 -translate-y-10 translate-x-12 rounded-full bg-indigo-500/20 blur-[100px] dark:bg-indigo-500/10" />
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl space-y-7">
            <div className="text-center">
              <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white sm:text-5xl md:text-6xl">
                Namma Parking.{" "}
                <span className="text-indigo-600 dark:text-indigo-400">
                  Simplified.
                </span>
              </h1>
              <p className="mt-4 text-base font-medium text-slate-600 dark:text-slate-300 sm:text-lg">
                Find trusted parking nodes across Bengaluru neighborhoods.
              </p>
            </div>

            <div className="space-y-3 sm:space-y-0">
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-5">
                  <Search className="h-5 w-5 text-slate-400 dark:text-slate-500" />
                </div>
                <input
                  type="text"
                  placeholder="Indiranagar, MG Road, Whitefield..."
                  className="w-full rounded-[1.6rem] border border-slate-200 bg-white py-4 pl-12 pr-4 text-base font-medium text-slate-900 outline-none transition focus:border-indigo-600 focus:ring-4 focus:ring-indigo-400/20 sm:rounded-[2rem] sm:py-5 sm:pr-44 sm:text-lg dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <div className="absolute inset-y-0 right-2 hidden items-center gap-2 sm:flex">
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm("")}
                      className="rounded-xl p-2 text-slate-400 transition-colors hover:text-slate-700 dark:hover:text-slate-200"
                      type="button"
                      aria-label="Clear search"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    className="rounded-[1.4rem] bg-indigo-600 px-6 py-2.5 text-[11px] font-black uppercase tracking-widest text-white transition-colors hover:bg-indigo-700 sm:px-8"
                  >
                    Search
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 sm:hidden">
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="rounded-xl p-2 text-slate-400 transition-colors hover:text-slate-700 dark:hover:text-slate-200"
                    type="button"
                    aria-label="Clear search"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
                <button
                  type="button"
                  className="rounded-xl bg-indigo-600 px-5 py-2.5 text-[11px] font-black uppercase tracking-wider text-white transition-colors hover:bg-indigo-700"
                >
                  Search
                </button>
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-2.5">
              {["Koramangala", "Whitefield", "Indiranagar", "HSR Layout"].map(
                (area) => (
                  <button
                    key={area}
                    onClick={() => setSearchTerm(area)}
                    className="rounded-full border border-slate-300 bg-white px-4 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-slate-700 transition-colors hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-indigo-500/40 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-400 sm:px-5 sm:text-[11px]"
                    type="button"
                  >
                    {area}
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-8 lg:flex-row">
          <aside
            className={`lg:w-80 ${isSidebarOpen ? "block" : "hidden lg:block"}`}
          >
            <div className="glass-card sticky top-24 rounded-3xl p-6 shadow-sm">
              <div className="mb-7 flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-900 dark:text-white">
                  Advanced Filter
                </h3>
                <button
                  onClick={resetFilters}
                  className="text-[10px] font-black uppercase tracking-widest text-slate-400 transition-colors hover:text-red-500"
                  type="button"
                >
                  Reset
                </button>
              </div>

              <div className="mb-8 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-widest text-slate-900 dark:text-white">
                      Available Now
                    </p>
                    <p className="text-[10px] text-slate-400">IoT Hub Status</p>
                  </div>
                  <button
                    onClick={() => setOnlyAvailable(!onlyAvailable)}
                    className={`relative h-6 w-12 rounded-full transition ${
                      onlyAvailable
                        ? "bg-indigo-600 dark:bg-indigo-600"
                        : "bg-slate-300 dark:bg-slate-700"
                    }`}
                    type="button"
                    aria-label="Toggle availability"
                  >
                    <span
                      className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-all ${
                        onlyAvailable ? "left-7" : "left-1"
                      }`}
                    />
                  </button>
                </div>
              </div>

              <div className="mb-8">
                <div className="mb-4 flex items-center justify-between">
                  <label className="text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                    Max Price (INR/hr)
                  </label>
                  <span className="text-sm font-black text-slate-900 dark:text-indigo-400">
                    INR {maxPrice}
                  </span>
                </div>
                <input
                  type="range"
                  min="40"
                  max="200"
                  step="10"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(Number.parseInt(e.target.value, 10))}
                  className="w-full cursor-pointer appearance-none rounded-lg accent-indigo-600"
                />
              </div>

              <div className="mb-8">
                <div className="mb-4 flex items-center justify-between">
                  <label className="text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                    Max Distance
                  </label>
                  <span className="text-sm font-black text-slate-900 dark:text-indigo-400">
                    {maxDistance} km
                  </span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="10"
                  step="0.5"
                  value={maxDistance}
                  onChange={(e) => setMaxDistance(Number.parseFloat(e.target.value))}
                  className="w-full cursor-pointer appearance-none rounded-lg accent-indigo-600"
                />
              </div>

              <div>
                <label className="mb-4 block text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                  Minimum Rating
                </label>
                <div className="flex flex-wrap gap-2">
                  {[0, 3, 3.5, 4, 4.5, 5].map((r) => (
                    <button
                      key={r}
                      onClick={() => setMinRating(r)}
                      className={`rounded-xl px-3 py-2 text-xs font-black transition-all ${
                        minRating === r
                          ? "bg-indigo-600 text-white dark:bg-indigo-600 dark:text-white"
                          : "bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                      }`}
                      type="button"
                    >
                      {r === 0 ? "All" : r}
                    </button>
                  ))}
                </div>
              </div>
            </div>

          </aside>

          <div className="flex-1 space-y-7">
            <div className="glass-card flex flex-col gap-4 rounded-3xl p-5 shadow-sm md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-slate-100 p-2.5 dark:bg-slate-800">
                  <MapPin className="h-4 w-4 text-slate-700 dark:text-slate-300" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Found in Network
                  </p>
                  <p className="text-sm font-black text-slate-900 dark:text-white">
                    {filteredSpaces.length} nodes available
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2.5 text-[11px] font-black uppercase tracking-widest dark:bg-slate-800 lg:hidden"
                  type="button"
                >
                  <FilterIcon className="h-4 w-4" />
                  Filters
                </button>
                <div className="relative">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="cursor-pointer appearance-none rounded-xl border border-slate-300 bg-white px-4 py-2.5 pr-10 text-[11px] font-black uppercase tracking-widest outline-none transition focus:border-indigo-600 dark:border-slate-700 dark:bg-slate-900"
                  >
                    <option value="nearest">Nearest First</option>
                    <option value="price-low">Lowest Price</option>
                    <option value="price-high">Highest Price</option>
                    <option value="rating">Top Rated</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                </div>
              </div>
            </div>

            {bookingError && (
              <div className="flex flex-col gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300 sm:flex-row sm:items-center sm:justify-between">
                <span>{bookingError}</span>
                {hasActiveSessionConflict && (
                  <button
                    type="button"
                    onClick={() => router.push("/dashboard")}
                    className="inline-flex items-center justify-center rounded-lg bg-red-600 px-3 py-2 text-[11px] font-black uppercase tracking-wider text-white transition-colors hover:bg-red-700"
                  >
                    Open Dashboard
                  </button>
                )}
              </div>
            )}

            {bookingNotice && (
              <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700 dark:border-green-500/30 dark:bg-green-500/10 dark:text-green-300">
                {bookingNotice}
              </div>
            )}

            {slotsNotice && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
                {slotsNotice}
              </div>
            )}

            {filteredSpaces.length > 0 ? (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {filteredSpaces.map((space) => (
                  <div
                    key={space.id}
                    className="glass-card group overflow-hidden rounded-3xl shadow-sm transition"
                  >
                    <div className="relative h-56 overflow-hidden">
                      {/* Use a local fallback image whenever a remote source fails. */}
                      <Image
                        src={failedImages[space.id] ? FALLBACK_IMAGE : space.image}
                        alt={space.title}
                        width={800}
                        height={500}
                        sizes="(max-width: 768px) 100vw, 50vw"
                        onError={() =>
                          setFailedImages((prev) =>
                            prev[space.id] ? prev : { ...prev, [space.id]: true }
                          )
                        }
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                      <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                        <span className="rounded-xl bg-slate-900/90 px-3 py-1.5 text-xs font-black text-indigo-200">
                          INR {space.pricePerHour}/hr
                        </span>
                        {space.available ? (
                          <span className="status-pill-live inline-flex items-center rounded-xl bg-emerald-600 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-white">
                            <span className="mr-2 h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                            Live
                          </span>
                        ) : (
                          <span className="status-pill-occupied inline-flex items-center rounded-xl bg-[var(--color-occupied)] px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-white">
                            Occupied
                          </span>
                        )}
                      </div>
                      <div className="absolute bottom-4 left-4 inline-flex items-center rounded-full bg-white/90 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-700 dark:bg-slate-900/90 dark:text-slate-200">
                        <Clock className="mr-1.5 h-3 w-3" />
                        Namma Node
                      </div>
                    </div>

                    <div className="p-6">
                      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                        <div>
                          <h3 className="text-xl font-black tracking-tight text-slate-900 transition-colors group-hover:text-indigo-600 dark:text-white dark:group-hover:text-indigo-400">
                            {space.title}
                          </h3>
                          <p className="mt-1 inline-flex items-center break-words text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            <MapPin className="mr-1.5 h-3.5 w-3.5" />
                            {space.address}
                          </p>
                        </div>
                        <span className="inline-flex items-center gap-1 rounded-xl bg-yellow-100 px-2.5 py-1.5 text-xs font-black text-yellow-700 dark:bg-yellow-500/15 dark:text-yellow-400">
                          <Star className="h-3.5 w-3.5 fill-current" />
                          {space.rating}
                        </span>
                      </div>

                      <div className="flex flex-col items-start gap-3 border-t border-slate-100 pt-5 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
                        <span className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                          {space.distance} from you
                        </span>
                        <button
                          type="button"
                          disabled={
                            bookingSpaceId !== null ||
                            loadingSpaces ||
                            hasActiveSessionConflict
                          }
                          onClick={() => void handleBookNow(space)}
                          className={`inline-flex w-full items-center justify-center rounded-xl px-4 py-2.5 text-[11px] font-black uppercase tracking-[0.18em] transition-colors sm:w-auto ${
                            bookingSpaceId !== null ||
                            loadingSpaces ||
                            hasActiveSessionConflict
                              ? "cursor-not-allowed bg-slate-300 text-slate-600 dark:bg-slate-700 dark:text-slate-400"
                              : "bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-indigo-600 dark:text-white dark:hover:bg-indigo-700"
                          }`}
                        >
                          {bookingSpaceId === space.id
                            ? "Booking"
                            : hasActiveSessionConflict
                            ? "Active Session"
                            : "Book"}
                          <ArrowUpRight className="ml-1.5 h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="glass-card rounded-3xl p-8 text-center shadow-sm sm:p-16">
                <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                  <SlidersHorizontal className="h-7 w-7 text-slate-400" />
                </div>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                  No nodes match your filters.
                </h3>
                <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-slate-500 dark:text-slate-300">
                  Try adjusting price range or distance to discover more parking
                  spaces around you.
                </p>
                <button
                  onClick={resetFilters}
                  className="mt-8 rounded-xl bg-indigo-600 px-7 py-3 text-[11px] font-black uppercase tracking-widest text-white transition-colors hover:bg-indigo-700 dark:bg-indigo-600 dark:text-white dark:hover:bg-indigo-700"
                  type="button"
                >
                  Clear All Filters
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


