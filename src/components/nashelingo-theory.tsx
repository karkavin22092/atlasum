import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, BookOpenCheck, CheckCircle2, X } from "lucide-react";
import type { NashelingoTheoryPage } from "@shared/types";
import { Button, ProgressBar } from "@/components/ui";

type NashelingoTheoryProps = {
  topic: string;
  pages: NashelingoTheoryPage[];
  completed: boolean;
  page: number;
  pending?: boolean;
  onPageChange: (page: number) => void;
  onComplete: () => void;
  onClose: () => void;
};

export const NashelingoTheory = ({
  topic,
  pages,
  completed,
  page,
  pending = false,
  onPageChange,
  onComplete,
  onClose,
}: NashelingoTheoryProps) => {
  const current = pages[page];
  const lastPage = page === pages.length - 1;

  if (!current) return null;

  return (
    <div className="v22-theory-overlay" role="dialog" aria-modal="true" aria-label={`Теория: ${topic}`}>
      <div className="v22-theory-backdrop" onClick={onClose} aria-hidden="true" />
      <motion.section
        className="v22-theory-modal"
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.98 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
      >
        <header className="v22-theory-topbar">
          <Button variant="ghost" className="v22-theory-close" onClick={onClose} aria-label="Закрыть теорию"><X /></Button>
          <div className="v22-theory-progress"><ProgressBar value={((page + 1) / pages.length) * 100} /></div>
          <span className="v22-theory-counter">{page + 1}/{pages.length}</span>
        </header>

        <AnimatePresence mode="wait">
          <motion.article
            className="v22-theory-page"
            key={page}
            initial={{ opacity: 0, x: 18 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -18 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            <div className="v22-theory-mark"><BookOpenCheck /></div>
            <div className="v22-learning-step-label">{current.eyebrow}</div>
            <h2>{current.title}</h2>
            <div className="v22-theory-copy">
              {current.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            </div>
            {current.note ? <aside>{current.note}</aside> : null}
          </motion.article>
        </AnimatePresence>

        <footer className="v22-theory-actions">
          <Button variant="ghost" onClick={() => onPageChange(Math.max(0, page - 1))} disabled={page === 0}><ArrowLeft className="h-4 w-4" />Назад</Button>
          {lastPage ? (
            <Button onClick={completed ? onClose : onComplete} disabled={pending}>
              <CheckCircle2 className="h-4 w-4" />{completed ? "Вернуться к уровням" : pending ? "Сохраняем..." : "Завершить теорию"}
            </Button>
          ) : (
            <Button onClick={() => onPageChange(Math.min(pages.length - 1, page + 1))}>Далее<ArrowRight className="h-4 w-4" /></Button>
          )}
        </footer>
      </motion.section>
    </div>
  );
};
