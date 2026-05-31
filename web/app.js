const els = {
  graphsNav: document.querySelector("#graphsNav"),
  topicList: document.querySelector("#topicList"),
  termSearch: document.querySelector("#termSearch"),
  topicTitle: document.querySelector("#topicTitle"),
  topicDesc: document.querySelector("#topicDesc"),
  defsCount: document.querySelector("#defsCount"),
  quizCount: document.querySelector("#quizCount"),
  cardsCount: document.querySelector("#cardsCount"),
  graphsPage: document.querySelector("#graphsPage"),
  topicPanels: document.querySelector("#topicPanels"),
  definitions: document.querySelector("#definitions"),
  quiz: document.querySelector("#quiz"),
  cards: document.querySelector("#cards"),
  sources: document.querySelector("#sources"),
};

const state = {
  topics: [],
  activeTopicId: null,
  activeView: "topic",
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
  els.graphsNav.classList.toggle("active", state.activeView === "graphs");
  if (state.activeView === "graphs") {
    renderGraphsAndFormulas();
    return;
  }
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
      button.className = `topic-button${state.activeView === "topic" && topic.id === state.activeTopicId ? " active" : ""}`;
      button.textContent = topic.title;
      button.addEventListener("click", () => {
        state.activeView = "topic";
        state.activeTopicId = topic.id;
        render();
      });
      els.topicList.append(button);
    });
}

function renderTopic() {
  const topic = state.topics.find((t) => t.id === state.activeTopicId) || state.topics[0];
  if (!topic) return;

  els.topicPanels.hidden = false;
  els.graphsPage.hidden = true;
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

function renderGraphsAndFormulas() {
  els.topicPanels.hidden = true;
  els.graphsPage.hidden = false;
  els.topicTitle.textContent = "Графики и формулы";
  els.topicDesc.textContent = "Базовые экономические схемы, формулы и короткие примеры расчета.";
  els.defsCount.textContent = "6 блоков";
  els.quizCount.textContent = "SVG-графики";
  els.cardsCount.textContent = "формулы";
  els.graphsPage.innerHTML = graphsAndFormulasHtml();
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

function graphsAndFormulasHtml() {
  return `
    <article class="formula-card">
      <div class="formula-copy">
        <h3>Спрос и предложение</h3>
        <p>Спрос показывает, сколько товара готовы купить при разных ценах. Предложение показывает, сколько товара готовы продать.</p>
        <div class="formula-box">
          <strong>Формулы</strong>
          <span>P = a - bQ</span>
          <span>P = c + dQ</span>
        </div>
        <div class="calc-box">
          a = 100, b = 2, c = 20, d = 2<br />
          100 - 2Q = 20 + 2Q<br />
          80 = 4Q, Q* = 20, P* = 60
        </div>
      </div>
      <div class="chart-wrap">
        ${supplyDemandSvg()}
        <p class="chart-caption">Точка E - равновесие: спрос равен предложению.</p>
      </div>
    </article>

    <article class="formula-card">
      <div class="formula-copy">
        <h3>Излишек потребителя и производителя</h3>
        <p>Излишек показывает выгоду участников рынка при равновесной цене.</p>
        <div class="formula-box">
          <strong>Формулы</strong>
          <span>CS = 1/2 × Q* × (Pmax - P*)</span>
          <span>PS = 1/2 × Q* × (P* - Pmin)</span>
          <span>TS = CS + PS</span>
        </div>
        <div class="calc-box">
          CS = 1/2 × 20 × (100 - 60) = 400<br />
          PS = 1/2 × 20 × (60 - 20) = 400<br />
          TS = 800
        </div>
      </div>
      <div class="chart-wrap">
        ${surplusSvg()}
        <p class="chart-caption">CS - выгода покупателей, PS - выгода продавцов.</p>
      </div>
    </article>

    <article class="formula-card">
      <div class="formula-copy">
        <h3>Налог и потери мертвого груза</h3>
        <p>Налог снижает объем сделок. Часть сделок, которые были выгодны покупателям и продавцам, исчезает.</p>
        <div class="formula-box">
          <strong>Формула</strong>
          <span>DWL = 1/2 × (Q* - Qtax) × t</span>
        </div>
        <div class="calc-box">
          Q* = 20, Qtax = 15, t = 20<br />
          DWL = 1/2 × (20 - 15) × 20 = 50
        </div>
      </div>
      <div class="chart-wrap">
        ${taxSvg()}
        <p class="chart-caption">Налоговый клин - разница между ценой покупателя Pb и ценой продавца Ps.</p>
      </div>
    </article>

    <article class="formula-card">
      <div class="formula-copy">
        <h3>Кривая Лоренца и коэффициент Джини</h3>
        <p>Чем дальше кривая Лоренца от диагонали абсолютного равенства, тем выше неравенство.</p>
        <div class="formula-box">
          <strong>Формулы</strong>
          <span>Area = Σ 1/2 × (Yi + Yi-1) × (Xi - Xi-1)</span>
          <span>Gini = 1 - 2 × Area</span>
        </div>
        <table class="mini-table">
          <thead><tr><th>Группа</th><th>Население</th><th>Доход</th></tr></thead>
          <tbody>
            <tr><td>1</td><td>20%</td><td>5%</td></tr>
            <tr><td>2</td><td>20%</td><td>10%</td></tr>
            <tr><td>3</td><td>20%</td><td>15%</td></tr>
            <tr><td>4</td><td>20%</td><td>25%</td></tr>
            <tr><td>5</td><td>20%</td><td>45%</td></tr>
          </tbody>
        </table>
        <div class="calc-box">
          Area = 0.37<br />
          Gini = 1 - 2 × 0.37 = 0.26
        </div>
      </div>
      <div class="chart-wrap">
        ${lorenzSvg()}
        <p class="chart-caption">Диагональ - равенство, кривая ниже нее - фактическое распределение дохода.</p>
      </div>
    </article>

    <article class="formula-card wide">
      <div class="formula-copy">
        <h3>ВВП по таблице</h3>
        <p>ВВП можно посчитать по расходам, по добавленной стоимости или по доходам.</p>
        <div class="gdp-grid">
          <section>
            <h4>По расходам</h4>
            <div class="formula-box">
              <span>GDP = C + I + G + NX</span>
              <span>NX = X - M</span>
              <span>GDP = C + I + G + X - M</span>
            </div>
            <table class="mini-table">
              <tbody>
                <tr><td>C</td><td>потребление</td><td>500</td></tr>
                <tr><td>I</td><td>инвестиции</td><td>150</td></tr>
                <tr><td>G</td><td>госрасходы</td><td>200</td></tr>
                <tr><td>X</td><td>экспорт</td><td>100</td></tr>
                <tr><td>M</td><td>импорт</td><td>80</td></tr>
              </tbody>
            </table>
            <div class="calc-box">GDP = 500 + 150 + 200 + 100 - 80 = 870</div>
          </section>
          <section>
            <h4>По добавленной стоимости</h4>
            <div class="formula-box">
              <span>Value added = выпуск - промежуточные товары</span>
              <span>GDP = сумма добавленной стоимости</span>
            </div>
            <table class="mini-table">
              <thead><tr><th>Этап</th><th>Выпуск</th><th>Промеж.</th><th>ДС</th></tr></thead>
              <tbody>
                <tr><td>Фермер</td><td>100</td><td>0</td><td>100</td></tr>
                <tr><td>Мельница</td><td>180</td><td>100</td><td>80</td></tr>
                <tr><td>Пекарня</td><td>300</td><td>180</td><td>120</td></tr>
              </tbody>
            </table>
            <div class="calc-box">GDP = 100 + 80 + 120 = 300</div>
          </section>
          <section>
            <h4>По доходам</h4>
            <div class="formula-box">
              <span>GDP = wages + rent + interest + profit + taxes - subsidies + depreciation</span>
            </div>
            <table class="mini-table">
              <tbody>
                <tr><td>wages</td><td>зарплаты</td><td>400</td></tr>
                <tr><td>rent</td><td>рента</td><td>80</td></tr>
                <tr><td>interest</td><td>проценты</td><td>50</td></tr>
                <tr><td>profit</td><td>прибыль</td><td>200</td></tr>
                <tr><td>taxes</td><td>налоги</td><td>120</td></tr>
                <tr><td>subsidies</td><td>субсидии</td><td>30</td></tr>
                <tr><td>depreciation</td><td>амортизация</td><td>50</td></tr>
              </tbody>
            </table>
            <div class="calc-box">GDP = 400 + 80 + 50 + 200 + 120 - 30 + 50 = 870</div>
          </section>
        </div>
      </div>
      <div class="chart-wrap">
        ${gdpSvg()}
        <p class="chart-caption">Три подхода описывают одну экономику с разных сторон.</p>
      </div>
    </article>

    <article class="formula-card">
      <div class="formula-copy">
        <h3>Уравнение Фишера</h3>
        <p>Номинальная ставка показывает доходность в деньгах. Реальная ставка показывает доходность с поправкой на инфляцию.</p>
        <div class="formula-box">
          <strong>Формулы</strong>
          <span>i ≈ r + π</span>
          <span>1 + i = (1 + r)(1 + π)</span>
          <span>r = (1 + i) / (1 + π) - 1</span>
        </div>
        <div class="calc-box">
          i = 12%, π = 7%<br />
          r = 1.12 / 1.07 - 1 = 0.0467 = 4.67%<br />
          r ≈ i - π = 12% - 7% = 5%
        </div>
      </div>
      <div class="chart-wrap">
        ${fisherSvg()}
        <p class="chart-caption">Приближенный расчет удобен быстро, точный - аккуратнее.</p>
      </div>
    </article>
  `;
}

function axisSvgStart() {
  return `
    <line x1="48" y1="206" x2="316" y2="206" class="axis" />
    <line x1="48" y1="206" x2="48" y2="24" class="axis" />
    <text x="318" y="220" class="axis-label">Q</text>
    <text x="28" y="28" class="axis-label">P</text>
  `;
}

function supplyDemandSvg() {
  return `
    <svg class="econ-svg" viewBox="0 0 360 240" role="img" aria-label="График спроса и предложения">
      ${axisSvgStart()}
      <line x1="48" y1="36" x2="312" y2="206" class="demand" />
      <line x1="48" y1="206" x2="312" y2="36" class="supply" />
      <line x1="180" y1="206" x2="180" y2="120" class="guide" />
      <line x1="48" y1="120" x2="180" y2="120" class="guide" />
      <circle cx="180" cy="120" r="5" class="point" />
      <text x="188" y="113" class="strong-label">E</text>
      <text x="165" y="224" class="small-label">Q* = 20</text>
      <text x="12" y="124" class="small-label">P* = 60</text>
      <text x="248" y="190" class="demand-label">Demand</text>
      <text x="242" y="52" class="supply-label">Supply</text>
    </svg>
  `;
}

function surplusSvg() {
  return `
    <svg class="econ-svg" viewBox="0 0 360 240" role="img" aria-label="Излишек потребителя и производителя">
      ${axisSvgStart()}
      <polygon points="48,36 180,120 48,120" class="cs-area" />
      <polygon points="48,206 180,120 48,120" class="ps-area" />
      <line x1="48" y1="36" x2="312" y2="206" class="demand" />
      <line x1="48" y1="206" x2="312" y2="36" class="supply" />
      <line x1="48" y1="120" x2="180" y2="120" class="price-line" />
      <line x1="180" y1="206" x2="180" y2="120" class="guide" />
      <circle cx="180" cy="120" r="5" class="point" />
      <text x="84" y="92" class="area-label">CS</text>
      <text x="84" y="154" class="area-label">PS</text>
      <text x="188" y="113" class="strong-label">E</text>
      <text x="246" y="190" class="demand-label">Demand</text>
      <text x="246" y="52" class="supply-label">Supply</text>
    </svg>
  `;
}

function taxSvg() {
  return `
    <svg class="econ-svg" viewBox="0 0 360 240" role="img" aria-label="Налог и потери мертвого груза">
      ${axisSvgStart()}
      <line x1="48" y1="36" x2="312" y2="206" class="demand" />
      <line x1="48" y1="206" x2="312" y2="36" class="supply" />
      <line x1="48" y1="164" x2="274" y2="36" class="tax-supply" />
      <polygon points="147,100 180,120 147,140" class="dwl-area" />
      <line x1="147" y1="100" x2="147" y2="140" class="tax-wedge" />
      <line x1="147" y1="206" x2="147" y2="100" class="guide" />
      <line x1="48" y1="100" x2="147" y2="100" class="guide" />
      <line x1="48" y1="140" x2="147" y2="140" class="guide" />
      <line x1="180" y1="206" x2="180" y2="120" class="guide" />
      <circle cx="180" cy="120" r="4" class="point" />
      <circle cx="147" cy="100" r="4" class="point" />
      <circle cx="147" cy="140" r="4" class="point" />
      <text x="184" y="116" class="small-label">E</text>
      <text x="118" y="224" class="small-label">Qtax = 15</text>
      <text x="170" y="224" class="small-label">Q*</text>
      <text x="18" y="104" class="small-label">Pb</text>
      <text x="20" y="144" class="small-label">Ps</text>
      <text x="152" y="123" class="area-label">DWL</text>
      <text x="234" y="78" class="small-label">S + tax</text>
      <text x="246" y="190" class="demand-label">Demand</text>
      <text x="246" y="52" class="supply-label">Supply</text>
    </svg>
  `;
}

function lorenzSvg() {
  return `
    <svg class="econ-svg" viewBox="0 0 360 240" role="img" aria-label="Кривая Лоренца">
      <line x1="50" y1="206" x2="318" y2="206" class="axis" />
      <line x1="50" y1="206" x2="50" y2="28" class="axis" />
      <text x="224" y="228" class="axis-label">население</text>
      <text x="16" y="30" class="axis-label">доход</text>
      <polygon points="50,206 103.6,197.1 157.2,179.3 210.8,152.6 264.4,108.1 318,28 50,206 103.6,170.4 157.2,134.8 210.8,99.2 264.4,63.6 318,28" class="lorenz-gap" />
      <line x1="50" y1="206" x2="318" y2="28" class="equality" />
      <polyline points="50,206 103.6,197.1 157.2,179.3 210.8,152.6 264.4,108.1 318,28" class="lorenz-line" />
      <circle cx="50" cy="206" r="3" class="point" />
      <circle cx="103.6" cy="197.1" r="3" class="point" />
      <circle cx="157.2" cy="179.3" r="3" class="point" />
      <circle cx="210.8" cy="152.6" r="3" class="point" />
      <circle cx="264.4" cy="108.1" r="3" class="point" />
      <circle cx="318" cy="28" r="3" class="point" />
      <text x="186" y="84" class="small-label">y = x</text>
      <text x="170" y="168" class="strong-label">Lorenz</text>
      <text x="92" y="218" class="small-label">20%</text>
      <text x="306" y="218" class="small-label">100%</text>
      <text x="10" y="210" class="small-label">0%</text>
      <text x="12" y="32" class="small-label">100%</text>
    </svg>
  `;
}

function gdpSvg() {
  return `
    <svg class="econ-svg gdp-svg" viewBox="0 0 620 170" role="img" aria-label="Схема трех способов расчета ВВП">
      <rect x="20" y="34" width="160" height="88" rx="8" class="scheme-box one" />
      <rect x="230" y="34" width="160" height="88" rx="8" class="scheme-box two" />
      <rect x="440" y="34" width="160" height="88" rx="8" class="scheme-box three" />
      <text x="100" y="64" text-anchor="middle" class="scheme-title">Расходы</text>
      <text x="100" y="92" text-anchor="middle" class="scheme-text">C + I + G + X - M</text>
      <text x="310" y="64" text-anchor="middle" class="scheme-title">Добавленная</text>
      <text x="310" y="92" text-anchor="middle" class="scheme-text">стоимость</text>
      <text x="520" y="64" text-anchor="middle" class="scheme-title">Доходы</text>
      <text x="520" y="92" text-anchor="middle" class="scheme-text">факторы + налоги</text>
      <line x1="180" y1="78" x2="230" y2="78" class="scheme-line" />
      <line x1="390" y1="78" x2="440" y2="78" class="scheme-line" />
      <text x="310" y="148" text-anchor="middle" class="strong-label">Все способы дают ВВП</text>
    </svg>
  `;
}

function fisherSvg() {
  return `
    <svg class="econ-svg" viewBox="0 0 360 220" role="img" aria-label="Номинальная и реальная ставка">
      <line x1="52" y1="184" x2="318" y2="184" class="axis" />
      <line x1="52" y1="184" x2="52" y2="34" class="axis" />
      <rect x="82" y="58" width="52" height="126" class="bar nominal" />
      <rect x="158" y="110" width="52" height="74" class="bar inflation" />
      <rect x="234" y="135" width="52" height="49" class="bar real" />
      <text x="108" y="50" text-anchor="middle" class="strong-label">12%</text>
      <text x="184" y="102" text-anchor="middle" class="strong-label">7%</text>
      <text x="260" y="127" text-anchor="middle" class="strong-label">4.67%</text>
      <text x="108" y="204" text-anchor="middle" class="small-label">i</text>
      <text x="184" y="204" text-anchor="middle" class="small-label">π</text>
      <text x="260" y="204" text-anchor="middle" class="small-label">r</text>
      <text x="184" y="26" text-anchor="middle" class="axis-label">r = 1.12 / 1.07 - 1</text>
    </svg>
  `;
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

els.graphsNav.addEventListener("click", () => {
  state.activeView = "graphs";
  render();
});

els.termSearch.addEventListener("input", () => {
  state.search = els.termSearch.value.trim();
  render();
});

loadTopics().catch((error) => {
  els.definitions.innerHTML = `<p class="empty">Не удалось загрузить данные: ${escapeHtml(error.message)}</p>`;
});
