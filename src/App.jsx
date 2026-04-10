const rehearsalItems = [
  { title: "Warm-up + transitions", date: "Fri, Apr 12", status: "Planned" },
  { title: "New cover arrangement", date: "Mon, Apr 15", status: "Draft" },
  { title: "Set A full run-through", date: "Thu, Apr 18", status: "Confirmed" }
];

const performanceItems = [
  { title: "The Harbor Room", date: "Sat, Apr 27", status: "Confirmed" },
  { title: "Summer Block Party", date: "Sun, May 12", status: "Pending" }
];

export default function App() {
  return (
    <div className="page">
      <header className="hero">
        <p className="eyebrow">Band Operations</p>
        <h1>Band HQ</h1>
        <p className="subhead">
          Plan rehearsals, track performances, and keep Google Drive media links in
          one clean workflow.
        </p>
      </header>

      <main className="grid">
        <section className="panel">
          <div className="panel-title-row">
            <h2>Rehearsals</h2>
            <button type="button">+ New rehearsal</button>
          </div>
          <ul>
            {rehearsalItems.map((item) => (
              <li key={item.title}>
                <div>
                  <p className="item-title">{item.title}</p>
                  <p className="item-date">{item.date}</p>
                </div>
                <span className="tag">{item.status}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="panel">
          <div className="panel-title-row">
            <h2>Performances</h2>
            <button type="button">+ New performance</button>
          </div>
          <ul>
            {performanceItems.map((item) => (
              <li key={item.title}>
                <div>
                  <p className="item-title">{item.title}</p>
                  <p className="item-date">{item.date}</p>
                </div>
                <span className="tag">{item.status}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="panel full">
          <div className="panel-title-row">
            <h2>Media Links</h2>
            <button type="button">+ Add Drive URL</button>
          </div>
          <p className="note">
            Google Drive is link-only. Add demos, charts, stems, or videos without
            changing your app data model.
          </p>
          <div className="link-card">
            <p className="item-title">Set A rehearsal video</p>
            <p className="item-date">Linked to rehearsal: Warm-up + transitions</p>
            <a href="https://drive.google.com" target="_blank" rel="noreferrer">
              Open media link
            </a>
          </div>
        </section>
      </main>
    </div>
  );
}