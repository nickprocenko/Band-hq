import { useEffect, useMemo, useState } from "react";
import { isSupabaseConfigured, supabase } from "./lib/supabaseClient";

const REHEARSAL_STATUSES = ["planned", "draft", "confirmed", "completed"];
const PERFORMANCE_STATUSES = ["planned", "pending", "confirmed", "completed"];
const OTHER_EVENT_STATUSES = ["planned", "confirmed", "completed", "cancelled"];
const OTHER_EVENT_TYPES = ["meeting", "recording", "shoot", "travel", "other"];
const EVENT_TYPES = ["rehearsal", "performance", "other"];
const MEMBER_FOLDERS = ["covers", "originals", "songs_im_learning"];

const initialRehearsalForm = {
  title: "",
  rehearsal_date: "",
  rehearsal_start_time: "",
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

const initialOtherEventForm = {
  title: "",
  event_date: "",
  event_time: "",
  location: "",
  event_type: "meeting",
  status: "planned",
  drive_url: ""
};

function createSongDraft(song = {}) {
  return {
    song_artist: song.song_artist || "",
    song_title: song.song_title || "",
    song_url: song.song_url || ""
  };
}

function createPerformanceDraft(item = {}) {
  return {
    title: item.title || "",
    performance_date: item.performance_date || "",
    venue: item.venue || "",
    status: item.status || "planned",
    drive_url: item.drive_url || ""
  };
}

function createRehearsalDraft(item = {}) {
  return {
    title: item.title || "",
    rehearsal_date: item.rehearsal_date || "",
    rehearsal_start_time: item.rehearsal_start_time || "",
    location: item.location || "",
    status: item.status || "planned",
    drive_url: item.drive_url || ""
  };
}

function createOtherEventDraft(item = {}) {
  return {
    title: item.title || "",
    event_date: item.event_date || "",
    event_time: item.event_time || "",
    location: item.location || "",
    event_type: item.event_type || "meeting",
    status: item.status || "planned",
    drive_url: item.drive_url || ""
  };
}

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

function formatMonthLabel(value) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric"
  }).format(value);
}

function formatShortDateLabel(value) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric"
  }).format(value);
}

function toIsoDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toEventKey(eventType, eventId) {
  return `${eventType}:${eventId}`;
}

function createSetlistSongDraft(song = {}) {
  return {
    song_artist: song.song_artist || "",
    song_title: song.song_title || ""
  };
}

export default function App() {
  const [activePage, setActivePage] = useState("events");
  const [rehearsals, setRehearsals] = useState([]);
  const [performances, setPerformances] = useState([]);
  const [otherEvents, setOtherEvents] = useState([]);
  const [members, setMembers] = useState([]);
  const [memberSongs, setMemberSongs] = useState([]);
  const [rehearsalSongs, setRehearsalSongs] = useState([]);
  const [eventSetlistSongs, setEventSetlistSongs] = useState([]);
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [memberName, setMemberName] = useState("");
  const [songInputByFolder, setSongInputByFolder] = useState({});
  const [songDraftById, setSongDraftById] = useState({});
  const [rehearsalSongInput, setRehearsalSongInput] = useState({});
  const [eventSetlistInputByKey, setEventSetlistInputByKey] = useState({});
  const [rehearsalForm, setRehearsalForm] = useState(initialRehearsalForm);
  const [performanceForm, setPerformanceForm] = useState(initialPerformanceForm);
  const [otherEventForm, setOtherEventForm] = useState(initialOtherEventForm);
  const [performanceEditById, setPerformanceEditById] = useState({});
  const [rehearsalEditById, setRehearsalEditById] = useState({});
  const [otherEventEditById, setOtherEventEditById] = useState({});
  const [setlistTargetType, setSetlistTargetType] = useState("rehearsal");
  const [setlistTargetId, setSetlistTargetId] = useState("");
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [calendarWeekStart, setCalendarWeekStart] = useState(() => {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    start.setDate(start.getDate() - start.getDay());
    return start;
  });
  const [calendarView, setCalendarView] = useState("month");
  const [calendarFilters, setCalendarFilters] = useState({
    rehearsal: true,
    performance: true,
    other: true
  });
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [noticeMessage, setNoticeMessage] = useState("");
  const [isEditingMemberName, setIsEditingMemberName] = useState(false);
  const [memberEditName, setMemberEditName] = useState("");
  const [eventFormType, setEventFormType] = useState("rehearsal");

  const canSubmit = useMemo(() => isSupabaseConfigured && !loading, [loading]);

  function scrollToEventSection(eventType) {
    if (activePage !== "events") {
      setActivePage("events");
    }
    setTimeout(() => {
      const element = document.getElementById(`event-section-${eventType}`);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 0);
  }

  async function createEvent(event) {
    if (eventFormType === "performance") {
      await createPerformance(event);
      return;
    }
    if (eventFormType === "other") {
      await createOtherEvent(event);
      return;
    }
    await createRehearsal(event);
  }

  const songsByMemberAndFolder = useMemo(() => {
    return memberSongs.reduce((acc, song) => {
      const key = `${song.member_id}:${song.folder}`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(song);
      return acc;
    }, {});
  }, [memberSongs]);

  const songsByRehearsal = useMemo(() => {
    return rehearsalSongs.reduce((acc, song) => {
      if (!acc[song.rehearsal_id]) acc[song.rehearsal_id] = [];
      acc[song.rehearsal_id].push(song);
      return acc;
    }, {});
  }, [rehearsalSongs]);

  const songsByEventSetlist = useMemo(() => {
    return eventSetlistSongs.reduce((acc, song) => {
      const key = toEventKey(song.event_type, song.event_id);
      if (!acc[key]) acc[key] = [];
      acc[key].push(song);
      return acc;
    }, {});
  }, [eventSetlistSongs]);

  const setlistTargetEvents = useMemo(() => {
    if (setlistTargetType === "rehearsal") {
      return rehearsals.map((item) => ({
        id: item.id,
        label: `${item.title}${item.rehearsal_date ? ` (${formatDate(item.rehearsal_date)})` : ""}`
      }));
    }
    if (setlistTargetType === "performance") {
      return performances.map((item) => ({
        id: item.id,
        label: `${item.title}${item.performance_date ? ` (${formatDate(item.performance_date)})` : ""}`
      }));
    }
    return otherEvents.map((item) => ({
      id: item.id,
      label: `${item.title}${item.event_date ? ` (${formatDate(item.event_date)})` : ""}`
    }));
  }, [setlistTargetType, rehearsals, performances, otherEvents]);

  const calendarEvents = useMemo(() => {
    const rehearsalEvents = rehearsals
      .filter((item) => item.rehearsal_date)
      .map((item) => ({
        id: item.id,
        sourceType: "rehearsal",
        type: "Rehearsal",
        title: item.title,
        date: item.rehearsal_date,
        time: item.rehearsal_start_time,
        location: item.location,
        status: item.status
      }));

    const performanceEvents = performances
      .filter((item) => item.performance_date)
      .map((item) => ({
        id: item.id,
        sourceType: "performance",
        type: "Performance",
        title: item.title,
        date: item.performance_date,
        location: item.venue,
        status: item.status
      }));

    const miscEvents = otherEvents
      .filter((item) => item.event_date)
      .map((item) => ({
        id: item.id,
        sourceType: "other",
        type: item.event_type || "other",
        title: item.title,
        date: item.event_date,
        time: item.event_time,
        location: item.location,
        status: item.status
      }));

    return [...rehearsalEvents, ...performanceEvents, ...miscEvents]
      .sort((a, b) => {
        if (a.date === b.date) {
          if ((a.time || "") !== (b.time || "")) {
            return (a.time || "").localeCompare(b.time || "");
          }
          return a.title.localeCompare(b.title);
        }
        return a.date.localeCompare(b.date);
      });
  }, [rehearsals, performances, otherEvents]);

  const filteredCalendarEvents = useMemo(() => {
    return calendarEvents.filter((item) => calendarFilters[item.sourceType]);
  }, [calendarEvents, calendarFilters]);

  const calendarEventsByDate = useMemo(() => {
    return filteredCalendarEvents.reduce((acc, event) => {
      if (!acc[event.date]) {
        acc[event.date] = [];
      }
      acc[event.date].push(event);
      return acc;
    }, {});
  }, [filteredCalendarEvents]);

  const calendarDays = useMemo(() => {
    const monthStart = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1);
    const gridStart = new Date(monthStart);
    gridStart.setDate(monthStart.getDate() - monthStart.getDay());
    const todayIso = toIsoDate(new Date());

    return Array.from({ length: 42 }, (_, index) => {
      const current = new Date(gridStart);
      current.setDate(gridStart.getDate() + index);
      const iso = toIsoDate(current);
      return {
        iso,
        label: current.getDate(),
        isCurrentMonth: current.getMonth() === calendarMonth.getMonth(),
        isToday: iso === todayIso,
        events: calendarEventsByDate[iso] || []
      };
    });
  }, [calendarMonth, calendarEventsByDate]);

  const calendarWeekDays = useMemo(() => {
    const todayIso = toIsoDate(new Date());
    return Array.from({ length: 7 }, (_, index) => {
      const current = new Date(calendarWeekStart);
      current.setDate(calendarWeekStart.getDate() + index);
      const iso = toIsoDate(current);
      return {
        iso,
        label: current.getDate(),
        weekday: new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(current),
        isToday: iso === todayIso,
        events: calendarEventsByDate[iso] || []
      };
    });
  }, [calendarWeekStart, calendarEventsByDate]);

  const monthLabel = useMemo(() => formatMonthLabel(calendarMonth), [calendarMonth]);

  const monthEventCount = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    return filteredCalendarEvents.filter((event) => {
      const eventDate = new Date(`${event.date}T00:00:00`);
      return eventDate.getFullYear() === year && eventDate.getMonth() === month;
    }).length;
  }, [calendarMonth, filteredCalendarEvents]);

  const weekLabel = useMemo(() => {
    const start = new Date(calendarWeekStart);
    const end = new Date(calendarWeekStart);
    end.setDate(end.getDate() + 6);
    return `${formatShortDateLabel(start)} - ${formatShortDateLabel(end)}`;
  }, [calendarWeekStart]);

  const weekEventCount = useMemo(() => {
    const start = new Date(calendarWeekStart);
    const end = new Date(calendarWeekStart);
    end.setDate(end.getDate() + 6);
    return filteredCalendarEvents.filter((event) => {
      const eventDate = new Date(`${event.date}T00:00:00`);
      return eventDate >= start && eventDate <= end;
    }).length;
  }, [calendarWeekStart, filteredCalendarEvents]);

  const selectedMember = useMemo(
    () => members.find((member) => member.id === selectedMemberId) || null,
    [members, selectedMemberId]
  );
  const isEventPage = activePage === "events";

  useEffect(() => {
    setIsEditingMemberName(false);
    setMemberEditName("");
  }, [selectedMemberId]);

  useEffect(() => {
    if (!setlistTargetEvents.length) {
      setSetlistTargetId("");
      return;
    }
    if (!setlistTargetEvents.some((item) => item.id === setlistTargetId)) {
      setSetlistTargetId(setlistTargetEvents[0].id);
    }
  }, [setlistTargetEvents, setlistTargetId]);

  async function loadData() {
    if (!isSupabaseConfigured) {
      return;
    }

    setLoading(true);
    setErrorMessage("");

    const [
      rehearsalsResponse,
      performancesResponse,
      otherEventsResponse,
      membersResponse,
      memberSongsResponse,
      rehearsalSongsResponse,
      eventSetlistSongsResponse
    ] = await Promise.all([
      supabase
        .from("rehearsals")
        .select("id, title, rehearsal_date, rehearsal_start_time, location, status, drive_url")
        .order("rehearsal_date", { ascending: true, nullsFirst: false }),
      supabase
        .from("performances")
        .select("id, title, performance_date, venue, status, drive_url")
        .order("performance_date", { ascending: true, nullsFirst: false }),
      supabase
        .from("other_events")
        .select("id, title, event_date, event_time, location, event_type, status, drive_url")
        .order("event_date", { ascending: true, nullsFirst: false }),
      supabase
        .from("band_members")
        .select("id, name, created_at")
        .order("name", { ascending: true }),
      supabase
        .from("member_song_lists")
        .select("id, member_id, folder, song_artist, song_title, song_url, created_at")
        .order("created_at", { ascending: true }),
      supabase
        .from("rehearsal_songs")
        .select("id, rehearsal_id, song_artist, song_title, created_at")
        .order("created_at", { ascending: true }),
      supabase
        .from("event_setlist_songs")
        .select("id, event_type, event_id, song_artist, song_title, source_member_song_id, created_at")
        .order("created_at", { ascending: true })
    ]);

    if (
      rehearsalsResponse.error ||
      performancesResponse.error ||
      otherEventsResponse.error ||
      membersResponse.error ||
      memberSongsResponse.error ||
      rehearsalSongsResponse.error ||
      eventSetlistSongsResponse.error
    ) {
      setErrorMessage(
        rehearsalsResponse.error?.message ||
          performancesResponse.error?.message ||
          otherEventsResponse.error?.message ||
          membersResponse.error?.message ||
          memberSongsResponse.error?.message ||
          rehearsalSongsResponse.error?.message ||
            eventSetlistSongsResponse.error?.message ||
          "Could not load data."
      );
      setLoading(false);
      return;
    }

    setRehearsals(rehearsalsResponse.data || []);
    setPerformances(performancesResponse.data || []);
    setOtherEvents(otherEventsResponse.data || []);
    setMembers(membersResponse.data || []);
    setMemberSongs(memberSongsResponse.data || []);
    setRehearsalSongs(rehearsalSongsResponse.data || []);
    setEventSetlistSongs(eventSetlistSongsResponse.data || []);

    // Don't auto-select members
    if (
      selectedMemberId &&
      !(membersResponse.data || []).some((member) => member.id === selectedMemberId)
    ) {
      setSelectedMemberId("");
    }

    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!noticeMessage) {
      return;
    }
    const timeoutId = window.setTimeout(() => {
      setNoticeMessage("");
    }, 2000);
    return () => window.clearTimeout(timeoutId);
  }, [noticeMessage]);

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

  async function updateMemberName(memberId) {
    const trimmedName = memberEditName.trim();
    if (!trimmedName) {
      return;
    }

    const { error } = await supabase
      .from("band_members")
      .update({ name: trimmedName })
      .eq("id", memberId);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setIsEditingMemberName(false);
    setMemberEditName("");
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

  async function createOtherEvent(event) {
    event.preventDefault();
    if (!canSubmit || !otherEventForm.title.trim()) {
      return;
    }

    setLoading(true);
    setErrorMessage("");

    const { error } = await supabase.from("other_events").insert([
      {
        title: otherEventForm.title.trim(),
        event_date: otherEventForm.event_date || null,
        event_time: otherEventForm.event_time || null,
        location: otherEventForm.location.trim() || null,
        event_type: otherEventForm.event_type,
        status: otherEventForm.status,
        drive_url: otherEventForm.drive_url.trim() || null
      }
    ]);

    if (error) {
      setErrorMessage(error.message);
      setLoading(false);
      return;
    }

    setOtherEventForm(initialOtherEventForm);
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

  async function deletePerformance(performanceId) {
    const { error } = await supabase.from("performances").delete().eq("id", performanceId);
    if (error) {
      setErrorMessage(error.message);
      return;
    }
    await loadData();
  }

  async function deleteOtherEvent(eventId) {
    const { error } = await supabase.from("other_events").delete().eq("id", eventId);
    if (error) {
      setErrorMessage(error.message);
      return;
    }
    await loadData();
  }

  async function savePerformanceEdit(performanceId) {
    const draft = performanceEditById[performanceId];
    if (!draft || !draft.title.trim()) {
      return;
    }

    const { error } = await supabase
      .from("performances")
      .update({
        title: draft.title.trim(),
        performance_date: draft.performance_date || null,
        venue: draft.venue.trim() || null,
        status: draft.status,
        drive_url: draft.drive_url.trim() || null
      })
      .eq("id", performanceId);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setPerformanceEditById((prev) => {
      const next = { ...prev };
      delete next[performanceId];
      return next;
    });
    await loadData();
  }

  async function saveRehearsalEdit(rehearsalId) {
    const draft = rehearsalEditById[rehearsalId];
    if (!draft || !draft.title.trim()) {
      return;
    }

    const { error } = await supabase
      .from("rehearsals")
      .update({
        title: draft.title.trim(),
        rehearsal_date: draft.rehearsal_date || null,
        rehearsal_start_time: draft.rehearsal_start_time || null,
        location: draft.location.trim() || null,
        status: draft.status,
        drive_url: draft.drive_url.trim() || null
      })
      .eq("id", rehearsalId);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setRehearsalEditById((prev) => {
      const next = { ...prev };
      delete next[rehearsalId];
      return next;
    });
    await loadData();
  }

  async function saveOtherEventEdit(eventId) {
    const draft = otherEventEditById[eventId];
    if (!draft || !draft.title.trim()) {
      return;
    }

    const { error } = await supabase
      .from("other_events")
      .update({
        title: draft.title.trim(),
        event_date: draft.event_date || null,
        event_time: draft.event_time || null,
        location: draft.location.trim() || null,
        event_type: draft.event_type,
        status: draft.status,
        drive_url: draft.drive_url.trim() || null
      })
      .eq("id", eventId);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setOtherEventEditById((prev) => {
      const next = { ...prev };
      delete next[eventId];
      return next;
    });
    await loadData();
  }

  async function addSongToEventSetlist(eventType, eventId, song) {
    const songArtist = (song.song_artist || "").trim();
    const songTitle = (song.song_title || "").trim();
    if (!canSubmit || !songTitle || !eventId) {
      return;
    }

    if (eventType === "rehearsal") {
      const { error } = await supabase.from("rehearsal_songs").insert([
        { rehearsal_id: eventId, song_artist: songArtist || null, song_title: songTitle }
      ]);
      if (error) {
        setErrorMessage(error.message);
        return;
      }
      await loadData();
      setNoticeMessage("Song added to rehearsal set list.");
      return;
    }

    const { error } = await supabase.from("event_setlist_songs").insert([
      {
        event_type: eventType,
        event_id: eventId,
        song_artist: songArtist || null,
        song_title: songTitle,
        source_member_song_id: song.id || null
      }
    ]);

    if (error) {
      setErrorMessage(error.message);
      return;
    }
    await loadData();
    setNoticeMessage("Song added to event set list.");
  }

  async function addEventSetlistSongFromInput(eventType, eventId) {
    const key = toEventKey(eventType, eventId);
    const draft = eventSetlistInputByKey[key] || createSetlistSongDraft();
    await addSongToEventSetlist(eventType, eventId, draft);
    setEventSetlistInputByKey((prev) => ({ ...prev, [key]: createSetlistSongDraft() }));
  }

  async function removeEventSetlistSong(songId) {
    const { error } = await supabase.from("event_setlist_songs").delete().eq("id", songId);
    if (error) {
      setErrorMessage(error.message);
      return;
    }
    await loadData();
  }

  async function addMemberSongToTargetSetlist(song) {
    if (!setlistTargetId) {
      return;
    }
    await addSongToEventSetlist(setlistTargetType, setlistTargetId, song);
  }

  function handleAutoSaveBlur(event, isEditing, onSave) {
    if (!isEditing) {
      return;
    }
    if (event.relatedTarget && event.currentTarget.contains(event.relatedTarget)) {
      return;
    }
    onSave();
  }

  async function addSongToFolder(memberId, folder) {
    const key = `${memberId}:${folder}`;
    const draft = songInputByFolder[key] || createSongDraft();
    const songArtist = draft.song_artist?.trim();
    const songTitle = draft.song_title?.trim();
    const songUrl = draft.song_url?.trim();
    if (!canSubmit || !songTitle) {
      return;
    }

    const { error } = await supabase.from("member_song_lists").insert([
      {
        member_id: memberId,
        folder,
        song_artist: folder === "originals" ? null : songArtist || null,
        song_title: songTitle,
        song_url: songUrl || null
      }
    ]);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setSongInputByFolder((prev) => ({ ...prev, [key]: createSongDraft() }));
    await loadData();
  }

  async function saveSongEdit(songId) {
    const draft = songDraftById[songId] || createSongDraft();
    const songRecord = memberSongs.find((item) => item.id === songId);
    const folder = songRecord?.folder;
    const songArtist = draft.song_artist?.trim();
    const songTitle = draft.song_title?.trim();
    const songUrl = draft.song_url?.trim();
    if (!songTitle) {
      return;
    }

    const { error } = await supabase
      .from("member_song_lists")
      .update({
        song_artist: folder === "originals" ? null : songArtist || null,
        song_title: songTitle,
        song_url: songUrl || null
      })
      .eq("id", songId);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setSongDraftById((prev) => {
      const next = { ...prev };
      delete next[songId];
      return next;
    });

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

  async function updateOtherEventStatus(id, status) {
    if (!isSupabaseConfigured) {
      return;
    }

    const { error } = await supabase
      .from("other_events")
      .update({ status })
      .eq("id", id);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setOtherEvents((current) =>
      current.map((item) => (item.id === id ? { ...item, status } : item))
    );
  }

  async function addRehearsalSong(rehearsalId) {
    const entry = rehearsalSongInput[rehearsalId] || {};
    const title = (entry.song_title || "").trim();
    const artist = (entry.song_artist || "").trim();
    if (!canSubmit || !title) return;

    const { error } = await supabase.from("rehearsal_songs").insert([
      { rehearsal_id: rehearsalId, song_artist: artist || null, song_title: title }
    ]);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setRehearsalSongInput((prev) => ({ ...prev, [rehearsalId]: {} }));
    await loadData();
  }

  async function removeRehearsalSong(songId) {
    const { error } = await supabase.from("rehearsal_songs").delete().eq("id", songId);
    if (error) {
      setErrorMessage(error.message);
      return;
    }
    await loadData();
  }

  return (
    <div className="page">
      <header className="hero">
        <p className="eyebrow">Band Operations Console</p>
        <h1>Band HQ</h1>
        <p className="subhead">
          Compact file-style pages for rehearsals, performances, members, and other events.
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

      {noticeMessage && (
        <section className="callout warning">
          <h3>Saved</h3>
          <p>{noticeMessage}</p>
        </section>
      )}

      <main className="workspace">
        <aside className="sidebar panel">
          <p className="sidebar-label">Pages</p>
          <button
            type="button"
            className={`nav-item ${isEventPage ? "active" : ""}`}
            onClick={() => setActivePage("events")}
          >
            Events
          </button>
          <button
            type="button"
            className={`nav-item ${activePage === "members" ? "active" : ""}`}
            onClick={() => setActivePage("members")}
          >
            Members
          </button>
          <button
            type="button"
            className={`nav-item ${activePage === "calendar" ? "active" : ""}`}
            onClick={() => setActivePage("calendar")}
          >
            Calendar
          </button>

          {isEventPage && (
            <div className="tree-list">
              <p className="sidebar-label">Event categories</p>
              <button
                type="button"
                className="tree-item"
                onClick={() => scrollToEventSection("performances")}
              >
                Performances
              </button>
              <button
                type="button"
                className="tree-item"
                onClick={() => scrollToEventSection("rehearsals")}
              >
                Rehearsals
              </button>
              <button
                type="button"
                className="tree-item"
                onClick={() => scrollToEventSection("otherEvents")}
              >
                Other events
              </button>
            </div>
          )}

          {activePage === "members" && (
            <div className="tree-list">
              <p className="sidebar-label">Member folders</p>
              <form className="stack form-card" onSubmit={createMember}>
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
          {activePage === "events" && (
            <>
              <div className="panel-title-row">
                <h2>Events</h2>
                <span className="tiny-label">{performances.length + rehearsals.length + otherEvents.length} items</span>
              </div>

              <form className="stack form-card" onSubmit={createEvent}>
                <div className="split">
                  <select
                    value={eventFormType}
                    onChange={(event) => setEventFormType(event.target.value)}
                  >
                    <option value="rehearsal">Rehearsal</option>
                    <option value="performance">Performance</option>
                    <option value="other">Other event</option>
                  </select>
                  <input
                    value={
                      eventFormType === "performance"
                        ? performanceForm.title
                        : eventFormType === "other"
                          ? otherEventForm.title
                          : rehearsalForm.title
                    }
                    onChange={(event) => {
                      if (eventFormType === "performance") {
                        setPerformanceForm((prev) => ({ ...prev, title: event.target.value }));
                        return;
                      }
                      if (eventFormType === "other") {
                        setOtherEventForm((prev) => ({ ...prev, title: event.target.value }));
                        return;
                      }
                      setRehearsalForm((prev) => ({ ...prev, title: event.target.value }));
                    }}
                    placeholder="Event title"
                    required
                  />
                </div>

                {eventFormType === "performance" ? (
                  <>
                    <div className="split three">
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
                    </div>
                    <input
                      value={performanceForm.drive_url}
                      onChange={(event) =>
                        setPerformanceForm((prev) => ({ ...prev, drive_url: event.target.value }))
                      }
                      placeholder="Google Drive URL"
                      type="url"
                    />
                  </>
                ) : eventFormType === "other" ? (
                  <>
                    <div className="split three">
                      <input
                        type="date"
                        value={otherEventForm.event_date}
                        onChange={(event) =>
                          setOtherEventForm((prev) => ({ ...prev, event_date: event.target.value }))
                        }
                      />
                      <input
                        type="time"
                        value={otherEventForm.event_time}
                        onChange={(event) =>
                          setOtherEventForm((prev) => ({ ...prev, event_time: event.target.value }))
                        }
                      />
                      <input
                        value={otherEventForm.location}
                        onChange={(event) =>
                          setOtherEventForm((prev) => ({ ...prev, location: event.target.value }))
                        }
                        placeholder="Location"
                      />
                    </div>
                    <div className="split three">
                      <select
                        value={otherEventForm.event_type}
                        onChange={(event) =>
                          setOtherEventForm((prev) => ({ ...prev, event_type: event.target.value }))
                        }
                      >
                        {OTHER_EVENT_TYPES.map((eventType) => (
                          <option key={eventType} value={eventType}>
                            {eventType}
                          </option>
                        ))}
                      </select>
                      <select
                        value={otherEventForm.status}
                        onChange={(event) =>
                          setOtherEventForm((prev) => ({ ...prev, status: event.target.value }))
                        }
                      >
                        {OTHER_EVENT_STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                      <input
                        value={otherEventForm.drive_url}
                        onChange={(event) =>
                          setOtherEventForm((prev) => ({ ...prev, drive_url: event.target.value }))
                        }
                        placeholder="Google Drive URL"
                        type="url"
                      />
                    </div>
                  </>
                ) : (
                  <>
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
                  </>
                )}

                <button type="submit" disabled={!canSubmit}>
                  + Add event
                </button>
              </form>
            </>
          )}

          {(activePage === "performances" || activePage === "events") && (
            <>
              <div className="panel-title-row">
                <h2>Performances</h2>
                <span className="tiny-label">{performances.length} items</span>
              </div>

              {activePage === "performances" && (
                <form className="stack form-card" onSubmit={createPerformance}>
                <input
                  value={performanceForm.title}
                  onChange={(event) =>
                    setPerformanceForm((prev) => ({ ...prev, title: event.target.value }))
                  }
                  placeholder="Performance title"
                  required
                />
                <div className="split three">
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
                </div>
                <input
                  value={performanceForm.drive_url}
                  onChange={(event) =>
                    setPerformanceForm((prev) => ({ ...prev, drive_url: event.target.value }))
                  }
                  placeholder="Google Drive URL"
                  type="url"
                />
                <button type="submit" disabled={!canSubmit}>
                  + Add performance
                </button>
                </form>
              )}

              <details id="event-section-performances" className="folder folder-collapsible event-list-section">
                <summary className="folder-summary">
                  <span>Performance list</span>
                  <span className="tiny-label">{performances.length} items</span>
                </summary>
                <div className="folder-body">
                  <div className="file-list">
                    {performances.map((item) => (
                      <article
                        className="file-row"
                        key={item.id}
                        onBlur={(event) =>
                          handleAutoSaveBlur(event, Boolean(performanceEditById[item.id]), () =>
                            savePerformanceEdit(item.id)
                          )
                        }
                      >
                        <div className="file-main">
                          {performanceEditById[item.id] ? (
                            <div className="stack">
                              <input
                                value={performanceEditById[item.id].title}
                                onChange={(event) =>
                                  setPerformanceEditById((prev) => ({
                                    ...prev,
                                    [item.id]: {
                                      ...prev[item.id],
                                      title: event.target.value
                                    }
                                  }))
                                }
                                placeholder="Performance title"
                              />
                              <div className="split three">
                                <input
                                  type="date"
                                  value={performanceEditById[item.id].performance_date}
                                  onChange={(event) =>
                                    setPerformanceEditById((prev) => ({
                                      ...prev,
                                      [item.id]: {
                                        ...prev[item.id],
                                        performance_date: event.target.value
                                      }
                                    }))
                                  }
                                />
                                <input
                                  value={performanceEditById[item.id].venue}
                                  onChange={(event) =>
                                    setPerformanceEditById((prev) => ({
                                      ...prev,
                                      [item.id]: {
                                        ...prev[item.id],
                                        venue: event.target.value
                                      }
                                    }))
                                  }
                                  placeholder="Venue"
                                />
                                <select
                                  value={performanceEditById[item.id].status}
                                  onChange={(event) =>
                                    setPerformanceEditById((prev) => ({
                                      ...prev,
                                      [item.id]: {
                                        ...prev[item.id],
                                        status: event.target.value
                                      }
                                    }))
                                  }
                                >
                                  {PERFORMANCE_STATUSES.map((status) => (
                                    <option key={status} value={status}>
                                      {status}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <input
                                value={performanceEditById[item.id].drive_url}
                                onChange={(event) =>
                                  setPerformanceEditById((prev) => ({
                                    ...prev,
                                    [item.id]: {
                                      ...prev[item.id],
                                      drive_url: event.target.value
                                    }
                                  }))
                                }
                                placeholder="Google Drive URL"
                                type="url"
                              />
                            </div>
                          ) : (
                            <>
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
                            </>
                          )}
                        </div>
                        <div className="file-actions">
                          {performanceEditById[item.id] ? (
                            <>
                              <button type="button" onClick={() => savePerformanceEdit(item.id)}>
                                Save
                              </button>
                              <button
                                type="button"
                                className="ghost"
                                onClick={() =>
                                  setPerformanceEditById((prev) => {
                                    const next = { ...prev };
                                    delete next[item.id];
                                    return next;
                                  })
                                }
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <>
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
                              <button
                                type="button"
                                className="ghost"
                                onClick={() =>
                                  setPerformanceEditById((prev) => ({
                                    ...prev,
                                    [item.id]: createPerformanceDraft(item)
                                  }))
                                }
                              >
                                Edit
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            className="ghost danger"
                            onClick={() => deletePerformance(item.id)}
                          >
                            Delete
                          </button>
                        </div>

                        <details className="folder folder-collapsible set-list" key={`performance-setlist-${item.id}`}>
                          <summary className="folder-summary">
                            <span>Set list</span>
                            <span className="tiny-label">
                              {(songsByEventSetlist[toEventKey("performance", item.id)] || []).length} songs
                            </span>
                          </summary>
                          <div className="folder-body">
                            <div className="song-grid">
                              {(songsByEventSetlist[toEventKey("performance", item.id)] || []).map((song) => (
                                <div className="song-row compact-song-row" key={song.id}>
                                  <span className="song-label">
                                    {song.song_artist ? `${song.song_artist} - ${song.song_title}` : song.song_title}
                                  </span>
                                  <button
                                    type="button"
                                    className="ghost"
                                    onClick={() => removeEventSetlistSong(song.id)}
                                  >
                                    Remove
                                  </button>
                                </div>
                              ))}
                            </div>
                            <div className="song-row compact-song-row add-row">
                              <div className="song-fields">
                                <input
                                  value={(eventSetlistInputByKey[toEventKey("performance", item.id)] || {}).song_artist || ""}
                                  onChange={(event) =>
                                    setEventSetlistInputByKey((prev) => ({
                                      ...prev,
                                      [toEventKey("performance", item.id)]: {
                                        ...(prev[toEventKey("performance", item.id)] || createSetlistSongDraft()),
                                        song_artist: event.target.value
                                      }
                                    }))
                                  }
                                  placeholder="Artist"
                                />
                                <input
                                  value={(eventSetlistInputByKey[toEventKey("performance", item.id)] || {}).song_title || ""}
                                  onChange={(event) =>
                                    setEventSetlistInputByKey((prev) => ({
                                      ...prev,
                                      [toEventKey("performance", item.id)]: {
                                        ...(prev[toEventKey("performance", item.id)] || createSetlistSongDraft()),
                                        song_title: event.target.value
                                      }
                                    }))
                                  }
                                  placeholder="Song title"
                                />
                              </div>
                              <button type="button" onClick={() => addEventSetlistSongFromInput("performance", item.id)}>
                                Add
                              </button>
                            </div>
                          </div>
                        </details>
                      </article>
                    ))}
                    {!performances.length && <p className="empty">No performances yet.</p>}
                  </div>
                </div>
              </details>
            </>
          )}

          {(activePage === "rehearsals" || activePage === "events") && (
            <>
              <div className="panel-title-row">
                <h2>Rehearsals</h2>
                <span className="tiny-label">{rehearsals.length} items</span>
              </div>

              {activePage === "rehearsals" && (
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
              )}

              <details id="event-section-rehearsals" className="folder folder-collapsible event-list-section">
                <summary className="folder-summary">
                  <span>Rehearsal list</span>
                  <span className="tiny-label">{rehearsals.length} items</span>
                </summary>
                <div className="folder-body">
                  <div className="file-list">
                    {rehearsals.map((item) => (
                      <article
                        className="file-row"
                        key={item.id}
                        onBlur={(event) =>
                          handleAutoSaveBlur(event, Boolean(rehearsalEditById[item.id]), () =>
                            saveRehearsalEdit(item.id)
                          )
                        }
                      >
                        <div className="file-main">
                          {rehearsalEditById[item.id] ? (
                            <div className="stack">
                              <input
                                value={rehearsalEditById[item.id].title}
                                onChange={(event) =>
                                  setRehearsalEditById((prev) => ({
                                    ...prev,
                                    [item.id]: {
                                      ...prev[item.id],
                                      title: event.target.value
                                    }
                                  }))
                                }
                                placeholder="Rehearsal title"
                              />
                              <div className="split three">
                                <input
                                  type="date"
                                  value={rehearsalEditById[item.id].rehearsal_date}
                                  onChange={(event) =>
                                    setRehearsalEditById((prev) => ({
                                      ...prev,
                                      [item.id]: {
                                        ...prev[item.id],
                                        rehearsal_date: event.target.value
                                      }
                                    }))
                                  }
                                />
                                <input
                                  type="time"
                                  value={rehearsalEditById[item.id].rehearsal_start_time}
                                  onChange={(event) =>
                                    setRehearsalEditById((prev) => ({
                                      ...prev,
                                      [item.id]: {
                                        ...prev[item.id],
                                        rehearsal_start_time: event.target.value
                                      }
                                    }))
                                  }
                                />
                                <input
                                  value={rehearsalEditById[item.id].location}
                                  onChange={(event) =>
                                    setRehearsalEditById((prev) => ({
                                      ...prev,
                                      [item.id]: {
                                        ...prev[item.id],
                                        location: event.target.value
                                      }
                                    }))
                                  }
                                  placeholder="Location"
                                />
                              </div>
                              <div className="split">
                                <select
                                  value={rehearsalEditById[item.id].status}
                                  onChange={(event) =>
                                    setRehearsalEditById((prev) => ({
                                      ...prev,
                                      [item.id]: {
                                        ...prev[item.id],
                                        status: event.target.value
                                      }
                                    }))
                                  }
                                >
                                  {REHEARSAL_STATUSES.map((status) => (
                                    <option key={status} value={status}>
                                      {status}
                                    </option>
                                  ))}
                                </select>
                                <input
                                  value={rehearsalEditById[item.id].drive_url}
                                  onChange={(event) =>
                                    setRehearsalEditById((prev) => ({
                                      ...prev,
                                      [item.id]: {
                                        ...prev[item.id],
                                        drive_url: event.target.value
                                      }
                                    }))
                                  }
                                  placeholder="Google Drive URL"
                                  type="url"
                                />
                              </div>
                            </div>
                          ) : (
                            <>
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
                            </>
                          )}

                          <details className="folder folder-collapsible set-list" key={item.id}>
                            <summary className="folder-summary">
                              <span>Set list</span>
                              <span className="tiny-label">
                                {(songsByRehearsal[item.id] || []).length} songs
                              </span>
                            </summary>
                            <div className="folder-body">
                              <div className="song-grid">
                                {(songsByRehearsal[item.id] || []).map((song) => (
                                  <div className="song-row compact-song-row" key={song.id}>
                                    <span className="song-label">
                                      {song.song_artist ? `${song.song_artist} – ${song.song_title}` : song.song_title}
                                    </span>
                                    <button
                                      type="button"
                                      className="ghost"
                                      onClick={() => removeRehearsalSong(song.id)}
                                    >
                                      Remove
                                    </button>
                                  </div>
                                ))}
                              </div>
                              <div className="song-row compact-song-row add-row">
                                <div className="song-fields">
                                  <input
                                    value={(rehearsalSongInput[item.id] || {}).song_artist || ""}
                                    onChange={(event) =>
                                      setRehearsalSongInput((prev) => ({
                                        ...prev,
                                        [item.id]: { ...(prev[item.id] || {}), song_artist: event.target.value }
                                      }))
                                    }
                                    placeholder="Artist"
                                  />
                                  <input
                                    value={(rehearsalSongInput[item.id] || {}).song_title || ""}
                                    onChange={(event) =>
                                      setRehearsalSongInput((prev) => ({
                                        ...prev,
                                        [item.id]: { ...(prev[item.id] || {}), song_title: event.target.value }
                                      }))
                                    }
                                    placeholder="Song title"
                                    onKeyDown={(event) => {
                                      if (event.key === "Enter") {
                                        event.preventDefault();
                                        addRehearsalSong(item.id);
                                      }
                                    }}
                                  />
                                </div>
                                <button type="button" onClick={() => addRehearsalSong(item.id)}>
                                  Add
                                </button>
                              </div>
                            </div>
                          </details>
                        </div>
                        <div className="file-actions">
                          {rehearsalEditById[item.id] ? (
                            <>
                              <button type="button" onClick={() => saveRehearsalEdit(item.id)}>
                                Save
                              </button>
                              <button
                                type="button"
                                className="ghost"
                                onClick={() =>
                                  setRehearsalEditById((prev) => {
                                    const next = { ...prev };
                                    delete next[item.id];
                                    return next;
                                  })
                                }
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <>
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
                                className="ghost"
                                onClick={() =>
                                  setRehearsalEditById((prev) => ({
                                    ...prev,
                                    [item.id]: createRehearsalDraft(item)
                                  }))
                                }
                              >
                                Edit
                              </button>
                            </>
                          )}
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
                </div>
              </details>
            </>
          )}

          {activePage === "members" && (
            <>
              <div className="panel-title-row">
                <h2>Members</h2>
                <span className="tiny-label">{members.length} items</span>
              </div>

              {selectedMember ? (
                <article className="member-detail">
                  <div className="panel-title-row compact">
                    <div>
                      {isEditingMemberName ? (
                        <input
                          value={memberEditName}
                          onChange={(event) => setMemberEditName(event.target.value)}
                          placeholder="Member name"
                          autoFocus
                        />
                      ) : (
                        <h3 className="member-title">{selectedMember.name}</h3>
                      )}
                      <p className="item-date">Folder view</p>
                    </div>
                    <div className="file-actions">
                      {isEditingMemberName ? (
                        <>
                          <button
                            type="button"
                            onClick={() => updateMemberName(selectedMember.id)}
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            className="ghost"
                            onClick={() => {
                              setIsEditingMemberName(false);
                              setMemberEditName("");
                            }}
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          className="ghost"
                          onClick={() => {
                            setIsEditingMemberName(true);
                            setMemberEditName(selectedMember.name);
                          }}
                        >
                          Edit name
                        </button>
                      )}
                      <button
                        type="button"
                        className="ghost danger"
                        onClick={() => deleteMember(selectedMember.id)}
                      >
                        Delete member
                      </button>
                    </div>
                  </div>

                  {MEMBER_FOLDERS.map((folder) => {
                    const key = `${selectedMember.id}:${folder}`;
                    const songs = songsByMemberAndFolder[key] || [];
                    const coverGroups =
                      folder === "covers"
                        ? songs.reduce((acc, song) => {
                            const artistKey = (song.song_artist || "Unknown artist").trim() || "Unknown artist";
                            if (!acc[artistKey]) acc[artistKey] = [];
                            acc[artistKey].push(song);
                            return acc;
                          }, {})
                        : {};

                    return (
                      <details className="folder folder-collapsible" key={key}>
                        <summary className="folder-summary">
                          <span>{folder.replaceAll("_", " ")}</span>
                          <span className="tiny-label">{songs.length} songs</span>
                        </summary>

                        <div className="folder-body">
                          {folder === "covers" ? (
                            <div className="song-grid">
                              {Object.entries(coverGroups).map(([artistName, artistSongs]) => (
                                <details className="folder folder-collapsible" key={`${key}:${artistName}`}>
                                  <summary className="folder-summary">
                                    <span>{artistName}</span>
                                    <span className="tiny-label">{artistSongs.length} songs</span>
                                  </summary>
                                  <div className="folder-body">
                                    <div className="song-grid">
                                      {artistSongs.map((song) => (
                                        <div className="song-row compact-song-row" key={song.id}>
                                          <div className="song-fields">
                                            {songDraftById[song.id] ? (
                                              <>
                                                <input
                                                  value={songDraftById[song.id].song_artist}
                                                  onChange={(event) =>
                                                    setSongDraftById((prev) => ({
                                                      ...prev,
                                                      [song.id]: {
                                                        ...prev[song.id],
                                                        song_artist: event.target.value
                                                      }
                                                    }))
                                                  }
                                                  placeholder="Artist"
                                                />
                                                <input
                                                  value={songDraftById[song.id].song_title}
                                                  onChange={(event) =>
                                                    setSongDraftById((prev) => ({
                                                      ...prev,
                                                      [song.id]: {
                                                        ...prev[song.id],
                                                        song_title: event.target.value
                                                      }
                                                    }))
                                                  }
                                                  placeholder="Song title"
                                                />
                                                <input
                                                  value={songDraftById[song.id].song_url}
                                                  onChange={(event) =>
                                                    setSongDraftById((prev) => ({
                                                      ...prev,
                                                      [song.id]: {
                                                        ...prev[song.id],
                                                        song_url: event.target.value
                                                      }
                                                    }))
                                                  }
                                                  placeholder="Song URL"
                                                  type="url"
                                                />
                                              </>
                                            ) : (
                                              <>
                                                <span className="song-label">
                                                  {song.song_artist ? `${song.song_artist} - ${song.song_title}` : song.song_title}
                                                </span>
                                                {song.song_url && (
                                                  <a href={song.song_url} target="_blank" rel="noreferrer">
                                                    Open link
                                                  </a>
                                                )}
                                              </>
                                            )}
                                          </div>
                                          {songDraftById[song.id] ? (
                                            <>
                                              <button type="button" onClick={() => saveSongEdit(song.id)}>
                                                Save
                                              </button>
                                              <button
                                                type="button"
                                                className="ghost"
                                                onClick={() =>
                                                  setSongDraftById((prev) => {
                                                    const next = { ...prev };
                                                    delete next[song.id];
                                                    return next;
                                                  })
                                                }
                                              >
                                                Cancel
                                              </button>
                                            </>
                                          ) : (
                                            <button
                                              type="button"
                                              className="ghost"
                                              onClick={() =>
                                                setSongDraftById((prev) => ({
                                                  ...prev,
                                                  [song.id]: createSongDraft(song)
                                                }))
                                              }
                                            >
                                              Edit
                                            </button>
                                          )}
                                          <button
                                            type="button"
                                            className="ghost"
                                            onClick={() => addMemberSongToTargetSetlist(song)}
                                            disabled={!setlistTargetId}
                                          >
                                            Add to setlist
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
                                  </div>
                                </details>
                              ))}
                            </div>
                          ) : (
                            <div className="song-grid">
                              {songs.map((song) => (
                                <div className="song-row compact-song-row" key={song.id}>
                                  <div className="song-fields">
                                    {songDraftById[song.id] ? (
                                      <>
                                        {folder !== "originals" && (
                                          <input
                                            value={songDraftById[song.id].song_artist}
                                            onChange={(event) =>
                                              setSongDraftById((prev) => ({
                                                ...prev,
                                                [song.id]: {
                                                  ...prev[song.id],
                                                  song_artist: event.target.value
                                                }
                                              }))
                                            }
                                            placeholder="Artist"
                                          />
                                        )}
                                        <input
                                          value={songDraftById[song.id].song_title}
                                          onChange={(event) =>
                                            setSongDraftById((prev) => ({
                                              ...prev,
                                              [song.id]: {
                                                ...prev[song.id],
                                                song_title: event.target.value
                                              }
                                            }))
                                          }
                                          placeholder="Song title"
                                        />
                                        <input
                                          value={songDraftById[song.id].song_url}
                                          onChange={(event) =>
                                            setSongDraftById((prev) => ({
                                              ...prev,
                                              [song.id]: {
                                                ...prev[song.id],
                                                song_url: event.target.value
                                              }
                                            }))
                                          }
                                          placeholder="Song URL"
                                          type="url"
                                        />
                                      </>
                                    ) : (
                                      <>
                                        <span className="song-label">
                                          {folder === "originals" || !song.song_artist
                                            ? song.song_title
                                            : `${song.song_artist} - ${song.song_title}`}
                                        </span>
                                        {song.song_url && (
                                          <a href={song.song_url} target="_blank" rel="noreferrer">
                                            Open link
                                          </a>
                                        )}
                                      </>
                                    )}
                                  </div>
                                  {songDraftById[song.id] ? (
                                    <>
                                      <button type="button" onClick={() => saveSongEdit(song.id)}>
                                        Save
                                      </button>
                                      <button
                                        type="button"
                                        className="ghost"
                                        onClick={() =>
                                          setSongDraftById((prev) => {
                                            const next = { ...prev };
                                            delete next[song.id];
                                            return next;
                                          })
                                        }
                                      >
                                        Cancel
                                      </button>
                                    </>
                                  ) : (
                                    <button
                                      type="button"
                                      className="ghost"
                                      onClick={() =>
                                        setSongDraftById((prev) => ({
                                          ...prev,
                                          [song.id]: createSongDraft(song)
                                        }))
                                      }
                                    >
                                      Edit
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    className="ghost"
                                    onClick={() => addMemberSongToTargetSetlist(song)}
                                    disabled={!setlistTargetId}
                                  >
                                    Add to setlist
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
                          )}

                          <div className="song-row compact-song-row add-row">
                            <div className="song-fields">
                              {folder !== "originals" && (
                                <input
                                  value={(songInputByFolder[key] || createSongDraft()).song_artist}
                                  onChange={(event) =>
                                    setSongInputByFolder((prev) => ({
                                      ...prev,
                                      [key]: {
                                        ...(prev[key] || createSongDraft()),
                                        song_artist: event.target.value
                                      }
                                    }))
                                  }
                                  placeholder="Artist"
                                />
                              )}
                              <input
                                value={(songInputByFolder[key] || createSongDraft()).song_title}
                                onChange={(event) =>
                                  setSongInputByFolder((prev) => ({
                                    ...prev,
                                    [key]: {
                                      ...(prev[key] || createSongDraft()),
                                      song_title: event.target.value
                                    }
                                  }))
                                }
                                placeholder="Song title"
                              />
                              <input
                                value={(songInputByFolder[key] || createSongDraft()).song_url}
                                onChange={(event) =>
                                  setSongInputByFolder((prev) => ({
                                    ...prev,
                                    [key]: {
                                      ...(prev[key] || createSongDraft()),
                                      song_url: event.target.value
                                    }
                                  }))
                                }
                                placeholder="Song URL"
                                type="url"
                              />
                            </div>
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

                  <div className="form-card">
                    <p className="note tiny-label">Target event setlist</p>
                    <div className="split three">
                      <select
                        value={setlistTargetType}
                        onChange={(event) => setSetlistTargetType(event.target.value)}
                      >
                        {EVENT_TYPES.map((eventType) => (
                          <option key={eventType} value={eventType}>
                            {eventType}
                          </option>
                        ))}
                      </select>
                      <select
                        value={setlistTargetId}
                        onChange={(event) => setSetlistTargetId(event.target.value)}
                        disabled={!setlistTargetEvents.length}
                      >
                        {setlistTargetEvents.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.label}
                          </option>
                        ))}
                      </select>
                      <p className="tiny-label">
                        {setlistTargetEvents.length ? "Choose a song above" : "No events available"}
                      </p>
                    </div>
                  </div>
                </article>
              ) : (
                <p className="empty">No member selected.</p>
              )}
            </>
          )}

          {activePage === "calendar" && (
            <>
              <div className="panel-title-row">
                <h2>Calendar</h2>
                <span className="tiny-label">
                  {calendarView === "month" ? `${monthEventCount} this month` : `${weekEventCount} this week`}
                </span>
              </div>

              <div className="calendar-toolbar">
                <div className="calendar-nav">
                  <button
                    type="button"
                    className="ghost"
                    onClick={() => {
                      if (calendarView === "month") {
                        setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
                        return;
                      }
                      setCalendarWeekStart((prev) => {
                        const next = new Date(prev);
                        next.setDate(next.getDate() - 7);
                        return next;
                      });
                    }}
                  >
                    Prev
                  </button>
                  <button
                    type="button"
                    className="ghost"
                    onClick={() => {
                      if (calendarView === "month") {
                        setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
                        return;
                      }
                      setCalendarWeekStart((prev) => {
                        const next = new Date(prev);
                        next.setDate(next.getDate() + 7);
                        return next;
                      });
                    }}
                  >
                    Next
                  </button>
                  <button
                    type="button"
                    className="ghost"
                    onClick={() => {
                      const today = new Date();
                      setCalendarMonth(new Date(today.getFullYear(), today.getMonth(), 1));
                      const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                      start.setDate(start.getDate() - start.getDay());
                      setCalendarWeekStart(start);
                    }}
                  >
                    Today
                  </button>
                </div>
                <div className="calendar-view-controls" role="group" aria-label="Calendar view mode">
                  <button
                    type="button"
                    className={`ghost ${calendarView === "month" ? "active-toggle" : ""}`}
                    onClick={() => setCalendarView("month")}
                  >
                    Month
                  </button>
                  <button
                    type="button"
                    className={`ghost ${calendarView === "week" ? "active-toggle" : ""}`}
                    onClick={() => setCalendarView("week")}
                  >
                    Week
                  </button>
                </div>
                <h3 className="calendar-month-label">
                  {calendarView === "month" ? monthLabel : weekLabel}
                </h3>
              </div>

              <div className="calendar-filters" role="group" aria-label="Event type filters">
                <label className="calendar-filter">
                  <input
                    type="checkbox"
                    checked={calendarFilters.performance}
                    onChange={() =>
                      setCalendarFilters((prev) => ({
                        ...prev,
                        performance: !prev.performance
                      }))
                    }
                  />
                  Performances
                </label>
                <label className="calendar-filter">
                  <input
                    type="checkbox"
                    checked={calendarFilters.rehearsal}
                    onChange={() =>
                      setCalendarFilters((prev) => ({
                        ...prev,
                        rehearsal: !prev.rehearsal
                      }))
                    }
                  />
                  Rehearsals
                </label>
                <label className="calendar-filter">
                  <input
                    type="checkbox"
                    checked={calendarFilters.other}
                    onChange={() =>
                      setCalendarFilters((prev) => ({
                        ...prev,
                        other: !prev.other
                      }))
                    }
                  />
                  Other events
                </label>
              </div>

              {calendarView === "month" && (
                <div className="calendar-grid-wrap">
                  <div className="calendar-weekdays">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                      <p key={day} className="calendar-weekday">
                        {day}
                      </p>
                    ))}
                  </div>

                  <div className="calendar-grid">
                    {calendarDays.map((day) => (
                      <article
                        key={day.iso}
                        className={`calendar-day ${day.isCurrentMonth ? "" : "outside"} ${day.isToday ? "today" : ""}`}
                      >
                        <p className="calendar-day-number">{day.label}</p>
                        <div className="calendar-day-events">
                          {day.events.slice(0, 4).map((item) => (
                            <div
                              className={`calendar-event event-${item.sourceType}`}
                              key={`${item.sourceType}-${item.id}-${day.iso}`}
                              title={`${item.title}${item.time ? ` · ${formatTime(item.time)}` : ""}${item.location ? ` · ${item.location}` : ""}`}
                            >
                              <span className="calendar-event-title">{item.title}</span>
                              <span className="calendar-event-meta">
                                {item.sourceType === "other" ? item.type : item.type}
                                {item.time ? ` · ${formatTime(item.time)}` : ""}
                              </span>
                            </div>
                          ))}
                          {day.events.length > 4 && (
                            <p className="calendar-more">+{day.events.length - 4} more</p>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              )}

              {calendarView === "week" && (
                <div className="week-grid-wrap">
                  <div className="week-grid">
                    {calendarWeekDays.map((day) => (
                      <article
                        key={day.iso}
                        className={`week-day ${day.isToday ? "today" : ""}`}
                      >
                        <p className="week-day-heading">
                          <span>{day.weekday}</span>
                          <span>{day.label}</span>
                        </p>
                        <div className="week-day-events">
                          {day.events.map((item) => (
                            <div
                              className={`calendar-event event-${item.sourceType}`}
                              key={`${item.sourceType}-${item.id}-${day.iso}`}
                            >
                              <span className="calendar-event-title">{item.title}</span>
                              <span className="calendar-event-meta">
                                {item.sourceType === "other" ? item.type : item.type}
                                {item.time ? ` · ${formatTime(item.time)}` : ""}
                                {item.location ? ` · ${item.location}` : ""}
                              </span>
                            </div>
                          ))}
                          {!day.events.length && <p className="calendar-more">No events</p>}
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {(activePage === "other-events" || activePage === "events") && (
            <>
              <div className="panel-title-row">
                <h2>Other events</h2>
                <span className="tiny-label">{otherEvents.length} items</span>
              </div>

              {activePage === "other-events" && (
                <form className="stack form-card" onSubmit={createOtherEvent}>
                <input
                  value={otherEventForm.title}
                  onChange={(event) =>
                    setOtherEventForm((prev) => ({ ...prev, title: event.target.value }))
                  }
                  placeholder="Event title"
                  required
                />
                <div className="split three">
                  <input
                    type="date"
                    value={otherEventForm.event_date}
                    onChange={(event) =>
                      setOtherEventForm((prev) => ({ ...prev, event_date: event.target.value }))
                    }
                  />
                  <input
                    type="time"
                    value={otherEventForm.event_time}
                    onChange={(event) =>
                      setOtherEventForm((prev) => ({ ...prev, event_time: event.target.value }))
                    }
                  />
                  <input
                    value={otherEventForm.location}
                    onChange={(event) =>
                      setOtherEventForm((prev) => ({ ...prev, location: event.target.value }))
                    }
                    placeholder="Location"
                  />
                </div>
                <div className="split three">
                  <select
                    value={otherEventForm.event_type}
                    onChange={(event) =>
                      setOtherEventForm((prev) => ({ ...prev, event_type: event.target.value }))
                    }
                  >
                    {OTHER_EVENT_TYPES.map((eventType) => (
                      <option key={eventType} value={eventType}>
                        {eventType}
                      </option>
                    ))}
                  </select>
                  <select
                    value={otherEventForm.status}
                    onChange={(event) =>
                      setOtherEventForm((prev) => ({ ...prev, status: event.target.value }))
                    }
                  >
                    {OTHER_EVENT_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                  <input
                    value={otherEventForm.drive_url}
                    onChange={(event) =>
                      setOtherEventForm((prev) => ({ ...prev, drive_url: event.target.value }))
                    }
                    placeholder="Google Drive URL"
                    type="url"
                  />
                </div>
                <button type="submit" disabled={!canSubmit}>
                  + Add event
                </button>
                </form>
              )}

              <details id="event-section-otherEvents" className="folder folder-collapsible event-list-section">
                <summary className="folder-summary">
                  <span>Other event list</span>
                  <span className="tiny-label">{otherEvents.length} items</span>
                </summary>
                <div className="folder-body">
                  <div className="file-list">
                    {otherEvents.map((item) => (
                      <article
                        className="file-row"
                        key={item.id}
                        onBlur={(event) =>
                          handleAutoSaveBlur(event, Boolean(otherEventEditById[item.id]), () =>
                            saveOtherEventEdit(item.id)
                          )
                        }
                      >
                        <div className="file-main">
                          {otherEventEditById[item.id] ? (
                            <div className="stack">
                              <input
                                value={otherEventEditById[item.id].title}
                                onChange={(event) =>
                                  setOtherEventEditById((prev) => ({
                                    ...prev,
                                    [item.id]: {
                                      ...prev[item.id],
                                      title: event.target.value
                                    }
                                  }))
                                }
                                placeholder="Event title"
                              />
                              <div className="split three">
                                <input
                                  type="date"
                                  value={otherEventEditById[item.id].event_date}
                                  onChange={(event) =>
                                    setOtherEventEditById((prev) => ({
                                      ...prev,
                                      [item.id]: {
                                        ...prev[item.id],
                                        event_date: event.target.value
                                      }
                                    }))
                                  }
                                />
                                <input
                                  type="time"
                                  value={otherEventEditById[item.id].event_time}
                                  onChange={(event) =>
                                    setOtherEventEditById((prev) => ({
                                      ...prev,
                                      [item.id]: {
                                        ...prev[item.id],
                                        event_time: event.target.value
                                      }
                                    }))
                                  }
                                />
                                <input
                                  value={otherEventEditById[item.id].location}
                                  onChange={(event) =>
                                    setOtherEventEditById((prev) => ({
                                      ...prev,
                                      [item.id]: {
                                        ...prev[item.id],
                                        location: event.target.value
                                      }
                                    }))
                                  }
                                  placeholder="Location"
                                />
                              </div>
                              <div className="split three">
                                <select
                                  value={otherEventEditById[item.id].event_type}
                                  onChange={(event) =>
                                    setOtherEventEditById((prev) => ({
                                      ...prev,
                                      [item.id]: {
                                        ...prev[item.id],
                                        event_type: event.target.value
                                      }
                                    }))
                                  }
                                >
                                  {OTHER_EVENT_TYPES.map((eventType) => (
                                    <option key={eventType} value={eventType}>
                                      {eventType}
                                    </option>
                                  ))}
                                </select>
                                <select
                                  value={otherEventEditById[item.id].status}
                                  onChange={(event) =>
                                    setOtherEventEditById((prev) => ({
                                      ...prev,
                                      [item.id]: {
                                        ...prev[item.id],
                                        status: event.target.value
                                      }
                                    }))
                                  }
                                >
                                  {OTHER_EVENT_STATUSES.map((status) => (
                                    <option key={status} value={status}>
                                      {status}
                                    </option>
                                  ))}
                                </select>
                                <input
                                  value={otherEventEditById[item.id].drive_url}
                                  onChange={(event) =>
                                    setOtherEventEditById((prev) => ({
                                      ...prev,
                                      [item.id]: {
                                        ...prev[item.id],
                                        drive_url: event.target.value
                                      }
                                    }))
                                  }
                                  placeholder="Google Drive URL"
                                  type="url"
                                />
                              </div>
                            </div>
                          ) : (
                            <>
                              <p className="item-title">{item.title}</p>
                              <p className="item-date">
                                {formatDate(item.event_date)}
                                {item.event_time ? ` · ${formatTime(item.event_time)}` : ""}
                                {item.location ? ` · ${item.location}` : ""}
                              </p>
                              <p className="item-date">{item.event_type}</p>
                              {item.drive_url && (
                                <a href={item.drive_url} target="_blank" rel="noreferrer">
                                  Open Drive media
                                </a>
                              )}
                            </>
                          )}
                        </div>
                        <div className="file-actions">
                          {otherEventEditById[item.id] ? (
                            <>
                              <button type="button" onClick={() => saveOtherEventEdit(item.id)}>
                                Save
                              </button>
                              <button
                                type="button"
                                className="ghost"
                                onClick={() =>
                                  setOtherEventEditById((prev) => {
                                    const next = { ...prev };
                                    delete next[item.id];
                                    return next;
                                  })
                                }
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <>
                              <select
                                className="tag-select"
                                value={item.status}
                                onChange={(event) => updateOtherEventStatus(item.id, event.target.value)}
                              >
                                {OTHER_EVENT_STATUSES.map((status) => (
                                  <option key={status} value={status}>
                                    {status}
                                  </option>
                                ))}
                              </select>
                              <button
                                type="button"
                                className="ghost"
                                onClick={() =>
                                  setOtherEventEditById((prev) => ({
                                    ...prev,
                                    [item.id]: createOtherEventDraft(item)
                                  }))
                                }
                              >
                                Edit
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            className="ghost danger"
                            onClick={() => deleteOtherEvent(item.id)}
                          >
                            Delete
                          </button>
                        </div>

                        <details className="folder folder-collapsible set-list" key={`other-setlist-${item.id}`}>
                          <summary className="folder-summary">
                            <span>Set list</span>
                            <span className="tiny-label">
                              {(songsByEventSetlist[toEventKey("other", item.id)] || []).length} songs
                            </span>
                          </summary>
                          <div className="folder-body">
                            <div className="song-grid">
                              {(songsByEventSetlist[toEventKey("other", item.id)] || []).map((song) => (
                                <div className="song-row compact-song-row" key={song.id}>
                                  <span className="song-label">
                                    {song.song_artist ? `${song.song_artist} - ${song.song_title}` : song.song_title}
                                  </span>
                                  <button
                                    type="button"
                                    className="ghost"
                                    onClick={() => removeEventSetlistSong(song.id)}
                                  >
                                    Remove
                                  </button>
                                </div>
                              ))}
                            </div>
                            <div className="song-row compact-song-row add-row">
                              <div className="song-fields">
                                <input
                                  value={(eventSetlistInputByKey[toEventKey("other", item.id)] || {}).song_artist || ""}
                                  onChange={(event) =>
                                    setEventSetlistInputByKey((prev) => ({
                                      ...prev,
                                      [toEventKey("other", item.id)]: {
                                        ...(prev[toEventKey("other", item.id)] || createSetlistSongDraft()),
                                        song_artist: event.target.value
                                      }
                                    }))
                                  }
                                  placeholder="Artist"
                                />
                                <input
                                  value={(eventSetlistInputByKey[toEventKey("other", item.id)] || {}).song_title || ""}
                                  onChange={(event) =>
                                    setEventSetlistInputByKey((prev) => ({
                                      ...prev,
                                      [toEventKey("other", item.id)]: {
                                        ...(prev[toEventKey("other", item.id)] || createSetlistSongDraft()),
                                        song_title: event.target.value
                                      }
                                    }))
                                  }
                                  placeholder="Song title"
                                />
                              </div>
                              <button type="button" onClick={() => addEventSetlistSongFromInput("other", item.id)}>
                                Add
                              </button>
                            </div>
                          </div>
                        </details>
                      </article>
                    ))}
                    {!otherEvents.length && <p className="empty">No events yet.</p>}
                  </div>
                </div>
              </details>
            </>
          )}
        </section>
      </main>
    </div>
  );
}