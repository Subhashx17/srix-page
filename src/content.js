// All the words on the site live here. Edit this file, not surface.js.
// Any value that starts with YOUR_ is a placeholder (see TODO in PROJECT_STATE.md).
// Special characters are written as \u escapes on purpose (\u00b7 is the middle dot).

export const content = {
  site: {
    lang: 'en',
    title: 'Nizampuram Srivardhan (srix) \u00b7 UNDERNEATH',
    description:
      'Portfolio of Nizampuram Srivardhan, a first-year B.Tech CSE student who builds apps and tools.',
  },

  person: {
    name: 'Nizampuram Srivardhan',
    handle: 'srix',
    school: 'Anurag University',
    classOf: 2030,
    location: 'YOUR_CITY_HERE',
  },

  // Header shows these 3 links.
  nav: [
    { label: 'Work', href: '#work' },
    { label: 'About', href: '#about' },
    { label: 'Contact', href: '#contact' },
  ],

  hero: {
    eyebrow: 'Portfolio \u00b7 Class of 2030',
    headline: 'I build apps and tools.',
    lead:
      "I'm Srivardhan (srix), a first-year B.Tech CSE student at Anurag University. I am learning C and cybersecurity, and I like to see how things work underneath.",
    actions: [
      { label: 'See my work', href: '#work' },
      { label: 'GitHub', href: 'https://github.com/nizampuram-srix' },
    ],
    // Shown by src/deep/intro.js after the opening move (or at once if motion is reduced).
    hint: 'Hold anywhere to look deeper',
  },

  about: {
    heading: 'About',
    paragraphs: [
      "I'm Nizampuram Srivardhan, a first-year B.Tech CSE student at Anurag University, class of 2030. Online I go by srix.",
      'I build apps and tools, and I learn by making things that work.',
      'Right now I am learning C and cybersecurity. I want to understand what a computer really does under the page. That is also why this site is built the way it is.',
    ],
  },

  work: {
    heading: 'Work',
    intro: 'Things I have built, and one space for the next one.',
    projects: [
      {
        id: 'work-anchor',
        title: 'Anchor',
        kind: 'Mobile app',
        year: 'YOUR_YEAR_HERE',
        tagline: 'An app with two roles: Circle and Patient.',
        description: 'Anchor has games, a Today timeline and a Family tab.',
        study: ['The app is built with Flutter, and Firebase is the backend.'],
        tags: ['Flutter', 'Firebase'],
        links: [{ label: 'Code', href: 'YOUR_ANCHOR_REPO_URL_HERE' }],
        placeholder: false,
      },
      {
        id: 'work-usbcam',
        title: 'USBCam Clone',
        kind: 'Android app + Windows client',
        year: 'YOUR_YEAR_HERE',
        tagline: 'Turns an Android phone into a USB webcam for Windows.',
        description:
          'A Kotlin app runs on the phone. A Python client runs on the Windows PC.',
        study: [
          'The phone and the PC each run their own piece. Together they let Windows use the phone as a USB webcam.',
        ],
        tags: ['Kotlin', 'Python', 'Android', 'Windows'],
        links: [{ label: 'Code', href: 'YOUR_USBCAM_REPO_URL_HERE' }],
        placeholder: false,
      },
      {
        id: 'work-underneath',
        title: 'UNDERNEATH',
        kind: 'Website \u00b7 this one',
        year: '2026',
        tagline: 'This portfolio.',
        description:
          'The page is the top layer. The idea is to show what is underneath it: the HTML, the code, the bytes and the bits.',
        study: [
          'It is built with plain JavaScript and Vite. No frameworks and no paid services.',
          'The Surface comes first. The glass lens and the deeper layers are added step by step.',
        ],
        tags: ['JavaScript', 'Vite', 'CSS'],
        links: [{ label: 'Code', href: 'YOUR_UNDERNEATH_REPO_URL_HERE' }],
        placeholder: false,
      },
      {
        id: 'work-placeholder',
        title: 'PROJECT_NAME_HERE',
        kind: 'Coming soon',
        year: 'YOUR_YEAR_HERE',
        tagline: 'YOUR_ONE_LINE_HERE',
        description: 'A new project will go here.',
        study: [],
        tags: [],
        links: [],
        placeholder: true,
      },
    ],
  },

  stack: {
    heading: 'Stack',
    groups: [
      {
        name: 'Building with',
        items: ['Flutter', 'Firebase', 'Kotlin', 'Python', 'JavaScript', 'HTML + CSS'],
      },
      { name: 'Learning', items: ['C', 'Cybersecurity'] },
      { name: 'Tools', items: ['Git', 'GitHub', 'Vite', 'PowerShell'] },
    ],
  },

  now: {
    heading: 'Now',
    items: [
      'Learning C.',
      'Learning cybersecurity.',
      'Building this portfolio, UNDERNEATH, one step at a time.',
      'Working on Anchor.',
    ],
  },

  contact: {
    heading: 'Contact',
    text: 'Email is the best place to start. I am based in YOUR_CITY_HERE.',
    // "text" is the plain text shown on the Surface (main.js) so nobody needs the secret layer.
    links: [
      { label: 'Email', href: 'mailto:YOUR_EMAIL_HERE', text: 'YOUR_EMAIL_HERE' },
      {
        label: 'GitHub',
        href: 'https://github.com/nizampuram-srix',
        text: 'github.com/nizampuram-srix',
      },
      { label: 'LinkedIn', href: 'YOUR_LINKEDIN_URL_HERE', text: 'YOUR_LINKEDIN_URL_HERE' },
    ],
  },

  // Step 6: the secret 5th layer (src/deep/human.js).
  human: {
    label: 'LAYER 5 \u00b7 HUMAN',
    lines: [
      'Underneath all of it, there is a person.',
      'That is me. Srivardhan.',
      'And on the other side of the screen, there is you.',
    ],
    panelTitle: 'What this page can already see about you',
    privacy: 'Read on your device. Sent nowhere.',
    showCode: 'Show the code',
    hideCode: 'Hide the code',
    back: 'Back to the surface',
  },

  // Step 6: the optional hum (src/deep/sound.js).
  sound: {
    label: 'Depth hum',
    on: 'Sound is on. Press to turn it off.',
    off: 'Sound is off. Press to turn it on.',
  },
};

export default content;