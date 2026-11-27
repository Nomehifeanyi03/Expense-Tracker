// Dialog.jsx
// A pop-up box that asks a question or shows some text.
// Pages open it by calling askQuestion({ ... }) with these options:
//   title       heading of the box
//   message     text under the heading (optional)
//   buttonText  text on the main button (the button only shows if onConfirm is given)
//   isDanger    true = the main button is red, for deleting things
//   onConfirm   runs when the main button is clicked. Return false to keep the box open.
//   input       text the user can change in a box (optional)
//   area        long read-only text (optional)

export default function Dialog({ dialog, setDialog }) {
  function close() {
    setDialog(null);
  }

  function confirm() {
    const result = dialog.onConfirm(dialog.input);
    if (result !== false) close();
  }

  // Clicking the dark background outside the box closes it.
  function clickBackground(event) {
    if (event.target === event.currentTarget) close();
  }

  return (
    <div className="modal on" onClick={clickBackground}>
      <div className="card mbox">
        <h3>{dialog.title}</h3>
        {dialog.message && <p className="mut">{dialog.message}</p>}

        {dialog.area && (
          <textarea rows={10} readOnly value={dialog.area} onClick={e => e.target.select()} />
        )}

        {dialog.input !== undefined && (
          <input value={dialog.input} onChange={e => setDialog({ ...dialog, input: e.target.value })} />
        )}

        <div className="row" style={{ justifyContent: 'flex-end', marginTop: 16 }}>
          <button className="btn ghost" onClick={close}>Cancel</button>
          {dialog.onConfirm && (
            <button className={dialog.isDanger ? 'btn danger' : 'btn'} onClick={confirm}>
              {dialog.buttonText}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
