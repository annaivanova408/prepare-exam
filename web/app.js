const els = {
  topicList: document.querySelector("#topicList"),
  termSearch: document.querySelector("#termSearch"),
  topicTitle: document.querySelector("#topicTitle"),
  topicDesc: document.querySelector("#topicDesc"),
  defsCount: document.querySelector("#defsCount"),
  quizCount: document.querySelector("#quizCount"),
  cardsCount: document.querySelector("#cardsCount"),
  definitions: document.querySelector("#definitions"),
  quiz: document.querySelector("#quiz"),
  cards: document.querySelector("#cards"),
  sources: document.querySelector("#sources"),
};

const state = {
  topics: [],
  activeTopicId: null,
  search: "",
};

async function fetchJson(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`${path}: ${response.status}`);
  return response.json();
}

async function loadTopics() {
  const dataBase = window.location.pathname.includes("/web/") ? "../data" : "data";
  const topicsData = await fetchJson(`${dataBase}/topics.json`);
  state.topics = topicsData.topics;
  state.activeTopicId = state.topics[0]?.id || null;
  render();
}

function render() {
  renderTopicList();
  renderTopic();
}

function renderTopicList() {
  const query = state.search.toLowerCase();
  els.topicList.innerHTML = "";
  state.topics
    .filter((topic) => !query || JSON.stringify(topic).toLowerCase().includes(query))
    .forEach((topic) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `topic-button${topic.id === state.activeTopicId ? " active" : ""}`;
      button.textContent = topic.title;
      button.addEventListener("click", () => {
        state.activeTopicId = topic.id;
        render();
      });
      els.topicList.append(button);
    });
}

function renderTopic() {
  const topic = state.topics.find((t) => t.id === state.activeTopicId) || state.topics[0];
  if (!topic) return;

  els.topicTitle.textContent = topic.title;
  els.topicDesc.textContent = topic.description || "";
  els.defsCount.textContent = `${topic.definitions.length} определений`;
  els.quizCount.textContent = `${topic.quiz.length} вопросов`;
  els.cardsCount.textContent = `${topic.flashcards.length} карточек`;

  renderDefinitions(topic);
  renderQuiz(topic);
  renderCards(topic);
  renderSources(topic);
}

function renderDefinitions(topic) {
  const query = els.termSearch.value.trim().toLowerCase();
  const defs = topic.definitions.filter((d) => {
    if (!query) return true;
    return d.term.toLowerCase().includes(query) || d.definition.toLowerCase().includes(query) || d.source.toLowerCase().includes(query);
  });
  if (!defs.length) {
    els.definitions.innerHTML = `<p class="empty">Ничего не найдено.</p>`;
    return;
  }
  els.definitions.innerHTML = defs
    .map(
      (d) => `
        <details class="def">
          <summary>${escapeHtml(d.term)}</summary>
          <p>${escapeHtml(d.definition || "требует дополнения")}</p>
          <div class="source">Источник: ${escapeHtml(fileName(d.source))}</div>
        </details>
      `
    )
    .join("");
}

function renderQuiz(topic) {
  if (!topic.quiz.length) {
    els.quiz.innerHTML = `<p class="empty">требует дополнения</p>`;
    return;
  }
  els.quiz.innerHTML = topic.quiz
    .map((q, index) => {
      const name = `q_${topic.id}_${index}`;
      const opts = ["A", "B", "C", "D", "E"].filter((k) => q.options[k]);
      return `
        <div class="quiz-item" data-qindex="${index}">
          <div class="q">${index + 1}. ${escapeHtml(q.question)}</div>
          <div class="options">
            ${opts
              .map(
                (k) => `
                  <label class="option">
                    <input type="radio" name="${escapeAttr(name)}" value="${k}" />
                    <span>${k}. ${escapeHtml(q.options[k])}</span>
                  </label>
                `
              )
              .join("")}
          </div>
          <div class="quiz-actions">
            <button class="btn primary" type="button" data-check="${index}">Проверить</button>
            <span class="result" id="res_${index}"></span>
          </div>
          <div class="source">Источник: ${escapeHtml(fileName(q.source))}</div>
        </div>
      `;
    })
    .join("");

  els.quiz.querySelectorAll("[data-check]").forEach((button) => {
    button.addEventListener("click", () => {
      const idx = Number(button.dataset.check);
      const q = topic.quiz[idx];
      const container = els.quiz.querySelector(`[data-qindex="${idx}"]`);
      const checked = container.querySelector("input[type=radio]:checked");
      const res = container.querySelector(`#res_${idx}`);
      if (!checked) {
        res.textContent = "Выберите вариант ответа.";
        return;
      }
      if (!q.answer || q.answer === "требует дополнения") {
        res.textContent = `Ответ выбран: ${checked.value}.`;
        return;
      }
      res.textContent = checked.value === q.answer ? "Верно." : `Неверно. Правильный ответ: ${q.answer}`;
    });
  });
}

function renderCards(topic) {
  if (!topic.flashcards.length) {
    els.cards.innerHTML = `<p class="empty">требует дополнения</p>`;
    return;
  }
  els.cards.innerHTML = topic.flashcards
    .map(
      (c, index) => `
        <div class="card" data-card="${index}" role="button" tabindex="0" aria-label="Карточка">
          <div class="label">Вопрос</div>
          <div class="text">${escapeHtml(c.q)}</div>
        </div>
      `
    )
    .join("");
  els.cards.querySelectorAll("[data-card]").forEach((cardEl) => {
    const index = Number(cardEl.dataset.card);
    let flipped = false;
    const flip = () => {
      flipped = !flipped;
      const card = topic.flashcards[index];
      cardEl.innerHTML = flipped
        ? `<div class="label">Ответ</div><div class="text">${escapeHtml(card.a)}</div>`
        : `<div class="label">Вопрос</div><div class="text">${escapeHtml(card.q)}</div>`;
    };
    cardEl.addEventListener("click", flip);
    cardEl.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        flip();
      }
    });
  });
}

function renderSources(topic) {
  const dataBase = window.location.pathname.includes("/web/") ? "../" : "";
  els.sources.innerHTML = topic.sources
    .map((source) => {
      const href = `${dataBase}${source}`;
      return `<div class="file"><a href="${encodeURI(href)}" target="_blank" rel="noreferrer">${escapeHtml(fileName(source))}</a></div>`;
    })
    .join("");
}

function fileName(path) {
  return String(path).split("/").pop();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function escapeAttr(value) {
  return escapeHtml(value).replaceAll("'", "&#39;");
}

els.termSearch.addEventListener("input", () => renderTopic());

loadTopics().catch((error) => {
  els.definitions.innerHTML = `<p class="empty">Не удалось загрузить данные: ${escapeHtml(error.message)}</p>`;
});
