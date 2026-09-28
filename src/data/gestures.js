// ─────────────────────────────────────────────────────────────────────────────
// Signa vocabulary. One entry = one sign. No recognition code lives here —
// just a declarative description the rule engine (src/vision/*) understands.
//
// To add a sign: copy an entry, give it a new id, describe the hand shape.
// To add a language: add a key to `phrase`, `speech`, `howTo` (+ src/i18n/<lang>.js).
//
// shape.fingers   thumb|index|middle|ring|pinky → extended | folded | bent | notExtended | notFolded | any
// shape.pointing  finger → up | down | side           (direction of knuckle→tip)
// shape.handDir   up | down | side                     (wrist→middle knuckle)
// shape.palm      facing | away                        (palm toward / away from camera)
// shape.spread    indexMiddle|middleRing|ringPinky → together | apart
// shape.touch     thumbIndex|thumbMiddle|… → true (tips touch) | false (must not touch)
// motion          only for type 'dynamic': wave | wag | down | circle  (see vision/motion.js)
//
// The vocabulary is a simplified, one-handed, webcam-friendly set inspired by ASL
// handshapes and common gestures. It is NOT a full sign language.
// ─────────────────────────────────────────────────────────────────────────────

const FIST = { index: 'folded', middle: 'folded', ring: 'folded', pinky: 'folded' };
const OPEN = { index: 'extended', middle: 'extended', ring: 'extended', pinky: 'extended' };

export const GESTURES = [
  {
    id: 'hello',
    type: 'dynamic',
    phrase: { en: 'HELLO', ru: 'ПРИВЕТ', kk: 'СӘЛЕМ' },
    speech: { en: 'Hello!', ru: 'Привет!', kk: 'Сәлем!' },
    howTo: {
      en: 'Open palm facing the camera — wave side to side.',
      ru: 'Открытая ладонь к камере — помаши из стороны в сторону.',
      kk: 'Ашық алақанды камераға қаратып, екі жаққа бұлғаңыз.',
    },
    shape: { fingers: { ...OPEN, thumb: 'extended' }, palm: 'facing', handDir: 'up' },
    motion: { type: 'wave', point: 'palm', amplitude: 0.3, strokes: 3, windowMs: 1800 },
  },
  {
    id: 'my_name_is',
    type: 'static',
    phrase: { en: 'MY NAME IS', ru: 'МЕНЯ ЗОВУТ', kk: 'МЕНІҢ АТЫМ' },
    speech: { en: 'My name is', ru: 'Меня зовут', kk: 'Менің атым' },
    howTo: {
      en: 'Index + middle finger together, pointing sideways (like the letter H).',
      ru: 'Указательный и средний пальцы вместе, направлены вбок (буква H).',
      kk: 'Сұқ және ортаңғы саусақ бірге, бүйірге бағытталған (H әрпі).',
    },
    shape: {
      fingers: { index: 'extended', middle: 'extended', ring: 'folded', pinky: 'folded' },
      pointing: { index: 'side' },
      spread: { indexMiddle: 'together' },
    },
  },
  {
    id: 'thank_you',
    type: 'dynamic',
    phrase: { en: 'THANK YOU', ru: 'СПАСИБО', kk: 'РАХМЕТ' },
    speech: { en: 'Thank you!', ru: 'Спасибо!', kk: 'Рахмет!' },
    howTo: {
      en: 'Flat hand, fingers up near your chin — move it down and forward.',
      ru: 'Прямая ладонь пальцами вверх у подбородка — опусти её вниз.',
      kk: 'Түзу алақанды иекке жақын ұстап, төмен түсіріңіз.',
    },
    shape: { fingers: OPEN, handDir: 'up' },
    motion: { type: 'down', point: 'palm', distance: 0.85, windowMs: 1100, startMaxY: 0.62 },
  },
  {
    id: 'yes',
    type: 'static',
    phrase: { en: 'YES', ru: 'ДА', kk: 'ИӘ' },
    speech: { en: 'Yes', ru: 'Да', kk: 'Иә' },
    howTo: {
      en: 'Thumbs up: make a fist and point your thumb up.',
      ru: 'Большой палец вверх: кулак, большой палец смотрит вверх.',
      kk: 'Жұдырық түйіп, бас бармақты жоғары көтеріңіз.',
    },
    shape: { fingers: { ...FIST, thumb: 'extended' }, pointing: { thumb: 'up' } },
  },
  {
    id: 'no',
    type: 'static',
    phrase: { en: 'NO', ru: 'НЕТ', kk: 'ЖОҚ' },
    speech: { en: 'No', ru: 'Нет', kk: 'Жоқ' },
    howTo: {
      en: 'Thumbs down: make a fist and point your thumb down.',
      ru: 'Большой палец вниз: кулак, большой палец смотрит вниз.',
      kk: 'Жұдырық түйіп, бас бармақты төмен қаратыңыз.',
    },
    shape: { fingers: { ...FIST, thumb: 'extended' }, pointing: { thumb: 'down' } },
  },
  {
    id: 'help',
    type: 'static',
    phrase: { en: 'HELP', ru: 'ПОМОГИТЕ', kk: 'КӨМЕКТЕСІҢІЗ' },
    speech: { en: 'I need help!', ru: 'Мне нужна помощь!', kk: 'Маған көмек керек!' },
    howTo: {
      en: 'Closed fist with the thumb tucked in, held still.',
      ru: 'Сжатый кулак, большой палец прижат. Держи неподвижно.',
      kk: 'Бас бармақ ішке бүгілген жұдырық, қозғалтпаңыз.',
    },
    shape: { fingers: { ...FIST, thumb: 'folded' } },
    holdMs: 750,
  },
  {
    id: 'i_love_you',
    type: 'static',
    phrase: { en: 'I LOVE YOU', ru: 'Я ТЕБЯ ЛЮБЛЮ', kk: 'МЕН СЕНІ ЖАҚСЫ КӨРЕМІН' },
    speech: { en: 'I love you', ru: 'Я тебя люблю', kk: 'Мен сені жақсы көремін' },
    howTo: {
      en: 'Thumb, index and pinky out; middle and ring folded.',
      ru: 'Большой, указательный и мизинец выпрямлены; средний и безымянный согнуты.',
      kk: 'Бас бармақ, сұқ саусақ және шынашақ ашық; ортаңғы мен атсыз бүгулі.',
    },
    shape: {
      fingers: { thumb: 'extended', index: 'extended', middle: 'folded', ring: 'folded', pinky: 'extended' },
    },
  },
  {
    id: 'please',
    type: 'static',
    phrase: { en: 'PLEASE', ru: 'ПОЖАЛУЙСТА', kk: 'ӨТІНЕМІН' },
    speech: { en: 'Please', ru: 'Пожалуйста', kk: 'Өтінемін' },
    howTo: {
      en: 'OK sign: thumb and index fingertips touch, other three fingers up.',
      ru: 'Знак OK: кончики большого и указательного соединены, остальные три вверх.',
      kk: 'OK белгісі: бас бармақ пен сұқ саусақ ұштары тиіседі, қалған үшеуі жоғары.',
    },
    shape: {
      fingers: { index: 'notExtended', middle: 'extended', ring: 'extended', pinky: 'extended' },
      touch: { thumbIndex: true },
    },
  },
  {
    id: 'sorry',
    type: 'dynamic',
    phrase: { en: 'SORRY', ru: 'ИЗВИНИТЕ', kk: 'КЕШІРІҢІЗ' },
    speech: { en: "I'm sorry", ru: 'Извините', kk: 'Кешіріңіз' },
    howTo: {
      en: 'Make a fist and draw a circle (as if rubbing your chest).',
      ru: 'Сожми кулак и нарисуй им круг (как будто по груди).',
      kk: 'Жұдырық түйіп, онымен шеңбер сызыңыз.',
    },
    shape: { fingers: FIST },
    motion: { type: 'circle', point: 'palm', turns: 0.85, radius: 0.22, windowMs: 2200 },
  },
  {
    id: 'stop',
    type: 'static',
    phrase: { en: 'STOP', ru: 'СТОП', kk: 'ТОҚТА' },
    speech: { en: 'Stop!', ru: 'Стоп!', kk: 'Тоқта!' },
    howTo: {
      en: 'Flat palm toward the camera, fingers together and up. Hold still.',
      ru: 'Ладонь к камере, пальцы сомкнуты и направлены вверх. Держи неподвижно.',
      kk: 'Алақан камераға, саусақтар бірге және жоғары. Қозғалтпаңыз.',
    },
    shape: {
      fingers: OPEN,
      palm: 'facing',
      handDir: 'up',
      spread: { indexMiddle: 'together', middleRing: 'together', ringPinky: 'together' },
    },
    holdMs: 800,
  },
  {
    id: 'pain',
    type: 'static',
    phrase: { en: 'PAIN', ru: 'БОЛЬНО', kk: 'АУЫРАДЫ' },
    speech: { en: 'It hurts', ru: 'Мне больно', kk: 'Ауырады' },
    howTo: {
      en: 'Claw hand: all fingers half-bent like hooks, thumb apart.',
      ru: 'Когти: все пальцы согнуты наполовину, как крючки, большой палец отдельно.',
      kk: 'Тырнақ: барлық саусақтар жартылай бүгілген, бас бармақ бөлек.',
    },
    shape: {
      fingers: { index: 'bent', middle: 'bent', ring: 'bent', pinky: 'bent' },
      touch: { thumbIndex: false, thumbMiddle: false },
    },
  },
  {
    id: 'eat',
    type: 'static',
    phrase: { en: 'EAT', ru: 'ЕСТЬ', kk: 'ТАМАҚ' },
    speech: { en: 'I want to eat', ru: 'Я хочу есть', kk: 'Тамақ жегім келеді' },
    howTo: {
      en: 'Bring all fingertips together onto the thumb (like holding food).',
      ru: 'Собери кончики всех пальцев вместе с большим (как щепотку еды).',
      kk: 'Барлық саусақ ұштарын бас бармаққа жинаңыз (тамақ ұстағандай).',
    },
    shape: {
      fingers: { index: 'notExtended', middle: 'notExtended', ring: 'notExtended', pinky: 'notExtended' },
      touch: { thumbIndex: true, thumbMiddle: true },
    },
  },
  {
    id: 'drink',
    type: 'static',
    phrase: { en: 'DRINK', ru: 'ПИТЬ', kk: 'СУСЫН' },
    speech: { en: 'I want to drink', ru: 'Я хочу пить', kk: 'Су ішкім келеді' },
    howTo: {
      en: 'Thumb and pinky out, other fingers folded (like a bottle).',
      ru: 'Большой палец и мизинец выпрямлены, остальные согнуты (как бутылка).',
      kk: 'Бас бармақ пен шынашақ ашық, қалғандары бүгулі (бөтелке сияқты).',
    },
    shape: {
      fingers: { thumb: 'extended', index: 'folded', middle: 'folded', ring: 'folded', pinky: 'extended' },
    },
  },
  {
    id: 'more',
    type: 'static',
    phrase: { en: 'MORE', ru: 'ЕЩЁ', kk: 'ТАҒЫ' },
    speech: { en: 'More, please', ru: 'Ещё, пожалуйста', kk: 'Тағы, өтінемін' },
    howTo: {
      en: 'V sign: index and middle up and spread apart, others folded.',
      ru: 'Знак V: указательный и средний вверх и раздвинуты, остальные согнуты.',
      kk: 'V белгісі: сұқ және ортаңғы саусақ жоғары әрі ашық, қалғандары бүгулі.',
    },
    shape: {
      fingers: { index: 'extended', middle: 'extended', ring: 'folded', pinky: 'folded' },
      pointing: { index: 'up' },
      spread: { indexMiddle: 'apart' },
    },
  },
  {
    id: 'bathroom',
    type: 'static',
    phrase: { en: 'BATHROOM', ru: 'ТУАЛЕТ', kk: 'ДӘРЕТХАНА' },
    speech: { en: 'I need the bathroom', ru: 'Мне нужно в туалет', kk: 'Маған дәретхана керек' },
    howTo: {
      en: 'Only the pinky up; thumb holds the other fingers down.',
      ru: 'Поднят только мизинец; большой палец прижимает остальные.',
      kk: 'Тек шынашақ жоғары; бас бармақ қалғандарын басып тұр.',
    },
    shape: {
      fingers: { thumb: 'folded', index: 'folded', middle: 'folded', ring: 'folded', pinky: 'extended' },
    },
  },
  {
    id: 'how',
    type: 'static',
    phrase: { en: 'HOW?', ru: 'КАК?', kk: 'ҚАЛАЙ?' },
    speech: { en: 'How?', ru: 'Как?', kk: 'Қалай?' },
    howTo: {
      en: 'Point your index finger sideways, other fingers folded.',
      ru: 'Указательный палец направлен вбок, остальные согнуты.',
      kk: 'Сұқ саусақты бүйірге бағыттаңыз, қалғандары бүгулі.',
    },
    shape: {
      fingers: { index: 'extended', middle: 'folded', ring: 'folded', pinky: 'folded' },
      pointing: { index: 'side' },
    },
  },
  {
    id: 'what',
    type: 'static',
    phrase: { en: 'WHAT?', ru: 'ЧТО?', kk: 'НЕ?' },
    speech: { en: 'What?', ru: 'Что?', kk: 'Не?' },
    howTo: {
      en: 'W sign: index, middle and ring fingers up; pinky folded.',
      ru: 'Знак W: указательный, средний и безымянный вверх; мизинец согнут.',
      kk: 'W белгісі: сұқ, ортаңғы және атсыз саусақ жоғары; шынашақ бүгулі.',
    },
    shape: {
      fingers: { index: 'extended', middle: 'extended', ring: 'extended', pinky: 'folded' },
      handDir: 'up',
    },
  },
  {
    id: 'where',
    type: 'dynamic',
    phrase: { en: 'WHERE?', ru: 'ГДЕ?', kk: 'ҚАЙДА?' },
    speech: { en: 'Where?', ru: 'Где?', kk: 'Қайда?' },
    howTo: {
      en: 'Index finger up — wag it left and right.',
      ru: 'Указательный палец вверх — покачай им влево-вправо.',
      kk: 'Сұқ саусақты жоғары көтеріп, солға-оңға шайқаңыз.',
    },
    shape: {
      fingers: { index: 'extended', middle: 'folded', ring: 'folded', pinky: 'folded' },
      pointing: { index: 'up' },
    },
    motion: { type: 'wag', point: 'indexTip', amplitude: 0.22, strokes: 3, windowMs: 1800 },
  },
  {
    id: 'when',
    type: 'static',
    phrase: { en: 'WHEN?', ru: 'КОГДА?', kk: 'ҚАШАН?' },
    speech: { en: 'When?', ru: 'Когда?', kk: 'Қашан?' },
    howTo: {
      en: 'L shape (like clock hands): index up, thumb out to the side.',
      ru: 'Буква L (как стрелки часов): указательный вверх, большой вбок.',
      kk: 'L пішіні (сағат тілдері сияқты): сұқ саусақ жоғары, бас бармақ бүйірге.',
    },
    shape: {
      fingers: { thumb: 'extended', index: 'extended', middle: 'folded', ring: 'folded', pinky: 'folded' },
      pointing: { index: 'up', thumb: 'side' },
    },
  },
];

export const GESTURE_BY_ID = Object.fromEntries(GESTURES.map((g) => [g.id, g]));

export const localized = (map, lang) => map?.[lang] ?? map?.en ?? '';
