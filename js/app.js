let selectedMonth = "any";
let selectedSort = "recommend";

const sortOptions = [
  { value: "recommend", label: "おすすめ順" },
  { value: "total", label: "総合利回り順" },
  { value: "cost", label: "必要資金が安い順" },
  { value: "dividend", label: "配当利回り順" }
];

function normalizeText(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[ァ-ン]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0x60))
    .replace(/\s+/g, "");
}

function yen(n) {
  return "約" + Number(n).toLocaleString() + "円";
}

function score(stock, budget, type, priority) {
  let s = 0;

  if (stock.cost <= budget) s += 40;
  if (type === "any" || stock.type === type) s += 25;

  s += Math.min(stock.total * 4, 24);

  if (priority === "yield") s += stock.total * 5;
  if (priority === "lowcost") s += Math.max(0, 20 - stock.cost / 30000);
  if (priority === "beginner") s += stock.beginner * 5;
  if (priority === "balance") s += stock.beginner * 2 + stock.dividend * 2;

  return Math.round(s);
}

function renderMonthButtons() {
  const months = ["すべて", "1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"];
  const wrap = document.getElementById("monthButtons");

  wrap.innerHTML = months.map(month => {
    const value = month === "すべて" ? "any" : month;
    const active = selectedMonth === value ? "active" : "";

    return `<button type="button" class="month-btn ${active}" onclick="selectMonth('${value}')">${month}</button>`;
  }).join("");
}

function renderSortButtons() {
  const wrap = document.getElementById("sortButtons");

  wrap.innerHTML = sortOptions.map(option => {
    const active = selectedSort === option.value ? "active" : "";

    return `<button type="button" class="sort-btn ${active}" onclick="selectSort('${option.value}')">${option.label}</button>`;
  }).join("");
}

function selectMonth(month) {
  selectedMonth = month;
  renderMonthButtons();
  diagnose();
}

function selectSort(sortValue) {
  selectedSort = sortValue;
  renderSortButtons();
  diagnose();
}

function matchesKeyword(stock, keyword) {
  if (!keyword) return true;

  const target = normalizeText(`${stock.name} ${stock.code} ${stock.search}`);
  const key = normalizeText(keyword);

  return target.includes(key);
}

function getMatchedStocks() {
  const keyword = document.getElementById("keyword").value.trim();
  const budget = Number(document.getElementById("budget").value || 0);
  const type = document.getElementById("type").value;
  const priority = document.getElementById("priority").value;

  const matched = stocks
    .filter(stock => matchesKeyword(stock, keyword))
    .filter(stock => stock.cost <= budget)
    .filter(stock => type === "any" || stock.type === type)
    .filter(stock => selectedMonth === "any" || stock.month.includes(selectedMonth))
    .map(stock => ({
      ...stock,
      score: score(stock, budget, type, priority)
    }));

  return sortStocks(matched);
}

function sortStocks(items) {
  return [...items].sort((a, b) => {
    if (selectedSort === "total") return b.total - a.total;
    if (selectedSort === "cost") return a.cost - b.cost;
    if (selectedSort === "dividend") return b.dividend - a.dividend;
    return b.score - a.score;
  });
}

function renderSuggest() {
  const keyword = document.getElementById("keyword").value.trim();
  const list = document.getElementById("suggestList");

  if (!keyword) {
    list.style.display = "none";
    list.innerHTML = "";
    return;
  }

  const suggestions = stocks
    .filter(stock => matchesKeyword(stock, keyword))
    .slice(0, 5);

  if (!suggestions.length) {
    list.style.display = "none";
    list.innerHTML = "";
    return;
  }

  list.innerHTML = suggestions.map(stock => `
    <div class="suggest-item" onclick="selectSuggest('${stock.code}')">
      <div class="suggest-name">${stock.name}</div>
      <div class="suggest-meta">証券コード：${stock.code}｜${stock.type}｜権利月：${stock.month}</div>
    </div>
  `).join("");

  list.style.display = "block";
}

function selectSuggest(code) {
  const stock = stocks.find(item => item.code === code);

  if (!stock) return;

  document.getElementById("keyword").value = stock.name;
  document.getElementById("suggestList").style.display = "none";

  diagnose();
}

function getResultTitle(keyword) {
  if (keyword) return "検索結果";

  if (selectedSort === "total") return "総合利回りランキング";
  if (selectedSort === "cost") return "必要資金が安い順";
  if (selectedSort === "dividend") return "配当利回りランキング";

  return "おすすめ診断結果";
}

function getRankLabel(keyword, index) {
  if (keyword) return "検索結果";

  if (selectedSort === "total") return `総合利回り ${index + 1}位`;
  if (selectedSort === "cost") return `低予算 ${index + 1}位`;
  if (selectedSort === "dividend") return `配当 ${index + 1}位`;

  return `おすすめ ${index + 1}`;
}

function diagnose() {
  const keyword = document.getElementById("keyword").value.trim();
  const results = document.getElementById("results");
  const count = document.getElementById("count");
  const matched = getMatchedStocks();

  count.textContent = `該当件数：${matched.length}件`;

  if (!matched.length) {
    results.innerHTML = '<div class="empty">条件に合う銘柄が見つかりませんでした。検索ワード・予算・優待種類・権利月を変えて再診断してください。</div>';
    return;
  }

  const title = getResultTitle(keyword);

  results.innerHTML = `<div class="result-title">${title}</div>` + matched.slice(0, 6).map((stock, index) => `
    <article class="result-card">
      <div class="result-head">
        <div>
          <span class="rank ${keyword ? "search-rank" : ""}">${getRankLabel(keyword, index)}</span>
          <div class="company">${stock.name}</div>
          <div class="code">証券コード：${stock.code}</div>
        </div>
        <div class="score">${stock.score}点</div>
      </div>

      <div class="tags">
        <span class="tag">${stock.type}</span>
        <span class="tag">権利月：${stock.month}</span>
      </div>

      <div class="metrics">
        <div class="metric"><span>必要資金</span><b>${yen(stock.cost)}</b></div>
        <div class="metric"><span>配当利回り</span><b>${stock.dividend}%</b></div>
        <div class="metric"><span>総合利回り</span><b>${stock.total}%</b></div>
      </div>

      <div class="reason">${stock.note}</div>
    </article>
  `).join("");
}

function resetFilters() {
  document.getElementById("keyword").value = "";
  document.getElementById("budget").value = 500000;
  document.getElementById("type").value = "any";
  document.getElementById("priority").value = "balance";

  selectedMonth = "any";
  selectedSort = "recommend";

  document.getElementById("suggestList").style.display = "none";

  renderMonthButtons();
  renderSortButtons();
  diagnose();
}

function initialize() {
  document.getElementById("keyword").addEventListener("input", () => {
    renderSuggest();
    diagnose();
  });

  document.getElementById("keyword").addEventListener("blur", () => {
    setTimeout(() => {
      document.getElementById("suggestList").style.display = "none";
    }, 150);
  });

  document.getElementById("budget").addEventListener("input", diagnose);
  document.getElementById("type").addEventListener("change", diagnose);
  document.getElementById("priority").addEventListener("change", diagnose);
  document.getElementById("diagnoseButton").addEventListener("click", diagnose);
  document.getElementById("resetButton").addEventListener("click", resetFilters);

  renderMonthButtons();
  renderSortButtons();
  diagnose();
}

initialize();