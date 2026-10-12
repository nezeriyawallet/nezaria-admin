"use client";

import Link from "next/link";
import "./marketing-page.css";
import { MarketingFooter, MarketingHeader, MarketingMotion } from "./marketing-shell";

const benefits = [
  ["▦", "Термінал у телефоні", "Каса працює на звичайному смартфоні: товари синхронізуються з кабінету, а оплата проходить через NFC або QR."],
  ["↗", "Гроші під контролем", "Доступні кошти виводяться у ваш Nezeriya Wallet, а історія виведень доступна у вкладці «Виплати»."],
  ["☰", "Облік без ручної роботи", "Кожен платіж автоматично потрапляє у журнал. PDF-виписки є по бізнесу, терміналу та виплатах."],
  ["⚡", "Швидкий старт", "Створіть бізнес, додайте товари й введіть код підключення в терміналі — можна приймати оплату."],
] as const;

function Split({ title, text, reverse = false }: { title: string; text: string; reverse?: boolean }) {
  return <section className={`np-split ${reverse ? "reverse" : ""}`} data-reveal><div><p className="np-kicker">— СЦЕНАРІЙ</p><h2>{title}</h2><p>{text}</p><ul className="np-check-list"><li>USDT і GRAM</li><li>Операції в єдиному журналі</li><li>Чеки та статуси у кабінеті</li></ul></div><div className="np-visual"><small>ПРИКЛАД ВИКОРИСТАННЯ</small><b>{title}</b><span>Налаштування та історія доступні у бізнес-кабінеті.</span></div></section>;
}

export function BusinessMarketingPage() {
  return <main className="np-marketing np-public-page"><MarketingMotion /><MarketingHeader active="business" /><div className="np-page"><div className="np-wrap np-page-layout"><nav className="np-toc" aria-label="Зміст"><b>На сторінці</b><a href="#benefits">01 Переваги</a><a href="#scenarios">02 Сценарії</a><a href="#start">03 Старт</a><a href="#price">04 Тариф</a></nav><div className="np-page-content"><div className="np-page-lead" data-reveal><p className="np-kicker">— БІЗНЕСАМ</p><h1>Криптооплата, що<br /><em>працює у вашому ритмі</em></h1><p>Приймайте USDT і GRAM у точці продажу, онлайн або за посиланням. Усі операції, чеки та виплати — в одному кабінеті.</p></div><section id="benefits" className="np-content-block" data-reveal><p className="np-kicker">— ПЕРЕВАГИ</p><h2>Приймання криптооплати без нового обладнання</h2><div className="np-info-cards">{benefits.map(([icon, title, text]) => <article key={title}><i>{icon}</i><h3>{title}</h3><p>{text}</p></article>)}</div></section><div id="scenarios"><Split title="Кавʼярні, ресторани та магазини" text="Касир обирає товари на телефоні й показує QR або просить торкнутися телефоном. Платіж з кількох позицій фіксується одним записом." /><Split reverse title="Послуги та консультації" text="Створіть платіжне посилання для конкретної послуги й надішліть клієнту. Після підтвердження операція автоматично зʼявляється в журналі." /><Split title="Інтернет-магазини та сервіси" text="Підключіть оплату на сайті. Онлайн-замовлення потрапляють у той самий журнал, що й офлайн-продажі." /></div><section id="start" className="np-content-block" data-reveal><p className="np-kicker">— СТАРТ</p><h2>Що потрібно, щоб почати</h2><div className="np-info-cards">{[["01", "Реєстрація", "Увійдіть через QR та створіть обліковий запис."], ["02", "Товари", "Заповніть каталог із цінами та фото."], ["03", "Термінал", "Введіть код із кабінету в застосунок на телефоні."]].map(([number, title, text]) => <article key={title}><i>{number}</i><h3>{title}</h3><p>{text}</p></article>)}</div></section><section id="price" className="np-wide-cta" data-reveal><div><p className="np-kicker">— ТАРИФ</p><h2>Один тариф<br /><em>без сюрпризів</em></h2><p>0,5% комісії сервісу з успішної оплати. Щомісячної плати немає.</p></div><Link className="np-page-button" href="/acquiring?login=1">Почати роботу <span>↗</span></Link></section></div></div></div><MarketingFooter /></main>;
}
