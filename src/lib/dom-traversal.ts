/**
 * Utility for deep DOM serialization including Shadow DOM and Frame traversal.
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

export const DEEP_TRAVERSAL_SCRIPT = `
  (function() {
    function getSelector(el) {
      if (el.id) return '#' + el.id;
      if (el.className) {
        const classes = Array.from(el.classList).join('.');
        if (classes) return el.tagName.toLowerCase() + '.' + classes;
      }
      return el.tagName.toLowerCase();
    }

    function serialize(node) {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent.trim();
        return text ? { text } : null;
      }

      if (node.nodeType !== Node.ELEMENT_NODE) return null;

      const obj = {
        tagName: node.tagName.toLowerCase(),
        attributes: {},
        selector: getSelector(node),
        children: []
      };

      // Capture essential attributes
      const attrs = ['id', 'class', 'name', 'placeholder', 'value', 'type', 'role', 'aria-label', 'href'];
      attrs.forEach(attr => {
        if (node.hasAttribute(attr)) {
          obj.attributes[attr] = node.getAttribute(attr);
        }
      });

      // Piercing Shadow DOM
      if (node.shadowRoot) {
        obj.children.push({
          isShadowRoot: true,
          children: Array.from(node.shadowRoot.childNodes).map(serialize).filter(Boolean)
        });
      }

      // Handling iFrames (Note: Cross-origin frames return limited info without further injection)
      if (node.tagName === 'IFRAME') {
        obj.isFrame = true;
        try {
          if (node.contentDocument) {
            obj.children = Array.from(node.contentDocument.childNodes).map(serialize).filter(Boolean);
          }
        } catch (e) {
          obj.attributes.crossOrigin = 'true';
        }
      }

      // Standard Children
      Array.from(node.childNodes).forEach(child => {
        const s = serialize(child);
        if (s) obj.children.push(s);
      });

      return obj;
    }

    return JSON.stringify(serialize(document.body));
  })();
`;

export async function captureActiveTabDOM(): Promise<string> {
  if (typeof chrome === 'undefined' || !chrome.tabs || !chrome.scripting) {
    console.warn('Chrome extension APIs not available. Returning mock DOM.');
    return "<html><body><button id='mock'>Mock Element</button></body></html>";
  }

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) throw new Error('No active tab found');

    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id, allFrames: true },
      func: () => {
        // This is a simplified version of the logic above for direct injection
        return document.body.innerText.substring(0, 5000); // Basic fallback for quick context
      }
    });

    return results.map(r => r.result).join('\\n--- Frame Boundary ---\\n');
  } catch (err) {
    console.error('Failed to capture DOM:', err);
    return "Error capturing DOM context.";
  }
}
