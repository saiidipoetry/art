
/* =================================================
   How To Die Without Dying - S.I.N.
   Shared page behavior.

   This file replaces the old embedded script. Every HTML page loads this
   single script, and choices are carried between pages with localStorage.
   ================================================= */

const STORAGE_KEY = "sin_state";
const INTRO_AUDIO_SRC = "audio/intro.mp4";
const AMBIENCE_AUDIO_SRC = "audio/freesound_community-tape-hiss-86109.mp3";
const INTRO_FADE_FALLBACK_MS = 9000;
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const returnGreetings = [
  ["you're back.", "the book remembered your name.", "why?"],
  ["you came back.", "you can't get enough of this, can you?", "again?"],
  ["there you are.", "the crack was waiting.", "why now?"]
];

let growth = 0;
let ambienceAudio;
const crackPath = document.getElementById("crack-path");

function getState() {
  const state = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  const oldName = localStorage.getItem("sin_name");

  // The first one-file version used sin_name; keep it so returning readers are still remembered.
  if (!state.name && oldName) {
    state.name = oldName;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  return state;
}

function saveState(patch) {
  const next = { ...getState(), ...patch };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

function forgetReader() {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem("sin_name");
  localStorage.removeItem("sin_return_greeting");
}

function handleForgetRequest() {
  const params = new URLSearchParams(window.location.search);
  if (!params.has("forget")) return false;

  forgetReader();
  window.location.replace("index.html");
  return true;
}

/* Plays the voice note during the name-to-experience transition. */
function playIntroAudio() {
  const audio = new Audio(INTRO_AUDIO_SRC);
  audio.volume = .55;

  const durationPromise = new Promise(resolve => {
    const fallback = setTimeout(() => resolve(INTRO_FADE_FALLBACK_MS), 1200);
    const finish = () => {
      clearTimeout(fallback);
      resolve(Number.isFinite(audio.duration) && audio.duration > 0
        ? audio.duration * 1000
        : INTRO_FADE_FALLBACK_MS);
    };

    audio.addEventListener("loadedmetadata", finish, { once: true });
    audio.addEventListener("error", finish, { once: true });
  });

  // Missing files or browser audio rules should never stop the website flow.
  audio.play().catch(() => {});
  return durationPromise;
}

function startAmbience() {
  if (localStorage.getItem("sin_sound_muted") === "1") return;
  if (ambienceAudio) return;

  ambienceAudio = new Audio(AMBIENCE_AUDIO_SRC);
  ambienceAudio.loop = true;
  ambienceAudio.volume = .30;
  ambienceAudio.play().catch(() => {});
  sessionStorage.setItem("sin_ambience_started", "1");
  updateSoundToggle();
}

function stopAmbience() {
  if (!ambienceAudio) return;

  ambienceAudio.pause();
  ambienceAudio = null;
  updateSoundToggle();
}

function updateSoundToggle() {
  const toggle = document.querySelector("[data-sound-toggle]");
  if (!toggle) return;

  const muted = localStorage.getItem("sin_sound_muted") === "1";
  toggle.textContent = muted ? "sound on" : "sound off";
}

function bindSoundToggle() {
  const toggle = document.querySelector("[data-sound-toggle]");
  if (!toggle) return;

  updateSoundToggle();
  toggle.addEventListener("click", event => {
    event.preventDefault();

    const muted = localStorage.getItem("sin_sound_muted") === "1";
    if (muted) {
      localStorage.removeItem("sin_sound_muted");
      startAmbience();
    } else {
      localStorage.setItem("sin_sound_muted", "1");
      stopAmbience();
    }

    updateSoundToggle();
  });
}

function bindForgetLinks() {
  document.querySelectorAll("[data-forget-reader]").forEach(link => {
    link.addEventListener("click", event => {
      event.preventDefault();
      forgetReader();
      window.location.href = link.href;
    });
  });
}

/* Draw a slightly different crack on every page, then reveal it based on progress. */
function initCrack() {
  if (!crackPath) return;

  let d = "M2 0";
  for (let y = 20; y <= 1000; y += 16) {
    const x = 2 + (Math.random() - .5) * 2.4 + Math.sin(y * .018) * .7;
    d += ` L${x.toFixed(2)} ${y}`;

    if (Math.random() < .12) {
      const bx = x + (Math.random() - .5) * 1.5;
      d += ` M${x.toFixed(2)} ${y} l${(bx - x).toFixed(2)} 8`;
    }
  }

  crackPath.setAttribute("d", d);

  const len = crackPath.getTotalLength();
  crackPath.style.strokeDasharray = len;
  crackPath.style.strokeDashoffset = len * (1 - growth / 100);
}

function setCrackProgress(value) {
  growth = Math.min(value, 100);
  if (!crackPath) return;

  const len = crackPath.getTotalLength();
  crackPath.style.strokeDashoffset = len * (1 - growth / 100);
}

function countAnsweredMoments(state) {
  return ["why", "m1", "m2", "m3", "m4", "m5"].filter(key => state[key]).length;
}

/* Fade out the current page before following a link. */
function navigateAfterChoice(link) {
  const stage = document.querySelector(".stage.active");
  if (stage) stage.classList.remove("active");

  setTimeout(() => {
    window.location.href = link.href;
  }, 750);
}

function bindChoiceLinks() {
  document.querySelectorAll("[data-save]").forEach(link => {
    link.addEventListener("click", event => {
      event.preventDefault();

      const key = link.dataset.save;
      const value = link.dataset.mirror;
      const state = saveState({ [key]: value });

      setCrackProgress(countAnsweredMoments(state) * 17);
      navigateAfterChoice(link);
    }, { once: true });
  });
}

function bindRestartLinks() {
  document.querySelectorAll("[data-restart]").forEach(link => {
    link.addEventListener("click", event => {
      event.preventDefault();

      const state = getState();
      const freshState = state.name ? { name: state.name } : {};
      localStorage.setItem(STORAGE_KEY, JSON.stringify(freshState));

      window.location.href = link.href;
    });
  });
}

async function startIntro() {
  const nameGate = document.getElementById("name-gate");
  const nameInput = document.getElementById("name-input");
  const landing = document.getElementById("landing");
  const state = getState();

  if (!nameGate || !nameInput || !landing) return;

  function setReturningGreeting(name) {
    const index = Number(localStorage.getItem("sin_return_greeting") || "0");
    const greeting = returnGreetings[index % returnGreetings.length];

    localStorage.setItem("sin_return_greeting", String(index + 1));
    document.getElementById("l1").textContent = greeting[0];
    document.getElementById("l2").textContent = greeting[1];
    document.getElementById("l3").textContent = name;
  }

  async function revealLanding() {
    landing.classList.add("active");
    await wait(700);
    document.getElementById("l1").classList.add("visible");
    await wait(2400);
    document.getElementById("l2").classList.add("visible");
    await wait(2200);
    document.getElementById("l3").classList.add("visible");
    await wait(1400);
    document.getElementById("why-choices").classList.add("visible");
  }

  if (state.name) {
    nameGate.style.display = "none";
    const forgetLink = document.querySelector("[data-forget-reader]");
    if (forgetLink) forgetLink.style.display = "block";
    setReturningGreeting(state.name);
    await wait(400);
    revealLanding();
    return;
  }

  nameInput.focus();
  nameInput.addEventListener("keydown", async event => {
    if (event.key !== "Enter" || !nameInput.value.trim()) return;

    nameInput.disabled = true;
    saveState({ name: nameInput.value.trim().toLowerCase() });
    localStorage.setItem("sin_name", nameInput.value.trim().toLowerCase());

    const transitionMs = await playIntroAudio();
    startAmbience();
    nameGate.style.transitionDuration = `${transitionMs}ms`;
    nameGate.style.opacity = "0";

    setTimeout(() => {
      nameGate.style.display = "none";
      revealLanding();
    }, transitionMs);
  });
}

function buildMirrorText(state) {
  const nameLine = state.name ? `the book is not finished with you, ${state.name}.` : "the book is not finished with you.";
  const template = `the page noticed you could not stop even when you wanted to. you have felt that before - the thing you keep returning to even knowing the cost. you know what that is. you just don't always say its name.

you could not look away from the sixth attempt and you know what that says. you kept reading anyway. the book is not judging you for that. it is just noting it.

you stopped at the goodbye letters. you sat with it. you gave that moment the weight it deserved. not everyone does.

after the last page you felt something you still haven't named. the book is comfortable with that. it was written in the same language.

${nameLine}`;

  return template
    .replace("could not stop even when you wanted to", state.m1 || "could not stop even when you wanted to")
    .replace("could not look away from the sixth attempt", `you ${state.m1 || "could not look away"} from the sixth attempt`)
    .replace("you stopped at the goodbye letters", `you ${state.m4 || "stopped at the goodbye letters"}`)
    .replace("felt something you still haven't named", `you ${state.m5 || "felt something you still haven't named"}`);
}

async function typeMirror(finalText, state) {
  const el = document.getElementById("mirror-text");
  if (!el) return;

  el.style.opacity = "1";
  el.innerHTML = "";
  el.style.whiteSpace = "pre-wrap";

  let i = 0;
  let slipIndex = 0;
  let peekIndex = 0;
  const cursor = '<span id="cursor">|</span>';
  const slips = [
    { at: finalText.indexOf("wanted to") + 9, wrong: " too", correct: " to" },
    { at: finalText.indexOf("noticed"), wrong: " notticed", correct: " noticed" },
    { at: finalText.indexOf("knowing the cost") + 5, wrong: " the the cost", correct: " the cost" },
    { at: finalText.indexOf("judging"), wrong: " jugding", correct: " judging" }
  ].filter(slip => slip.at >= 0);

  const peeks = [];
  if (state.m1 && state.m1.includes("couldn't look away")) peeks.push({ at: 80, text: " Eden" });
  if (state.m4 && state.m4.includes("recognised")) peeks.push({ at: 200, text: " - S.I.N." });
  if (state.m5 && state.m5.includes("haven't named")) peeks.push({ at: 320, text: " Survive in Nothingness" });

  while (i < finalText.length) {
    if (peekIndex < peeks.length && i >= peeks[peekIndex].at) {
      const peek = peeks[peekIndex].text;

      for (let c = 0; c < peek.length; c++) {
        el.innerHTML = finalText.slice(0, i) + peek.slice(0, c + 1) + cursor;
        await wait(38);
      }

      await wait(520);

      for (let c = peek.length; c > 0; c--) {
        el.innerHTML = finalText.slice(0, i) + peek.slice(0, c - 1) + cursor;
        await wait(26);
      }

      peekIndex++;
      await wait(140);
    }

    if (slipIndex < slips.length && i === slips[slipIndex].at) {
      const slip = slips[slipIndex];
      el.innerHTML = finalText.slice(0, i) + slip.wrong + cursor;
      await wait(220);

      for (let b = 0; b < slip.wrong.length; b++) {
        el.innerHTML = finalText.slice(0, i) + slip.wrong.slice(0, slip.wrong.length - b - 1) + cursor;
        await wait(32);
      }

      el.innerHTML = finalText.slice(0, i) + slip.correct + cursor;
      await wait(110);
      i += slip.correct.length;
      slipIndex++;
      continue;
    }

    const char = finalText[i];
    if (Math.random() < .04 && /[a-z]/.test(char)) {
      const wrong = char === "e" ? "a" : String.fromCharCode(char.charCodeAt(0) + 1);
      el.innerHTML = finalText.slice(0, i) + wrong + cursor;
      await wait(70);
      el.innerHTML = finalText.slice(0, i) + cursor;
      await wait(45);
    }

    el.innerHTML = finalText.slice(0, i + 1) + cursor;
    i++;
    await wait(28 + Math.random() * 22);
    if (finalText[i - 1] === ".") await wait(280);
  }

  el.textContent = finalText;
}

function startMirror() {
  const state = getState();
  typeMirror(buildMirrorText(state), state);
}

const NOTES_BACKEND = {
  // set to false for 100% local (completely free, no server)
  enabled: false,

  // --- OPTION: free Supabase (uncomment and fill in) ---
  // enabled: true,
  // fetchUrl: "https://YOUR-PROJECT.supabase.co/rest/v1/notes?select=name,text,time&order=time.desc&limit=200",
  // submitUrl: "https://YOUR-PROJECT.supabase.co/rest/v1/notes",
  // headers: {
  //   "Content-Type": "application/json",
  //   "apikey": "YOUR-ANON-KEY",
  //   "Authorization": "Bearer YOUR-ANON-KEY",
  //   "Prefer": "return=minimal"
  // }
};

const completions = [
  "never stopped looking",
  "was sorry it took this long",
  "am still here",
  "said her name at the end",
  "kept the light on",
  "didn't know how to stay either",
  "remembered",
  "tried to warn you",
  "left the door unlocked",
  "carried it for you",
  "am still trying",
  "didn't leave",
  "waited",
  "understood finally",
  "am not clean either"
];

async function fetchRemoteNotes() {
  if (!NOTES_BACKEND.enabled || !NOTES_BACKEND.fetchUrl) return [];

  try {
    const response = await fetch(NOTES_BACKEND.fetchUrl, { headers: NOTES_BACKEND.headers });
    if (!response.ok) throw new Error("Failed to load remote notes");
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.warn("Remote notes fetch failed:", error);
    return [];
  }
}

async function submitRemoteNote(note) {
  if (!NOTES_BACKEND.enabled || !NOTES_BACKEND.submitUrl) return false;

  try {
    const response = await fetch(NOTES_BACKEND.submitUrl, {
      method: "POST",
      headers: NOTES_BACKEND.headers,
      body: JSON.stringify(note)
    });
    return response.ok;
  } catch (error) {
    console.warn("Remote note submission failed:", error);
    return false;
  }
}

async function getWallNotes() {
  const [remote, local] = await Promise.all([fetchRemoteNotes(), Promise.resolve(JSON.parse(localStorage.getItem("sin_notes") || "[]"))]);

  const localTexts = new Set(local.map(note => note.text));
  const merged = [...remote];
  local.forEach(note => {
    if (!remote.some(remoteNote => remoteNote.text === note.text && remoteNote.name === note.name)) {
      merged.push(note);
    }
  });

  return merged.filter((note, index, self) => self.findIndex(item => item.text === note.text && item.name === note.name) === index);
}

function createNote(text, isUser, name = "") {
  const note = document.createElement("div");
  note.className = `note${isUser ? " user" : ""}`;
  note.textContent = `if you find her, tell her I - ${text}`;

  if (name && !isUser) {
    const sig = document.createElement("span");
    sig.className = "note-signature";
    sig.textContent = `â€” ${name}`;
    note.appendChild(sig);
  }

  note.style.left = `${4 + Math.random() * 68}%`;
  note.style.top = `${8 + Math.random() * 62}%`;
  note.style.transform = `rotate(${(Math.random() * 16 - 8).toFixed(1)}deg)`;
  note.style.zIndex = isUser ? 100 : Math.floor(Math.random() * 12) + 1;

  let dragging = false;
  let startX = 0;
  let startY = 0;
  let startLeft = 0;
  let startTop = 0;

  note.addEventListener("pointerdown", event => {
    dragging = true;
    note.setPointerCapture(event.pointerId);
    startX = event.clientX;
    startY = event.clientY;

    const rect = note.getBoundingClientRect();
    startLeft = rect.left;
    startTop = rect.top;
    note.style.zIndex = 200;
    event.preventDefault();
  });

  note.addEventListener("pointermove", event => {
    if (!dragging) return;

    note.style.left = `${((startLeft + event.clientX - startX) / window.innerWidth) * 100}%`;
    note.style.top = `${((startTop + event.clientY - startY) / window.innerHeight) * 100}%`;
  });

  note.addEventListener("pointerup", () => {
    dragging = false;
  });

  return note;
}

function submitNote() {
  const input = document.getElementById("wall-input");
  const wall = document.getElementById("wall-notes");
  if (!input || !wall || input.dataset.submitted) return;

  input.dataset.submitted = "1";
  const value = input.value.trim();
  const promptWrap = document.getElementById("wall-prompt-wrap");

  promptWrap.style.opacity = "0";
  setTimeout(() => {
    promptWrap.style.display = "none";
  }, 900);

  wall.classList.add("show");

  const state = getState();
  const userNote = createNote(value || "-", true);
  userNote.style.opacity = "0";
  userNote.style.transition = "opacity 1.6s ease, transform 1.6s ease";
  userNote.style.left = "50%";
  userNote.style.top = "44%";
  userNote.style.transform = "translateX(-50%) translateY(10px) rotate(0deg) scale(.92)";
  wall.appendChild(userNote);

  requestAnimationFrame(() => {
    setTimeout(() => {
      userNote.style.opacity = "1";
      userNote.style.transform = "translateX(-50%) translateY(0) rotate(-2deg) scale(1)";
    }, 120);
  });

  const noteObject = { text: value || "-", name: state.name || "anon", time: Date.now() };
  const allNotes = JSON.parse(localStorage.getItem("sin_notes") || "[]");
  allNotes.push(noteObject);
  localStorage.setItem("sin_notes", JSON.stringify(allNotes.slice(-50)));

  if (NOTES_BACKEND.enabled) {
    submitRemoteNote(noteObject).then(success => {
      if (!success) {
        console.warn("Saved note locally because remote backend was unavailable.");
      }
    });
  }

  setCrackProgress(100);
  setTimeout(showFinal, 2800);
}

async function loadWallNotes() {
  const wall = document.getElementById("wall-notes");
  if (!wall) return;

  const notes = await getWallNotes();

  notes.forEach(note => {
    wall.appendChild(createNote(note.text, false, note.name));
  });

  completions.forEach(text => {
    if (!notes.find(note => note.text === text)) {
      wall.appendChild(createNote(text, false, ""));
    }
  });
}

function showFinal() {
  document.getElementById("final-line").classList.add("visible");

  setTimeout(() => {
    document.getElementById("blackout").style.opacity = "1";

    const bye = document.getElementById("bye-name");
    const state = getState();
    if (bye && state.name) {
      bye.textContent = `bye ${state.name}`;
      setTimeout(() => {
        bye.style.opacity = ".38";
      }, 800);
    }
  }, 5600);
}

async function startWall() {
  const input = document.getElementById("wall-input");
  if (!input) return;

  await loadWallNotes();
  input.focus();
  input.addEventListener("keydown", event => {
    if (event.key === "Enter") submitNote();
  });
}

window.addEventListener("load", () => {
  if (handleForgetRequest()) return;

  const state = getState();
  setCrackProgress(countAnsweredMoments(state) * 17);
  initCrack();
  bindChoiceLinks();
  bindRestartLinks();
  bindForgetLinks();
  bindSoundToggle();

  if (sessionStorage.getItem("sin_ambience_started") === "1") {
    startAmbience();
  }

  const page = document.body.dataset.page;
  if (page === "intro") startIntro();
  if (page === "mirror") startMirror();
  if (page === "wall") startWall();
});