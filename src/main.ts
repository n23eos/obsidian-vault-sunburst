import { App, Plugin, PluginSettingTab, Setting, WorkspaceLeaf } from "obsidian";
import { LocaleStrings, detectLocale, strings } from "./i18n";
import { DaisyView, VIEW_TYPE_DAISY } from "./view";

export interface DaisySettings {
  excludedPaths: string[];
  ringCount: number;
}

export const DEFAULT_SETTINGS: DaisySettings = {
  excludedPaths: [],
  ringCount: 5,
};

const MIN_RINGS = 3;
const MAX_RINGS = 8;

export default class VaultDaisyPlugin extends Plugin {
  settings: DaisySettings = { ...DEFAULT_SETTINGS };

  async onload(): Promise<void> {
    await this.loadSettings();
    const locale = strings(detectLocale());

    this.registerView(VIEW_TYPE_DAISY, (leaf: WorkspaceLeaf) => new DaisyView(leaf, this));
    this.addSettingTab(new DaisySettingTab(this.app, this, locale));

    this.addRibbonIcon("pie-chart", locale.ribbonTip, () => {
      void this.activateView();
    });

    this.addCommand({
      id: "open-vault-sunburst",
      name: locale.cmdOpen,
      callback: () => void this.activateView(),
    });
  }

  async loadSettings(): Promise<void> {
    this.settings = { ...DEFAULT_SETTINGS, ...((await this.loadData()) ?? {}) };
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
    for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE_DAISY)) {
      if (leaf.view instanceof DaisyView) void leaf.view.applySettings();
    }
  }

  async activateView(): Promise<void> {
    const existing = this.app.workspace.getLeavesOfType(VIEW_TYPE_DAISY);
    if (existing.length > 0) {
      await this.app.workspace.revealLeaf(existing[0]);
      return;
    }
    const leaf = this.app.workspace.getLeaf("tab");
    await leaf.setViewState({ type: VIEW_TYPE_DAISY, active: true });
    await this.app.workspace.revealLeaf(leaf);
  }
}

class DaisySettingTab extends PluginSettingTab {
  private plugin: VaultDaisyPlugin;
  private locale: LocaleStrings;

  constructor(app: App, plugin: VaultDaisyPlugin, locale: LocaleStrings) {
    super(app, plugin);
    this.plugin = plugin;
    this.locale = locale;
  }

  display(): void {
    this.containerEl.empty();

    new Setting(this.containerEl)
      .setName(this.locale.settingExcluded)
      .setDesc(this.locale.settingExcludedDesc)
      .addTextArea((text) => {
        text.inputEl.rows = 4;
        text.setValue(this.plugin.settings.excludedPaths.join("\n"));
        text.onChange(async (value) => {
          this.plugin.settings = {
            ...this.plugin.settings,
            excludedPaths: value.split("\n").map((s) => s.trim()).filter(Boolean),
          };
          await this.plugin.saveSettings();
        });
      });

    new Setting(this.containerEl)
      .setName(this.locale.settingRings)
      .setDesc(this.locale.settingRingsDesc)
      .addSlider((slider) => {
        slider
          .setLimits(MIN_RINGS, MAX_RINGS, 1)
          .setValue(this.plugin.settings.ringCount)
          .setDynamicTooltip()
          .onChange(async (value) => {
            this.plugin.settings = { ...this.plugin.settings, ringCount: value };
            await this.plugin.saveSettings();
          });
      });
  }
}
