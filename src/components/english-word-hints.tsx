import { useEffect, useRef, useState } from "react";

const translations: Record<string, string[]> = {
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
};

const russianWordPattern = /[А-Яа-яЁё]+(?:-[А-Яа-яЁё]+)?/gu;
const interactiveWordPattern = /([A-Za-z]+(?:['’][A-Za-z]+)?|[А-Яа-яЁё]+(?:-[А-Яа-яЁё]+)?)/gu;

const reverseTranslations = Object.entries(translations).reduce<Record<string, string[]>>((index, [english, values]) => {
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
  const [active, setActive] = useState<string | null>(null);
  const rootRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setActive(null);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);

  const parts = text.split(interactiveWordPattern);
  return (
    <span ref={rootRef} className={`english-word-hints ${className ?? ""}`}>
      {parts.map((part, index) => {
        const key = part.toLowerCase().replace("ё", "е");
        const values = translations[key] ?? reverseTranslations[key];
        if (!values) return <span key={`${part}-${index}`}>{part}</span>;
        const opened = active === `${key}-${index}`;
        return (
          <span className="english-word-hint" key={`${part}-${index}`}>
            <button type="button" className="english-word-hint-trigger" onClick={() => setActive(opened ? null : `${key}-${index}`)} aria-expanded={opened}>{part}</button>
            {opened ? <span className="english-word-hint-popup" role="status"><strong>{part}</strong><span>{values.join(" · ")}</span></span> : null}
          </span>
        );
      })}
    </span>
  );
};
