"use client";

import { useEffect, useState } from "react";
import "./acquiring.css";
import "./reference.css";
import "./dashboard.css";
import "./fullscreen.css";
import "./businesses.css";
import "./businesses-heading.css";
import "./logout-dialog.css";
import "./currency-mark.css";
import "./business-form.css";
import "./business-workspace.css";

type View = "register" | "dashboard";
type Business = { name: string; type: string; ownership: string; owner: string; email: string; phone: string; iban: string; taxId: string; description: string; logo?: string; assets: string[] };

const businessCategories = [
  "Магазин", "Ресторан", "Кафе", "Бар", "Фастфуд", "Піцерія", "Суші-бар", "Пекарня", "Кондитерська", "Доставка їжі", "Кейтеринг", "Їдальня",
  "Продукти харчування", "Напої", "Фермерські продукти", "Dark Kitchen", "Фуд-корт", "Виробництво продуктів", "Одяг", "Взуття", "Аксесуари", "Косметика", "Парфумерія", "Ювелірні вироби",
  "Електроніка", "Побутова техніка", "Товари для дому", "Меблі", "Дитячі товари", "Спортивні товари", "Зоотовари", "Квіти", "Подарунки", "Книги", "Канцелярія", "Автотовари",
  "Будівельні товари", "Товари для саду", "Оптова торгівля", "Інтернет-магазин", "Маркетплейс", "Цифрові товари", "Онлайн-сервіс", "SaaS", "IT-сервіс", "Мобільний застосунок", "Підписки", "Хостинг",
  "Онлайн-ігри", "Стримінговий сервіс", "Онлайн-школа", "Онлайн-курси", "Репетиторство", "Мовна школа", "Освітній центр", "Консалтинг", "Маркетинг", "Рекламна агенція", "SMM", "Веб-студія",
  "Дизайн-студія", "Фото та відео", "Студія звукозапису", "Івент-агенція", "Кінотеатр", "Театр", "Концерти та заходи", "Квест-кімната", "Парк розваг", "Ігровий клуб", "Кіберклуб", "Боулинг",
  "Фітнес-клуб", "Спортивний клуб", "Йога-студія", "Басейн", "Салон краси", "Барбершоп", "SPA", "Масажний салон", "Тату-студія", "Nail-студія", "Медична клініка", "Стоматологія",
  "Аптека", "Ветеринарна клініка", "Оптика", "Лабораторія", "Нерухомість", "Оренда житла", "Готель", "Хостел", "Туризм", "Авіакаси", "Таксі", "Доставка",
  "Логістика", "Автосервіс", "Автомийка", "Оренда авто", "Фінансові послуги", "Крипто / Web3",
];

function CategoryDialog({ selected, onSelect, onClose }: { selected: string; onSelect: (category: string) => void; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLocaleLowerCase("uk-UA");
  const filteredCategories = businessCategories.filter((category) => category.toLocaleLowerCase("uk-UA").includes(normalizedQuery));

  return <div className="category-backdrop" role="presentation" onMouseDown={onClose}>
    <section className="category-dialog" role="dialog" aria-modal="true" aria-labelledby="category-title" onMouseDown={(event) => event.stopPropagation()}>
      <header><h2 id="category-title">Категорії бізнесу</h2><button type="button" aria-label="Закрити" onClick={onClose}>×</button></header>
      <label className="category-search"><span className="sr-only">Пошук категорії</span><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Пошук категорії" /></label>
      {filteredCategories.length ? <div className="category-grid">{filteredCategories.map((category) => <button type="button" key={category} className={selected === category ? "selected" : ""} onClick={() => onSelect(category)}>{category}</button>)}</div> : <p className="category-empty">Нічого не знайдено</p>}
    </section>
  </div>;
}

function Mark({ small = false, label = "N" }: { small?: boolean; label?: string }) {
  return <span className={small ? "pay-mark small" : "pay-mark"}>{label.slice(0, 1).toUpperCase()}</span>;
}

function Icon({ name }: { name: "bolt" | "lock" | "phone" | "info" | "refresh" | "copy" | "shield" }) {
  const paths = {
    bolt: <path d="m13.4 2.8-8 10h5.6l-1 8.4 8.1-11.2h-5.7l1-7.2Z" />,
    lock: <><rect x="4.5" y="10" width="15" height="10" rx="2.3" /><path d="M8 10V7.5a4 4 0 0 1 8 0V10" /></>,
    phone: <><rect x="6.8" y="3" width="10.4" height="18" rx="2" /><path d="M10.5 18h3" /></>,
    info: <><circle cx="12" cy="12" r="9.5" /><path d="M12 10.5v5.5M12 7.4h.01" /></>,
    refresh: <><path d="M19.4 9.3A8 8 0 1 0 20 15" /><path d="M19.5 4.5v5h-5" /></>,
    copy: <><rect x="8" y="4" width="11" height="13" rx="1.5" /><path d="M5 8v11a1.5 1.5 0 0 0 1.5 1.5H15" /></>,
    shield: <><path d="M12 2.8 20 6v5.8c0 4.8-3.4 8.2-8 9.6-4.6-1.4-8-4.8-8-9.6V6l8-3.2Z" /><path d="m8.4 12.1 2.3 2.3 4.9-5" /></>,
  };
  return <svg className={`icon icon-${name}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

function Qr({ token }: { token: string }) {
  // Keep the payload short so the built-in Wallet camera can recognize it
  // reliably, even on lower-resolution Android cameras.
  const [source, setSource] = useState("");
  useEffect(() => {
    const destination = `nezeriya:pay-connect:${token}`;
    setSource(`https://api.qrserver.com/v1/create-qr-code/?format=svg&size=360x360&margin=12&ecc=H&data=${encodeURIComponent(destination)}`);
  }, [token]);
  return <div className="qr" aria-label="QR-код для підключення">{source && <img style={{ position: "absolute", inset: 13, width: "calc(100% - 26px)", height: "calc(100% - 26px)" }} src={source} alt="Відкрийте Nezeriya Wallet для підключення" />}</div>;
}

function CurrencyMark({ currency }: { currency: "USDT" | "GRAM" }) {
  return <img className={`currency-mark ${currency === "USDT" ? "usdt-mark" : "gram-mark"}`} src={currency === "USDT" ? "/currency-marks/usdt.png" : "/currency-marks/gram.png"} alt={currency} title={currency} />;
}

function BusinessWorkspace({ business, account, onBack }: { business: Business; account: string; onBack: () => void }) {
  const [tab, setTab] = useState("Аналітика");
  const [period, setPeriod] = useState("30 днів");
  const [asset, setAsset] = useState("Усі");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [message, setMessage] = useState("");
  const unit = asset === "Усі" ? (business.assets?.[0] || "USDT") : asset;
  const tabs = ["Аналітика", "Платежі", "Термінали", "Товари", "Виплати", "Розробникам", "Налаштування"];
  const periodMultiplier: Record<string, string> = { "7 днів": "1 120.40", "30 днів": "4 820.40", "Квартал": "13 950.80", "Свій період": "2 340.00" };
  const notify = (text: string) => { setMessage(text); window.setTimeout(() => setMessage(""), 2200); };
  const exportAnalytics = () => { const data = `Бізнес,Період,Актив,Обіг\n${business.name},${period},${unit},${periodMultiplier[period]} ${unit}`; const url = URL.createObjectURL(new Blob([data], { type: "text/csv" })); const link = document.createElement("a"); link.href = url; link.download = `${business.name}-analytics.csv`; link.click(); URL.revokeObjectURL(url); notify("Файл експорту сформовано"); };
  const copyBusinessId = async () => { await navigator.clipboard?.writeText(`NP-${business.name.replace(/\s+/g, "-").toUpperCase()}`); setMenuOpen(false); notify("ID бізнесу скопійовано"); };
  const tabActions: Record<string, [string, string]> = { "Платежі": ["Створити платіж", "Платежів поки немає"], "Термінали": ["Додати термінал", "Термінали ще не додані"], "Товари": ["Додати товар", "Товари ще не додані"], "Виплати": ["Створити заявку", "Доступний баланс для виплати: 0,00"], "Розробникам": ["Створити ключ", "Ключі API ще не створені"], "Налаштування": ["Зберегти налаштування", "Тут можна керувати даними бізнесу та активами"] };

  return <main className="business-workspace">
    <header className="workspace-top"><div className="pay-logo">NEZERIYA <b>PAY</b></div><div className="workspace-user"><button aria-label="Сповіщення" className={noticeOpen ? "round-control chosen" : "round-control"} onClick={() => setNoticeOpen(!noticeOpen)}>♧</button><button className="workspace-profile" onClick={() => setProfileOpen(!profileOpen)}><Mark small label={account} /><b>{account}</b><span>⌄</span></button>{noticeOpen && <div className="workspace-popover notice-popover"><b>Сповіщення</b><small>Нових сповіщень немає</small></div>}{profileOpen && <div className="workspace-popover profile-popover"><b>{account}</b><small>Підключено через Wallet</small></div>}</div></header>
    <section className="workspace-shell"><button className="back-businesses" onClick={onBack}>‹ Мої бізнеси</button><div className="workspace-title"><div className="workspace-business-mark">▣</div><div><h1>{business.name}</h1><p><span className="status-active">Активний</span>{business.ownership} {business.owner && ` ${business.owner}`} · {business.type} · {business.assets?.join(", ") || "USDT"}</p></div><div className="workspace-title-actions"><button onClick={() => setDetailsOpen(true)}>Дані бізнесу</button><button aria-label="Додаткові дії" className="more-button" onClick={() => setMenuOpen(!menuOpen)}>•••</button>{menuOpen && <div className="workspace-popover actions-popover"><button onClick={copyBusinessId}>Копіювати ID</button><button onClick={() => { setMenuOpen(false); notify("Бізнес активний"); }}>Перевірити статус</button></div>}</div></div>
      <nav className="workspace-tabs">{tabs.map((item) => <button key={item} className={tab === item ? "active" : ""} onClick={() => { setTab(item); setMessage(""); }}>{item}</button>)}</nav>
      {tab === "Аналітика" ? <section className="analytics-view"><div className="analytics-filters"><div>{["7 днів", "30 днів", "Квартал", "Свій період"].map((item) => <button key={item} className={period === item ? "chosen" : ""} onClick={() => setPeriod(item)}>{item}</button>)}</div><div>{["Усі", "USDT", "GRAM"].filter((item) => item === "Усі" || business.assets?.includes(item)).map((item) => <button key={item} className={asset === item ? "chosen light" : ""} onClick={() => setAsset(item)}>{item}</button>)}</div><button className="export-button" onClick={exportAnalytics}>⇩ Експорт</button></div>
        <div className="metric-grid"><Metric label="Обіг" value={`${periodMultiplier[period]} ${unit}`} trend="+12.4%" /><Metric label="Платежів" value={period === "7 днів" ? "128" : period === "Квартал" ? "1 492" : "512"} trend="+8.1%" /><Metric label="Середній чек" value={`9.41 ${unit}`} trend="+3.9%" /><Metric label="Успішних платежів" value="96.2%" trend="−0.4%" negative /></div>
        <div className="analytics-main"><Chart period={period} unit={unit} /><TerminalStats unit={unit} /></div><div className="analytics-bottom"><TopItems unit={unit} /><PaymentStatuses /><AssetStats assets={business.assets || ["USDT"]} unit={unit} /></div>
      </section> : <section className="workspace-empty"><h2>{tab}</h2><p>{tabActions[tab][1]}</p><button onClick={() => notify(`${tabActions[tab][0]} — функція відкрита`)}>{tabActions[tab][0]}</button></section>}
    </section>{detailsOpen && <div className="workspace-modal-backdrop" onMouseDown={() => setDetailsOpen(false)}><section className="business-details-modal" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}><button aria-label="Закрити" onClick={() => setDetailsOpen(false)}>×</button><h2>Дані бізнесу</h2><dl><div><dt>Назва</dt><dd>{business.name}</dd></div><div><dt>Категорія</dt><dd>{business.type}</dd></div><div><dt>Власник</dt><dd>{business.owner || "Не вказано"}</dd></div><div><dt>Email</dt><dd>{business.email || "Не вказано"}</dd></div><div><dt>Активи</dt><dd>{business.assets?.join(", ") || "USDT"}</dd></div></dl><button className="modal-primary" onClick={() => { setDetailsOpen(false); notify("Дані бізнесу переглянуто"); }}>Готово</button></section></div>}{message && <div className="workspace-toast" role="status">{message}</div>}
  </main>;
}

function Metric({ label, value, trend, negative = false }: { label: string; value: string; trend: string; negative?: boolean }) { return <article className="metric-card"><p>{label}<span className={negative ? "negative" : ""}>{trend}</span></p><strong>{value}</strong><small>до попереднього періоду</small></article>; }
function Chart({ period, unit }: { period: string; unit: string }) { return <article className="chart-card"><h2>Обіг за {period}</h2><span>● Обіг, {unit}</span><svg viewBox="0 0 800 200" role="img" aria-label="Графік обігу"><path d="M0 150 C55 115 110 92 175 105 S285 110 340 92 S450 154 520 150 S615 83 690 95 S750 80 800 70 V200 H0Z" /><path d="M0 150 C55 115 110 92 175 105 S285 110 340 92 S450 154 520 150 S615 83 690 95 S750 80 800 70" /></svg><div className="chart-labels"><span>20.08</span><span>25.08</span><span>30.08</span><span>04.09</span><span>09.09</span><span>14.09</span><span>18.09</span></div></article>; }
function TerminalStats({ unit }: { unit: string }) { return <article className="terminal-card"><h2>За терміналами</h2>{[["Каса №1 · Центр", "1 920.10", 100], ["Каса №2 · Бар", "1 140.30", 58], ["Інтернет-магазин", "1 060.00", 53], ["Платіжна сторінка", "700.00", 35]].map(([name, value, width]) => <div key={String(name)}><p><span>{name}</span><b>{value} {unit}</b></p><i><em style={{ width: `${width}%` }} /></i></div>)}</article>; }
function TopItems({ unit }: { unit: string }) { return <article className="mini-card"><h2>Топ товарів</h2>{[["Капучино 250 мл", "214", "1 390.10"], ["Круасан з мигдалем", "168", "672.00"], ["Лате 350 мл", "131", "917.00"]].map(([name, count, amount], index) => <p key={name}><i>{index + 1}</i><span>{name}<small>{count} шт.</small></span><b>{amount} {unit}</b></p>)}</article>; }
function PaymentStatuses() { return <article className="mini-card"><h2>Статуси платежів</h2><div className="status-bar"><i /><i /><i /><i /></div><div className="status-list"><p><span>● Оплачено</span><b>96.2%</b></p><p><span>● Очікує</span><b>2.1%</b></p><p><span>● Недоплата</span><b>1.2%</b></p><p><span>● Прострочено</span><b>0.5%</b></p></div></article>; }
function AssetStats({ assets, unit }: { assets: string[]; unit: string }) { return <article className="mini-card assets-card"><h2>Активи</h2><div className="asset-bar"><i /><i /></div>{assets.map((asset, index) => <p key={asset}><span>● {asset} · {index ? "16" : "84"}%</span><b>{index ? `6 940 ${asset} ≈ 770 USDT` : `4 050.40 ${unit}`}</b></p>)}</article>; }

export default function AcquiringPage() {
  const [view, setView] = useState<View>("register");
  const [token, setToken] = useState("");
  const [copied, setCopied] = useState(false);
  const [account, setAccount] = useState("Nezeriya Wallet");
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [showBusinessForm, setShowBusinessForm] = useState(false);
  const [ownershipHint, setOwnershipHint] = useState("");
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [businessForm, setBusinessForm] = useState<Business>({ name: "", type: "Магазин", ownership: "ФОП", owner: "", email: "", phone: "", iban: "", taxId: "", description: "", assets: ["USDT"] });
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [currency, setCurrency] = useState<"UAH" | "USDT" | "GRAM">("UAH");

  const makeToken = () => `pay_${crypto.randomUUID().slice(0, 8)}-${crypto.randomUUID().slice(0, 4)}`;
  const finishConnection = (connectedAccount: string, confirmedToken: string) => {
    localStorage.setItem("nezeriya_pay_connection", JSON.stringify({ token: confirmedToken, name: connectedAccount, connectedAt: Date.now() }));
    localStorage.setItem("nezeriya_pay_account", connectedAccount);
    setAccount(connectedAccount);
    setView("dashboard");
  };
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const confirmedToken = params.get("pay-connect-confirmed");
    if (confirmedToken) {
      const connectedAccount = params.get("account") || params.get("merchant") || "Nezeriya Wallet";
      finishConnection(connectedAccount, confirmedToken);
      window.history.replaceState({}, "", "/acquiring");
      return;
    }
    const saved = localStorage.getItem("nezeriya_pay_account");
    if (saved) { setAccount(saved); setView("dashboard"); }
    try { setBusinesses(JSON.parse(localStorage.getItem("nezeriya_pay_businesses") || "[]").map((item: Business | string) => typeof item === "string" ? { name: item, type: "Магазин", ownership: "ФОП", owner: "", email: "", phone: "", iban: "", taxId: "", description: "", assets: ["USDT"] } : item)); } catch { setBusinesses([]); }
    setToken(makeToken());
    const onConnected = (event: StorageEvent) => {
      if (event.key === "nezeriya_pay_connection") {
        const profile = JSON.parse(event.newValue || "{}");
        const next = profile.name || "Nezeriya Wallet";
        localStorage.setItem("nezeriya_pay_account", next);
        setAccount(next); setView("dashboard");
      }
    };
    window.addEventListener("storage", onConnected);
    return () => window.removeEventListener("storage", onConnected);
  }, []);

  useEffect(() => {
    if (!token || view !== "register") return;
    let active = true;
    const checkConnection = async () => {
      try {
        const response = await fetch(`/api/acquiring/connect?token=${encodeURIComponent(token)}`, { cache: "no-store" });
        const result = await response.json() as { connected?: boolean; merchant?: string };
        if (active && result.connected) finishConnection(result.merchant || "Nezeriya Wallet", token);
      } catch { /* Keep polling while the Wallet is completing the request. */ }
    };
    void checkConnection();
    const timer = window.setInterval(() => void checkConnection(), 1500);
    return () => { active = false; window.clearInterval(timer); };
  }, [token, view]);

  const copyId = async () => { await navigator.clipboard?.writeText(token); setCopied(true); window.setTimeout(() => setCopied(false), 1800); };
  const changeBusiness = (key: keyof Business, value: string | string[]) => setBusinessForm((current) => ({ ...current, [key]: value }));
  const toggleAsset = (asset: string) => setBusinessForm((current) => ({ ...current, assets: current.assets.includes(asset) ? (current.assets.length > 1 ? current.assets.filter((item) => item !== asset) : current.assets) : [...current.assets, asset] }));
  const openBusinessForm = () => { setBusinessForm({ name: "", type: "Магазин", ownership: "ФОП", owner: "", email: "", phone: "", iban: "", taxId: "", description: "", assets: ["USDT"] }); setShowBusinessForm(true); };
  const saveBusiness = (event: React.FormEvent) => { event.preventDefault(); if (!businessForm.name.trim() || !businessForm.owner.trim() || !businessForm.email.trim() || !businessForm.phone.trim() || !businessForm.iban.trim() || !businessForm.taxId.trim()) return; const next = [...businesses, { ...businessForm, name: businessForm.name.trim() }]; setBusinesses(next); localStorage.setItem("nezeriya_pay_businesses", JSON.stringify(next)); setShowBusinessForm(false); };
  const logout = () => { localStorage.removeItem("nezeriya_pay_account"); localStorage.removeItem("nezeriya_pay_connection"); setToken(makeToken()); setView("register"); };

  if (view === "dashboard" && selectedBusiness) return <BusinessWorkspace business={selectedBusiness} account={account} onBack={() => setSelectedBusiness(null)} />;
  if (view === "dashboard" && showBusinessForm) return <main className="business-form-page"><header className="business-form-top"><div className="pay-logo">NEZERIYA <b>PAY</b></div><div className="user"><Mark small label={account} /><b>{account}</b></div></header><form className="business-form" onSubmit={saveBusiness}><section className="business-fields"><h1>Додати бізнес</h1><p>Додайте новий бізнес, щоб приймати платежі через Nezeriya Pay.</p><label>Назва бізнесу <b>*</b><input required value={businessForm.name} onChange={(e) => changeBusiness("name", e.target.value)} placeholder="Наприклад, Nezeriya Store" /></label><fieldset><legend>Тип бізнесу <b>*</b></legend><div className="choice-row">{["Магазин", "Кафе"].map((item) => <button type="button" className={businessForm.type === item ? "selected" : ""} onClick={() => changeBusiness("type", item)} key={item}>{item}</button>)}{!["Магазин", "Кафе"].includes(businessForm.type) && <button type="button" className="selected selected-category" onClick={() => setCategoryDialogOpen(true)}>{businessForm.type}</button>}<button type="button" className={categoryDialogOpen ? "selected" : ""} onClick={() => setCategoryDialogOpen(true)}>Інше</button></div></fieldset><fieldset><legend>Форма власності <b>*</b></legend><div className="choice-row ownership">{[["ПО", "Приватна особа"], ["ФОП", "Фізична особа-підприємець"], ["ТОВ", "Товариство з обмеженою відповідальністю"]].map(([item, hint]) => <button type="button" className={businessForm.ownership === item ? "selected" : ""} onClick={() => changeBusiness("ownership", item)} key={item}>{item}<i role="button" tabIndex={0} onClick={(e) => { e.stopPropagation(); setOwnershipHint(ownershipHint === item ? "" : item); }}>ⓘ</i>{ownershipHint === item && <span className="ownership-popover">{hint}</span>}</button>)}</div></fieldset><label>ПІБ власника <b>*</b><input required value={businessForm.owner} onChange={(e) => changeBusiness("owner", e.target.value)} /></label><div className="form-grid"><label>Email <b>*</b><input required type="email" value={businessForm.email} onChange={(e) => changeBusiness("email", e.target.value)} placeholder="example@domain.com" /></label><label>Телефон <b>*</b><input required type="tel" value={businessForm.phone} onChange={(e) => changeBusiness("phone", e.target.value)} placeholder="+380 (__) ___ __ __" /></label><label>IBAN <b>*</b><input required value={businessForm.iban} onChange={(e) => changeBusiness("iban", e.target.value)} placeholder="UA00 0000 0000 0000 0000 0000 000" /></label><label>Податковий номер / ЄДРПОУ <b>*</b><input required value={businessForm.taxId} onChange={(e) => changeBusiness("taxId", e.target.value)} placeholder="Наприклад, 1234567890" /></label></div><label>Опис бізнесу<textarea maxLength={300} value={businessForm.description} onChange={(e) => changeBusiness("description", e.target.value)} placeholder="Коротко опишіть, чим займається ваш бізнес" /></label></section><aside className="business-preview"><h3>Логотип бізнесу</h3><div className="logo-upload">{businessForm.logo ? <img src={businessForm.logo} alt="Логотип бізнесу" /> : <span>▧＋</span>}<input aria-label="Завантажити логотип" type="file" accept="image/*" onChange={(e) => { const file = e.target.files?.[0]; if (file) { const reader = new FileReader(); reader.onload = () => changeBusiness("logo", String(reader.result)); reader.readAsDataURL(file); } }} /></div><p>Зображення автоматично обріжеться до кола.</p><fieldset><legend>Активи для оплати <b>*</b></legend><div className="asset-row">{["USDT", "GRAM"].map((asset) => <button type="button" className={businessForm.assets.includes(asset) ? "selected" : ""} onClick={() => toggleAsset(asset)} key={asset}>{asset}<i>{businessForm.assets.includes(asset) ? "✓" : "○"}</i></button>)}</div></fieldset><div className="preview-card"><h3>Попередній перегляд</h3><article>{businessForm.logo ? <img src={businessForm.logo} alt="" /> : <span>▣</span>}<div><b>{businessForm.name || "Назва бізнесу"}</b><small>{businessForm.owner || "ПІБ власника"}</small><em>Прибуток (загалом)<strong>0,00 {businessForm.assets[0]}</strong></em></div></article></div><div className="form-actions"><button type="button" onClick={() => setShowBusinessForm(false)}>Скасувати</button><button type="submit">Додати бізнес</button></div></aside></form>{categoryDialogOpen && <CategoryDialog selected={businessForm.type} onClose={() => setCategoryDialogOpen(false)} onSelect={(category) => { changeBusiness("type", category); setCategoryDialogOpen(false); }} />}</main>;

  if (view === "dashboard") return <main className="pay-app dashboard">
    <aside className="pay-sidebar"><div className="pay-logo">NEZERIYA <b>PAY</b></div>
      <nav>{[["⌂", "Головна"], ["＋", "Створити платіж"], ["↗", "Платіжні посилання"], ["◷", "Історія платежів"], ["▥", "Статистика"], ["⚙", "Налаштування"]].map(([symbol, label], index) => <button className={index === 0 ? "active" : ""} key={label}><i>{symbol}</i>{label}</button>)}</nav><button className="sign-out" onClick={() => setLogoutOpen(true)}>Вийти з акаунта</button></aside>
    <section className="pay-content"><header><div className="user"><Mark small label={account} /><span><b>{account}</b><small>Підключено через Wallet</small></span></div></header>
      <section className="balance-card"><p>Доступний баланс <i>i</i></p><h1>{currency === "UAH" ? <>0,00 ₴</> : <><span>0,00</span><CurrencyMark currency={currency} /></>}</h1><p className="balance-note">Баланс оновлюється автоматично після зарахування платежу.</p><div className="currencies">{(["UAH", "USDT", "GRAM"] as const).map((item) => <button key={item} className={currency === item ? "chosen" : ""} onClick={() => setCurrency(item)}>{item}</button>)}</div><button className="withdraw" disabled>Вивести кошти</button></section>
      <section className="businesses-panel">
        <div className="businesses-heading"><h2>Бізнеси</h2></div>
        <div className="business-list">{businesses.map((business) => <button type="button" className="business-card" key={business.name} onClick={() => setSelectedBusiness(business)}>{business.logo ? <img className="business-logo" src={business.logo} alt="" /> : <span>▣</span>}<b>{business.name}</b><small>{business.type}</small><em>Прибуток (загалом)<strong>0,00 {business.assets?.[0] || "USDT"}</strong></em></button>)}<button className="add-business-card" onClick={openBusinessForm}><span>＋</span><b>Додати бізнес</b><small>Створіть перший профіль еквайрингу</small></button></div>
      </section>
    </section>
    {logoutOpen && <div className="logout-backdrop" role="presentation" onMouseDown={() => setLogoutOpen(false)}><section className="logout-dialog" role="dialog" aria-modal="true" aria-labelledby="logout-title" onMouseDown={(event) => event.stopPropagation()}><h2 id="logout-title">Вийти з акаунта?</h2><p>Ви зможете підключитися знову через Nezeriya Wallet.</p><div><button className="logout-cancel" onClick={() => setLogoutOpen(false)}>Відхилити</button><button className="logout-confirm" onClick={logout}>Підтвердити</button></div></section></div>}
  </main>;

  return <main className="pay-app register"><section className="register-promo"><div className="pay-logo">NEZERIYA <b>PAY</b></div><div className="promo-center"><h1>Реєстрація<br />стала простіше</h1><p>Безпечна реєстрація через застосунок Nezeriya Wallet.</p><div className="benefits"><span><i><Icon name="bolt" /></i><b>Швидко<small>Усього кілька секунд<br />у застосунку</small></b></span><span><i><Icon name="lock" /></i><b>Безпечно<small>Ваші дані під надійним<br />захистом</small></b></span><span><i><Icon name="phone" /></i><b>Через Nezeriya Wallet<small>Реєстрація в офіційному<br />застосунку</small></b></span></div></div><div className="decorative-cards"><div className="decorative-card card-back" /><div className="decorative-card card-front"><span className="card-chip" /></div></div><footer>NEZERIYA PAY —<br />більше можливостей щодня.</footer></section>
    <section className="register-card"><div className="register-content"><h2>Реєстрація акаунта</h2><p className="subtitle">Nezeriya Pay</p><h3>Персональний QR-код для реєстрації</h3><p className="hint">Відскануйте QR-код у застосунку Nezeriya Wallet,<br />щоб зареєструватися.</p><Qr token={token} /><div className="notice"><Icon name="info" /><span>QR-код одноразовий та прив’язаний до вашої сесії.<br />Після успішної реєстрації він стане неактивним.</span></div><div className="qr-controls"><button onClick={() => setToken(makeToken)}><Icon name="refresh" /><span>Оновити QR</span></button></div><div className="request-row"><p className="request-id">ID запиту: {token}</p><button aria-label="Копіювати ID запиту" onClick={copyId}>{copied ? "✓" : <Icon name="copy" />}</button></div><div className="secure"><Icon name="shield" /><span>Реєстрація захищена сучасними технологіями шифрування.<br />Ваші дані залишаються тільки у вашому гаманці.</span></div></div></section>
  </main>;
}
