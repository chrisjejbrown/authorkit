// Accordion: each block row is [title, content]. Renders as collapsible
// <details>/<summary> items so the first opens by default.
export default function decorate(block) {
  const rows = [...block.children];
  block.textContent = '';

  rows.forEach((row, idx) => {
    const cells = [...row.children];
    const titleCell = cells[0];
    const contentCell = cells[1];

    const details = document.createElement('details');
    details.className = 'accordion-item';
    if (idx === 0) details.open = true;

    const summary = document.createElement('summary');
    summary.className = 'accordion-summary';
    summary.textContent = titleCell ? titleCell.textContent.trim() : '';
    details.append(summary);

    const body = document.createElement('div');
    body.className = 'accordion-body';
    if (contentCell) {
      while (contentCell.firstChild) body.append(contentCell.firstChild);
    }
    details.append(body);

    block.append(details);
  });
}
