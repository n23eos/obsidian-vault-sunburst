import { getLanguage } from "obsidian";
import { LocaleCode, resolveLocale } from "./i18n";

/** Current Obsidian UI language, narrowed to a locale this plugin ships. */
export function detectLocale(): LocaleCode {
  return resolveLocale(getLanguage());
}
