/**
 * All user-facing copy (Feature 258 — `fr` mirrors `en` keys exactly).
 *
 * F7 structure: app, common, onboarding, shifts, analytics, notifications, errors,
 * vehicles, expenses, platforms, tax, goals, settings, reports, schedule, search,
 * plus `modules` / `views` / `ui` placeholders aligned to `plan.md` file tree and F8 shell.
 * Leaf values are always strings so `t('a.b.c')` resolves to a string (fallback: English, then key).
 * Module-specific marketing copy and long-form help: Phase 2+ modules will replace placeholder text.
 */

/** @type {Record<'en'|'fr', Record<string, unknown>>} */
export const strings = {
  en: {
    app: {
      name: 'Macadam',
      tagline: 'Gig earnings, local-first',
      updateAvailable: 'App updated — reload for latest version',
      reload: 'Reload',
      offlineBanner: 'You are offline. Changes sync when you reconnect.',
      online: 'Online',
      offline: 'Offline',
      navDashboard: 'Dashboard',
      navShifts: 'Shifts',
      navAnalytics: 'Analytics',
      navGoals: 'Goals',
      navSettings: 'Settings',
    },
    common: {
      save: 'Save',
      cancel: 'Cancel',
      close: 'Close',
      confirm: 'Confirm',
      delete: 'Delete',
      edit: 'Edit',
      done: 'Done',
      back: 'Back',
      next: 'Next',
      loading: 'Loading…',
      optional: 'Optional',
      required: 'Required',
      yes: 'Yes',
      no: 'No',
      copy: 'Copy',
      share: 'Share',
      retry: 'Retry',
    },
    onboarding: {
      title: 'Welcome to Macadam',
      subtitle: 'Track gig earnings in one place',
      continue: 'Continue',
      skip: 'Skip for now',
      finish: 'Get started',
      stepProgress: 'Step {current} of {total}',
      welcomeTitle: 'Welcome',
      platformsTitle: 'Your platforms',
      vehicleTitle: 'Your vehicle',
      goalsTitle: 'Weekly goal',
      notificationsTitle: 'Stay on track',
      privacyTitle: 'Privacy',
      summaryTitle: 'You are set',
      placeholderBody:
        'Onboarding step copy is finalized in Phase 2 (orchestrator + steps.js). Keys exist so `t()` stays stable.',
    },
    shifts: {
      addShift: 'Add shift',
      editShift: 'Edit shift',
      deleteShift: 'Delete shift',
      duplicateShift: 'Duplicate shift',
      endShift: 'End shift',
      startShift: 'Start shift',
      shiftTimer: 'Shift timer',
      template: 'Template',
      templates: 'Templates',
      bulkImport: 'Bulk import',
      notes: 'Notes',
      gross: 'Gross',
      net: 'Net',
      expenses: 'Expenses',
      duration: 'Duration',
      orders: 'Orders',
      tips: 'Tips',
      distance: 'Distance',
      zone: 'Zone',
      platform: 'Platform',
      emptyTitle: 'No shifts yet',
      emptyMessage: 'Log your first shift to see earnings and trends.',
      deleteConfirm: 'Delete this shift? This cannot be undone.',
    },
    analytics: {
      title: 'Analytics',
      subtitle: 'Earnings, pace, and patterns',
      hourlyRate: 'Hourly rate',
      netHourly: 'Net hourly',
      earnings: 'Earnings',
      distance: 'Distance',
      tips: 'Tips',
      orders: 'Orders',
      zones: 'Zones',
      trends: 'Trends',
      heatmap: 'Heatmap',
      scatter: 'Scatter',
      byDayOfWeek: 'By day of week',
      byHour: 'By hour of day',
      utilization: 'Utilization',
      records: 'Personal records',
      projection: 'Week projection',
      streak: 'Streak',
      compare: 'Compare periods',
      emptyTitle: 'Not enough data yet',
      emptyMessage: 'Log a few shifts to unlock charts and insights.',
    },
    notifications: {
      title: 'Notifications',
      permissionDenied: 'Notifications are blocked in this browser.',
      enableHint: 'Enable notifications to get shift reminders and nudges.',
      reminderShift: 'Shift reminder',
      goalMet: 'Goal reached',
      taxDeadline: 'Tax deadline approaching',
      weeklySummary: 'Weekly summary',
      openSettings: 'Open settings',
    },
    errors: {
      generic: 'Something went wrong. Try again.',
      offline: 'You appear to be offline.',
      network: 'Network request failed. Check your connection.',
      dbOpen: 'Could not open local database.',
      dbMigration: 'Database upgrade failed.',
      invalidInput: 'Check your entries and try again.',
      notFound: 'That item could not be found.',
      permission: 'Permission denied.',
      importFailed: 'Import failed. Check the file format.',
      exportFailed: 'Export failed. Try again.',
    },
    vehicles: {
      title: 'Vehicles',
      add: 'Add vehicle',
      edit: 'Edit vehicle',
      fuel: 'Fuel',
      ev: 'Electric',
      maintenance: 'Maintenance',
      mileage: 'Mileage',
      depreciation: 'Depreciation',
      efficiency: 'Efficiency',
    },
    expenses: {
      title: 'Expenses',
      add: 'Add expense',
      category: 'Category',
      recurring: 'Recurring',
      emptyTitle: 'No expenses yet',
      emptyMessage: 'Track fuel, maintenance, and other gig costs here.',
    },
    platforms: {
      title: 'Platforms',
      switcher: 'Platform',
      add: 'Add platform',
      config: 'Platform settings',
      terminology: 'Terminology',
    },
    tax: {
      title: 'Tax',
      subtitle: 'Set-aside and instalments',
      setAside: 'Tax set-aside',
      instalments: 'Instalments',
      mileage: 'Mileage deduction',
      cpp: 'CPP (Canada)',
      seTax: 'Self-employment tax (US)',
      hst: 'HST / GST',
    },
    goals: {
      title: 'Goals',
      weeklyTarget: 'Weekly target',
      badges: 'Badges',
      xp: 'XP',
      challenges: 'Challenges',
      streakDays: 'Day streak',
    },
    settings: {
      title: 'Settings',
      subtitle: 'Locale, display, and data',
      language: 'Language',
      dateFormat: 'Date format',
      timeFormat: 'Time format',
      theme: 'Theme',
      distanceUnit: 'Distance unit',
      currency: 'Currency',
      notifications: 'Notifications',
      dataExport: 'Export data',
      dangerZone: 'Danger zone',
      about: 'About',
    },
    reports: {
      title: 'Reports',
      export: 'Export',
      csv: 'CSV',
      json: 'JSON',
      print: 'Print view',
      yearInReview: 'Year in review',
    },
    schedule: {
      title: 'Schedule',
      subtitle: 'Planning and calendar',
      weekView: 'Week',
      monthView: 'Month',
      timeBlock: 'Time block',
      planningMode: 'Planning mode',
    },
    search: {
      title: 'Search',
      placeholder: 'Search shifts and expenses',
      filter: 'Filters',
      noResults: 'No matches',
    },
    modules: {
      onboarding: {
        title: 'Onboarding module',
        body: 'Orchestrator copy ships with Phase 2 (`modules/onboarding/`).',
      },
      platforms: {
        title: 'Platforms module',
        body: 'Switcher and per-platform config ship with Phase 2 (`modules/platforms/`).',
      },
      shifts: {
        title: 'Shifts module',
        body: 'CRUD, timer, and forms ship with Phase 2 (`modules/shifts/`).',
      },
      expenses: {
        title: 'Expenses module',
        body: 'Categories and recurring rules ship with Phase 2 (`modules/expenses/`).',
      },
      analytics: {
        title: 'Analytics module',
        body: 'Aggregations and chart views ship with Phase 2 (`modules/analytics/`).',
      },
      tax: {
        title: 'Tax module',
        body: 'Regional worksheets ship with Phase 2 (`modules/tax/`).',
      },
      vehicles: {
        title: 'Vehicles module',
        body: 'Garage and cost models ship with Phase 2 (`modules/vehicles/`).',
      },
      goals: {
        title: 'Goals module',
        body: 'Badges, XP, and streaks ship with Phase 2 (`modules/goals/`).',
      },
      reports: {
        title: 'Reports module',
        body: 'CSV/JSON/print/QR exports ship with Phase 2 (`modules/reports/`).',
      },
      search: {
        title: 'Search module',
        body: 'Fuse.js integration ships with Phase 2 (`modules/search/`).',
      },
      notifications: {
        title: 'Notifications module',
        body: 'All notification types ship with Phase 2 (`modules/notifications/`).',
      },
      schedule: {
        title: 'Schedule module',
        body: 'Calendar and planning ship with Phase 2 (`modules/schedule/`).',
      },
      settings: {
        title: 'Settings module',
        body: 'Full preferences UI ships with Phase 2 (`modules/settings/`).',
      },
    },
    views: {
      dashboard: {
        title: 'Dashboard',
        greeting: 'Here is your snapshot',
        placeholderBody: 'Dashboard widgets and copy finalize in Phase 2 (`views/dashboard.js`).',
      },
      shifts: {
        title: 'Shifts',
        placeholderBody: 'Shift list and filters finalize in Phase 2 (`views/shifts-view.js`).',
      },
      analytics: {
        title: 'Analytics',
        placeholderBody: 'Route-level analytics layout finalizes in Phase 2 (`views/analytics-view.js`).',
      },
      tax: {
        title: 'Tax',
        placeholderBody: 'Tax view copy finalizes in Phase 2 (`views/tax-view.js`).',
      },
      vehicles: {
        title: 'Vehicles',
        placeholderBody: 'Vehicles view copy finalizes in Phase 2 (`views/vehicles-view.js`).',
      },
      schedule: {
        title: 'Schedule',
        placeholderBody: 'Schedule view copy finalizes in Phase 2 (`views/schedule-view.js`).',
      },
      goals: {
        title: 'Goals',
        placeholderBody: 'Goals view copy finalizes in Phase 2 (`views/goals-view.js`).',
      },
      reports: {
        title: 'Reports',
        placeholderBody: 'Reports view copy finalizes in Phase 2 (`views/reports-view.js`).',
      },
      settings: {
        title: 'Settings',
        placeholderBody: 'Settings view copy finalizes in Phase 2 (`views/settings-view.js`).',
      },
      onboarding: {
        title: 'Onboarding',
        placeholderBody: 'Onboarding view shell finalizes in Phase 2 (`views/onboarding-view.js`).',
      },
    },
    ui: {
      modal: {
        close: 'Close',
      },
      confirm: {
        title: 'Are you sure?',
        destructive: 'This action is hard to undo.',
      },
      toast: {
        success: 'Saved',
        error: 'Error',
        warning: 'Warning',
        info: 'Info',
      },
      fab: {
        addShift: 'Quick add shift',
        endShift: 'End shift',
      },
      drawer: {
        close: 'Close',
      },
      progressRing: {
        label: 'Progress',
      },
      skeleton: {
        loading: 'Loading',
      },
      emptyState: {
        defaultTitle: 'Nothing here yet',
        defaultMessage: 'Try adding an item or changing filters.',
      },
      keypad: {
        confirm: 'Done',
      },
    },
  },
  fr: {
    app: {
      name: 'Macadam',
      tagline: 'Gains de gig, local d’abord',
      updateAvailable: 'Mise à jour disponible — rechargez pour la dernière version',
      reload: 'Recharger',
      offlineBanner: 'Vous êtes hors ligne. Les changements se synchronisent à la reconnexion.',
      online: 'En ligne',
      offline: 'Hors ligne',
      navDashboard: 'Tableau de bord',
      navShifts: 'Quarts',
      navAnalytics: 'Analytique',
      navGoals: 'Objectifs',
      navSettings: 'Paramètres',
    },
    common: {
      save: 'Enregistrer',
      cancel: 'Annuler',
      close: 'Fermer',
      confirm: 'Confirmer',
      delete: 'Supprimer',
      edit: 'Modifier',
      done: 'Terminé',
      back: 'Retour',
      next: 'Suivant',
      loading: 'Chargement…',
      optional: 'Facultatif',
      required: 'Obligatoire',
      yes: 'Oui',
      no: 'Non',
      copy: 'Copier',
      share: 'Partager',
      retry: 'Réessayer',
    },
    onboarding: {
      title: 'Bienvenue sur Macadam',
      subtitle: 'Suivez vos gains dans une seule app',
      continue: 'Continuer',
      skip: 'Passer pour l’instant',
      finish: 'Commencer',
      stepProgress: 'Étape {current} sur {total}',
      welcomeTitle: 'Bienvenue',
      platformsTitle: 'Vos plateformes',
      vehicleTitle: 'Votre véhicule',
      goalsTitle: 'Objectif hebdomadaire',
      notificationsTitle: 'Restez sur la bonne voie',
      privacyTitle: 'Confidentialité',
      summaryTitle: 'Tout est prêt',
      placeholderBody:
        'Le texte détaillé de l’accueil arrive en phase 2 (orchestrateur + steps.js). Les clés restent stables pour `t()`.',
    },
    shifts: {
      addShift: 'Ajouter un quart',
      editShift: 'Modifier le quart',
      deleteShift: 'Supprimer le quart',
      duplicateShift: 'Dupliquer le quart',
      endShift: 'Terminer le quart',
      startShift: 'Commencer le quart',
      shiftTimer: 'Chronomètre de quart',
      template: 'Modèle',
      templates: 'Modèles',
      bulkImport: 'Import groupé',
      notes: 'Notes',
      gross: 'Brut',
      net: 'Net',
      expenses: 'Dépenses',
      duration: 'Durée',
      orders: 'Commandes',
      tips: 'Pourboires',
      distance: 'Distance',
      zone: 'Zone',
      platform: 'Plateforme',
      emptyTitle: 'Aucun quart',
      emptyMessage: 'Enregistrez votre premier quart pour voir les tendances.',
      deleteConfirm: 'Supprimer ce quart ? Cette action est irréversible.',
    },
    analytics: {
      title: 'Analytique',
      subtitle: 'Gains, rythme et habitudes',
      hourlyRate: 'Taux horaire',
      netHourly: 'Taux horaire net',
      earnings: 'Gains',
      distance: 'Distance',
      tips: 'Pourboires',
      orders: 'Commandes',
      zones: 'Zones',
      trends: 'Tendances',
      heatmap: 'Carte de chaleur',
      scatter: 'Nuage de points',
      byDayOfWeek: 'Par jour de la semaine',
      byHour: 'Par heure',
      utilization: 'Utilisation',
      records: 'Records personnels',
      projection: 'Projection hebdomadaire',
      streak: 'Série',
      compare: 'Comparer les périodes',
      emptyTitle: 'Pas assez de données',
      emptyMessage: 'Ajoutez quelques quarts pour débloquer graphiques et analyses.',
    },
    notifications: {
      title: 'Notifications',
      permissionDenied: 'Les notifications sont bloquées dans ce navigateur.',
      enableHint: 'Activez les notifications pour les rappels de quart.',
      reminderShift: 'Rappel de quart',
      goalMet: 'Objectif atteint',
      taxDeadline: 'Échéance fiscale proche',
      weeklySummary: 'Résumé hebdomadaire',
      openSettings: 'Ouvrir les paramètres',
    },
    errors: {
      generic: 'Une erreur s’est produite. Réessayez.',
      offline: 'Vous semblez hors ligne.',
      network: 'La requête réseau a échoué. Vérifiez la connexion.',
      dbOpen: 'Impossible d’ouvrir la base locale.',
      dbMigration: 'La mise à niveau de la base a échoué.',
      invalidInput: 'Vérifiez les champs et réessayez.',
      notFound: 'Élément introuvable.',
      permission: 'Permission refusée.',
      importFailed: 'Import impossible. Vérifiez le format du fichier.',
      exportFailed: 'Export impossible. Réessayez.',
    },
    vehicles: {
      title: 'Véhicules',
      add: 'Ajouter un véhicule',
      edit: 'Modifier le véhicule',
      fuel: 'Carburant',
      ev: 'Électrique',
      maintenance: 'Entretien',
      mileage: 'Kilométrage',
      depreciation: 'Amortissement',
      efficiency: 'Rendement',
    },
    expenses: {
      title: 'Dépenses',
      add: 'Ajouter une dépense',
      category: 'Catégorie',
      recurring: 'Récurrent',
      emptyTitle: 'Aucune dépense',
      emptyMessage: 'Suivez carburant, entretien et autres coûts ici.',
    },
    platforms: {
      title: 'Plateformes',
      switcher: 'Plateforme',
      add: 'Ajouter une plateforme',
      config: 'Paramètres de plateforme',
      terminology: 'Terminologie',
    },
    tax: {
      title: 'Impôts',
      subtitle: 'Mise de côté et acomptes',
      setAside: 'Mise de côté fiscale',
      instalments: 'Acomptes provisionnels',
      mileage: 'Déduction kilométrique',
      cpp: 'RPC (Canada)',
      seTax: 'Travail autonome (É.-U.)',
      hst: 'TPS / TVH',
    },
    goals: {
      title: 'Objectifs',
      weeklyTarget: 'Objectif hebdomadaire',
      badges: 'Badges',
      xp: 'XP',
      challenges: 'Défis',
      streakDays: 'Série de jours',
    },
    settings: {
      title: 'Paramètres',
      subtitle: 'Locale, affichage et données',
      language: 'Langue',
      dateFormat: 'Format de date',
      timeFormat: 'Format d’heure',
      theme: 'Thème',
      distanceUnit: 'Unité de distance',
      currency: 'Devise',
      notifications: 'Notifications',
      dataExport: 'Exporter les données',
      dangerZone: 'Zone sensible',
      about: 'À propos',
    },
    reports: {
      title: 'Rapports',
      export: 'Exporter',
      csv: 'CSV',
      json: 'JSON',
      print: 'Version imprimable',
      yearInReview: 'Bilan de l’année',
    },
    schedule: {
      title: 'Horaire',
      subtitle: 'Planification et calendrier',
      weekView: 'Semaine',
      monthView: 'Mois',
      timeBlock: 'Bloc de temps',
      planningMode: 'Mode planification',
    },
    search: {
      title: 'Recherche',
      placeholder: 'Rechercher quarts et dépenses',
      filter: 'Filtres',
      noResults: 'Aucun résultat',
    },
    modules: {
      onboarding: {
        title: 'Module d’accueil',
        body: 'Texte d’orchestration en phase 2 (`modules/onboarding/`).',
      },
      platforms: {
        title: 'Module plateformes',
        body: 'Sélecteur et config par plateforme en phase 2 (`modules/platforms/`).',
      },
      shifts: {
        title: 'Module quarts',
        body: 'CRUD, chronomètre et formulaires en phase 2 (`modules/shifts/`).',
      },
      expenses: {
        title: 'Module dépenses',
        body: 'Catégories et récurrence en phase 2 (`modules/expenses/`).',
      },
      analytics: {
        title: 'Module analytique',
        body: 'Agrégations et graphiques en phase 2 (`modules/analytics/`).',
      },
      tax: {
        title: 'Module fiscal',
        body: 'Feuilles par région en phase 2 (`modules/tax/`).',
      },
      vehicles: {
        title: 'Module véhicules',
        body: 'Garage et coûts en phase 2 (`modules/vehicles/`).',
      },
      goals: {
        title: 'Module objectifs',
        body: 'Badges, XP et séries en phase 2 (`modules/goals/`).',
      },
      reports: {
        title: 'Module rapports',
        body: 'Exports CSV/JSON/impression/QR en phase 2 (`modules/reports/`).',
      },
      search: {
        title: 'Module recherche',
        body: 'Intégration Fuse.js en phase 2 (`modules/search/`).',
      },
      notifications: {
        title: 'Module notifications',
        body: 'Tous les types de notifications en phase 2 (`modules/notifications/`).',
      },
      schedule: {
        title: 'Module horaire',
        body: 'Calendrier et planification en phase 2 (`modules/schedule/`).',
      },
      settings: {
        title: 'Module paramètres',
        body: 'Préférences complètes en phase 2 (`modules/settings/`).',
      },
    },
    views: {
      dashboard: {
        title: 'Tableau de bord',
        greeting: 'Voici votre aperçu',
        placeholderBody: 'Widgets et texte du tableau de bord en phase 2 (`views/dashboard.js`).',
      },
      shifts: {
        title: 'Quarts',
        placeholderBody: 'Liste et filtres en phase 2 (`views/shifts-view.js`).',
      },
      analytics: {
        title: 'Analytique',
        placeholderBody: 'Mise en page analytique en phase 2 (`views/analytics-view.js`).',
      },
      tax: {
        title: 'Impôts',
        placeholderBody: 'Texte de la vue fiscale en phase 2 (`views/tax-view.js`).',
      },
      vehicles: {
        title: 'Véhicules',
        placeholderBody: 'Texte de la vue véhicules en phase 2 (`views/vehicles-view.js`).',
      },
      schedule: {
        title: 'Horaire',
        placeholderBody: 'Texte de la vue horaire en phase 2 (`views/schedule-view.js`).',
      },
      goals: {
        title: 'Objectifs',
        placeholderBody: 'Texte de la vue objectifs en phase 2 (`views/goals-view.js`).',
      },
      reports: {
        title: 'Rapports',
        placeholderBody: 'Texte de la vue rapports en phase 2 (`views/reports-view.js`).',
      },
      settings: {
        title: 'Paramètres',
        placeholderBody: 'Texte de la vue paramètres en phase 2 (`views/settings-view.js`).',
      },
      onboarding: {
        title: 'Accueil',
        placeholderBody: 'Coquille d’accueil en phase 2 (`views/onboarding-view.js`).',
      },
    },
    ui: {
      modal: {
        close: 'Fermer',
      },
      confirm: {
        title: 'Confirmer ?',
        destructive: 'Cette action est difficile à annuler.',
      },
      toast: {
        success: 'Enregistré',
        error: 'Erreur',
        warning: 'Attention',
        info: 'Info',
      },
      fab: {
        addShift: 'Ajout rapide de quart',
        endShift: 'Terminer le quart',
      },
      drawer: {
        close: 'Fermer',
      },
      progressRing: {
        label: 'Progrès',
      },
      skeleton: {
        loading: 'Chargement',
      },
      emptyState: {
        defaultTitle: 'Rien pour l’instant',
        defaultMessage: 'Ajoutez un élément ou modifiez les filtres.',
      },
      keypad: {
        confirm: 'OK',
      },
    },
  },
};

/**
 * @param {string} key dot notation, e.g. `shifts.addShift`
 * @param {'en'|'fr'} [lang='en']
 * @returns {string} never `undefined`; missing keys fall back to English then to `key`
 */
export function t(key, lang = 'en') {
  const parts = String(key).split('.').filter(Boolean);
  const walk = (root) => {
    let cur = root;
    for (const p of parts) {
      if (cur == null || typeof cur !== 'object') return null;
      cur = cur[p];
    }
    return typeof cur === 'string' ? cur : null;
  };
  const primary = walk(strings[lang] || strings.en);
  if (primary != null) return primary;
  if (lang !== 'en') {
    const fallback = walk(strings.en);
    if (fallback != null) return fallback;
  }
  return String(key);
}
