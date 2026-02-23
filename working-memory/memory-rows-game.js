const SIZE = 5;
    const ROUNDS_PER_LEVEL = 5;

    const GRID = document.getElementById("grid");
    const levelEl = document.getElementById("levelValue");
    const scoreEl = document.getElementById("scoreValue");
    const livesEls = [...document.querySelectorAll(".life")];

    const timerChip = document.getElementById("timerChip");
    const timerMode = document.getElementById("timerMode");
    const timerNumber = document.getElementById("timerNumber");
    const timerTag = document.getElementById("timerTag");

    const countFill = document.getElementById("countFill");
    const waitOverlay = document.getElementById("waitOverlay");

    const levelModal = document.getElementById("levelModal");
    const modalTitle = document.getElementById("modalTitle");
    const modalText = document.getElementById("modalText");
    const scoreLabel = document.getElementById("scoreLabel");
    const modalScore = document.getElementById("modalScore");
    const startLevelBtn = document.getElementById("startLevelBtn");
    const highScoreTitle = document.getElementById("highScoreTitle");
    const highScoreList = document.getElementById("highScoreList");
    const initialsEntry = document.getElementById("initialsEntry");
    const initialsValue = document.getElementById("initialsValue");
    const initialsKeyboard = document.getElementById("initialsKeyboard");
    const saveInitialsBtn = document.getElementById("saveInitialsBtn");

    const HIGHSCORE_STORAGE_KEY = "llk.highscores.memory-rows-game";
    const HIGHSCORE_LIMIT = 3;
    const INITIALS_MAX_LEN = 3;

    let gameOver = false;
    let awaitingHighScoreEntry = false;
    let initialsDraft = "";


    let score = 0;
    let lives = 3;

    let level = 1;
    let roundsInLevel = 0;

    // "idle" | "baiting" | "countdown" | "choose" | "resolved" | "gameover"
    let phase = "idle";

    let baitRows = [];
    let targetRow = null;
    let targetCol = null;
    let lateBlockThisRound = false;

    let countdownTimer = null;
    let countdownRAF = null;
    let waitTimeout = null;

    const rowEls = [];
    const cellEls = Array.from({ length: SIZE }, () => Array(SIZE).fill(null));

    for (let r = 0; r < SIZE; r++){
      const row = document.createElement("div");
      row.className = "row blocked";
      row.dataset.row = r;

      const blocker = document.createElement("div");
      blocker.className = "blocker";
      row.appendChild(blocker);

      for (let c = 0; c < SIZE; c++){
        const btn = document.createElement("button");
        btn.className = "cell";
        btn.type = "button";
        btn.dataset.row = r;
        btn.dataset.col = c;

        btn.addEventListener("pointerdown", () => btn.classList.add("pressed"));
        const unpress = () => btn.classList.remove("pressed");
        btn.addEventListener("pointerup", unpress);
        btn.addEventListener("pointercancel", unpress);
        btn.addEventListener("pointerleave", unpress);

        btn.addEventListener("click", () => onCellClick(r, c));

        row.appendChild(btn);
        cellEls[r][c] = btn;
      }

      GRID.appendChild(row);
      rowEls.push(row);
    }

    function setScore(v){
      score = Math.max(0, Number(v) || 0);
      scoreEl.textContent = score;
    }

    function setLives(v){
      lives = Math.max(0, Math.min(3, Number(v) || 0));
      livesEls.forEach((el, i) => el.classList.toggle("lost", i >= lives));
    }

    function setLevel(v){
      level = Math.max(1, Math.min(5, Number(v) || 1));
      levelEl.textContent = String(level);
    }

    function basePointsForLevel(lvl){
      if (lvl <= 1) return 100;
      return (lvl - 1) * 100;
    }

    function baitRowCountForLevel(lvl){
      return Math.min(SIZE, lvl + 1);
    }

    function shouldLateBlockForThisRound(){
      if (level < 5){
        return roundsInLevel >= 2;
      }
      if (roundsInLevel < 5){
        return roundsInLevel >= 2;
      }
      return Math.random() < 0.5;
    }

    function setRowBlocked(r, blocked){
      rowEls[r].classList.toggle("blocked", !!blocked);
    }

    function blockAllRows(){
      for (let r = 0; r < SIZE; r++) setRowBlocked(r, true);
    }

    function clearAllCellMarks(){
      for (let r = 0; r < SIZE; r++){
        for (let c = 0; c < SIZE; c++){
          cellEls[r][c].classList.remove("reward-show", "correct", "wrong");
        }
      }
    }

    function showLevelModal(show){
      levelModal.classList.toggle("show", !!show);
    }

    function todayStamp(){
      const now = new Date();
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, "0");
      const d = String(now.getDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    }

    function loadTodayHighScores(){
      const today = todayStamp();
      try{
        const raw = localStorage.getItem(HIGHSCORE_STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (!parsed || parsed.date !== today || !Array.isArray(parsed.entries)) return [];
        return parsed.entries
          .filter((entry) => Number.isFinite(entry.score) && typeof entry.initials === "string")
          .sort((a, b) => b.score - a.score || a.ts - b.ts)
          .slice(0, HIGHSCORE_LIMIT);
      } catch {
        return [];
      }
    }

    function saveTodayHighScores(entries){
      const payload = { date: todayStamp(), entries: entries.slice(0, HIGHSCORE_LIMIT) };
      localStorage.setItem(HIGHSCORE_STORAGE_KEY, JSON.stringify(payload));
    }

    function isHighScore(scoreValue){
      if (scoreValue <= 0) return false;
      const entries = loadTodayHighScores();
      if (entries.length < HIGHSCORE_LIMIT) return true;
      return scoreValue > entries[entries.length - 1].score;
    }

    function renderHighScoreList(){
      const entries = loadTodayHighScores();
      highScoreList.innerHTML = "";
      entries.forEach((entry) => {
        const li = document.createElement("li");
        li.textContent = `${entry.initials} - ${entry.score}`;
        highScoreList.appendChild(li);
      });
      while (highScoreList.children.length < HIGHSCORE_LIMIT){
        const li = document.createElement("li");
        li.textContent = "---";
        highScoreList.appendChild(li);
      }
    }

    function updateInitialsValue(){
      initialsValue.textContent = initialsDraft.padEnd(INITIALS_MAX_LEN, "_").split("").join(" ");
    }

    function setHighScoreUiVisible(visible){
      highScoreTitle.classList.toggle("hidden", !visible);
      highScoreList.classList.toggle("hidden", !visible);
    }

    function setInitialsUiVisible(visible){
      initialsEntry.classList.toggle("hidden", !visible);
      saveInitialsBtn.classList.toggle("hidden", !visible);
    }

    function resetModalExtras(){
      awaitingHighScoreEntry = false;
      initialsDraft = "";
      updateInitialsValue();
      setHighScoreUiVisible(false);
      setInitialsUiVisible(false);
    }

    function setupKeyboard(){
      const keys = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
      initialsKeyboard.innerHTML = "";
      keys.forEach((key) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "keyBtn";
        btn.textContent = key;
        btn.dataset.key = key;
        initialsKeyboard.appendChild(btn);
      });

      const backBtn = document.createElement("button");
      backBtn.type = "button";
      backBtn.className = "keyBtn wide";
      backBtn.textContent = "Back";
      backBtn.dataset.key = "BACK";
      initialsKeyboard.appendChild(backBtn);

      const clearBtn = document.createElement("button");
      clearBtn.type = "button";
      clearBtn.className = "keyBtn wide";
      clearBtn.textContent = "Clear";
      clearBtn.dataset.key = "CLEAR";
      initialsKeyboard.appendChild(clearBtn);
    }

    function handleInitialKey(key){
      if (!awaitingHighScoreEntry) return;
      if (key === "BACK"){
        initialsDraft = initialsDraft.slice(0, -1);
      } else if (key === "CLEAR"){
        initialsDraft = "";
      } else if (/^[A-Z]$/.test(key) && initialsDraft.length < INITIALS_MAX_LEN){
        initialsDraft += key;
      }
      updateInitialsValue();
    }

    function saveCurrentScoreWithInitials(){
      if (!awaitingHighScoreEntry || initialsDraft.length === 0) return;
      const entries = loadTodayHighScores();
      entries.push({ initials: initialsDraft, score, ts: Date.now() });
      entries.sort((a, b) => b.score - a.score || a.ts - b.ts);
      saveTodayHighScores(entries.slice(0, HIGHSCORE_LIMIT));

      awaitingHighScoreEntry = false;
      setInitialsUiVisible(false);
      setHighScoreUiVisible(true);
      renderHighScoreList();
      modalTitle.textContent = "Game Over";
      modalText.textContent = "";
      startLevelBtn.textContent = "Go Back";
    }

    function showGameOverModal(){
      gameOver = true;
      levelModal.classList.add("gameOverLayout");
      modalTitle.textContent = "Game Over";
      modalText.textContent = "";
      scoreLabel.textContent = "Out of lives! Final Score:";
      modalScore.textContent = `${score}`;
      setHighScoreUiVisible(true);
      renderHighScoreList();
      if (isHighScore(score)){
        awaitingHighScoreEntry = true;
        initialsDraft = "";
        updateInitialsValue();
        modalTitle.textContent = "New High Score!";
        modalText.textContent = "You made today's top 3. Enter your initials.";
        setInitialsUiVisible(true);
        startLevelBtn.textContent = "Skip";
      } else {
        setInitialsUiVisible(false);
        modalText.textContent = "";
        startLevelBtn.textContent = "Go Back";
      }
      showLevelModal(true);
    }

    function updateLevelModalText(){
      levelModal.classList.remove("gameOverLayout");
      resetModalExtras();
      const baitCount = baitRowCountForLevel(level);
      const base = basePointsForLevel(level);

      let levelTitle;
      if (level == 1){
        levelTitle = "How To Play";
      }else{
        levelTitle = `Level ${level}`;
      }

      modalTitle.textContent = levelTitle;

      let levelInfo;
      if (level > 1){
        levelInfo = `You will now see rewards in ${baitCount} rows. As before, remember their locations until the end of the countdown`;
      } else {
        levelInfo =  `You will briefly see a reward placed randomly on 2 different rows of the board. \n \n Remember their locations until the end of the countdown and choose the box with a reward inside.`;
        setHighScoreUiVisible(true);
        renderHighScoreList();

      }

      modalText.textContent =levelInfo;
    }

    function showTimerChip(show){
      timerChip.classList.toggle("show", !!show);
    }

    function resetFill(){
      countFill.style.setProperty("--p", "0%");
      countFill.classList.remove("active");
    }

    function stopCountdown(){
      if (countdownTimer) clearInterval(countdownTimer);
      countdownTimer = null;
      if (countdownRAF) cancelAnimationFrame(countdownRAF);
      countdownRAF = null;
    }

    function randomInt(n){ return Math.floor(Math.random() * n); }

    function sampleDistinct(fromN, k){
      const a = Array.from({length: fromN}, (_, i) => i);
      for (let i = a.length - 1; i > 0; i--){
        const j = randomInt(i + 1);
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a.slice(0, k);
    }

    function sleep(ms){ return new Promise(res => setTimeout(res, ms)); }

    function flashWait(){
      waitOverlay.classList.add("show");
      clearTimeout(waitTimeout);
      waitTimeout = setTimeout(() => waitOverlay.classList.remove("show"), 550);
    }

    async function startRound(){
      phase = "baiting";
      stopCountdown();
      showTimerChip(false);
      clearAllCellMarks();
      blockAllRows();

      resetFill();

      lateBlockThisRound = shouldLateBlockForThisRound();

      const baitCount = baitRowCountForLevel(level);
      baitRows = sampleDistinct(SIZE, baitCount);

      const cols = sampleDistinct(SIZE, baitCount);

      const targetIdx = randomInt(baitCount);
      targetRow = baitRows[targetIdx];
      targetCol = cols[targetIdx];

      for (const r of baitRows) setRowBlocked(r, false);

      for (let i = 0; i < baitRows.length; i++){
        cellEls[baitRows[i]][cols[i]].classList.add("reward-show");
      }
      await sleep(1000);

      for (let i = 0; i < baitRows.length; i++){
        cellEls[baitRows[i]][cols[i]].classList.remove("reward-show");
      }

      if (!lateBlockThisRound){
        for (const r of baitRows){
          if (r !== targetRow) setRowBlocked(r, true);
        }
      }

      phase = "countdown";
      startCountdown(10);
    }

    function startCountdown(seconds){
      stopCountdown();

      showTimerChip(true);

      countFill.classList.add("active");
      countFill.style.setProperty("--p", "0%");

      const totalMs = seconds * 1000;
      const start = performance.now();
      let lastWhole = seconds;

      timerNumber.textContent = String(seconds);

      const tickFill = (now) => {
        const elapsed = now - start;
        const p = Math.min(1, elapsed / totalMs);
        countFill.style.setProperty("--p", (p * 100).toFixed(2) + "%");
        if (p < 1) countdownRAF = requestAnimationFrame(tickFill);
      };
      countdownRAF = requestAnimationFrame(tickFill);

      countdownTimer = setInterval(() => {
        const elapsed = performance.now() - start;
        const remaining = Math.max(0, Math.ceil((totalMs - elapsed) / 1000));
        if (remaining !== lastWhole){
          lastWhole = remaining;
          timerNumber.textContent = String(remaining);
        }

        if (elapsed >= totalMs){
          stopCountdown();
          timerNumber.textContent = "0";
          countFill.style.setProperty("--p", "100%");

          if (lateBlockThisRound){
            for (const r of baitRows){
              if (r !== targetRow) setRowBlocked(r, true);
            }
          }

          phase = "choose";

          setTimeout(() => {
            showTimerChip(false);
          }, 350);
        }
      }, 90);
    }

    function revealOutcome(chosenR, chosenC, chosenBtn){
      const correctBtn = cellEls[targetRow][targetCol];
      correctBtn.classList.add("reward-show");

      if (chosenR === targetRow && chosenC === targetCol){
        chosenBtn.classList.add("correct");
      } else {
        chosenBtn.classList.add("wrong");
        correctBtn.classList.add("correct");
      }
    }

    async function endRoundAndMaybeLevelUp(){
      await sleep(900);

      clearAllCellMarks();
      blockAllRows();

      if (level < 5){
        roundsInLevel += 1;
        if (roundsInLevel >= ROUNDS_PER_LEVEL){
          roundsInLevel = 0;
          setLevel(level + 1);
          updateLevelModalText();
          showLevelModal(true);
          phase = "idle";
          return;
        }
      } else {
        roundsInLevel += 1;
      }

      if (lives > 0){
        phase = "idle";
        startRound();
      }
    }

    function onCellClick(r, c){
      const btn = cellEls[r][c];

      if (phase === "baiting" || phase === "countdown"){
        flashWait();
        return;
      }
      if (phase !== "choose") return;

      if (r !== targetRow) return;

      resetFill();

      phase = "resolved";

      const correct = (r === targetRow && c === targetCol);
      const base = basePointsForLevel(level);
      const points = correct ? (lateBlockThisRound ? base * 2 : base) : 0;

      if (correct){
        setScore(score + points);
      } else {
        setLives(lives - 1);
      }

      revealOutcome(r, c, btn);

      if (lives <= 0){
  setTimeout(() => {
    showGameOverModal();
  }, 900);
  return;
}


      endRoundAndMaybeLevelUp();
    }

    startLevelBtn.addEventListener("click", () => {
  if (gameOver) {
  window.parent.postMessage(
    { type: "CLOSE_IFRAME_MODAL" },
    "*"
  );
  return;
}
  showLevelModal(false);
  startRound();
});

    initialsKeyboard.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const key = target.dataset.key;
      if (!key) return;
      handleInitialKey(key);
    });

    saveInitialsBtn.addEventListener("click", () => {
      saveCurrentScoreWithInitials();
    });

    window.addEventListener("keydown", (event) => {
      if (event.shiftKey && event.key.toLowerCase() === "g"){
        event.preventDefault();
        lives = 0;
        setLives(0);
        stopCountdown();
        showTimerChip(false);
        resetFill();
        phase = "gameover";
        showGameOverModal();
      }
    });


    function init(){
  gameOver = false;
  levelModal.classList.remove("gameOverLayout");
  startLevelBtn.textContent = "START";
  scoreLabel.textContent = "";
  modalScore.textContent = "";
  resetModalExtras();

  setScore(0);
  setLives(3);
  setLevel(1);
  roundsInLevel = 0;
  phase = "idle";
  blockAllRows();
  clearAllCellMarks();
  showTimerChip(false);
  resetFill();
  updateLevelModalText();
  showLevelModal(true);
}


    setupKeyboard();
    init();
