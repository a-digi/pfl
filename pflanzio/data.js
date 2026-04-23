'use strict';

const PLANTS_DB = [
  {
    id: 'monstera',
    name: 'Monstera deliciosa',
    emoji: '🌿',
    category: 'Zimmerpflanze',
    difficulty: 'easy',
    diffLabel: 'Einfach',
    diffCls: 'de',
    light: 'Halbschatten',
    water: 'Alle 10 Tage',
    wateringIntervalDays: 10,
    humidity: 'Mittel',
    description: 'Die Monstera ist eine der beliebtesten Zimmerpflanzen. Ihre geschlitzten Blätter machen sie unverwechselbar.',
    tips: ['Nie in direkte Sonne stellen', 'Luftwurzeln nicht abschneiden', 'Im Winter weniger gießen'],
    communityTips: 47
  },
  {
    id: 'ficus',
    name: 'Ficus benjamina',
    emoji: '🌳',
    category: 'Zimmerbaum',
    difficulty: 'medium',
    diffLabel: 'Mittel',
    diffCls: 'dm',
    light: 'Hell, kein Direktlicht',
    water: 'Alle 7 Tage',
    wateringIntervalDays: 7,
    humidity: 'Mittel',
    description: 'Braucht einen festen Standort. Jeder Umzug kann starken Blattabwurf auslösen.',
    tips: ['Standort nie wechseln', 'Keine Zugluft', 'Gleichmäßige Temperatur'],
    communityTips: 83
  },
  {
    id: 'calathea',
    name: 'Calathea ornata',
    emoji: '🌺',
    category: 'Tropenpflanze',
    difficulty: 'hard',
    diffLabel: 'Anspruchsvoll',
    diffCls: 'dh',
    light: 'Schattiger Standort',
    water: 'Alle 5 Tage',
    wateringIntervalDays: 5,
    humidity: 'Hoch',
    description: 'Eine echte Diva – ihr Anblick lohnt die Mühe. Sie liebt hohe Luftfeuchtigkeit.',
    tips: ['Nur weiches Wasser', 'Täglich besprühen', 'Nie Zugluft'],
    communityTips: 62
  },
  {
    id: 'pothos',
    name: 'Pothos',
    emoji: '🍃',
    category: 'Hängepflanze',
    difficulty: 'veryeasy',
    diffLabel: 'Sehr einfach',
    diffCls: 'dve',
    light: 'Schatten bis Hell',
    water: 'Alle 14 Tage',
    wateringIntervalDays: 14,
    humidity: 'Niedrig',
    description: 'Perfekt für Anfänger. Überlebt fast alles und wächst in fast jedem Licht.',
    tips: ['Fast unzerstörbar', 'Stecklinge leicht im Wasser wurzeln', '⚠️ Giftig für Haustiere!'],
    communityTips: 29
  },
  {
    id: 'aloe',
    name: 'Aloe vera',
    emoji: '🌵',
    category: 'Sukkulente',
    difficulty: 'easy',
    diffLabel: 'Einfach',
    diffCls: 'de',
    light: 'Vollsonne',
    water: 'Alle 21 Tage',
    wateringIntervalDays: 21,
    humidity: 'Niedrig',
    description: 'Die Heilpflanze für die Fensterbank. Verträgt Vernachlässigung, aber keine Staunässe.',
    tips: ['Im Sommer auf den Balkon', 'Winter: kaum gießen', 'Gel hilft bei Verbrennungen'],
    communityTips: 38
  },
  {
    id: 'orchidee',
    name: 'Orchidee',
    emoji: '💐',
    category: 'Blütenpflanze',
    difficulty: 'medium',
    diffLabel: 'Mittel',
    diffCls: 'dm',
    light: 'Helles Licht',
    water: 'Alle 10 Tage',
    wateringIntervalDays: 10,
    humidity: 'Mittel-Hoch',
    description: 'Eine der schönsten Zimmerpflanzen. Mit der richtigen Pflege blüht sie mehrmals im Jahr.',
    tips: ['Nie ins direkte Sonnenlicht', 'Wurzeln dürfen grün sein – das ist normal', 'Nach der Blüte Stiel kürzen'],
    communityTips: 54
  },
  {
    id: 'efeutute',
    name: 'Efeutute',
    emoji: '🌿',
    category: 'Kletterpflanze',
    difficulty: 'veryeasy',
    diffLabel: 'Sehr einfach',
    diffCls: 'dve',
    light: 'Schatten bis Halbschatten',
    water: 'Alle 12 Tage',
    wateringIntervalDays: 12,
    humidity: 'Niedrig-Mittel',
    description: 'Robust, schnell wachsend und ideal für Hängekörbe oder als Kletterpflanze.',
    tips: ['Lange Triebe einfach zurückschneiden', 'Stecklinge ins Wasser – in 2 Wochen Wurzeln', 'Verträgt auch dunkle Ecken'],
    communityTips: 31
  },
  {
    id: 'yucca',
    name: 'Yucca-Palme',
    emoji: '🌴',
    category: 'Palme',
    difficulty: 'easy',
    diffLabel: 'Einfach',
    diffCls: 'de',
    light: 'Viel Licht',
    water: 'Alle 14 Tage',
    wateringIntervalDays: 14,
    humidity: 'Niedrig',
    description: 'Mediteranes Flair für das Wohnzimmer. Sehr robust und pflegeleicht.',
    tips: ['Im Sommer raus in die Sonne', 'Wenig gießen – lieber zu wenig', 'Braune Spitzen wegschneiden'],
    communityTips: 22
  }
];

function getSeedState() {
  const now = Date.now();
  return {
    posts: [
      {
        id: 'post_seed_1',
        plantName: 'Monstera deliciosa',
        plantEmoji: '🌿',
        problem: 'Gelbe Blätter seit 2 Wochen, Erde fühlt sich feucht an',
        status: 'open',
        authorName: 'GrünerDaumen_Karl',
        authorEmoji: '🧑‍🌾',
        authorPoints: 342,
        timestamp: now - 7200000,
        photo: null,
        kiTip: null,
        tips: [
          { id: 'tip_s1a', text: 'Klingt nach Staunässe! Topf sofort umstellen, Erde tauschen. Monstera braucht nur alle 10 Tage Wasser.', authorName: 'BotanikaBerlin', authorEmoji: '👩‍🔬', authorPoints: 891, votes: 14, helped: false, timestamp: now - 3600000 },
          { id: 'tip_s1b', text: 'Überprüf die Wurzeln – wenn sie braun und matschig sind, schneid die ab und gib frische Erde rein.', authorName: 'PflanzPeter', authorEmoji: '🧔', authorPoints: 203, votes: 8, helped: false, timestamp: now - 1800000 }
        ]
      },
      {
        id: 'post_seed_2',
        plantName: 'Ficus benjamina',
        plantEmoji: '🌳',
        problem: 'Wirft massiv Blätter ab, steht seit Jahren am gleichen Platz',
        status: 'solved',
        authorName: 'FensterblattFan',
        authorEmoji: '👩',
        authorPoints: 127,
        timestamp: now - 18000000,
        photo: null,
        kiTip: null,
        tips: [
          { id: 'tip_s2a', text: 'Ficus hasst Zugluft! Schau ob die Heizung daneben ist oder ein Fenster oft geöffnet wird.', authorName: 'GrünerDaumen_Karl', authorEmoji: '🧑‍🌾', authorPoints: 342, votes: 31, helped: true, timestamp: now - 14400000 }
        ]
      },
      {
        id: 'post_seed_3',
        plantName: 'Calathea ornata',
        plantEmoji: '🌺',
        problem: 'Blattränder werden braun und trocken, gieße regelmäßig',
        status: 'open',
        authorName: 'UrbanJungle_Mia',
        authorEmoji: '👩‍🦱',
        authorPoints: 56,
        timestamp: now - 86400000,
        photo: null,
        kiTip: null,
        tips: [
          { id: 'tip_s3a', text: 'Calathea liebt Luftfeuchtigkeit! Leitungswasser enthält zu viel Kalk – nur gefiltertes Wasser verwenden.', authorName: 'BotanikaBerlin', authorEmoji: '👩‍🔬', authorPoints: 891, votes: 22, helped: false, timestamp: now - 72000000 }
        ]
      }
    ],
    profile: { name: 'Du', emoji: '😊', points: 0, tipsGiven: 0, helped: 0, plantsCount: 0 },
    myVotes: {},
    myPlants: [],
    feedFilter: 'all',
    unreadMessages: 2,
    settings: { claudeApiKey: '', notificationsEnabled: false }
  };
}
