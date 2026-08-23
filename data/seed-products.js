/**
 * TRACY USA — Seed Product Data
 * ---------------------------------------------------------------------
 * These 4 built-in placeholder products ship with the site so the
 * storefront looks complete on first load, before an admin has created
 * anything in Firestore. Each product carries the FULL 24-locale
 * translation map described in /firestore-schema.md — this is the same
 * shape that functions/translate-and-save.js writes to Firestore, so
 * the frontend renderer (assets/js/products.js) works identically
 * whether data comes from this local seed or from Firestore.
 *
 * Images are self-contained inline SVG illustrations (no external
 * hosting dependency) living in /assets/img/products/. An admin can
 * replace them with real photography at any time from the admin panel.
 *
 * This file is a plain ES module so it can be imported both by the
 * browser (assets/js/products.js) and by Node tooling (e.g. a one-off
 * `node scripts/seed-firestore.js` script an admin runs to push these
 * into Firestore the first time).
 */

export const SUPPORTED_LOCALES = [
  "en", "es", "pt", "fr", "de", "it", "nl", "sv", "el", "pl", "ro", "cs",
  "hu", "uk", "ru", "bg", "sk", "lt", "ar", "tr", "zh-CN", "zh-TW", "ja", "ko"
];

export const RTL_LOCALES = ["ar"];

export const SEED_PRODUCTS = [
  {
    id: "lavender-serenity-essential-oil",
    sku: "TRC-EO-001",
    slug: "lavender-serenity-essential-oil",
    category: "essential-oils",
    status: "active",
    featured: true,
    pricing: { currency: "USD", basePrice: 48.0, compareAtPrice: 58.0 },
    stripePriceId: "",
    stripeProductId: "",
    images: [
      { url: "/assets/img/products/product-1-lavender.jpg", isPrimary: true },
    ],
    attributes: {
      volumeMl: 30,
      ingredients: ["Lavandula angustifolia (Lavender) Oil"],
      scentProfile: ["floral", "herbaceous"],
      skinType: ["all"],
      vegan: true,
      crueltyFree: true,
      organic: true,
    },
    inventory: { trackInventory: true, quantity: 240, allowBackorder: false },
    translations: {
      en: { title: "Lavender Serenity Essential Oil", shortDescription: "Pure calming lavender in a violet glass dropper bottle.", description: "A 100% pure, steam-distilled French lavender oil that eases tension and restores calm. Hand-poured into a violet glass bottle with a precision dropper for nightly rituals." },
      es: { title: "Aceite Esencial de Lavanda Serenity", shortDescription: "Lavanda pura y calmante en un frasco de vidrio violeta.", description: "Un aceite de lavanda francesa 100% puro, destilado al vapor, que alivia la tensión y restaura la calma. Envasado a mano en un frasco de vidrio violeta con gotero de precisión para tus rituales nocturnos." },
      pt: { title: "Óleo Essencial de Lavanda Serenity", shortDescription: "Lavanda pura e calmante em um frasco de vidro violeta.", description: "Um óleo de lavanda francesa 100% puro, destilado a vapor, que alivia a tensão e restaura a calma. Engarrafado à mão em um frasco de vidro violeta com conta-gotas de precisão para os seus rituais noturnos." },
      fr: { title: "Huile Essentielle de Lavande Sérénité", shortDescription: "Lavande pure et apaisante dans un flacon en verre violet.", description: "Une huile de lavande française 100 % pure, distillée à la vapeur, qui apaise les tensions et restaure le calme. Versée à la main dans un flacon en verre violet muni d'un compte-gouttes de précision pour vos rituels du soir." },
      de: { title: "Lavendel-Serenity Ätherisches Öl", shortDescription: "Reiner, beruhigender Lavendel in einer violetten Glasflasche.", description: "Ein 100 % reines, dampfdestilliertes französisches Lavendelöl, das Spannungen löst und Ruhe schenkt. Von Hand in eine violette Glasflasche mit Präzisionspipette für Ihr Abendritual abgefüllt." },
      it: { title: "Olio Essenziale di Lavanda Serenity", shortDescription: "Lavanda pura e calmante in un flacone di vetro viola.", description: "Un olio di lavanda francese 100% puro, distillato a vapore, che allevia la tensione e ridona calma. Versato a mano in un flacone di vetro viola con contagocce di precisione per i tuoi rituali serali." },
      nl: { title: "Lavendel Serenity Etherische Olie", shortDescription: "Pure, kalmerende lavendel in een violette glazen druppelfles.", description: "Een 100% pure, stoomgedistilleerde Franse lavendelolie die spanning verlicht en rust herstelt. Met de hand gevuld in een violette glazen fles met precisiedruppelaar voor uw avondritueel." },
      sv: { title: "Lavendel Serenity Eterisk Olja", shortDescription: "Ren, lugnande lavendel i en violett glasflaska med pipett.", description: "En 100 % ren, ångdestillerad fransk lavendelolja som lindrar spänningar och återställer lugn. Handfylld i en violett glasflaska med precisionspipett för din kvällsritual." },
      el: { title: "Αιθέριο Έλαιο Λεβάντας Serenity", shortDescription: "Καθαρή, καταπραϋντική λεβάντα σε μοβ γυάλινο μπουκάλι.", description: "Ένα 100% καθαρό, ατμοαποσταγμένο γαλλικό έλαιο λεβάντας που ανακουφίζει την ένταση και αποκαθιστά την ηρεμία. Χειροποίητα εμφιαλωμένο σε μοβ γυάλινο μπουκάλι με σταγονόμετρο ακριβείας για τις βραδινές σας τελετουργίες." },
      pl: { title: "Olejek Eteryczny Lawenda Serenity", shortDescription: "Czysta, kojąca lawenda w fioletowej szklanej buteleczce.", description: "100% czysty, destylowany parą francuski olejek lawendowy, który łagodzi napięcie i przywraca spokój. Ręcznie rozlewany do fioletowej szklanej butelki z precyzyjną pipetką na wieczorne rytuały." },
      ro: { title: "Ulei Esențial de Lavandă Serenity", shortDescription: "Lavandă pură și calmantă într-un flacon din sticlă violet.", description: "Un ulei de lavandă franțuzească 100% pur, distilat cu abur, care alină tensiunea și restabilește calmul. Îmbuteliat manual într-un flacon din sticlă violet cu pipetă de precizie pentru ritualurile de seară." },
      cs: { title: "Esenciální Olej Levandule Serenity", shortDescription: "Čistá, uklidňující levandule ve fialové skleněné lahvičce.", description: "100% čistý, párou destilovaný francouzský levandulový olej, který zmírňuje napětí a navrací klid. Ručně plněný do fialové skleněné lahvičky s přesnou pipetou pro váš večerní rituál." },
      hu: { title: "Levendula Serenity Illóolaj", shortDescription: "Tiszta, nyugtató levendula lila üvegcsében.", description: "100%-ban tiszta, gőzdesztillált francia levendulaolaj, amely oldja a feszültséget és nyugalmat ad. Kézzel palackozva lila üvegcsébe, precíziós pipettával az esti rituáléhoz." },
      uk: { title: "Ефірна Олія Лаванди Serenity", shortDescription: "Чиста заспокійлива лаванда у фіолетовому скляному флаконі.", description: "100% чиста, парою дистильована французька лавандова олія, що знімає напругу та повертає спокій. Розлита вручну у фіолетовий скляний флакон із точною піпеткою для вечірнього ритуалу." },
      ru: { title: "Эфирное Масло Лаванды Serenity", shortDescription: "Чистая успокаивающая лаванда во флаконе из фиолетового стекла.", description: "100% чистое, паровой дистилляции французское лавандовое масло, снимающее напряжение и возвращающее спокойствие. Разлито вручную во флакон из фиолетового стекла с точной пипеткой для вечернего ритуала." },
      bg: { title: "Етерично Масло от Лавандула Serenity", shortDescription: "Чиста успокояваща лавандула в лилаво стъклено флаконче.", description: "100% чисто, парно дестилирано френско масло от лавандула, което облекчава напрежението и връща спокойствието. Ръчно бутилирано в лилаво стъклено флаконче с прецизна пипета за вечерния ви ритуал." },
      sk: { title: "Esenciálny Olej Levanduľa Serenity", shortDescription: "Čistá upokojujúca levanduľa vo fialovej sklenenej fľaštičke.", description: "100% čistý, parou destilovaný francúzsky levanduľový olej, ktorý zmierňuje napätie a navracia pokoj. Ručne plnený do fialovej sklenenej fľaštičky s presnou pipetou na váš večerný rituál." },
      lt: { title: "Levandų Serenity Eterinis Aliejus", shortDescription: "Grynas raminantis levandų aliejus violetiniame stikliniame flakone.", description: "100 % grynas, garais distiliuotas prancūziškas levandų aliejus, mažinantis įtampą ir grąžinantis ramybę. Rankomis išpilstytas į violetinį stiklinį flakoną su tiksliu lašintuvu jūsų vakariniam ritualui." },
      ar: { title: "زيت اللافندر العطري Serenity", shortDescription: "لافندر نقي ومهدئ في زجاجة زجاجية بنفسجية بقطارة.", description: "زيت لافندر فرنسي نقي 100٪ مقطر بالبخار، يخفف التوتر ويعيد الهدوء. يُعبأ يدويًا في زجاجة زجاجية بنفسجية بقطارة دقيقة لطقوسك المسائية." },
      tr: { title: "Lavanta Serenity Esansiyel Yağı", shortDescription: "Mor cam damlalıklı şişede saf, sakinleştirici lavanta.", description: "%100 saf, buharla damıtılmış Fransız lavanta yağı, gerginliği hafifletir ve huzuru geri getirir. Akşam ritüelleriniz için hassas damlalıklı mor cam şişeye elle dolduruldu." },
      "zh-CN": { title: "薰衣草静谧精油", shortDescription: "紫色玻璃滴管瓶装的纯净舒缓薰衣草精油。", description: "100% 纯正法国蒸汽蒸馏薰衣草精油,舒缓紧张情绪,恢复内心平静。手工灌装于紫色玻璃瓶中,配备精密滴管,适合夜间仪式使用。" },
      "zh-TW": { title: "薰衣草靜謐精油", shortDescription: "紫色玻璃滴管瓶裝的純淨舒緩薰衣草精油。", description: "100% 純正法國蒸氣蒸餾薰衣草精油,舒緩緊張情緒,恢復內心平靜。手工灌裝於紫色玻璃瓶中,配備精密滴管,適合夜間儀式使用。" },
      ja: { title: "ラベンダー セレニティ エッセンシャルオイル", shortDescription: "紫のガラス製ドロッパーボトルに入った純粋で癒やされるラベンダー。", description: "100%ピュアな水蒸気蒸留のフランス産ラベンダーオイル。緊張をほぐし、心の落ち着きを取り戻します。夜のセルフケアのために、精密ドロッパー付きの紫ガラスボトルに手作業で充填。" },
      ko: { title: "라벤더 세레니티 에센셜 오일", shortDescription: "보라색 유리 드로퍼 병에 담긴 순수하고 진정 효과가 있는 라벤더.", description: "100% 순수한 수증기 증류 프랑스산 라벤더 오일로 긴장을 풀어주고 평온함을 되찾아줍니다. 저녁 의식을 위해 정밀 드로퍼가 달린 보라색 유리병에 수작업으로 담았습니다." },
    },
  },

  {
    id: "radiant-renewal-face-serum",
    sku: "TRC-SR-002",
    slug: "radiant-renewal-face-serum",
    category: "serums",
    status: "active",
    featured: true,
    pricing: { currency: "USD", basePrice: 64.0, compareAtPrice: 76.0 },
    stripePriceId: "",
    stripeProductId: "",
    images: [
      { url: "/assets/img/products/product-2-serum.jpg", isPrimary: true },
    ],
    attributes: {
      volumeMl: 30,
      ingredients: ["Vitamin C (Ascorbic Acid)", "Hyaluronic Acid", "Botanical Extracts"],
      scentProfile: ["citrus", "light-floral"],
      skinType: ["all", "dull", "uneven-tone"],
      vegan: true,
      crueltyFree: true,
      organic: false,
    },
    inventory: { trackInventory: true, quantity: 180, allowBackorder: false },
    translations: {
      en: { title: "Radiant Renewal Face Serum", shortDescription: "Amber-glass vitamin C serum for luminous, even-toned skin.", description: "A lightweight, fast-absorbing serum blending vitamin C, hyaluronic acid, and botanical extracts to brighten, firm, and visibly renew skin overnight." },
      es: { title: "Sérum Facial Radiant Renewal", shortDescription: "Sérum de vitamina C en frasco ámbar para una piel luminosa y uniforme.", description: "Un sérum ligero y de rápida absorción que combina vitamina C, ácido hialurónico y extractos botánicos para iluminar, reafirmar y renovar visiblemente la piel durante la noche." },
      pt: { title: "Sérum Facial Radiant Renewal", shortDescription: "Sérum de vitamina C em frasco âmbar para uma pele luminosa e uniforme.", description: "Um sérum leve e de rápida absorção que combina vitamina C, ácido hialurônico e extratos botânicos para iluminar, firmar e renovar visivelmente a pele durante a noite." },
      fr: { title: "Sérum Visage Radiant Renewal", shortDescription: "Sérum à la vitamine C en flacon ambré pour une peau lumineuse et unifiée.", description: "Un sérum léger à absorption rapide associant vitamine C, acide hyaluronique et extraits botaniques pour illuminer, raffermir et renouveler visiblement la peau pendant la nuit." },
      de: { title: "Radiant Renewal Gesichtsserum", shortDescription: "Vitamin-C-Serum in Bernsteinglas für strahlende, ebenmäßige Haut.", description: "Ein leichtes, schnell einziehendes Serum aus Vitamin C, Hyaluronsäure und pflanzlichen Extrakten, das die Haut aufhellt, strafft und über Nacht sichtbar erneuert." },
      it: { title: "Siero Viso Radiant Renewal", shortDescription: "Siero alla vitamina C in flacone ambrato per una pelle luminosa e uniforme.", description: "Un siero leggero e ad assorbimento rapido che unisce vitamina C, acido ialuronico ed estratti botanici per illuminare, rassodare e rinnovare visibilmente la pelle durante la notte." },
      nl: { title: "Radiant Renewal Gezichtsserum", shortDescription: "Vitamine C-serum in amberkleurige fles voor een stralende, egale huid.", description: "Een lichte, snel intrekkende serum met vitamine C, hyaluronzuur en plantenextracten die de huid verhelderen, verstevigen en 's nachts zichtbaar vernieuwen." },
      sv: { title: "Radiant Renewal Ansiktsserum", shortDescription: "Vitamin C-serum i bärnstensfärgad flaska för lysande, jämn hud.", description: "Ett lätt, snabbabsorberande serum med vitamin C, hyaluronsyra och botaniska extrakt som lyser upp, stramar och synligt förnyar huden under natten." },
      el: { title: "Ορός Προσώπου Radiant Renewal", shortDescription: "Ορός βιταμίνης C σε πορτοκαλί γυάλινο φιαλίδιο για λαμπερή, ομοιόμορφη επιδερμίδα.", description: "Ένας ελαφρύς ορός ταχείας απορρόφησης με βιταμίνη C, υαλουρονικό οξύ και φυτικά εκχυλίσματα που φωτίζει, σφίγγει και ανανεώνει ορατά το δέρμα κατά τη διάρκεια της νύχτας." },
      pl: { title: "Serum do Twarzy Radiant Renewal", shortDescription: "Serum z witaminą C w bursztynowej butelce dla promiennej, wyrównanej skóry.", description: "Lekkie, szybko wchłaniające się serum łączące witaminę C, kwas hialuronowy i ekstrakty roślinne, które rozjaśnia, ujędrnia i widocznie odnawia skórę podczas nocy." },
      ro: { title: "Ser Facial Radiant Renewal", shortDescription: "Ser cu vitamina C în flacon de sticlă chihlimbarie pentru un ten luminos și uniform.", description: "Un ser ușor, cu absorbție rapidă, ce combină vitamina C, acidul hialuronic și extracte din plante pentru a lumina, fermifica și reînnoi vizibil pielea pe timpul nopții." },
      cs: { title: "Pleťové Sérum Radiant Renewal", shortDescription: "Sérum s vitamínem C v jantarové lahvičce pro zářivou, sjednocenou pleť.", description: "Lehké, rychle se vstřebávající sérum kombinující vitamín C, kyselinu hyaluronovou a rostlinné extrakty, které rozjasňuje, zpevňuje a viditelně obnovuje pleť během noci." },
      hu: { title: "Radiant Renewal Arcszérum", shortDescription: "C-vitamin szérum borostyán üvegben a ragyogó, egyenletes bőrért.", description: "Könnyű, gyorsan felszívódó szérum C-vitaminnal, hialuronsavval és növényi kivonatokkal, amely éjszaka láthatóan élénkíti, feszesíti és megújítja a bőrt." },
      uk: { title: "Сироватка для Обличчя Radiant Renewal", shortDescription: "Сироватка з вітаміном C у бурштиновому флаконі для сяючої, рівномірної шкіри.", description: "Легка сироватка швидкого вбирання з вітаміном C, гіалуроновою кислотою та рослинними екстрактами, яка освітлює, підтягує та помітно оновлює шкіру за ніч." },
      ru: { title: "Сыворотка для Лица Radiant Renewal", shortDescription: "Сыворотка с витамином C во флаконе из янтарного стекла для сияющей, ровной кожи.", description: "Лёгкая, быстро впитывающаяся сыворотка с витамином C, гиалуроновой кислотой и растительными экстрактами, которая осветляет, укрепляет и заметно обновляет кожу за ночь." },
      bg: { title: "Серум за Лице Radiant Renewal", shortDescription: "Серум с витамин C в кехлибарено флаконче за сияйна, изравнена кожа.", description: "Лек, бързо попиващ серум, съчетаващ витамин C, хиалуронова киселина и растителни екстракти, който изсветлява, стяга и видимо обновява кожата през нощта." },
      sk: { title: "Pleťové Sérum Radiant Renewal", shortDescription: "Sérum s vitamínom C v jantárovej fľaštičke pre žiarivú, zjednotenú pleť.", description: "Ľahké, rýchlo sa vstrebávajúce sérum kombinujúce vitamín C, kyselinu hyalurónovú a rastlinné extrakty, ktoré rozjasňuje, spevňuje a viditeľne obnovuje pleť počas noci." },
      lt: { title: "Veido Serumas Radiant Renewal", shortDescription: "Vitamino C serumas gintarinio stiklo flakone spindinčiai, vienodo tono odai.", description: "Lengvas, greitai įsigeriantis serumas su vitaminu C, hialurono rūgštimi ir augaliniais ekstraktais, kuris pašviesina, sutvirtina ir per naktį matomai atnaujina odą." },
      ar: { title: "سيروم الوجه Radiant Renewal", shortDescription: "سيروم فيتامين سي في زجاجة كهرمانية لبشرة مشرقة وموحدة اللون.", description: "سيروم خفيف سريع الامتصاص يجمع بين فيتامين سي وحمض الهيالورونيك والمستخلصات النباتية لتفتيح البشرة وشدها وتجديدها بشكل ملحوظ خلال الليل." },
      tr: { title: "Radiant Renewal Yüz Serumu", shortDescription: "Parlak, eşit tonlu cilt için amber cam şişede C vitamini serumu.", description: "C vitamini, hiyalüronik asit ve bitkisel özler içeren, hafif ve hızlı emilen bu serum cildi aydınlatır, sıkılaştırır ve gece boyunca gözle görülür şekilde yeniler." },
      "zh-CN": { title: "焕采新生面部精华液", shortDescription: "琥珀色玻璃瓶装维C精华,焕亮肤色,均匀透亮。", description: "轻盈易吸收的精华液,融合维生素C、透明质酸与植物萃取精华,提亮肤色、紧致肌肤,一夜焕新肌肤光彩。" },
      "zh-TW": { title: "煥采新生面部精華液", shortDescription: "琥珀色玻璃瓶裝維C精華,煥亮膚色,均勻透亮。", description: "輕盈易吸收的精華液,融合維生素C、玻尿酸與植物萃取精華,提亮膚色、緊緻肌膚,一夜煥新肌膚光彩。" },
      ja: { title: "ラディアント リニューアル フェイスセラム", shortDescription: "琥珀色のガラスボトルに入ったビタミンCセラムで、輝く均一な肌へ。", description: "ビタミンC、ヒアルロン酸、植物エキスを配合した軽やかで浸透の早い美容液。肌を明るくし、引き締め、一晩で目に見える肌の生まれ変わりを叶えます。" },
      ko: { title: "래디언트 리뉴얼 페이스 세럼", shortDescription: "호박색 유리병에 담긴 비타민C 세럼으로 빛나고 고른 피부결을 선사합니다.", description: "비타민C, 히알루론산, 식물성 추출물을 배합한 가볍고 빠르게 흡수되는 세럼으로 피부를 환하게 하고 탄력을 주며 하룻밤 사이 눈에 띄게 피부를 재생합니다." },
    },
  },

  {
    id: "velvet-nourish-night-cream",
    sku: "TRC-SK-003",
    slug: "velvet-nourish-night-cream",
    category: "skincare",
    status: "active",
    featured: true,
    pricing: { currency: "USD", basePrice: 72.0, compareAtPrice: 85.0 },
    stripePriceId: "",
    stripeProductId: "",
    images: [
      { url: "/assets/img/products/product-3-cream-jar.jpg", isPrimary: true },
    ],
    attributes: {
      volumeMl: 50,
      ingredients: ["Organic Shea Butter", "Jojoba Oil", "Botanical Oil Blend"],
      scentProfile: ["warm", "woody"],
      skinType: ["dry", "normal", "mature"],
      vegan: true,
      crueltyFree: true,
      organic: true,
    },
    inventory: { trackInventory: true, quantity: 150, allowBackorder: false },
    translations: {
      en: { title: "Velvet Nourish Night Cream", shortDescription: "Rich frosted-glass night cream with shea and jojoba.", description: "A luxuriously rich night cream in a heavy frosted glass jar, deeply nourishing skin with organic shea butter, jojoba, and botanical oils while you sleep." },
      es: { title: "Crema de Noche Velvet Nourish", shortDescription: "Crema de noche rica en un frasco de vidrio esmerilado con karité y jojoba.", description: "Una crema de noche lujosamente rica en un pesado frasco de vidrio esmerilado, que nutre profundamente la piel con manteca de karité orgánica, jojoba y aceites botánicos mientras duermes." },
      pt: { title: "Creme Noturno Velvet Nourish", shortDescription: "Creme noturno rico em pote de vidro fosco com manteiga de karité e jojoba.", description: "Um creme noturno luxuosamente rico em um pesado pote de vidro fosco, que nutre profundamente a pele com manteiga de karité orgânica, jojoba e óleos botânicos enquanto você dorme." },
      fr: { title: "Crème de Nuit Velvet Nourish", shortDescription: "Crème de nuit riche en pot de verre dépoli au karité et jojoba.", description: "Une crème de nuit somptueusement riche dans un lourd pot en verre dépoli, qui nourrit intensément la peau avec du beurre de karité biologique, du jojoba et des huiles botaniques pendant votre sommeil." },
      de: { title: "Velvet Nourish Nachtcreme", shortDescription: "Reichhaltige Nachtcreme im matten Glastiegel mit Sheabutter und Jojoba.", description: "Eine luxuriös reichhaltige Nachtcreme in einem schweren Tiegel aus mattem Glas, die die Haut mit biologischer Sheabutter, Jojoba und pflanzlichen Ölen im Schlaf tief nährt." },
      it: { title: "Crema Notte Velvet Nourish", shortDescription: "Crema notte ricca in vaso di vetro smerigliato con burro di karité e jojoba.", description: "Una crema notte lussuosamente ricca in un pesante vaso di vetro smerigliato, che nutre profondamente la pelle con burro di karité biologico, jojoba e oli botanici mentre dormi." },
      nl: { title: "Velvet Nourish Nachtcrème", shortDescription: "Rijke nachtcrème in mat glazen pot met sheaboter en jojoba.", description: "Een weelderig rijke nachtcrème in een zware, mat glazen pot, die de huid diep voedt met biologische sheaboter, jojoba en plantaardige oliën terwijl je slaapt." },
      sv: { title: "Velvet Nourish Nattkräm", shortDescription: "Rik nattkräm i frostat glaskrus med sheasmör och jojoba.", description: "En lyxigt rik nattkräm i en tung, frostad glasburk som djupnärar huden med ekologiskt sheasmör, jojoba och botaniska oljor medan du sover." },
      el: { title: "Κρέμα Νυκτός Velvet Nourish", shortDescription: "Πλούσια κρέμα νυκτός σε βαρύ γυάλινο βάζο με βούτυρο καριτέ και jojoba.", description: "Μια πολυτελώς πλούσια κρέμα νυκτός σε βαρύ αμμοβολισμένο γυάλινο βάζο, που θρέφει σε βάθος την επιδερμίδα με βιολογικό βούτυρο καριτέ, jojoba και φυτικά έλαια όσο κοιμάστε." },
      pl: { title: "Krem na Noc Velvet Nourish", shortDescription: "Bogaty krem na noc w matowym szklanym słoiku z masłem shea i jojoba.", description: "Luksusowo bogaty krem na noc w ciężkim, matowym szklanym słoiku, głęboko odżywiający skórę organicznym masłem shea, olejem jojoba i olejkami roślinnymi podczas snu." },
      ro: { title: "Cremă de Noapte Velvet Nourish", shortDescription: "Cremă de noapte bogată în borcan de sticlă mată cu unt de shea și jojoba.", description: "O cremă de noapte luxos de bogată, într-un borcan greu din sticlă mată, care hrănește profund pielea cu unt de shea organic, jojoba și uleiuri botanice în timp ce dormi." },
      cs: { title: "Noční Krém Velvet Nourish", shortDescription: "Bohatý noční krém v matné skleněné dóze s bambuckým máslem a jojobou.", description: "Luxusně bohatý noční krém v těžké matné skleněné dóze, který během spánku hluboce vyživuje pleť organickým bambuckým máslem, jojobou a rostlinnými oleji." },
      hu: { title: "Velvet Nourish Éjszakai Krém", shortDescription: "Gazdag éjszakai krém matt üvegtégelyben shea vajjal és jojobával.", description: "Luxusan gazdag éjszakai krém súlyos, matt üvegtégelyben, amely bio shea vajjal, jojobával és növényi olajokkal mélyen táplálja a bőrt alvás közben." },
      uk: { title: "Нічний Крем Velvet Nourish", shortDescription: "Насичений нічний крем у матовій скляній банці з маслом ши та жожоба.", description: "Розкішно насичений нічний крем у важкій матовій скляній банці, що глибоко живить шкіру органічним маслом ши, жожоба та рослинними оліями під час сну." },
      ru: { title: "Ночной Крем Velvet Nourish", shortDescription: "Насыщенный ночной крем в матовой стеклянной банке с маслом ши и жожоба.", description: "Роскошно насыщенный ночной крем в тяжёлой матовой стеклянной банке, глубоко питающий кожу органическим маслом ши, жожоба и растительными маслами во время сна." },
      bg: { title: "Нощен Крем Velvet Nourish", shortDescription: "Богат нощен крем в матово стъклено бурканче с масло от ший и жожоба.", description: "Луксозно богат нощен крем в тежко матово стъклено бурканче, който дълбоко подхранва кожата с органично масло от ший, жожоба и растителни масла, докато спите." },
      sk: { title: "Nočný Krém Velvet Nourish", shortDescription: "Bohatý nočný krém v matnej sklenenej dóze s bambuckým maslom a jojobou.", description: "Luxusne bohatý nočný krém v ťažkej matnej sklenenej dóze, ktorý počas spánku hĺbkovo vyživuje pleť organickým bambuckým maslom, jojobou a rastlinnými olejmi." },
      lt: { title: "Velvet Nourish Nakties Kremas", shortDescription: "Prabangiai turtingas nakties kremas matinio stiklo indelyje su shea sviestu ir jojoba.", description: "Prabangiai turtingas nakties kremas sunkiame matinio stiklo indelyje, kuris miego metu giliai maitina odą organiniu shea sviestu, jojoba ir augaliniais aliejais." },
      ar: { title: "كريم الليل Velvet Nourish", shortDescription: "كريم ليلي غني في برطمان زجاجي مطفي بزبدة الشيا والجوجوبا.", description: "كريم ليلي غني وفاخر في برطمان زجاجي مطفي ثقيل، يغذي البشرة بعمق بزبدة الشيا العضوية والجوجوبا والزيوت النباتية أثناء نومك." },
      tr: { title: "Velvet Nourish Gece Kremi", shortDescription: "Shea yağı ve jojobalı, buzlu cam kavanozda zengin gece kremi.", description: "Ağır, buzlu cam bir kavanozda sunulan lüks derecede zengin bu gece kremi, organik shea yağı, jojoba ve bitkisel yağlarla cildinizi siz uyurken derinlemesine besler." },
      "zh-CN": { title: "丝绒滋养晚霜", shortDescription: "厚重磨砂玻璃罐装晚霜,蕴含乳木果和荷荷巴油。", description: "奢华丰润的晚霜,盛装于厚重的磨砂玻璃罐中,含有机乳木果油、荷荷巴油与植物精油,睡眠时深层滋养肌肤。" },
      "zh-TW": { title: "絲絨滋養晚霜", shortDescription: "厚重磨砂玻璃罐裝晚霜,蘊含乳木果和荷荷巴油。", description: "奢華豐潤的晚霜,盛裝於厚重的磨砂玻璃罐中,含有機乳木果油、荷荷巴油與植物精油,睡眠時深層滋養肌膚。" },
      ja: { title: "ヴェルヴェット ナリッシュ ナイトクリーム", shortDescription: "シアバターとホホバを配合した、厚みのあるフロストガラス容器のナイトクリーム。", description: "重厚なフロストガラスの容器に入った贅沢に濃厚なナイトクリーム。オーガニックシアバター、ホホバ、植物オイルが眠っている間に肌を深く滋養します。" },
      ko: { title: "벨벳 노리쉬 나이트 크림", shortDescription: "시어버터와 호호바를 담은 두꺼운 프로스트 유리 자 나이트 크림.", description: "묵직한 프로스트 유리 자에 담긴 럭셔리하게 진한 나이트 크림으로, 유기농 시어버터와 호호바, 식물성 오일이 잠자는 동안 피부에 깊은 영양을 공급합니다." },
    },
  },

  {
    id: "argan-rosemary-hair-oil-duo",
    sku: "TRC-HC-004",
    slug: "argan-rosemary-hair-oil-duo",
    category: "hair-care",
    status: "active",
    featured: true,
    pricing: { currency: "USD", basePrice: 58.0, compareAtPrice: 68.0 },
    stripePriceId: "",
    stripeProductId: "",
    images: [
      { url: "/assets/img/products/product-4-hair-oil-set.jpg", isPrimary: true },
    ],
    attributes: {
      volumeMl: 100,
      ingredients: ["Cold-Pressed Argan Oil", "Rosmarinus Officinalis (Rosemary) Oil"],
      scentProfile: ["herbaceous", "nutty"],
      skinType: [],
      vegan: true,
      crueltyFree: true,
      organic: true,
    },
    inventory: { trackInventory: true, quantity: 200, allowBackorder: false },
    translations: {
      en: { title: "Argan & Rosemary Hair Oil Duo", shortDescription: "Two-bottle set to strengthen, shine, and revive hair.", description: "A premium duo of cold-pressed argan and rosemary-infused oils that strengthen strands, calm frizz, and restore natural shine from root to tip." },
      es: { title: "Dúo de Aceite Capilar de Argán y Romero", shortDescription: "Set de dos frascos para fortalecer, dar brillo y revitalizar el cabello.", description: "Un dúo premium de aceites de argán prensado en frío e infusionado con romero que fortalece el cabello, controla el frizz y restaura el brillo natural de raíz a puntas." },
      pt: { title: "Dupla de Óleo Capilar de Argan e Alecrim", shortDescription: "Conjunto de dois frascos para fortalecer, dar brilho e revitalizar o cabelo.", description: "Uma dupla premium de óleos de argan prensado a frio e infundido com alecrim que fortalece os fios, controla o frizz e restaura o brilho natural da raiz às pontas." },
      fr: { title: "Duo d'Huile Capillaire Argan & Romarin", shortDescription: "Coffret de deux flacons pour fortifier, sublimer et raviver les cheveux.", description: "Un duo premium d'huiles d'argan pressées à froid et infusées au romarin qui renforce les cheveux, discipline les frisottis et restaure la brillance naturelle de la racine aux pointes." },
      de: { title: "Argan- & Rosmarin-Haaröl Duo", shortDescription: "Zweiteiliges Set zur Kräftigung, für Glanz und neue Vitalität im Haar.", description: "Ein hochwertiges Duo aus kaltgepresstem Arganöl und rosmarininfundiertem Öl, das das Haar stärkt, Frizz bändigt und den natürlichen Glanz von der Wurzel bis in die Spitzen zurückbringt." },
      it: { title: "Duo di Olio per Capelli Argan e Rosmarino", shortDescription: "Set di due flaconi per rinforzare, illuminare e rivitalizzare i capelli.", description: "Un duo premium di oli di argan spremuto a freddo e infuso al rosmarino che rinforza i capelli, doma l'effetto crespo e ripristina la lucentezza naturale dalle radici alle punte." },
      nl: { title: "Argan & Rozemarijn Haarolie Duo", shortDescription: "Set van twee flessen om haar te versterken, glans te geven en te herstellen.", description: "Een premium duo van koudgeperste arganolie en met rozemarijn doordrenkte olie die haar versterkt, pluis bedwingt en natuurlijke glans herstelt van wortel tot punt." },
      sv: { title: "Argan & Rosmarin Hårolja Duo", shortDescription: "Set med två flaskor för att stärka, ge glans och liva upp håret.", description: "En premiumduo av kallpressad argan- och rosmarininfunderad olja som stärker hårstråna, tämjer krusighet och återställer den naturliga glansen från rot till topp." },
      el: { title: "Δίδυμο Ελαίου Μαλλιών Argan & Δεντρολίβανο", shortDescription: "Σετ δύο φιαλών για δύναμη, λάμψη και αναζωογόνηση των μαλλιών.", description: "Ένα premium δίδυμο ελαίων από ψυχρή έκθλιψη argan και εμποτισμένο με δεντρολίβανο που ενδυναμώνει τις τρίχες, καταπραΰνει το φριζάρισμα και αποκαθιστά τη φυσική λάμψη από τη ρίζα ως τις άκρες." },
      pl: { title: "Duet Olejków do Włosów Arganowy i Rozmarynowy", shortDescription: "Zestaw dwóch butelek wzmacniających, dodających blasku i rewitalizujących włosy.", description: "Premium duet olejku arganowego tłoczonego na zimno i olejku z rozmarynem, który wzmacnia włosy, ujarzmia puszenie i przywraca naturalny blask od nasady po końce." },
      ro: { title: "Duo de Ulei de Păr Argan și Rozmarin", shortDescription: "Set de două sticle pentru întărirea, strălucirea și revitalizarea părului.", description: "Un duo premium de ulei de argan presat la rece și ulei infuzat cu rozmarin, care întărește firul de păr, calmează frizura și redă strălucirea naturală de la rădăcină până la vârfuri." },
      cs: { title: "Duo Vlasového Oleje Argan a Rozmarýn", shortDescription: "Sada dvou lahviček pro posílení, lesk a oživení vlasů.", description: "Prémiové duo za studena lisovaného arganového oleje a oleje s rozmarýnem, které posiluje vlasy, zkrotí krepatění a obnovuje přirozený lesk od kořínků po konečky." },
      hu: { title: "Argán & Rozmaring Hajolaj Duó", shortDescription: "Kétüveges készlet a haj erősítésére, ragyogásáért és megújulásáért.", description: "Prémium duó hidegen sajtolt argánolajból és rozmaringgal átitatott olajból, amely erősíti a hajszálakat, megfékezi a rakoncátlan hajat, és visszaadja a természetes fényt tövétől a végéig." },
      uk: { title: "Дует Олії для Волосся Аргана і Розмарину", shortDescription: "Набір із двох флаконів для зміцнення, блиску й оновлення волосся.", description: "Преміальний дует олії аргани холодного віджиму та олії з розмарином, що зміцнює волосся, приборкує пухнастість і повертає природний блиск від коренів до кінчиків." },
      ru: { title: "Дуэт Масел для Волос Аргана и Розмарин", shortDescription: "Набор из двух флаконов для укрепления, блеска и обновления волос.", description: "Премиальный дуэт масла арганы холодного отжима и масла с розмарином, укрепляющий волосы, усмиряющий пушистость и возвращающий естественный блеск от корней до кончиков." },
      bg: { title: "Дует Масла за Коса Арган и Розмарин", shortDescription: "Комплект от две шишенца за укрепване, блясък и възстановяване на косата.", description: "Премиум дует от студено пресовано арганово масло и масло с розмарин, който укрепва косъма, усмирява пухкавостта и връща естествения блясък от корените до краищата." },
      sk: { title: "Duo Vlasového Oleja Argan a Rozmarín", shortDescription: "Sada dvoch fľaštičiek na posilnenie, lesk a oživenie vlasov.", description: "Prémiové duo za studena lisovaného arganového oleja a oleja s rozmarínom, ktoré posilňuje vlasy, skrotí krepatenie a obnovuje prirodzený lesk od korienkov po končeky." },
      lt: { title: "Argano ir Rozmarino Plaukų Aliejaus Duetas", shortDescription: "Dviejų buteliukų rinkinys plaukams stiprinti, blizgesiui ir atgaivinimui.", description: "Aukščiausios kokybės šaltai spausto argano aliejaus ir rozmarinu praturtinto aliejaus duetas, stiprinantis plaukus, malšinantis pūkuotumą ir grąžinantis natūralų blizgesį nuo šaknų iki galiukų." },
      ar: { title: "ثنائي زيت الشعر الأرغان وإكليل الجبل", shortDescription: "طقم من زجاجتين لتقوية الشعر ومنحه اللمعان والحيوية.", description: "ثنائي فاخر من زيت الأرغان المعصور على البارد وزيت إكليل الجبل، يقوي الخصلات ويهدئ التجعد ويستعيد اللمعان الطبيعي من الجذور حتى الأطراف." },
      tr: { title: "Argan ve Biberiye Saç Yağı İkilisi", shortDescription: "Saçı güçlendiren, parlatan ve canlandıran iki şişelik set.", description: "Soğuk sıkım argan yağı ve biberiye özlü yağın premium ikilisi, saç tellerini güçlendirir, uçuşmayı yatıştırır ve köklerden uçlara doğal parlaklığı geri kazandırır." },
      "zh-CN": { title: "摩洛哥坚果与迷迭香护发油套装", shortDescription: "两瓶装套组,强韧秀发、增添光泽、焕活发丝。", description: "顶级冷压摩洛哥坚果油与迷迭香精油组合,强韧发丝、抚平毛躁,由发根至发梢恢复自然光泽。" },
      "zh-TW": { title: "摩洛哥堅果與迷迭香護髮油套組", shortDescription: "兩瓶裝套組,強韌秀髮、增添光澤、煥活髮絲。", description: "頂級冷壓摩洛哥堅果油與迷迭香精油組合,強韌髮絲、撫平毛躁,由髮根至髮梢恢復自然光澤。" },
      ja: { title: "アルガン&ローズマリー ヘアオイル デュオ", shortDescription: "髪を強く、輝かせ、蘇らせる2本セット。", description: "コールドプレス製法のアルガンオイルとローズマリーを浸したオイルのプレミアムデュオ。髪を強化し、うねりを抑え、根元から毛先まで自然な輝きを取り戻します。" },
      ko: { title: "아르간 & 로즈마리 헤어 오일 듀오", shortDescription: "모발을 강화하고 윤기를 더하며 활력을 되찾아주는 두 병 세트.", description: "냉압착 아르간 오일과 로즈마리를 우려낸 오일의 프리미엄 듀오로, 모발을 강화하고 곱슬거림을 진정시키며 뿌리부터 끝까지 자연스러운 윤기를 되살립니다." },
    },
  },
];

// NOTE: `labelKey` is only present on these 4 built-in categories, which ship
// with full 24-language i18n translations (see /locales/*.json). Categories an
// admin creates later through the admin panel do NOT get a labelKey — they
// store a plain English `name`/`description` instead (the same English-only
// policy used for blog posts), and the storefront displays that name directly
// rather than routing it through the translation system. See categories.js.
export const CATEGORIES = [
  {
    slug: "essential-oils",
    labelKey: "category_essential_oils",
    name: "Essential Oils",
    description: "Pure, steam-distilled essential oils for calm, focus, and everyday ritual.",
    image: "/assets/img/categories/category-essential-oils.jpg",
  },
  {
    slug: "serums",
    labelKey: "category_serums",
    name: "Serums",
    description: "Lightweight, fast-absorbing serums for brighter, firmer, more even-toned skin.",
    image: "/assets/img/categories/category-serums.jpg",
  },
  {
    slug: "skincare",
    labelKey: "category_skincare",
    name: "Skincare",
    description: "Rich botanical creams and balms for deep, lasting nourishment.",
    image: "/assets/img/categories/category-skincare.jpg",
  },
  {
    slug: "hair-care",
    labelKey: "category_hair_care",
    name: "Hair Care",
    description: "Strengthening oils and treatments for shine, resilience, and repair.",
    image: "/assets/img/categories/category-hair-care.jpg",
  },
];

// Convenience for non-module consumers (e.g. a classic <script> fallback).
if (typeof window !== "undefined") {
  window.__TRACY_SEED__ = { SEED_PRODUCTS, SUPPORTED_LOCALES, RTL_LOCALES, CATEGORIES };
}
