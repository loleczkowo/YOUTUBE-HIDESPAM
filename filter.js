const regexList = [
  /DO\s*NT\s*READ\s*MY\s*NAME/i,
  /MY\s+(V[I1L]DEOS?|CONTENT|UPLOADS?)?\s*((IS|ARE|[I1L][S5])\s*)?(WAY\s+)?BETTER/i,
  /^\s*(DONT\s+)?TRANSLATE/i,
  /I\s+JUST\s+UPLOADED\s+(A\s+)?(HILARIOUS|FUNNY)\s+CLIP/i,
  /UTTP\s+[I1L][S5]\s+(FAR\s+|WAY\s+)?BETTER\s+THAN/i,
  /(?:[I1l]M|[I1l]\s+AM)\s+BETTER\s+THAN\s+\S+/i
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
  '"IM BETTER THEN e'
];


// todo make this
const commentRegexList = [
  /WHO('?S|\s+IS)?\s+(HERE\s+)?(RE)?WATCHING.*20\d{2}/i
];

const commentRegexReason = [
  '"whos watching at year 4269"'
];

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
    .toUpperCase()
    .replace(/\r?\n/g, ' ')                                // Remove line breaks
    .replace(/[\u202A-\u202E\u200B-\u200F]/g, '')          // Remove invisible Unicode formatting chars
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')      // Strip accents and diacritics
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


const knownBots = [];


function hideReplies() {
  const replies = document.querySelectorAll('ytd-comment-view-model');

  replies.forEach(reply => {
    let authorName = null

    const textElem = reply.querySelector('#content-text');
    if (!textElem) return;

    // const authorElem = reply.querySelector('#author-text');
    let authorElem = null // debuging
    const norm = normalize(textElem.textContent);
    if (authorElem) {
        authorName = normalize(authorElem.textContent || '');
        if (knownBots.includes(authorName)) {
          console.log(`[DEL-SPAM] already muted name: ${authorName} (message: ${norm})`);
          showNotice(`[DEL-SPAM] already muted name: ${authorName}`);
          reply.remove();
          return
        }
        for (const nameRegex of nameRegexList) {
            if (nameRegex.test(authorName)) {
                console.log(`[DEL-SPAM] removed due to name match: ${authorName} (message: ${norm})`);
                showNotice(`[DEL-SPAM] removed due to name match: ${authorName}`);
                knownBots.push(authorName);
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
        reply.remove();
        break;
      }
    }
  });
}

// Throttle wrapper
let lastRun = 0;
const THROTTLE_MS = 500;
const WAITBEFORE = 250

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function throttledHideReplies() {
  await sleep(WAITBEFORE);
  while (true) {
    const now = Date.now();

    if (now - lastRun > THROTTLE_MS) {
      lastRun = now;
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

hideReplies();
