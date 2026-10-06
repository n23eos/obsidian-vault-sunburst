import { describe, expect, test } from "vitest";
import type { PluginSettingTab, SettingDefinitionControl, SettingDefinitionItem } from "obsidian";
import VaultDaisyPlugin from "../src/main";
import { DaisyView } from "../src/view";
import type { Plugin, Setting } from "./stubs/obsidian";

type SettingsTabHost = PluginSettingTab & {
  containerEl: HTMLElement & { rows: Setting[] };
};

async function settingsFixture() {
  let applied = 0;
  const view = Object.create(DaisyView.prototype) as DaisyView;
  view.applySettings = async () => { applied++; };
  const app = { workspace: { getLeavesOfType: () => [{ view }] } };
  const plugin = new VaultDaisyPlugin(app as never, {} as never) as VaultDaisyPlugin & Plugin;
  plugin.storedData = { excludedPaths: ["Private", "Archive"], ringCount: 5 };
  await plugin.onload();
  return { plugin, tab: plugin.settingTab as unknown as SettingsTabHost, applied: () => applied };
}

function controls(items: SettingDefinitionItem[]): SettingDefinitionControl[] {
  return items.filter((item): item is SettingDefinitionControl => "control" in item && !!item.control);
}

describe("searchable settings", () => {
  test("registers both existing settings with searchable localized labels", async () => {
    const { plugin } = await settingsFixture();
    const definitions = controls(plugin.searchableSettings);

    expect(definitions.map((item) => ({ name: item.name, key: item.control.key }))).toEqual([
      { name: "Excluded folders", key: "excludedPaths" },
      { name: "Ring count", key: "ringCount" },
    ]);
    expect(definitions.every((item) => Boolean(item.desc) && item.searchable !== false)).toBe(true);
  });

  test("reads the saved exclusions as multiline text for the search control", async () => {
    const { tab } = await settingsFixture();
    expect(tab.getControlValue("excludedPaths")).toBe("Private\nArchive");
  });

  test("normalizes and persists exclusion text and refreshes the open chart", async () => {
    const { plugin, tab, applied } = await settingsFixture();
    await tab.setControlValue("excludedPaths", "  Private\n\n Archive  \n");

    expect(plugin.settings).toEqual({ excludedPaths: ["Private", "Archive"], ringCount: 5 });
    expect(plugin.savedData).toEqual({ excludedPaths: ["Private", "Archive"], ringCount: 5 });
    expect(applied()).toBe(1);
  });

  test("persists a changed ring count and refreshes the open chart", async () => {
    const { plugin, tab, applied } = await settingsFixture();
    await tab.setControlValue("ringCount", 7);

    expect(plugin.savedData).toEqual({ excludedPaths: ["Private", "Archive"], ringCount: 7 });
    expect(applied()).toBe(1);
  });

  test("keeps legacy textarea and slider changes on the same storage path", async () => {
    const { plugin, tab, applied } = await settingsFixture();
    tab.display();
    const [excluded, rings] = tab.containerEl.rows;
    expect(excluded.textArea?.value).toBe("Private\nArchive");
    expect(rings.slider?.value).toBe(5);

    await excluded.textArea!.change(" Drafts \n\n");
    await rings.slider!.change(4);

    expect(plugin.savedData).toEqual({ excludedPaths: ["Drafts"], ringCount: 4 });
    expect(applied()).toBe(2);
  });
});
