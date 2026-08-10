import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export const englishWordTranslations: Record<string, string[]> = {
  already: ["уже"], yet: ["ещё", "уже (в вопросах)"], just: ["только что", "просто"], never: ["никогда"], ever: ["когда-либо"],
  work: ["работать"], works: ["работает"], worked: ["работал", "работала", "сработал"], working: ["работая", "работает"],
  study: ["изучать", "учиться"], studies: ["изучает", "учится"], studied: ["изучал", "изучала"], studying: ["изучая", "изучает"],
  make: ["делать", "составлять"], makes: ["делает", "составляет"], made: ["сделал", "сделала", "составил"], making: ["делая", "составляя"],
  write: ["писать"], writes: ["пишет"], wrote: ["написал", "написала"], written: ["написанный", "написал"], writing: ["пишет", "написание"],
  visit: ["посещать"], visits: ["посещает"], visited: ["посетил", "посетила"], visiting: ["посещая", "посещение"],
  cook: ["готовить"], cooks: ["готовит"], cooked: ["приготовил", "приготовила"], cooking: ["готовит", "готовка"],
  build: ["строить"], builds: ["строит"], built: ["построил", "построила"], building: ["строит", "здание"],
  teach: ["преподавать", "учить"], teaches: ["преподаёт", "учит"], taught: ["преподавал", "преподавала", "научил"], teaching: ["преподавание", "обучение"],
  choose: ["выбирать"], chooses: ["выбирает"], chose: ["выбрал", "выбрала"], chosen: ["выбранный", "выбрал"], choosing: ["выбирая"],
  prepare: ["готовить", "подготавливать"], prepares: ["готовит"], prepared: ["подготовил", "подготовила"], preparing: ["готовит", "подготовка"],
  have: ["иметь", "вспомогательный глагол"], has: ["имеет", "вспомогательный глагол"], had: ["имел", "вспомогательный глагол"], been: ["был", "была", "было"],
  will: ["будет", "вспомогательный глагол будущего времени"], would: ["бы", "будет (в прошлом)"],
  is: ["есть", "является"], are: ["есть", "находитесь", "находятся"], was: ["был", "была"], were: ["были"],
  the: ["определённый артикль"], a: ["неопределённый артикль"], an: ["неопределённый артикль"],
  on: ["на", "по"], in: ["в", "через"], at: ["в", "у"], by: ["к", "рядом с", "посредством"], before: ["до", "перед"], after: ["после"],
  for: ["в течение", "для"], since: ["с", "с тех пор как"], while: ["пока", "в то время как"], when: ["когда"],
  project: ["проект"], topic: ["тема"], plan: ["план"], message: ["сообщение"], museum: ["музей"], dinner: ["ужин"], model: ["модель"], lesson: ["урок"], option: ["вариант", "выбор"], presentation: ["презентация"],
  small: ["небольшой", "маленький"], new: ["новый"], simple: ["простой"], short: ["короткий"], quiet: ["тихий"], healthy: ["полезный", "здоровый"], useful: ["полезный"], best: ["лучший"], class: ["занятие", "класс"],
  every: ["каждый"], day: ["день"], today: ["сегодня"], tomorrow: ["завтра"], yesterday: ["вчера"], week: ["неделя"], month: ["месяц"], year: ["год"], hour: ["час"], morning: ["утро"], evening: ["вечер"],
  complete: ["завершать", "заполнять"], translate: ["переводить"], arrange: ["располагать", "составлять"], sentence: ["предложение"], correct: ["правильный", "исправлять"], form: ["форма"], suitable: ["подходящий"], expression: ["выражение"],
  choose: ["выбирать"], in: ["в", "через"], a: ["неопределённый артикль"], an: ["неопределённый артикль"], the: ["определённый артикль"],
  mixed: ["смешанный"], tense: ["время"], context: ["контекст"], complete: ["завершить", "заполнить"],
  verb: ["глагол"], words: ["слова"], from: ["из", "от"], russian: ["русский"], english: ["английский"], sentence: ["предложение"],
  present: ["настоящий"], past: ["прошедший"], future: ["будущий"], simple: ["простой"], continuous: ["длительный"], perfect: ["совершённый"], participle: ["причастие"],
  workshop: ["семинар"], weekly: ["еженедельный"], report: ["отчёт"], evening: ["вечерний"], class: ["занятие", "класс"], project: ["проект"],
  time: ["время", "раз"], suitable: ["подходящий"], expression: ["выражение"], negative: ["отрицательный"],
  correct: ["правильный"], form: ["форма"], into: ["в", "на"], at: ["в", "у"], moment: ["момент"],
  every: ["каждый"], often: ["часто"], usually: ["обычно"], mondays: ["понедельникам"], after: ["после"], breakfast: ["завтрак"], weekends: ["выходные"], twice: ["дважды"], week: ["неделя"], evening: ["вечер"],
  now: ["сейчас"], right: ["прямо", "верно", "право"], currently: ["в настоящее время"], these: ["эти"], days: ["дни"], afternoon: ["день", "после обеда"], while: ["пока", "в то время как"], talking: ["разговариваем"], next: ["следующий"], hour: ["час"],
  already: ["уже"], yet: ["ещё", "уже (в вопросах)"], just: ["только что"], recently: ["недавно"], so: ["так", "настолько"], far: ["далеко"], month: ["месяц"], many: ["много"], times: ["раз"], never: ["никогда"], once: ["однажды", "один раз"], this: ["этот"], year: ["год"], today: ["сегодня"], up: ["до", "вверх"], to: ["к", "чтобы"],
  yesterday: ["вчера"], last: ["прошлый", "последний"], monday: ["понедельник"], two: ["два"], days: ["дни"], ago: ["назад"], when: ["когда"], school: ["школа"], weekend: ["выходные"], earlier: ["раньше"], friday: ["пятница"],
  before: ["до", "перед"], meeting: ["встреча"], started: ["начался", "начали"], arrived: ["прибыли", "приехали"], lunch: ["обед"], checked: ["проверил"], film: ["фильм"], began: ["начался"], guests: ["гости"], shop: ["магазин"], opened: ["открылся"], end: ["конец"], lesson: ["урок"],
  for: ["в течение", "для"], three: ["три"], hours: ["часа"], morning: ["утро"], day: ["день"], trip: ["поездка"], week: ["неделя"], months: ["месяцы"], minutes: ["минуты"], bell: ["звонок"], rang: ["прозвенел"],
  tomorrow: ["завтра"], soon: ["скоро"], later: ["позже"], two: ["два"], after: ["после"], dinner: ["ужин"], course: ["курс"], ends: ["заканчивается"], next: ["следующий"], one: ["один"], day: ["день"],
  by: ["к", "посредством"], friday: ["пятница"], end: ["конец"], noon: ["полдень"], june: ["июнь"], year: ["год"], time: ["время"],
  mia: ["Мия"], daniel: ["Дэниел"], anna: ["Анна"], leo: ["Лео"], sofia: ["София"], max: ["Макс"], emma: ["Эмма"], noah: ["Ноа"], liam: ["Лиам"], olivia: ["Оливия"], tom: ["Том"], ana: ["Ана"], the: ["определённый артикль"], students: ["студенты"], friends: ["друзья"], teachers: ["преподаватели"], children: ["дети"], my: ["мой", "мои"], our: ["наш", "наши"], and: ["и"],
  work: ["работать"], works: ["работает"], worked: ["работал", "работала", "работали"], working: ["работая", "работает"], study: ["изучать"], studies: ["изучает"], studied: ["изучал", "изучала", "изучали"], studying: ["изучая", "изучает"], make: ["делать", "составлять"], makes: ["делает", "составляет"], made: ["сделал", "сделала", "составил"], making: ["делая", "составляя"], write: ["писать"], writes: ["пишет"], wrote: ["написал", "написала"], written: ["написанный", "написал"], writing: ["пишет", "написание"], visit: ["посещать"], visits: ["посещает"], visited: ["посетил", "посетила"], visiting: ["посещая"], cook: ["готовить"], cooks: ["готовит"], cooked: ["приготовил", "приготовила"], cooking: ["готовит"], build: ["строить"], builds: ["строит"], built: ["построил", "построила"], building: ["строит", "строительство"], teach: ["преподавать", "учить"], teaches: ["преподаёт", "учит"], taught: ["преподавал", "преподавала"], teaching: ["преподавание", "обучение"], choose: ["выбирать"], chooses: ["выбирает"], chose: ["выбрал", "выбрала"], chosen: ["выбранный"], choosing: ["выбирая"], prepare: ["готовить", "подготавливать"], prepares: ["готовит"], prepared: ["подготовил", "подготовила"], preparing: ["готовит", "подготовка"],
  have: ["иметь", "вспомогательный глагол"], has: ["имеет", "вспомогательный глагол"], had: ["имел", "вспомогательный глагол"], been: ["был", "была", "были"], will: ["будет", "вспомогательный глагол будущего времени"], would: ["бы", "будет в прошлом"], is: ["есть", "является"], are: ["есть", "находятся"], was: ["был", "была"], were: ["были"], not: ["не"], do: ["делать", "вспомогательный глагол"], does: ["делает", "вспомогательный глагол"], did: ["сделал", "вспомогательный глагол"],
  project: ["проект"], small: ["небольшой", "маленький"], topic: ["тема"], new: ["новый"], plan: ["план"], simple: ["простой"], message: ["сообщение"], short: ["короткий"], quiet: ["тихий"], museum: ["музей"], healthy: ["полезный", "здоровый"], meal: ["еда"], model: ["модель"], useful: ["полезный"], option: ["вариант", "выбор"], best: ["лучший"], class: ["занятие", "класс"], presentation: ["презентация"],
  all: ["весь", "все"], another: ["другой", "ещё один"], arrive: ["прибывать"], away: ["прочь", "далеко"], be: ["быть"], begins: ["начинается"], between: ["между"], break: ["перерыв", "ломать"], bus: ["автобус"], call: ["звонить"], called: ["позвонил", "назвал"], came: ["пришёл", "приехал"], change: ["изменение", "менять"], come: ["приходить"], completes: ["завершает", "заполняет"], during: ["во время"], event: ["событие"], exam: ["экзамен"], falling: ["падающий", "идущий"], five: ["пять"], flight: ["рейс", "полёт"], he: ["он"], i: ["я"], lately: ["в последнее время"], left: ["оставил", "левый"], m: ["обозначение времени"], night: ["ночь"], of: ["из", "о"], over: ["над", "в течение"], p: ["обозначение времени"], rain: ["дождь"], same: ["тот же", "одинаковый"], saturday: ["суббота"], she: ["она"], six: ["шесть"], some: ["некоторый", "немного"], starts: ["начинается"], summer: ["лето"], sunrise: ["рассвет"], teacher: ["преподаватель"], ten: ["десять"], test: ["тест", "проверка"], that: ["тот", "что"], then: ["затем", "тогда"], timeline: ["график", "временная шкала"], tuesday: ["вторник"], waiting: ["ожидая", "ожидание"], we: ["мы"], weeks: ["недели"], word: ["слово"], years: ["годы"], you: ["ты", "вы"],
  "не": ["not"], обычно: ["usually"], сейчас: ["now"], прямо: ["right"], уже: ["already"], некоторое: ["some"], время: ["time"], вчера: ["yesterday"], тот: ["that"], момент: ["moment"], до: ["before", "until"], другого: ["another"], события: ["event"], завтра: ["tomorrow"], будет: ["will", "will be"], этому: ["this"], к: ["by", "to"], пятнице: ["Friday"], два: ["two"], часа: ["hours"], начала: ["started", "beginning"], встречи: ["meeting"], презентацию: ["presentation"], подготовил: ["prepared"], подготовила: ["prepared"], подготовили: ["prepared"], для: ["for"], занятия: ["class"], над: ["on"], небольшим: ["small"], проектом: ["project"], новую: ["new"], тему: ["topic"], короткое: ["short"], сообщение: ["message"], тихий: ["quiet"], музей: ["museum"], полезный: ["healthy", "useful"], ужин: ["dinner"], модель: ["model"], лучший: ["best"], вариант: ["option"], студенты: ["students"], друзья: ["friends"], преподаватели: ["teachers"], дети: ["children"], Мия: ["Mia"], Дэниел: ["Daniel"], Анна: ["Anna"], София: ["Sofia"], Том: ["Tom"], Ана: ["Ana"],
  выберет: ["will choose"], выберут: ["will choose"], выбирал: ["chose"], выбирала: ["chose"], выбирали: ["chose"], выбирают: ["choose"], выбрали: ["chose"], готовил: ["cooked", "prepared"], готовила: ["cooked", "prepared"], готовили: ["cooked", "prepared"], готовят: ["cook", "prepare"], другое: ["another", "other"], изучат: ["will study"], изучают: ["study"], изучил: ["studied"], изучила: ["studied"], изучит: ["will study"], моменту: ["time", "moment"], написали: ["wrote"], напишет: ["will write"], напишут: ["will write"], небольшую: ["small"], писал: ["wrote"], писала: ["wrote"], писали: ["wrote"], пишут: ["write"], подготовит: ["will prepare"], поработает: ["will work"], поработал: ["worked"], поработала: ["worked"], поработали: ["worked"], поработают: ["will work"], посетили: ["visited"], посетит: ["will visit"], посетят: ["will visit"], посещал: ["visited"], посещала: ["visited"], посещали: ["visited"], посещают: ["visit"], построили: ["built"], построит: ["will build"], построят: ["will build"], приготовит: ["will cook"], проведет: ["will teach"], проведут: ["will teach"], провела: ["taught"], провели: ["taught"], проводил: ["taught"], проводили: ["taught"], проводит: ["teaches"], проводить: ["teach"], проводят: ["teach"], произошло: ["happened"], работают: ["work"], событие: ["event"], составила: ["made"], составили: ["made"], составит: ["will make"], составлял: ["made"], составляла: ["made"], составляли: ["made"], составляют: ["make"], составят: ["will make"], строил: ["built"], строила: ["built"], строили: ["built"], строят: ["build"], теста: ["test"], того: ["that"], это: ["this", "it"], этого: ["this", "that"],
};

const russianWordPattern = /[А-Яа-яЁё]+(?:-[А-Яа-яЁё]+)?/gu;
const interactiveWordPattern = /([A-Za-z]+(?:['’][A-Za-z]+)?|[А-Яа-яЁё]+(?:-[А-Яа-яЁё]+)?)/gu;

const reverseTranslations = Object.entries(englishWordTranslations).reduce<Record<string, string[]>>((index, [english, values]) => {
  values.forEach((value) => {
    (value.replace(/\([^)]*\)/gu, "").match(russianWordPattern) ?? []).forEach((word) => {
      const key = word.toLowerCase().replace("ё", "е");
      if (new Set(["в", "на", "по", "с", "до", "и", "у", "к", "для", "как", "что", "перед", "после", "пока"]).has(key)) return;
      index[key] ??= [];
      if (!index[key].includes(english)) index[key].push(english);
    });
  });
  return index;
}, {});

export const EnglishWordHints = ({ text, className }: { text: string; className?: string }) => {
  const [active, setActive] = useState<{ id: string; word: string; values: string[] } | null>(null);
  const [popupPosition, setPopupPosition] = useState<{ top: number; left: number; align: "center" | "start" | "end" } | null>(null);
  const rootRef = useRef<HTMLSpanElement>(null);
  const popupRef = useRef<HTMLSpanElement>(null);
  const triggerRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  useEffect(() => {
    const close = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target) && !popupRef.current?.contains(target)) setActive(null);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActive(null);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, []);

  useLayoutEffect(() => {
    if (!active) {
      setPopupPosition(null);
      return;
    }

    const updatePosition = () => {
      const trigger = triggerRefs.current[active.id];
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const edge = 12;
      const popupHalfWidth = Math.min(140, Math.max(96, (window.innerWidth - edge * 2) / 2));
      const center = rect.left + rect.width / 2;
      const align = center - popupHalfWidth < edge ? "start" : center + popupHalfWidth > window.innerWidth - edge ? "end" : "center";
      setPopupPosition({
        top: Math.max(edge, rect.top - 9),
        left: align === "start" ? edge : align === "end" ? window.innerWidth - edge : center,
        align,
      });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    window.visualViewport?.addEventListener("resize", updatePosition);
    window.visualViewport?.addEventListener("scroll", updatePosition);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      window.visualViewport?.removeEventListener("resize", updatePosition);
      window.visualViewport?.removeEventListener("scroll", updatePosition);
    };
  }, [active]);

  const parts = text.split(interactiveWordPattern);
  return (
    <>
      <span ref={rootRef} className={`english-word-hints ${className ?? ""}`}>
      {parts.map((part, index) => {
        const key = part.toLowerCase().replace("ё", "е");
        const values = englishWordTranslations[key] ?? englishWordTranslations[part] ?? reverseTranslations[key];
        if (!values) return <span key={`${part}-${index}`}>{part}</span>;
        const id = `${key}-${index}`;
        const opened = active?.id === id;
        return (
          <span className="english-word-hint" key={`${part}-${index}`}>
            <button
              ref={(node) => { triggerRefs.current[id] = node; }}
              type="button"
              className="english-word-hint-trigger"
              onClick={() => setActive(opened ? null : { id, word: part, values })}
              aria-expanded={opened}
            >
              {part}
            </button>
          </span>
        );
      })}
      </span>
      {active && popupPosition && typeof document !== "undefined" ? createPortal(
        <span
          ref={popupRef}
          className={`english-word-hint-popup is-${popupPosition.align}`}
          role="status"
          style={{ top: popupPosition.top, left: popupPosition.left }}
        >
          <strong>{active.word}</strong>
          <span>{active.values.join(" · ")}</span>
        </span>,
        rootRef.current?.closest(".design-v22") ?? document.body,
      ) : null}
    </>
  );
};
