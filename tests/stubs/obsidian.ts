import type { SettingDefinitionItem } from "obsidian";

interface PluginHost {
  settings: Record<string, unknown>;
  saveData: (value: unknown) => Promise<void>;
}

export class TFile {}
export class TFolder {}
export class ItemView {}
export class Menu {}
export class Notice {}
export class Scope {}
export const getLanguage = () => "en";

export class Plugin {
  storedData: unknown = null;
  savedData: unknown = null;
  settingTab!: PluginSettingTab;
  searchableSettings: SettingDefinitionItem[] = [];

  constructor(public app: unknown, _manifest: unknown) {}
  async loadData() { return this.storedData; }
  async saveData(value: unknown) { this.savedData = structuredClone(value); }
  registerView() {}
  addRibbonIcon() {}
  addCommand() {}
  addSettingTab(tab: PluginSettingTab) {
    this.settingTab = tab;
    this.searchableSettings = tab.getSettingDefinitions();
  }
}

export class PluginSettingTab {
  constructor(public app: unknown, private readonly host: PluginHost) {}
  containerEl = { rows: [] as Setting[], empty() { this.rows = []; } };
  getSettingDefinitions(): SettingDefinitionItem[] { return []; }
  getControlValue(key: string): unknown { return this.host.settings[key]; }
  async setControlValue(key: string, value: unknown) {
    this.host.settings[key] = value;
    await this.host.saveData(this.host.settings);
  }
  display() {}
}

export class TextAreaComponent {
  inputEl = { rows: 0 };
  value = "";
  change!: (value: string) => void | Promise<void>;
  setValue(value: string) { this.value = value; return this; }
  onChange(callback: (value: string) => void | Promise<void>) { this.change = callback; return this; }
}

export class SliderComponent {
  value = 0;
  change!: (value: number) => void | Promise<void>;
  setLimits(_min: number, _max: number, _step: number) { return this; }
  setValue(value: number) { this.value = value; return this; }
  onChange(callback: (value: number) => void | Promise<void>) { this.change = callback; return this; }
}

export class Setting {
  name = "";
  desc = "";
  textArea?: TextAreaComponent;
  slider?: SliderComponent;
  constructor(container: { rows: Setting[] }) { container.rows.push(this); }
  setName(value: string) { this.name = value; return this; }
  setDesc(value: string) { this.desc = value; return this; }
  addTextArea(callback: (component: TextAreaComponent) => void) {
    this.textArea = new TextAreaComponent(); callback(this.textArea); return this;
  }
  addSlider(callback: (component: SliderComponent) => void) {
    this.slider = new SliderComponent(); callback(this.slider); return this;
  }
}
