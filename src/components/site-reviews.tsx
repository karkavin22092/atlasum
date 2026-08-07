import { useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ImagePlus, LoaderCircle, MessageSquareReply, Pencil, Send, SmilePlus, Star, ThumbsDown, ThumbsUp, UserRound, X } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge, Button } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { imageFileToDataUrl } from "@/lib/images";
import { isAdminUser } from "@/lib/permissions";
import { deleteReview, getReviews, replyToReview, saveReview, updateReview, type Review, type ReviewPayload } from "@/lib/reviews";

const PROS = ["Удобные отчёты", "Понятные объяснения", "Много вопросов", "Хороший дизайн", "Полезные игры", "Удобно с телефона"];
const CONS = ["Не хватает тем", "Нужно больше игр", "Медленная загрузка", "Сложная навигация", "Мало статистики", "Не хватает настроек"];
const EMOJIS = ["😊", "🔥", "👍", "❤️", "🎯", "💡", "🚀", "👏"];

const formatDate = (value: string) => new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", year: "numeric" }).format(new Date(value));
const initials = (name: string) => name.trim().slice(0, 2).toUpperCase();
const toggleValue = (items: string[], value: string) => items.includes(value) ? items.filter((item) => item !== value) : [...items, value];

const Stars = ({ value, onChange }: { value: number; onChange?: (value: number) => void }) => (
  <div className="flex items-center gap-1" aria-label={`Оценка: ${value} из 5`}>
    {[1, 2, 3, 4, 5].map((star) => onChange ? (
      <button key={star} type="button" onClick={() => onChange(star)} aria-label={`Поставить ${star} из 5`} className="grid h-9 w-9 place-items-center rounded-lg transition hover:bg-amber-400/10">
        <Star className={`h-5 w-5 ${star <= value ? "fill-amber-300 text-amber-300" : "text-slate-600"}`} />
      </button>
    ) : (
      <Star key={star} className={`h-4 w-4 ${star <= value ? "fill-amber-300 text-amber-300" : "text-slate-600"}`} />
    ))}
  </div>
);

const ReviewEditor = ({ current, onSaved }: { current?: Review; onSaved: () => void }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [rating, setRating] = useState(current?.rating ?? 5);
  const [text, setText] = useState(current?.text ?? "");
  const [pros, setPros] = useState(current?.pros ?? []);
  const [cons, setCons] = useState(current?.cons ?? []);
  const [images, setImages] = useState(current?.images ?? []);
  const [showEmojis, setShowEmojis] = useState(false);
  const [error, setError] = useState("");
  const [processingImages, setProcessingImages] = useState(false);

  const mutation = useMutation({
    mutationFn: async (payload: ReviewPayload) => current
      ? updateReview(current.id, payload, user?.authToken)
      : saveReview(payload, user?.authToken),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["site-reviews"] });
      onSaved();
    },
    onError: (caught) => setError(caught instanceof Error ? caught.message : "Не удалось сохранить отзыв"),
  });

  if (!user) return null;

  const addImages = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []).slice(0, Math.max(0, 3 - images.length));
    event.target.value = "";
    if (!files.length) return;
    setError("");
    setProcessingImages(true);
    try {
      const prepared = await Promise.all(files.map((file) => imageFileToDataUrl(file, { maxSide: 1280, quality: 0.76, maxLength: 250_000 })));
      setImages((currentImages) => [...currentImages, ...prepared].slice(0, 3));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Не удалось добавить изображение");
    } finally {
      setProcessingImages(false);
    }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const cleanText = text.trim();
    if (!cleanText) { setError("Напишите несколько слов о сайте"); return; }
    setError("");
    mutation.mutate({
      authorId: user.id,
      authorName: user.name,
      authorAvatarUrl: user.avatarUrl ?? null,
      rating,
      text: cleanText,
      pros,
      cons,
      images,
    });
  };

  return (
    <form onSubmit={submit} className="glass-strong rounded-2xl p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-lg font-semibold text-white">{current ? "Изменить свой отзыв" : "Оставить отзыв"}</div>
          <div className="mt-1 text-sm text-slate-400">Один отзыв на аккаунт, его можно обновлять в любое время.</div>
        </div>
        <Stars value={rating} onChange={setRating} />
      </div>

      <label className="mt-4 block">
        <span className="sr-only">Текст отзыва</span>
        <textarea value={text} onChange={(event) => setText(event.target.value)} maxLength={2000} rows={5} className="w-full resize-y rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-cyan-300/40" placeholder="Что вам понравилось и что стоит улучшить?" />
      </label>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-emerald-200"><ThumbsUp className="h-4 w-4" />Достоинства</div>
          <div className="flex flex-wrap gap-2">
            {PROS.map((item) => (
              <button key={item} type="button" onClick={() => setPros((values) => toggleValue(values, item))} className={pros.includes(item) ? "inline-flex items-center gap-1.5 rounded-full border border-emerald-300/30 bg-emerald-400/15 px-3 py-2 text-xs text-emerald-100" : "rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300 transition hover:bg-white/10"}>
                {pros.includes(item) ? <Check className="h-3.5 w-3.5" /> : null}{item}
              </button>
            ))}
          </div>
        </div>
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-rose-200"><ThumbsDown className="h-4 w-4" />Недостатки</div>
          <div className="flex flex-wrap gap-2">
            {CONS.map((item) => (
              <button key={item} type="button" onClick={() => setCons((values) => toggleValue(values, item))} className={cons.includes(item) ? "inline-flex items-center gap-1.5 rounded-full border border-rose-300/30 bg-rose-400/15 px-3 py-2 text-xs text-rose-100" : "rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300 transition hover:bg-white/10"}>
                {cons.includes(item) ? <Check className="h-3.5 w-3.5" /> : null}{item}
              </button>
            ))}
          </div>
        </div>
      </div>

      {images.length ? (
        <div className="mt-4 grid grid-cols-3 gap-2 sm:max-w-lg">
          {images.map((image, index) => (
            <div key={`${image.slice(-24)}-${index}`} className="relative aspect-[4/3] overflow-hidden rounded-xl border border-white/10 bg-black/20">
              <img src={image} alt={`Изображение к отзыву ${index + 1}`} className="h-full w-full object-cover" />
              <button type="button" onClick={() => setImages((items) => items.filter((_, itemIndex) => itemIndex !== index))} aria-label="Удалить изображение" className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-full bg-slate-950/80 text-white"><X className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => setShowEmojis((value) => !value)} className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-slate-200 transition hover:bg-white/10"><SmilePlus className="h-4 w-4 text-amber-300" />Смайлик</button>
        <button type="button" onClick={() => imageInputRef.current?.click()} disabled={processingImages || images.length >= 3} className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-slate-200 transition hover:bg-white/10 disabled:opacity-50">
          {processingImages ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4 text-cyan-300" />}Фото {images.length}/3
        </button>
        {showEmojis ? (
          <div className="flex flex-wrap gap-1 rounded-xl border border-white/10 bg-black/20 p-1.5">
            {EMOJIS.map((emoji) => <button key={emoji} type="button" onClick={() => { setText((value) => `${value}${value ? " " : ""}${emoji}`); setShowEmojis(false); }} className="grid h-8 w-8 place-items-center rounded-lg text-lg hover:bg-white/10">{emoji}</button>)}
          </div>
        ) : null}
        <div className="sm:ml-auto">
          <Button type="submit" disabled={mutation.isPending || processingImages || !text.trim()}>
            {mutation.isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}{current ? "Сохранить" : "Опубликовать"}
          </Button>
        </div>
      </div>
      <input ref={imageInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(event) => void addImages(event)} />
      {error ? <div role="alert" className="mt-3 rounded-xl border border-rose-400/20 bg-rose-400/10 px-3 py-2 text-sm text-rose-200">{error}</div> : null}
    </form>
  );
};

const AdminReplyEditor = ({ review }: { review: Review }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [reply, setReply] = useState(review.adminReply ?? "");
  const [error, setError] = useState("");
  const mutation = useMutation({
    mutationFn: () => replyToReview(review.id, reply, user?.authToken ?? ""),
    onSuccess: async () => { setEditing(false); await queryClient.invalidateQueries({ queryKey: ["site-reviews"] }); },
    onError: (caught) => setError(caught instanceof Error ? caught.message : "Не удалось сохранить ответ"),
  });

  if (!editing) {
    return <button type="button" onClick={() => setEditing(true)} className="mt-3 inline-flex items-center gap-2 text-sm text-cyan-200 transition hover:text-cyan-100"><MessageSquareReply className="h-4 w-4" />{review.adminReply ? "Изменить ответ" : "Ответить как создатель"}</button>;
  }

  return (
    <div className="mt-3 space-y-2">
      <textarea value={reply} onChange={(event) => setReply(event.target.value)} maxLength={1200} rows={3} className="w-full resize-y rounded-xl border border-cyan-300/20 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-300/50" placeholder="Ответ пользователю..." />
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={() => mutation.mutate()} disabled={mutation.isPending || !reply.trim()}>{mutation.isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}Сохранить ответ</Button>
        <Button type="button" variant="ghost" onClick={() => { setEditing(false); setReply(review.adminReply ?? ""); setError(""); }}>Отмена</Button>
      </div>
      {error ? <div className="text-sm text-rose-200">{error}</div> : null}
    </div>
  );
};

const ReviewCard = ({ review, admin }: { review: Review; admin: boolean }) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [deleting, setDeleting] = useState(false);
  const remove = async () => {
    if (!user || !admin || !window.confirm("Удалить этот отзыв?")) return;
    setDeleting(true);
    try { await deleteReview(review.id, user.authToken ?? ""); await queryClient.invalidateQueries({ queryKey: ["site-reviews"] }); }
    finally { setDeleting(false); }
  };
  return (
  <article className="glass rounded-2xl p-4 sm:p-5">
    <div className="flex items-start gap-3">
      <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full border border-white/10 bg-white/10 text-xs font-semibold text-white">
        {review.authorAvatarUrl ? <img src={review.authorAvatarUrl} alt="" className="h-full w-full object-cover" /> : (initials(review.authorName) || <UserRound className="h-5 w-5" />)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div><div className="font-semibold text-white">{review.authorName}</div><div className="text-xs text-slate-500">{formatDate(review.createdAt)}{review.updatedAt !== review.createdAt ? " · изменён" : ""}</div></div>
          <Stars value={review.rating} />
        </div>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-200">{review.text}</p>

        {review.pros.length ? <div className="mt-4 flex flex-wrap items-center gap-2"><ThumbsUp className="h-4 w-4 text-emerald-300" />{review.pros.map((item) => <Badge key={item} tone="emerald">{item}</Badge>)}</div> : null}
        {review.cons.length ? <div className="mt-3 flex flex-wrap items-center gap-2"><ThumbsDown className="h-4 w-4 text-rose-300" />{review.cons.map((item) => <Badge key={item} tone="rose">{item}</Badge>)}</div> : null}
        {review.images.length ? <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">{review.images.map((image, index) => <a key={`${image.slice(-24)}-${index}`} href={image} target="_blank" rel="noreferrer" className="block aspect-[4/3] overflow-hidden rounded-xl border border-white/10"><img src={image} alt={`Изображение из отзыва ${index + 1}`} className="h-full w-full object-cover transition hover:scale-105" /></a>)}</div> : null}

        {review.adminReply ? (
          <div className="mt-4 border-l-2 border-cyan-300/40 pl-4">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-200">Ответ создателя</div>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-300">{review.adminReply}</p>
          </div>
        ) : null}
        {admin ? <div className="flex flex-wrap items-center gap-4"><AdminReplyEditor review={review} /><button type="button" onClick={() => void remove()} disabled={deleting} className="mt-3 inline-flex items-center gap-2 text-sm text-rose-300 transition hover:text-rose-200 disabled:opacity-50">{deleting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}Удалить отзыв</button></div> : null}
      </div>
    </div>
  </article>
  );
};

export const SiteReviewsSection = () => {
  const { user } = useAuth();
  const admin = isAdminUser(user);
  const [editing, setEditing] = useState(false);
  const reviewsQuery = useQuery({ queryKey: ["site-reviews"], queryFn: getReviews, retry: 0, refetchInterval: 30_000 });
  const reviews = reviewsQuery.data ?? [];
  const current = user ? reviews.find((review) => review.authorId === user.id) : undefined;
  const average = useMemo(() => reviews.length ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length : 0, [reviews]);

  return (
    <section id="reviews" className="scroll-mt-24 border-t border-white/10 pt-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200/80">Отзывы пользователей</div>
          <h2 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">Что говорят о подготовке в Examora</h2>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-3xl font-semibold text-white">{average ? average.toFixed(1) : "—"}</div>
          <div><Stars value={Math.round(average)} /><div className="mt-1 text-xs text-slate-500">{reviews.length} {reviews.length === 1 ? "отзыв" : "отзывов"}</div></div>
        </div>
      </div>

      <div className="mt-6">
        {!user ? (
          <div className="flex flex-col gap-3 rounded-2xl border border-dashed border-white/15 px-4 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div><div className="font-medium text-white">Войдите, чтобы оставить отзыв</div><div className="mt-1 text-sm text-slate-400">Отзыв привязывается к аккаунту и остаётся доступным для редактирования.</div></div>
            <Link to="/auth" state={{ from: "/#reviews" }}><Button>Войти</Button></Link>
          </div>
        ) : current && !editing ? (
          <div className="flex flex-col gap-3 rounded-2xl border border-cyan-300/20 bg-cyan-400/5 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div><div className="font-medium text-white">Ваш отзыв уже опубликован</div><div className="mt-1 text-sm text-slate-400">Можно изменить оценку, текст, отметки и изображения.</div></div>
            <Button type="button" variant="secondary" onClick={() => setEditing(true)}><Pencil className="h-4 w-4" />Изменить отзыв</Button>
          </div>
        ) : (
          <ReviewEditor key={current?.updatedAt ?? "new-review"} current={current} onSaved={() => setEditing(false)} />
        )}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {reviewsQuery.isLoading ? <div className="col-span-full grid min-h-40 place-items-center"><LoaderCircle className="h-7 w-7 animate-spin text-cyan-300" /></div> : null}
        {reviewsQuery.isError ? <div className="col-span-full rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">Не удалось загрузить отзывы.</div> : null}
        {!reviewsQuery.isLoading && !reviews.length ? <div className="col-span-full rounded-2xl border border-dashed border-white/15 px-4 py-10 text-center text-sm text-slate-400">Первый отзыв пока не опубликован.</div> : null}
        {reviews.map((review) => <ReviewCard key={review.id} review={review} admin={admin} />)}
      </div>
    </section>
  );
};
