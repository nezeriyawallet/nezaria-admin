"use client";

import { useMemo, useState, type ReactNode } from "react";

type Props = { qr: ReactNode; onRefresh: () => void; onEnter: () => void };

const features = [
  ["▦", "Термінал", "Приймайте оплату на телефоні через QR або Nezeriya NFC.", ["Каталог товарів", "Автоматичні чеки", "Статус у кабінеті"]],
  ["↗", "Платіжні посилання", "Створюйте рахунки з каталогу або на довільну суму.", ["Одноразові рахунки", "Термін дії", "QR для клієнта"]],
  ["⌘", "Інтеграція з сайтом", "Приймання замовлень з вашого сайту в єдиній історії платежів.", ["Єдиний облік", "Статуси й чеки", "Баланс бізнесу"]],
] as const;

const steps = [
  ["01", "Вхід через QR", "Скануйте QR у Nezeriya Wallet — без пароля."],
  ["02", "Бізнес і товари", "Додайте бізнес та каталог із фотографіями."],
  ["03", "Приймання оплати", "Створіть термінал або платіжне посилання."],
  ["04", "Виплата", "Виводьте доступні кошти у Nezeriya Wallet."],
] as const;

export function MarketingHome({ qr, onRefresh, onEnter }: Props) {
  const [feature, setFeature] = useState(0);
  const activeFeature = useMemo(() => features[feature], [feature]);
  return <>
    <section className="np-home-hero">
      <div className="np-net" aria-hidden="true"><i /><i /><i /><i /><i /></div>
      <div className="np-wrap np-home-hero-grid">
        <div className="np-hero-copy" data-reveal>
          <p className="np-kicker">— КРИПТО-ЕКВАЙРИНГ ДЛЯ БІЗНЕСУ</p>
          <h1><span>Реєстрація</span><span>стала</span><span className="np-shine">простішe</span></h1>
          <p className="np-hero-lead">Скануйте QR у Nezeriya Wallet і заходьте в кабінет бізнесу без пароля. Далі додаєте товари й приймаєте оплату в USDT та GRAM.</p>
          <ul className="np-hero-points">
            <li><b>ϟ</b><span><strong>Швидко</strong><small>Усього кілька секунд у застосунку</small></span></li>
            <li><b>♢</b><span><strong>Безпечно</strong><small>Ваші дані під надійним захистом</small></span></li>
            <li><b>▣</b><span><strong>Через Nezeriya Wallet</strong><small>Реєстрація в офіційному застосунку</small></span></li>
          </ul>
        </div>
        <section className="np-qr-card" aria-labelledby="np-qr-heading" data-reveal data-delay="2">
          <div className="np-qr-card-top"><span className="np-qr-badge">Вхід <b>без пароля</b></span><span className="np-qr-live"><i /> активний</span></div>
          <h2 id="np-qr-heading">Вхід через QR</h2>
          <div className="np-real-qr">{qr}<span className="np-scanline" aria-hidden="true" /></div>
          <p className="np-qr-label">Відскануйте код у Nezeriya Wallet</p>
          <div className="np-qr-actions"><button type="button" onClick={onRefresh}>↻&nbsp; Оновити QR</button></div>
          <p className="np-qr-note">Одноразовий QR привʼязаний до вашої сесії. Дані залишаються у вашому гаманці.</p>
        </section>
      </div>
    </section>

    <div className="np-marquee" aria-hidden="true"><div><span>USDT</span><span>GRAM</span><span>ТЕРМІНАЛ У ТЕЛЕФОНІ</span><span>ПЛАТІЖНІ ПОСИЛАННЯ</span><span>0,5% КОМІСІЯ</span><span>USDT</span><span>GRAM</span><span>ТЕРМІНАЛ У ТЕЛЕФОНІ</span></div></div>

    <section className="np-section np-features" id="features">
      <div className="np-wrap"><div className="np-section-head" data-reveal><p className="np-kicker">— МОЖЛИВОСТІ</p><h2>Три способи приймати<br /><em>оплату в крипті</em></h2><p>Оберіть підхід для точки продажу, онлайн-рахунків або власного сайту.</p></div>
        <div className="np-feature-grid">
          {features.map(([icon, title, text, bullets], index) => <button type="button" className={`np-feature-card ${feature === index ? "active" : ""}`} key={title} onMouseEnter={() => setFeature(index)} onFocus={() => setFeature(index)} onClick={() => setFeature(index)} data-reveal data-delay={String(index + 1)}><i>{icon}</i><h3>{title}</h3><p>{text}</p><ul>{bullets.map((bullet) => <li key={bullet}>↗ {bullet}</li>)}</ul></button>)}
        </div>
        <div className="np-feature-selected" aria-live="polite"><span>{activeFeature[0]}</span><b>{activeFeature[1]}</b><small>{activeFeature[2]}</small></div>
      </div>
    </section>

    <section className="np-section np-how" id="how"><div className="np-wrap"><div className="np-section-head" data-reveal><p className="np-kicker">— ЯК ЦЕ ПРАЦЮЄ</p><h2>Від входу до виплати —<br /><em>у чотири кроки</em></h2></div><ol className="np-steps">{steps.map(([number, title, text], index) => <li key={number} data-reveal data-delay={String(index)}><b>{number}</b><div><h3>{title}</h3><p>{text}</p></div></li>)}</ol></div></section>

    <section className="np-section np-home-cta"><div className="np-wrap np-home-cta-box" data-reveal><div><p className="np-kicker">— ПОЧНІТЬ ЗАРАЗ</p><h2>Приймання криптооплат<br /><em>без зайвих кроків</em></h2><p>Відкрийте Nezeriya Wallet, відскануйте QR і створіть перший бізнес.</p></div><button type="button" onClick={onEnter}>Реєстрація <span>↗</span></button></div></section>
  </>;
}
