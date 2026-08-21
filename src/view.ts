import {
  ItemView,
  Menu,
  Notice,
  Scope,
  TFile,
  WorkspaceLeaf,
  debounce,
  setIcon,
  setTooltip,
} from "obsidian";
import { REST_COLOR, arcColor } from "./color";
import { formatBytes, formatPercent } from "./format";
import { TAU, arcPath, clamp, easeInOutCubic, lerp } from "./geometry";
import { LocaleCode, LocaleStrings, detectLocale, formatCount, strings } from "./i18n";
import { Layout, computeLayout, metricValue, pathDepth } from "./layout";
import type VaultDaisyPlugin from "./main";
import { AngleLookup, RenderArc, collectArcs } from "./render";
import { makeExclusionFilter } from "./exclude";
import { WordCacheEntry, buildTree, countVaultWords, indexTree } from "./scan";
import type { Angle, Metric, TreeNode, ViewWindow } from "./types";

export const VIEW_TYPE_DAISY = "vault-sunburst-view";

const ANIM_MS = 750;
const INTRO_MS = 900;
const SECTOR_GAP_PX = 1.4;
const CENTER_RADIUS_FRACTION = 0.3;
const RESCAN_DEBOUNCE_MS = 2500;
const CENTER_NAME_MAX_CHARS = 20;
const SVG_NS = "http://www.w3.org/2000/svg";

const ROOT_PATH = "/";
const METRICS: readonly Metric[] = ["size", "words", "files"];

export class DaisyView extends ItemView {
  private plugin: VaultDaisyPlugin;
  private localeCode: LocaleCode;
  private t: LocaleStrings;

  private tree: TreeNode | null = null;
  private nodeByPath: Map<string, TreeNode> = new Map();
  private layouts: Partial<Record<Metric, Layout>> = {};
  private wordCache: Map<string, WordCacheEntry> = new Map();
  private wordsReady = false;

  private metric: Metric = "size";
  private rootPath: string = ROOT_PATH;
  private view: ViewWindow = { x0: 0, x1: 1, depth: 0 };

  private radius = 280;
  private animToken = 0;
  private isClosed = false;
  private rescanChain: Promise<void> = Promise.resolve();
  private hoveredKey: string | null = null;
  private arcByKey: Map<string, RenderArc> = new Map();
  private pool: Map<string, SVGPathElement> = new Map();

  private chartWrap!: HTMLElement;
  private svg!: SVGSVGElement;
  private gArcs!: SVGGElement;
  private centerCircle!: SVGCircleElement;
  private centerName!: SVGTextElement;
  private centerValue!: SVGTextElement;
  private centerMeta!: SVGTextElement;
  private tooltipEl!: HTMLElement;
  private breadcrumbEl!: HTMLElement;
  private metricBtns: Partial<Record<Metric, HTMLButtonElement>> = {};
  private emptyEl!: HTMLElement;
  private resizeObserver: ResizeObserver | null = null;

  constructor(leaf: WorkspaceLeaf, plugin: VaultDaisyPlugin) {
    super(leaf);
    this.plugin = plugin;
    this.localeCode = detectLocale();
    this.t = strings(this.localeCode);
  }

  getViewType(): string {
    return VIEW_TYPE_DAISY;
  }

  getDisplayText(): string {
    return "Vault Sunburst";
  }

  getIcon(): string {
    return "pie-chart";
  }

  async onOpen(): Promise<void> {
    const root = this.contentEl;
    root.empty();
    root.addClass("vault-sunburst");

    const header = root.createDiv({ cls: "vd-header" });
    this.breadcrumbEl = header.createDiv({ cls: "vd-breadcrumbs" });
    const controls = header.createDiv({ cls: "vd-controls" });
    const seg = controls.createDiv({ cls: "vd-seg" });
    const labels: Record<Metric, string> = {
      size: this.t.modeSize,
      words: this.t.modeWords,
      files: this.t.modeFiles,
    };
    for (const metric of METRICS) {
      const btn = seg.createEl("button", {
        text: labels[metric],
        cls: `vd-seg-btn${metric === this.metric ? " is-active" : ""}`,
      });
      btn.addEventListener("click", () => this.setMetric(metric));
      this.metricBtns[metric] = btn;
    }
    const wordsBtn = this.metricBtns.words;
    if (wordsBtn) wordsBtn.disabled = true;

    const refreshBtn = controls.createEl("button", { cls: "vd-icon-btn" });
    setIcon(refreshBtn, "refresh-cw");
    setTooltip(refreshBtn, this.t.rescan);
    refreshBtn.addEventListener("click", () => void this.rescan(false));

    this.chartWrap = root.createDiv({ cls: "vd-chart" });
    this.svg = document.createElementNS(SVG_NS, "svg");
    this.svg.addClass("vd-svg");
    this.chartWrap.appendChild(this.svg);
    this.gArcs = document.createElementNS(SVG_NS, "g");
    this.svg.appendChild(this.gArcs);
    this.buildCenter();

    this.tooltipEl = this.chartWrap.createDiv({ cls: "vd-tooltip" });
    this.emptyEl = this.chartWrap.createDiv({ cls: "vd-empty", text: "" });
    this.emptyEl.hide();

    this.registerDomEvent(this.svg as unknown as HTMLElement, "click", (e) => this.onClick(e));
    this.registerDomEvent(this.svg as unknown as HTMLElement, "contextmenu", (e) =>
      this.onContextMenu(e),
    );
    this.registerDomEvent(this.svg as unknown as HTMLElement, "mouseover", (e) => this.onOver(e));
    this.registerDomEvent(this.svg as unknown as HTMLElement, "mouseout", (e) => this.onOut(e));
    this.registerDomEvent(this.svg as unknown as HTMLElement, "mousemove", (e) => this.onMove(e));

    this.scope = new Scope(this.app.scope);
    this.scope.register([], "Escape", () => {
      if (this.rootPath === ROOT_PATH) return true;
      this.zoomTo(parentPath(this.rootPath));
      return false;
    });

    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(this.chartWrap);
    this.updateGeometry();

    const scheduleRescan = debounce(() => void this.rescan(false), RESCAN_DEBOUNCE_MS, true);
    this.registerEvent(this.app.vault.on("create", scheduleRescan));
    this.registerEvent(this.app.vault.on("delete", scheduleRescan));
    this.registerEvent(this.app.vault.on("rename", scheduleRescan));
    this.registerEvent(this.app.vault.on("modify", scheduleRescan));

    await this.rescan(true);
  }

  async onClose(): Promise<void> {
    this.isClosed = true;
    this.animToken++;
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
  }

  /** Called by the plugin when settings change: re-scan with new exclusions/rings. */
  async applySettings(): Promise<void> {
    if (this.isClosed || !this.tree) return;
    await this.rescan(false);
  }

  // ---------------------------------------------------------------- scanning

  private excluded(): (path: string) => boolean {
    return makeExclusionFilter(this.plugin.settings.excludedPaths);
  }

  private rings(): number {
    return this.plugin.settings.ringCount;
  }

  /** Serializes rescans: vault events, settings changes and manual refresh never overlap. */
  private rescan(intro: boolean): Promise<void> {
    this.rescanChain = this.rescanChain.then(() => this.doRescan(intro));
    return this.rescanChain;
  }

  private async doRescan(intro: boolean): Promise<void> {
    if (this.isClosed) return;
    const isExcluded = this.excluded();
    if (!this.tree) {
      // First open: draw by size immediately, count words in the background.
      this.rebuild(new Map(), isExcluded);
      this.drawStatic();
      if (intro) this.playIntro();
    }
    const wordsBtn = this.metricBtns.words;
    const words = await countVaultWords(
      this.app.vault,
      this.wordCache,
      (done, total) => {
        if (!this.wordsReady && !this.isClosed && wordsBtn) {
          wordsBtn.setText(`${this.t.modeWords} ${Math.round((done / total) * 100)}%`);
        }
      },
      isExcluded,
    );
    if (this.isClosed) return;
    this.rebuild(words, isExcluded);
    this.wordsReady = true;
    if (wordsBtn) {
      wordsBtn.setText(this.t.modeWords);
      wordsBtn.disabled = (this.layouts.words?.total ?? 0) <= 0;
      if (wordsBtn.disabled) setTooltip(wordsBtn, this.t.noWords);
    }
    if (!intro) this.drawStatic();
  }

  private rebuild(words: ReadonlyMap<string, number>, isExcluded: (p: string) => boolean): void {
    this.tree = buildTree(this.app.vault, words, isExcluded);
    this.nodeByPath = indexTree(this.tree);
    this.layouts = {
      size: computeLayout(this.tree, "size"),
      words: computeLayout(this.tree, "words"),
      files: computeLayout(this.tree, "files"),
    };
    if (!this.nodeByPath.has(this.rootPath) || !this.layout().angles.has(this.rootPath)) {
      this.rootPath = ROOT_PATH;
    }
    this.view = this.viewFor(this.rootPath);
    this.updateBreadcrumbs();
    this.updateEmptyState();
  }

  private layout(): Layout {
    const layout = this.layouts[this.metric];
    if (!layout) throw new Error("Vault Sunburst: layout is not ready");
    return layout;
  }

  private viewFor(path: string): ViewWindow {
    const angle = this.layout().angles.get(path) ?? { x0: 0, x1: 1 };
    return { x0: angle.x0, x1: angle.x1, depth: pathDepth(path) };
  }

  // ---------------------------------------------------------------- drawing

  private updateGeometry(): void {
    const w = this.chartWrap.clientWidth || 600;
    const h = this.chartWrap.clientHeight || 500;
    this.radius = Math.max(80, Math.min(w, h) / 2 - 12);
    const pad = this.radius + 6;
    this.svg.setAttribute("viewBox", `${-pad} ${-pad} ${pad * 2} ${pad * 2}`);
    this.centerCircle.setAttribute("r", String(this.centerR()));
    this.scaleCenterText();
  }

  private centerR(): number {
    return this.radius * CENTER_RADIUS_FRACTION;
  }

  private ringT(): number {
    return (this.radius - this.centerR()) / this.rings();
  }

  private staticLookup(): AngleLookup {
    const angles = this.layout().angles;
    return (path) => angles.get(path);
  }

  private drawStatic(): void {
    this.draw(this.staticLookup(), this.view);
    this.updateCenter(null);
  }

  private draw(angleOf: AngleLookup, view: ViewWindow): void {
    if (!this.tree) return;
    const layout = this.layout();
    const metric = this.metric;
    const rings = this.rings();
    const arcs = collectArcs(
      this.tree,
      layout.order,
      angleOf,
      view,
      (n) => metricValue(n, metric),
      rings,
    );
    this.arcByKey = new Map(arcs.map((a) => [a.key, a]));

    const C = this.centerR();
    const R = this.radius;
    const T = this.ringT();
    const seen = new Set<string>();

    for (const arc of arcs) {
      const r0 = clamp(C + (arc.ring - 1) * T, C, R);
      const r1 = clamp(C + arc.ring * T, C, R);
      if (r1 - r0 < 0.5) continue;
      const a0 = arc.p0 * TAU - Math.PI / 2;
      const a1 = arc.p1 * TAU - Math.PI / 2;
      const d = arcPath(a0, a1, r0, r1, SECTOR_GAP_PX);
      if (!d) continue;

      seen.add(arc.key);
      let el = this.pool.get(arc.key);
      if (!el) {
        el = document.createElementNS(SVG_NS, "path");
        el.setAttribute("fill-rule", "evenodd");
        el.setAttribute("data-key", arc.key);
        el.classList.add("vd-arc");
        this.gArcs.appendChild(el);
        this.pool.set(arc.key, el);
      }
      el.setAttribute("d", d);
      el.classList.toggle("vd-rest", arc.isRest);
      el.classList.toggle("vd-clickable", arc.isFolder);
      el.setAttribute(
        "fill",
        arc.isRest
          ? REST_COLOR
          : arcColor((arc.p0 + arc.p1) / 2, clamp(Math.round(arc.ring), 1, rings), !arc.isFolder),
      );
    }

    for (const [key, el] of this.pool) {
      if (!seen.has(key)) {
        el.remove();
        this.pool.delete(key);
      }
    }
  }

  // -------------------------------------------------------------- animations

  private animate(frame: (t: number) => void, durationMs: number, onDone?: () => void): void {
    const token = ++this.animToken;
    this.svg.classList.add("vd-animating");
    const start = performance.now();
    const tick = (now: number) => {
      if (token !== this.animToken) return;
      const t = clamp((now - start) / durationMs, 0, 1);
      frame(easeInOutCubic(t));
      if (t < 1) {
        requestAnimationFrame(tick);
      } else {
        this.svg.classList.remove("vd-animating");
        onDone?.();
      }
    };
    requestAnimationFrame(tick);
  }

  private playIntro(): void {
    const angles = this.layout().angles;
    const view = this.view;
    this.animate(
      (t) => {
        const sweep: AngleLookup = (path) => {
          const a = angles.get(path);
          return a ? { x0: a.x0 * t, x1: a.x1 * t } : undefined;
        };
        this.draw(sweep, view);
      },
      INTRO_MS,
      () => this.drawStatic(),
    );
  }

  private zoomTo(path: string): void {
    if (path === this.rootPath || !this.layout().angles.has(path)) return;
    const from = { ...this.view };
    const to = this.viewFor(path);
    this.rootPath = path;
    this.view = to;
    this.clearHover();
    this.updateBreadcrumbs();
    const look = this.staticLookup();
    this.animate(
      (t) => {
        this.draw(look, {
          x0: lerp(from.x0, to.x0, t),
          x1: lerp(from.x1, to.x1, t),
          depth: lerp(from.depth, to.depth, t),
        });
      },
      ANIM_MS,
      () => this.drawStatic(),
    );
    this.updateCenter(null);
  }

  private setMetric(metric: Metric): void {
    if (metric === this.metric || !this.tree) return;
    const oldLayout = this.layout();
    const oldView = { ...this.view };
    this.metric = metric;
    for (const m of METRICS) {
      this.metricBtns[m]?.classList.toggle("is-active", m === metric);
    }

    const newLayout = this.layout();
    if (!newLayout.angles.has(this.rootPath)) this.rootPath = ROOT_PATH;
    const newView = this.viewFor(this.rootPath);
    this.view = newView;
    this.clearHover();
    this.updateBreadcrumbs();
    this.updateEmptyState();

    const collapsedAt = (b: Angle): Angle => {
      const mid = (b.x0 + b.x1) / 2;
      return { x0: mid, x1: mid };
    };
    this.animate(
      (t) => {
        const morph: AngleLookup = (path) => {
          const to = newLayout.angles.get(path);
          if (!to) return undefined;
          const from = oldLayout.angles.get(path) ?? collapsedAt(to);
          return { x0: lerp(from.x0, to.x0, t), x1: lerp(from.x1, to.x1, t) };
        };
        this.draw(morph, {
          x0: lerp(oldView.x0, newView.x0, t),
          x1: lerp(oldView.x1, newView.x1, t),
          depth: lerp(oldView.depth, newView.depth, t),
        });
      },
      ANIM_MS,
      () => this.drawStatic(),
    );
    this.updateCenter(null);
  }

  // ------------------------------------------------------------ interactions

  private arcFromEvent(e: Event): RenderArc | null {
    const target = e.target as Element | null;
    const pathEl = target?.closest?.("path[data-key]");
    const key = pathEl?.getAttribute("data-key");
    return key ? (this.arcByKey.get(key) ?? null) : null;
  }

  private onClick(e: MouseEvent): void {
    const target = e.target as Element | null;
    if (target?.closest?.(".vd-center")) {
      if (this.rootPath !== ROOT_PATH) this.zoomTo(parentPath(this.rootPath));
      return;
    }
    const arc = this.arcFromEvent(e);
    if (!arc || arc.isRest) return;
    if (arc.isFolder) {
      this.zoomTo(arc.path);
      return;
    }
    this.openInNewTab(arc.path);
  }

  private onContextMenu(e: MouseEvent): void {
    const arc = this.arcFromEvent(e);
    if (!arc || arc.isRest) return;
    e.preventDefault();
    const menu = new Menu();
    if (arc.isFolder) {
      menu.addItem((item) =>
        item
          .setTitle(this.t.menuZoom)
          .setIcon("zoom-in")
          .onClick(() => this.zoomTo(arc.path)),
      );
    } else {
      menu.addItem((item) =>
        item
          .setTitle(this.t.menuOpenTab)
          .setIcon("file-plus")
          .onClick(() => this.openInNewTab(arc.path)),
      );
    }
    menu.addItem((item) =>
      item
        .setTitle(this.t.menuCopyPath)
        .setIcon("copy")
        .onClick(async () => {
          await navigator.clipboard.writeText(arc.path);
          new Notice(this.t.pathCopied);
        }),
    );
    const appWithReveal = this.app as unknown as { showInFolder?: (path: string) => void };
    if (typeof appWithReveal.showInFolder === "function") {
      menu.addItem((item) =>
        item
          .setTitle(this.t.menuShowSystem)
          .setIcon("folder-open")
          .onClick(() => appWithReveal.showInFolder?.(arc.path)),
      );
    }
    menu.showAtMouseEvent(e);
  }

  private openInNewTab(path: string): void {
    const file = this.app.vault.getAbstractFileByPath(path);
    if (file instanceof TFile) {
      const leaf = this.app.workspace.getLeaf("tab");
      if (leaf) void leaf.openFile(file);
    }
  }

  private onOver(e: MouseEvent): void {
    const arc = this.arcFromEvent(e);
    if (!arc || arc.key === this.hoveredKey) return;
    this.hoveredKey = arc.key;
    this.applyHover(arc);
  }

  private onOut(e: MouseEvent): void {
    const arc = this.arcFromEvent(e);
    if (arc && arc.key === this.hoveredKey) this.clearHover();
  }

  private onMove(e: MouseEvent): void {
    if (!this.hoveredKey) return;
    const rect = this.chartWrap.getBoundingClientRect();
    const x = clamp(e.clientX - rect.left + 14, 0, rect.width - this.tooltipEl.offsetWidth - 4);
    const y = clamp(e.clientY - rect.top + 16, 0, rect.height - this.tooltipEl.offsetHeight - 4);
    this.tooltipEl.style.transform = `translate(${x}px, ${y}px)`;
  }

  private applyHover(arc: RenderArc): void {
    this.svg.classList.add("vd-has-hover");
    const prefix = `${arc.path}/`;
    for (const [key, el] of this.pool) {
      const hit = arc.isRest ? key === arc.key : key === arc.key || key.startsWith(prefix);
      el.classList.toggle("vd-hl", hit);
    }
    this.showTooltip(arc);
    this.updateCenter(arc);
  }

  private clearHover(): void {
    this.hoveredKey = null;
    this.svg.classList.remove("vd-has-hover");
    for (const el of this.pool.values()) el.classList.remove("vd-hl");
    this.hideTooltip();
    this.updateCenter(null);
  }

  // --------------------------------------------------------------------- UI

  private buildCenter(): void {
    const g = document.createElementNS(SVG_NS, "g");
    g.classList.add("vd-center");
    this.centerCircle = document.createElementNS(SVG_NS, "circle");
    this.centerCircle.classList.add("vd-center-circle");
    g.appendChild(this.centerCircle);
    this.centerName = document.createElementNS(SVG_NS, "text");
    this.centerName.classList.add("vd-center-name");
    this.centerValue = document.createElementNS(SVG_NS, "text");
    this.centerValue.classList.add("vd-center-value");
    this.centerMeta = document.createElementNS(SVG_NS, "text");
    this.centerMeta.classList.add("vd-center-meta");
    g.appendChild(this.centerName);
    g.appendChild(this.centerValue);
    g.appendChild(this.centerMeta);
    this.svg.appendChild(g);
  }

  private scaleCenterText(): void {
    const base = this.centerR();
    this.centerName.setAttribute("y", String(-base * 0.28));
    this.centerName.style.fontSize = `${Math.max(11, base * 0.16)}px`;
    this.centerValue.setAttribute("y", String(base * 0.08));
    this.centerValue.style.fontSize = `${Math.max(13, base * 0.22)}px`;
    this.centerMeta.setAttribute("y", String(base * 0.38));
    this.centerMeta.style.fontSize = `${Math.max(10, base * 0.13)}px`;
  }

  private formatValue(value: number): string {
    if (this.metric === "size") return formatBytes(value, this.t.byteUnits, this.localeCode);
    if (this.metric === "words") return formatCount(this.localeCode, value, this.t.word);
    return formatCount(this.localeCode, value, this.t.file);
  }

  /** Secondary line: file count normally, size when the metric is already files. */
  private formatMeta(node: TreeNode): string {
    if (this.metric === "files") return formatBytes(node.size, this.t.byteUnits, this.localeCode);
    return formatCount(this.localeCode, node.files, this.t.file);
  }

  private updateCenter(hovered: RenderArc | null): void {
    const rootNode = this.nodeByPath.get(this.rootPath);
    if (!rootNode) return;
    const rootValue = metricValue(rootNode, this.metric);

    if (hovered?.isRest) {
      this.centerName.textContent = formatCount(this.localeCode, hovered.restCount, this.t.smallItem);
      this.centerValue.textContent = this.formatValue(hovered.restValue);
      this.centerMeta.textContent = formatPercent(hovered.restValue, rootValue, this.localeCode);
      return;
    }
    const node = hovered ? this.nodeByPath.get(hovered.path) : rootNode;
    if (!node) return;
    const value = metricValue(node, this.metric);
    this.centerName.textContent = truncate(node.name, CENTER_NAME_MAX_CHARS);
    this.centerValue.textContent = this.formatValue(value);
    this.centerMeta.textContent = hovered
      ? `${formatPercent(value, rootValue, this.localeCode)} · ${this.formatMeta(node)}`
      : this.formatMeta(node);
  }

  private showTooltip(arc: RenderArc): void {
    this.tooltipEl.empty();
    const rootNode = this.nodeByPath.get(this.rootPath);
    const rootValue = rootNode ? metricValue(rootNode, this.metric) : 0;
    if (arc.isRest) {
      this.tooltipEl.createDiv({
        cls: "vd-tip-name",
        text: formatCount(this.localeCode, arc.restCount, this.t.smallItem),
      });
      this.tooltipEl.createDiv({
        cls: "vd-tip-meta",
        text: `${this.formatValue(arc.restValue)} · ${formatPercent(arc.restValue, rootValue, this.localeCode)}`,
      });
    } else {
      const node = this.nodeByPath.get(arc.path);
      if (!node) return;
      const value = metricValue(node, this.metric);
      this.tooltipEl.createDiv({ cls: "vd-tip-name", text: node.name });
      this.tooltipEl.createDiv({
        cls: "vd-tip-meta",
        text: `${this.formatValue(value)} · ${formatPercent(value, rootValue, this.localeCode)} · ${this.formatMeta(node)}`,
      });
    }
    this.tooltipEl.addClass("is-visible");
  }

  private hideTooltip(): void {
    this.tooltipEl.removeClass("is-visible");
  }

  private updateBreadcrumbs(): void {
    this.breadcrumbEl.empty();
    const vaultName = this.tree?.name ?? "Vault";
    const segments = this.rootPath === ROOT_PATH ? [] : this.rootPath.split("/");
    const addCrumb = (label: string, path: string, isLast: boolean): void => {
      const btn = this.breadcrumbEl.createEl("button", {
        cls: `vd-crumb${isLast ? " is-current" : ""}`,
        text: label,
      });
      if (!isLast) btn.addEventListener("click", () => this.zoomTo(path));
    };
    addCrumb(vaultName, ROOT_PATH, segments.length === 0);
    segments.forEach((segment, i) => {
      this.breadcrumbEl.createSpan({ cls: "vd-crumb-sep", text: "›" });
      addCrumb(segment, segments.slice(0, i + 1).join("/"), i === segments.length - 1);
    });
  }

  private updateEmptyState(): void {
    const total = this.layouts[this.metric]?.total ?? 0;
    if (total <= 0) {
      this.emptyEl.setText(this.metric === "words" ? this.t.noWords : this.t.emptyVault);
      this.emptyEl.show();
    } else {
      this.emptyEl.hide();
    }
  }

  private handleResize(): void {
    this.updateGeometry();
    if (this.tree) this.drawStatic();
  }
}

function parentPath(path: string): string {
  const idx = path.lastIndexOf("/");
  return idx === -1 ? ROOT_PATH : path.slice(0, idx);
}

function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}
