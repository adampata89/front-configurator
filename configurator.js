/*
 * Front Configurator — Console Snippet
 * --------------------------------------------
 * Wklej w DevTools console na dowolnej stronie
 * i zacznij klikać elementy. Działa bez zależności.
 *
 * Skrót klawiszowy:  Ctrl+Shift+E  — toggle edit mode
 *                    Esc           — deselect
 *                    Ctrl+Z / Ctrl+Y — undo / redo
 */
(() => {
    if (window.__FC_ACTIVE) { console.warn('[FC] already running. window.__FC_destroy() to remove.'); return; }
    window.__FC_ACTIVE = true;

    const ACCENT = '#ff7eb3';
    const PANEL_W = 320;

    // ---------- state ----------
    const state = {
        selected: null,        // DOM element
        history: [],           // [{label, undo, redo, at}]
        redoStack: [],
        panelPos: { x: window.innerWidth - PANEL_W - 20, y: 60 },
        sections: [],          // user-pickable section reorder candidates
        collapsed: {           // section id -> bool; persists across re-renders within session
            spacing: true,
        },
    };

    // ---------- shadow root host ----------
    const host = document.createElement('div');
    host.id = '__fc_host';
    host.style.cssText = 'all:initial;position:fixed;inset:0;pointer-events:none;z-index:2147483647;';
    document.documentElement.appendChild(host);
    const shadow = host.attachShadow({ mode: 'open' });

    shadow.innerHTML = `
    <style>
      :host {
        all: initial;
        --fc-bar: rgba(11,13,16,0.92);
        --fc-surface: rgba(15,19,24,0.97);
        --fc-surface-2: #0f1318;
        --fc-input: #06080a;
        --fc-border: #1a2028;
        --fc-text: #e6e8ec;
        --fc-text-dim: #8b929b;
        --fc-text-muted: #b9bfcc;
        --fc-text-faint: #4a5260;
        --fc-accent: ${ACCENT};
        --fc-accent-fg: #06080a;
        --fc-empty-bg: #0a0d12;
        --fc-shadow: 0 24px 80px rgba(0,0,0,0.6);
      }
      * { box-sizing: border-box; font-family: 'Inter', system-ui, -apple-system, sans-serif; }
      .root { pointer-events: none; }
      .root > * { pointer-events: auto; }

      .topbar {
        position: fixed; top: 0; left: 0; right: 0; height: 36px;
        background: var(--fc-bar); backdrop-filter: blur(20px);
        border-bottom: 1px solid var(--fc-border);
        display: flex; align-items: center; padding: 0 14px; gap: 12px;
        color: var(--fc-text); font-size: 12px;
      }
      .dot { width: 6px; height: 6px; border-radius: 50%; background: #a48de0; box-shadow: 0 0 10px #a48de0; }
      .label-edit { color: #e8956e; font-weight: 600; font-size: 11px; letter-spacing: 0.1em; }
      .meta { color: var(--fc-text-muted); font-family: 'JetBrains Mono', ui-monospace, monospace; font-size: 10px; }
      .grow { flex: 1; }
      .tbtn {
        background: transparent; border: 1px solid var(--fc-border); color: var(--fc-text);
        padding: 5px 12px; border-radius: 4px; font-size: 11px; cursor: pointer;
      }
      .tbtn:hover { background: var(--fc-input); }
      .tbtn.primary { background: var(--fc-accent); color: var(--fc-accent-fg); border-color: var(--fc-accent); font-weight: 700; }
      .tbtn:disabled { opacity: 0.4; cursor: not-allowed; }

      .toolbar {
        position: fixed; left: 14px; top: 60px;
        background: var(--fc-surface-2); border: 1px solid var(--fc-border); border-radius: 8px;
        padding: 6px; display: flex; flex-direction: column; gap: 4px;
        box-shadow: var(--fc-shadow);
      }
      .tool { width: 36px; height: 36px; border: none; cursor: pointer;
        border-radius: 6px; font-size: 14px; font-weight: 600;
        background: transparent; color: var(--fc-text-dim); }
      .tool:hover { background: var(--fc-input); color: var(--fc-text); }
      .tool.active { background: var(--fc-accent); color: var(--fc-accent-fg); }
      .tool:disabled { opacity: 0.3; cursor: not-allowed; }
      .tdiv { height: 1px; background: var(--fc-border); margin: 4px 6px; }

      .panel {
        position: fixed; width: ${PANEL_W}px;
        background: var(--fc-surface); backdrop-filter: blur(24px);
        border: 1px solid var(--fc-border); border-radius: 10px;
        box-shadow: var(--fc-shadow);
        max-height: 78vh; display: flex; flex-direction: column;
        color: var(--fc-text);
      }
      .phead { padding: 10px 14px; cursor: grab; user-select: none;
        display: flex; align-items: center; gap: 10px;
        border-bottom: 1px solid var(--fc-border); }
      .phead:active { cursor: grabbing; }
      .grip { display: flex; flex-direction: column; gap: 2px; }
      .grip > div { width: 14px; height: 2px; background: var(--fc-text-faint); border-radius: 1px; }
      .ptitle { font-size: 11px; font-weight: 600; letter-spacing: 0.05em; }
      .pclose { background: transparent; border: none; color: var(--fc-text-muted); cursor: pointer; font-size: 16px; }
      .pbody { overflow: auto; flex: 1; padding: 14px; }

      .pill { display: inline-block; background: var(--fc-accent); color: var(--fc-accent-fg);
        padding: 2px 6px; border-radius: 3px; font-size: 9px; font-weight: 700;
        font-family: 'JetBrains Mono', monospace; text-transform: uppercase; }
      .nodename { font-size: 12px; font-weight: 600; margin-left: 8px; }
      .selector { font-family: 'JetBrains Mono', monospace; font-size: 9px; color: var(--fc-text-faint);
        margin-top: 4px; word-break: break-all; }

      .lbl { font-size: 9px; color: var(--fc-text-muted); font-weight: 600; letter-spacing: 0.1em;
        margin: 14px 0 8px; font-family: 'JetBrains Mono', monospace; }
      .row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
      .rlbl { width: 64px; font-size: 10px; color: var(--fc-text-muted);
        font-family: 'JetBrains Mono', monospace; }
      .field { background: var(--fc-input); border: 1px solid var(--fc-border); border-radius: 4px;
        color: var(--fc-text); padding: 6px 8px; font-size: 11px;
        font-family: 'JetBrains Mono', monospace; outline: none; flex: 1; min-width: 0; }
      .field:focus { border-color: var(--fc-accent); }
      input[type=color] { width: 22px; height: 22px; border: 1px solid var(--fc-border);
        padding: 0; background: transparent; border-radius: 3px; cursor: pointer; }
      input[type=range] { flex: 1; accent-color: var(--fc-accent); }
      .rval { width: 38px; font-size: 10px; color: var(--fc-accent);
        font-family: 'JetBrains Mono', monospace; text-align: right; }
      textarea.field { width: 100%; min-height: 60px; font-family: inherit; resize: vertical; }

      .empty { color: var(--fc-text-muted); font-size: 12px; line-height: 1.6;
        padding: 12px; background: var(--fc-empty-bg); border-radius: 6px; }

      /* section header with optional remove */
      .sec-h { display: flex; align-items: center; gap: 6px; margin: 14px 0 8px; }
      .sec-h .lbl { margin: 0; flex: 1; }
      .sec-h .x { background: transparent; border: none; color: var(--fc-text-faint);
        cursor: pointer; font-size: 13px; padding: 2px 4px; line-height: 1; }
      .sec-h .x:hover { color: #f56262; }
      .sec-h.collapsible { cursor: pointer; user-select: none; }
      .sec-h.collapsible:hover .lbl { color: var(--fc-accent); }
      .sec-h .chev { font-size: 9px; color: var(--fc-text-faint); transition: transform 0.15s;
        display: inline-block; width: 10px; }
      .sec-h.is-collapsed .chev { transform: rotate(-90deg); }

      /* "+ Add" affordance */
      .addbtn { width: 100%; padding: 10px 12px; border-radius: 6px;
        background: transparent; border: 1px dashed var(--fc-border); color: var(--fc-text-dim);
        font-size: 11px; font-weight: 500; cursor: pointer;
        font-family: 'JetBrains Mono', monospace; letter-spacing: 0.05em;
        text-align: left; transition: all 120ms; margin-bottom: 4px; }
      .addbtn:hover { border-color: var(--fc-accent); color: var(--fc-accent);
        background: rgba(255,126,179,0.04); }
      .addbtn .plus { display: inline-block; width: 14px; color: var(--fc-text-faint); }
      .addbtn:hover .plus { color: var(--fc-accent); }

      /* spacing box editor */
      .box-edit { padding: 8px; background: var(--fc-empty-bg); border-radius: 6px;
        margin-bottom: 8px; }
      .box-edit-h { display: flex; align-items: center; justify-content: space-between;
        font-size: 9px; color: var(--fc-text-muted); font-family: 'JetBrains Mono', monospace;
        letter-spacing: 0.1em; margin-bottom: 6px; }
      .box-edit-h .link { background: transparent; border: 1px solid var(--fc-border);
        color: var(--fc-text-dim); cursor: pointer; font-size: 11px; padding: 2px 6px;
        border-radius: 3px; line-height: 1; }
      .box-edit-h .link.on { color: var(--fc-accent); border-color: var(--fc-accent); }
      .box-grid { display: grid;
        grid-template-columns: 36px 1fr 36px;
        grid-template-rows: 24px 1fr 24px;
        gap: 4px; align-items: center; justify-items: center; }
      .box-cell { display: flex; align-items: center; justify-content: center; }
      .box-num { width: 36px; height: 22px; background: var(--fc-input);
        border: 1px solid var(--fc-border); border-radius: 3px;
        color: var(--fc-text); font-family: 'JetBrains Mono', monospace; font-size: 10px;
        text-align: center; outline: none; cursor: ns-resize; user-select: none;
        padding: 0; }
      .box-num:focus { border-color: var(--fc-accent); cursor: text; }
      .box-num.dragging { border-color: var(--fc-accent);
        background: rgba(255,126,179,0.08); }
      .box-inner { width: 100%; height: 56px; background: var(--fc-surface-2);
        border: 1px dashed var(--fc-border); border-radius: 4px;
        display: flex; align-items: center; justify-content: center;
        color: var(--fc-text-faint); font-size: 9px;
        font-family: 'JetBrains Mono', monospace; }

      /* shadow controls grid */
      .sg { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px;
        margin-bottom: 8px; }
      .sg .col { display: flex; flex-direction: column; gap: 2px; }
      .sg .col label { font-size: 9px; color: var(--fc-text-muted);
        font-family: 'JetBrains Mono', monospace; text-align: center; }
      .sg .col input { width: 100%; }

      .vis-row { display: flex; gap: 6px; }
      .vis-btn { flex: 1; padding: 8px 0; border-radius: 4px;
        background: var(--fc-empty-bg); border: 1px solid var(--fc-border); color: var(--fc-text-dim);
        font-size: 11px; font-weight: 600; cursor: pointer; }
      .vis-btn.on-shown { background: rgba(255,126,179,0.12); border-color: var(--fc-accent); color: var(--fc-accent); }
      .vis-btn.on-hidden { background: rgba(245,98,98,0.12); border-color: #c44; color: #d44; }

      .hud {
        position: fixed; bottom: 14px; left: 50%; transform: translateX(-50%);
        background: var(--fc-surface); backdrop-filter: blur(20px);
        border: 1px solid var(--fc-border); border-radius: 999px; padding: 6px 16px;
        display: flex; align-items: center; gap: 14px; font-size: 11px;
        color: var(--fc-text-dim); font-family: 'JetBrains Mono', monospace;
      }
      .hud .k { color: var(--fc-accent); }

      .history-drawer {
        position: fixed; top: 36px; right: 0; bottom: 0; width: 340px;
        background: var(--fc-surface); backdrop-filter: blur(20px);
        border-left: 1px solid var(--fc-border); padding: 16px; overflow: auto;
        color: var(--fc-text);
      }
      .hitem { padding: 10px 0; border-bottom: 1px solid #14181f; font-size: 11px; }
      .hitem .ttl { display: flex; justify-content: space-between; }
      .hitem .ts { color: #4a5260; font-family: 'JetBrains Mono', monospace; font-size: 9px; }
      .hitem .desc { font-size: 9px; color: #6b7280; font-family: 'JetBrains Mono', monospace; margin-top: 2px; }

      .toast {
        position: fixed; bottom: 70px; left: 50%; transform: translateX(-50%);
        background: ${ACCENT}; color: #06080a; padding: 8px 16px; border-radius: 4px;
        font-size: 12px; font-weight: 600; opacity: 0; transition: opacity 200ms;
        pointer-events: none;
      }
      .toast.show { opacity: 1; }
    </style>

    <div class="root">
      <div class="topbar">
        <div class="dot"></div>
        <a class="brand-logo" href="https://auroracreation.pl/" target="_blank" rel="noopener" aria-label="Aurora Creation" style="display:inline-flex;text-decoration:none;line-height:0;">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 305.697 48.061" height="20" style="display:block">
            <g>
              <path fill="#FF5072" d="M67.054,45.181H62.67c0.012,0.665,0.229,1.285,0.596,1.722c0.322,0.378,0.769,0.608,1.389,0.608c0.506,0,0.942-0.183,1.252-0.505c0.206-0.218,0.366-0.47,0.435-0.815h0.596c-0.08,0.494-0.321,0.896-0.642,1.205c-0.413,0.414-0.987,0.665-1.642,0.665c-0.826,0-1.411-0.343-1.825-0.814c-0.47-0.551-0.734-1.308-0.734-2.181c0-0.723,0.115-1.435,0.562-2.042c0.482-0.655,1.148-0.999,1.951-0.999c1.55,0,2.456,1.331,2.456,2.777C67.065,44.94,67.054,45.043,67.054,45.181z M64.609,42.565c-1.182,0-1.928,0.952-1.928,2.088h3.799C66.457,43.563,65.78,42.565,64.609,42.565z"/>
              <path fill="#FF5072" d="M71.862,48.061c-0.781,0-1.584-0.321-2.146-0.883c-0.872-0.883-0.952-2.18-0.952-3.34c0-1.158,0.081-2.443,0.952-3.328c0.562-0.562,1.365-0.883,2.146-0.883c1.619,0,2.765,1.136,2.892,2.64h-0.62c-0.102-1.205-0.986-2.054-2.271-2.054c-0.724,0-1.274,0.251-1.71,0.699c-0.735,0.758-0.769,1.952-0.769,2.927c0,0.976,0.045,2.181,0.78,2.938c0.448,0.459,1.021,0.7,1.699,0.7c1.285,0,2.169-0.849,2.271-2.055h0.62C74.627,46.925,73.481,48.061,71.862,48.061z"/>
              <path fill="#FF5072" d="M80.513,47.373c-0.401,0.402-0.964,0.688-1.675,0.688c-0.712,0-1.274-0.286-1.677-0.688c-0.595-0.597-0.814-1.354-0.814-2.33c0-0.975,0.219-1.733,0.814-2.33c0.403-0.401,0.965-0.688,1.677-0.688c0.711,0,1.274,0.287,1.675,0.688c0.597,0.597,0.815,1.355,0.815,2.33C81.328,46.019,81.111,46.776,80.513,47.373z M80.101,43.092c-0.299-0.309-0.712-0.505-1.262-0.505c-0.552,0-0.964,0.195-1.263,0.505c-0.516,0.539-0.643,1.205-0.643,1.951c0,0.747,0.127,1.412,0.643,1.952c0.299,0.31,0.711,0.505,1.263,0.505c0.55,0,0.964-0.195,1.262-0.505c0.516-0.54,0.643-1.205,0.643-1.952C80.744,44.297,80.617,43.631,80.101,43.092z"/>
              <path fill="#FF5072" d="M90.877,47.913V44.16c0-0.999-0.369-1.595-1.367-1.595c-0.436,0-0.758,0.149-1.02,0.389c-0.448,0.425-0.678,1.022-0.678,1.711v3.248h-0.584V44.16c0-0.999-0.379-1.595-1.378-1.595c-0.436,0-0.769,0.149-1.021,0.389c-0.516,0.483-0.688,1.275-0.688,2.089v2.87h-0.574v-5.739h0.505l0.069,0.987c0.299-0.653,0.918-1.136,1.745-1.136c0.998,0,1.584,0.494,1.813,1.239c0.299-0.711,0.907-1.239,1.848-1.239c1.342,0,1.905,0.872,1.905,2.1v3.788H90.877z"/>
              <path fill="#FF5072" d="M101.376,47.913V44.16c0-0.999-0.367-1.595-1.365-1.595c-0.436,0-0.758,0.149-1.022,0.389c-0.446,0.425-0.677,1.022-0.677,1.711v3.248h-0.586V44.16c0-0.999-0.378-1.595-1.376-1.595c-0.437,0-0.769,0.149-1.021,0.389c-0.516,0.483-0.689,1.275-0.689,2.089v2.87h-0.574v-5.739h0.505l0.069,0.987c0.299-0.653,0.918-1.136,1.744-1.136c0.998,0,1.583,0.494,1.813,1.239c0.299-0.711,0.906-1.239,1.849-1.239c1.342,0,1.904,0.872,1.904,2.1v3.788H101.376z"/>
              <path fill="#FF5072" d="M109.029,45.181h-4.384c0.012,0.665,0.231,1.285,0.597,1.722c0.321,0.378,0.768,0.608,1.389,0.608c0.504,0,0.941-0.183,1.251-0.505c0.206-0.218,0.367-0.47,0.436-0.815h0.597c-0.081,0.494-0.321,0.896-0.643,1.205c-0.414,0.414-0.987,0.665-1.641,0.665c-0.827,0-1.412-0.343-1.826-0.814c-0.471-0.551-0.734-1.308-0.734-2.181c0-0.723,0.115-1.435,0.562-2.042c0.482-0.655,1.147-0.999,1.952-0.999c1.548,0,2.456,1.331,2.456,2.777C109.041,44.94,109.029,45.043,109.029,45.181z M106.585,42.565c-1.182,0-1.928,0.952-1.928,2.088h3.799C108.432,43.563,107.755,42.565,106.585,42.565z"/>
              <path fill="#FF5072" d="M113.607,42.668c-1.434,0-1.824,1.286-1.824,2.491v2.754h-0.574v-5.739h0.505l0.069,1.159c0.252-0.792,1.02-1.216,1.824-1.216c0.184,0,0.38,0,0.563,0.035v0.574C113.987,42.68,113.791,42.668,113.607,42.668z"/>
              <path fill="#FF5072" d="M117.829,48.061c-0.712,0-1.285-0.274-1.686-0.677c-0.597-0.596-0.804-1.365-0.804-2.341c0-0.975,0.208-1.744,0.804-2.341c0.401-0.402,0.973-0.677,1.686-0.677c1.194,0,2.078,0.781,2.216,1.94h-0.597c-0.126-0.792-0.746-1.377-1.618-1.377c-0.55,0-0.975,0.183-1.273,0.493c-0.516,0.54-0.631,1.216-0.631,1.963c0,0.747,0.115,1.435,0.631,1.974c0.299,0.31,0.723,0.482,1.273,0.482c0.884,0,1.493-0.621,1.63-1.401h0.608C119.918,47.213,119.035,48.061,117.829,48.061z"/>
              <path fill="#FF5072" d="M126.632,45.181h-4.384c0.01,0.665,0.228,1.285,0.597,1.722c0.321,0.378,0.768,0.608,1.388,0.608c0.505,0,0.942-0.183,1.251-0.505c0.207-0.218,0.367-0.47,0.436-0.815h0.597c-0.081,0.494-0.321,0.896-0.643,1.205c-0.413,0.414-0.987,0.665-1.641,0.665c-0.826,0-1.411-0.343-1.826-0.814c-0.47-0.551-0.733-1.308-0.733-2.181c0-0.723,0.113-1.435,0.561-2.042c0.484-0.655,1.149-0.999,1.952-0.999c1.55,0,2.456,1.331,2.456,2.777C126.643,44.94,126.632,45.043,126.632,45.181z M124.187,42.565c-1.182,0-1.928,0.952-1.928,2.088h3.799C126.034,43.563,125.357,42.565,124.187,42.565z"/>
              <path fill="#FF5072" d="M135.444,47.373c-0.413,0.459-1.102,0.688-1.86,0.688c-0.781,0-1.445-0.24-1.882-0.733c-0.322-0.368-0.459-0.69-0.482-1.159h0.585c0.035,0.343,0.184,0.642,0.425,0.883c0.333,0.322,0.802,0.459,1.354,0.459c0.596,0,1.066-0.138,1.355-0.424c0.206-0.208,0.309-0.402,0.309-0.736c0-0.515-0.367-0.952-1.055-1.043l-1.114-0.149c-0.471-0.058-0.976-0.207-1.298-0.575c-0.206-0.241-0.321-0.539-0.321-0.907c0-0.459,0.194-0.837,0.493-1.113c0.414-0.379,0.977-0.54,1.573-0.54c0.689,0,1.342,0.218,1.733,0.677c0.263,0.31,0.424,0.689,0.435,1.055h-0.573c-0.022-0.183-0.103-0.47-0.287-0.688c-0.264-0.31-0.711-0.505-1.308-0.505c-0.447,0-0.781,0.08-1.033,0.264c-0.287,0.206-0.448,0.482-0.448,0.792c0,0.482,0.241,0.849,1.113,0.964l1.09,0.15c1.08,0.149,1.585,0.883,1.585,1.584C135.834,46.742,135.696,47.087,135.444,47.373z"/>
              <path fill="#FF5072" d="M141.744,47.373c-0.401,0.402-0.964,0.688-1.675,0.688c-0.711,0-1.273-0.286-1.676-0.688c-0.597-0.597-0.814-1.354-0.814-2.33c0-0.975,0.217-1.733,0.814-2.33c0.403-0.401,0.965-0.688,1.676-0.688c0.711,0,1.274,0.287,1.675,0.688c0.597,0.597,0.815,1.355,0.815,2.33C142.559,46.019,142.34,46.776,141.744,47.373z M141.33,43.092c-0.298-0.309-0.711-0.505-1.261-0.505c-0.55,0-0.964,0.195-1.263,0.505c-0.517,0.539-0.643,1.205-0.643,1.951c0,0.747,0.126,1.412,0.643,1.952c0.299,0.31,0.712,0.505,1.263,0.505c0.55,0,0.964-0.195,1.261-0.505c0.517-0.54,0.644-1.205,0.644-1.952C141.973,44.297,141.847,43.631,141.33,43.092z"/>
              <path fill="#FF5072" d="M145.908,47.981c-0.735,0-1.148-0.38-1.148-1.217v-6.989h0.574v6.967c0,0.39,0.114,0.688,0.597,0.688c0.229,0,0.332,0,0.493-0.022v0.505C146.299,47.947,146.149,47.981,145.908,47.981z"/>
              <path fill="#FF5072" d="M152.37,47.901l-0.069-1.044c-0.321,0.734-1.136,1.193-1.939,1.193c-1.321,0-2.021-0.815-2.021-2.1v-3.789h0.574v3.754c0,0.998,0.436,1.572,1.48,1.572c1.412,0,1.905-1.216,1.905-2.456v-2.87h0.574v5.738H152.37z"/>
              <path fill="#FF5072" d="M157.372,47.993c-1.067,0-1.48-0.677-1.48-1.675v-3.615h-1.148v-0.528h1.148V40.59l0.574-0.138v1.722h1.779v0.528h-1.779v3.593c0,0.676,0.184,1.159,0.953,1.159c0.31,0,0.597-0.046,0.907-0.103v0.505C158.003,47.924,157.693,47.993,157.372,47.993z"/>
              <path fill="#FF5072" d="M160.263,40.579v-0.804h0.803v0.804H160.263z M160.366,47.913v-5.739h0.609v5.739H160.366z"/>
              <path fill="#FF5072" d="M167.424,47.373c-0.402,0.402-0.964,0.688-1.675,0.688c-0.713,0-1.275-0.286-1.676-0.688c-0.596-0.597-0.815-1.354-0.815-2.33c0-0.975,0.219-1.733,0.815-2.33c0.401-0.401,0.963-0.688,1.676-0.688c0.711,0,1.273,0.287,1.675,0.688c0.597,0.597,0.815,1.355,0.815,2.33C168.239,46.019,168.021,46.776,167.424,47.373z M167.011,43.092c-0.298-0.309-0.712-0.505-1.262-0.505c-0.552,0-0.965,0.195-1.263,0.505c-0.516,0.539-0.643,1.205-0.643,1.951c0,0.747,0.126,1.412,0.643,1.952c0.298,0.31,0.711,0.505,1.263,0.505c0.55,0,0.964-0.195,1.262-0.505c0.516-0.54,0.643-1.205,0.643-1.952C167.654,44.297,167.528,43.631,167.011,43.092z"/>
              <path fill="#FF5072" d="M174.436,47.913V44.16c0-0.999-0.437-1.573-1.481-1.573c-1.411,0-1.906,1.217-1.906,2.456v2.87h-0.573v-5.739h0.503l0.07,1.045c0.321-0.724,1.137-1.193,1.939-1.193c1.321,0,2.021,0.815,2.021,2.1v3.788H174.436z"/>
              <path fill="#FF5072" d="M181.333,47.373c-0.414,0.459-1.102,0.688-1.859,0.688c-0.782,0-1.447-0.24-1.883-0.733c-0.321-0.368-0.459-0.69-0.482-1.159h0.585c0.034,0.343,0.184,0.642,0.425,0.883c0.332,0.322,0.803,0.459,1.355,0.459c0.596,0,1.067-0.138,1.353-0.424c0.207-0.208,0.311-0.402,0.311-0.736c0-0.515-0.368-0.952-1.057-1.043l-1.113-0.149c-0.47-0.058-0.976-0.207-1.296-0.575c-0.206-0.241-0.322-0.539-0.322-0.907c0-0.459,0.195-0.837,0.494-1.113c0.413-0.379,0.974-0.54,1.571-0.54c0.688,0,1.343,0.218,1.733,0.677c0.264,0.31,0.424,0.689,0.435,1.055h-0.573c-0.023-0.183-0.104-0.47-0.288-0.688c-0.264-0.31-0.711-0.505-1.308-0.505c-0.448,0-0.78,0.08-1.032,0.264c-0.288,0.206-0.448,0.482-0.448,0.792c0,0.482,0.241,0.849,1.114,0.964l1.09,0.15c1.078,0.149,1.583,0.883,1.583,1.584C181.722,46.742,181.584,47.087,181.333,47.373z"/>
              <path fill="#FFFFFF" d="M81.162,25.052V16.6c0-0.503,0.411-0.913,0.886-0.913c0.501,0,0.912,0.41,0.912,0.913v8.339c0,3.43,1.839,5.361,4.863,5.361c2.929,0,4.791-1.772,4.791-5.248V16.6c0-0.503,0.411-0.913,0.911-0.913c0.477,0,0.887,0.41,0.887,0.913v8.315c0,4.635-2.659,7.047-6.636,7.047C83.844,31.961,81.162,29.55,81.162,25.052z"/>
              <path fill="#FFFFFF" d="M99.573,16.71c0-0.498,0.407-0.907,0.883-0.907h5.955c1.955,0,3.522,0.589,4.523,1.591c0.772,0.771,1.226,1.886,1.226,3.136v0.047c0,2.613-1.769,4.134-4.249,4.613l3.954,5.087c0.182,0.206,0.296,0.411,0.296,0.662c0,0.476-0.454,0.885-0.907,0.885c-0.365,0-0.634-0.204-0.842-0.476l-4.476-5.82h-4.568v5.388c0,0.499-0.408,0.908-0.91,0.908c-0.476,0-0.883-0.409-0.883-0.908V16.71z M106.251,23.916c2.39,0,4.093-1.229,4.093-3.272v-0.046c0-1.957-1.501-3.135-4.069-3.135h-4.908v6.452H106.251z"/>
              <path fill="#FFFFFF" d="M116.206,23.803v-0.047c0-4.386,3.296-8.225,8.136-8.225c4.843,0,8.091,3.794,8.091,8.181v0.045c0,4.386-3.294,8.227-8.134,8.227C119.458,31.984,116.206,28.188,116.206,23.803z M130.57,23.803v-0.047c0-3.612-2.636-6.568-6.271-6.568c-3.637,0-6.23,2.908-6.23,6.523v0.045c0,3.612,2.639,6.569,6.273,6.569C127.979,30.325,130.57,27.416,130.57,23.803z"/>
              <path fill="#FFFFFF" d="M137.137,16.71c0-0.498,0.409-0.907,0.887-0.907h5.952c1.957,0,3.524,0.589,4.524,1.591c0.773,0.771,1.227,1.886,1.227,3.136v0.047c0,2.613-1.77,4.134-4.25,4.613l3.956,5.087c0.182,0.206,0.294,0.411,0.294,0.662c0,0.476-0.454,0.885-0.905,0.885c-0.366,0-0.638-0.204-0.844-0.476l-4.477-5.82h-4.568v5.388c0,0.499-0.408,0.908-0.909,0.908c-0.478,0-0.887-0.409-0.887-0.908V16.71z M143.817,23.916c2.39,0,4.092-1.229,4.092-3.272v-0.046c0-1.957-1.498-3.135-4.066-3.135h-4.91v6.452H143.817z"/>
              <path fill="#FFFFFF" d="M198.612,16.71c0-0.498,0.411-0.907,0.885-0.907h5.955c1.955,0,3.525,0.589,4.523,1.591c0.773,0.771,1.227,1.886,1.227,3.136v0.047c0,2.613-1.774,4.134-4.251,4.613l3.955,5.087c0.182,0.206,0.296,0.411,0.296,0.662c0,0.476-0.454,0.885-0.911,0.885c-0.362,0-0.634-0.204-0.839-0.476l-4.477-5.82h-4.569v5.388c0,0.499-0.408,0.908-0.91,0.908c-0.474,0-0.885-0.409-0.885-0.908V16.71z M205.295,23.916c2.385,0,4.09-1.229,4.09-3.272v-0.046c0-1.957-1.5-3.135-4.069-3.135h-4.908v6.452H205.295"/>
              <path fill="#FFFFFF" d="M215.953,30.803V16.71c0-0.498,0.408-0.907,0.886-0.907h9.887c0.453,0,0.818,0.363,0.818,0.818c0,0.454-0.365,0.818-0.818,0.818h-8.976v5.432h7.953c0.453,0,0.818,0.386,0.818,0.818c0,0.454-0.365,0.818-0.818,0.818h-7.953v5.569h9.087c0.455,0,0.818,0.363,0.818,0.819c0,0.453-0.363,0.819-0.818,0.819h-9.998C216.36,31.713,215.953,31.302,215.953,30.803z"/>
              <path fill="#FFFFFF" d="M253.064,17.463h-4.614c-0.452,0-0.841-0.366-0.841-0.82c0-0.455,0.389-0.841,0.841-0.841h11.047c0.453,0,0.84,0.386,0.84,0.841c0,0.454-0.387,0.82-0.84,0.82h-4.614v13.452c0,0.499-0.409,0.908-0.91,0.908c-0.501,0-0.909-0.409-0.909-0.908V17.463z"/>
              <path fill="#FFFFFF" d="M264.654,16.6c0-0.503,0.409-0.913,0.888-0.913c0.498,0,0.907,0.41,0.907,0.913v14.316c0,0.499-0.409,0.908-0.907,0.908c-0.479,0-0.888-0.409-0.888-0.908V16.6z"/>
              <path fill="#FFFFFF" d="M271.312,23.803v-0.047c0-4.386,3.295-8.225,8.135-8.225c4.84,0,8.091,3.794,8.091,8.181v0.045c0,4.386-3.293,8.227-8.136,8.227C274.562,31.984,271.312,28.188,271.312,23.803z M285.676,23.803v-0.047c0-3.612-2.636-6.568-6.273-6.568c-3.636,0-6.227,2.908-6.227,6.523v0.045c0,3.612,2.637,6.569,6.272,6.569C283.084,30.325,285.676,27.416,285.676,23.803z"/>
              <path fill="#FFFFFF" d="M292.243,16.62c0-0.478,0.407-0.885,0.886-0.885h0.252c0.409,0,0.656,0.203,0.907,0.522l9.66,12.316V16.572c0-0.476,0.385-0.886,0.885-0.886c0.476,0,0.865,0.41,0.865,0.886v14.366c0,0.476-0.342,0.841-0.816,0.841h-0.093c-0.387,0-0.66-0.228-0.931-0.547l-9.864-12.613v12.318c0,0.476-0.387,0.885-0.888,0.885c-0.476,0-0.863-0.409-0.863-0.885V16.62z"/>
              <g>
                <path fill="#FFFFFF" d="M77.46,30.507l-5.186-11.322c-0.12-0.261-0.381-0.428-0.668-0.427c-0.287,0.001-0.548,0.17-0.665,0.432c-0.015,0.033-0.03,0.066-0.045,0.099c-0.125,0.279-0.125,0.598,0,0.877l2.563,5.705H68.5c-0.339,0-0.645,0.198-0.785,0.507c-0.112,0.248-0.09,0.535,0.058,0.763c0.148,0.228,0.401,0.367,0.672,0.367h5.721l1.658,3.659c0.16,0.364,0.453,0.658,0.884,0.658c0.479,0,0.863-0.384,0.863-0.863C77.572,30.827,77.528,30.666,77.46,30.507z"/>
                <path fill="#FFFFFF" d="M70.362,16.524c0.493-0.986-1.049-1.636-1.525-0.487L62.21,30.53c-0.091,0.18-0.113,0.34-0.113,0.477c0,0.453,0.362,0.817,0.818,0.817c0.41,0,0.704-0.226,0.865-0.614C63.808,31.137,67.011,23.863,70.362,16.524z"/>
              </g>
              <path fill="#FFFFFF" d="M192.82,19.002c0.136,0.091,0.343,0.204,0.591,0.204c0.479,0,0.91-0.409,0.91-0.886c0-0.316-0.182-0.568-0.364-0.727c-1.125-0.934-2.341-1.643-3.989-1.93c-0.211-0.037-0.428,0.022-0.592,0.16c-0.164,0.138-0.26,0.341-0.26,0.556v0.067c0,0.439,0.301,0.819,0.727,0.921C191.009,17.646,191.953,18.234,192.82,19.002z"/>
              <path fill="#FFFFFF" d="M193.545,28.138c-0.229,0-0.433,0.113-0.57,0.251c-1.362,1.249-2.746,1.931-4.726,1.931c-3.499,0-6.158-2.885-6.158-6.567v-0.046c0-3.067,1.852-5.576,4.528-6.306c0.412-0.113,0.699-0.487,0.699-0.915v-0.092c0-0.209-0.095-0.407-0.257-0.538c-0.163-0.131-0.376-0.181-0.58-0.137c-3.725,0.812-6.254,4.131-6.254,8.033v0.045c0,4.569,3.388,8.181,7.977,8.181c2.615,0,4.341-0.91,5.912-2.341c0.156-0.135,0.294-0.363,0.294-0.637C194.409,28.548,193.998,28.138,193.545,28.138z"/>
              <path fill="#FFFFFF" d="M153.502,30.53l6.453-14.114c0.229-0.501,0.569-0.796,1.136-0.796h0.09c0.549,0,0.912,0.295,1.114,0.796l6.457,14.091c0.068,0.158,0.113,0.316,0.113,0.452c0,0.48-0.386,0.865-0.865,0.865c-0.431,0-0.727-0.293-0.886-0.659l-1.657-3.66h-8.732l-1.657,3.705c-0.16,0.387-0.455,0.614-0.865,0.614c-0.454,0-0.82-0.364-0.82-0.817C153.385,30.87,153.411,30.71,153.502,30.53z M164.751,25.87l-3.661-8.136l-3.659,8.136H164.751z"/>
              <path fill="#FFFFFF" d="M231.111,30.53l6.453-14.114c0.227-0.501,0.569-0.796,1.137-0.796h0.089c0.545,0,0.909,0.295,1.114,0.796l6.456,14.091c0.068,0.158,0.113,0.316,0.113,0.452c0,0.48-0.386,0.865-0.864,0.865c-0.432,0-0.727-0.293-0.886-0.659l-1.66-3.66h-8.725l-1.661,3.705c-0.158,0.387-0.454,0.614-0.862,0.614c-0.456,0-0.82-0.364-0.82-0.817C230.996,30.87,231.02,30.71,231.111,30.53z M242.358,25.87l-3.657-8.136l-3.659,8.136H242.358z"/>
              <path fill="#FFFFFF" d="M24.652,9.475c-0.726-0.313-1.57,0.021-1.884,0.747c-3.471,8.033-9.623,22.287-9.65,22.351v0.001l0,0c-0.312,0.726,0.021,1.569,0.748,1.882c0.725,0.314,1.569-0.02,1.883-0.747c0,0,6.17-14.299,9.649-22.35C25.712,10.633,25.378,9.79,24.652,9.475z"/>
              <path fill="#FFFFFF" d="M20.89,27.862c0,0.791,0.641,1.432,1.432,1.432h8.231l1.906,4.416c0.234,0.542,0.761,0.866,1.316,0.866c0.19,0,0.382-0.038,0.567-0.118c0.727-0.313,1.062-1.156,0.748-1.883l-5.194-12.036c-0.313-0.727-1.156-1.061-1.883-0.748c-0.725,0.314-1.061,1.156-0.747,1.883l2.051,4.756h-6.995C21.531,26.429,20.89,27.07,20.89,27.862z"/>
              <path fill="#9850FF" d="M27.869,2.843c6.861,1.224,12.688,5.756,15.585,12.122c0.24,0.528,0.761,0.84,1.305,0.84c0.198,0,0.4-0.042,0.592-0.129c0.72-0.328,1.038-1.178,0.71-1.898c-3.287-7.224-9.9-12.366-17.69-13.756c-0.777-0.139-1.523,0.379-1.662,1.158C26.571,1.96,27.089,2.704,27.869,2.843z"/>
              <path fill="#FF8548" d="M12.973,5.661c0.673-0.415,0.883-1.299,0.467-1.972c-0.414-0.673-1.297-0.883-1.97-0.467C4.287,7.65,0,15.327,0,23.755c0,7.608,3.655,14.856,9.777,19.387c0.257,0.191,0.556,0.281,0.852,0.281c0.439,0,0.872-0.2,1.152-0.58c0.471-0.636,0.337-1.534-0.299-2.004c-5.396-3.995-8.618-10.381-8.618-17.085C2.865,16.328,6.643,9.564,12.973,5.661z"/>
              <path fill="#FF5072" d="M45.348,31.838c-0.721-0.328-1.57-0.01-1.897,0.711c-3.443,7.562-11.035,12.448-19.344,12.448c-1.936,0-3.855-0.26-5.704-0.774c-0.762-0.212-1.552,0.234-1.763,0.996c-0.212,0.763,0.234,1.552,0.996,1.765c2.099,0.583,4.275,0.879,6.471,0.879c9.429,0,18.044-5.546,21.951-14.127C46.386,33.015,46.069,32.166,45.348,31.838z"/>
            </g>
          </svg>
        </a>
        <span class="dot" style="margin-left:4px;"></span>
        <span class="label-edit">EDIT MODE</span>
        <span class="meta" id="loc"></span>
        <span class="grow"></span>
        <span class="meta" id="counter">0 edits · console session</span>
        <button class="tbtn" id="btn-history">⌘ History</button>
        <button class="tbtn" id="btn-undo">↶ Undo</button>
        <button class="tbtn" id="btn-redo">Redo ↷</button>
        <button class="tbtn" id="btn-reset">Reset</button>
        <button class="tbtn primary" id="btn-close">Exit</button>
      </div>

      <div class="toolbar">
        <button class="tool active" data-tool="select" title="Select (V)">↖</button>
        <button class="tool" data-tool="text" title="Edit text (T)">T</button>
        <button class="tool" data-tool="hide" title="Toggle visible (H)">◌</button>
        <div class="tdiv"></div>
        <button class="tool" id="t-undo" title="Undo (Ctrl+Z)">↶</button>
        <button class="tool" id="t-redo" title="Redo (Ctrl+Y)">↷</button>
      </div>

      <div class="panel" id="panel" style="left: ${state.panelPos.x}px; top: ${state.panelPos.y}px;">
        <div class="phead" id="phead">
          <div class="grip"><div></div><div></div></div>
          <span class="ptitle" id="ptitle">GLOBAL TOKENS</span>
          <span class="grow"></span>
          <button class="pclose" id="pclose" style="display:none;">×</button>
        </div>
        <div class="pbody" id="pbody"></div>
      </div>

      <div class="hud">
        <span>tool: <span class="k" id="hud-tool">select</span></span>
        <span style="color:#3a4150">·</span>
        <span>selection: <span class="k" id="hud-sel">none</span></span>
        <span style="color:#3a4150">·</span>
        <span><span class="k" id="hud-count">0</span> edits</span>
      </div>

      <div class="toast" id="toast"></div>
    </div>
  `;

    // SVG selection overlay — separate fixed elements on host (not shadow) so they overlay everything
    const overlay = document.createElement('div');
    overlay.id = '__fc_overlay';
    overlay.style.cssText = 'all:initial;position:fixed;inset:0;pointer-events:none;z-index:2147483646;';
    document.documentElement.appendChild(overlay);

    const hover = document.createElement('div');
    hover.style.cssText = 'position:absolute;border:1.5px dashed ' + ACCENT + ';background:rgba(196,245,66,0.06);pointer-events:none;display:none;';
    overlay.appendChild(hover);

    const selBox = document.createElement('div');
    selBox.style.cssText = 'position:absolute;pointer-events:none;display:none;';
    overlay.appendChild(selBox);

    const selLabel = document.createElement('div');
    selLabel.style.cssText = `position:absolute;background:${ACCENT};color:#06080a;font:700 10px 'JetBrains Mono',monospace;padding:2px 6px;border-radius:2px;white-space:nowrap;`;
    selBox.appendChild(selLabel);

    // ---------- helpers ----------
    const $ = (sel) => shadow.querySelector(sel);
    const isOurs = (el) => el && (host.contains(el) || overlay.contains(el));

    function shortSelector(el) {
        if (!el || el === document.body) return 'body';
        if (el.id) return '#' + el.id;
        let s = el.tagName.toLowerCase();
        if (el.classList.length) s += '.' + Array.from(el.classList).slice(0,2).join('.');
        return s;
    }
    function describe(el) {
        if (!el) return '';
        const tag = el.tagName.toLowerCase();
        const text = (el.textContent || '').trim().slice(0, 30);
        return text ? `${tag} · "${text}"` : tag;
    }
    function isTextish(el) {
        if (!el) return false;
        if (['BUTTON','A','SPAN','P','H1','H2','H3','H4','H5','H6','LI','LABEL','STRONG','EM','TD','TH'].includes(el.tagName)) return true;
        // node with only text children
        return el.childNodes.length === 1 && el.firstChild.nodeType === 3 && el.firstChild.textContent.trim().length > 0;
    }
    function rectOf(el) { return el.getBoundingClientRect(); }

    function pushHistory(label, undoFn, redoFn) {
        state.history.unshift({ label, undo: undoFn, redo: redoFn, at: Date.now() });
        state.history = state.history.slice(0, 200);
        state.redoStack = [];
        refreshHistoryUI();
    }
    function doUndo() {
        if (!state.history.length) return;
        const e = state.history.shift();
        e.undo();
        state.redoStack.unshift(e);
        refreshHistoryUI();
        renderInspector();
        updateSelOverlay();
    }
    function doRedo() {
        if (!state.redoStack.length) return;
        const e = state.redoStack.shift();
        e.redo();
        state.history.unshift(e);
        refreshHistoryUI();
        renderInspector();
        updateSelOverlay();
    }
    function refreshHistoryUI() {
        $('#counter').textContent = `${state.history.length} edits · console session`;
        $('#hud-count').textContent = state.history.length;
        $('#btn-undo').disabled = !state.history.length;
        $('#btn-redo').disabled = !state.redoStack.length;
        $('#t-undo').disabled = !state.history.length;
        $('#t-redo').disabled = !state.redoStack.length;
        if (historyOpen) renderHistoryDrawer();
    }

    function toast(msg) {
        const t = $('#toast');
        t.textContent = msg;
        t.classList.add('show');
        clearTimeout(t._tid);
        t._tid = setTimeout(() => t.classList.remove('show'), 1400);
    }

    // ---------- selection overlay ----------
    function updateSelOverlay() {
        if (!state.selected || !document.body.contains(state.selected)) {
            selBox.style.display = 'none';
            return;
        }
        const r = rectOf(state.selected);
        selBox.style.cssText = `position:absolute;left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;pointer-events:none;display:block;outline:2px solid ${ACCENT};outline-offset:0;`;
        selBox.appendChild(selLabel);
        selLabel.textContent = `${shortSelector(state.selected)} · ${Math.round(r.width)}×${Math.round(r.height)}`;
        selLabel.style.cssText = `position:absolute;left:0;top:-22px;background:${ACCENT};color:#06080a;font:700 10px 'JetBrains Mono',monospace;padding:2px 6px;border-radius:2px;white-space:nowrap;`;
        // corners
        selBox.querySelectorAll('.fc-corner').forEach(n => n.remove());
        [[0,0],[1,0],[0,1],[1,1]].forEach(([x,y]) => {
            const c = document.createElement('div');
            c.className = 'fc-corner';
            c.style.cssText = `position:absolute;left:${x*r.width-4}px;top:${y*r.height-4}px;width:8px;height:8px;background:#06080a;border:1.5px solid ${ACCENT};`;
            selBox.appendChild(c);
        });
    }

    // ---------- hover overlay ----------
    function showHover(el) {
        if (!el || el === state.selected) { hover.style.display = 'none'; return; }
        const r = rectOf(el);
        hover.style.cssText = `position:absolute;left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;border:1.5px dashed ${ACCENT};background:rgba(196,245,66,0.06);pointer-events:none;display:block;`;
    }

    // ---------- DOM event handlers (capture phase to intercept the page) ----------
    function onMouseMove(e) {
        if (currentTool === 'hide' || currentTool === 'select' || currentTool === 'text') {
            const el = e.target;
            if (isOurs(el)) { hover.style.display = 'none'; return; }
            showHover(el);
        }
    }
    function onClick(e) {
        const el = e.target;
        if (isOurs(el)) return;
        e.preventDefault(); e.stopPropagation();

        if (currentTool === 'hide') {
            const prevDisplay = el.style.display;
            el.style.setProperty('display', 'none', 'important');
            pushHistory(`Hide ${shortSelector(el)}`,
                () => { el.style.display = prevDisplay; },
                () => { el.style.setProperty('display', 'none', 'important'); });
            toast('Hidden');
            return;
        }

        state.selected = el;
        $('#hud-sel').textContent = shortSelector(el);
        $('#ptitle').textContent = 'INSPECT';
        $('#pclose').style.display = '';
        updateSelOverlay();
        renderInspector();

        if (currentTool === 'text' && isTextish(el)) {
            makeEditable(el);
        }
    }
    function makeEditable(el) {
        if (el.isContentEditable) return;
        const prevText = el.textContent;
        el.contentEditable = 'true';
        el.focus();
        // place caret at end
        const range = document.createRange();
        range.selectNodeContents(el);
        range.collapse(false);
        const sel = window.getSelection();
        sel.removeAllRanges(); sel.addRange(range);

        const finish = () => {
            el.contentEditable = 'false';
            const newText = el.textContent;
            if (newText !== prevText) {
                pushHistory(`Edit text · ${shortSelector(el)}`,
                    () => { el.textContent = prevText; },
                    () => { el.textContent = newText; });
            }
            el.removeEventListener('blur', finish);
        };
        el.addEventListener('blur', finish);
    }

    // bind events with capture
    document.addEventListener('mousemove', onMouseMove, true);
    document.addEventListener('click', onClick, true);

    // tool switching
    let currentTool = 'select';
    shadow.querySelectorAll('.tool[data-tool]').forEach(b => {
        b.addEventListener('click', () => {
            currentTool = b.dataset.tool;
            shadow.querySelectorAll('.tool[data-tool]').forEach(x => x.classList.toggle('active', x === b));
            $('#hud-tool').textContent = currentTool;
        });
    });

    // ---------- CSS variables collector ----------
    // For the selected element, find all CSS custom properties defined on it OR
    // referenced by any of its computed styles (via var(...)). Group by scope element.
    function collectCssVars(el) {
        if (!el) return [];
        const tracked = new Map(); // varName -> { name, value, scope, scopeKey, scopeLabel, resolved, usedIn:Set, isColor }

        // 1) walk matching CSSRules across all stylesheets, extract var(--x) references
        //    in declarations whose selector matches the element. Limited but powerful.
        const visibleProps = ['border-color','border-top-color','border-right-color','border-bottom-color','border-left-color',
            'background','background-color','color','box-shadow','--btn-stroke','--btn-bg','--btn-text',
            'border','border-top','border-right','border-bottom','border-left','outline','outline-color'];
        const sheets = Array.from(document.styleSheets);
        sheets.forEach(sheet => {
            let rules;
            try { rules = sheet.cssRules; } catch (e) { return; } // CORS
            if (!rules) return;
            Array.from(rules).forEach(rule => {
                if (!rule.style || !rule.selectorText) return;
                let matches = false;
                try { matches = el.matches(rule.selectorText.split(',').map(s => s.trim()).filter(s => !s.includes(':')).join(',') || '__none__'); }
                catch (e) { return; }
                if (!matches) return;
                for (let i = 0; i < rule.style.length; i++) {
                    const prop = rule.style[i];
                    const val = rule.style.getPropertyValue(prop);
                    if (!val) continue;
                    // Find var(--name) references
                    const refs = val.match(/var\(\s*(--[a-zA-Z0-9_-]+)/g) || [];
                    refs.forEach(r => {
                        const name = r.match(/--[a-zA-Z0-9_-]+/)[0];
                        addVar(name, prop);
                    });
                    // Also surface direct --custom-prop declarations on this rule
                    if (prop.startsWith('--') && visibleProps.indexOf(prop) >= 0) {
                        addVar(prop, prop);
                    }
                }
            });
        });

        function addVar(name, usedIn) {
            // resolve current value + scope (closest ancestor that defines it)
            let scope = el;
            let value = '';
            while (scope) {
                const v = scope.style.getPropertyValue(name) || window.getComputedStyle(scope).getPropertyValue(name);
                if (v && v.trim()) { value = v.trim(); break; }
                scope = scope.parentElement;
            }
            if (!scope) {
                scope = document.documentElement;
                value = window.getComputedStyle(document.documentElement).getPropertyValue(name).trim();
            }
            const resolved = window.getComputedStyle(el).getPropertyValue(name).trim() || value;
            const key = name + '|' + (scope.tagName || ':root');
            if (!tracked.has(key)) {
                tracked.set(key, {
                    name, value, resolved, scope,
                    scopeKey: key,
                    scopeLabel: scope === document.documentElement ? ':root' : shortSelector(scope),
                    usedIn: new Set([usedIn]),
                    isColor: looksLikeColor(resolved || value),
                });
            } else {
                tracked.get(key).usedIn.add(usedIn);
            }
        }

        return Array.from(tracked.values())
            .map(v => ({ ...v, usedIn: Array.from(v.usedIn).slice(0, 3) }))
            .sort((a, b) => (b.isColor - a.isColor) || a.name.localeCompare(b.name))
            .slice(0, 20); // cap UI
    }
    function looksLikeColor(s) {
        if (!s) return false;
        return /^#[0-9a-f]{3,8}$/i.test(s) || /^rgb/i.test(s) || /^hsl/i.test(s) || /^(red|blue|green|black|white|gray|grey|transparent|currentColor)$/i.test(s);
    }

    // ---------- inspector renderer ----------
    function renderInspector() {
        const body = $('#pbody');
        if (!state.selected || !document.body.contains(state.selected)) {
            $('#ptitle').textContent = 'GLOBAL TOKENS';
            $('#pclose').style.display = 'none';
            body.innerHTML = `
        <div class="empty">
          Click any element on the page to inspect it.<br><br>
          • <b>↖ Select</b> — pick an element to edit<br>
          • <b>T Text</b> — click to edit text inline<br>
          • <b>◌ Hide</b> — click to hide<br><br>
          <span style="color:${ACCENT}">Ctrl+Shift+E</span> to toggle this overlay.
        </div>
      `;
            return;
        }

        const el = state.selected;
        const cs = window.getComputedStyle(el);
        const cssVars = collectCssVars(el);

        body.innerHTML = `
      <div>
        <span class="pill">${el.tagName.toLowerCase()}</span>
        <span class="nodename">${describe(el).slice(0, 40)}</span>
        <div class="selector">${shortSelector(el)}</div>
      </div>

      <div class="lbl">CONTENT</div>
      <textarea class="field" id="f-text" rows="3">${el.textContent.trim().slice(0, 500).replace(/</g, '&lt;')}</textarea>

      <div class="lbl">TYPOGRAPHY</div>
      <div class="row">
        <span class="rlbl">size</span>
        <input type="range" id="f-size" min="8" max="120" value="${parseInt(cs.fontSize)}" />
        <span class="rval" id="f-size-v">${parseInt(cs.fontSize)}</span>
      </div>
      <div class="row">
        <span class="rlbl">weight</span>
        <select class="field" id="f-weight">
          ${[300,400,500,600,700,800].map(w => `<option value="${w}" ${cs.fontWeight==w?'selected':''}>${w}</option>`).join('')}
        </select>
      </div>
      <div class="row">
        <span class="rlbl">color</span>
        <input type="color" id="f-color" value="${rgbToHex(cs.color)}" />
        <input type="text" class="field" id="f-color-t" value="${rgbToHex(cs.color)}" />
      </div>

      <div class="sec-h">
        <span class="lbl">BACKGROUND</span>
        ${hasBackground(cs) ? `<button class="x" id="f-bg-x" title="Remove background">×</button>` : ''}
      </div>
      ${hasBackground(cs) ? `
        <div class="row">
          <span class="rlbl">color</span>
          <input type="color" id="f-bg" value="${rgbToHex(cs.backgroundColor) || '#000000'}" />
          <input type="text" class="field" id="f-bg-t" value="${cs.backgroundColor}" />
        </div>
      ` : `
        <button class="addbtn" id="f-bg-add"><span class="plus">+</span> Add background</button>
      `}

      <div class="sec-h collapsible ${state.collapsed.spacing ? 'is-collapsed' : ''}" data-toggle="spacing">
        <span class="chev">▼</span>
        <span class="lbl">SPACING</span>
      </div>
      ${state.collapsed.spacing ? '' : `
        ${spacingBoxHtml('padding', cs)}
        ${spacingBoxHtml('margin', cs)}
      `}

      <div class="sec-h">
        <span class="lbl">BORDER</span>
        ${hasBorder(cs) ? `<button class="x" id="f-border-x" title="Remove border">×</button>` : ''}
      </div>
      ${hasBorder(cs) ? `
        <div class="row">
          <span class="rlbl">width</span>
          <input type="range" id="f-bw" min="0" max="20" value="${parseInt(cs.borderTopWidth) || 0}" />
          <span class="rval" id="f-bw-v">${parseInt(cs.borderTopWidth) || 0}</span>
        </div>
        <div class="row">
          <span class="rlbl">style</span>
          <select class="field" id="f-bs">
            ${['solid','dashed','dotted','double','groove','ridge','inset','outset','none'].map(s => `<option value="${s}" ${cs.borderTopStyle===s?'selected':''}>${s}</option>`).join('')}
          </select>
        </div>
        <div class="row">
          <span class="rlbl">color</span>
          <input type="color" id="f-bc" value="${rgbToHex(cs.borderTopColor)}" />
          <input type="text" class="field" id="f-bc-t" value="${rgbToHex(cs.borderTopColor)}" />
        </div>
        <div class="row">
          <span class="rlbl">sides</span>
          <div style="display:flex;gap:4px;flex:1;">
            ${['T','R','B','L'].map(s => `<button class="vis-btn" id="f-side-${s}" style="padding:6px 0;font-family:'JetBrains Mono',monospace;font-size:10px;">${s}</button>`).join('')}
          </div>
        </div>
      ` : `
        <button class="addbtn" id="f-border-add"><span class="plus">+</span> Add border</button>
      `}

      <div class="sec-h">
        <span class="lbl">RADIUS</span>
        ${hasRadius(cs) ? `<button class="x" id="f-radius-x" title="Remove radius">×</button>` : ''}
      </div>
      <div class="row">
        <span class="rlbl">radius</span>
        <input type="range" id="f-radius" min="0" max="60" value="${parseInt(cs.borderTopLeftRadius) || 0}" />
        <span class="rval" id="f-radius-v">${parseInt(cs.borderTopLeftRadius) || 0}</span>
      </div>

      <div class="sec-h">
        <span class="lbl">SHADOW</span>
        ${hasShadow(cs) ? `<button class="x" id="f-shadow-x" title="Remove shadow">×</button>` : ''}
      </div>
      ${hasShadow(cs) ? (() => {
            const sh = parseShadow(cs.boxShadow) || {x:0,y:4,blur:12,spread:0,color:'rgba(0,0,0,0.15)'};
            return `
          <div class="sg">
            <div class="col"><label>x</label><input type="number" class="field" id="f-sh-x" value="${sh.x}" style="text-align:center" /></div>
            <div class="col"><label>y</label><input type="number" class="field" id="f-sh-y" value="${sh.y}" style="text-align:center" /></div>
            <div class="col"><label>blur</label><input type="number" class="field" id="f-sh-b" value="${sh.blur}" min="0" style="text-align:center" /></div>
            <div class="col"><label>spread</label><input type="number" class="field" id="f-sh-s" value="${sh.spread}" style="text-align:center" /></div>
          </div>
          <div class="row">
            <span class="rlbl">color</span>
            <input type="color" id="f-sh-c" value="${rgbToHex(sh.color)}" />
            <input type="text" class="field" id="f-sh-c-t" value="${sh.color}" />
          </div>
          <div class="row">
            <span class="rlbl">preset</span>
            <select class="field" id="f-shadow">
              <option value="">— custom —</option>
              <option value="0 1px 2px rgba(0,0,0,0.1)">subtle</option>
              <option value="0 4px 12px rgba(0,0,0,0.15)">soft</option>
              <option value="0 10px 30px rgba(0,0,0,0.25)">elevated</option>
              <option value="0 24px 60px rgba(0,0,0,0.4)">dramatic</option>
            </select>
          </div>
        `;
        })() : `
        <button class="addbtn" id="f-shadow-add"><span class="plus">+</span> Add shadow</button>
      `}

      ${cssVars.length ? `
        <div class="lbl">CSS VARIABLES <span style="color:${ACCENT};font-weight:700;">· ${cssVars.length}</span></div>
        <div style="font-size:10px;color:#6b7280;margin-bottom:10px;line-height:1.5;">
          Theme tokens used by this element (and ancestors). Editing a var updates everything that references it.
        </div>
        ${cssVars.map((v, i) => `
          <div class="row" data-var="${v.name}" data-scope="${v.scopeKey}">
            <span class="rlbl" style="font-size:9px;color:${ACCENT};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${v.name}">${v.name.replace('--','')}</span>
            ${v.isColor
            ? `<input type="color" class="f-var-c" data-i="${i}" value="${rgbToHex(v.resolved) || '#000000'}" />
                 <input type="text" class="field f-var-t" data-i="${i}" value="${v.value}" />`
            : `<input type="text" class="field f-var-t" data-i="${i}" value="${v.value}" style="flex:1" />`}
          </div>
          <div style="font-size:9px;color:#4a5260;margin:-6px 0 8px 72px;font-family:'JetBrains Mono',monospace;">
            scope: ${v.scopeLabel} · used in: ${v.usedIn.join(', ')}
          </div>
        `).join('')}
      ` : ''}

      <div class="lbl">VISIBILITY</div>
      <div class="vis-row">
        <button class="vis-btn on-shown" id="f-show">● shown</button>
        <button class="vis-btn" id="f-hide">◌ hide</button>
      </div>

      <div class="lbl">DOM</div>
      <div class="row">
        <button class="vis-btn" id="f-parent" style="font-family:monospace">↑ parent</button>
        <button class="vis-btn" id="f-delete" style="font-family:monospace">⌫ delete</button>
      </div>
    `;

        // bind
        bindCssEdit('f-text', null, (newVal) => {
            const prev = el.textContent;
            pushHistory(`Edit text · ${shortSelector(el)}`,
                () => { el.textContent = prev; },
                () => { el.textContent = newVal; });
            el.textContent = newVal;
        }, true);

        bindRange('f-size', 'f-size-v', (v) => applyStyle('fontSize', v + 'px'));
        bindSelect('f-weight', (v) => applyStyle('fontWeight', v));
        bindColor('f-color', 'f-color-t', (v) => applyStyle('color', v));

        // ---- BACKGROUND ----
        if (hasBackground(cs)) {
            bindColor('f-bg', 'f-bg-t', (v) => applyStyle('backgroundColor', v));
            $('#f-bg-x').onclick = () => removeStyles(['backgroundColor','background','backgroundImage'], 'Remove background');
        } else {
            $('#f-bg-add').onclick = () => {
                applyStyle('backgroundColor', '#ffffff', true);
                renderInspector();
            };
        }

        // ---- SPACING ----
        if (!state.collapsed.spacing) {
            bindSpacingBox('padding');
            bindSpacingBox('margin');
        }

        // collapsible section toggles
        body.querySelectorAll('.sec-h.collapsible').forEach(h => {
            h.addEventListener('click', (e) => {
                if (e.target.closest('.x')) return; // don't toggle when clicking the × remove button
                const key = h.dataset.toggle;
                if (!key) return;
                state.collapsed[key] = !state.collapsed[key];
                renderInspector();
            });
        });

        // ---- RADIUS ----
        bindRange('f-radius', 'f-radius-v', (v) => applyStyle('borderRadius', v + 'px'));
        if (hasRadius(cs)) {
            const rx = $('#f-radius-x'); if (rx) rx.onclick = () => removeStyles(['borderRadius','borderTopLeftRadius','borderTopRightRadius','borderBottomLeftRadius','borderBottomRightRadius'], 'Remove radius');
        }

        // ---- BORDER controls (per-side aware) ----
        let activeSides = { T: true, R: true, B: true, L: true };
        const sideMap = { T: 'Top', R: 'Right', B: 'Bottom', L: 'Left' };
        if (hasBorder(cs)) {
            const refreshSideBtns = () => {
                ['T','R','B','L'].forEach(s => {
                    const b = $('#f-side-' + s);
                    if (!b) return;
                    b.classList.toggle('on-shown', !!activeSides[s]);
                });
            };
            refreshSideBtns();
            ['T','R','B','L'].forEach(s => {
                const b = $('#f-side-' + s);
                if (b) b.onclick = () => { activeSides[s] = !activeSides[s]; refreshSideBtns(); };
            });
            const applyBorderProp = (prop, val) => {
                const sides = Object.entries(activeSides).filter(([_,v]) => v).map(([k]) => k);
                const allOn = sides.length === 4;
                if (allOn) {
                    applyStyle('border' + prop, val, true);
                } else {
                    sides.forEach(s => applyStyle('border' + sideMap[s] + prop, val, true));
                }
            };
            bindRange('f-bw', 'f-bw-v', (v) => applyBorderProp('Width', v + 'px'));
            bindSelect('f-bs', (v) => applyBorderProp('Style', v));
            bindColor('f-bc', 'f-bc-t', (v) => applyBorderProp('Color', v));
            $('#f-border-x').onclick = () => removeStyles([
                'border','borderWidth','borderStyle','borderColor',
                'borderTopWidth','borderTopStyle','borderTopColor',
                'borderRightWidth','borderRightStyle','borderRightColor',
                'borderBottomWidth','borderBottomStyle','borderBottomColor',
                'borderLeftWidth','borderLeftStyle','borderLeftColor'
            ], 'Remove border');
        } else {
            $('#f-border-add').onclick = () => {
                applyStyles([
                    { prop: 'borderWidth', value: '2px', important: true },
                    { prop: 'borderStyle', value: 'solid', important: true },
                    { prop: 'borderColor', value: rgbToHex(cs.color) || '#888888', important: true }
                ], 'Add border');
                renderInspector();
            };
        }

        // ---- SHADOW ----
        if (hasShadow(cs)) {
            const sh = parseShadow(cs.boxShadow) || {x:0,y:4,blur:12,spread:0,color:'rgba(0,0,0,0.15)'};
            const cur = { ...sh };
            const update = () => applyStyle('boxShadow', formatShadow(cur), true);
            ['x','y','b','s'].forEach((k, i) => {
                const map = ['x','y','blur','spread'];
                const inp = $('#f-sh-' + k);
                if (!inp) return;
                inp.addEventListener('change', () => {
                    cur[map[i]] = parseFloat(inp.value) || 0;
                    update();
                });
            });
            bindColor('f-sh-c', 'f-sh-c-t', (v) => { cur.color = v; update(); });
            bindSelect('f-shadow', (v) => { if (v) applyStyle('boxShadow', v, true); });
            $('#f-shadow-x').onclick = () => removeStyles(['boxShadow'], 'Remove shadow');
        } else {
            $('#f-shadow-add').onclick = () => {
                applyStyle('boxShadow', '0 4px 12px rgba(0,0,0,0.15)', true);
                renderInspector();
            };
        }

        // ---- CSS variables ----
        shadow.querySelectorAll('.f-var-t, .f-var-c').forEach(input => {
            const i = +input.dataset.i;
            const v = cssVars[i];
            input.addEventListener('change', () => {
                const newVal = input.value;
                const target = v.scope; // element on which the var is defined
                const prev = target.style.getPropertyValue(v.name);
                target.style.setProperty(v.name, newVal);
                pushHistory(`var ${v.name} → ${newVal}`,
                    () => { if (prev) target.style.setProperty(v.name, prev); else target.style.removeProperty(v.name); },
                    () => { target.style.setProperty(v.name, newVal); });
                // sync sibling input
                const row = input.closest('.row');
                if (row) row.querySelectorAll('.f-var-t, .f-var-c').forEach(other => {
                    if (other === input || !v.isColor) return;
                    if (other.type === 'color') {
                        // need a valid hex for the color picker
                        const hex = rgbToHex(newVal) || (/^#[0-9a-f]{6}$/i.test(newVal.trim()) ? newVal.trim() : null);
                        if (hex) other.value = hex;
                    } else {
                        other.value = newVal;
                    }
                });
                renderInspector(); // re-collect (resolved values changed)
            });
        });

        $('#f-hide').onclick = () => {
            const prev = el.style.display;
            el.style.setProperty('display', 'none', 'important');
            pushHistory(`Hide ${shortSelector(el)}`, () => el.style.display = prev, () => el.style.setProperty('display','none','important'));
            updateSelOverlay();
        };
        $('#f-show').onclick = () => {
            const prev = el.style.display;
            el.style.display = '';
            pushHistory(`Show ${shortSelector(el)}`, () => el.style.display = prev, () => el.style.display = '');
            updateSelOverlay();
        };
        $('#f-parent').onclick = () => {
            if (el.parentElement && el.parentElement !== document.body) {
                state.selected = el.parentElement;
                renderInspector(); updateSelOverlay();
                $('#hud-sel').textContent = shortSelector(state.selected);
            }
        };
        $('#f-delete').onclick = () => {
            const parent = el.parentNode;
            const next = el.nextSibling;
            pushHistory(`Delete ${shortSelector(el)}`,
                () => { parent.insertBefore(el, next); state.selected = el; updateSelOverlay(); renderInspector(); },
                () => { el.remove(); state.selected = null; updateSelOverlay(); renderInspector(); });
            el.remove();
            state.selected = null;
            updateSelOverlay();
            renderInspector();
        };
    }

    // build the visual spacing box editor for padding or margin
    function spacingBoxHtml(kind, cs) {
        const prefix = kind; // 'padding' | 'margin'
        const get = (side) => {
            const v = parseInt(cs[prefix + side]) || 0;
            return v;
        };
        const t = get('Top'), r = get('Right'), b = get('Bottom'), l = get('Left');
        const linked = (t === r && r === b && b === l);
        return `
      <div class="box-edit" data-kind="${kind}">
        <div class="box-edit-h">
          <span>${kind.toUpperCase()}</span>
          <button class="link ${linked ? 'on' : ''}" data-link="${kind}" title="${linked ? 'Linked — edit splits' : 'Split — click to link all'}">${linked ? '🔗' : '⛓️‍💥'}</button>
        </div>
        <div class="box-grid">
          <div></div>
          <input class="box-num" data-side="Top" data-kind="${kind}" type="number" value="${t}" />
          <div></div>
          <input class="box-num" data-side="Left" data-kind="${kind}" type="number" value="${l}" />
          <div class="box-inner">${kind === 'padding' ? 'content' : 'box'}</div>
          <input class="box-num" data-side="Right" data-kind="${kind}" type="number" value="${r}" />
          <div></div>
          <input class="box-num" data-side="Bottom" data-kind="${kind}" type="number" value="${b}" />
          <div></div>
        </div>
      </div>
    `;
    }

    // wire up a spacing box: drag-to-edit + arrows + linked/split mode
    function bindSpacingBox(kind) {
        const root = shadow.querySelector(`.box-edit[data-kind="${kind}"]`);
        if (!root) return;
        let linked = root.querySelector('.link').classList.contains('on');
        const inputs = Array.from(root.querySelectorAll('.box-num'));

        const apply = (side, val, allFour) => {
            const v = Math.max(-999, Math.min(999, val));
            const sides = allFour ? ['Top','Right','Bottom','Left'] : [side];
            const pairs = sides.map(s => ({
                prop: kind + s, value: v + 'px', important: true
            }));
            applyStyles(pairs, `${kind} ${allFour ? 'all' : side.toLowerCase()} → ${v}px`);
            // sync sibling inputs visually
            if (allFour) inputs.forEach(i => i.value = v);
        };

        inputs.forEach(input => {
            const side = input.dataset.side;

            // change via typing
            input.addEventListener('change', () => {
                const v = parseInt(input.value) || 0;
                apply(side, v, linked);
            });

            // arrow keys: ±1, shift = ±10
            input.addEventListener('keydown', (e) => {
                if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                    e.preventDefault();
                    const step = e.shiftKey ? 10 : 1;
                    const cur = parseInt(input.value) || 0;
                    const next = cur + (e.key === 'ArrowUp' ? step : -step);
                    input.value = next;
                    apply(side, next, linked);
                }
            });

            // drag-to-edit (vertical)
            let dragging = false, startY = 0, startVal = 0;
            input.addEventListener('mousedown', (e) => {
                if (document.activeElement === input) return; // typing mode
                e.preventDefault();
                dragging = true;
                startY = e.clientY;
                startVal = parseInt(input.value) || 0;
                input.classList.add('dragging');
                const move = (ev) => {
                    if (!dragging) return;
                    const dy = startY - ev.clientY; // up = increase
                    const step = ev.shiftKey ? 5 : 1;
                    const next = startVal + Math.round(dy / 2) * step;
                    input.value = next;
                    apply(side, next, linked);
                };
                const up = () => {
                    dragging = false;
                    input.classList.remove('dragging');
                    window.removeEventListener('mousemove', move);
                    window.removeEventListener('mouseup', up);
                };
                window.addEventListener('mousemove', move);
                window.addEventListener('mouseup', up);
            });
        });

        // link/split toggle
        const linkBtn = root.querySelector('.link');
        linkBtn.addEventListener('click', () => {
            linked = !linked;
            linkBtn.classList.toggle('on', linked);
            linkBtn.textContent = linked ? '🔗' : '⛓️‍💥';
            linkBtn.title = linked ? 'Linked — edit splits' : 'Split — click to link all';
            // when newly linked, sync all to top value
            if (linked) {
                const v = parseInt(inputs[0].value) || 0;
                apply('Top', v, true);
            }
        });
    }

    function applyStyle(prop, value, important) {
        const el = state.selected;
        if (!el) return;
        const prevValue = el.style[prop];
        const prevPriority = el.style.getPropertyPriority(prop);
        if (important) el.style.setProperty(toKebab(prop), value, 'important');
        else el.style[prop] = value;
        pushHistory(`${prop} → ${value}`,
            () => {
                if (prevPriority) el.style.setProperty(toKebab(prop), prevValue, prevPriority);
                else el.style[prop] = prevValue;
            },
            () => {
                if (important) el.style.setProperty(toKebab(prop), value, 'important');
                else el.style[prop] = value;
            }
        );
        updateSelOverlay();
    }

    // remove inline style for one or many props (for the "x" remove buttons)
    function removeStyles(props, label) {
        const el = state.selected;
        if (!el) return;
        const snapshot = props.map(p => ({
            p, v: el.style[p], pri: el.style.getPropertyPriority(toKebab(p))
        }));
        props.forEach(p => el.style.removeProperty(toKebab(p)));
        pushHistory(label || `Remove ${props.join(', ')}`,
            () => snapshot.forEach(({p, v, pri}) => {
                if (v) { if (pri) el.style.setProperty(toKebab(p), v, pri); else el.style[p] = v; }
            }),
            () => props.forEach(p => el.style.removeProperty(toKebab(p)))
        );
        renderInspector();
        updateSelOverlay();
    }

    // apply many props at once as a single history entry
    function applyStyles(pairs, label) {
        const el = state.selected;
        if (!el) return;
        const snapshot = pairs.map(({prop}) => ({
            prop, v: el.style[prop], pri: el.style.getPropertyPriority(toKebab(prop))
        }));
        const apply = () => pairs.forEach(({prop, value, important}) => {
            if (important) el.style.setProperty(toKebab(prop), value, 'important');
            else el.style[prop] = value;
        });
        apply();
        pushHistory(label || `${pairs.map(p => p.prop).join('+')}`,
            () => snapshot.forEach(({prop, v, pri}) => {
                if (v) { if (pri) el.style.setProperty(toKebab(prop), v, pri); else el.style[prop] = v; }
                else el.style.removeProperty(toKebab(prop));
            }),
            apply
        );
        updateSelOverlay();
    }
    function toKebab(s) { return s.replace(/[A-Z]/g, m => '-' + m.toLowerCase()); }
    function rgbToHex(rgb) {
        if (!rgb) return '#000000';
        if (rgb.startsWith('#')) return rgb;
        const m = rgb.match(/\d+/g);
        if (!m || m.length < 3) return '#000000';
        return '#' + m.slice(0,3).map(n => parseInt(n).toString(16).padStart(2,'0')).join('');
    }

    // detectors for "is this property meaningfully set?" — drives the "+ Add" affordance
    function hasBackground(cs) {
        const bg = cs.backgroundColor;
        if (!bg || bg === 'transparent') return false;
        const m = bg.match(/rgba?\(([^)]+)\)/);
        if (!m) return bg !== 'rgba(0, 0, 0, 0)';
        const parts = m[1].split(',').map(s => parseFloat(s.trim()));
        return parts.length === 4 ? parts[3] > 0 : true;
    }
    function hasBorder(cs) {
        return ['Top','Right','Bottom','Left'].some(s => parseFloat(cs['border' + s + 'Width']) > 0);
    }
    function hasShadow(cs) {
        return cs.boxShadow && cs.boxShadow !== 'none';
    }
    function hasRadius(cs) {
        return ['borderTopLeftRadius','borderTopRightRadius','borderBottomLeftRadius','borderBottomRightRadius']
            .some(p => parseFloat(cs[p]) > 0);
    }

    // parse "Xpx Ypx BLURpx SPREADpx COLOR" — returns {x,y,blur,spread,color} or null
    function parseShadow(s) {
        if (!s || s === 'none') return null;
        // grab color first (rgb/rgba/hex/named)
        const colorMatch = s.match(/(rgba?\([^)]+\)|#[0-9a-f]{3,8}|\b[a-z]+\b(?!\s*\())/i);
        const color = colorMatch ? colorMatch[0] : 'rgba(0,0,0,0.25)';
        const rest = s.replace(color, '').trim();
        const nums = rest.match(/-?\d+(?:\.\d+)?(?:px)?/g) || [];
        const [x=0, y=0, blur=0, spread=0] = nums.map(n => parseFloat(n));
        return { x, y, blur, spread, color };
    }
    function formatShadow({x, y, blur, spread, color}) {
        return `${x}px ${y}px ${blur}px ${spread}px ${color}`;
    }

    function bindRange(id, vid, cb) {
        const el = $('#'+id), v = $('#'+vid);
        let prevValue = el.value;
        el.addEventListener('input', () => { v.textContent = el.value; });
        el.addEventListener('change', () => { cb(el.value); prevValue = el.value; });
    }
    function bindSelect(id, cb) { $('#'+id).addEventListener('change', e => cb(e.target.value)); }
    function bindColor(id, tid, cb) {
        const c = $('#'+id), t = $('#'+tid);
        // normalize: keep both inputs in sync on init (hex form for color picker)
        const syncFromText = () => {
            const hex = rgbToHex(t.value) || (/^#[0-9a-f]{6}$/i.test(t.value.trim()) ? t.value.trim() : null);
            if (hex) c.value = hex;
        };
        syncFromText();
        c.addEventListener('input', () => { t.value = c.value; });
        c.addEventListener('change', () => { t.value = c.value; cb(c.value); });
        t.addEventListener('change', () => { syncFromText(); cb(t.value); });
    }
    function bindCssEdit(id, _vid, cb, debounced) {
        const el = $('#'+id);
        let initial = el.value;
        let timer;
        el.addEventListener('input', () => {
            if (debounced) {
                clearTimeout(timer);
                timer = setTimeout(() => { if (el.value !== initial) { cb(el.value); initial = el.value; } }, 400);
            } else cb(el.value);
        });
    }

    // ---------- panel drag ----------
    let dragging = null;
    $('#phead').addEventListener('mousedown', (e) => {
        const r = $('#panel').getBoundingClientRect();
        dragging = { ox: e.clientX - r.left, oy: e.clientY - r.top };
    });
    window.addEventListener('mousemove', (e) => {
        if (!dragging) return;
        state.panelPos.x = e.clientX - dragging.ox;
        state.panelPos.y = e.clientY - dragging.oy;
        $('#panel').style.left = state.panelPos.x + 'px';
        $('#panel').style.top = state.panelPos.y + 'px';
    });
    window.addEventListener('mouseup', () => dragging = null);

    // ---------- buttons ----------
    $('#btn-undo').onclick = doUndo;
    $('#btn-redo').onclick = doRedo;
    $('#t-undo').onclick = doUndo;
    $('#t-redo').onclick = doRedo;
    $('#btn-reset').onclick = () => {
        if (!confirm('Revert ALL edits in this session?')) return;
        while (state.history.length) doUndo();
        toast('All changes reverted');
    };

    $('#pclose').onclick = () => {
        state.selected = null;
        selBox.style.display = 'none';
        $('#hud-sel').textContent = 'none';
        renderInspector();
    };
    $('#btn-close').onclick = () => window.__FC_destroy();

    let historyOpen = false;
    $('#btn-history').onclick = () => {
        historyOpen = !historyOpen;
        if (historyOpen) renderHistoryDrawer();
        else { const d = shadow.querySelector('.history-drawer'); if (d) d.remove(); }
    };
    function renderHistoryDrawer() {
        let d = shadow.querySelector('.history-drawer');
        if (!d) {
            d = document.createElement('div');
            d.className = 'history-drawer';
            shadow.querySelector('.root').appendChild(d);
        }
        d.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
        <span style="font-size:12px;font-weight:600;letter-spacing:0.05em;">HISTORY · ${state.history.length}</span>
      </div>
      ${state.history.length === 0 ? '<div style="color:#4a5260;font-size:12px;">No edits yet.</div>' : ''}
      ${state.history.map(h => `
        <div class="hitem">
          <div class="ttl"><span>${h.label}</span><span class="ts">${new Date(h.at).toLocaleTimeString()}</span></div>
        </div>
      `).join('')}
    `;
    }

    // ---------- keyboard ----------
    function onKey(e) {
        if (e.key === 'Escape') {
            state.selected = null;
            selBox.style.display = 'none';
            $('#hud-sel').textContent = 'none';
            renderInspector();
        }
        if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
            e.preventDefault(); doUndo();
        }
        if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) {
            e.preventDefault(); doRedo();
        }
        if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'e') {
            e.preventDefault();
            host.style.display = host.style.display === 'none' ? '' : 'none';
            overlay.style.display = host.style.display;
        }
    }
    document.addEventListener('keydown', onKey, true);

    // ---------- live overlay sync ----------
    let rafId;
    function tick() {
        updateSelOverlay();
        rafId = requestAnimationFrame(tick);
    }
    tick();

    // ---------- destroy ----------
    window.__FC_destroy = function () {
        cancelAnimationFrame(rafId);
        document.removeEventListener('mousemove', onMouseMove, true);
        document.removeEventListener('click', onClick, true);
        document.removeEventListener('keydown', onKey, true);
        host.remove();
        overlay.remove();
        delete window.__FC_ACTIVE;
        delete window.__FC_destroy;
        console.log('[FC] removed.');
    };

    // initial render
    $('#loc').textContent = `· ${location.host}${location.pathname}`;
    renderInspector();
    toast('Front Configurator activated');
    console.log('%c[FC] Front Configurator active', 'color:#c4f542;font-weight:700');
    console.log('  • Click any element to edit it');
    console.log('  • Ctrl+Shift+E to toggle  ·  Esc to deselect  ·  Ctrl+Z/Y for undo/redo');
    console.log('  • window.__FC_destroy() to remove');
})();
