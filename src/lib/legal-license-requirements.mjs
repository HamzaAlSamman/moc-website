function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const nested of Object.values(value)) deepFreeze(nested);
  return Object.freeze(value);
}

export const LEGAL_LICENSE_SOURCE_DOCUMENTS = deepFreeze({
  "fine-arts": {
    key: "fine-arts",
    kind: "LICENSING_DECISION",
    label: { ar: "قرار ترخيص الفنون التشكيلية", en: "Fine arts licensing decision" },
    publicUrl: "/documents/legal-licenses/fine-arts.pdf",
    sha256: "7cfdb361cff6ee1f7213717ba35fb61397cb5b296c87884679809db6b4de5d0a",
  },
  "cinema-arts": {
    key: "cinema-arts",
    kind: "LICENSING_DECISION",
    label: { ar: "قرار ترخيص الفنون السينمائية", en: "Cinema arts licensing decision" },
    publicUrl: "/documents/legal-licenses/cinema-arts.pdf",
    sha256: "287077acb33e7b3fd31c1ce5a7eb540d4d70a8ec8ccf89608008bc5898f7aca1",
  },
  "heritage-museums": {
    key: "heritage-museums",
    kind: "LICENSING_DECISION",
    label: { ar: "شروط إحداث وإدارة المتاحف التراثية الخاصة", en: "Private heritage museum licensing conditions" },
    publicUrl: "/documents/legal-licenses/heritage-museums.pdf",
    sha256: "0054fd4fe98f79f1581ef967a5d34280afa9f5ec7875ee6f97ee98bfcd4da716",
  },
  "theater-institutes": {
    key: "theater-institutes",
    kind: "LICENSING_DECISION",
    label: { ar: "قرار ترخيص المعاهد المسرحية", en: "Theater institute licensing decision" },
    publicUrl: "/documents/legal-licenses/theater-institutes.pdf",
    sha256: "a858730b3af2c986e1da1515ed8be85a93ca8911e2bf0afd7a2e315ad622a961",
  },
  "music-institutes": {
    key: "music-institutes",
    kind: "LICENSING_DECISION",
    label: { ar: "قرار ترخيص المعاهد الموسيقية", en: "Music institute licensing decision" },
    publicUrl: "/documents/legal-licenses/music-institutes.pdf",
    sha256: "c5dbec938b98dfaeb19522bd2a2727fbbe585179868f8340b77755179ba64337",
  },
  "fine-arts-galleries": {
    key: "fine-arts-galleries",
    kind: "LICENSING_DECISION",
    label: { ar: "شروط ترخيص صالات عرض الفنون التشكيلية الخاصة", en: "Private fine arts gallery licensing conditions" },
    publicUrl: "/documents/legal-licenses/fine-arts-galleries.pdf",
    sha256: "9b8b33fcfdeb65ffd173322f411e1687d7dafc30c5c0dfec8215b9d468c68dad",
  },
  "model-cultural-bylaws": {
    key: "model-cultural-bylaws",
    kind: "MODEL_BYLAWS",
    label: { ar: "النظام النموذجي الاسترشادي", en: "Model cultural bylaws" },
    publicUrl: "/documents/legal-licenses/model-cultural-bylaws.pdf",
    sha256: "64953e7893799b69027f81c9ce171a23aa6ecf55199ecea39f7477b8319a52e0",
  },
});

export const LEGAL_LICENSE_REQUIREMENT_CATEGORIES = deepFreeze({
  ELIGIBILITY: "ELIGIBILITY",
  APPLICANT: "APPLICANT",
  PREMISES: "PREMISES",
  EQUIPMENT: "EQUIPMENT",
  EVIDENCE: "EVIDENCE",
  BYLAWS: "BYLAWS",
  POST_LICENSE: "POST_LICENSE",
});

const QUESTION_GROUP_BY_CATEGORY = Object.freeze({
  ELIGIBILITY: "eligibility",
  APPLICANT: "applicant",
  PREMISES: "premises",
  EQUIPMENT: "equipment",
  EVIDENCE: "evidence",
  BYLAWS: "bylawQuestions",
  POST_LICENSE: "postLicenseDeclarations",
});

function requirement({ key, category, label, help, source, answerType = "BOOLEAN", blocking = true }) {
  return deepFreeze({ key, category, answerType, blocking, label, help, source });
}

function createProfile({
  licenseType,
  sourceDocuments = [],
  attachmentKinds,
  generatesBylaws = false,
  pendingOfficialGuidance = false,
  requirements = [],
}) {
  const groups = Object.fromEntries(
    Object.values(QUESTION_GROUP_BY_CATEGORY).map((group) => [group, []]),
  );
  for (const item of requirements) groups[QUESTION_GROUP_BY_CATEGORY[item.category]].push(item);

  return deepFreeze({
    licenseType,
    sourceDocuments: [...sourceDocuments],
    attachmentKinds: [...attachmentKinds],
    generatesBylaws,
    pendingOfficialGuidance,
    gated: pendingOfficialGuidance,
    templateVersion: "guided-v1",
    requirements: [...requirements],
    ...groups,
  });
}

const fineArtsBathroomRequirement = requirement({
  key: "fine_arts.building.suitable_bathrooms",
  category: LEGAL_LICENSE_REQUIREMENT_CATEGORIES.PREMISES,
  label: {
    ar: "هل تتوفر حمامات ملائمة للاستخدام؟",
    en: "Are suitable bathrooms available?",
  },
  help: {
    ar: "تشترط المادة 14/2 وجود حمامات ملائمة للاستخدام.",
    en: "Article 14(2) requires bathrooms that are suitable for use.",
  },
  source: { document: "fine-arts", article: "المادة 14/2" },
});

const cinemaSafetyRequirement = requirement({
  key: "cinema.building.safety_systems",
  category: LEGAL_LICENSE_REQUIREMENT_CATEGORIES.PREMISES,
  label: {
    ar: "هل تتوفر أنظمة السلامة والحماية؟",
    en: "Are safety and protection systems available?",
  },
  help: {
    ar: "تشترط المادة 14/4 توفر أنظمة السلامة والحماية.",
    en: "Article 14(4) requires safety and protection systems.",
  },
  source: { document: "cinema-arts", article: "المادة 14/4" },
});

const museumInventoryRequirement = requirement({
  key: "museum.collection.inventory",
  category: LEGAL_LICENSE_REQUIREMENT_CATEGORIES.EVIDENCE,
  label: {
    ar: "هل أُعد كشف بممتلكات التراث الثقافي المراد عرضها؟",
    en: "Has an inventory of the cultural heritage holdings intended for display been prepared?",
  },
  help: {
    ar: "تطلب المادة 2/6 كشفاً بممتلكات التراث الثقافي المراد عرضها.",
    en: "Article 2(6) requests an inventory of the cultural heritage holdings intended for display.",
  },
  source: { document: "heritage-museums", article: "المادة 2/6" },
});

const musicSoundproofRequirement = requirement({
  key: "music.building.soundproof_rooms",
  category: LEGAL_LICENSE_REQUIREMENT_CATEGORIES.PREMISES,
  label: {
    ar: "هل غرف العزف معزولة؟",
    en: "Are the practice rooms sound-insulated?",
  },
  help: {
    ar: "تشترط المادة 14/5 أن تكون غرف العزف معزولة.",
    en: "Article 14(5) requires the practice rooms to be sound-insulated.",
  },
  source: { document: "music-institutes", article: "المادة 14/5" },
});

const theaterSoundproofRequirement = requirement({
  key: "theater.building.soundproof_rooms",
  category: LEGAL_LICENSE_REQUIREMENT_CATEGORIES.PREMISES,
  label: {
    ar: "هل جميع غرف المعهد معزولة؟",
    en: "Are all institute rooms insulated?",
  },
  help: {
    ar: "تشترط المادة 12/5 أن تكون جميع الغرف معزولة.",
    en: "Article 12(5) requires all rooms to be insulated.",
  },
  source: { document: "theater-institutes", article: "المادة 12/5" },
});

const galleryMembershipOrManagerRequirement = requirement({
  key: "gallery.applicant.union_member_or_manager_contract",
  category: LEGAL_LICENSE_REQUIREMENT_CATEGORIES.ELIGIBILITY,
  label: {
    ar: "هل مقدم الطلب عضو مسجل في اتحاد الفنانين التشكيليين السوريين ومن غير العاملين في الدولة، أو -إذا لم يكن عضواً- أرفق عقداً مع فنان عضو لإدارة الصالة؟",
    en: "Is the applicant a registered member of the Syrian Fine Artists Union and not a state employee, or, if not a member, is there a contract with a member artist to manage the gallery?",
  },
  help: {
    ar: "تحدد المادة 3/2-3 شرط العضوية مع عدم العمل لدى الدولة، أو -لغير العضو- إرفاق عقد مع فنان عضو لإدارة الصالة.",
    en: "Article 3(2-3) provides for applicant membership with no state employment or, for a non-member, a management contract with a member artist.",
  },
  source: { document: "fine-arts-galleries", article: "المادة 3/2-3" },
});

export const LEGAL_LICENSE_REQUIREMENT_PROFILES = deepFreeze({
  CULTURAL_FORUM: createProfile({
    licenseType: "CULTURAL_FORUM",
    sourceDocuments: ["model-cultural-bylaws"],
    attachmentKinds: ["FOUNDERS_MINUTES", "ACTIVITY_PLAN"],
    generatesBylaws: true,
    pendingOfficialGuidance: true,
  }),
  CULTURAL_HOUSE: createProfile({
    licenseType: "CULTURAL_HOUSE",
    sourceDocuments: ["model-cultural-bylaws"],
    attachmentKinds: ["OWNERSHIP_OR_LEASE", "FLOOR_PLAN", "SAFETY_APPROVAL"],
    generatesBylaws: true,
    pendingOfficialGuidance: true,
  }),
  CULTURAL_ASSOCIATION: createProfile({
    licenseType: "CULTURAL_ASSOCIATION",
    sourceDocuments: ["model-cultural-bylaws"],
    attachmentKinds: ["ARTICLES_OF_ASSOCIATION", "FOUNDERS_MINUTES"],
    generatesBylaws: true,
    pendingOfficialGuidance: true,
  }),
  AMATEUR_TROUPE: createProfile({
    licenseType: "AMATEUR_TROUPE",
    attachmentKinds: ["MEMBERS_LIST", "ARTISTIC_PROGRAM"],
    pendingOfficialGuidance: true,
  }),
  CINEMA_ARTS: createProfile({
    licenseType: "CINEMA_ARTS",
    sourceDocuments: ["cinema-arts"],
    attachmentKinds: ["PROFESSIONAL_CERTIFICATE", "EQUIPMENT_LIST"],
    requirements: [cinemaSafetyRequirement],
  }),
  FINE_ARTS: createProfile({
    licenseType: "FINE_ARTS",
    sourceDocuments: ["fine-arts"],
    attachmentKinds: ["PROFESSIONAL_CERTIFICATE", "ARTWORK_PORTFOLIO"],
    requirements: [fineArtsBathroomRequirement],
  }),
  HERITAGE_MUSEUM: createProfile({
    licenseType: "HERITAGE_MUSEUM",
    sourceDocuments: ["heritage-museums"],
    attachmentKinds: ["OWNERSHIP_OR_LEASE", "COLLECTION_INVENTORY", "COLLECTION_PROVENANCE", "FLOOR_PLAN", "SAFETY_APPROVAL"],
    requirements: [museumInventoryRequirement],
  }),
  MUSIC_INSTITUTE: createProfile({
    licenseType: "MUSIC_INSTITUTE",
    sourceDocuments: ["music-institutes"],
    attachmentKinds: ["OWNERSHIP_OR_LEASE", "FLOOR_PLAN", "SAFETY_APPROVAL", "ACADEMIC_QUALIFICATION", "PROGRAM_AND_CURRICULUM", "EQUIPMENT_LIST"],
    requirements: [musicSoundproofRequirement],
  }),
  THEATER_INSTITUTE: createProfile({
    licenseType: "THEATER_INSTITUTE",
    sourceDocuments: ["theater-institutes"],
    attachmentKinds: ["OWNERSHIP_OR_LEASE", "FLOOR_PLAN", "SAFETY_APPROVAL", "ACADEMIC_QUALIFICATION", "PROGRAM_AND_CURRICULUM", "EQUIPMENT_LIST"],
    requirements: [theaterSoundproofRequirement],
  }),
  FINE_ARTS_GALLERY: createProfile({
    licenseType: "FINE_ARTS_GALLERY",
    sourceDocuments: ["fine-arts-galleries"],
    attachmentKinds: ["OWNERSHIP_OR_LEASE", "FLOOR_PLAN", "SAFETY_APPROVAL", "GALLERY_PROGRAM"],
    requirements: [galleryMembershipOrManagerRequirement],
  }),
});

const EMPTY_REQUIREMENTS = Object.freeze([]);

export function getLegalLicenseRequirementProfile(licenseType) {
  return LEGAL_LICENSE_REQUIREMENT_PROFILES[licenseType] ?? null;
}

export function getApplicableLegalLicenseRequirements(licenseType, context = {}) {
  const profile = getLegalLicenseRequirementProfile(licenseType);
  if (!profile) return EMPTY_REQUIREMENTS;
  const applicable = profile.requirements.filter((item) => {
    if (!item.appliesWhen) return true;
    return Object.entries(item.appliesWhen).every(([key, value]) => context[key] === value);
  });
  return Object.freeze(applicable);
}

export function legalLicenseRequiresBylaws(licenseType) {
  return getLegalLicenseRequirementProfile(licenseType)?.generatesBylaws === true;
}
