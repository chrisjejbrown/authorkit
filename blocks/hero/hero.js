function setBackgroundFocus(img) {
  const { title } = img.dataset;
  if (!title?.includes('data-focal')) return;
  delete img.dataset.title;
  const [x, y] = title.split(':')[1].split(',');
  img.style.objectPosition = `${x}% ${y}%`;
}

function decorateBackground(bg) {
  const bgPic = bg.querySelector('picture');
  if (!bgPic) return;

  const img = bgPic.querySelector('img');
  setBackgroundFocus(img);

  const vidLink = bgPic.closest('a[href*=".mp4"]');
  if (!vidLink) return;
  const video = document.createElement('video');
  video.src = vidLink.href;
  video.loop = true;
  video.muted = true;
  video.inert = true;
  video.setAttribute('playsinline', '');
  video.setAttribute('preload', 'none');
  video.load();
  video.addEventListener('canplay', () => {
    video.play();
    bgPic.remove();
  });
  vidLink.parentElement.append(video, bgPic);
  vidLink.remove();
}

function decorateForeground(fg) {
  const { children } = fg;
  for (const [idx, child] of [...children].entries()) {
    const heading = child.querySelector('h1, h2, h3, h4, h5, h6');
    const text = heading || child.querySelector('p, a, ul');
    if (heading) {
      heading.classList.add('hero-heading');
      const detail = heading.previousElementSibling;
      if (detail) {
        detail.classList.add('hero-detail');
      }
    }
    // Determine foreground column types
    if (text) {
      child.classList.add('fg-text');
      if (idx === 0) {
        child.closest('.hero').classList.add('hero-text-start');
      } else {
        child.closest('.hero').classList.add('hero-text-end');
      }
    }
  }
}

export default async function init(el) {
  const rows = [...el.querySelectorAll(':scope > div')];

  // Background-image-only hero (single row whose only content is an image):
  // use that row as the background and add an empty foreground so the image
  // renders as a full-bleed banner rather than a small inline foreground image.
  const isImageOnly = (row) => {
    const hasImg = row.querySelector('picture, img');
    const hasText = row.querySelector('h1, h2, h3, h4, h5, h6, p, ul, ol')
      || (row.textContent || '').trim().length > 0;
    return hasImg && !hasText;
  };
  if (rows.length === 1 && isImageOnly(rows[0])) {
    const bg = rows[0];
    bg.classList.add('hero-background');
    decorateBackground(bg);
    const emptyFg = document.createElement('div');
    emptyFg.classList.add('hero-foreground');
    el.append(emptyFg);
    el.classList.add('hero-banner-only');
    return;
  }

  const fg = rows.pop();
  fg.classList.add('hero-foreground');
  decorateForeground(fg);
  if (rows.length) {
    const bg = rows.pop();
    bg.classList.add('hero-background');
    decorateBackground(bg);
  }
}
