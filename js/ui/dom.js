// Micro-helpers de construction DOM.
// On construit des noeuds plutot que de concatener du HTML : les noms de
// boissons viennent de l'OCR et de la saisie libre, et passer par textContent
// evite d'avoir a se demander ce qui arrive avec un "&" ou un "<".

export function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);

  for (const [key, value] of Object.entries(props)) {
    if (value === null || value === undefined || value === false) continue;
    if (key === 'class') node.className = value;
    else if (key === 'text') node.textContent = value;
    else if (key.startsWith('on')) node.addEventListener(key.slice(2).toLowerCase(), value);
    else if (key === 'dataset') Object.assign(node.dataset, value);
    else if (key in node && key !== 'list') node[key] = value;
    else node.setAttribute(key, value);
  }

  for (const child of children.flat()) {
    if (child === null || child === undefined || child === false) continue;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }

  return node;
}

export const frag = (...children) => {
  const f = document.createDocumentFragment();
  f.append(...children.flat().filter(Boolean));
  return f;
};
