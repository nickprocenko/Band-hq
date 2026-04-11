import { useEffect, useMemo, useState } from "react";
import { isSupabaseConfigured, supabase } from "./lib/supabaseClient";

const REHEARSAL_STATUSES = ["planned", "draft", "confirmed", "completed"];
const PERFORMANCE_STATUSES = ["planned", "pending", "confirmed", "completed"];

const initialRehearsalForm = {
  title: "",
  rehearsal_date: "",
  location: "",
  status: "planned",
  drive_url: ""
};

const initialPerformanceForm = {
  title: "",
  performance_date: "",
  venue: "",
  status: "planned",
  drive_url: ""
};

function formatDate(value) {
  if (!value) {
    return "Date not set";
  }

  const date = new Date(`${value}T00:00:00`);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(date);
}

export default function App() {
  const [rehearsals, setRehearsals] = useState([]);
  const [performances, setPerformances] = useState([]);
  const [rehearsalForm, setRehearsalForm] = useState(initialRehearsalForm);
  const [performanceForm, setPerformanceForm] = useState(initialPerformanceForm);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const canSubmit = useMemo(() => isSupabaseConfigured && !loading, [loading]);

  async function loadData() {
    if (!isSupabaseConfigured) {
      return;
    }

    setLoading(true);
    setErrorMessage("");

    const [rehearsalsResponse, performancesResponse] = await Promise.all([
      supabase
        .from("rehearsals")
        .select("id, title, rehearsal_date, location, status, drive_url")
        .order("rehearsal_date", { ascending: true, nullsFirst: false }),
      supabase
        .from("performances")
        .select("id, title, performance_date, venue, status, drive_url")
        .order("performance_date", { ascending: true, nullsFirst: false })
    ]);

    if (rehearsalsResponse.error || performancesResponse.error) {
      setErrorMessage(
        rehearsalsResponse.error?.message ||
          performancesResponse.error?.message ||
          "Could not load data."
      );
      setLoading(false);
      return;
    }

    setRehearsals(rehearsalsResponse.data || []);
    setPerformances(performancesResponse.data || []);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  async function createRehearsal(event) {
    event.preventDefault();
    if (!canSubmit || !rehearsalForm.title.trim()) {
      return;
    }

    setLoading(true);
    setErrorMessage("");

    const { error } = await supabase.from("rehearsals").insert([
      {
        title: rehearsalForm.title.trim(),
        rehearsal_date: rehearsalForm.rehearsal_date || null,
        location: rehearsalForm.location.trim() || null,
        status: rehearsalForm.status,
        drive_url: rehearsalForm.drive_url.trim() || null
      }
    ]);

    if (error) {
      setErrorMessage(error.message);
      setLoading(false);
      return;
    }

    setRehearsalForm(initialRehearsalForm);
    await loadData();
  }

  async function createPerformance(event) {
    event.preventDefault();
    if (!canSubmit || !performanceForm.title.trim()) {
      return;
    }

    setLoading(true);
    setErrorMessage("");

    const { error } = await supabase.from("performances").insert([
      {
        title: performanceForm.title.trim(),
        performance_date: performanceForm.performance_date || null,
        venue: performanceForm.venue.trim() || null,
        status: performanceForm.status,
        drive_url: performanceForm.drive_url.trim() || null
      }
    ]);

    if (error) {
      setErrorMessage(error.message);
      setLoading(false);
      return;
    }

    setPerformanceForm(initialPerformanceForm);
    await loadData();
  }

  async function updateRehearsalStatus(id, status) {
    if (!isSupabaseConfigured) {
      return;
    }

    const { error } = await supabase
      .from("rehearsals")
      .update({ status })
      .eq("id", id);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setRehearsals((current) =>
      current.map((item) => (item.id === id ? { ...item, status } : item))
    );
  }

  async function updatePerformanceStatus(id, status) {
    if (!isSupabaseConfigured) {
      return;
    }

    const { error } = await supabase
      .from("performances")
      .update({ status })
      .eq("id", id);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setPerformances((current) =>
      current.map((item) => (item.id === id ? { ...item, status } : item))
    );
  }

  return (
    <div className="page">
      <header className="hero">
        <p className="eyebrow">Band Operations</p>
        <h1>Band HQ</h1>
        <p className="subhead">
          Live app for rehearsals and performances. Google Drive is used only for
          media links attached to each item.
        </p>
      </header>

      {!isSupabaseConfigured && (
        <section className="callout warning">
          <h3>Connect Supabase to enable live data</h3>
          <p>
            Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment,
            then refresh.
          </p>
        </section>
      )}

      {errorMessage && (
        <section className="callout error">
          <h3>Database error</h3>
          <p>{errorMessage}</p>
        </section>
      )}

      <main className="grid">
        <section className="panel">
          <div className="panel-title-row">
            <h2>Rehearsals</h2>
            <span className="tiny-label">{rehearsals.length} total</span>
          </div>

          <form className="stack" onSubmit={createRehearsal}>
            <input
              value={rehearsalForm.title}
              onChange={(event) =>
                setRehearsalForm((prev) => ({ ...prev, title: event.target.value }))
              }
              placeholder="Rehearsal title"
              required
            />
            <div className="split">
              <input
                type="date"
                value={rehearsalForm.rehearsal_date}
                onChange={(event) =>
                  setRehearsalForm((prev) => ({
                    ...prev,
                    rehearsal_date: event.target.value
                  }))
                }
              />
              <input
                value={rehearsalForm.location}
                onChange={(event) =>
                  setRehearsalForm((prev) => ({ ...prev, location: event.target.value }))
                }
                placeholder="Location"
              />
            </div>
            <div className="split">
              <select
                value={rehearsalForm.status}
                onChange={(event) =>
                  setRehearsalForm((prev) => ({ ...prev, status: event.target.value }))
                }
              >
                {REHEARSAL_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
              <input
                value={rehearsalForm.drive_url}
                onChange={(event) =>
                  setRehearsalForm((prev) => ({ ...prev, drive_url: event.target.value }))
                }
                placeholder="Google Drive URL"
                type="url"
              />
            </div>
            <button type="submit" disabled={!canSubmit}>
              + Add rehearsal
            </button>
          </form>

          <ul>
            {rehearsals.map((item) => (
              <li key={item.id}>
                <div>
                  <p className="item-title">{item.title}</p>
                  <p className="item-date">
                    {formatDate(item.rehearsal_date)}
                    {item.location ? ` · ${item.location}` : ""}
                  </p>
                  {item.drive_url && (
                    <a href={item.drive_url} target="_blank" rel="noreferrer">
                      Open Drive media
                    </a>
                  )}
                </div>
                <select
                  className="tag-select"
                  value={item.status}
                  onChange={(event) => updateRehearsalStatus(item.id, event.target.value)}
                >
                  {REHEARSAL_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </li>
            ))}
            {!rehearsals.length && <li className="empty">No rehearsals yet.</li>}
          </ul>
        </section>

        <section className="panel">
          <div className="panel-title-row">
            <h2>Performances</h2>
            <span className="tiny-label">{performances.length} total</span>
          </div>

          <form className="stack" onSubmit={createPerformance}>
            <input
              value={performanceForm.title}
              onChange={(event) =>
                setPerformanceForm((prev) => ({ ...prev, title: event.target.value }))
              }
              placeholder="Performance title"
              required
            />
            <div className="split">
              <input
                type="date"
                value={performanceForm.performance_date}
                onChange={(event) =>
                  setPerformanceForm((prev) => ({
                    ...prev,
                    performance_date: event.target.value
                  }))
                }
              />
              <input
                value={performanceForm.venue}
                onChange={(event) =>
                  setPerformanceForm((prev) => ({ ...prev, venue: event.target.value }))
                }
                placeholder="Venue"
              />
            </div>
            <div className="split">
              <select
                value={performanceForm.status}
                onChange={(event) =>
                  setPerformanceForm((prev) => ({ ...prev, status: event.target.value }))
                }
              >
                {PERFORMANCE_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
              <input
                value={performanceForm.drive_url}
                onChange={(event) =>
                  setPerformanceForm((prev) => ({ ...prev, drive_url: event.target.value }))
                }
                placeholder="Google Drive URL"
                type="url"
              />
            </div>
            <button type="submit" disabled={!canSubmit}>
              + Add performance
            </button>
          </form>

          <ul>
            {performances.map((item) => (
              <li key={item.id}>
                <div>
                  <p className="item-title">{item.title}</p>
                  <p className="item-date">
                    {formatDate(item.performance_date)}
                    {item.venue ? ` · ${item.venue}` : ""}
                  </p>
                  {item.drive_url && (
                    <a href={item.drive_url} target="_blank" rel="noreferrer">
                      Open Drive media
                    </a>
                  )}
                </div>
                <select
                  className="tag-select"
                  value={item.status}
                  onChange={(event) => updatePerformanceStatus(item.id, event.target.value)}
                >
                  {PERFORMANCE_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </li>
            ))}
            {!performances.length && <li className="empty">No performances yet.</li>}
          </ul>
        </section>

        <section className="panel full">
          <div className="panel-title-row">
            <h2>How media links work</h2>
          </div>
          <p className="note">
            Attach Google Drive URLs to rehearsals and performances. The app stores
            only the links, while files remain in Drive.
          </p>
        </section>
      </main>
    </div>
  );
}