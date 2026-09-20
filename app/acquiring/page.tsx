"use client";

import { useEffect, useState, type FormEvent } from "react";
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
import "./business-workspace-dense.css";
import "./product-form.css";
import "./product-catalog.css";
import "./business-settings.css";
import "./profile-settings.css";

type View = "register" | "dashboard";
type Business = { name: string; type: string; ownership: string; owner: string; email: string; phone: string; iban: string; taxId: string; description: string; logo?: string; assets: string[]; suspended?: boolean };
type Product = { name: string; category: string; sku: string; price: string; currency: "USDT" | "GRAM"; quantity: string; description: string; terminals: string[]; photo?: string };
type Profile = { firstName: string; lastName: string; email: string; phone: string; walletId: string; country: string; photo?: string; primaryBusiness: string };

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

function BusinessWorkspace({ business, account, onBack, products, onProductsChange, onBusinessChange, onDelete }: { business: Business; account: string; onBack: () => void; products: Product[]; onProductsChange: (products: Product[]) => void; onBusinessChange: (business: Business) => void; onDelete: () => void }) {
  const [tab, setTab] = useState("Аналітика");
  const [period, setPeriod] = useState("30 днів");
  const [asset, setAsset] = useState("Усі");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [productAddOpen, setProductAddOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const unit = asset === "Усі" ? (business.assets?.[0] || "USDT") : asset;
  const tabs = ["Аналітика", "Платежі", "Термінали", "Товари", "Виплати", "Розробникам", "Налаштування"];
  const periodMultiplier: Record<string, string> = { "7 днів": "1 120.40", "30 днів": "4 820.40", "Квартал": "13 950.80", "Свій період": "2 340.00" };
  const notify = (text: string) => { setMessage(text); window.setTimeout(() => setMessage(""), 2200); };
  const exportAnalytics = () => { const data = `Бізнес,Період,Актив,Обіг\n${business.name},${period},${unit},${periodMultiplier[period]} ${unit}`; const url = URL.createObjectURL(new Blob([data], { type: "text/csv" })); const link = document.createElement("a"); link.href = url; link.download = `${business.name}-analytics.csv`; link.click(); URL.revokeObjectURL(url); notify("Файл експорту сформовано"); };
  const copyBusinessId = async () => { await navigator.clipboard?.writeText(`NP-${business.name.replace(/\s+/g, "-").toUpperCase()}`); setMenuOpen(false); notify("ID бізнесу скопійовано"); };
  const tabActions: Record<string, [string, string]> = { "Платежі": ["Створити платіж", "Платежів поки немає"], "Термінали": ["Додати термінал", "Термінали ще не додані"], "Товари": ["Додати товар", "Товари ще не додані"], "Виплати": ["Створити заявку", "Доступний баланс для виплати: 0,00"], "Розробникам": ["Створити ключ", "Ключі API ще не створені"], "Налаштування": ["Зберегти налаштування", "Тут можна керувати даними бізнесу та активами"] };

  return <main className="business-workspace">
    <header className="workspace-top"><div className="pay-logo">NEZERIYA <b>PAY</b></div><div className="workspace-user"><button aria-label="Сповіщення" className={noticeOpen ? "round-control chosen" : "round-control"} onClick={() => setNoticeOpen(!noticeOpen)}>♧</button><button className="workspace-profile" onClick={() => setProfileOpen(!profileOpen)}><Mark small label={account} /><b>{account}</b><span>⌄</span></button>{noticeOpen && <div className="workspace-popover notice-popover"><b>Сповіщення</b><small>Нових сповіщень немає</small></div>}{profileOpen && <div className="workspace-popover profile-popover"><b>{account}</b><small>Підключено через Wallet</small></div>}</div></header>
    <section className="workspace-shell"><button className="back-businesses" onClick={onBack}>‹ Мої бізнеси</button><div className="workspace-title"><div className="workspace-business-mark">{business.logo ? <img src={business.logo} alt={`Логотип ${business.name}`} style={{ width: "100%", height: "100%", borderRadius: "inherit", objectFit: "cover" }} /> : "▣"}</div><div><h1>{business.name}</h1><p><span className={business.suspended ? "status-paused" : "status-active"}>{business.suspended ? "Призупинений" : "Активний"}</span>{business.ownership} {business.owner && ` ${business.owner}`} · {business.type} · {business.assets?.join(", ") || "USDT"}</p></div><div className="workspace-title-actions"><button onClick={() => setDetailsOpen(true)}>Дані бізнесу</button><button aria-label="Додаткові дії" className="more-button" onClick={() => setMenuOpen(!menuOpen)}>•••</button>{menuOpen && <div className="workspace-popover actions-popover"><button onClick={copyBusinessId}>Копіювати ID</button><button onClick={() => { setMenuOpen(false); notify("Бізнес активний"); }}>Перевірити статус</button></div>}</div></div>
      <nav className="workspace-tabs">{tabs.map((item) => <button key={item} className={tab === item ? "active" : ""} onClick={() => { setTab(item); setMessage(""); }}>{item}</button>)}</nav>
      {tab === "Аналітика" ? <section className="analytics-view"><div className="analytics-filters"><div>{["7 днів", "30 днів", "Квартал", "Свій період"].map((item) => <button key={item} className={period === item ? "chosen" : ""} onClick={() => setPeriod(item)}>{item}</button>)}</div><div>{["Усі", "USDT", "GRAM"].filter((item) => item === "Усі" || business.assets?.includes(item)).map((item) => <button key={item} className={asset === item ? "chosen light" : ""} onClick={() => setAsset(item)}>{item}</button>)}</div><button className="export-button" onClick={exportAnalytics}>⇩ Експорт</button></div>
        <div className="metric-grid"><Metric label="Обіг" value={`${periodMultiplier[period]} ${unit}`} trend="+12.4%" /><Metric label="Платежів" value={period === "7 днів" ? "128" : period === "Квартал" ? "1 492" : "512"} trend="+8.1%" /><Metric label="Середній чек" value={`9.41 ${unit}`} trend="+3.9%" /><Metric label="Успішних платежів" value="96.2%" trend="−0.4%" negative /></div>
        <div className="analytics-main"><Chart period={period} unit={unit} /><TerminalStats unit={unit} /></div><div className="analytics-bottom"><TopItems unit={unit} /><PaymentStatuses /><AssetStats assets={business.assets || ["USDT"]} unit={unit} /></div>
      </section> : tab === "Товари" ? (productAddOpen || editingProduct) ? <ProductForm initialProduct={editingProduct || undefined} onCancel={() => { setProductAddOpen(false); setEditingProduct(null); }} onSave={(product) => { if (editingProduct) { onProductsChange(products.map((item) => item === editingProduct ? product : item)); notify("Товар оновлено"); } else { onProductsChange([...products, product]); notify("Товар додано"); } setProductAddOpen(false); setEditingProduct(null); }} /> : <ProductCatalog products={products} onAdd={() => { setEditingProduct(null); setProductAddOpen(true); }} onEdit={(product) => setEditingProduct(product)} onRemove={(target) => { onProductsChange(products.filter((product) => product !== target)); notify("Товар видалено"); }} onImport={() => notify("Імпорт CSV відкрито")} /> : tab === "Налаштування" ? <BusinessSettings business={business} onSave={onBusinessChange} onDelete={onDelete} notify={notify} /> : <section className="workspace-empty"><h2>{tab}</h2><p>{tabActions[tab][1]}</p><button onClick={() => notify(`${tabActions[tab][0]} — функція відкрита`)}>{tabActions[tab][0]}</button></section>}
    </section>{detailsOpen && <div className="workspace-modal-backdrop" onMouseDown={() => setDetailsOpen(false)}><section className="business-details-modal" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}><button aria-label="Закрити" onClick={() => setDetailsOpen(false)}>×</button><h2>Дані бізнесу</h2><dl><div><dt>Назва</dt><dd>{business.name}</dd></div><div><dt>Категорія</dt><dd>{business.type}</dd></div><div><dt>Власник</dt><dd>{business.owner || "Не вказано"}</dd></div><div><dt>Email</dt><dd>{business.email || "Не вказано"}</dd></div><div><dt>Активи</dt><dd>{business.assets?.join(", ") || "USDT"}</dd></div></dl><button className="modal-primary" onClick={() => { setDetailsOpen(false); notify("Дані бізнесу переглянуто"); }}>Готово</button></section></div>}{message && <div className="workspace-toast" role="status">{message}</div>}
  </main>;
}

function BusinessSettings({ business, onSave, onDelete, notify }: { business: Business; onSave: (business: Business) => void; onDelete: () => void; notify: (text: string) => void }) {
  const [draft, setDraft] = useState(business);
  const [paymentAssets, setPaymentAssets] = useState(business.assets);
  const [invoiceTime, setInvoiceTime] = useState("15 хв");
  const [autopayout, setAutopayout] = useState(false);
  const [period, setPeriod] = useState("Щотижня");
  const [minimum, setMinimum] = useState("100 USDT");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  useEffect(() => { setDraft(business); setPaymentAssets(business.assets); }, [business]);
  const update = <K extends keyof Business>(key: K, value: Business[K]) => setDraft((current) => ({ ...current, [key]: value }));
  const chooseLogo = (file?: File) => { if (!file) return; const reader = new FileReader(); reader.onload = () => update("logo", String(reader.result)); reader.readAsDataURL(file); };
  const toggleAsset = (asset: string) => setPaymentAssets((current) => current.includes(asset) ? (current.length > 1 ? current.filter((item) => item !== asset) : current) : [...current, asset]);
  const save = (event: FormEvent) => { event.preventDefault(); if (!draft.name.trim() || !draft.owner.trim() || !draft.email.trim() || !draft.taxId.trim()) return notify("Заповніть обов’язкові поля"); onSave({ ...draft, name: draft.name.trim(), assets: paymentAssets }); notify("Налаштування бізнесу збережено"); };
  return <form className="business-settings" onSubmit={save}>
    <section className="settings-card settings-main"><h2>Основна інформація</h2><div className="settings-logo">{draft.logo ? <img src={draft.logo} alt="Логотип бізнесу" /> : <span>▣</span>}<label>Змінити<input type="file" accept="image/*" onChange={(event) => chooseLogo(event.target.files?.[0])} /></label></div><div className="settings-grid"><label>Назва бізнесу <b>*</b><input required value={draft.name} onChange={(event) => update("name", event.target.value)} /></label><label>Тип бізнесу <b>*</b><select value={draft.type} onChange={(event) => update("type", event.target.value)}>{businessCategories.map((item) => <option key={item}>{item}</option>)}</select></label><label>Форма власності <b>*</b><select value={draft.ownership} onChange={(event) => update("ownership", event.target.value)}><option>ПО</option><option>ФОП</option><option>ТОВ</option></select></label><label>ІПН / ЄДРПОУ <b>*</b><input required value={draft.taxId} onChange={(event) => update("taxId", event.target.value)} /></label></div><label>ПІБ власника <b>*</b><input required value={draft.owner} onChange={(event) => update("owner", event.target.value)} /></label><div className="settings-grid"><label>Email <b>*</b><input required type="email" value={draft.email} onChange={(event) => update("email", event.target.value)} /></label><label>Телефон <b>*</b><input required value={draft.phone} onChange={(event) => update("phone", event.target.value)} /></label></div><label>IBAN для виплат <b>*</b><input required value={draft.iban} onChange={(event) => update("iban", event.target.value)} /></label><label>Опис бізнесу<textarea maxLength={300} value={draft.description} onChange={(event) => update("description", event.target.value)} /><small>{draft.description.length}/300</small></label><footer><button type="button" onClick={() => { setDraft(business); setPaymentAssets(business.assets); notify("Зміни скасовано"); }}>Скасувати</button><button type="submit">Зберегти зміни</button></footer></section>
    <div className="settings-column"><section className="settings-card"><h2>Приймання платежів</h2>{["USDT", "GRAM"].map((asset) => <div className="settings-row" key={asset}><div><b>{asset}</b><small>{asset === "USDT" ? "Tether · мережа TON" : "Мережа TON"}</small></div><button type="button" aria-label={`Увімкнути ${asset}`} className={`toggle ${paymentAssets.includes(asset) ? "on" : ""}`} onClick={() => toggleAsset(asset)}><i /></button></div>)}<div className="settings-row"><div><b>Час на оплату рахунку</b><small>Після цього рахунок стане недійсним</small></div><select value={invoiceTime} onChange={(event) => setInvoiceTime(event.target.value)}><option>15 хв</option><option>30 хв</option><option>1 година</option></select></div></section><section className="settings-card"><h2>Виплати</h2><div className="settings-row"><div><b>Автовиплата</b><small>Виводити кошти на IBAN автоматично</small></div><button type="button" aria-label="Автовиплата" className={`toggle ${autopayout ? "on" : ""}`} onClick={() => setAutopayout(!autopayout)}><i /></button></div><div className="settings-row"><b>Періодичність</b><div className="period-control">{["Щодня", "Щотижня", "Вручну"].map((item) => <button type="button" className={period === item ? "selected" : ""} key={item} onClick={() => setPeriod(item)}>{item}</button>)}</div></div><div className="settings-row"><div><b>Мінімальна сума</b><small>Нижче цієї суми виплата не створюється</small></div><select value={minimum} onChange={(event) => setMinimum(event.target.value)}><option>50 USDT</option><option>100 USDT</option><option>500 USDT</option></select></div></section></div>
    <div className="settings-column"><section className="settings-card team-card"><h2>Команда</h2><div className="team-member"><span>{draft.owner.slice(0, 1).toUpperCase() || "В"}</span><div><b>{draft.owner || "Власник"}</b><small>{draft.email || "Email не вказано"}</small></div><em>Власник</em></div>{inviteOpen ? <div className="invite-form"><input autoFocus type="email" value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} placeholder="email@example.com" /><button type="button" onClick={() => { if (!inviteEmail.includes("@")) return notify("Вкажіть коректний email"); setInviteEmail(""); setInviteOpen(false); notify("Запрошення надіслано"); }}>Надіслати</button></div> : <button type="button" className="invite-button" onClick={() => setInviteOpen(true)}>⊕ Запросити учасника</button>}</section><section className="settings-card danger-card"><h2>Призупинення й видалення</h2><p>Призупинення вимикає приймання платежів. Видалення бізнесу незворотне.</p><div><button type="button" onClick={() => { onSave({ ...business, suspended: !business.suspended }); notify(business.suspended ? "Бізнес відновлено" : "Бізнес призупинено"); }}>{business.suspended ? "Відновити бізнес" : "Призупинити бізнес"}</button><button type="button" className="delete-button" onClick={() => setDeleteOpen(true)}>Видалити бізнес</button></div>{deleteOpen && <div className="confirm-delete"><b>Видалити «{business.name}»?</b><p>Цю дію не можна скасувати.</p><button type="button" onClick={() => setDeleteOpen(false)}>Скасувати</button><button type="button" className="delete-button" onClick={onDelete}>Так, видалити</button></div>}</section></div>
  </form>;
}

function Metric({ label, value, trend, negative = false }: { label: string; value: string; trend: string; negative?: boolean }) { return <article className="metric-card"><p>{label}<span className={negative ? "negative" : ""}>{trend}</span></p><strong>{value}</strong><small>до попереднього періоду</small></article>; }
function Chart({ period, unit }: { period: string; unit: string }) { return <article className="chart-card"><h2>Обіг за {period}</h2><span>● Обіг, {unit}</span><svg viewBox="0 0 800 200" role="img" aria-label="Графік обігу"><path d="M0 150 C55 115 110 92 175 105 S285 110 340 92 S450 154 520 150 S615 83 690 95 S750 80 800 70 V200 H0Z" /><path d="M0 150 C55 115 110 92 175 105 S285 110 340 92 S450 154 520 150 S615 83 690 95 S750 80 800 70" /></svg><div className="chart-labels"><span>20.08</span><span>25.08</span><span>30.08</span><span>04.09</span><span>09.09</span><span>14.09</span><span>18.09</span></div></article>; }
function TerminalStats({ unit }: { unit: string }) { return <article className="terminal-card"><h2>За терміналами</h2>{[["Каса №1 · Центр", "1 920.10", 100], ["Каса №2 · Бар", "1 140.30", 58], ["Інтернет-магазин", "1 060.00", 53], ["Платіжна сторінка", "700.00", 35]].map(([name, value, width]) => <div key={String(name)}><p><span>{name}</span><b>{value} {unit}</b></p><i><em style={{ width: `${width}%` }} /></i></div>)}</article>; }
function TopItems({ unit }: { unit: string }) { return <article className="mini-card"><h2>Топ товарів</h2>{[["Капучино 250 мл", "214", "1 390.10"], ["Круасан з мигдалем", "168", "672.00"], ["Лате 350 мл", "131", "917.00"]].map(([name, count, amount], index) => <p key={name}><i>{index + 1}</i><span>{name}<small>{count} шт.</small></span><b>{amount} {unit}</b></p>)}</article>; }
function PaymentStatuses() { return <article className="mini-card"><h2>Статуси платежів</h2><div className="status-bar"><i /><i /><i /><i /></div><div className="status-list"><p><span>● Оплачено</span><b>96.2%</b></p><p><span>● Очікує</span><b>2.1%</b></p><p><span>● Недоплата</span><b>1.2%</b></p><p><span>● Прострочено</span><b>0.5%</b></p></div></article>; }
function AssetStats({ assets, unit }: { assets: string[]; unit: string }) { return <article className="mini-card assets-card"><h2>Активи</h2><div className="asset-bar"><i /><i /></div>{assets.map((asset, index) => <p key={asset}><span>● {asset} · {index ? "16" : "84"}%</span><b>{index ? `6 940 ${asset} ≈ 770 USDT` : `4 050.40 ${unit}`}</b></p>)}</article>; }

function ProductForm({ onCancel, onSave, initialProduct }: { onCancel: () => void; onSave: (product: Product) => void; initialProduct?: Product }) {
  const [product, setProduct] = useState<Product>(() => initialProduct ? { ...initialProduct, terminals: [...initialProduct.terminals] } : { name: "", category: "", sku: "", price: "", currency: "USDT", quantity: "100", description: "", terminals: [] });
  const terminals: string[] = [];
  const update = <K extends keyof Product>(key: K, value: Product[K]) => setProduct((current) => ({ ...current, [key]: value }));
  const choosePhoto = (file?: File) => { if (!file) return; const reader = new FileReader(); reader.onload = () => update("photo", String(reader.result)); reader.readAsDataURL(file); };
  const toggleTerminal = (terminal: string) => update("terminals", product.terminals.includes(terminal) ? product.terminals.filter((item) => item !== terminal) : [...product.terminals, terminal]);
  const submit = (event: FormEvent) => { event.preventDefault(); if (!product.name.trim() || !product.price.trim()) return; onSave({ ...product, name: product.name.trim() }); };
  return <section className="product-page"><button type="button" className="product-back" onClick={onCancel}>‹ Товари</button><form className="product-form" onSubmit={submit}><div className="product-form-main"><h2>{initialProduct ? "Редагувати товар" : "Додати товар"}</h2><p>Товар з’явиться на вибраних терміналах і в платіжних посиланнях</p><label className="product-field full"><span>Назва товару <b>*</b></span><input required value={product.name} onChange={(event) => update("name", event.target.value)} placeholder="Наприклад, Капучино 250 мл" /></label><div className="product-row"><label className="product-field"><span>Категорія</span><select value={product.category} onChange={(event) => update("category", event.target.value)}><option value="">Оберіть категорію</option><option>Напої</option><option>Їжа</option><option>Десерти</option><option>Товари</option><option>Послуги</option></select></label><label className="product-field"><span>Артикул (SKU)</span><input value={product.sku} onChange={(event) => update("sku", event.target.value)} placeholder="CAP-250" /></label></div><div className="product-row"><label className="product-field"><span>Ціна <b>*</b></span><div className="price-control"><input required inputMode="decimal" value={product.price} onChange={(event) => update("price", event.target.value)} placeholder="0.00" /><button type="button" className={product.currency === "USDT" ? "active" : ""} onClick={() => update("currency", "USDT")}>USDT</button><button type="button" className={product.currency === "GRAM" ? "active" : ""} onClick={() => update("currency", "GRAM")}>GRAM</button></div></label><label className="product-field"><span>Кількість</span><input inputMode="numeric" value={product.quantity} onChange={(event) => update("quantity", event.target.value)} /></label></div><label className="product-field full"><span>Опис</span><textarea maxLength={500} value={product.description} onChange={(event) => update("description", event.target.value)} placeholder="Коротко опишіть товар: склад, розмір, особливості" /><small>{product.description.length}/500</small></label><div className="product-terminals"><span>Доступний на терміналах</span>{terminals.length ? <div>{terminals.map((terminal) => <button type="button" key={terminal} className={product.terminals.includes(terminal) ? "selected" : ""} onClick={() => toggleTerminal(terminal)}>{product.terminals.includes(terminal) ? "✓ " : ""}{terminal}</button>)}</div> : <p>Додайте термінал, щоб призначити на нього товар.</p>}</div></div><aside className="product-preview"><h3>Фото товару</h3><label className="product-photo">{product.photo ? <img src={product.photo} alt="Попередній перегляд товару" /> : <><b>▧</b><span>Додати фото</span></>}<input type="file" accept="image/png,image/jpeg" onChange={(event) => choosePhoto(event.target.files?.[0])} /></label><p>PNG або JPG, до 5 МБ</p><div className="photo-actions"><label className="choose-file">Обрати файл<input type="file" accept="image/png,image/jpeg" onChange={(event) => choosePhoto(event.target.files?.[0])} /></label>{product.photo && <button type="button" onClick={() => update("photo", undefined)}>Прибрати фото</button>}</div><h3>Попередній перегляд</h3><div className="product-preview-card">{product.photo ? <img src={product.photo} alt="" /> : <i>▧</i>}<div><b>{product.name || "Назва товару"}</b><strong>{product.price || "0.00"} {product.currency}</strong><small>{product.terminals.length ? `Доступний на ${product.terminals.length} терміналах` : "Термінали ще не додані"}</small></div></div><footer><button type="button" onClick={onCancel}>Скасувати</button><button type="submit">{initialProduct ? "Зберегти зміни" : "Додати"}</button></footer></aside></form></section>;
}

function ProductCatalog({ products, onAdd, onEdit, onRemove, onImport }: { products: Product[]; onAdd: () => void; onEdit: (product: Product) => void; onRemove: (product: Product) => void; onImport: () => void }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Усі");
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const categories = ["Усі", ...Array.from(new Set(products.map((product) => product.category).filter(Boolean)))];
  const visible = products.filter((product) => (category === "Усі" || product.category === category) && `${product.name} ${product.sku}`.toLocaleLowerCase().includes(query.toLocaleLowerCase()));
  return <section className="product-catalog"><header className="catalog-header"><div><h2>Товари</h2><p>{products.length} {products.length === 1 ? "товар" : products.length < 5 ? "товари" : "товарів"} · {Math.max(0, categories.length - 1)} категорій</p></div><div className="catalog-actions"><button className="import-csv" onClick={onImport}>Імпорт CSV</button><button className="add-product" onClick={onAdd}>⊕&nbsp; Додати товар</button></div></header><div className="catalog-tools"><div className="category-filters">{categories.map((item) => <button key={item} className={category === item ? "active" : ""} onClick={() => setCategory(item)}>{item}{item !== "Усі" && ` ${products.filter((product) => product.category === item).length}`}{item === "Усі" && ` ${products.length}`}</button>)}</div><label className="product-search"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Пошук товару" /></label></div>{visible.length ? <div className="product-grid">{visible.map((product) => <article className="catalog-product" key={`${product.name}-${product.sku}`}><div className="catalog-photo">{product.category && <small>{product.category}</small>}<button aria-label={`Дії для ${product.name}`} onClick={() => setOpenMenu(openMenu === `${product.name}-${product.sku}` ? null : `${product.name}-${product.sku}`)}>•••</button>{product.photo ? <img src={product.photo} alt={product.name} /> : <span>▧</span>}{openMenu === `${product.name}-${product.sku}` && <div className="product-actions-menu"><button onClick={() => { setOpenMenu(null); onEdit(product); }}>Редагувати</button><button onClick={() => onRemove(product)}>Видалити</button></div>}</div><h3>{product.name}</h3><p>{product.description || product.sku || "Без опису"}{product.sku && product.description ? ` · ${product.sku}` : ""}</p><strong>{product.price || "0.00"} {product.currency}</strong><footer><em className={Number(product.quantity) > 0 ? "in-stock" : "out-stock"}>{Number(product.quantity) > 0 ? "В наявності" : "Немає в наявності"}</em><span>{product.terminals.length ? `${product.terminals.length} термінали` : "Без терміналів"}</span></footer></article>)}</div> : <div className="catalog-blank"><b>{products.length ? "Нічого не знайдено" : "Товарів ще немає"}</b><p>{products.length ? "Спробуйте змінити пошук або фільтр" : "Додайте перший товар до вашого каталогу."}</p><button onClick={onAdd}>Додати товар</button></div>}</section>;
}

function ProfileSettings({ profile, businesses, onSave, onCancel }: { profile: Profile; businesses: Business[]; onSave: (profile: Profile) => void; onCancel: () => void }) {
  const [draft, setDraft] = useState(profile);
  const update = <K extends keyof Profile>(key: K, value: Profile[K]) => setDraft((current) => ({ ...current, [key]: value }));
  const choosePhoto = (file?: File) => { if (!file) return; const reader = new FileReader(); reader.onload = () => update("photo", String(reader.result)); reader.readAsDataURL(file); };
  const copyUserId = async () => { await navigator.clipboard?.writeText(`usr_${draft.walletId.replace(/\W/g, "").slice(0, 16)}`); };
  const save = (event: FormEvent) => { event.preventDefault(); if (!draft.firstName.trim() || !draft.lastName.trim() || !draft.email.trim() || !draft.phone.trim()) return; onSave({ ...draft, firstName: draft.firstName.trim(), lastName: draft.lastName.trim() }); };
  return <section className="profile-settings-page"><header><h1>Налаштування профілю</h1><p>Керуйте вашими особистими даними, безпекою та налаштуваннями сповіщень.</p></header><form className="profile-settings-card" onSubmit={save}><h2>Основна інформація</h2><div className="profile-identity"><div className="profile-photo">{draft.photo ? <img src={draft.photo} alt="Фото профілю" /> : <span>{draft.firstName.slice(0, 1)}{draft.lastName.slice(0, 1)}</span>}</div><div><b>{draft.firstName || "Ім’я"} {draft.lastName || "Прізвище"}</b><small>Власник бізнесу</small><em>● Активний</em></div></div><div className="profile-photo-action"><label>▧&nbsp; Змінити фото<input type="file" accept="image/*" onChange={(event) => choosePhoto(event.target.files?.[0])} /></label><span>JPG, PNG або SVG, до 5 МБ.</span>{draft.photo && <button type="button" onClick={() => update("photo", undefined)}>Прибрати фото</button>}</div><div className="profile-fields"><label>Ім’я <b>*</b><input required value={draft.firstName} onChange={(event) => update("firstName", event.target.value)} /></label><label>Прізвище <b>*</b><input required value={draft.lastName} onChange={(event) => update("lastName", event.target.value)} /></label><label>Email <b>*</b><input required type="email" value={draft.email} onChange={(event) => update("email", event.target.value)} /></label><label>Телефон <b>*</b><input required type="tel" value={draft.phone} onChange={(event) => update("phone", event.target.value)} /></label><label>Nezeriya Wallet ID<input value={draft.walletId} onChange={(event) => update("walletId", event.target.value)} /></label><label>Країна <b>*</b><select value={draft.country} onChange={(event) => update("country", event.target.value)}><option>🇺🇦 Україна</option><option>🇵🇱 Польща</option><option>🇩🇪 Німеччина</option></select></label><label className="profile-user-id">ID користувача<div><input readOnly value={`usr_${draft.walletId.replace(/\W/g, "").slice(0, 16) || "nezeriya"}`} /><button type="button" aria-label="Копіювати ID" onClick={copyUserId}>▣</button></div></label><label>Основний бізнес<select value={draft.primaryBusiness} onChange={(event) => update("primaryBusiness", event.target.value)}><option value="">Оберіть бізнес</option>{businesses.map((business) => <option value={business.name} key={business.name}>{business.name}</option>)}</select></label></div><footer><button type="button" onClick={() => { setDraft(profile); onCancel(); }}>Скасувати</button><button type="submit">Зберегти зміни</button></footer></form></section>;
}

export default function AcquiringPage() {
  const [view, setView] = useState<View>("register");
  const [token, setToken] = useState("");
  const [copied, setCopied] = useState(false);
  const [account, setAccount] = useState("Nezeriya Wallet");
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [productsByBusiness, setProductsByBusiness] = useState<Record<string, Product[]>>({});
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [showBusinessForm, setShowBusinessForm] = useState(false);
  const [ownershipHint, setOwnershipHint] = useState("");
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [businessForm, setBusinessForm] = useState<Business>({ name: "", type: "Магазин", ownership: "ФОП", owner: "", email: "", phone: "", iban: "", taxId: "", description: "", assets: ["USDT"] });
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [currency, setCurrency] = useState<"UAH" | "USDT" | "GRAM">("UAH");
  const [dashboardSection, setDashboardSection] = useState<"home" | "settings">("home");
  const [profile, setProfile] = useState<Profile>({ firstName: "Іван", lastName: "Петренко", email: "ivan.petrenko@example.com", phone: "+380 (67) 123 45 67", walletId: "Nezeriya ID", country: "🇺🇦 Україна", primaryBusiness: "" });

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
    try { const savedProfile = JSON.parse(localStorage.getItem("nezeriya_pay_profile") || "null"); if (savedProfile && typeof savedProfile === "object") setProfile((current) => ({ ...current, ...savedProfile })); } catch {}
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

  useEffect(() => { if (!account) return; let active = true; fetch(`/api/acquiring/store?account=${encodeURIComponent(account)}`, { cache: "no-store" }).then((response) => response.ok ? response.json() : null).then((state) => { if (!active || !state) return; if (Array.isArray(state.businesses) && state.businesses.length) { setBusinesses(state.businesses); if (state.productsByBusiness && typeof state.productsByBusiness === "object") setProductsByBusiness(state.productsByBusiness); return; } try { const localBusinesses = JSON.parse(localStorage.getItem("nezeriya_pay_businesses") || "[]"); if (Array.isArray(localBusinesses) && localBusinesses.length) void fetch("/api/acquiring/store", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ account, businesses: localBusinesses, productsByBusiness: {} }) }); } catch {} }).catch(() => {}); return () => { active = false; }; }, [account]);

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
  const saveStore = (nextBusinesses: Business[], nextProducts: Record<string, Product[]>) => { localStorage.setItem("nezeriya_pay_businesses", JSON.stringify(nextBusinesses)); void fetch("/api/acquiring/store", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ account, businesses: nextBusinesses, productsByBusiness: nextProducts }) }); };
  const saveBusiness = (event: React.FormEvent) => { event.preventDefault(); if (!businessForm.name.trim() || !businessForm.owner.trim() || !businessForm.email.trim() || !businessForm.phone.trim() || !businessForm.iban.trim() || !businessForm.taxId.trim()) return; const next = [...businesses, { ...businessForm, name: businessForm.name.trim() }]; setBusinesses(next); saveStore(next, productsByBusiness); setShowBusinessForm(false); };
  const changeProducts = (businessName: string, nextProducts: Product[]) => { const next = { ...productsByBusiness, [businessName]: nextProducts }; setProductsByBusiness(next); saveStore(businesses, next); };
  const logout = () => { localStorage.removeItem("nezeriya_pay_account"); localStorage.removeItem("nezeriya_pay_connection"); setToken(makeToken()); setView("register"); };

  if (view === "dashboard" && selectedBusiness) return <BusinessWorkspace business={selectedBusiness} account={account} onBack={() => setSelectedBusiness(null)} products={productsByBusiness[selectedBusiness.name] || []} onProductsChange={(nextProducts) => changeProducts(selectedBusiness.name, nextProducts)} onBusinessChange={(nextBusiness) => { const previousName = selectedBusiness.name; const nextBusinesses = businesses.map((item) => item.name === previousName ? nextBusiness : item); const nextProducts = previousName === nextBusiness.name ? productsByBusiness : { ...productsByBusiness, [nextBusiness.name]: productsByBusiness[previousName] || [] }; if (previousName !== nextBusiness.name) delete nextProducts[previousName]; setBusinesses(nextBusinesses); setProductsByBusiness(nextProducts); setSelectedBusiness(nextBusiness); saveStore(nextBusinesses, nextProducts); }} onDelete={() => { const nextBusinesses = businesses.filter((item) => item.name !== selectedBusiness.name); const nextProducts = { ...productsByBusiness }; delete nextProducts[selectedBusiness.name]; setBusinesses(nextBusinesses); setProductsByBusiness(nextProducts); saveStore(nextBusinesses, nextProducts); setSelectedBusiness(null); }} />;
  if (view === "dashboard" && showBusinessForm) return <main className="business-form-page"><header className="business-form-top"><div className="pay-logo">NEZERIYA <b>PAY</b></div><div className="user"><Mark small label={account} /><b>{account}</b></div></header><form className="business-form" onSubmit={saveBusiness}><section className="business-fields"><h1>Додати бізнес</h1><p>Додайте новий бізнес, щоб приймати платежі через Nezeriya Pay.</p><label>Назва бізнесу <b>*</b><input required value={businessForm.name} onChange={(e) => changeBusiness("name", e.target.value)} placeholder="Наприклад, Nezeriya Store" /></label><fieldset><legend>Тип бізнесу <b>*</b></legend><div className="choice-row">{["Магазин", "Кафе"].map((item) => <button type="button" className={businessForm.type === item ? "selected" : ""} onClick={() => changeBusiness("type", item)} key={item}>{item}</button>)}{!["Магазин", "Кафе"].includes(businessForm.type) && <button type="button" className="selected selected-category" onClick={() => setCategoryDialogOpen(true)}>{businessForm.type}</button>}<button type="button" className={categoryDialogOpen ? "selected" : ""} onClick={() => setCategoryDialogOpen(true)}>Інше</button></div></fieldset><fieldset><legend>Форма власності <b>*</b></legend><div className="choice-row ownership">{[["ПО", "Приватна особа"], ["ФОП", "Фізична особа-підприємець"], ["ТОВ", "Товариство з обмеженою відповідальністю"]].map(([item, hint]) => <button type="button" className={businessForm.ownership === item ? "selected" : ""} onClick={() => changeBusiness("ownership", item)} key={item}>{item}<i role="button" tabIndex={0} onClick={(e) => { e.stopPropagation(); setOwnershipHint(ownershipHint === item ? "" : item); }}>ⓘ</i>{ownershipHint === item && <span className="ownership-popover">{hint}</span>}</button>)}</div></fieldset><label>ПІБ власника <b>*</b><input required value={businessForm.owner} onChange={(e) => changeBusiness("owner", e.target.value)} /></label><div className="form-grid"><label>Email <b>*</b><input required type="email" value={businessForm.email} onChange={(e) => changeBusiness("email", e.target.value)} placeholder="example@domain.com" /></label><label>Телефон <b>*</b><input required type="tel" value={businessForm.phone} onChange={(e) => changeBusiness("phone", e.target.value)} placeholder="+380 (__) ___ __ __" /></label><label>IBAN <b>*</b><input required value={businessForm.iban} onChange={(e) => changeBusiness("iban", e.target.value)} placeholder="UA00 0000 0000 0000 0000 0000 000" /></label><label>Податковий номер / ЄДРПОУ <b>*</b><input required value={businessForm.taxId} onChange={(e) => changeBusiness("taxId", e.target.value)} placeholder="Наприклад, 1234567890" /></label></div><label>Опис бізнесу<textarea maxLength={300} value={businessForm.description} onChange={(e) => changeBusiness("description", e.target.value)} placeholder="Коротко опишіть, чим займається ваш бізнес" /></label></section><aside className="business-preview"><h3>Логотип бізнесу</h3><div className="logo-upload">{businessForm.logo ? <img src={businessForm.logo} alt="Логотип бізнесу" /> : <span>▧＋</span>}<input aria-label="Завантажити логотип" type="file" accept="image/*" onChange={(e) => { const file = e.target.files?.[0]; if (file) { const reader = new FileReader(); reader.onload = () => changeBusiness("logo", String(reader.result)); reader.readAsDataURL(file); } }} /></div><p>Зображення автоматично обріжеться до кола.</p><fieldset><legend>Активи для оплати <b>*</b></legend><div className="asset-row">{["USDT", "GRAM"].map((asset) => <button type="button" className={businessForm.assets.includes(asset) ? "selected" : ""} onClick={() => toggleAsset(asset)} key={asset}>{asset}<i>{businessForm.assets.includes(asset) ? "✓" : "○"}</i></button>)}</div></fieldset><div className="preview-card"><h3>Попередній перегляд</h3><article>{businessForm.logo ? <img src={businessForm.logo} alt="" /> : <span>▣</span>}<div><b>{businessForm.name || "Назва бізнесу"}</b><small>{businessForm.owner || "ПІБ власника"}</small><em>Прибуток (загалом)<strong>0,00 {businessForm.assets[0]}</strong></em></div></article></div><div className="form-actions"><button type="button" onClick={() => setShowBusinessForm(false)}>Скасувати</button><button type="submit">Додати бізнес</button></div></aside></form>{categoryDialogOpen && <CategoryDialog selected={businessForm.type} onClose={() => setCategoryDialogOpen(false)} onSelect={(category) => { changeBusiness("type", category); setCategoryDialogOpen(false); }} />}</main>;

  if (view === "dashboard") return <main className="pay-app dashboard">
    <aside className="pay-sidebar"><div className="pay-logo">NEZERIYA <b>PAY</b></div>
      <nav>{[["⌂", "Головна"], ["＋", "Створити платіж"], ["↗", "Платіжні посилання"], ["◷", "Історія платежів"], ["▥", "Статистика"], ["⚙", "Налаштування"]].map(([symbol, label]) => <button className={(label === "Налаштування" ? dashboardSection === "settings" : label === "Головна" && dashboardSection === "home") ? "active" : ""} key={label} onClick={() => { if (label === "Налаштування") setDashboardSection("settings"); else if (label === "Головна") setDashboardSection("home"); }}><i>{symbol}</i>{label}</button>)}</nav><button className="sign-out" onClick={() => setLogoutOpen(true)}>Вийти з акаунта</button></aside>
    <section className="pay-content"><header><div className="user"><Mark small label={account} /><span><b>{profile.firstName} {profile.lastName}</b><small>Підключено через Wallet</small></span></div></header>
      {dashboardSection === "settings" ? <ProfileSettings profile={profile} businesses={businesses} onCancel={() => setDashboardSection("home")} onSave={(nextProfile) => { setProfile(nextProfile); localStorage.setItem("nezeriya_pay_profile", JSON.stringify(nextProfile)); setDashboardSection("home"); }} /> : <><section className="balance-card"><p>Доступний баланс <i>i</i></p><h1>{currency === "UAH" ? <>0,00 ₴</> : <><span>0,00</span><CurrencyMark currency={currency} /></>}</h1><p className="balance-note">Баланс оновлюється автоматично після зарахування платежу.</p><div className="currencies">{(["UAH", "USDT", "GRAM"] as const).map((item) => <button key={item} className={currency === item ? "chosen" : ""} onClick={() => setCurrency(item)}>{item}</button>)}</div><button className="withdraw" disabled>Вивести кошти</button></section>
      <section className="businesses-panel">
        <div className="businesses-heading"><h2>Бізнеси</h2></div>
        <div className="business-list">{businesses.map((business) => <button type="button" className="business-card" key={business.name} onClick={() => setSelectedBusiness(business)}>{business.logo ? <img className="business-logo" src={business.logo} alt="" /> : <span>▣</span>}<b>{business.name}</b><small>{business.type}</small><em>Прибуток (загалом)<strong>0,00 {business.assets?.[0] || "USDT"}</strong></em></button>)}<button className="add-business-card" onClick={openBusinessForm}><span>＋</span><b>Додати бізнес</b><small>Створіть перший профіль еквайрингу</small></button></div>
      </section></>}
    </section>
    {logoutOpen && <div className="logout-backdrop" role="presentation" onMouseDown={() => setLogoutOpen(false)}><section className="logout-dialog" role="dialog" aria-modal="true" aria-labelledby="logout-title" onMouseDown={(event) => event.stopPropagation()}><h2 id="logout-title">Вийти з акаунта?</h2><p>Ви зможете підключитися знову через Nezeriya Wallet.</p><div><button className="logout-cancel" onClick={() => setLogoutOpen(false)}>Відхилити</button><button className="logout-confirm" onClick={logout}>Підтвердити</button></div></section></div>}
  </main>;

  return <main className="pay-app register"><section className="register-promo"><div className="pay-logo">NEZERIYA <b>PAY</b></div><div className="promo-center"><h1>Реєстрація<br />стала простіше</h1><p>Безпечна реєстрація через застосунок Nezeriya Wallet.</p><div className="benefits"><span><i><Icon name="bolt" /></i><b>Швидко<small>Усього кілька секунд<br />у застосунку</small></b></span><span><i><Icon name="lock" /></i><b>Безпечно<small>Ваші дані під надійним<br />захистом</small></b></span><span><i><Icon name="phone" /></i><b>Через Nezeriya Wallet<small>Реєстрація в офіційному<br />застосунку</small></b></span></div></div><div className="decorative-cards"><div className="decorative-card card-back" /><div className="decorative-card card-front"><span className="card-chip" /></div></div><footer>NEZERIYA PAY —<br />більше можливостей щодня.</footer></section>
    <section className="register-card"><div className="register-content"><h2>Реєстрація акаунта</h2><p className="subtitle">Nezeriya Pay</p><h3>Персональний QR-код для реєстрації</h3><p className="hint">Відскануйте QR-код у застосунку Nezeriya Wallet,<br />щоб зареєструватися.</p><Qr token={token} /><div className="notice"><Icon name="info" /><span>QR-код одноразовий та прив’язаний до вашої сесії.<br />Після успішної реєстрації він стане неактивним.</span></div><div className="qr-controls"><button onClick={() => setToken(makeToken)}><Icon name="refresh" /><span>Оновити QR</span></button></div><div className="request-row"><p className="request-id">ID запиту: {token}</p><button aria-label="Копіювати ID запиту" onClick={copyId}>{copied ? "✓" : <Icon name="copy" />}</button></div><div className="secure"><Icon name="shield" /><span>Реєстрація захищена сучасними технологіями шифрування.<br />Ваші дані залишаються тільки у вашому гаманці.</span></div></div></section>
  </main>;
}
