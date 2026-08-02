export const ROLES = {
  SUPER_ADMIN:         "SUPER_ADMIN",
  ADMIN:               "ADMIN",
  EDITOR:              "EDITOR",
  AUTHOR:              "AUTHOR",
  CONTRIBUTOR:         "CONTRIBUTOR",
  VIEWER:              "VIEWER",
  EVENT_MANAGER:       "EVENT_MANAGER",
  MEDIA_OFFICE:        "MEDIA_OFFICE",
  SUPERVISOR:          "SUPERVISOR",
  ASSISTANT:           "ASSISTANT",
  STUDIES:             "STUDIES",
  AUDITOR:             "AUDITOR",
  STUDIES_ASSESSOR:    "STUDIES_ASSESSOR",
  STUDIES_HEAD:        "STUDIES_HEAD",
  LEGAL_DIRECTOR:      "LEGAL_DIRECTOR",
  DEPUTY_MINISTER:     "DEPUTY_MINISTER",
  LICENSING_OFFICER:   "LICENSING_OFFICER",
  LICENSING_COMMITTEE: "LICENSING_COMMITTEE",
  FINANCE:             "FINANCE",
  DIRECTORATE:         "DIRECTORATE",
};

export const ROLE_LABELS = {
  ar: {
    SUPER_ADMIN:         "مدير النظام الأعلى",
    ADMIN:               "مدير",
    EDITOR:              "محرر",
    AUTHOR:              "كاتب",
    CONTRIBUTOR:         "مساهم",
    VIEWER:              "مشاهد",
    EVENT_MANAGER:       "مدير الفعاليات",
    MEDIA_OFFICE:        "المكتب الإعلامي",
    SUPERVISOR:          "مشرف عام",
    ASSISTANT:           "معاون",
    STUDIES:             "قسم الدراسات",
    AUDITOR:             "مدقق الخطوات",
    STUDIES_ASSESSOR:    "قسم الدراسة (الدارس)",
    STUDIES_HEAD:        "رئيس قسم الدراسة",
    LEGAL_DIRECTOR:      "مدير الشؤون القانونية",
    DEPUTY_MINISTER:     "معاون الوزير",
    LICENSING_OFFICER:   "\u0645\u0648\u0638\u0641 \u0627\u0644\u062a\u0631\u0627\u062e\u064a\u0635",
    LICENSING_COMMITTEE: "\u0644\u062c\u0646\u0629 \u0627\u0644\u062a\u0631\u0627\u062e\u064a\u0635",
    FINANCE:             "المالية",
    DIRECTORATE:         "مديرية",
  },
  en: {
    SUPER_ADMIN:         "Super Admin",
    ADMIN:               "Admin",
    EDITOR:              "Editor",
    AUTHOR:              "Author",
    CONTRIBUTOR:         "Contributor",
    VIEWER:              "Viewer",
    EVENT_MANAGER:       "Event Manager",
    MEDIA_OFFICE:        "Media Office",
    SUPERVISOR:          "General Supervisor",
    ASSISTANT:           "Assistant Minister",
    STUDIES:             "Studies Department",
    AUDITOR:             "Step Auditor",
    STUDIES_ASSESSOR:    "Studies Assessor",
    STUDIES_HEAD:        "Head of Studies",
    LEGAL_DIRECTOR:      "Legal Director",
    DEPUTY_MINISTER:     "Deputy Minister",
    LICENSING_OFFICER:   "Licensing Officer",
    LICENSING_COMMITTEE: "Licensing Committee",
    FINANCE:             "Finance",
    DIRECTORATE:         "Directorate",
  },
};

const ROLE_HIERARCHY = {
  SUPER_ADMIN:         6,
  ADMIN:               5,
  EDITOR:              4,
  AUTHOR:              3,
  CONTRIBUTOR:         2,
  VIEWER:              1,
  EVENT_MANAGER:       2, // same level as Contributor
  MEDIA_OFFICE:        3, // same level as Author/Contributor
  STUDIES_ASSESSOR:    3,
  STUDIES_HEAD:        4,
  LEGAL_DIRECTOR:      5,
  DEPUTY_MINISTER:     5,
  LICENSING_OFFICER:   3,
  LICENSING_COMMITTEE: 4,
  FINANCE:             3,
  DIRECTORATE:         2, // event contributor — same level as Contributor
};

export function hasRole(userRole, requiredRole) {
  return (ROLE_HIERARCHY[userRole] ?? 0) >= (ROLE_HIERARCHY[requiredRole] ?? 0);
}

export const PERMISSIONS = {
  // Posts
  CREATE_POST: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.EDITOR, ROLES.AUTHOR, ROLES.CONTRIBUTOR, ROLES.MEDIA_OFFICE],
  VIEW_ANY_POST: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.EDITOR, ROLES.MEDIA_OFFICE],
  EDIT_OWN_POST: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.EDITOR, ROLES.AUTHOR, ROLES.CONTRIBUTOR, ROLES.MEDIA_OFFICE],
  EDIT_ANY_POST: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.EDITOR],
  PUBLISH_POST: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.EDITOR, ROLES.MEDIA_OFFICE],
  DELETE_OWN_POST: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.EDITOR, ROLES.AUTHOR, ROLES.MEDIA_OFFICE],
  DELETE_ANY_POST: [ROLES.SUPER_ADMIN, ROLES.ADMIN],

  // Achievements (PostType.ACHIEVEMENT) — a narrower slice of CREATE_POST.
  // Everyone who can create regular posts can also document achievements.
  CREATE_ACHIEVEMENT: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.EDITOR, ROLES.AUTHOR, ROLES.CONTRIBUTOR, ROLES.MEDIA_OFFICE],

  // Events
  // CREATE_EVENT also gates access to the Events list/new pages.
  CREATE_EVENT: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.EDITOR, ROLES.EVENT_MANAGER, ROLES.DIRECTORATE],
  // PUBLISH_EVENT: a creator's own events go live (APPROVED) immediately instead
  // of entering the review queue. The DIRECTORATE role now self-publishes to the
  // cultural calendar; EDITOR still routes its events through review.
  PUBLISH_EVENT: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.EVENT_MANAGER, ROLES.DIRECTORATE],
  // VIEW_ANY_EVENT: see the full events list (not just one's own). DIRECTORATE
  // can browse every event but may only act on (edit/delete) its own.
  VIEW_ANY_EVENT: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.EDITOR, ROLES.EVENT_MANAGER, ROLES.DIRECTORATE],
  // EDIT_ANY_EVENT: authority roles may edit every event. EDIT_OWN_EVENT: the
  // DIRECTORATE role may edit only its own events. EDIT_EVENT is the union used
  // for table/menu gating (does this role edit events at all).
  EDIT_ANY_EVENT: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.EDITOR, ROLES.EVENT_MANAGER],
  EDIT_OWN_EVENT: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.EDITOR, ROLES.EVENT_MANAGER, ROLES.DIRECTORATE],
  EDIT_EVENT:   [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.EDITOR, ROLES.EVENT_MANAGER, ROLES.DIRECTORATE],
  // DELETE_ANY_EVENT: delete any event. DELETE_OWN_EVENT: the DIRECTORATE role
  // may delete only the events it created.
  DELETE_ANY_EVENT: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.EVENT_MANAGER],
  DELETE_OWN_EVENT: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.EVENT_MANAGER, ROLES.DIRECTORATE],
  // REVIEW_EVENT: the festivals & events directorate (+ admins) approve/reject
  // events that still route through review (e.g. EDITOR-created submissions).
  REVIEW_EVENT: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.EVENT_MANAGER],
  MANAGE_EVENT_TAXONOMIES: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.EDITOR, ROLES.EVENT_MANAGER],

  // Media
  UPLOAD_MEDIA: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.EDITOR, ROLES.AUTHOR, ROLES.EVENT_MANAGER, ROLES.MEDIA_OFFICE, ROLES.DIRECTORATE],
  DELETE_MEDIA: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.EDITOR],

  // Users
  VIEW_USERS: [ROLES.SUPER_ADMIN, ROLES.ADMIN],
  CREATE_USER: [ROLES.SUPER_ADMIN, ROLES.ADMIN],
  EDIT_USER: [ROLES.SUPER_ADMIN, ROLES.ADMIN],
  DELETE_USER: [ROLES.SUPER_ADMIN],
  CHANGE_ROLE: [ROLES.SUPER_ADMIN],
  // Forcing another user's password is as sensitive as changing their role —
  // restricted to SUPER_ADMIN by default, same tier as CHANGE_ROLE/DELETE_USER.
  RESET_USER_PASSWORD: [ROLES.SUPER_ADMIN],

  // Categories
  MANAGE_CATEGORIES: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.EDITOR, ROLES.MEDIA_OFFICE],

  // Settings
  VIEW_SETTINGS: [ROLES.SUPER_ADMIN, ROLES.ADMIN],
  EDIT_SETTINGS: [ROLES.SUPER_ADMIN],

  // Security — viewing the append-only audit trail (privilege/role changes,
  // forced password resets, etc.) is as sensitive as performing those actions,
  // so it's scoped to the same tier that can actually trigger them.
  VIEW_AUDIT_LOG: [ROLES.SUPER_ADMIN, ROLES.ADMIN],

  // Submissions
  VIEW_SUBMISSIONS:   [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.EDITOR, ROLES.EVENT_MANAGER, ROLES.STUDIES_ASSESSOR, ROLES.STUDIES_HEAD, ROLES.LEGAL_DIRECTOR, ROLES.DEPUTY_MINISTER, ROLES.FINANCE],
  MANAGE_SUBMISSIONS: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.EVENT_MANAGER, ROLES.STUDIES_ASSESSOR, ROLES.STUDIES_HEAD, ROLES.LEGAL_DIRECTOR, ROLES.DEPUTY_MINISTER, ROLES.FINANCE],
  // Permanently deleting a copyright case (incl. all attached citizen PII) is
  // irreversible — restricted to the highest tier only, like DELETE_USER.

  // Legal-license requests are never hard-deleted. Workflow ownership is
  // enforced separately by canTransitionLegalLicense.
  VIEW_LEGAL_LICENSES: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.LICENSING_OFFICER, ROLES.LICENSING_COMMITTEE, ROLES.LEGAL_DIRECTOR, ROLES.DEPUTY_MINISTER],
  MANAGE_LEGAL_LICENSES: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.LICENSING_OFFICER, ROLES.LICENSING_COMMITTEE, ROLES.LEGAL_DIRECTOR, ROLES.DEPUTY_MINISTER],

  DELETE_COPYRIGHT_SUBMISSION: [ROLES.SUPER_ADMIN],

  // Dashboard
  VIEW_DASHBOARD: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.EDITOR, ROLES.AUTHOR, ROLES.CONTRIBUTOR, ROLES.VIEWER, ROLES.EVENT_MANAGER, ROLES.MEDIA_OFFICE, ROLES.STUDIES_ASSESSOR, ROLES.STUDIES_HEAD, ROLES.LEGAL_DIRECTOR, ROLES.DEPUTY_MINISTER, ROLES.LICENSING_OFFICER, ROLES.LICENSING_COMMITTEE, ROLES.FINANCE, ROLES.DIRECTORATE],
};

export function can(userRole, permission) {
  const allowed = PERMISSIONS[permission] ?? [];
  return allowed.includes(userRole);
}
