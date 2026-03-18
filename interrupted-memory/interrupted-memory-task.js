const MAX_LEVEL = 15;
const CUP_X = [16.66, 50, 83.33];
const OBJECTS = ["🍎", "🍌", "🐟", "🍇", "🌽", "🥝", "🍉", "🍒", "🥕", "🥥"];

const OBJECT_THEMES = [
  { bg: "#ffe7ac", fg: "#503600", border: "#d39b00" },
  { bg: "#fff4b2", fg: "#4a3b00", border: "#cab200" },
  { bg: "#d9f3ff", fg: "#003a56", border: "#2f88a8" },
  { bg: "#e8d9ff", fg: "#3c215f", border: "#7e56b2" },
  { bg: "#d8fff3", fg: "#004d3b", border: "#1f9d7b" },
  { bg: "#ffe0d1", fg: "#5a2a17", border: "#be6840" },
  { bg: "#ffd8ea", fg: "#5a1d3c", border: "#bc4f83" },
  { bg: "#ffe0df", fg: "#5d1f1c", border: "#cc5f57" },
  { bg: "#f7efcf", fg: "#4a3b1f", border: "#b59c58" },
  { bg: "#ffe9c6", fg: "#533915", border: "#ca8d32" },
];
const UNKNOWN_THEME = { bg: "#e8eff5", fg: "#29475d", border: "#8ea7bb" };

const levelEl = document.getElementById("levelValue");
const scoreEl = document.getElementById("scoreValue");
const phaseEl = document.getElementById("phaseValue");
const livesEls = [...document.querySelectorAll(".life")];

const sampleWrap = document.getElementById("sampleWrap");
const cupsWrap = document.getElementById("cupsWrap");
const choicesWrap = document.getElementById("choicesWrap");
const board = document.getElementById("board");

const sampleCard = document.getElementById("sampleCard");
const choiceButtons = [...document.querySelectorAll(".choiceCard")];

const cupsTitle = document.getElementById("cupsTitle");
const token = document.getElementById("token");
const cups = [...document.querySelectorAll(".cup")];

const levelModal = document.getElementById("levelModal");
const modalTitle = document.getElementById("modalTitle");
const modalText = document.getElementById("modalText");
const scoreLabel = document.getElementById("scoreLabel");
const modalScore = document.getElementById("modalScore");
const startLevelBtn = document.getElementById("startLevelBtn");

let level = 1;
let score = 0;
let lives = 3;
let roundsInLevel = 0;
let phase = "idle";
let gameOver = false;

let roundSampleObject = "🍎";
let choiceOrder = [];

let roundTokenCup = 0;
let cupPositions = [0, 1, 2];
let blockedInput = false;
let cupGuessActive = false;
let cupGuessResolver = null;
let shownSection = null;
let phaseSwapTimeoutId = null;
let lastCorrectChoiceIdx = -1;
let rightmostCorrectStreak = 0;

function sleep(ms){
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomInt(n){
  return Math.floor(Math.random() * n);
}

function pickDistinctObjects(count, excluded = []){
  const excludedSet = new Set(excluded);
  const pool = OBJECTS.filter((obj) => !excludedSet.has(obj));
  const picks = [];
  while (picks.length < count && pool.length > 0){
    const idx = randomInt(pool.length);
    picks.push(pool[idx]);
    pool.splice(idx, 1);
  }
  return picks;
}

function getChoiceCountForLevel(levelNumber){
  if (levelNumber >= 5) return 4;
  if (levelNumber >= 3) return 3;
  return 2;
}

function roundsForLevel(levelNumber){
  return levelNumber + 1;
}

function getLevelConfig(levelNumber){
  const lvl = Math.max(1, Math.min(MAX_LEVEL, levelNumber));
  const t = lvl - 1;
  const interruption = lvl >= 2;
  return {
    roundPoints: Math.round(40 + t * 8),
    sampleMs: Math.max(560, 1400 - t * 65),
    interruption,
    swaps: interruption ? Math.min(3 + t * 2, 31) : 0,
    swapMs: interruption ? Math.max(170, 540 - t * 24) : 0,
    cupBonus: interruption ? Math.round(180 + (lvl - 2) * 18) : 0,
  };
}

function setPhase(text){
  if (phaseEl) phaseEl.textContent = text;
}

function setLevel(v){
  level = Math.max(1, Math.min(MAX_LEVEL, v));
  levelEl.textContent = String(level);
}

function setScore(v){
  score = Math.max(0, v);
  scoreEl.textContent = String(score);
}

function setLives(v){
  lives = Math.max(0, Math.min(3, v));
  livesEls.forEach((el, i) => el.classList.toggle("lost", i >= lives));
}

function applyCardTheme(cardEl, objectSymbol){
  const idx = OBJECTS.indexOf(objectSymbol);
  const theme = idx >= 0 ? OBJECT_THEMES[idx % OBJECT_THEMES.length] : UNKNOWN_THEME;
  cardEl.style.setProperty("--card-bg", theme.bg);
  cardEl.style.setProperty("--card-fg", theme.fg);
  cardEl.style.setProperty("--card-border", theme.border);
}

function triggerPhaseSwap(){
  if (!board) return;
  board.classList.remove("phaseSwap");
  void board.offsetWidth;
  board.classList.add("phaseSwap");
  if (phaseSwapTimeoutId) clearTimeout(phaseSwapTimeoutId);
  phaseSwapTimeoutId = setTimeout(() => {
    board.classList.remove("phaseSwap");
    phaseSwapTimeoutId = null;
  }, 180);
}

function triggerCupsFadeIn(){
  cupsWrap.classList.remove("cupsFadeIn");
  void cupsWrap.offsetWidth;
  cupsWrap.classList.add("cupsFadeIn");
}

function showOnly(section){
  if (section !== shownSection){
    shownSection = section;
    triggerPhaseSwap();
  }
  sampleWrap.classList.toggle("hidden", section !== "sample");
  cupsWrap.classList.toggle("hidden", section !== "cups");
  choicesWrap.classList.toggle("hidden", section !== "choices");
}

function showLevelModal(show){
  levelModal.classList.toggle("show", !!show);
}

function showGameOverModal(){
  gameOver = true;
  setPhase("Finished");
  startLevelBtn.classList.remove("largeStart");
  levelModal.classList.remove("briefNotice");
  modalTitle.textContent = "Game Over";
  modalText.textContent = "";
  scoreLabel.textContent = "Final Score";
  modalScore.textContent = String(score);
  startLevelBtn.textContent = "Go Back";
  startLevelBtn.classList.remove("hidden");
  showLevelModal(true);
}

function configureLevelModalForRules(levelNumber){
  levelModal.classList.remove("briefNotice");
  modalTitle.textContent = levelNumber === 1 ? "" : `Level ${levelNumber}`;
  modalText.textContent = "";

  scoreLabel.textContent = "";
  modalScore.textContent = "";
  startLevelBtn.textContent = levelNumber === 1 ? "Start Game" : "Start Level";
  startLevelBtn.classList.toggle("largeStart", levelNumber === 1);
  startLevelBtn.classList.remove("hidden");
}

function updateModalForLevel(){
  configureLevelModalForRules(level);
}

function placeCup(cupEl, slot){
  cupEl.style.left = `${CUP_X[slot]}%`;
}

function placeTokenUnderCup(cupIndex){
  const slot = cupPositions[cupIndex];
  token.style.left = `${CUP_X[slot]}%`;
}

function resetCupLayout(){
  cupPositions = [0, 1, 2];
  cups.forEach((cupEl, cupIdx) => placeCup(cupEl, cupPositions[cupIdx]));
}

function chooseSwapPair(){
  const pairs = [[0, 1], [1, 2], [0, 2]];
  return pairs[randomInt(pairs.length)];
}

function resolveCupGuess(cupIdx){
  if (!cupGuessActive || !cupGuessResolver) return;
  cupGuessActive = false;
  const resolver = cupGuessResolver;
  cupGuessResolver = null;
  resolver(cupIdx === roundTokenCup);
}

async function waitForCupGuess(cfg){
  setPhase("Cup Guess");
  cupsTitle.textContent = "Pick the cup with the hidden reward";
  cupsWrap.classList.add("guessMode");

  const correctGuess = await new Promise((resolve) => {
    cupGuessActive = true;
    cupGuessResolver = resolve;
  });

  cupsWrap.classList.remove("guessMode");

  cups[roundTokenCup].classList.add("peek");
  token.classList.remove("tokenHidden");

  if (correctGuess){
    setScore(score + cfg.cupBonus);
    cupsTitle.textContent = `Correct cup! +${cfg.cupBonus} bonus`;
  } else {
    cupsTitle.textContent = "Wrong cup";
  }

  await sleep(900);
  cups.forEach((cup) => cup.classList.remove("peek"));
  token.classList.add("tokenHidden");
  await sleep(220);
}

async function runCupInterruption(cfg){
  setPhase("Shuffle");
  cupsTitle.textContent = "Watch the hidden reward";
  resetCupLayout();

  roundTokenCup = randomInt(3);
  placeTokenUnderCup(roundTokenCup);
  token.classList.remove("tokenHidden");
  cups.forEach((cup) => cup.classList.add("peek"));

  showOnly("cups");
  triggerCupsFadeIn();
  await sleep(1150);
  cups.forEach((cup) => cup.classList.remove("peek"));
  await sleep(320);

  token.classList.add("tokenHidden");

  for (let i = 0; i < cfg.swaps; i++){
    const [a, b] = chooseSwapPair();
    [cupPositions[a], cupPositions[b]] = [cupPositions[b], cupPositions[a]];
    cups.forEach((cupEl, cupIdx) => {
      cupEl.style.transitionDuration = `${cfg.swapMs}ms`;
      placeCup(cupEl, cupPositions[cupIdx]);
    });
    placeTokenUnderCup(roundTokenCup);
    await sleep(cfg.swapMs + 110);
  }

  await sleep(260);
  await waitForCupGuess(cfg);
}

function renderChoices(correctObj, distractors){
  const shuffledDistractors = [...distractors];
  for (let i = shuffledDistractors.length - 1; i > 0; i--){
    const j = randomInt(i + 1);
    [shuffledDistractors[i], shuffledDistractors[j]] = [shuffledDistractors[j], shuffledDistractors[i]];
  }

  const slotCount = 1 + shuffledDistractors.length;
  let correctIdx = randomInt(slotCount);
  const rightmostIdx = slotCount - 1;

  if (slotCount > 1 && correctIdx === lastCorrectChoiceIdx){
    correctIdx = (correctIdx + 1 + randomInt(slotCount - 1)) % slotCount;
  }
  if (slotCount > 2 && rightmostCorrectStreak >= 1 && correctIdx === rightmostIdx){
    correctIdx = randomInt(rightmostIdx);
  }

  choiceOrder = new Array(slotCount);
  choiceOrder[correctIdx] = correctObj;
  let distractorIdx = 0;
  for (let i = 0; i < slotCount; i++){
    if (i === correctIdx) continue;
    choiceOrder[i] = shuffledDistractors[distractorIdx];
    distractorIdx += 1;
  }

  lastCorrectChoiceIdx = correctIdx;
  if (correctIdx === rightmostIdx){
    rightmostCorrectStreak += 1;
  } else {
    rightmostCorrectStreak = 0;
  }

  const center = (slotCount - 1) / 2;
  choiceButtons.forEach((btn, idx) => {
    const isActive = idx < choiceOrder.length;
    btn.classList.toggle("hidden", !isActive);
    btn.classList.remove("correct", "wrong");

    if (!isActive){
      btn.textContent = "";
      applyCardTheme(btn, null);
      btn.style.setProperty("--choice-shift", "0rem");
      return;
    }

    const obj = choiceOrder[idx];
    btn.textContent = obj;
    applyCardTheme(btn, obj);
    btn.style.setProperty("--choice-shift", `${(center - idx) * 1.05}rem`);
  });

  choicesWrap.dataset.choiceCount = String(choiceOrder.length);
}

async function startRound(){
  blockedInput = true;
  cupGuessActive = false;
  cupGuessResolver = null;
  cupsWrap.classList.remove("guessMode");
  const cfg = getLevelConfig(level);
  phase = "sample";

  choiceButtons.forEach((btn) => btn.classList.remove("correct", "wrong"));

  const choiceCount = getChoiceCountForLevel(level);
  roundSampleObject = OBJECTS[randomInt(OBJECTS.length)];
  const distractors = pickDistinctObjects(choiceCount - 1, [roundSampleObject]);

  setPhase("Remember");
  showOnly("sample");
  sampleCard.classList.remove("sampleGone");
  sampleCard.textContent = roundSampleObject;
  applyCardTheme(sampleCard, roundSampleObject);
  await sleep(cfg.sampleMs);

  sampleCard.classList.add("sampleGone");
  await sleep(220);
  sampleCard.textContent = "";
  await sleep(500);

  if (cfg.interruption){
    await runCupInterruption(cfg);
  }

  setPhase("Choose");
  renderChoices(roundSampleObject, distractors);
  showOnly("choices");
  phase = "choose";
  blockedInput = false;
}

async function resolveChoice(choiceIdx){
  if (phase !== "choose" || blockedInput) return;
  if (choiceIdx < 0 || choiceIdx >= choiceOrder.length) return;
  blockedInput = true;
  phase = "resolved";

  const chosenBtn = choiceButtons[choiceIdx];
  const chosenObject = choiceOrder[choiceIdx];
  const correct = chosenObject === roundSampleObject;
  const correctIdx = choiceOrder.indexOf(roundSampleObject);
  const correctBtn = correctIdx >= 0 ? choiceButtons[correctIdx] : null;

  if (correct){
    chosenBtn.classList.add("correct");
    setScore(score + getLevelConfig(level).roundPoints);
  } else {
    chosenBtn.classList.add("wrong");
    if (correctBtn) correctBtn.classList.add("correct");
    setLives(lives - 1);
  }

  await sleep(850);

  if (lives <= 0){
    showGameOverModal();
    return;
  }

  roundsInLevel += 1;
  if (roundsInLevel >= roundsForLevel(level) && level < MAX_LEVEL){
    roundsInLevel = 0;
    setLevel(level + 1);
    phase = "idle";
    await startRound();
    return;
  }

  phase = "idle";
  await startRound();
}

choiceButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const idx = Number(btn.dataset.choice);
    resolveChoice(Number.isNaN(idx) ? -1 : idx);
  });
});
cups[0].addEventListener("click", () => resolveCupGuess(0));
cups[1].addEventListener("click", () => resolveCupGuess(1));
cups[2].addEventListener("click", () => resolveCupGuess(2));

startLevelBtn.addEventListener("click", async () => {
  if (gameOver){
    window.parent.postMessage({ type: "CLOSE_IFRAME_MODAL" }, "*");
    return;
  }

  showLevelModal(false);
  await startRound();
});

window.addEventListener("keydown", (event) => {
  if (event.shiftKey && event.key.toLowerCase() === "g"){
    event.preventDefault();
    lives = 0;
    setLives(0);
    showGameOverModal();
  }
});

function init(){
  gameOver = false;
  roundsInLevel = 0;
  phase = "idle";
  cupGuessActive = false;
  cupGuessResolver = null;
  setLevel(1);
  setScore(0);
  setLives(3);
  setPhase("Ready");
  showOnly("sample");
  sampleCard.classList.remove("sampleGone");
  applyCardTheme(sampleCard, OBJECTS[0]);
  choiceButtons.forEach((btn) => {
    btn.classList.add("hidden");
    applyCardTheme(btn, null);
  });
  choiceOrder = [];
  lastCorrectChoiceIdx = -1;
  rightmostCorrectStreak = 0;
  choicesWrap.dataset.choiceCount = "2";
  sampleCard.textContent = "🍎";
  resetCupLayout();
  token.classList.add("tokenHidden");
  startLevelBtn.classList.add("largeStart");
  updateModalForLevel();
  showLevelModal(true);
}

init();

