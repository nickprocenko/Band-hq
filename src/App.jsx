import { useEffect, useMemo, useState } from "react";
import { isSupabaseConfigured, supabase } from "./lib/supabaseClient";

const REHEARSAL_STATUSES = ["planned", "draft", "confirmed", "completed"];
const MEMBER_FOLDERS = ["covers", "originals", "songs_im_learning"];

const initialRehearsalForm = {
  title: "",
  rehearsal_date: "",
  location: "",
  status: "planned",
  drive_url: ""
};

const initialRequestForm = {
  member_id: "",
  rehearsal_id: "",
  song_title: "",
  notes: ""
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
  const [members, setMembers] = useState([]);
  const [memberSongs, setMemberSongs] = useState([]);
  const [requests, setRequests] = useState([]);
  const [requestApprovals, setRequestApprovals] = useState([]);
  const [memberName, setMemberName] = useState("");
  const [songInputByFolder, setSongInputByFolder] = useState({});
  const [songDraftById, setSongDraftById] = useState({});
  const [approverByRequest, setApproverByRequest] = useState({});
  const [rehearsalForm, setRehearsalForm] = useState(initialRehearsalForm);
  const [requestForm, setRequestForm] = useState(initialRequestForm);
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

  const approvalsByRequest = useMemo(() => {
    return requestApprovals.reduce((acc, item) => {
      if (!acc[item.request_id]) {
        acc[item.request_id] = [];
      }
      acc[item.request_id].push(item);
      return acc;
    }, {});
  }, [requestApprovals]);

  async function loadData() {
    if (!isSupabaseConfigured) {
      return;
    }

    setLoading(true);
    setErrorMessage("");

    const [rehearsalsResponse, membersResponse, memberSongsResponse, requestsResponse, approvalsResponse] = await Promise.all([
      supabase
        .from("rehearsals")
        .select("id, title, rehearsal_date, location, status, drive_url")
        .order("rehearsal_date", { ascending: true, nullsFirst: false }),
      supabase
        .from("band_members")
        .select("id, name, created_at")
        .order("name", { ascending: true }),
      supabase
        .from("member_song_lists")
        .select("id, member_id, folder, song_title, created_at")
        .order("created_at", { ascending: true }),
      supabase
        .from("rehearsal_song_requests")
        .select("id, member_id, rehearsal_id, song_title, notes, status, created_at")
        .order("created_at", { ascending: false }),
      supabase
        .from("request_approvals")
        .select("id, request_id, approver_member_id, decision, decided_at")
        .order("decided_at", { ascending: false })
    ]);

    if (
      rehearsalsResponse.error ||
      membersResponse.error ||
      memberSongsResponse.error ||
      requestsResponse.error ||
      approvalsResponse.error
    ) {
      setErrorMessage(
        rehearsalsResponse.error?.message ||
          membersResponse.error?.message ||
          memberSongsResponse.error?.message ||
          requestsResponse.error?.message ||
          approvalsResponse.error?.message ||
          "Could not load data."
      );
      setLoading(false);
      return;
    }

    setRehearsals(rehearsalsResponse.data || []);
    setMembers(membersResponse.data || []);
    setMemberSongs(memberSongsResponse.data || []);
    setRequests(requestsResponse.data || []);
    setRequestApprovals(approvalsResponse.data || []);

    const requesterDefaults = {};
    for (const request of requestsResponse.data || []) {
      const firstDifferentMember = (membersResponse.data || []).find(
        (member) => member.id !== request.member_id
      );
      if (firstDifferentMember) {
        requesterDefaults[request.id] = firstDifferentMember.id;
      }
    }
    setApproverByRequest(requesterDefaults);

    if ((membersResponse.data || []).length && !requestForm.member_id) {
      setRequestForm((prev) => ({ ...prev, member_id: membersResponse.data[0].id }));
    }
    if ((rehearsalsResponse.data || []).length && !requestForm.rehearsal_id) {
      setRequestForm((prev) => ({
        ...prev,
        rehearsal_id: rehearsalsResponse.data[0].id
      }));
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

  async function createSongRequest(event) {
    event.preventDefault();
    if (
      !canSubmit ||
      !requestForm.member_id ||
      !requestForm.rehearsal_id ||
      !requestForm.song_title.trim()
    ) {
      return;
    }

    const { error } = await supabase.from("rehearsal_song_requests").insert([
      {
        member_id: requestForm.member_id,
        rehearsal_id: requestForm.rehearsal_id,
        song_title: requestForm.song_title.trim(),
        notes: requestForm.notes.trim() || null,
        status: "pending"
      }
    ]);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setRequestForm((prev) => ({ ...initialRequestForm, member_id: prev.member_id, rehearsal_id: prev.rehearsal_id }));
    await loadData();
  }

  async function deleteSongRequest(requestId) {
    const { error } = await supabase
      .from("rehearsal_song_requests")
      .delete()
      .eq("id", requestId);
    if (error) {
      setErrorMessage(error.message);
      return;
    }
    await loadData();
  }

  async function decideRequest(request, decision) {
    const approverMemberId = approverByRequest[request.id];
    if (!approverMemberId) {
      setErrorMessage("Select an approver before deciding on a request.");
      return;
    }
    if (approverMemberId === request.member_id) {
      setErrorMessage("Requester cannot approve their own song request.");
      return;
    }

    const { error: approvalError } = await supabase.from("request_approvals").upsert(
      [
        {
          request_id: request.id,
          approver_member_id: approverMemberId,
          decision,
          decided_at: new Date().toISOString()
        }
      ],
      { onConflict: "request_id,approver_member_id" }
    );

    if (approvalError) {
      setErrorMessage(approvalError.message);
      return;
    }

    const { data: approvals, error: approvalsError } = await supabase
      .from("request_approvals")
      .select("approver_member_id, decision")
      .eq("request_id", request.id);

    if (approvalsError) {
      setErrorMessage(approvalsError.message);
      return;
    }

    const approvedSet = new Set(
      (approvals || [])
        .filter((item) => item.decision === "approved")
        .map((item) => item.approver_member_id)
    );
    const hasRejection = (approvals || []).some((item) => item.decision === "rejected");

    const nextStatus = hasRejection
      ? "rejected"
      : approvedSet.size >= 2
        ? "approved"
        : "pending";

    const { error: requestError } = await supabase
      .from("rehearsal_song_requests")
      .update({ status: nextStatus })
      .eq("id", request.id);

    if (requestError) {
      setErrorMessage(requestError.message);
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
          Member folders, editable song lists, and rehearsal request approvals in a
          single dark workspace.
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
            <h2>Upcoming Rehearsals</h2>
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
                  <button
                    type="button"
                    className="ghost danger"
                    onClick={() => deleteRehearsal(item.id)}
                  >
                    Delete
                  </button>
              </li>
            ))}
            {!rehearsals.length && <li className="empty">No rehearsals yet.</li>}
          </ul>
        </section>

        <section className="panel">
          <div className="panel-title-row">
            <h2>Band Members Folder</h2>
            <span className="tiny-label">{members.length} members</span>
          </div>

          <form className="stack" onSubmit={createMember}>
            <input
              value={memberName}
              onChange={(event) => setMemberName(event.target.value)}
              placeholder="Band member name"
              required
            />
            <button type="submit" disabled={!canSubmit}>
              + Add band member
            </button>
          </form>

          <div className="member-folders">
            {members.map((member) => (
              <article className="member-card" key={member.id}>
                <div className="panel-title-row compact">
                  <h3 className="member-title">{member.name}</h3>
                  <button
                    type="button"
                    className="ghost danger"
                    onClick={() => deleteMember(member.id)}
                  >
                    Delete member
                  </button>
                </div>

                {MEMBER_FOLDERS.map((folder) => {
                  const key = `${member.id}:${folder}`;
                  const songs = songsByMemberAndFolder[key] || [];

                  return (
                    <div className="folder" key={key}>
                      <p className="folder-title">{folder.replaceAll("_", " ")}</p>

                      <div className="stack">
                        {songs.map((song) => (
                          <div className="song-row" key={song.id}>
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

                      <div className="song-row">
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
                        <button type="button" onClick={() => addSongToFolder(member.id, folder)}>
                          Add
                        </button>
                      </div>
                    </div>
                  );
                })}
              </article>
            ))}
            {!members.length && <p className="empty">No members yet.</p>}
          </div>
        </section>

        <section className="panel full">
          <div className="panel-title-row">
            <h2>Song Requests For Rehearsal Approval</h2>
          </div>

          <form className="stack request-form" onSubmit={createSongRequest}>
            <div className="split three">
              <select
                value={requestForm.member_id}
                onChange={(event) =>
                  setRequestForm((prev) => ({ ...prev, member_id: event.target.value }))
                }
                required
              >
                <option value="">Requester</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>

              <select
                value={requestForm.rehearsal_id}
                onChange={(event) =>
                  setRequestForm((prev) => ({ ...prev, rehearsal_id: event.target.value }))
                }
                required
              >
                <option value="">Upcoming rehearsal</option>
                {rehearsals.map((rehearsal) => (
                  <option key={rehearsal.id} value={rehearsal.id}>
                    {rehearsal.title}
                  </option>
                ))}
              </select>

              <input
                value={requestForm.song_title}
                onChange={(event) =>
                  setRequestForm((prev) => ({ ...prev, song_title: event.target.value }))
                }
                placeholder="Song title request"
                required
              />
            </div>

            <div className="split">
              <input
                value={requestForm.notes}
                onChange={(event) =>
                  setRequestForm((prev) => ({ ...prev, notes: event.target.value }))
                }
                placeholder="Notes (optional)"
              />
              <button type="submit" disabled={!canSubmit}>
                Request for rehearsal
              </button>
            </div>
          </form>

          <ul>
            {requests.map((request) => {
              const requester = members.find((member) => member.id === request.member_id);
              const rehearsal = rehearsals.find((item) => item.id === request.rehearsal_id);
              const approvals = approvalsByRequest[request.id] || [];
              const approvedCount = approvals.filter((item) => item.decision === "approved").length;

              return (
                <li key={request.id}>
                  <div>
                    <p className="item-title">
                      {request.song_title} for {rehearsal?.title || "unknown rehearsal"}
                    </p>
                    <p className="item-date">
                      Requested by {requester?.name || "unknown member"}
                      {request.notes ? ` · ${request.notes}` : ""}
                      {` · approvals ${approvedCount}/2`}
                    </p>
                  </div>

                  <div className="decision-group">
                    <select
                      value={approverByRequest[request.id] || ""}
                      onChange={(event) =>
                        setApproverByRequest((prev) => ({
                          ...prev,
                          [request.id]: event.target.value
                        }))
                      }
                    >
                      <option value="">Approver</option>
                      {members
                        .filter((member) => member.id !== request.member_id)
                        .map((member) => (
                          <option key={member.id} value={member.id}>
                            {member.name}
                          </option>
                        ))}
                    </select>
                    <button type="button" onClick={() => decideRequest(request, "approved")}>
                      Approve
                    </button>
                    <button
                      type="button"
                      className="ghost"
                      onClick={() => decideRequest(request, "rejected")}
                    >
                      Reject
                    </button>
                    <button
                      type="button"
                      className="ghost danger"
                      onClick={() => deleteSongRequest(request.id)}
                    >
                      Delete
                    </button>
                    <span className={`status-pill ${request.status}`}>{request.status}</span>
                  </div>
                </li>
              );
            })}
            {!requests.length && (
              <li className="empty">No requests yet. Create one to start approvals.</li>
            )}
          </ul>
        </section>
      </main>
    </div>
  );
}