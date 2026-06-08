import type { DocRecord } from '@affine/core/modules/doc/entities/record';
import { useLiveData } from '@toeverything/infra';
import clsx from 'clsx';
import type { MouseEvent } from 'react';

import * as styles from './journal-rating.css';

export const MAX_STARS = 5;

export type RatingOption = {
  value: string;
  emoji: string;
  label: string;
  /** Higher = "better"; used for sorting. */
  order: number;
};

/** 心情 (3 levels, high → low). */
export const MOOD_OPTIONS: RatingOption[] = [
  { value: 'happy', emoji: '😊', label: '開心', order: 3 },
  { value: 'neutral', emoji: '😐', label: '普通', order: 2 },
  { value: 'sad', emoji: '😞', label: '難過', order: 1 },
];

/** 天氣 (3 levels, good → bad). */
export const WEATHER_OPTIONS: RatingOption[] = [
  { value: 'sunny', emoji: '☀️', label: '晴', order: 3 },
  { value: 'cloudy', emoji: '⛅', label: '多雲', order: 2 },
  { value: 'rainy', emoji: '🌧️', label: '雨', order: 1 },
];

const RATING_PREFIX = 'journal_rating';
export const starsKey = (headingId: string) =>
  `${RATING_PREFIX}_${headingId}_stars`;
export const moodKey = (headingId: string) =>
  `${RATING_PREFIX}_${headingId}_mood`;
export const weatherKey = (headingId: string) =>
  `${RATING_PREFIX}_${headingId}_weather`;

const orderOf = (options: RatingOption[], value: string | undefined | null) =>
  options.find(option => option.value === value)?.order ?? 0;
export const moodOrder = (value: string | undefined | null) =>
  orderOf(MOOD_OPTIONS, value);
export const weatherOrder = (value: string | undefined | null) =>
  orderOf(WEATHER_OPTIONS, value);

type Props = Record<string, string | undefined> | undefined;

/** Numeric sort value for one entry's rating in a given field. */
export const ratingSortValue = (
  props: Props,
  headingId: string,
  field: 'stars' | 'mood' | 'weather'
): number => {
  if (field === 'stars') {
    return Number(props?.[`custom:${starsKey(headingId)}`] ?? '0') || 0;
  }
  if (field === 'mood')
    return moodOrder(props?.[`custom:${moodKey(headingId)}`]);
  return weatherOrder(props?.[`custom:${weatherKey(headingId)}`]);
};

/**
 * A row of clickable controls — 5 stars + 3 mood emoji + 3 weather emoji —
 * that read/write per-entry ratings stored as custom properties on the journal
 * doc, keyed by the entry's heading block id. Used both on the All Journals
 * cards and in the in-doc per-entry ratings panel, so the two stay in sync.
 * Clicking the current value again clears it.
 */
export const JournalRatingControls = ({
  docRecord,
  headingId,
  compact,
}: {
  docRecord: DocRecord;
  headingId: string;
  compact?: boolean;
}) => {
  const props = useLiveData(docRecord.properties$) as Record<
    string,
    string | undefined
  >;
  const stars = Number(props[`custom:${starsKey(headingId)}`] ?? '0') || 0;
  const mood = props[`custom:${moodKey(headingId)}`] ?? '';
  const weather = props[`custom:${weatherKey(headingId)}`] ?? '';

  const stop = (e: MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
  };
  const setStars = (e: MouseEvent, n: number) => {
    stop(e);
    docRecord.setCustomProperty(
      starsKey(headingId),
      n === stars ? '' : String(n)
    );
  };
  const setMood = (e: MouseEvent, value: string) => {
    stop(e);
    docRecord.setCustomProperty(
      moodKey(headingId),
      value === mood ? '' : value
    );
  };
  const setWeather = (e: MouseEvent, value: string) => {
    stop(e);
    docRecord.setCustomProperty(
      weatherKey(headingId),
      value === weather ? '' : value
    );
  };

  return (
    <div
      className={clsx(styles.root, compact && styles.compact)}
      onClick={stop}
      data-testid="journal-rating"
    >
      <div className={styles.stars} aria-label="星等">
        {Array.from({ length: MAX_STARS }, (_, i) => i + 1).map(n => (
          <button
            key={n}
            type="button"
            className={styles.star}
            data-filled={n <= stars}
            title={`${n} 顆星`}
            onClick={e => setStars(e, n)}
            data-testid={`rating-star-${n}`}
          >
            ★
          </button>
        ))}
      </div>
      <span className={styles.divider} />
      <div className={styles.picks} aria-label="心情">
        {MOOD_OPTIONS.map(option => (
          <button
            key={option.value}
            type="button"
            className={styles.pick}
            data-active={mood === option.value}
            title={option.label}
            onClick={e => setMood(e, option.value)}
            data-testid={`rating-mood-${option.value}`}
          >
            {option.emoji}
          </button>
        ))}
      </div>
      <span className={styles.divider} />
      <div className={styles.picks} aria-label="天氣">
        {WEATHER_OPTIONS.map(option => (
          <button
            key={option.value}
            type="button"
            className={styles.pick}
            data-active={weather === option.value}
            title={option.label}
            onClick={e => setWeather(e, option.value)}
            data-testid={`rating-weather-${option.value}`}
          >
            {option.emoji}
          </button>
        ))}
      </div>
    </div>
  );
};
