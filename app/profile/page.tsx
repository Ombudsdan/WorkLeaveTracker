"use client";
import { useState, useEffect, FormEvent } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [nonWorkingDays, setNonWorkingDays] = useState<number[]>([0, 6]);
  const [holidayStartMonth, setHolidayStartMonth] = useState(1);
  const [core, setCore] = useState(25);
  const [bought, setBought] = useState(0);
  const [carried, setCarried] = useState(0);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") {
      fetch("/api/users")
        .then((r) => r.json())
        .then((users) => {
          const me = users.find(
            (u: { profile: { email: string } }) =>
              u.profile.email === session?.user?.email
          );
          if (me) {
            setFirstName(me.profile.firstName);
            setLastName(me.profile.lastName);
            setCompany(me.profile.company);
            setEmail(me.profile.email);
            setNonWorkingDays(me.profile.nonWorkingDays);
            setHolidayStartMonth(me.profile.holidayStartMonth);
            setCore(me.allowance.core);
            setBought(me.allowance.bought);
            setCarried(me.allowance.carried);
          }
        });
    }
  }, [status, session]);

  function toggleDay(day: number) {
    setNonWorkingDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSaved(false);
    const res = await fetch("/api/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        profile: { firstName, lastName, company, email, nonWorkingDays, holidayStartMonth },
        allowance: { core, bought, carried },
      }),
    });
    if (!res.ok) {
      setError("Failed to save. Please try again.");
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  }

  if (status === "loading") {
    return <div className="min-h-screen flex items-center justify-center">Loading…</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b px-6 py-3 flex items-center justify-between">
        <h1 className="text-lg font-bold text-indigo-700">Work Leave Tracker</h1>
        <div className="flex gap-4 text-sm">
          <Link href="/dashboard" className="text-gray-600 hover:text-indigo-700">Dashboard</Link>
          <Link href="/profile" className="text-indigo-700 font-semibold">Profile</Link>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto py-8 px-4">
        <h2 className="text-xl font-bold text-gray-800 mb-6">My Profile</h2>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow p-6 space-y-6">
          {/* Personal details */}
          <section>
            <h3 className="font-semibold text-gray-700 mb-3 text-sm uppercase tracking-wide">Personal Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">First Name</label>
                <input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Last Name</label>
                <input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Company</label>
                <input
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  readOnly
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-400"
                />
              </div>
            </div>
          </section>

          {/* Working week */}
          <section>
            <h3 className="font-semibold text-gray-700 mb-3 text-sm uppercase tracking-wide">Non-Working Days</h3>
            <div className="flex gap-2 flex-wrap">
              {DAYS.map((day, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => toggleDay(i)}
                  className={`px-3 py-1 rounded-full text-sm font-medium border transition ${
                    nonWorkingDays.includes(i)
                      ? "bg-red-100 border-red-300 text-red-700"
                      : "bg-green-100 border-green-300 text-green-700"
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-1">Red = non-working, Green = working</p>
          </section>

          {/* Holiday period */}
          <section>
            <h3 className="font-semibold text-gray-700 mb-3 text-sm uppercase tracking-wide">Holiday Period</h3>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Holiday Year Starts</label>
              <select
                value={holidayStartMonth}
                onChange={(e) => setHolidayStartMonth(Number(e.target.value))}
                className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-400 focus:outline-none"
              >
                {MONTHS.map((m, i) => (
                  <option key={i} value={i + 1}>{m}</option>
                ))}
              </select>
            </div>
          </section>

          {/* Allowance */}
          <section>
            <h3 className="font-semibold text-gray-700 mb-3 text-sm uppercase tracking-wide">Leave Allowance</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Core Days</label>
                <input
                  type="number"
                  min={0}
                  max={365}
                  value={core}
                  onChange={(e) => setCore(Number(e.target.value))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Days Bought</label>
                <input
                  type="number"
                  min={0}
                  max={365}
                  value={bought}
                  onChange={(e) => setBought(Number(e.target.value))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Days Carried Over</label>
                <input
                  type="number"
                  min={0}
                  max={365}
                  value={carried}
                  onChange={(e) => setCarried(Number(e.target.value))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-400 focus:outline-none"
                />
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              Total allowance: <strong>{core + bought + carried}</strong> days
            </p>
          </section>

          {error && <p className="text-red-500 text-sm">{error}</p>}
          {saved && <p className="text-green-600 text-sm">✓ Saved successfully</p>}

          <button
            type="submit"
            className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-indigo-700 transition"
          >
            Save Profile
          </button>
        </form>
      </main>
    </div>
  );
}
