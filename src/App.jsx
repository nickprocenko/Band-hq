import { useEffect, useMemo, useState } from "react";
import { isSupabaseConfigured, supabase } from "./lib/supabaseClient";

const REHEARSAL_STATUSES = ["planned", "draft", "confirmed", "completed"];
const MEMBER_FOLDERS = ["covers", "originals", "songs_im_learning"];

const initialRehearsalForm = {
  title: "",
  rehearsal_date: "",
  rehearsal_start_time: "",
  location: "",
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

function formatTime(value) {
  if (!value) {
    return "Time not set";
  }

  const [hours, minutes] = value.split(":");
  const date = new Date();
  date.setHours(Number(hours), Number(minutes), 0, 0);
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}

export default function App() {
  const [activePage, setActivePage] = useState("rehearsals");
  const [rehearsals, setRehearsals] = useState([]);
  const [members, setMembers] = useState([]);
  const [memberSongs, setMemberSongs] = useState([]);
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [memberName, setMemberName] = useState("");
  const [songInputByFolder, setSongInputByFolder] = useState({});
  const [songDraftById, setSongDraftById] = useState({});
  const [rehearsalForm, setRehearsalForm] = useState(initialRehearsalForm);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const canSubmit = useMemo(() => isSupabaseConfigured && !loading, [loading]);

  const songsByMemberAndFolder = useMemo(() => {
    return memberSongs.reduce((acc, song) => {
      const key = `${song.member_id}:${song.folder}`;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(song);
      return acc;
    }, {});
  }, [memberSongs]);

  const selectedMember = useMemo(
    () => members.find((member) => member.id === selectedMemberId) || null,
    [members, selectedMemberId]
  );

  async function loadData() {
    if (!isSupabaseConfigured) {
      return;
    }

    setLoading(true);
    setErrorMessage("");

    const [rehearsalsResponse, membersResponse, memberSongsResponse] = await Promise.all([
      supabase
        .from("rehearsals")
        .select("id, title, rehearsal_date, rehearsal_start_time, location, status, drive_url")
        .order("rehearsal_date", { ascending: true, nullsFirst: false }),
      supabase
        .from("band_members")
        .select("id, name, created_at")
        .order("name", { ascending: true }),
      supabase
        .from("member_song_lists")
        .select("id, member_id, folder, song_title, created_at")
        .order("created_at", { ascending: true })
    ]);

    if (rehearsalsResponse.error || membersResponse.error || memberSongsResponse.error) {
      setErrorMessage(
        rehearsalsResponse.error?.message ||
          membersResponse.error?.message ||
          memberSongsResponse.error?.message ||
          "Could not load data."
      );
      setLoading(false);
      return;
    }

    setRehearsals(rehearsalsResponse.data || []);
    setMembers(membersResponse.data || []);
    setMemberSongs(memberSongsResponse.data || []);

    if (!selectedMemberId && (membersResponse.data || []).length) {
      setSelectedMemberId(membersResponse.data[0].id);
    }
    if (
      selectedMemberId &&
      !(membersResponse.data || []).some((member) => member.id === selectedMemberId)
    ) {
      setSelectedMemberId((membersResponse.data || [])[0]?.id || "");
    }

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
        rehearsal_start_time: rehearsalForm.rehearsal_start_time || null,
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

  async function createMember(event) {
    event.preventDefault();
    if (!canSubmit || !memberName.trim()) {
      return;
    }

    setLoading(true);
    setErrorMessage("");

    const { error } = await supabase.from("band_members").insert([
      {
        name: memberName.trim()
      }
    ]);

    if (error) {
      setErrorMessage(error.message);
      setLoading(false);
      return;
    }

    setMemberName("");
    await loadData();
  }

  async function deleteRehearsal(rehearsalId) {
    const { error } = await supabase.from("rehearsals").delete().eq("id", rehearsalId);
    if (error) {
      setErrorMessage(error.message);
      return;
    }
    await loadData();
  }

  async function deleteMember(memberId) {
    const { error } = await supabase.from("band_members").delete().eq("id", memberId);
    if (error) {
      setErrorMessage(error.message);
      return;
    }
    await loadData();
  }

  async function addSongToFolder(memberId, folder) {
    const key = `${memberId}:${folder}`;
    const songTitle = songInputByFolder[key]?.trim();
    if (!canSubmit || !songTitle) {
      return;
    }

    const { error } = await supabase.from("member_song_lists").insert([
      {
        member_id: memberId,
        folder,
        song_title: songTitle
      }
    ]);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setSongInputByFolder((prev) => ({ ...prev, [key]: "" }));
    await loadData();
  }

  async function saveSongEdit(songId) {
    const value = songDraftById[songId]?.trim();
    if (!value) {
      return;
    }

    const { error } = await supabase
      .from("member_song_lists")
      .update({ song_title: value })
      .eq("id", songId);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    await loadData();
  }

  async function removeSong(songId) {
    const { error } = await supabase.from("member_song_lists").delete().eq("id", songId);
    if (error) {
      setErrorMessage(error.message);
      return;
    }
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

  return (
    <div className="page">
      <header className="hero">
        <p className="eyebrow">Band Operations Console</p>
        <h1>Band HQ</h1>
        <p className="subhead">
          Compact file-style pages for rehearsals and member folders.
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

      <main className="workspace">
        <aside className="sidebar panel">
          <p className="sidebar-label">Pages</p>
          <button
            type="button"
            className={`nav-item ${activePage === "rehearsals" ? "active" : ""}`}
            onClick={() => setActivePage("rehearsals")}
          >
            Rehearsals
          </button>
          <button
            type="button"
            className={`nav-item ${activePage === "members" ? "active" : ""}`}
            onClick={() => setActivePage("members")}
          >
            Members
          </button>

          {activePage === "members" && (
            <div className="tree-list">
              <p className="sidebar-label">Member folders</p>
              {members.map((member) => (
                <button
                  key={member.id}
                  type="button"
                  className={`tree-item ${selectedMemberId === member.id ? "active" : ""}`}
                  onClick={() => setSelectedMemberId(member.id)}
                >
                  {member.name}
                </button>
              ))}
            </div>
          )}
        </aside>

        <section className="content panel">
          {activePage === "rehearsals" && (
            <>
              <div className="panel-title-row">
                <h2>Rehearsals</h2>
                <span className="tiny-label">{rehearsals.length} items</span>
              </div>

              <form className="stack form-card" onSubmit={createRehearsal}>
                <input
                  value={rehearsalForm.title}
                  onChange={(event) =>
                    setRehearsalForm((prev) => ({ ...prev, title: event.target.value }))
                  }
                  placeholder="Rehearsal title"
                  required
                />
                <div className="split three">
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
                    type="time"
                    value={rehearsalForm.rehearsal_start_time}
                    onChange={(event) =>
                      setRehearsalForm((prev) => ({
                        ...prev,
                        rehearsal_start_time: event.target.value
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

              <div className="file-list">
                {rehearsals.map((item) => (
                  <article className="file-row" key={item.id}>
                    <div className="file-main">
                      <p className="item-title">{item.title}</p>
                      <p className="item-date">
                        {formatDate(item.rehearsal_date)} · {formatTime(item.rehearsal_start_time)}
                        {item.location ? ` · ${item.location}` : ""}
                      </p>
                      {item.drive_url && (
                        <a href={item.drive_url} target="_blank" rel="noreferrer">
                          Open Drive media
                        </a>
                      )}
                    </div>
                    <div className="file-actions">
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
                      <button
                        type="button"
                        className="ghost danger"
                        onClick={() => deleteRehearsal(item.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </article>
                ))}
                {!rehearsals.length && <p className="empty">No rehearsals yet.</p>}
              </div>
            </>
          )}

          {activePage === "members" && (
            <>
              <div className="panel-title-row">
                <h2>Members</h2>
                <span className="tiny-label">{members.length} items</span>
              </div>

              <form className="stack form-card" onSubmit={createMember}>
                <div className="split">
                  <input
                    value={memberName}
                    onChange={(event) => setMemberName(event.target.value)}
                    placeholder="Band member name"
                    required
                  />
                  <button type="submit" disabled={!canSubmit}>
                    + Add band member
                  </button>
                </div>
              </form>

              {selectedMember ? (
                <article className="member-detail">
                  <div className="panel-title-row compact">
                    <div>
                      <h3 className="member-title">{selectedMember.name}</h3>
                      <p className="item-date">Folder view</p>
                    </div>
                    <button
                      type="button"
                      className="ghost danger"
                      onClick={() => deleteMember(selectedMember.id)}
                    >
                      Delete member
                    </button>
                  </div>

                  {MEMBER_FOLDERS.map((folder) => {
                    const key = `${selectedMember.id}:${folder}`;
                    const songs = songsByMemberAndFolder[key] || [];

                    return (
                      <details className="folder folder-collapsible" key={key} open>
                        <summary className="folder-summary">
                          <span>{folder.replaceAll("_", " ")}</span>
                          <span className="tiny-label">{songs.length} songs</span>
                        </summary>

                        <div className="folder-body">
                          <div className="song-grid">
                            {songs.map((song) => (
                              <div className="song-row compact-song-row" key={song.id}>
                                <input
                                  value={songDraftById[song.id] ?? song.song_title}
                                  onChange={(event) =>
                                    setSongDraftById((prev) => ({
                                      ...prev,
                                      [song.id]: event.target.value
                                    }))
                                  }
                                />
                                <button type="button" onClick={() => saveSongEdit(song.id)}>
                                  Save
                                </button>
                                <button
                                  type="button"
                                  className="ghost"
                                  onClick={() => removeSong(song.id)}
                                >
                                  Remove
                                </button>
                              </div>
                            ))}
                          </div>

                          <div className="song-row compact-song-row add-row">
                            <input
                              value={songInputByFolder[key] || ""}
                              onChange={(event) =>
                                setSongInputByFolder((prev) => ({
                                  ...prev,
                                  [key]: event.target.value
                                }))
                              }
                              placeholder="Add song"
                            />
                            <button
                              type="button"
                              onClick={() => addSongToFolder(selectedMember.id, folder)}
                            >
                              Add
                            </button>
                          </div>
                        </div>
                      </details>
                    );
                  })}
                </article>
              ) : (
                <p className="empty">No member selected.</p>
              )}
            </>
          )}
        </section>
      </main>
    </div>
  );
}