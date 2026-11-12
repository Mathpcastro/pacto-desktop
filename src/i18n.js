import { useEffect, useLayoutEffect } from "react";
import { intlLocale, normalizeLocale, translateUi } from "../core/i18n.mjs";

let current = "pt-BR";
const ATTRS = ["placeholder", "aria-label", "title", "alt"];
const SKIP = new Set(["SCRIPT", "STYLE", "CODE", "PRE"]);
const FIELD = new Set(["TEXTAREA", "INPUT"]);
const textSource = new WeakMap();
const attrSource = new WeakMap();

export function getLocale() {
  return current;
}
export function setLocale(locale) {
  current = normalizeLocale(locale);
}
export function formatLocale() {
  return intlLocale(current);
}
export { translateUi, normalizeLocale };

function remember(map, key, value, translated) {
  const saved = map.get(key);
  if (saved === undefined || (value !== saved && value !== translated)) map.set(key, value);
  return map.get(key);
}

export function applyDomTranslations(root = document.body) {
  if (!root) return;
  const spanish = current === "es";
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const el = node.parentElement;
      if (!el || SKIP.has(el.tagName) || FIELD.has(el.tagName)) return NodeFilter.FILTER_REJECT;
      if (el.closest("[data-user-text], .doc-view")) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  for (const node of nodes) {
    const translated = translateUi("es", textSource.get(node) ?? node.nodeValue);
    const source = remember(textSource, node, node.nodeValue, translated);
    const next = spanish ? translateUi("es", source) : source;
    if (node.nodeValue !== next) node.nodeValue = next;
  }
  for (const el of root.querySelectorAll("*")) {
    if (SKIP.has(el.tagName) || el.closest("[data-user-text], .doc-view")) continue;
    if (!attrSource.has(el)) attrSource.set(el, new Map());
    const saved = attrSource.get(el);
    for (const attr of ATTRS) {
      if (!el.hasAttribute(attr)) continue;
      const value = el.getAttribute(attr);
      const translated = translateUi("es", saved.get(attr) ?? value);
      const source = saved.has(attr) && (value === saved.get(attr) || value === translated) ? saved.get(attr) : value;
      saved.set(attr, source);
      const next = spanish ? translateUi("es", source) : source;
      if (value !== next) el.setAttribute(attr, next);
    }
  }
}

export function useDomLocale(locale) {
  useLayoutEffect(() => {
    setLocale(locale);
    document.documentElement.lang = locale === "es" ? "es" : "pt-BR";
    applyDomTranslations();
  }, [locale]);
  useEffect(() => {
    if (locale !== "es") return undefined;
    let frame = 0;
    const run = () => {
      frame = 0;
      if (getLocale() === "es") applyDomTranslations();
    };
    const obs = new MutationObserver(() => {
      if (!frame) frame = requestAnimationFrame(run);
    });
    obs.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
    return () => {
      obs.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  }, [locale]);
}
