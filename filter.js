// Disclaimer: I'm not a JS dev. Most of this code was made with the help of AI.

let enabled = false;

chrome.storage.sync.get({ enabled: true }, (data) => {
  enabled = data.enabled;
  console.log(`[DEL-SPAM] Loaded: ${enabled ? 'enabled' : 'disabled'}`);
});

// Live-toggle from the popup without reload
chrome.storage.onChanged.addListener((changes) => {
  if (changes.enabled) {
    enabled = changes.enabled.newValue;
    if (enabled) {
      showNotice('[DEL-SPAM] (ENABLED)');
      hideReplies();
    } else {
      showNotice('[DEL-SPAM] (DISABLED) Reload the page to see the deleted comments');
    }
    console.log(`[DEL-SPAM] Toggled: ${enabled ? 'enabled' : 'disabled'}`);
  }
});

const regexList = [
  /DO\s*NT\s*READ\s*MY\s*NAME/i,
  /M?Y\s+(V[I1L]DEOS?|CONTENT|UPLOADS?)?\s+((A?RE?|[IL]S)\s*)?((SUPER\s+)?WAY\s+)?BETTER/i,
  /^\s*(DONT\s+)?TRANSLATE/i,
  /I\s+(JUST\s+)?UPLOADED\s+(A\s+)?(HILARIOUS|FUNNY)\s+(CLIP|V[Il]DEO)/i,
  /UTTP\s+[I1L][S5]\s+(FAR\s+|WAY\s+)?BETTER\s+THAN/i,
  // /(?:[Il]M|[Il]\s+AM)\s+(FAR\s+)?BETTER/i,           // It might be too far?
  /IS\s+AI\s+(GEN(ERATED?)?\s+)?(?:[Il]M|[Il]\s+AM)\s+(FAR\s+|WAY\s+)?BETTER/i, // its better
  /DIDNT\s+READ\s+YOUR?S?\s+COMMENT/i,
  /[Il]M?\s+NOT\s+READING\s+YOUR?\s+COMMENT/i,
  /([IL]|WE)\s+(MAKE)?\s+(BETTER)\s+(CONTENT|V[Il]DEOS?|CL[Il]PS?)/i,
  /(FIRST|SECOND|THIRD|FOURTH|FIFTH|SIXTH|SEVENTH|EIGHTH|NINTH)\s+WARNING\s+(TROLL|N[Il][CG][CG]ER)/i,

  // Here are some hard coded spams that are too "normal" to make a regexp from them
  /ZACK D FILMS IS MID IM FAR BETTER/i,
  /IM BETTER THAN (ZACK( D FILMS)?)( LMAO)?/i,
  /ZACK(\s*D\s*FILMS)? steals? ((MY|M[Il]NE|OUR|[Il]) )?c\s*o\s*n\s*t\s*e\s*n\s*t/i
];

const nameRegexList = [
  /UTTP/i,
  /DONTREADMY(PICTURE|CHANNEL|BIO|DESCRIPTION)/i
];

const regexReason = [
  '"DONT READ MY NAME"',
  '"MY STUFF IS BETTER"',
  '"TRANSLATE" bot',
  '"I JUST UPLOADED A..."',
  '"UTTP IS BETTER THEN..."',
  // '"IM BETTER THEN ..."',
  '"... IS AI GEN IM BETTER"',
  '"DIDINT READ YOUR COMMENT"',
  '"IM NOT READING YOUR COMMENT"',
  '"I MAKE BETTER ..."',
  '"x WARNING TROLL"',

  '"... is bad im better"',
  '"im better then..."',
  '"... steals content"'

];

let lastRun = 0;
const THROTTLE_MS = 500;
const WAITBEFORE = 300

function clearDirection(text) {
  const LTR = '\u202D';
  const UNDO = '\u202C';
  const RTL = '\u202E';
  const RTL2 = '\u202B';
  const NEW_LINE = '\n';

  const lastDirs = [];
  let currentDir = 0; // default LTR

  const parts = text.split(/(\u202D|\u202C|\u202E|\u202B|\n)/).filter(Boolean);
  let result = '';
  let nextIndex = 0;

  for (const part of parts) {
    if (part === LTR) {
      lastDirs.push(0);
      currentDir = 0;
    } else if (part === RTL || part === RTL2) {
      lastDirs.push(1);
      currentDir = 1;
    } else if (part === UNDO) {
      currentDir = lastDirs.length ? lastDirs.pop() : 0;
    } else if (part === NEW_LINE) {
      currentDir = 0;
      lastDirs.length = 0;
      result += '\n';
      nextIndex = result.length;
    } else {
      if (currentDir) {
        const flipped = part.split('').reverse().join('');
        result = result.slice(0, nextIndex) + flipped + result.slice(nextIndex);
      } else {
        result = result.slice(0, nextIndex) + part + result.slice(nextIndex);
        nextIndex += part.length;
      }
    }
  }

  return result;
}

function normalize(text) {
  text = clearDirection(text);

  return text
    .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')      // Strip accents and diacritics
    .toUpperCase()
    .replace(/\r?\n/g, ' ')                                // Remove line breaks
    .replace(/[\u202A-\u202E\u200B-\u200F]/g, '')          // Remove invisible Unicode formatting chars
    .replace(/[^A-Z0-9\s]/g, '');                          // Remove non-alphanumerics (preserve spaces)
}


let notice_count = 0;

function showNotice(text) {
  const notice = document.createElement('div');
  notice.textContent = text;
  notice.style.position = 'fixed';
  notice.style.bottom = (notice_count*45) + 20 + 'px';
  notice.style.left = '20px';
  notice.style.background = '#222';
  notice.style.color = '#fff';
  notice.style.padding = '8px 12px';
  notice.style.borderRadius = '4px';
  notice.style.fontSize = '14px';
  notice.style.zIndex = 9999;
  notice.style.opacity = '0.7';
  notice.style.transition = 'transform 4s ease-in, opacity 0.3s ease 3.8s';
  const orin = notice_count == 0;
  notice_count += 1;

  document.body.appendChild(notice);

  requestAnimationFrame(() => {
    notice.style.transform = 'translateX(-100%)';
    notice.style.opacity = '0';
  });

  setTimeout(() => {
    notice.remove();
    if (orin) {
        notice_count = 0
    }
  }, 4000);
}


(function injectBotCSS() {
  if (document.getElementById('bot-count-css')) return;      // already present
  const style = document.createElement('style');
  style.id = 'bot-count-css';
  style.textContent = `
      .bot-count {
          font-size: 0.8em;         /* 80 % of normal text */
          opacity: 0.7;             /* a touch lighter */
      }`;
  document.head.append(style);
})();

function relabelReplies(thread) {
    const count  = thread.dataset.botCount || '0';
    const suffix = ` (${count} bots)`;

    const renderer = thread.querySelector('ytd-comment-replies-renderer');
    if (!renderer) return;

    const buttons = [
        ...renderer.querySelectorAll('ytd-button-renderer#more-replies button'),
        ...renderer.querySelectorAll('ytd-button-renderer#less-replies button')
    ];

    if (buttons.length === 0) {
        buttons.push(
            ...renderer.querySelectorAll(
                'div:nth-child(1) > div:nth-child(1) > div:nth-child(1) ytd-button-renderer button,' +
                'div:nth-child(1) > div:nth-child(1) > div:nth-child(2) ytd-button-renderer button'
            )
        );
    }

    buttons.forEach(btn => {
        if (!btn) return;

        btn.querySelectorAll('div span.yt-core-attributed-string[role="text"]')
          .forEach(span => {
              const base = span.textContent.replace(/\s\(\d+\s+bots\)$/, '');
              span.innerHTML = `${base}<span class="bot-count">${suffix}</span>`;
          });

        const label = btn.getAttribute('aria-label') || '';
        btn.setAttribute(
            'aria-label',
            label.replace(/\s\(\d+\s+bots\)$/, '') + suffix
        );
    });
}

const knownBots = [];

// TODO a retry system
function hideReplies(depth = 0) {
  lastRun = Date.now();

  const replies = document.querySelectorAll('ytd-comment-view-model');

  replies.forEach(reply => {
    let authorName = null

    const textElem = reply.querySelector('#content-text');
    if (!textElem) return;

    const thread = reply.closest('ytd-comment-thread-renderer');
    const n = thread.dataset.botCount ? parseInt(thread.dataset.botCount, 10) + 1 : 1;
    const authorElem = reply.querySelector('#author-text');
    // let authorElem = null // debuging
    const norm = normalize(textElem.textContent);
    if (authorElem) {
        authorName = normalize(authorElem.textContent || '');
        if (knownBots.includes(authorName)) {
          console.log(`[DEL-SPAM] already muted name: ${authorName} (message: ${norm})`);
          showNotice(`[DEL-SPAM] already muted name: ${authorName}`);
          reply.remove();
          if (thread) {
            thread.dataset.botCount = n;
            relabelReplies(thread);
          }
          return
        }
        for (const nameRegex of nameRegexList) {
            if (nameRegex.test(authorName)) {
                console.log(`[DEL-SPAM] removed due to name match: ${authorName} (message: ${norm})`);
                showNotice(`[DEL-SPAM] removed due to name match: ${authorName}`);
                knownBots.push(authorName);
                if (thread) {
                  thread.dataset.botCount = n;
                  relabelReplies(thread);
                }
                reply.remove();
                return;
            }
        }
    }

    for (const regex of regexList) {
      if (regex.test(norm)) {
        const reason = regexReason[regexList.indexOf(regex)] || '';
        console.log(`[DEL-SPAM] deleted comment ${reason} (message: ${norm})`);
        showNotice(`[DEL-SPAM] deleted comment ${reason}`);
        if (authorName) knownBots.push(authorName);
        if (thread) {
          thread.dataset.botCount = n;
          relabelReplies(thread);
        }
        reply.remove();
        break;
      }
    }
  });
}

// Throttle wrapper
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function throttledHideReplies() {
  if (!enabled) return;
  await sleep(WAITBEFORE);
  while (true) {
    const now = Date.now();

    if (now - lastRun > THROTTLE_MS) {
      hideReplies();
      break;
    } else if (now > lastRun) {
      break;
    } else {
      break;
    }
  }
}

document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key === '/') {
    showNotice('[DEL-SPAM] manual refresh');
    hideReplies();
  }
});

const observer = new MutationObserver(throttledHideReplies);
observer.observe(document.body, { childList: true, subtree: true });

if (enabled) hideReplies();
