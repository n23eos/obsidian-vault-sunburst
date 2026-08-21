export type LocaleCode =
  | "en" | "ru" | "uk" | "de" | "fr" | "es" | "it"
  | "pt" | "pl" | "tr" | "zh" | "ja" | "ko";

/** Plural forms keyed by Intl.PluralRules categories; `other` is the fallback. */
export interface PluralForms {
  one?: string;
  few?: string;
  many?: string;
  other: string;
}

export interface LocaleStrings {
  modeSize: string;
  modeWords: string;
  modeFiles: string;
  rescan: string;
  cmdOpen: string;
  ribbonTip: string;
  emptyVault: string;
  noWords: string;
  smallItem: PluralForms;
  word: PluralForms;
  file: PluralForms;
  menuZoom: string;
  menuOpenTab: string;
  menuCopyPath: string;
  menuShowSystem: string;
  pathCopied: string;
  settingExcluded: string;
  settingExcludedDesc: string;
  settingRings: string;
  settingRingsDesc: string;
  byteUnits: readonly string[];
}

const BYTE_LATIN = ["B", "KB", "MB", "GB", "TB"] as const;
const BYTE_CYRILLIC = ["Б", "КБ", "МБ", "ГБ", "ТБ"] as const;

const LOCALES: Record<LocaleCode, LocaleStrings> = {
  en: {
    modeSize: "Size",
    modeWords: "Words",
    modeFiles: "Files",
    rescan: "Rescan",
    cmdOpen: "Open vault chart",
    ribbonTip: "Vault Sunburst: disk usage chart",
    emptyVault: "Vault is empty",
    noWords: "No words in vault",
    smallItem: { one: "small item", other: "small items" },
    word: { one: "word", other: "words" },
    file: { one: "file", other: "files" },
    menuZoom: "Zoom in",
    menuOpenTab: "Open in new tab",
    menuCopyPath: "Copy path",
    menuShowSystem: "Show in system explorer",
    pathCopied: "Path copied",
    settingExcluded: "Excluded folders",
    settingExcludedDesc: "One vault path per line. These folders are skipped when scanning.",
    settingRings: "Ring count",
    settingRingsDesc: "How many nesting levels the chart shows at once.",
    byteUnits: BYTE_LATIN,
  },
  ru: {
    modeSize: "Размер",
    modeWords: "Слова",
    modeFiles: "Файлы",
    rescan: "Пересканировать",
    cmdOpen: "Открыть диаграмму хранилища",
    ribbonTip: "Vault Sunburst: диаграмма хранилища",
    emptyVault: "Хранилище пустое",
    noWords: "В хранилище нет слов",
    smallItem: { one: "мелкий элемент", few: "мелких элемента", many: "мелких элементов", other: "мелких элементов" },
    word: { one: "слово", few: "слова", many: "слов", other: "слов" },
    file: { one: "файл", few: "файла", many: "файлов", other: "файлов" },
    menuZoom: "Увеличить",
    menuOpenTab: "Открыть в новой вкладке",
    menuCopyPath: "Скопировать путь",
    menuShowSystem: "Показать в системном проводнике",
    pathCopied: "Путь скопирован",
    settingExcluded: "Исключённые папки",
    settingExcludedDesc: "По одному пути на строку. Эти папки пропускаются при сканировании.",
    settingRings: "Число колец",
    settingRingsDesc: "Сколько уровней вложенности показывает диаграмма.",
    byteUnits: BYTE_CYRILLIC,
  },
  uk: {
    modeSize: "Розмір",
    modeWords: "Слова",
    modeFiles: "Файли",
    rescan: "Пересканувати",
    cmdOpen: "Відкрити діаграму сховища",
    ribbonTip: "Vault Sunburst: діаграма сховища",
    emptyVault: "Сховище порожнє",
    noWords: "У сховищі немає слів",
    smallItem: { one: "дрібний елемент", few: "дрібні елементи", many: "дрібних елементів", other: "дрібних елементів" },
    word: { one: "слово", few: "слова", many: "слів", other: "слів" },
    file: { one: "файл", few: "файли", many: "файлів", other: "файлів" },
    menuZoom: "Збільшити",
    menuOpenTab: "Відкрити в новій вкладці",
    menuCopyPath: "Скопіювати шлях",
    menuShowSystem: "Показати в системному провіднику",
    pathCopied: "Шлях скопійовано",
    settingExcluded: "Виключені папки",
    settingExcludedDesc: "По одному шляху на рядок. Ці папки пропускаються під час сканування.",
    settingRings: "Кількість кілець",
    settingRingsDesc: "Скільки рівнів вкладеності показує діаграма.",
    byteUnits: BYTE_CYRILLIC,
  },
  de: {
    modeSize: "Größe",
    modeWords: "Wörter",
    modeFiles: "Dateien",
    rescan: "Neu scannen",
    cmdOpen: "Vault-Diagramm öffnen",
    ribbonTip: "Vault Sunburst: Vault-Diagramm",
    emptyVault: "Vault ist leer",
    noWords: "Keine Wörter im Vault",
    smallItem: { one: "kleines Element", other: "kleine Elemente" },
    word: { one: "Wort", other: "Wörter" },
    file: { one: "Datei", other: "Dateien" },
    menuZoom: "Vergrößern",
    menuOpenTab: "In neuem Tab öffnen",
    menuCopyPath: "Pfad kopieren",
    menuShowSystem: "Im System-Explorer anzeigen",
    pathCopied: "Pfad kopiert",
    settingExcluded: "Ausgeschlossene Ordner",
    settingExcludedDesc: "Ein Pfad pro Zeile. Diese Ordner werden beim Scannen übersprungen.",
    settingRings: "Anzahl der Ringe",
    settingRingsDesc: "Wie viele Verschachtelungsebenen das Diagramm gleichzeitig zeigt.",
    byteUnits: BYTE_LATIN,
  },
  fr: {
    modeSize: "Taille",
    modeWords: "Mots",
    modeFiles: "Fichiers",
    rescan: "Réanalyser",
    cmdOpen: "Ouvrir le graphique du coffre",
    ribbonTip: "Vault Sunburst : graphique du coffre",
    emptyVault: "Le coffre est vide",
    noWords: "Aucun mot dans le coffre",
    smallItem: { one: "petit élément", other: "petits éléments" },
    word: { one: "mot", other: "mots" },
    file: { one: "fichier", other: "fichiers" },
    menuZoom: "Zoomer",
    menuOpenTab: "Ouvrir dans un nouvel onglet",
    menuCopyPath: "Copier le chemin",
    menuShowSystem: "Afficher dans l'explorateur système",
    pathCopied: "Chemin copié",
    settingExcluded: "Dossiers exclus",
    settingExcludedDesc: "Un chemin par ligne. Ces dossiers sont ignorés lors de l'analyse.",
    settingRings: "Nombre d'anneaux",
    settingRingsDesc: "Combien de niveaux d'imbrication le graphique affiche à la fois.",
    byteUnits: ["o", "Ko", "Mo", "Go", "To"],
  },
  es: {
    modeSize: "Tamaño",
    modeWords: "Palabras",
    modeFiles: "Archivos",
    rescan: "Reescanear",
    cmdOpen: "Abrir gráfico de la bóveda",
    ribbonTip: "Vault Sunburst: gráfico de la bóveda",
    emptyVault: "La bóveda está vacía",
    noWords: "No hay palabras en la bóveda",
    smallItem: { one: "elemento pequeño", other: "elementos pequeños" },
    word: { one: "palabra", other: "palabras" },
    file: { one: "archivo", other: "archivos" },
    menuZoom: "Ampliar",
    menuOpenTab: "Abrir en nueva pestaña",
    menuCopyPath: "Copiar ruta",
    menuShowSystem: "Mostrar en el explorador del sistema",
    pathCopied: "Ruta copiada",
    settingExcluded: "Carpetas excluidas",
    settingExcludedDesc: "Una ruta por línea. Estas carpetas se omiten al escanear.",
    settingRings: "Número de anillos",
    settingRingsDesc: "Cuántos niveles de anidamiento muestra el gráfico a la vez.",
    byteUnits: BYTE_LATIN,
  },
  it: {
    modeSize: "Dimensione",
    modeWords: "Parole",
    modeFiles: "File",
    rescan: "Riscansiona",
    cmdOpen: "Apri il grafico del vault",
    ribbonTip: "Vault Sunburst: grafico del vault",
    emptyVault: "Il vault è vuoto",
    noWords: "Nessuna parola nel vault",
    smallItem: { one: "elemento piccolo", other: "elementi piccoli" },
    word: { one: "parola", other: "parole" },
    file: { one: "file", other: "file" },
    menuZoom: "Ingrandisci",
    menuOpenTab: "Apri in una nuova scheda",
    menuCopyPath: "Copia percorso",
    menuShowSystem: "Mostra nel file manager di sistema",
    pathCopied: "Percorso copiato",
    settingExcluded: "Cartelle escluse",
    settingExcludedDesc: "Un percorso per riga. Queste cartelle vengono saltate durante la scansione.",
    settingRings: "Numero di anelli",
    settingRingsDesc: "Quanti livelli di annidamento mostra il grafico contemporaneamente.",
    byteUnits: BYTE_LATIN,
  },
  pt: {
    modeSize: "Tamanho",
    modeWords: "Palavras",
    modeFiles: "Arquivos",
    rescan: "Reescanear",
    cmdOpen: "Abrir gráfico do cofre",
    ribbonTip: "Vault Sunburst: gráfico do cofre",
    emptyVault: "O cofre está vazio",
    noWords: "Sem palavras no cofre",
    smallItem: { one: "item pequeno", other: "itens pequenos" },
    word: { one: "palavra", other: "palavras" },
    file: { one: "arquivo", other: "arquivos" },
    menuZoom: "Ampliar",
    menuOpenTab: "Abrir em nova aba",
    menuCopyPath: "Copiar caminho",
    menuShowSystem: "Mostrar no explorador do sistema",
    pathCopied: "Caminho copiado",
    settingExcluded: "Pastas excluídas",
    settingExcludedDesc: "Um caminho por linha. Essas pastas são ignoradas na varredura.",
    settingRings: "Número de anéis",
    settingRingsDesc: "Quantos níveis de aninhamento o gráfico mostra de uma vez.",
    byteUnits: BYTE_LATIN,
  },
  pl: {
    modeSize: "Rozmiar",
    modeWords: "Słowa",
    modeFiles: "Pliki",
    rescan: "Skanuj ponownie",
    cmdOpen: "Otwórz wykres sejfu",
    ribbonTip: "Vault Sunburst: wykres sejfu",
    emptyVault: "Sejf jest pusty",
    noWords: "Brak słów w sejfie",
    smallItem: { one: "mały element", few: "małe elementy", many: "małych elementów", other: "małych elementów" },
    word: { one: "słowo", few: "słowa", many: "słów", other: "słów" },
    file: { one: "plik", few: "pliki", many: "plików", other: "plików" },
    menuZoom: "Powiększ",
    menuOpenTab: "Otwórz w nowej karcie",
    menuCopyPath: "Kopiuj ścieżkę",
    menuShowSystem: "Pokaż w eksploratorze systemu",
    pathCopied: "Ścieżka skopiowana",
    settingExcluded: "Wykluczone foldery",
    settingExcludedDesc: "Jedna ścieżka na linię. Te foldery są pomijane podczas skanowania.",
    settingRings: "Liczba pierścieni",
    settingRingsDesc: "Ile poziomów zagnieżdżenia wykres pokazuje naraz.",
    byteUnits: BYTE_LATIN,
  },
  tr: {
    modeSize: "Boyut",
    modeWords: "Kelimeler",
    modeFiles: "Dosyalar",
    rescan: "Yeniden tara",
    cmdOpen: "Kasa grafiğini aç",
    ribbonTip: "Vault Sunburst: kasa grafiği",
    emptyVault: "Kasa boş",
    noWords: "Kasada kelime yok",
    smallItem: { one: "küçük öğe", other: "küçük öğe" },
    word: { one: "kelime", other: "kelime" },
    file: { one: "dosya", other: "dosya" },
    menuZoom: "Yakınlaştır",
    menuOpenTab: "Yeni sekmede aç",
    menuCopyPath: "Yolu kopyala",
    menuShowSystem: "Sistem gezgininde göster",
    pathCopied: "Yol kopyalandı",
    settingExcluded: "Hariç tutulan klasörler",
    settingExcludedDesc: "Her satıra bir yol. Bu klasörler taramada atlanır.",
    settingRings: "Halka sayısı",
    settingRingsDesc: "Grafiğin aynı anda kaç iç içe seviye gösterdiği.",
    byteUnits: BYTE_LATIN,
  },
  zh: {
    modeSize: "大小",
    modeWords: "字数",
    modeFiles: "文件",
    rescan: "重新扫描",
    cmdOpen: "打开仓库图表",
    ribbonTip: "Vault Sunburst：仓库图表",
    emptyVault: "仓库为空",
    noWords: "仓库中没有文字",
    smallItem: { other: "个小项目" },
    word: { other: "字" },
    file: { other: "个文件" },
    menuZoom: "放大",
    menuOpenTab: "在新标签页中打开",
    menuCopyPath: "复制路径",
    menuShowSystem: "在系统资源管理器中显示",
    pathCopied: "路径已复制",
    settingExcluded: "排除的文件夹",
    settingExcludedDesc: "每行一个路径。扫描时将跳过这些文件夹。",
    settingRings: "环数",
    settingRingsDesc: "图表同时显示的嵌套层级数。",
    byteUnits: BYTE_LATIN,
  },
  ja: {
    modeSize: "サイズ",
    modeWords: "文字数",
    modeFiles: "ファイル",
    rescan: "再スキャン",
    cmdOpen: "保管庫のチャートを開く",
    ribbonTip: "Vault Sunburst：保管庫のチャート",
    emptyVault: "保管庫は空です",
    noWords: "保管庫に文字がありません",
    smallItem: { other: "件の小さい項目" },
    word: { other: "文字" },
    file: { other: "ファイル" },
    menuZoom: "拡大",
    menuOpenTab: "新しいタブで開く",
    menuCopyPath: "パスをコピー",
    menuShowSystem: "システムのエクスプローラーで表示",
    pathCopied: "パスをコピーしました",
    settingExcluded: "除外フォルダ",
    settingExcludedDesc: "1行に1つのパス。これらのフォルダはスキャン時にスキップされます。",
    settingRings: "リング数",
    settingRingsDesc: "チャートが同時に表示するネストの深さ。",
    byteUnits: BYTE_LATIN,
  },
  ko: {
    modeSize: "크기",
    modeWords: "단어",
    modeFiles: "파일",
    rescan: "다시 검사",
    cmdOpen: "보관함 차트 열기",
    ribbonTip: "Vault Sunburst: 보관함 차트",
    emptyVault: "보관함이 비어 있습니다",
    noWords: "보관함에 단어가 없습니다",
    smallItem: { other: "개의 작은 항목" },
    word: { other: "단어" },
    file: { other: "파일" },
    menuZoom: "확대",
    menuOpenTab: "새 탭에서 열기",
    menuCopyPath: "경로 복사",
    menuShowSystem: "시스템 탐색기에서 보기",
    pathCopied: "경로가 복사되었습니다",
    settingExcluded: "제외된 폴더",
    settingExcludedDesc: "한 줄에 하나의 경로. 이 폴더들은 검사에서 제외됩니다.",
    settingRings: "링 개수",
    settingRingsDesc: "차트가 한 번에 표시하는 중첩 수준의 수.",
    byteUnits: BYTE_LATIN,
  },
};

const SUPPORTED = Object.keys(LOCALES) as LocaleCode[];

/**
 * Resolves the Obsidian UI language ("language" key in localStorage; null = en)
 * to a supported locale. "pt-BR" → pt, "zh-TW" → zh, unknown → en.
 */
export function resolveLocale(raw: string | null | undefined): LocaleCode {
  if (!raw) return "en";
  const base = raw.toLowerCase().split("-")[0] as LocaleCode;
  return SUPPORTED.includes(base) ? base : "en";
}

export function detectLocale(): LocaleCode {
  try {
    return resolveLocale(window.localStorage.getItem("language"));
  } catch {
    return "en";
  }
}

export function strings(locale: LocaleCode): LocaleStrings {
  return LOCALES[locale];
}

/** Picks the plural form for n using CLDR rules; falls back to `other`. */
export function pluralForm(locale: LocaleCode, n: number, forms: PluralForms): string {
  let category: Intl.LDMLPluralRule = "other";
  try {
    category = new Intl.PluralRules(locale).select(n);
  } catch {
    // unknown locale in a minimal runtime — "other" is always defined
  }
  return forms[category as keyof PluralForms] ?? forms.other;
}

const NO_SPACE_BEFORE_UNIT = new Set<LocaleCode>(["zh", "ja"]);

/** "1 234 файла" / "1,234 files" / "1,234个文件" */
export function formatCount(locale: LocaleCode, n: number, forms: PluralForms): string {
  const separator = NO_SPACE_BEFORE_UNIT.has(locale) ? "" : " ";
  return `${n.toLocaleString(locale)}${separator}${pluralForm(locale, n, forms)}`;
}
