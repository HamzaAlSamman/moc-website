"use client";

import React, { useState, useEffect, use } from "react";
import Image from "next/image";
import Link from "next/link";
import DecorativeCorners from "../../../../components/DecorativeCorners";
import ApexDateTimePicker from "../../../../components/ApexDateTimePicker";
import SubpageHero from "../../../../components/SubpageHero";

const GOALS = [
  { id: "cultural",  ar: "ثقافي", en: "Cultural" },
  { id: "youth",     ar: "شبابي", en: "Youth-oriented" },
  { id: "heritage",  ar: "تراثي", en: "Heritage" },
  { id: "education", ar: "تعليمي / تدريبي", en: "Educational / Training" },
  { id: "community", ar: "مجتمعي", en: "Community" },
  { id: "leisure",   ar: "ترفيهي هادف", en: "Purposeful Entertainment" },
  { id: "capacity",  ar: "تمكين وبناء قدرات", en: "Capacity Building / Empowerment" },
];

const ENTITY_TYPES = [
  { value: "DIRECTORATE", ar: "مديرية", en: "Directorate" },
  { value: "GOVERNMENT",  ar: "جهة حكومية", en: "Government Entity" },
  { value: "EXTERNAL",    ar: "جهة خارجية / أهلية / فنية", en: "External / NGO / Artistic Entity" },
  { value: "INDIVIDUAL",  ar: "فرد / مثقف مستقل", en: "Individual / Independent Intellectual" },
];

const GOVERNORATES_FORM = [
  { ar: "دمشق", en: "Damascus" },
  { ar: "ريف دمشق", en: "Rif Dimashq" },
  { ar: "حلب", en: "Aleppo" },
  { ar: "حمص", en: "Homs" },
  { ar: "حماة", en: "Hama" },
  { ar: "اللاذقية", en: "Latakia" },
  { ar: "طرطوس", en: "Tartus" },
  { ar: "السويداء", en: "As-Suwayda" },
  { ar: "درعا", en: "Daraa" },
  { ar: "إدلب", en: "Idlib" },
  { ar: "دير الزور", en: "Deir ez-Zor" },
  { ar: "الرقة", en: "Ar-Raqqah" },
  { ar: "الحسكة", en: "Al-Hasakah" },
  { ar: "القنيطرة", en: "Quneitra" },
];

const TERMS_AR = [
  "الالتزام بكافة المعايير الثقافية والاجتماعية المعتمدة في وزارة الثقافة.",
  "تنفيذ الفعالية وفق النموذج الموافق عليه دون تعديل جوهري إلا بعد الحصول على موافقة رسمية.",
  "احترام الأنظمة والقوانين النافذة في الجمهورية العربية السورية.",
  "التعاون الكامل مع مديرية إدارة الفعاليات والمهرجانات وجميع المديريات الشريكة.",
  "عدم المباشرة بالتنفيذ إلا بعد صدور الموافقات الرسمية.",
  "احترام خصوصية المجتمع خلال الفعالية في جميع أشكال المحتوى.",
  "تقديم محتوى يعكس التعددية الثقافية والفكرية ويعزز الحوار والتسامح.",
  "تنفيذ الفعالية وفق الخطة المعتمدة زمنياً وتنظيمياً والالتزام بتعليمات السلامة العامة.",
];

const TERMS_EN = [
  "Compliance with all cultural and social standards approved by the Ministry of Culture.",
  "Implementing the event according to the approved model without material changes unless official approval is obtained.",
  "Respecting the laws and regulations in force in the Syrian Arab Republic.",
  "Full cooperation with the Directorate of Events and Festivals Management and all partner directorates.",
  "Not starting execution until official approvals are issued.",
  "Respecting the privacy of the community during the event, in all forms of content.",
  "Providing content that reflects cultural and intellectual diversity and promotes dialogue and tolerance.",
  "Implementing the event according to the approved time and organizational plan and complying with public safety instructions.",
];

const T = {
  ar: {
    metaTitle: "مديرية إدارة الفعاليات والمهرجانات – وزارة الثقافة السورية",
    title: "الاستمارة الرسمية لطلب إقامة فعالية",
    subtitle: "تتيح وزارة الثقافة للمواطنين تقديم طلب إقامة فعالياتهم لتضاف إلى الروزنامة الثقافية بعد مراجعتها وتدقيقها.",
    step1: "الشروط والضوابط",
    step2: "استمارة التقديم",
    termsTitle: "شروط وضوابط تنفيذ الفعاليات الثقافية",
    termsSubtitle: "يجب قراءة الشروط والموافقة عليها قبل التقديم",
    republic: "الجمهورية العربية السورية – وزارة الثقافة",
    entityTitle: "مديرية إدارة الفعاليات والمهرجانات",
    generalTerms: "أولاً: الالتزام العام",
    culturalCriteria: "ثانياً: المعايير الثقافية",
    criteriaList: [
      { title: "المعيار الاجتماعي", desc: "احترام الخصوصية الاجتماعية والقيم العامة وضمان بيئة مناسبة لجميع فئات المجتمع في جميع أشكال المحتوى المقدم خلال الفعالية." },
      { title: "معيار التنوع الثقافي والفكري", desc: "تقديم محتوى يعكس التعددية باحترام وعدم الترويج لأي خطاب طائفي أو مناطقي أو تمييزي." },
      { title: "معيار السلم الأهلي", desc: "تقديم محتوى يعزز الحوار والتسامح والتعايش وتجنب أي طرح قد يثير الانقسام أو الحساسية المجتمعية." },
      { title: "معيار السلوك المجتمعي والأخلاقي", desc: "الحفاظ على النظام العام داخل الفعالية وضمان سلوك حضاري للحضور والمحافظة على نظافة المكان." },
    ],
    termsNote: "لا يعتبر هذا الطلب بأي شكل من الأشكال بمثابة موافقة الوزارة على هذه الفعالية حيث يتم تزويد الفعاليات الموافق عليها بخطاب رسمي للقيام بها.",
    agreeButton: "لقد قرأت الشروط وأوافق عليها",
    section1Title: "بيانات مقدم الطلب",
    applicantNameLabel: "اسم مقدم الطلب",
    applicantNamePlaceholder: "الاسم الكامل",
    directorateLabel: "المديرية / الجهة التابع لها",
    directoratePlaceholder: "مثال: مديرية ثقافة دمشق",
    phoneLabel: "رقم الهاتف",
    phonePlaceholder: "09xxxxxxxx",
    emailLabel: "البريد الإلكتروني",
    emailPlaceholder: "example@email.com",
    section2Title: "معلومات الفعالية والجهة المقترحة",
    eventNameLabel: "اسم الفعالية",
    eventNamePlaceholder: "اسم الفعالية المقترحة",
    entityTypeLabel: "الجهة المقترحة",
    entityNameLabel: "اسم الجهة",
    entityNamePlaceholder: "يرجى تحديد اسم الجهة",
    descriptionLabel: "وصف الفعالية (مختصر)",
    descriptionPlaceholder: "وصف موجز لمحتوى الفعالية وطبيعتها...",
    section3Title: "هدف الفعالية والأثر المتوقع",
    goalsLabel: "هدف الفعالية (يمكن اختيار أكثر من هدف)",
    goalsOtherLabel: "غير ذلك",
    goalsOtherPlaceholder: "يرجى التحديد...",
    expectedImpactLabel: "الأثر المتوقع من الفعالية",
    expectedImpactHint: "مثال: رفع الوعي الثقافي – تعزيز الهوية – إشراك الشباب – تنشيط المجتمع – دعم المواهب",
    expectedImpactPlaceholder: "الأثر المتوقع من الفعالية على المجتمع...",
    targetAudienceLabel: "الفئة المستهدفة",
    targetAudiencePlaceholder: "مثال: الشباب، الأطفال، المثقفون، عموم الجمهور...",
    section4Title: "الزمان والمكان",

    proposedDateLabel: "الزمان المقترح",
    proposedDatePlaceholder: "تحديد تاريخ ووقت الفعالية المقترح...",
    section5Title: "نوع الفعالية واستدامتها",
    eventTypeLabel: "نوع الفعالية",
    eventTypeCentral: "مركزية (بإشراف مديرية إدارة الفعاليات والمهرجانات)",
    eventTypeJoint: "مشتركة (مع مديريات / جهات أخرى)",
    isSustainableLabel: "استدامة الفعالية",
    isSustainableYes: "فعالية مستدامة (قابلة للتكرار / برنامج طويل الأمد)",
    isSustainableNo: "فعالية لمرة واحدة",
    sustainabilityNoteLabel: "توضيح آلية الاستدامة",
    sustainabilityNotePlaceholder: "يرجى التوضيح...",
    section6Title: "الخدمات والتسهيلات المطلوبة",
    additionalNotesLabel: "ما هي الخدمات أو التسهيلات التي ترجو الحصول عليها من وزارة الثقافة؟",
    additionalNotesPlaceholder: "حدد الخدمات أو التسهيلات المطلوبة من وزارة الثقافة لإقامة الفعالية...",
    governorateLabel: "المحافظة",
    governoratePlaceholder: "— اختر المحافظة —",
    culturalCenterLabel: "المكان",
    culturalCenterPlaceholder: "— اختر المكان —",
    culturalCenterHint: "اختر المحافظة أولاً لعرض الأماكن المتاحة",
    pledgeTextBeforeName: "أنا الموقع أدناه، ",
    pledgeTextAfterName: "، لقد قرأت ووافقت على شروط وضوابط ومعايير تنفيذ الفعاليات الثقافية الصادرة عن وزارة الثقافة السورية، وأتعهد بالالتزام الكامل بها وتحمل المسؤولية الكاملة عن تنفيذ الفعالية وفقاً لها.",
    backToTerms: "← العودة لمراجعة الشروط",
    submitButton: "تقديم الطلب الرسمي",
    submittingText: "جاري إرسال الطلب...",
    successTitle: "تم إرسال طلبك بنجاح",
    successSubtitle: "شكراً لك على تقديم طلب إقامة الفعالية. سيقوم فريق مديرية إدارة الفعاليات والمهرجانات في وزارة الثقافة بمراجعة طلبك والتواصل معك في أقرب وقت ممكن.",
    nextStepsTitle: "ما الذي يحدث الآن؟",
    nextStepsList: [
      "ستتلقى رد من مديرية إدارة الفعاليات والمهرجانات خلال الفترة المحددة.",
      "سيتم دراسة طلبك وفق معايير وزارة الثقافة.",
      "في حال الموافقة المبدئية، سيتم التواصل معك لاستكمال الإجراءات.",
    ],
    backToCalendar: "العودة إلى الروزنامة الثقافية",
    submitAnother: "تقديم طلب آخر",
    validationApplicantName: "الرجاء إدخال اسم مقدم الطلب.",
    validationEventName: "الرجاء إدخال اسم الفعالية.",
    validationDescription: "الرجاء إدخال وصف الفعالية.",
    validationPhone: "الرجاء إدخال رقم الهاتف.",
    validationEmail: "الرجاء إدخال البريد الإلكتروني.",
    errorMessage: "حدث خطأ. يرجى المحاولة مرة أخرى.",
    connectionErrorMessage: "فشل الاتصال بالخادم. يرجى المحاولة لاحقاً."
  },
  en: {
    metaTitle: "Directorate of Events and Festivals Management – Syrian Ministry of Culture",
    title: "Official Event Hosting Request Form",
    subtitle: "The Ministry of Culture invites citizens to propose their events to be added to the cultural calendar after review and verification.",
    step1: "Terms & Conditions",
    step2: "Submission Form",
    termsTitle: "Terms & Conditions for Cultural Events Execution",
    termsSubtitle: "You must read and agree to the terms before submitting",
    republic: "Syrian Arab Republic – Ministry of Culture",
    entityTitle: "Directorate of Events and Festivals Management",
    generalTerms: "First: General Commitment",
    culturalCriteria: "Second: Cultural Criteria",
    criteriaList: [
      { title: "Social Criterion", desc: "Respecting social privacy and general values, and ensuring a suitable environment for all segments of society, in all forms of content presented during the event." },
      { title: "Cultural & Intellectual Diversity", desc: "Providing content that respects pluralism and avoids promoting any sectarian, regional, or discriminatory discourse." },
      { title: "Civil Peace Criterion", desc: "Providing content that enhances dialogue, tolerance, and coexistence, avoiding any topic that might stir division or social sensitivity." },
      { title: "Social & Ethical Behavior", desc: "Maintaining public order within the event, ensuring civilized behavior of the audience, and preserving clean venue spaces." },
    ],
    termsNote: "This request does not, in any way, constitute the Ministry's approval of this event, as approved events are provided with an official letter to proceed.",
    agreeButton: "I have read the terms and agree to them",
    section1Title: "Applicant Details",
    applicantNameLabel: "Applicant Name",
    applicantNamePlaceholder: "Full Name",
    directorateLabel: "Affiliated Directorate / Entity",
    directoratePlaceholder: "Example: Damascus Culture Directorate",
    phoneLabel: "Phone Number",
    phonePlaceholder: "09xxxxxxxx",
    emailLabel: "Email Address",
    emailPlaceholder: "example@email.com",
    section2Title: "Event Details & Proposing Entity",
    eventNameLabel: "Event Name",
    eventNamePlaceholder: "Proposed Event Name",
    entityTypeLabel: "Proposing Entity Type",
    entityNameLabel: "Entity Name",
    entityNamePlaceholder: "Please specify the entity name",
    descriptionLabel: "Event Description (Brief)",
    descriptionPlaceholder: "Brief description of the event's content and nature...",
    section3Title: "Event Goal & Expected Impact",
    goalsLabel: "Event Goal (Multiple options can be selected)",
    goalsOtherLabel: "Other",
    goalsOtherPlaceholder: "Please specify...",
    expectedImpactLabel: "Expected Impact of the Event",
    expectedImpactHint: "Example: Raising cultural awareness – Enhancing identity – Engaging youth – Energizing community – Supporting talents",
    expectedImpactPlaceholder: "Expected impact of the event on the community...",
    targetAudienceLabel: "Target Audience",
    targetAudiencePlaceholder: "Example: Youth, children, intellectuals, general public...",
    section4Title: "Time & Place",

    proposedDateLabel: "Proposed Time",
    proposedDatePlaceholder: "Select the proposed date and time of the event...",
    section5Title: "Event Type & Sustainability",
    eventTypeLabel: "Event Type",
    eventTypeCentral: "Central (supervised by the Directorate of Events and Festivals Management)",
    eventTypeJoint: "Joint (with other directorates / entities)",
    isSustainableLabel: "Event Sustainability",
    isSustainableYes: "Sustainable event (repeatable / long-term program)",
    isSustainableNo: "One-off event",
    sustainabilityNoteLabel: "Clarify Sustainability Mechanism",
    sustainabilityNotePlaceholder: "Please explain...",
    section6Title: "Requested Services & Facilities",
    additionalNotesLabel: "What services or facilities do you hope to obtain from the Ministry of Culture?",
    additionalNotesPlaceholder: "Please specify the services or facilities you hope to obtain from the Ministry...",
    governorateLabel: "Governorate",
    governoratePlaceholder: "— Select Governorate —",
    culturalCenterLabel: "Venue",
    culturalCenterPlaceholder: "— Select Venue —",
    culturalCenterHint: "Select a governorate first to see available venues",
    pledgeTextBeforeName: "I, the undersigned, ",
    pledgeTextAfterName: ", have read and agreed to the terms, controls, and criteria for executing cultural events issued by the Syrian Ministry of Culture, and I pledge full compliance and bear complete responsibility for executing the event accordingly.",
    backToTerms: "← Back to Review Terms",
    submitButton: "Submit Official Proposal",
    submittingText: "Submitting Proposal...",
    successTitle: "Your Request Has Been Submitted Successfully",
    successSubtitle: "Thank you for submitting your event proposal. The Events and Festivals Management team at the Ministry of Culture will review your request and contact you as soon as possible.",
    nextStepsTitle: "What happens now?",
    nextStepsList: [
      "You will receive a response from the Directorate of Events and Festivals Management within the specified period.",
      "Your application will be studied according to the standards of the Ministry of Culture.",
      "Upon preliminary approval, you will be contacted to complete the procedures.",
    ],
    backToCalendar: "Back to Cultural Calendar",
    submitAnother: "Submit Another Request",
    validationApplicantName: "Please enter the applicant name.",
    validationEventName: "Please enter the event name.",
    validationDescription: "Please enter the event description.",
    validationPhone: "Please enter your phone number.",
    validationEmail: "Please enter your email address.",
    errorMessage: "An error occurred. Please try again.",
    connectionErrorMessage: "Failed to connect to server. Please try again later."
  }
};

const INITIAL = {
  applicantName: "",
  phone: "",
  email: "",
  eventName: "",
  entityType: "INDIVIDUAL",
  entityName: "",
  description: "",
  goals: [],
  goalsOther: "",
  expectedImpact: "",
  targetAudience: "",
  governorate: "",
  culturalCenterId: "",

  proposedDate: "",
  eventType: "",
  isSustainable: "",
  sustainabilityNote: "",
  additionalNotes: "",
  agreedToTerms: false,
};

function Field({ label, required, children, hint }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-bold text-[#054239] font-qomra">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

const inputCls =
  "w-full border border-slate-200 focus:border-[#b9a779] focus:ring-2 focus:ring-[#b9a779]/20 rounded-xl px-4 py-3 text-sm text-slate-800 outline-none transition bg-white placeholder:text-slate-400";

const textareaCls = inputCls + " resize-none min-h-[120px]";

export default function SubmitEventPage(props) {
  const params = use(props.params);
  const locale = params.locale || "ar";
  const isRtl = locale === "ar";
  const tForm = T[locale] || T.ar;

  const [step, setStep] = useState(1); // 1=terms, 2=form, 3=success
  const [form, setForm] = useState(INITIAL);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [centersGrouped, setCentersGrouped] = useState({});
  const [loadingCenters, setLoadingCenters] = useState(true);

  useEffect(() => {
    fetch("/api/cultural-centers")
      .then((r) => r.json())
      .then((data) => {
        if (data.grouped) setCentersGrouped(data.grouped);
        setLoadingCenters(false);
      })
      .catch(() => setLoadingCenters(false));
  }, []);

  // Scroll to top of the page when changing steps
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  const filteredCenters = form.governorate ? (centersGrouped[form.governorate] || []) : [];

  const entityNameLabelDynamic = (() => {
    if (form.entityType === "DIRECTORATE") {
      return isRtl ? "اسم المديرية" : "Directorate Name";
    }
    if (form.entityType === "GOVERNMENT") {
      return isRtl ? "اسم الجهة الحكومية" : "Government Entity Name";
    }
    return tForm.entityNameLabel;
  })();

  const entityNamePlaceholderDynamic = (() => {
    if (form.entityType === "DIRECTORATE") {
      return isRtl ? "يرجى تحديد اسم المديرية" : "Please specify the directorate name";
    }
    if (form.entityType === "GOVERNMENT") {
      return isRtl ? "يرجى تحديد اسم الجهة الحكومية" : "Please specify the government entity name";
    }
    return tForm.entityNamePlaceholder;
  })();

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function toggleGoal(id) {
    setForm((f) => {
      const nextGoals = f.goals.includes(id) ? f.goals.filter((g) => g !== id) : [...f.goals, id];
      const nextGoalsOther = (id === "other" && f.goals.includes("other")) ? "" : f.goalsOther;
      return { ...f, goals: nextGoals, goalsOther: nextGoalsOther };
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!form.applicantName.trim()) { setError(tForm.validationApplicantName); return; }
    if (!form.phone.trim())         { setError(tForm.validationPhone); return; }
    if (!form.email.trim())         { setError(tForm.validationEmail); return; }
    if (!form.eventName.trim())     { setError(tForm.validationEventName); return; }
    if (!form.description.trim())   { setError(tForm.validationDescription); return; }

    const goals = form.goals.filter((g) => g !== "other");
    if (form.goals.includes("other") && form.goalsOther.trim()) {
      goals.push(`other:${form.goalsOther.trim()}`);
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/event-submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, goals, agreedToTerms: true }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error || tForm.errorMessage);
        return;
      }
      setStep(3);
    } catch {
      setError(tForm.connectionErrorMessage);
    } finally {
      setSubmitting(false);
    }
  }

  const termsList = isRtl ? TERMS_AR : TERMS_EN;

  return (
    <div className="relative flex flex-col w-full min-h-screen bg-[#F8F3EC] pt-[84px] md:pt-[88px] lg:pt-[104px]" dir={isRtl ? "rtl" : "ltr"}>

      {/* ── Hero ── */}
      <SubpageHero
        title={tForm.title}
        subtitle={tForm.metaTitle}
        description={tForm.subtitle}
        isRtl={isRtl}
      >
        {/* Step indicator */}
        {step < 3 && (
          <div className="flex flex-col md:flex-row items-center justify-center gap-3 mt-4">
            {[1, 2].map((s) => (
              <div key={s} className="flex items-center gap-3">
                <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs font-bold transition-all ${
                  step === s
                    ? "bg-[#b9a779] text-[#054239] border-[#b9a779]"
                    : step > s
                      ? "bg-[#1C665A]/30 text-[#b9a779] border-[#1C665A]/40"
                      : "bg-white/10 text-slate-400 border-white/15"
                }`}>
                  <span className={`w-4 h-4 rounded-full number-circle text-[10px] flex items-center justify-center ${
                    step === s ? "bg-[#054239] text-white" : step > s ? "bg-[#b9a779] text-white" : "bg-white/20 text-white/50"
                  }`}>{s}</span>
                  {s === 1 ? tForm.step1 : tForm.step2}
                </div>
                {s < 2 && <div className="hidden md:block w-8 h-px bg-white/20" />}
              </div>
            ))}
          </div>
        )}
      </SubpageHero>

      {/* ── Content ── */}
      <main className="max-w-4xl mx-auto w-full px-4 sm:px-6 py-12 flex-grow relative z-10">

        {/* ═══ STEP 1: Terms ═══ */}
        {step === 1 && (
          <div className="bg-white rounded-3xl border border-[#b9a779]/20 shadow-lg overflow-hidden relative">
            <DecorativeCorners />
            <div className="bg-gradient-to-r from-[#054239] to-[#1C665A] px-8 py-6 text-white text-start">
              <h2 className="text-lg font-extrabold">{tForm.termsTitle}</h2>
              <p className="text-slate-300 text-xs mt-1">{tForm.termsSubtitle}</p>
            </div>
            <div className="p-6 sm:p-8 space-y-6 text-start">
              {/* Official header */}
              <div className="flex items-center gap-4 border border-[#b9a779]/20 rounded-2xl p-4 bg-[#F8F3EC]">
                <div className="relative w-12 h-12 shrink-0">
                  <Image src="/logo.png" alt="logo" fill sizes="48px" className="object-contain" />
                </div>
                <div>
                  <p className="text-xs font-bold text-[#054239]">{tForm.republic}</p>
                  <p className="text-[10px] text-slate-500">{tForm.entityTitle}</p>
                </div>
              </div>

              {/* Terms sections */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-extrabold text-[#054239] mb-3 pb-2 border-b border-slate-100">{tForm.generalTerms}</h3>
                  <ul className="space-y-2">
                    {termsList.map((term, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm text-slate-700">
                        <span className="w-5 h-5 shrink-0 rounded-full number-circle bg-[#b9a779]/15 text-[#b9a779] flex items-center justify-center text-[10px] font-bold mt-0.5">{i + 1}</span>
                        {term}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-[#F8F3EC] border border-[#b9a779]/20 rounded-2xl p-5 space-y-3">
                  <h3 className="text-sm font-extrabold text-[#054239]">{tForm.culturalCriteria}</h3>
                  {tForm.criteriaList.map((item) => (
                    <div key={item.title} className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-[#b9a779] mt-1.5 shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-[#054239]">{item.title}</p>
                        <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-800 leading-relaxed">
                  {tForm.termsNote}
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setStep(2)}
                  className="inline-flex items-center gap-2 bg-[#054239] hover:bg-[#04332b] text-[#b9a779] border border-[#b9a779] font-bold text-sm px-8 py-3.5 rounded-full shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  <span>{tForm.agreeButton}</span>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1 rtl:rotate-0 ltr:rotate-180">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15m0 0l6.75 6.75M4.5 12l6.75-6.75" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ═══ STEP 2: Form ═══ */}
        {step === 2 && (
          <form onSubmit={handleSubmit} className="space-y-8 text-start">

            {/* ── Section 1: Applicant ── */}
            <div className="bg-white rounded-3xl border border-[#b9a779]/20 shadow-sm overflow-hidden relative">
              <DecorativeCorners />
              <div className="bg-[#054239]/5 border-b border-[#b9a779]/15 px-8 sm:px-12 py-5 flex items-center gap-3">
                <span className="w-7 h-7 rounded-full number-circle bg-[#b9a779] text-white text-xs font-black flex items-center justify-center shrink-0">١</span>
                <h2 className="font-extrabold text-[#054239] text-sm font-qomra">{tForm.section1Title}</h2>
              </div>
              <div className="px-8 sm:px-12 pb-8 sm:pb-12 pt-6 grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="sm:col-span-2">
                  <Field label={tForm.applicantNameLabel} required>
                    <input className={inputCls} value={form.applicantName} onChange={(e) => set("applicantName", e.target.value)} placeholder={tForm.applicantNamePlaceholder} />
                  </Field>
                </div>
                <Field label={tForm.phoneLabel} required>
                  <input className={inputCls} type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder={tForm.phonePlaceholder} dir="ltr" />
                </Field>
                <Field label={tForm.emailLabel} required>
                  <input className={inputCls} type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder={tForm.emailPlaceholder} dir="ltr" />
                </Field>
              </div>
            </div>

            {/* ── Section 2: Event Name & Entity ── */}
            <div className="bg-white rounded-3xl border border-[#b9a779]/20 shadow-sm overflow-hidden relative">
              <DecorativeCorners />
              <div className="bg-[#054239]/5 border-b border-[#b9a779]/15 px-8 sm:px-12 py-5 flex items-center gap-3">
                <span className="w-7 h-7 rounded-full number-circle bg-[#b9a779] text-white text-xs font-black flex items-center justify-center shrink-0">٢</span>
                <h2 className="font-extrabold text-[#054239] text-sm font-qomra">{tForm.section2Title}</h2>
              </div>
              <div className="px-8 sm:px-12 pb-8 sm:pb-12 pt-6 space-y-5">
                <Field label={tForm.eventNameLabel} required>
                  <input className={inputCls} value={form.eventName} onChange={(e) => set("eventName", e.target.value)} placeholder={tForm.eventNamePlaceholder} />
                </Field>

                <Field label={tForm.entityTypeLabel} required>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {ENTITY_TYPES.map((et) => (
                      <label key={et.value} className={`flex items-center gap-3 border rounded-xl px-4 py-3 cursor-pointer transition-all ${
                        form.entityType === et.value
                          ? "border-[#b9a779] bg-[#b9a779]/8 text-[#054239]"
                          : "border-slate-200 hover:border-[#b9a779]/40 text-slate-650"
                      }`}>
                        {isRtl ? (
                          <>
                            <span className="text-sm font-bold">{et.ar}</span>
                            <input type="radio" name="entityType" value={et.value} checked={form.entityType === et.value} onChange={() => set("entityType", et.value)} className="accent-[#b9a779] shrink-0" />
                          </>
                        ) : (
                          <>
                            <input type="radio" name="entityType" value={et.value} checked={form.entityType === et.value} onChange={() => set("entityType", et.value)} className="accent-[#b9a779] shrink-0" />
                            <span className="text-sm font-bold">{et.en}</span>
                          </>
                        )}
                      </label>
                    ))}
                  </div>
                </Field>

                {form.entityType !== "INDIVIDUAL" && (
                  <Field label={entityNameLabelDynamic}>
                    <input className={inputCls} value={form.entityName} onChange={(e) => set("entityName", e.target.value)} placeholder={entityNamePlaceholderDynamic} />
                  </Field>
                )}

                <Field label={tForm.descriptionLabel} required>
                  <textarea className={textareaCls} value={form.description} onChange={(e) => set("description", e.target.value)} placeholder={tForm.descriptionPlaceholder} />
                </Field>
              </div>
            </div>

            {/* ── Section 3: Goals & Impact ── */}
            <div className="bg-white rounded-3xl border border-[#b9a779]/20 shadow-sm overflow-hidden relative">
              <DecorativeCorners />
              <div className="bg-[#054239]/5 border-b border-[#b9a779]/15 px-8 sm:px-12 py-5 flex items-center gap-3">
                <span className="w-7 h-7 rounded-full number-circle bg-[#b9a779] text-white text-xs font-black flex items-center justify-center shrink-0">٣</span>
                <h2 className="font-extrabold text-[#054239] text-sm font-qomra">{tForm.section3Title}</h2>
              </div>
              <div className="px-8 sm:px-12 pb-8 sm:pb-12 pt-6 space-y-5">
                <Field label={tForm.goalsLabel}>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {GOALS.map((g) => (
                      <label key={g.id} className={`flex items-center gap-2.5 border rounded-xl px-3 py-2.5 cursor-pointer transition-all ${
                        form.goals.includes(g.id)
                          ? "border-[#b9a779] bg-[#b9a779]/8 text-[#054239]"
                          : "border-slate-200 hover:border-[#b9a779]/40 text-slate-650"
                      }`}>
                        {isRtl ? (
                          <>
                            <span className="text-sm font-bold">{g.ar}</span>
                            <input type="checkbox" checked={form.goals.includes(g.id)} onChange={() => toggleGoal(g.id)} className="accent-[#b9a779] w-4 h-4 shrink-0" />
                          </>
                        ) : (
                          <>
                            <input type="checkbox" checked={form.goals.includes(g.id)} onChange={() => toggleGoal(g.id)} className="accent-[#b9a779] w-4 h-4 shrink-0" />
                            <span className="text-sm font-bold">{g.en}</span>
                          </>
                        )}
                      </label>
                    ))}
                    <label className={`flex items-center gap-2.5 border rounded-xl px-3 py-2.5 cursor-pointer transition-all ${
                      form.goals.includes("other")
                        ? "border-[#b9a779] bg-[#b9a779]/8 text-[#054239]"
                        : "border-slate-200 hover:border-[#b9a779]/40 text-slate-650"
                    }`}>
                      {isRtl ? (
                        <>
                          <span className="text-sm font-bold">{tForm.goalsOtherLabel}</span>
                          <input type="checkbox" checked={form.goals.includes("other")} onChange={() => toggleGoal("other")} className="accent-[#b9a779] w-4 h-4 shrink-0" />
                        </>
                      ) : (
                        <>
                          <input type="checkbox" checked={form.goals.includes("other")} onChange={() => toggleGoal("other")} className="accent-[#b9a779] w-4 h-4 shrink-0" />
                          <span className="text-sm font-bold">{tForm.goalsOtherLabel}</span>
                        </>
                      )}
                    </label>
                  </div>
                  {form.goals.includes("other") && (
                    <input
                      className={inputCls + " mt-2"}
                      value={form.goalsOther}
                      onChange={(e) => set("goalsOther", e.target.value)}
                      placeholder={tForm.goalsOtherPlaceholder}
                    />
                  )}
                </Field>

                <Field label={tForm.expectedImpactLabel} hint={tForm.expectedImpactHint}>
                  <textarea className={textareaCls} value={form.expectedImpact} onChange={(e) => set("expectedImpact", e.target.value)} placeholder={tForm.expectedImpactPlaceholder} />
                </Field>

                <Field label={tForm.targetAudienceLabel}>
                  <input className={inputCls} value={form.targetAudience} onChange={(e) => set("targetAudience", e.target.value)} placeholder={tForm.targetAudiencePlaceholder} />
                </Field>
              </div>
            </div>

            {/* ── Section 4: Time & Place ── */}
            <div className="bg-white rounded-3xl border border-[#b9a779]/20 shadow-sm relative">
              <DecorativeCorners />
              <div className="bg-[#054239]/5 border-b border-[#b9a779]/15 px-8 sm:px-12 py-5 flex items-center gap-3 rounded-t-3xl">
                <span className="w-7 h-7 rounded-full number-circle bg-[#b9a779] text-white text-xs font-black flex items-center justify-center shrink-0">٤</span>
                <h2 className="font-extrabold text-[#054239] text-sm font-qomra">{tForm.section4Title}</h2>
              </div>
              <div className="px-8 sm:px-12 pb-8 sm:pb-12 pt-6 space-y-5">
                <Field label={tForm.governorateLabel}>
                  <select
                    className={inputCls}
                    value={form.governorate}
                    onChange={(e) => {
                      set("governorate", e.target.value);
                      set("culturalCenterId", "");
                    }}
                  >
                    <option value="">{tForm.governoratePlaceholder}</option>
                    {GOVERNORATES_FORM.map((g) => (
                      <option key={g.ar} value={g.ar}>{isRtl ? g.ar : g.en}</option>
                    ))}
                  </select>
                </Field>

                <Field label={tForm.culturalCenterLabel} hint={!form.governorate ? tForm.culturalCenterHint : undefined}>
                  <select
                    className={inputCls}
                    value={form.culturalCenterId}
                    onChange={(e) => set("culturalCenterId", e.target.value)}
                    disabled={!form.governorate || loadingCenters}
                  >
                    <option value="">{tForm.culturalCenterPlaceholder}</option>
                    {filteredCenters.map((c) => (
                      <option key={c.id} value={c.id}>{c.nameAr}</option>
                    ))}
                  </select>
                </Field>

                <Field label={tForm.proposedDateLabel}>
                  <ApexDateTimePicker
                    type="datetime-local"
                    value={form.proposedDate}
                    onChange={(val) => set("proposedDate", val)}
                    isAdmin={false}
                    locale={locale}
                    placeholder={tForm.proposedDatePlaceholder}
                  />
                </Field>
              </div>
            </div>

            {/* ── Section 5: Type & Sustainability ── */}
            <div className="bg-white rounded-3xl border border-[#b9a779]/20 shadow-sm overflow-hidden relative">
              <DecorativeCorners />
              <div className="bg-[#054239]/5 border-b border-[#b9a779]/15 px-8 sm:px-12 py-5 flex items-center gap-3">
                <span className="w-7 h-7 rounded-full number-circle bg-[#b9a779] text-white text-xs font-black flex items-center justify-center shrink-0">٥</span>
                <h2 className="font-extrabold text-[#054239] text-sm font-qomra">{tForm.section5Title}</h2>
              </div>
              <div className="px-8 sm:px-12 pb-8 sm:pb-12 pt-6 space-y-5">
                <Field label={tForm.eventTypeLabel}>
                  <div className="flex flex-col sm:flex-row gap-4">
                    {[
                      { value: "central", label: tForm.eventTypeCentral },
                      { value: "joint",   label: tForm.eventTypeJoint },
                    ].map((opt) => (
                      <label key={opt.value} className={`flex-1 flex items-center gap-3 border rounded-xl px-4 py-3 cursor-pointer transition-all ${
                        form.eventType === opt.value
                          ? "border-[#b9a779] bg-[#b9a779]/8 text-[#054239]"
                          : "border-slate-200 hover:border-[#b9a779]/40 text-slate-650"
                      }`}>
                        {isRtl ? (
                          <>
                            <span className="text-sm font-bold">{opt.label}</span>
                            <input type="radio" name="eventType" value={opt.value} checked={form.eventType === opt.value} onChange={() => set("eventType", opt.value)} className="accent-[#b9a779] shrink-0" />
                          </>
                        ) : (
                          <>
                            <input type="radio" name="eventType" value={opt.value} checked={form.eventType === opt.value} onChange={() => set("eventType", opt.value)} className="accent-[#b9a779] shrink-0" />
                            <span className="text-sm font-bold">{opt.label}</span>
                          </>
                        )}
                      </label>
                    ))}
                  </div>
                </Field>

                <Field label={tForm.isSustainableLabel}>
                  <div className="flex flex-col sm:flex-row gap-4">
                    {[
                      { value: "yes", label: tForm.isSustainableYes },
                      { value: "no",  label: tForm.isSustainableNo },
                    ].map((opt) => (
                      <label key={opt.value} className={`flex-1 flex items-center gap-3 border rounded-xl px-4 py-3 cursor-pointer transition-all ${
                        form.isSustainable === opt.value
                          ? "border-[#b9a779] bg-[#b9a779]/8 text-[#054239]"
                          : "border-slate-200 hover:border-[#b9a779]/40 text-slate-650"
                      }`}>
                        {isRtl ? (
                          <>
                            <span className="text-sm font-bold">{opt.label}</span>
                            <input type="radio" name="isSustainable" value={opt.value} checked={form.isSustainable === opt.value} onChange={() => set("isSustainable", opt.value)} className="accent-[#b9a779] shrink-0" />
                          </>
                        ) : (
                          <>
                            <input type="radio" name="isSustainable" value={opt.value} checked={form.isSustainable === opt.value} onChange={() => set("isSustainable", opt.value)} className="accent-[#b9a779] shrink-0" />
                            <span className="text-sm font-bold">{opt.label}</span>
                          </>
                        )}
                      </label>
                    ))}
                  </div>
                </Field>

                {form.isSustainable === "yes" && (
                  <Field label={tForm.sustainabilityNoteLabel}>
                    <textarea className={textareaCls} value={form.sustainabilityNote} onChange={(e) => set("sustainabilityNote", e.target.value)} placeholder={tForm.sustainabilityNotePlaceholder} />
                  </Field>
                )}
              </div>
            </div>

            {/* ── Section 6: Additional Notes ── */}
            <div className="bg-white rounded-3xl border border-[#b9a779]/20 shadow-sm overflow-hidden relative">
              <DecorativeCorners />
              <div className="bg-[#054239]/5 border-b border-[#b9a779]/15 px-8 sm:px-12 py-5 flex items-center gap-3">
                <span className="w-7 h-7 rounded-full number-circle bg-[#b9a779] text-white text-xs font-black flex items-center justify-center shrink-0">٦</span>
                <h2 className="font-extrabold text-[#054239] text-sm font-qomra">{tForm.section6Title}</h2>
              </div>
              <div className="px-8 sm:px-12 pb-8 sm:pb-12 pt-6 space-y-5">
                <Field label={tForm.additionalNotesLabel}>
                  <textarea className={textareaCls} value={form.additionalNotes} onChange={(e) => set("additionalNotes", e.target.value)} placeholder={tForm.additionalNotesPlaceholder} />
                </Field>
              </div>
            </div>

            {/* ── Final Pledge ── */}
            <div className="bg-[#054239]/5 border border-[#b9a779]/20 rounded-3xl p-8 sm:p-10 relative">
              <DecorativeCorners />
              <label className="flex items-start gap-4 cursor-pointer">
                {isRtl ? (
                  <>
                    <span className="text-sm text-slate-700 leading-relaxed">
                      {tForm.pledgeTextBeforeName}<strong>{form.applicantName || "..."}</strong>{tForm.pledgeTextAfterName}
                    </span>
                    <input
                      type="checkbox"
                      checked={form.agreedToTerms}
                      onChange={(e) => set("agreedToTerms", e.target.checked)}
                      className="accent-[#b9a779] w-5 h-5 mt-0.5 shrink-0"
                    />
                  </>
                ) : (
                  <>
                    <input
                      type="checkbox"
                      checked={form.agreedToTerms}
                      onChange={(e) => set("agreedToTerms", e.target.checked)}
                      className="accent-[#b9a779] w-5 h-5 mt-0.5 shrink-0"
                    />
                    <span className="text-sm text-slate-700 leading-relaxed">
                      {tForm.pledgeTextBeforeName}<strong>{form.applicantName || "..."}</strong>{tForm.pledgeTextAfterName}
                    </span>
                  </>
                )}
              </label>
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl px-5 py-4 text-sm font-semibold">
                {error}
              </div>
            )}

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-sm text-slate-500 hover:text-[#054239] font-bold transition underline underline-offset-4 cursor-pointer"
              >
                {tForm.backToTerms}
              </button>
              <button
                type="submit"
                disabled={!form.agreedToTerms || submitting}
                className="inline-flex items-center gap-2 bg-[#b9a779] hover:bg-[#8B7355] disabled:opacity-50 disabled:cursor-not-allowed text-[#054239] font-extrabold text-sm px-10 py-4 rounded-full shadow-md transition-all active:scale-95 cursor-pointer"
              >
                {submitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-[#054239] border-t-transparent rounded-full animate-spin" />
                    <span>{tForm.submittingText}</span>
                  </>
                ) : (
                  <>
                    <span>{tForm.submitButton}</span>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1 rtl:group-hover:-translate-x-1">
                      {isRtl ? (
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15m0 0l6.75 6.75M4.5 12l6.75-6.75" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12h15m0 0l-6.75-6.75M19.5 12l-6.75 6.75" />
                      )}
                    </svg>
                  </>
                )}
              </button>
            </div>

          </form>
        )}

        {/* ═══ STEP 3: Success ═══ */}
        {step === 3 && (
          <div className="bg-white rounded-3xl border border-[#b9a779]/20 shadow-lg overflow-hidden relative text-center">
            <DecorativeCorners />
            <div className="bg-gradient-to-br from-[#054239] to-[#1C665A] px-8 py-12 flex flex-col items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-white/10 border-2 border-[#b9a779]/50 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="#b9a779" className="w-10 h-10">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-white font-extrabold text-2xl sm:text-3xl font-qomra">{tForm.successTitle}</h2>
              <p className="text-slate-300 text-sm max-w-md leading-relaxed">
                {tForm.successSubtitle}
              </p>
            </div>
            <div className="p-8 space-y-4">
              <div className="bg-[#F8F3EC] border border-[#b9a779]/15 rounded-2xl p-5 text-sm text-slate-650 leading-relaxed">
                <p className="font-bold text-[#054239] mb-2">{tForm.nextStepsTitle}</p>
                <ul className="space-y-2 text-start">
                  {tForm.nextStepsList.map((item, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <span className="w-4 h-4 rounded-full number-circle bg-[#b9a779]/20 text-[#b9a779] flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">{i + 1}</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  href={`/${locale}/calendar`}
                  className="inline-flex items-center justify-center gap-2 bg-[#054239] text-white font-bold text-sm px-6 py-3 rounded-full shadow transition hover:bg-[#04332b] cursor-pointer"
                >
                  {tForm.backToCalendar}
                </Link>
                <button
                  onClick={() => { setForm(INITIAL); setStep(1); }}
                  className="inline-flex items-center justify-center gap-2 border border-slate-200 text-slate-600 font-bold text-sm px-6 py-3 rounded-full transition hover:border-[#b9a779]/40 hover:text-[#054239] cursor-pointer"
                >
                  {tForm.submitAnother}
                </button>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
