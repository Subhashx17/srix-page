// Builds the Surface (the top layer) as clean, semantic HTML.
// Export: renderSurface(root, content) -> returns the <main id="surface"> element.

const esc = (value = '') =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

// A value that contains YOUR_ is a placeholder, not a real value yet.
const isPlaceholder = (value = '') => String(value).includes('YOUR_');

const pad = (n) => String(n).padStart(2, '0');

// Small mono label like "§ 02 — Work". Decoration only: the <h2> already says it.
const renderLabel = (n, name) =>
  `<p class="label" aria-hidden="true">§ ${pad(n)} — ${esc(name)}</p>`;

function renderLink(link, className = '') {
  const cls = className ? ` class="${className}"` : '';
  if (isPlaceholder(link.href)) {
    return `<span class="link-todo">${esc(link.label)} (coming soon)</span>`;
  }
  return `<a${cls} href="${esc(link.href)}">${esc(link.label)}</a>`;
}

function renderList(items, className) {
  return `<ul class="${className}">${items
    .map((item) => `<li>${esc(item)}</li>`)
    .join('')}</ul>`;
}

function renderHeader(c) {
  const items = c.nav
    .map((n) => `<li><a href="${esc(n.href)}">${esc(n.label)}</a></li>`)
    .join('');
  return `
    <header class="site-header block" data-block="header">
      <a class="brand" href="#hero">${esc(c.person.name)}</a>
      <nav aria-label="Main">
        <ul class="nav">${items}</ul>
      </nav>
    </header>`;
}

function renderHero(c) {
  const actions = c.hero.actions
    .map((a) => `<li>${renderLink(a, 'button')}</li>`)
    .join('');
  // Keep the last word and the dot together so the dot never drops to its own line.
  const words = c.person.name.split(' ');
  const last = words.pop();
  const first = words.join(' ');
  return `
    <section id="hero" class="block hero" data-block="hero" aria-labelledby="hero-title">
      <p class="eyebrow">${esc(c.hero.eyebrow)}</p>
      <div class="hero-title">
        <h1 id="hero-title" class="visually-hidden">${esc(first)} ${esc(last)}</h1>
        <div id="hero-name-effect" class="hero-name-effect" aria-hidden="true"></div>
        <span class="dot" aria-hidden="true"></span>
      </div>
      <div class="hero__bottom">
        <div class="hero__body">
          <p class="hero__headline">${esc(c.hero.headline)}</p>
          <p class="lead">${esc(c.hero.lead)}</p>
          <ul class="actions">${actions}</ul>
        </div>
        <div class="hero__hint" data-hint="${esc(c.hero.hint)}" aria-hidden="true"></div>
      </div>
    </section>`;
}

function renderAbout(c) {
  const paragraphs = c.about.paragraphs
    .map((p, i) => `<p${i === 0 ? ' class="about__lead"' : ''}>${esc(p)}</p>`)
    .join('');
  return `
    <section id="about" class="block about" data-block="about" aria-labelledby="about-title">
      ${renderLabel(1, c.about.heading)}
      <h2 id="about-title">${esc(c.about.heading)}</h2>
      ${paragraphs}
    </section>`;
}

function renderProject(p, i) {
  const noYear = isPlaceholder(p.year);
  const year = noYear ? '—' : p.year;
  const empty = p.placeholder ? ' project--empty' : '';
  const stack = p.tags.length
    ? `<p class="project__stack">${esc(p.tags.join(' · '))}</p>`
    : '';
  const links = p.links.length
    ? `<ul class="links">${p.links
        .map((l) => `<li>${renderLink(l)}</li>`)
        .join('')}</ul>`
    : '';
  const study = p.study.length
    ? `
        <details class="project__study">
          <summary>Read the short case study</summary>
          <div class="project__body">
            <p class="project__kind">${esc(p.kind)}</p>
            <p>${esc(p.description)}</p>
            ${p.study.map((t) => `<p>${esc(t)}</p>`).join('')}
            ${links}
          </div>
        </details>`
    : '';
  return `
      <article class="block project${empty}" data-block="${esc(p.id)}" aria-labelledby="${esc(p.id)}-title">
        <div class="project__row">
          <span class="project__num" aria-hidden="true">${pad(i + 1)}</span>
          <div class="project__main">
            <h3 id="${esc(p.id)}-title" class="project__title"><span class="project__title-text">${esc(p.title)}</span></h3>
            <p class="project__tagline">${esc(p.tagline)}</p>
          </div>
          <div class="project__meta">
            <p class="project__year"${noYear ? ' aria-hidden="true"' : ''}>${esc(year)}</p>
            ${stack}
          </div>${study}
        </div>
      </article>`;
}

function renderWork(c) {
  return `
    <section id="work" class="work" aria-labelledby="work-title">
      <div class="block work__head" data-block="work-head">
        ${renderLabel(2, c.work.heading)}
        <h2 id="work-title">${esc(c.work.heading)}</h2>
        <p>${esc(c.work.intro)}</p>
      </div>
      ${c.work.projects.map(renderProject).join('')}
    </section>`;
}

function renderStack(c) {
  const groups = c.stack.groups
    .map(
      (g) => `
        <div class="stack-group">
          <h3>${esc(g.name)}</h3>
          ${renderList(g.items, 'tags')}
        </div>`
    )
    .join('');
  return `
    <section id="stack" class="block stack" data-block="stack" aria-labelledby="stack-title">
      ${renderLabel(3, c.stack.heading)}
      <h2 id="stack-title">${esc(c.stack.heading)}</h2>
      <div class="stack__groups">${groups}</div>
    </section>`;
}

function renderNow(c) {
  return `
    <section id="now" class="block now" data-block="now" aria-labelledby="now-title">
      ${renderLabel(4, c.now.heading)}
      <h2 id="now-title">${esc(c.now.heading)}</h2>
      ${renderList(c.now.items, 'now-list')}
    </section>`;
}

function renderContact(c) {
  const links = c.contact.links
    .map((l) => `<li>${renderLink(l)}</li>`)
    .join('');
  return `
    <section id="contact" class="block contact" data-block="contact" aria-labelledby="contact-title">
      ${renderLabel(5, c.contact.heading)}
      <h2 id="contact-title">${esc(c.contact.heading)}</h2>
      <p>${esc(c.contact.text)}</p>
      <ul class="links">${links}</ul>
    </section>`;
}

function renderFooter(c) {
  const year = new Date().getFullYear();
  return `
    <footer class="site-footer block" data-block="footer">
      <p>© ${year} ${esc(c.person.name)} (${esc(c.person.handle)}). Built with plain JavaScript and Vite.</p>
    </footer>`;
}

export function renderSurface(root, c) {
  root.innerHTML = `
    <a class="skip-link" href="#surface">Skip to content</a>
    ${renderHeader(c)}
    <main id="surface" tabindex="-1">
      ${renderHero(c)}
      ${renderAbout(c)}
      ${renderWork(c)}
      ${renderStack(c)}
      ${renderNow(c)}
      ${renderContact(c)}
    </main>
    ${renderFooter(c)}`;
  return root.querySelector('#surface');
}