/**
 * Utility for deep DOM serialization including Shadow DOM, Frame traversal, 
 * and Multi-tab/Window context aggregation.
 */

export interface SerializedNode {
  tagName?: string;
  attributes?: Record<string, string>;
  text?: string;
  children?: SerializedNode[];
  isShadowRoot?: boolean;
  isFrame?: boolean;
  selector?: string;
}

export interface GlobalContext {
  windows: {
    id: number;
    tabs: {
      id: number;
      title: string;
      url: string;
      frames: string[];
    }[];
  }[];
}

export const DEEP_TRAVERSAL_SCRIPT = `
  (function() {
    function getSelector(el) {
      if (el.id) return '#' + el.id;
      if (el.className && typeof el.className === 'string') {
        const classes = Array.from(el.classList).join('.');
        if (classes) return el.tagName.toLowerCase() + '.' + classes;
      }
      return el.tagName.toLowerCase();
    }

    function serialize(node) {
      if (!node) return null;
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent.trim();
        return text ? { text: text.substring(0, 100) } : null;
      }

      if (node.nodeType !== Node.ELEMENT_NODE) return null;

      const obj = {
        tagName: node.tagName.toLowerCase(),
        attributes: {},
        selector: getSelector(node),
        children: []
      };

      const attrs = ['id', 'name', 'placeholder', 'type', 'role', 'aria-label'];
      attrs.forEach(attr => {
        if (node.hasAttribute(attr)) {
          obj.attributes[attr] = node.getAttribute(attr);
        }
      });

      if (node.shadowRoot) {
        const shadowChildren = Array.from(node.shadowRoot.childNodes)
          .map(serialize)
          .filter(Boolean);
        if (shadowChildren.length > 0) {
          obj.children.push({ isShadowRoot: true, children: shadowChildren });
        }
      }

      const children = Array.from(node.childNodes)
        .map(serialize)
        .filter(Boolean);
      
      if (children.length > 0) {
        obj.children.push(...children);
      }

      return obj;
    }

    return JSON.stringify(serialize(document.body));
  })();
`;

export async function captureGlobalContext(): Promise<string> {
  if (typeof chrome === 'undefined' || !chrome.tabs || !chrome.windows) {
    return "Local Dev Mode: Mocking Multi-Tab Context.";
  }

  try {
    const windows = await chrome.windows.getAll({ populate: true });
    let fullContext = "";

    for (const win of windows) {
      fullContext += `\n=== WINDOW [ID: ${win.id}] ===\n`;
      if (!win.tabs) continue;

      for (const tab of win.tabs) {
        if (!tab.id || tab.url?.startsWith('chrome://')) continue;

        fullContext += `\n--- TAB: ${tab.title} [${tab.url}] ---\n`;
        
        try {
          const results = await chrome.scripting.executeScript({
            target: { tabId: tab.id, allFrames: true },
            func: () => {
              const text = document.body.innerText.substring(0, 2000);
              const inputs = Array.from(document.querySelectorAll('input, button, select'))
                .map(el => `[${el.tagName}] ${el.getAttribute('placeholder') || el.innerText || ''}`)
                .join(', ');
              return `Content: ${text}\nInteractions: ${inputs}`;
            }
          });

          results.forEach((r, idx) => {
            fullContext += `\n[Frame ${idx}]: ${r.result}\n`;
          });
        } catch (e) {
          fullContext += `\n[Access Denied or Loading]\n`;
        }
      }
    }

    return fullContext;
  } catch (err) {
    console.error('Global capture failed:', err);
    return "Error scanning windows/tabs.";
  }
}
