export type SSRBoostrapMetaEntry = {
  markers: {
    pre: Comment
    post: Comment
  }
  data: unknown
}

export type SSRBootstrapMap = Map<string, SSRBoostrapMetaEntry>

export const SSRBootstrapScriptContents = `
window.__kaiokenSuspenseMeta = new Map();
console.log("SSRBootstrap");
const mutationObserver = new MutationObserver(mutations => {
  for (const mutation of mutations) {
    if (mutation.type === 'childList') {
      for (const node of mutation.addedNodes) {
        if (node.nodeType === Node.COMMENT_NODE) {
          const comment = node.textContent;
          if (comment.startsWith('suspense:0:k:')) {
            const id = comment.replace('suspense:0:', '');
            if (window.__kaiokenSuspenseMeta.get(id)) return;  
            window.__kaiokenSuspenseMeta.set(id, { markers: { pre: node } });
            console.log('window.__kaiokenSuspenseMeta', window.__kaiokenSuspenseMeta);
          } else if (comment.startsWith('suspense:1:k:')) {
            const meta = window.__kaiokenSuspenseMeta.get(comment.replace('suspense:1:', ''));
            if (!meta) {
              console.error('no meta entry for', comment);
            }
            if (meta.resolved) return;
            meta.markers.post = node;
          }
        }
      }
    }
  }
});

mutationObserver.observe(document, {
  childList: true,
  subtree: true,
});

window.__kaioken_resolveSuspense = (id, data) => {
  const el = document.currentScript;
  const meta = window.__kaiokenSuspenseMeta.get(id);
  if (!meta) {
    console.error('no meta for', id);
  }
  meta.data = data;

  const { markers } = meta;

  // replace the range of nodes between the comment nodes with the real content

  let n = markers.pre.nextSibling;
  while (n !== markers.post) {
    const next = n.nextSibling; 
    n.remove();
    n = next;
  }

  const content = el.previousSibling;
  n = content.firstChild;
  while (n) {
    markers.pre.parentNode?.insertBefore(n, markers.pre);
    n = n.nextSibling;
  }
  markers.pre.remove();
  markers.post.remove();
  el.previousSibling.remove();
  el.remove();

  meta.resolved = true;
  
  console.log('suspense resolved', meta, content);
}`
