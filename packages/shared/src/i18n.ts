/**
 * Lightweight i18n. Keys, not hardcoded strings. Default pt-BR.
 * Suitable for both web (server + client) and React Native (Expo).
 */

import { DEFAULT_LOCALE, LOCALES } from './types.js';
import type { Locale } from './types.js';

export type MessageKey = keyof typeof en;

const en = {
  'app.tagline': 'Live scores, groups and football alerts',
  'nav.home': 'Home',
  'nav.matches': 'Matches',
  'nav.groups': 'Groups',
  'nav.bracket': 'Bracket',
  'nav.simulator': 'Simulator',
  'nav.alerts': 'Alerts',
  'nav.settings': 'Settings',
  'nav.about': 'About',
  'home.live_now': 'Live now',
  'home.today': "Today's matches",
  'home.upcoming': 'Upcoming',
  'home.favorites': 'Your favorites',
  'home.empty': 'No matches to show',
  'match.timeline': 'Timeline',
  'match.lineups': 'Lineups',
  'match.stats': 'Statistics',
  'match.impact': 'Impact on group table',
  'match.minute': "{minute}'",
  'status.scheduled': 'Scheduled',
  'status.live': 'Live',
  'status.halftime': 'Half-time',
  'status.extra_time': 'Extra time',
  'status.penalties': 'Penalties',
  'status.finished': 'Finished',
  'status.postponed': 'Postponed',
  'status.cancelled': 'Cancelled',
  'spoilers.in_progress_hidden': 'In progress (hidden)',
  'spoilers.finished_hidden': 'Finished (hidden)',
  'spoilers.toggle': 'No-spoilers mode',
  'groups.points': 'Pts',
  'groups.played': 'P',
  'groups.won': 'W',
  'groups.drawn': 'D',
  'groups.lost': 'L',
  'groups.goals_for': 'GF',
  'groups.goals_against': 'GA',
  'groups.goal_difference': 'GD',
  'qual.qualified': 'Qualified',
  'qual.provisionally_qualified': 'Provisionally qualified',
  'qual.still_possible': 'Still possible',
  'qual.eliminated': 'Eliminated',
  'qual.unknown': 'Undecided',
  'simulator.title': 'What-if simulator',
  'simulator.reset': 'Reset',
  'simulator.qualifiers': 'Would qualify',
  'alerts.match_start': 'Match start',
  'alerts.goal': 'Goals',
  'alerts.penalty': 'Penalties',
  'alerts.red_card': 'Red cards',
  'alerts.halftime': 'Half-time',
  'alerts.fulltime': 'Full-time',
  'alerts.group_table_changed': 'Group table changed',
  'alerts.lineup_available': 'Lineup available',
  'alerts.quiet_hours': 'Quiet hours',
  'settings.language': 'Language',
  'settings.timezone': 'Time zone',
  'settings.data_source': 'Data source',
  'settings.version': 'App version',
  'conn.live': 'Live',
  'conn.connecting': 'Connecting…',
  'conn.reconnecting': 'Reconnecting…',
  'conn.stale': 'Connection stale',
  'disclaimer':
    'Independent live score application. Not affiliated with, endorsed by, or sponsored by FIFA or any tournament organizer.',
} as const;

const ptBR: Record<MessageKey, string> = {
  'app.tagline': 'Placar ao vivo, grupos e alertas de futebol',
  'nav.home': 'Início',
  'nav.matches': 'Jogos',
  'nav.groups': 'Grupos',
  'nav.bracket': 'Mata-mata',
  'nav.simulator': 'Simulador',
  'nav.alerts': 'Alertas',
  'nav.settings': 'Configurações',
  'nav.about': 'Sobre',
  'home.live_now': 'Ao vivo agora',
  'home.today': 'Jogos de hoje',
  'home.upcoming': 'Próximos',
  'home.favorites': 'Seus favoritos',
  'home.empty': 'Nenhum jogo para mostrar',
  'match.timeline': 'Lances',
  'match.lineups': 'Escalações',
  'match.stats': 'Estatísticas',
  'match.impact': 'Impacto na tabela do grupo',
  'match.minute': "{minute}'",
  'status.scheduled': 'Agendado',
  'status.live': 'Ao vivo',
  'status.halftime': 'Intervalo',
  'status.extra_time': 'Prorrogação',
  'status.penalties': 'Pênaltis',
  'status.finished': 'Encerrado',
  'status.postponed': 'Adiado',
  'status.cancelled': 'Cancelado',
  'spoilers.in_progress_hidden': 'Em andamento (oculto)',
  'spoilers.finished_hidden': 'Encerrado (oculto)',
  'spoilers.toggle': 'Modo sem spoilers',
  'groups.points': 'Pts',
  'groups.played': 'J',
  'groups.won': 'V',
  'groups.drawn': 'E',
  'groups.lost': 'D',
  'groups.goals_for': 'GP',
  'groups.goals_against': 'GC',
  'groups.goal_difference': 'SG',
  'qual.qualified': 'Classificado',
  'qual.provisionally_qualified': 'Classificação provisória',
  'qual.still_possible': 'Ainda possível',
  'qual.eliminated': 'Eliminado',
  'qual.unknown': 'Indefinido',
  'simulator.title': 'Simulador de cenários',
  'simulator.reset': 'Reiniciar',
  'simulator.qualifiers': 'Classificariam',
  'alerts.match_start': 'Início do jogo',
  'alerts.goal': 'Gols',
  'alerts.penalty': 'Pênaltis',
  'alerts.red_card': 'Cartões vermelhos',
  'alerts.halftime': 'Intervalo',
  'alerts.fulltime': 'Fim de jogo',
  'alerts.group_table_changed': 'Mudança na tabela',
  'alerts.lineup_available': 'Escalação disponível',
  'alerts.quiet_hours': 'Horário silencioso',
  'settings.language': 'Idioma',
  'settings.timezone': 'Fuso horário',
  'settings.data_source': 'Fonte de dados',
  'settings.version': 'Versão do app',
  'conn.live': 'Ao vivo',
  'conn.connecting': 'Conectando…',
  'conn.reconnecting': 'Reconectando…',
  'conn.stale': 'Conexão instável',
  'disclaimer':
    'Aplicativo independente de placar ao vivo. Não é afiliado, endossado ou patrocinado pela FIFA ou por qualquer organizador de torneio.',
};

// pt-PT reuses pt-BR with a few European-Portuguese tweaks.
const ptPT: Record<MessageKey, string> = {
  ...ptBR,
  'nav.home': 'Início',
  'home.today': 'Jogos de hoje',
  'match.timeline': 'Cronologia',
  'settings.timezone': 'Fuso horário',
  'disclaimer':
    'Aplicação independente de resultados ao vivo. Não é afiliada, apoiada ou patrocinada pela FIFA ou por qualquer organizador de torneio.',
};

const es: Record<MessageKey, string> = {
  ...en,
  'app.tagline': 'Marcador en vivo, grupos y alertas de fútbol',
  'nav.home': 'Inicio',
  'nav.matches': 'Partidos',
  'nav.groups': 'Grupos',
  'nav.bracket': 'Eliminatorias',
  'nav.simulator': 'Simulador',
  'nav.alerts': 'Alertas',
  'nav.settings': 'Ajustes',
  'nav.about': 'Acerca de',
  'home.live_now': 'En vivo ahora',
  'home.today': 'Partidos de hoy',
  'home.upcoming': 'Próximos',
  'home.favorites': 'Tus favoritos',
  'home.empty': 'No hay partidos para mostrar',
  'status.live': 'En vivo',
  'status.finished': 'Finalizado',
  'qual.qualified': 'Clasificado',
  'qual.eliminated': 'Eliminado',
  'disclaimer':
    'Aplicación independiente de marcadores en vivo. No está afiliada, respaldada ni patrocinada por la FIFA ni por ningún organizador de torneos.',
};

const dictionaries: Record<Locale, Record<MessageKey, string>> = {
  'pt-BR': ptBR,
  'pt-PT': ptPT,
  en,
  es,
};

export function isLocale(value: string): value is Locale {
  return (LOCALES as string[]).includes(value);
}

export function resolveLocale(value: string | null | undefined): Locale {
  if (value && isLocale(value)) {
    return value;
  }
  // language-only fallback (e.g. "pt", "es")
  const lang = (value ?? '').slice(0, 2).toLowerCase();
  if (lang === 'pt') {
    return 'pt-BR';
  }
  if (lang === 'es') {
    return 'es';
  }
  if (lang === 'en') {
    return 'en';
  }
  return DEFAULT_LOCALE;
}

/** Translate a key with optional `{placeholder}` interpolation. */
export function translate(
  locale: Locale,
  key: MessageKey,
  vars?: Record<string, string | number>,
): string {
  const dict = dictionaries[locale] ?? dictionaries[DEFAULT_LOCALE];
  let out: string = dict[key] ?? en[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      out = out.replace(`{${k}}`, String(v));
    }
  }
  return out;
}

export function makeTranslator(locale: Locale) {
  return (key: MessageKey, vars?: Record<string, string | number>) => translate(locale, key, vars);
}

export { en as messagesEn };
