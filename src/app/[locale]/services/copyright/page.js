"use client";

import React, { useState, useEffect, useRef, use } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import DecorativeCorners from "../../../../components/DecorativeCorners";
import ApexDateTimePicker from "../../../../components/ApexDateTimePicker";
import { validateField, validateAll } from "../../../../lib/copyright-validation";
import { Lightbulb, Hourglass, AlertTriangle, Info, FileText, CheckCircle, AlertCircle, CreditCard, Clock, Award, Check, Trash2, Plus, Download, X } from "lucide-react";

// Translation Dictionary
const T = {
  ar: {
    metaTitle: "وزارة الثقافة – مديرية حماية حقوق المؤلف والحقوق المجاورة",
    title: "بوابة حماية حقوق المؤلف الرقمية",
    subtitle: "احمِ عملك الفكري (كتاب، برنامج، تطبيق، أغنية، أو لوحة) وسجّله رسمياً لمنع سرقته أو تقليده.",
    step1: "الاستمارة والمرفقات",
    step1Desc: "إدخال معلومات المودع وتفاصيل المصنف ورفع الملفات والوثائق الثبوتية.",
    step2: "بوابة الدفع الإلكتروني",
    step2Desc: "تسديد الرسوم القانونية والأولية للطلب عبر بوابات الدفع الإلكتروني المعتمدة.",
    step3: "معالجة وتتبع الطلب",
    step3Desc: "دراسة طلبك وتدقيقه فنيًا وقانونيًا من قبل المختصين بالوزارة.",
    step4: "الشهادة الرقمية الرسمية",
    step4Desc: "تهانينا! تم إصدار وثيقة حماية الملكية الفكرية المعتمدة رسميًا.",
    stepNum: "الخطوة",
    stepOf: "من",
    republic: "الجمهورية العربية السورية – وزارة الثقافة",
    decree: "قانون حماية حق المؤلف",
    switchApplicant: "بوابة تقديم الطلبات",
    switchReviewer: "لوحة تحكم الموظف",
    switchTracker: "متابعة طلب سابق",
    termsTitle: "دليلك المبسط لحماية حقوقك الفكرية",
    termsSubtitle: "اعرف كيف تحمي عملك الفني أو الأدبي أو البرمجي بخطوات بسيطة وبدون تعقيدات قانونية",
    gavel: "خطوة إلزامية مسبقة",
    agreeCheck: "لقد قرأت هذا الدليل المبسط وأتعهد بصحة كافة البيانات والمرفقات التي سأقدمها تحت مسؤوليتي الشخصية.",
    btnNextStep: "الانتقال للاستمارة الرقمية",
    btnBack: "← العودة لمراجعة الشروط",
    section1: "البيانات الشخصية والتواصل",
    nameLabel: "الاسم الرباعي",
    namePlaceholder: "الاسم الرباعي الكامل",
    phoneLabel: "رقم الموبايل",
    phonePlaceholder: "ادخل رقم الموبايل",
    emailLabel: "البريد الإلكتروني",
    emailPlaceholder: "example@domain.sy",
    roleLabel: "صفة مقدم الطلب",
    roleAuthor: "صاحب العمل الأصلي",
    roleAgent: "وكيل رسمي مفوض عن صاحب العمل",
    roleHeir: "وارث عن صاحب العمل المتوفى",
    roleRep: "ممثل قانوني لشركة أو منشأة فنية",
    roleExtraDetails: "يرجى إرفاق الوثيقة الداعمة لصفتك في قسم المرفقات أدناه",
    section2: "تفاصيل العمل",
    workTitleLabel: "اسم العمل",
    workTitlePlaceholder: "مثال: تطبيق أتمتة الأنظمة الثقافية أو رواية أحلام دمشقية",
    categoryLabel: "نوع العمل",
    catWritten: "نصوص مكتوبة — كتاب، رواية، ديوان شعر",
    catInfo: "برمجيات وتطبيقات — تطبيق جوال، موقع، قاعدة بيانات",
    catAudio: "صوتيات أو مرئيات — أغنية، فيلم، تسجيل أداء",
    catArts: "فنون تشكيلية وتصميم — لوحة، منحوتة، تصميم معماري",
    catFolklore: "مأثورات وتراث شعبي سوري",
    originLabel: "أصالة العمل",
    origOriginal: "عمل جديد ومبتكر بالكامل",
    origDerived: "عمل مقتبس أو مترجم أو معدّل عن عمل آخر",
    origNameLabel: "اسم العمل الأصلي المقتبس منه",
    origPermLabel: "وثيقة موافقة صاحب العمل الأصلي",
    descLabel: "وصف العمل",
    descPlaceholder: "اكتب عن العمل وما يجعله مميزاً...",
    section3: "تاريخ الإنجاز ومكان التقديم",
    provinceLabel: "المحافظة",
    centerLabel: "مركز الإيداع",
    completionDateLabel: "تاريخ إنجاز العمل",
    section4: "المرفقات والوثائق",
    fileWorkLabel: "ملف العمل",
    fileWorkDesc: "رفع ملف العمل بصيغة ZIP أو PDF أو MP3، بحد أقصى 100 ميجابايت.",
    fileIdLabel: "الهوية الشخصية",
    fileIdDesc: "صورة واضحة لبطاقة الهوية أو جواز السفر، وجهان في ملف واحد.",
    fileTelecomLabel: "شهادة مطابقة الهيئة الوطنية لتقانة المعلومات",
    fileTelecomDesc: "كتاب مطابقة المضمون الإلكتروني الصادر عن الهيئة، إلزامي فقط لأصحاب التطبيقات والبرامج.",
    fileRoleLabel: "وثيقة الصفة القانونية",
    fileRoleDesc: "صورة عن الوكالة الرسمية، أو حصر الإرث، أو السجل التجاري حسب الصفة المختارة.",
    fileSelect: "اختر الملف",
    fileSelected: "تم اختيار الملف",
    btnSubmitForm: "تأكيد البيانات والانتقال للدفع",
    paySuccessTitle: "تم تسجيل معاملتك بنجاح!",
    paySuccessDesc: "رقم طلبك:",
    payDetailsTitle: "تفاصيل رسوم الخدمة الإلكترونية:",
    payDetail1: "رسم إيداع وحماية مصنف فكري (الرسم الأولي):",
    payDetail2: "رسوم الطوابع البريدية والخدمة السحابية:",
    payTotal: "المبلغ المطلوب دفعه للمرحلة الأولى:",
    payMethodTitle: "اختر إحدى طرق الدفع الإلكتروني المعتمدة:",
    payCham: "شام كاش",
    payChamDesc: "الدفع الإلكتروني الآمن عبر محفظة شام كاش الرقمية",
    payRefLabel: "رقم العملية *",
    payRefPlaceholder: "مثال: 987654321",
    payRefHint: "الرقم الذي يبدأ بعد #",
    payReceiptLabel: "رفع إيصال الدفع الإلكتروني *",
    payReceiptDesc: "يرجى أخذ لقطة شاشة للإيصال أو رفع ملف PDF هنا (بحد أقصى 5MB).",
    btnPay: "تسديد الرسم الأولي (550 ل.س)",
    n8nTitle: "جاري إكمال طلبك...",
    n8nDesc: "يرجى الانتظار قليلاً، لن يستغرق هذا أكثر من لحظات.",
    n8nTip: "احتفظ برمز معاملتك أعلاه — يمكنك استخدامه لاحقاً من تبويب \"متابعة طلب سابق\" لتتبع مراحل المراجعة والدفع وإصدار الشهادة.",
    certSuccessMsg: "تهانينا! تمت الموافقة الفنية والقانونية الرسمية على طلبك وجرى توليد الشهادة.",
    btnPrint: "طباعة الوثيقة الرسمية",
    certHeaderTitle: "شهادة إيداع وحماية مصنف فكري",
    certSub: "مديرية حماية حقوق المؤلف والحقوق المجاورة",
    certIssuedTo: "بناءً على أحكام قانون حماية حقوق المؤلف، تشهد وزارة الثقافة السورية بأن المصنف الموصوف أدناه قد تم إيداعه وحفظه أصولاً لحماية حقوق ملكيته الفكرية:",
    certWorkTitle: "عنوان وموضوع العمل المحمي:",
    certWorkCategory: "تصنيف ونوع العمل:",
    certOwnerName: "المالك المسجل للحقوق والملكية:",
    certProvinceCenter: "مكان الإيداع والمركز المعتمد:",
    certSerialLabel: "الرقم المتسلسل للوثيقة:",
    certPledge: "تُمنح هذه الشهادة بناءً على مسؤولية المودع الشخصية عن صحة الابتكار ودون أدنى مسؤولية على الوزارة تجاه الغير.",
    certDate: "تاريخ الإصدار والاعتماد:",
    certSignatureApplicant: "توثيق المودع (صاحب الحق)",
    certSignatureReviewer: "اعتماد الموظف المسؤول (المدير)",
    revTableTitle: "جدول المعاملات والطلبات الواردة من المواطنين للتدقيق",
    revColId: "رقم الطلب",
    revColApplicant: "مقدم الطلب",
    revColTitle: "عنوان العمل",
    revColCategory: "نوع العمل",
    revColAttached: "المرفقات",
    revColPayment: "حالة الدفع",
    revColAction: "مراجعة واتخاذ قرار",
    revNoItems: "لا توجد طلبات جديدة معلقة حالياً.",
    revInspectTitle: "مراجعة واعتماد المعاملة رقم:",
    revInspectApplicant: "اسم مقدم الطلب وصفته القانونية:",
    revInspectTitleWork: "عنوان وموضوع العمل الفكري:",
    revInspectCategory: "نوع وتصنيف العمل الفكري:",
    revInspectTelecomDoc: "كتاب مطابقة الهيئة الوطنية لتقانة المعلومات",
    revInspectTelecomValid: "مرفق ومستوفي الشروط الفنية للبرمجيات والمعلوماتية أصولاً",
    revInspectActionTitle: "اتخاذ القرار النهائي بشأن طلب الإيداع:",
    revInspectApprove: "الموافقة وإصدار الشهادة الرسمية للمواطن",
    revInspectReject: "رفض الطلب مع كتابة ملاحظات التعديل للمواطن",
    statusPaid: "مدفوع بالكامل",
    statusPending: "قيد الانتظار",
    toastSubmitSuccess: "تم إرسال الطلب بنجاح! يرجى تسديد الرسوم",
    toastPaySelect: "يرجى اختيار طريقة الدفع الإلكتروني للاستمرار",
    toastPayProgress: "جاري معالجة الدفع الرقمي وحفظ المرفقات بالخوادم...",
    toastPaySuccess: "تم تسليم المعاملة بنجاح! يمكنك الآن مراجعتها والموافقة عليها واعتمادها كموظف من لوحة التحكم بالأعلى",
    toastApproved: "تم اعتماد المعاملة رسمياً وتوليد وثيقة الملكية المضمونة!",
    toastRejected: "تم رفض المعاملة وإرسال التوجيهات للمتقدم لتعديل الطلب",
    btnSubmitAnother: "تقديم طلب حماية آخر",
    btnBackToCalendar: "العودة إلى الروزنامة الثقافية",
  },
  en: {
    metaTitle: "Ministry of Culture – Legal Affairs Directorate",
    title: "Digital Copyright Protection Portal",
    subtitle: "Protect your intellectual creations (books, apps, software, music, or art) and register them officially.",
    step1: "Form & Documents",
    step1Desc: "Enter depositor details, work description, and upload required files.",
    step2: "Payment Gateway",
    step2Desc: "Pay official service fees via verified electronic payment gateways.",
    step3: "Review & Tracking",
    step3Desc: "Technical and legal review of your application by Ministry experts.",
    step4: "Official Certificate",
    step4Desc: "Congratulations! Your official copyright certificate is issued.",
    stepNum: "Step",
    stepOf: "of",
    republic: "Syrian Arab Republic – Ministry of Culture",
    decree: "Copyright Protection Law",
    switchApplicant: "Applicant Portal",
    switchReviewer: "Reviewer Control Panel",
    switchTracker: "Track Request",
    termsTitle: "Your Simplified Guide to Intellectual Property Rights",
    termsSubtitle: "Learn how to protect your creative work easily without complex legal jargon",
    gavel: "Mandatory Pre-requisite",
    agreeCheck: "I have read this simplified guide and pledge that all submitted information and attachments are accurate under my personal responsibility.",
    btnNextStep: "Go to Digital Form",
    btnBack: "← Back to Review Terms",
    section1: "Personal Information & Contact Details",
    nameLabel: "Your Full Name (as printed on your National ID) *",
    namePlaceholder: "Full Name",
    phoneLabel: "Mobile Number (for contact & status updates) *",
    phonePlaceholder: "Enter mobile number",
    emailLabel: "Email Address (where you will receive your certificate) *",
    emailPlaceholder: "example@domain.sy",
    roleLabel: "In what capacity are you submitting this request? *",
    roleAuthor: "I am the original creator of the work",
    roleAgent: "I am an authorized agent (I hold a legal power of attorney)",
    roleHeir: "I am a rightful heir of the creator (I hold an inheritance certificate)",
    roleRep: "I am a legal representative of a company/production entity",
    roleExtraDetails: "Please upload the capacity document in the attachments section below",
    section2: "Work Details to Document and Protect",
    workTitleLabel: "Name of the Intellectual/Software Work *",
    workTitlePlaceholder: "Example: Cloud-based Cultural Automation System or Damascene Dreams Novel",
    categoryLabel: "What is the classification/type of this work? *",
    catWritten: "Written Text (Book, Novel, Poetry, Manuscript draft)",
    catInfo: "Software & Digital (Mobile App, Website, Database)",
    catAudio: "Audio or Visual (Song, Music sheet, Performance recording, Film, Video)",
    catArts: "Fine Arts & Design (Painting, Sculpture, Blueprints, Architectural design)",
    catFolklore: "Syrian National Folk Heritage",
    originLabel: "Is this work entirely new, or is it based/translated from a previous work? *",
    origOriginal: "Entirely new and original work",
    origDerived: "Adapted, translated, or modified from another person's work",
    origNameLabel: "What is the name of the original work? *",
    origPermLabel: "Consent letter or adaptation proof document from the original owner *",
    descLabel: "Explain briefly: How does this work operate and what makes it unique? *",
    descPlaceholder: "Write about your creation and its unique features...",
    section3: "Creation Date & Submission Details",
    provinceLabel: "Governorate (current residence or creation place) *",
    centerLabel: "Approved center for physical document delivery if needed *",
    completionDateLabel: "Date of complete preparation of the work *",
    section4: "Upload Supporting Documents and Work Files",
    fileWorkLabel: "Intellectual/Software Work File *",
    fileWorkDesc: "Upload your work (e-book PDF, source code ZIP, or song MP3) max 100MB.",
    fileIdLabel: "Syrian National ID Scan *",
    fileIdDesc: "Clear color scan of ID card or passport (both sides in one file).",
    fileTelecomLabel: "NANS Software Compatibility Certificate *",
    fileTelecomDesc: "Content compatibility certificate issued by NANS (mandatory only for software/apps).",
    fileRoleLabel: "Capacity Support Document *",
    fileRoleDesc: "Certified power of attorney, probate certificate, or company registry matching your capacity selected above.",
    fileSelect: "Choose file from your device",
    fileSelected: "File selected successfully",
    btnSubmitForm: "Confirm Details & Go to Payment",
    paySuccessTitle: "Transaction Registered Successfully!",
    paySuccessDesc: "Your request ID:",
    payDetailsTitle: "Digital Service Fees Details:",
    payDetail1: "Copyright Protection Fee (Initial Payment):",
    payDetail2: "Stamp Duties & Cloud Service Fees:",
    payTotal: "Total Amount Due for Stage 1:",
    payMethodTitle: "Select Certified Payment Gateway:",
    payCham: "Cham Cash",
    payChamDesc: "Pay via Cham Cash secure digital wallet",
    payRefLabel: "Transaction Reference Number *",
    payRefPlaceholder: "e.g., 987654321",
    payRefHint: "The number starting after #",
    payReceiptLabel: "Upload Payment Receipt Screenshot *",
    payReceiptDesc: "Please take a screenshot of your receipt or upload a PDF file here (max 5MB).",
    btnPay: "Pay Initial Fee (550 L.S.)",
    n8nTitle: "Completing your request...",
    n8nDesc: "Please wait a moment, this will only take a few seconds.",
    n8nTip: "Keep your request code above — use it later in the \"Track Request\" tab to follow the review, payment, and certificate stages.",
    certSuccessMsg: "Congratulations! The application has been approved, and your certificate of deposit has been generated.",
    btnPrint: "Print Official Certificate",
    certHeaderTitle: "Certificate of Deposit & Intellectual Property Protection",
    certSub: "Legal Affairs Directorate",
    certIssuedTo: "Pursuant to the provisions of Copyright law, the Syrian Ministry of Culture certifies that the work described below has been duly deposited to protect its intellectual property:",
    certWorkTitle: "Protected Work Title:",
    certWorkCategory: "Work Classification:",
    certOwnerName: "Registered Rights Owner:",
    certProvinceCenter: "Deposit Venue & Center:",
    certSerialLabel: "Document Serial Number:",
    certPledge: "This certificate is issued based on the depositor's personal responsibility regarding originality, without any liability on the Ministry towards third parties.",
    certDate: "Date of Issue & Certification:",
    certSignatureReviewer: "Reviewer Approval (Director)",
    revTableTitle: "Review Queue of Citizens' Requests for Audit",
    revColId: "Request Code",
    revColApplicant: "Applicant",
    revColTitle: "Work Title",
    revColCategory: "Category",
    revColAttached: "Documents",
    revColPayment: "Payment",
    revColAction: "Review & Approve",
    revNoItems: "No pending applications at the moment.",
    revInspectTitle: "Review & Certification of Request:",
    revInspectApplicant: "Applicant Name & Capacity:",
    revInspectTitleWork: "Work Title:",
    revInspectCategory: "Classification Type:",
    revInspectTelecomDoc: "NANS Compatibility Letter",
    revInspectTelecomValid: "Attached and verified under software legal requirements.",
    revInspectActionTitle: "Submit Final Decision for Deposit:",
    revInspectApprove: "Approve & Issue Certificate to Citizen",
    revInspectReject: "Reject Request with Feedback",
    statusPaid: "Fully Paid",
    statusPending: "Pending Review",
    toastSubmitSuccess: "Request submitted successfully! Proceed to payment",
    toastPaySelect: "Please select a payment gateway to proceed",
    toastPayProgress: "Processing cloud payment and uploading files...",
    toastPaySuccess: "Application submitted successfully! Switch to Reviewer Control Panel to approve.",
    toastApproved: "The application was officially approved and the certificate has been generated!",
    toastRejected: "Application rejected and feedback sent to the applicant",
    btnSubmitAnother: "Submit Another Request",
    btnBackToCalendar: "Back to Calendar",
  }
};

const DECREE_LAW_TEXT = {
  ar: [
    {
      id: "what-is-it",
      title: "ما هو حق المؤلف؟",
      content: `حماية حق المؤلف هي خدمة تتيح لك توثيق وحفظ ملكية أعمالك الفكرية (مثل كتبك، برامجك، أغانيك، أو لوحاتك) بشكل رسمي لدى وزارة الثقافة.
      
الهدف من هذا الإيداع هو إثبات أنك المبتكر الأول للعمل، وحمايته قانونياً من أي سرقة، أو نسخ، أو استخدام غير مصرح به من قبل الآخرين.`
    },
    {
      id: "what-we-protect",
      title: "ما الذي يمكن حمايته؟",
      content: `يمكنك حماية مجموعة واسعة من الأعمال المبتكرة، مثل:
• الكتب والمقالات، الروايات، والدواوين الشعرية.
• البرمجيات، مواقع الويب، تطبيقات الجوال، وقواعد البيانات.
• الأغاني والموسيقى والمسرحيات والأفلام والمقاطع المرئية.
• اللوحات الفنية، المنحوتات، التصاميم الهندسية والمعمارية.
• التراث الشعبي السوري الأصيل.`
    },
    {
      id: "what-is-excluded",
      title: "ما الأشياء التي لا تحمى؟",
      content: `حماية الملكية الفكرية لا تشمل الأمور التالية:
• مجرد فكرة في رأسك (الأفكار لا تحمى إلا إذا تمت كتابتها أو برمجتها أو تجسيدها في ملف عمل فعلي).
• القوانين والأنظمة الحكومية والوثائق الرسمية والأخبار الصحفية اليومية.
• العمليات الحسابية أو أساليب العمل المجردة.`
    },
    {
      id: "who-applies",
      title: "من يحق له تقديم الطلب؟",
      content: `يمكن لأي شخص تقديم طلب الحماية في الحالات التالية:
• المبتكر نفسه (صاحب العمل الأصلي).
• الوكيل الرسمي المفوض عن المبتكر بموجب وكالة قانونية.
• الورثة الشرعيون في حال كان المبتكر متوفى.
• الممثل القانوني للشركة أو المنشأة الفنية التي تمتلك العمل.`
    },
    {
      id: "how-long",
      title: "ما هي مدة الحماية؟",
      content: `تستمر حماية حقوقك المالية والمعنوية مدى حياتك بالكامل.
وبعد الوفاة، تنتقل هذه الحماية تلقائياً لعائلتك وورثتك الشرعيين لمدة 50 سنة إضافية لحفظ حقوقهم والاستفادة من العمل.`
    }
  ],
  en: [
    {
      id: "what-is-it",
      title: "What is Copyright?",
      content: `Copyright protection is an official service by the Ministry of Culture to document and secure ownership of your creative work (books, apps, music, paintings).

The goal is to prove you are the original creator and legally protect your work from unauthorized copying, theft, or use.`
    },
    {
      id: "what-we-protect",
      title: "What can be protected?",
      content: `You can protect many creative works, including:
• Books, articles, novels, and poetry.
• Software, websites, mobile apps, and databases.
• Songs, music sheets, theatrical plays, and videos.
• Paintings, sculptures, and architectural blueprints.
• Traditional Syrian folklore.`
    },
    {
      id: "what-cannot-be-protected",
      title: "What cannot be protected?",
      content: `Protection does not cover the following:
• Mere ideas in your head (ideas are not protected unless written, coded, or produced in a file).
• Official government laws, decrees, judicial documents, and daily news.
• Pure mathematical operations or abstract workflows.`
    },
    {
      id: "who-applies",
      title: "Who can submit a request?",
      content: `Anyone in the following capacities can apply:
• The original creator of the work.
• An authorized agent with a legal power of attorney.
• Rightful heirs if the creator has passed away.
• Legal representatives of the company that owns the work.`
    },
    {
      id: "how-long",
      title: "How long does it last?",
      content: `Moral and economic protection lasts for your entire lifetime.
After passing away, this protection is inherited by your family for an additional 50 years to secure their rights and benefits.`
    }
  ]
};

const INITIAL_FORM = {
  applicantName: "",
  applicantPhone: "",
  applicantEmail: "",
  applicantRole: "author",
  idDocType: "national_id",
  workTitle: "",
  workCategory: "written",
  workOrigin: "original",
  originalWorkName: "",
  originalPermission: "",
  workDesc: "",
  province: "دمشق",
  center: "ديوان المديرية بدمشق",
  completionDate: "",
  hasTelecomDoc: false,
};

const roleDescriptions = {
  ar: {
    author: "إذا كنت المبتكر أو المؤلف أو المبرمج الأصلي للعمل الفكري وتريد حمايته باسمك.",
    agent: "إذا كان صاحب العمل قد وكّلك رسمياً بموجب وكالة قانونية لتقديم المعاملة نيابة عنه.",
    heir: "إذا كان صاحب العمل متوفى وأنت تتقدم للطلب بصفتك أحد ورثته الشرعيين (يتطلب وثيقة حصر إرث).",
    representative: "إذا كان العمل الفكري ملكاً لشركة، دار نشر، أو مؤسسة تجارية مسجلة رسمياً وأنت ممثلها.",
  },
  en: {
    author: "If you are the original creator, author, or programmer of the work and want to protect it.",
    agent: "If the owner officially delegated you via a power of attorney to apply on their behalf.",
    heir: "If the creator is deceased and you apply as a legal heir (requires inheritance certificate).",
    representative: "If the work belongs to a registered company, publishing house, or institution.",
  }
};

const GOVERNORATES = [
  { ar: "دمشق", en: "Damascus" },
  { ar: "ريف دمشق", en: "Rif Dimashq" },
  { ar: "حلب", en: "Aleppo" },
  { ar: "حمص", en: "Homs" },
  { ar: "حماة", en: "Hama" },
  { ar: "اللاذقية", en: "Latakia" },
  { ar: "طرطوس", en: "Tartus" },
  { ar: "السويداء", en: "As-Suwayda" },
  { ar: "درعا", en: "Daraa" },
  { ar: "القنيطرة", en: "Quneitra" },
  { ar: "دير الزور", en: "Deir ez-Zor" },
  { ar: "الحسكة", en: "Al-Hasakah" },
  { ar: "الرقة", en: "Ar-Raqqah" },
  { ar: "إدلب", en: "Idlib" }
];

function Tooltip({ text }) {
  return (
    <span className="relative group cursor-pointer inline-flex items-center text-[#b9a779] hover:text-[#054239] transition-colors shrink-0">
      <Info className="w-3.5 h-3.5" />
      <span className="absolute bottom-full mb-2 hidden group-hover:block bg-[#054239] text-white text-[11px] p-2.5 rounded-xl shadow-xl z-35 w-64 font-medium leading-normal text-start rtl:-left-2.5 ltr:-right-2.5 transition-all">
        {text}
        <span className="absolute top-full border-4 border-transparent border-t-[#054239] rtl:left-2.5 ltr:right-2.5" />
      </span>
    </span>
  );
}

function FieldErrorText({ id, message }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1.5 text-xs text-rose-600 font-semibold flex items-center gap-1.5">
      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
      {message}
    </p>
  );
}

function ChamPaymentCard({ isRtl, showToast, copyText = "f6be4f104cf141af079e7c2af693dd41" }) {
  const [copied, setCopied] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(copyText);
    setCopied(true);
    showToast(
      isRtl ? "تم نسخ رمز الحساب بنجاح!" : "Account code copied successfully!",
      "success"
    );
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-[#054239] via-[#030705] to-[#011411] text-white border border-[#b9a779]/30 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 text-start">
      {/* Container-based responsive scanner animation */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes scan-responsive {
          0%, 100% { transform: translateY(0); opacity: 0.3; }
          50% { transform: translateY(calc(100% - 4px)); opacity: 0.95; }
        }
        .animate-scan-responsive {
          animation: scan-responsive 3s linear infinite;
        }
      `}} />

      {/* Decorative glowing background elements */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-[#b9a779]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#054239]/30 rounded-full blur-3xl pointer-events-none" />
      
      {/* Header: Brand identities */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#b9a779] to-[#988561] p-0.5 shadow-lg flex items-center justify-center">
            <div className="w-full h-full bg-[#030705] rounded-[14px] flex items-center justify-center">
              <svg className="w-6 h-6 text-[#b9a779]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
          <div>
            <div className="text-[10px] font-bold text-[#b9a779] tracking-wider uppercase font-inter">CHAM CASH DIGITAL PAY</div>
            <div className="text-lg font-bold text-white font-qomra">{isRtl ? "شام كاش" : "Cham Cash"}</div>
          </div>
        </div>
      </div>

      {/* Main Details Area */}
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-5 gap-6 items-center">
        {/* Account Details Block */}
        <div className="md:col-span-3 space-y-4">
          <div className="space-y-1.5">
            <span className="text-xs text-[#EDE5D6]/80 font-medium flex items-center gap-1.5">
              <svg className="w-4 h-4 text-[#b9a779]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
              </svg>
              {isRtl ? "رمز حساب المحفظة الرسمي" : "Official Wallet Account Code"}
            </span>
            <div className="group relative flex items-center bg-[#030705]/80 rounded-2xl border border-white/10 p-3 sm:p-4 hover:border-[#b9a779]/45 transition-all duration-300 shadow-inner">
              <code className="font-mono text-xs sm:text-sm text-[#EDE5D6] flex-1 select-all break-all pr-2 text-start font-bold">
                {copyText}
              </code>
              <button
                type="button"
                onClick={handleCopy}
                className={`relative z-20 flex items-center justify-center p-2 rounded-xl border transition-all duration-300 shrink-0 cursor-pointer ${
                  copied
                    ? "bg-[#b9a779]/20 border-[#b9a779]/40 text-[#b9a779]"
                    : "bg-white/5 border-white/10 hover:bg-[#b9a779]/10 hover:border-[#b9a779]/40 text-[#b9a779] hover:text-[#EDE5D6]"
                }`}
                title={isRtl ? "نسخ الرمز" : "Copy Code"}
              >
                {copied ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 002 2h2a2 2 0 002-2m0 0H9m-3 4H10" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <div className="bg-white/5 rounded-2xl p-4 border border-white/5 space-y-2">
            <div className="flex items-start gap-2.5">
              <svg className="w-4 h-4 text-[#b9a779] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-[11px] leading-relaxed text-[#EDE5D6]/90">
                <span className="font-bold text-white block mb-0.5">{isRtl ? "طريقة التحويل عبر تطبيق شام كاش:" : "How to transfer via Cham Cash app:"}</span>
                {isRtl ? (
                  <ol className="list-decimal list-inside space-y-1">
                    <li>افتح تطبيق شام كاش واختر <span className="text-[#b9a779] font-medium">ارسال</span>.</li>
                    <li>ألصق <span className="text-[#b9a779] font-medium">رمز الحساب</span> المنسوخ أعلاه في الخانة المتاحة.</li>
                    <li>أدخل مبلغ الرسم المطلوب بدقة، ثم أكّد العملية.</li>
                    <li>قم بتصوير شاشة الإيصال ورفعها في الحقل المخصص أدناه.</li>
                  </ol>
                ) : (
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Open Cham Cash app and select <span className="text-[#b9a779] font-medium">Send</span>.</li>
                    <li>Paste the <span className="text-[#b9a779] font-medium">Account Code</span> copied above in the available field.</li>
                    <li>Enter the required fee amount, then confirm.</li>
                    <li>Take a screenshot of the receipt and upload below.</li>
                  </ol>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* QR Code Scan Section */}
        <div className="md:col-span-2 flex flex-col items-center justify-center text-center space-y-2">
          <span className="text-xs text-[#EDE5D6]/85 font-medium">
            {isRtl ? "أو امسح الرمز للدفع الفوري" : "Or Scan QR to Pay Instantly"}
          </span>
          <div
            onClick={() => setShowModal(true)}
            className="group relative cursor-pointer overflow-hidden p-3 bg-white rounded-2xl border-2 border-[#b9a779]/20 hover:border-[#b9a779]/60 transition-all duration-500 shadow-lg hover:shadow-[#b9a779]/10"
          >
            {/* Holographic scanning overlay */}
            <div className="absolute inset-0 bg-[#030705]/20 group-hover:bg-transparent transition-colors duration-500 z-10" />
            
            {/* Laser scanning line */}
            <div className="absolute top-3 left-3 right-3 h-[2px] bg-gradient-to-r from-transparent via-[#b9a779] to-transparent shadow-[0_0_8px_#b9a779] animate-scan-responsive z-20 pointer-events-none" />
            
            <img
              src="/images/cham_cash_qr.jpeg"
              alt="Cham Cash QR Code"
              className="w-36 h-36 sm:w-40 sm:h-40 object-cover rounded-xl border border-slate-100 relative z-0 transition-transform duration-500 group-hover:scale-105"
            />
            
            {/* Enlarge Hint */}
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20 rounded-xl">
              <span className="text-[11px] font-bold text-white px-2.5 py-1.5 rounded-lg bg-[#030705]/90 border border-white/20 flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-[#b9a779]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
                </svg>
                {isRtl ? "تكبير الرمز" : "Zoom QR Code"}
              </span>
            </div>
          </div>
          <span className="text-[10px] text-[#b9a779]/70">
            {isRtl ? "اضغط على الباركود لتكبيره" : "Click to view full size"}
          </span>
        </div>
      </div>

      {/* QR Code Fullscreen Modal */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-all duration-300"
          onClick={() => setShowModal(false)}
        >
          <div
            className="relative bg-[#030705] border border-white/10 p-6 rounded-3xl max-w-sm sm:max-w-md w-full flex flex-col items-center gap-4 text-center shadow-2xl animate-scaleIn"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-[#b9a779] hover:text-[#EDE5D6] bg-white/5 hover:bg-white/10 p-2 rounded-full border border-white/10 transition cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            <div className="mt-4 flex flex-col items-center gap-1">
              <span className="text-xs font-bold text-[#b9a779] tracking-wider uppercase font-inter">CHAM CASH QR</span>
              <h4 className="text-lg font-bold text-white font-qomra">{isRtl ? "امسح الباركود للدفع السريع" : "Scan to Pay Instantly"}</h4>
            </div>

            <div className="relative w-72 h-72 sm:w-80 sm:h-80 bg-white p-4 rounded-2xl border border-white/10 shadow-lg flex items-center justify-center overflow-hidden">
              {/* Laser scanning line for modal */}
              <div className="absolute top-4 left-4 right-4 h-[3px] bg-gradient-to-r from-transparent via-[#b9a779] to-transparent shadow-[0_0_12px_#b9a779] animate-scan-responsive z-20 pointer-events-none" />
              <img
                src="/images/cham_cash_qr.jpeg"
                alt="Cham Cash QR Code Large"
                className="w-full h-full object-cover rounded-lg"
              />
            </div>
            
            <p className="text-xs text-[#EDE5D6]/90 leading-relaxed px-4">
              {isRtl
                ? "وجه كاميرا هاتفك المحمول أو قارئ الرمز في تطبيق شام كاش نحو الباركود لإتمام عملية الدفع بسرعة."
                : "Point your phone camera or the QR scanner in Cham Cash app at the barcode to complete the payment."}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CopyrightPage(props) {
  const params = use(props.params);
  const locale = params.locale || "ar";
  const isRtl = locale === "ar";
  const t = T[locale] || T.ar;
  const searchParams = useSearchParams();

  // Active view: 'applicant', 'reviewer', or 'tracker'
  const [portal, setPortal] = useState("applicant");

  // Applicant Portal Wizard step: 1=terms, 2=form, 3=payment, 4=processing, 5=certificate
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(INITIAL_FORM);
  const [touched, setTouched] = useState({});
  const [errors, setErrors] = useState({});

  const handleBlur = (field) => {
    setTouched((t) => ({ ...t, [field]: true }));
  };

  const fieldError = (field) => (touched[field] ? errors[field] : null);

  const fieldClass = (field, extra) => {
    const hasError = !!fieldError(field);
    const fontClass = isRtl ? "font-qomra" : "font-inter";
    return `${extra} ${fontClass} ${
      hasError
        ? "border-rose-400 focus:border-rose-500 focus:ring-rose-100"
        : "border-slate-200 focus:border-[#b9a779] focus:ring-[#b9a779]/15"
    }`;
  };
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [selectedGateway, setSelectedGateway] = useState("cham_cash");
  const [paymentRef, setPaymentRef] = useState("");
  const paymentRefError =
    touched.paymentRef && paymentRef.trim().length < 4
      ? (isRtl ? "رقم المرجع غير صحيح (4 أرقام على الأقل)" : "Reference number looks too short")
      : null;
  const [paymentReceipt, setPaymentReceipt] = useState(null);
  const [receiptFileLabel, setReceiptFileLabel] = useState(t?.fileSelect || "اختر الملف");
  
  // Tracking-specific payment states
  const [trackPaymentRef, setTrackPaymentRef] = useState("");
  const [trackPaymentReceipt, setTrackPaymentReceipt] = useState(null);
  const [trackReceiptFileLabel, setTrackReceiptFileLabel] = useState(t?.fileSelect || "اختر الملف");
  const [trackPaymentRefTouched, setTrackPaymentRefTouched] = useState(false);

  const [toast, setToast] = useState({ text: "", type: "", show: false });
  const [imagePreview, setImagePreview] = useState(null);
  const [activeAppId, setActiveAppId] = useState("");
  const [activeLawTab, setActiveLawTab] = useState("preface");
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // Joint Authors
  const [hasJointAuthors, setHasJointAuthors] = useState(false);
  const [jointAuthors, setJointAuthors] = useState([]);

  // Tracker State
  const [trackCode, setTrackCode] = useState("");
  const [trackedSub, setTrackedSub] = useState(null);
  const [loadingTrack, setLoadingTrack] = useState(false);
  const [errorTracker, setErrorTracker] = useState("");

  // Read code query param to auto-fill tracker
  useEffect(() => {
    const code = searchParams.get("code");
    if (code) {
      setTrackCode(code);
      setPortal("tracker");

      const fetchAndTrack = async () => {
        setLoadingTrack(true);
        setErrorTracker("");
        try {
          const res = await fetch(`/api/copyright?code=${encodeURIComponent(code.trim())}`);
          if (res.ok) {
            const data = await res.json();
            setTrackedSub(data.submission);
          } else {
            setErrorTracker(locale === "en" ? "Request code not found" : "رمز المعاملة غير موجود في سجلاتنا");
          }
        } catch (err) {
          console.error(err);
          setErrorTracker(locale === "en" ? "Error connecting to server" : "حدث خطأ بالاتصال بالخادم");
        } finally {
          setLoadingTrack(false);
        }
      };
      fetchAndTrack();
    }
  }, [searchParams, locale]);

  // File label states
  const [workFileLabel, setWorkFileLabel] = useState(t.fileSelect);
  const [workFile, setWorkFile] = useState(null);
  const [idFileFrontLabel, setIdFileFrontLabel] = useState(t.fileSelect);
  const [idFileFront, setIdFileFront] = useState(null);
  const [idFileBackLabel, setIdFileBackLabel] = useState(t.fileSelect);
  const [idFileBack, setIdFileBack] = useState(null);
  const [telecomFileLabel, setTelecomFileLabel] = useState(t.fileSelect);
  const [telecomFile, setTelecomFile] = useState(null);
  const [roleFileLabel, setRoleFileLabel] = useState(t.fileSelect);
  const [roleFile, setRoleFile] = useState(null);

  // New base64 and label states for company representative and legal agent
  const [commercialRegisterFile, setCommercialRegisterFile] = useState(null);
  const [commercialRegisterLabel, setCommercialRegisterLabel] = useState(t.fileSelect);

  const [delegationFile, setDelegationFile] = useState(null);
  const [delegationLabel, setDelegationLabel] = useState(t.fileSelect);

  const [representativeIdFile, setRepresentativeIdFile] = useState(null);
  const [representativeIdLabel, setRepresentativeIdLabel] = useState(t.fileSelect);

  const [originalOwnerIdFile, setOriginalOwnerIdFile] = useState(null);
  const [originalOwnerIdLabel, setOriginalOwnerIdLabel] = useState(t.fileSelect);

  // File change handler
  const handleFileChange = (e, setLabel) => {
    const file = e.target.files?.[0];
    if (file) {
      setLabel(file.name);
    }
  };

  // Base64 file change handler
  const handleBase64FileChange = (e, setLabel, setBase64) => {
    const file = e.target.files?.[0];
    if (file) {
      setLabel(file.name);
      const reader = new FileReader();
      reader.onload = (event) => {
        setBase64(event.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Shape of a fresh joint-author row. Like the main applicant, each one picks an
  // identity document: a national ID (front + back) or a passport (single page,
  // so the back stays empty).
  const makeJointAuthor = () => ({
    id: Date.now(),
    name: "",
    idDocType: "national_id",
    fileFront: null,
    fileFrontLabel: t.fileSelect,
    fileBack: null,
    fileBackLabel: t.fileSelect,
  });

  // Update one joint author's front/back ID file (and its label) by index,
  // reading the chosen file as base64. Mirrors handleBase64FileChange but targets
  // a specific entry inside the jointAuthors array.
  const handleJointAuthorFileChange = (e, index, fileKey, labelKey) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setJointAuthors((prev) => prev.map((a, i) => (i === index ? { ...a, [labelKey]: file.name } : a)));
    const reader = new FileReader();
    reader.onload = (event) => {
      setJointAuthors((prev) => prev.map((a, i) => (i === index ? { ...a, [fileKey]: event.target.result } : a)));
    };
    reader.readAsDataURL(file);
  };

  // Receipt file change handler (converts file to base64)
  const handleReceiptFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setReceiptFileLabel(file.name);
      const reader = new FileReader();
      reader.onload = (event) => {
        setPaymentReceipt(event.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleTrackReceiptFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setTrackReceiptFileLabel(file.name);
      const reader = new FileReader();
      reader.onload = (event) => {
        setTrackPaymentReceipt(event.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Toast helper
  const showToast = (text, type = "info") => {
    setToast({ text, type, show: true });
    setTimeout(() => {
      setToast((prev) => ({ ...prev, show: false }));
    }, 4000);
  };

  // Update dynamic values when Governorate changes
  const handleProvinceChange = (province) => {
    let center = "ديوان المديرية بدمشق";
    if (province !== "دمشق") {
      center = isRtl ? `دائرة حماية الملكية في ${province}` : `Intellectual Property Department in ${province}`;
    }
    setForm((f) => ({ ...f, province, center }));
  };

  // Re-validate every touched field whenever the form changes, so an error
  // clears the moment the user fixes it (not just on next blur).
  useEffect(() => {
    setErrors((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const field of Object.keys(touched)) {
        if (!touched[field]) continue;
        const msg = validateField(field, form);
        if (next[field] !== msg) {
          next[field] = msg;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [form, touched]);

  useEffect(() => {
    if (!imagePreview) return;

    const onKeyDown = (event) => {
      if (event.key === "Escape") setImagePreview(null);
    };

    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [imagePreview]);

  // Submit client application form
  const handleFormSubmit = async (e) => {
    e.preventDefault();

    const fieldErrors = validateAll(form);
    if (Object.keys(fieldErrors).length > 0) {
      setTouched((t) => {
        const next = { ...t };
        Object.keys(fieldErrors).forEach((f) => { next[f] = true; });
        return next;
      });
      setErrors((prev) => ({ ...prev, ...fieldErrors }));
      const firstField = Object.keys(fieldErrors)[0];
      const el = document.getElementById(firstField);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.focus();
      }
      showToast(isRtl ? "يرجى تصحيح الحقول المظلّلة بالأحمر" : "Please fix the highlighted fields", "error");
      return;
    }

    // File uploads validation
    if (workFileLabel === t.fileSelect) {
      showToast(isRtl ? "يرجى رفع ملف العمل الفكري للاستمرار" : "Please upload the work file to proceed", "error");
      return;
    }
    if (idFileFrontLabel === t.fileSelect) {
      if (form.idDocType === "passport") {
        showToast(isRtl ? "يرجى رفع صورة جواز السفر للاستمرار" : "Please upload the passport image to proceed", "error");
      } else {
        showToast(isRtl ? "يرجى رفع صورة الوجه الأمامي للهوية الشخصية للاستمرار" : "Please upload the front face of your ID to proceed", "error");
      }
      return;
    }
    if (form.idDocType !== "passport" && idFileBackLabel === t.fileSelect) {
      showToast(isRtl ? "يرجى رفع صورة الوجه الخلفي للهوية الشخصية للاستمرار" : "Please upload the back face of your ID to proceed", "error");
      return;
    }
    if (form.workCategory === "informational" && telecomFileLabel === t.fileSelect) {
      showToast(isRtl ? "يرجى رفع كتاب مطابقة الهيئة الوطنية لتقانة المعلومات للاستمرار" : "Please upload the NANS compatibility certificate to proceed", "error");
      return;
    }

    // Specific role file validation
    if (form.applicantRole === "representative") {
      if (commercialRegisterLabel === t.fileSelect) {
        showToast(isRtl ? "يرجى رفع السجل التجاري للشركة للاستمرار" : "Please upload the company registry to proceed", "error");
        return;
      }
      if (delegationLabel === t.fileSelect) {
        showToast(isRtl ? "يرجى رفع قرار التفويض للاستمرار" : "Please upload the delegation letter to proceed", "error");
        return;
      }
      if (representativeIdLabel === t.fileSelect) {
        showToast(isRtl ? "يرجى رفع صورة هوية المفوض للاستمرار" : "Please upload the representative ID scan to proceed", "error");
        return;
      }
    } else if (form.applicantRole === "agent") {
      if (roleFileLabel === t.fileSelect) {
        showToast(isRtl ? "يرجى رفع الوكالة القانونية للاستمرار" : "Please upload the power of attorney to proceed", "error");
        return;
      }
      if (originalOwnerIdLabel === t.fileSelect) {
        showToast(isRtl ? "يرجى رفع هوية المالك الأصلي للاستمرار" : "Please upload the original owner's ID to proceed", "error");
        return;
      }
    } else if (form.applicantRole === "heir") {
      if (roleFileLabel === t.fileSelect) {
        showToast(isRtl ? "يرجى رفع وثيقة حصر الإرث للاستمرار" : "Please upload the inheritance certificate to proceed", "error");
        return;
      }
    }

    // Verify joint authors
    if (hasJointAuthors) {
      for (const author of jointAuthors) {
        if (!author.name.trim()) {
          showToast(isRtl ? "يرجى كتابة الاسم لجميع المؤلفين المشتركين" : "Please fill in all joint author names", "error");
          return;
        }
        if (!author.fileFront) {
          showToast(
            author.idDocType === "passport"
              ? (isRtl ? "يرجى إرفاق صورة جواز السفر لكل مؤلف مشترك" : "Please attach a passport image for every joint author")
              : (isRtl ? "يرجى إرفاق صورة الوجه الأمامي للهوية لكل مؤلف مشترك" : "Please attach the ID front face for every joint author"),
            "error"
          );
          return;
        }
        if (author.idDocType !== "passport" && !author.fileBack) {
          showToast(isRtl ? "يرجى إرفاق صورة الوجه الخلفي للهوية لكل مؤلف مشترك" : "Please attach the ID back face for every joint author", "error");
          return;
        }
      }
    }

    const payload = {
      ...form,
      applicantSignature: null,
      hasTelecomDoc: form.workCategory === "informational",
      authors: hasJointAuthors ? jointAuthors : null,
      applicationStatus: "submitted",
      paymentStatus: "pending",
      paymentGateway: "cham_cash",
      commercialRegisterFile,
      delegationFile,
      representativeIdFile,
      originalOwnerIdFile,
      workFile,
      idFileFront,
      idFileBack,
      telecomFile,
      roleFile
    };

    try {
      const res = await fetch("/api/copyright", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setActiveAppId(data.id);
        showToast(t.toastSubmitSuccess, "success");
        setStep(2);
      } else {
        showToast(data.error || "خطأ في تقديم الطلب", "error");
      }
    } catch (err) {
      console.error("Form submit error:", err);
      showToast("حدث خطأ في الشبكة أثناء إرسال الاستمارة", "error");
    }
  };

  // Simulate payment processing (Initial 500 L.S.)
  const handlePaymentSubmit = async () => {
    if (!selectedGateway) {
      showToast(t.toastPaySelect, "error");
      return;
    }

    if (selectedGateway === "cham_cash") {
      if (!paymentRef.trim() || paymentRef.trim().length < 4) {
        handleBlur("paymentRef");
        showToast(isRtl ? "يرجى إدخال رقم مرجع العملية/الحوالة للاستمرار" : "Please enter the transaction reference number", "error");
        return;
      }
      if (!paymentReceipt) {
        showToast(isRtl ? "يرجى رفع صورة إيصال الدفع الإلكتروني للاستمرار" : "Please upload the payment receipt screenshot", "error");
        return;
      }
    }

    showToast(t.toastPayProgress, "info");
    
    try {
      const res = await fetch("/api/copyright", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: activeAppId,
          action: "pay_initial",
          paymentGateway: selectedGateway,
          paymentRef: paymentRef.trim(),
          paymentReceipt: paymentReceipt
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setStep(3);
        setIsProcessingPayment(true);
        setTimeout(() => {
          setIsProcessingPayment(false);
          showToast(isRtl ? "تم تأكيد الدفع وإرسال معاملتك للمراجعة!" : "Payment confirmed! Your request is under review.", "success");
          setTrackCode(activeAppId);
          setTrackedSub(data.submission);
        }, 2500);
      } else {
        showToast("خطأ في قيد الدفع بقاعدة البيانات", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("خطأ بالاتصال بالخادم لإتمام الدفع", "error");
    }
  };

  // Tracker Logic
  const handleTrackSearch = async () => {
    if (!trackCode.trim()) return;
    setLoadingTrack(true);
    setErrorTracker("");
    try {
      const res = await fetch(`/api/copyright?code=${encodeURIComponent(trackCode.trim())}`);
      if (res.ok) {
        const data = await res.json();
        setTrackedSub(data.submission);
      } else {
        setErrorTracker(isRtl ? "لم يتم العثور على معاملة بهذا الرمز، يرجى التأكد وإعادة المحاولة." : "No request found with this code.");
        setTrackedSub(null);
      }
    } catch (err) {
      console.error(err);
      setErrorTracker("حدث خطأ أثناء جلب بيانات التتبع.");
    } finally {
      setLoadingTrack(false);
    }
  };

  const handleTrackPay = async (stage) => {
    if (!trackedSub) return;

    if (!trackPaymentRef.trim() || trackPaymentRef.trim().length < 4) {
      setTrackPaymentRefTouched(true);
      showToast(isRtl ? "يرجى إدخال رقم مرجع العملية/الحوالة للاستمرار" : "Please enter the transaction reference number", "error");
      return;
    }
    if (!trackPaymentReceipt) {
      showToast(isRtl ? "يرجى رفع صورة إيصال الدفع الإلكتروني للاستمرار" : "Please upload the payment receipt screenshot", "error");
      return;
    }

    showToast(t.toastPayProgress, "info");
    
    const action = stage === "initial" ? "pay_initial" : "pay_final";
    try {
      const res = await fetch("/api/copyright", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: trackedSub.id,
          action: action,
          paymentGateway: "cham_cash",
          paymentRef: trackPaymentRef.trim(),
          paymentReceipt: trackPaymentReceipt
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(isRtl ? "تم تأكيد عملية الدفع بنجاح!" : "Payment confirmed successfully!", "success");
        setTrackedSub(data.submission);
        // Clear tracking payment states
        setTrackPaymentRef("");
        setTrackPaymentReceipt(null);
        setTrackReceiptFileLabel(t.fileSelect);
        setTrackPaymentRefTouched(false);
      } else {
        showToast(data.error || "خطأ في معالجة الدفع المالي", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("حدث خطأ بالاتصال بالخادم لتأكيد الدفع", "error");
    }
  };

  const handleTrackResubmit = async () => {
    if (!trackedSub) return;
    try {
      const res = await fetch("/api/copyright", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: trackedSub.id,
          action: "resubmit",
          workFile: workFile || undefined,
          idFileFront: idFileFront || undefined,
          idFileBack: idFileBack || undefined,
          telecomFile: telecomFile || undefined,
          roleFile: roleFile || undefined,
          commercialRegisterFile: commercialRegisterFile || undefined,
          delegationFile: delegationFile || undefined,
          representativeIdFile: representativeIdFile || undefined,
          originalOwnerIdFile: originalOwnerIdFile || undefined
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(isRtl ? "تمت إعادة إرسال المصنف للمراجعة بعد استكمال النواقص" : "Application re-submitted for review", "success");
        setTrackedSub(data.submission);
      } else {
        showToast(data.error || "خطأ أثناء إعادة الإرسال", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("خطأ في الاتصال بالخادم", "error");
    }
  };

  const getStatusTranslationAr = (status) => {
    const mapping = {
      submitted: "مقدم (بانتظار الرسم الأولي)",
      finance_review: "قيد التدقيق المالي للرسم",
      under_review: "قيد الدراسة والتدقيق",
      suspended: "موقوف مؤقتاً للنواقص",
      pending_final_approval: "بانتظار الموافقة النهائية",
      rejected: "مرفوض",
      pending_fees: "بانتظار استكمال الرسوم",
      final_review: "قيد التدقيق المالي النهائي",
      completed: "منجز",
      certificate_issued: "منجز"
    };
    return mapping[status] || status;
  };

  const getCategoryLabel = (cat) => {
    const arMap = {
      written: "نصوص مكتوبة",
      informational: "برمجيات وتطبيقات",
      audio_visual: "صوتيات أو مرئيات",
      fine_arts: "فنون تشكيلية وتصميم",
      folklore: "مأثورات وتراث شعبي",
    };
    const enMap = {
      written: "Written Text",
      informational: "Software & Digital",
      audio_visual: "Audio/Visual",
      fine_arts: "Fine Arts",
      folklore: "Syrian Folklore",
    };
    return isRtl ? (arMap[cat] || cat) : (enMap[cat] || cat);
  };

  const get12StepsTimeline = (currentStatus) => {
    const steps = [
      { key: "submitted", titleAr: "مقدّم للوزارة", titleEn: "Submitted" },
      { key: "finance_review", titleAr: "تدقيق المالية", titleEn: "Finance Review" },
      { key: "under_review", titleAr: "قيد الدراسة والتدقيق", titleEn: "Under Review" },
      { key: "suspended", titleAr: "موقوف للنواقص", titleEn: "Suspended" },
      { key: "pending_final_approval", titleAr: "الموافقة النهائية", titleEn: "Final Approval" },
      { key: "pending_fees", titleAr: "استكمال الرسوم", titleEn: "Pending Fees" },
      { key: "final_review", titleAr: "التدقيق المالي النهائي", titleEn: "Final Finance Review" },
      { key: "completed", titleAr: "منجز", titleEn: "Completed" }
    ];

    // certificate_issued is a legacy alias for the final "completed" state.
    const normalizedStatus = currentStatus === "certificate_issued" ? "completed" : currentStatus;
    const currentIdx = steps.findIndex((s) => s.key === normalizedStatus);

    return steps.map((s, idx) => {
      const active = s.key === normalizedStatus;
      let past = idx <= currentIdx;
      if (currentStatus === "rejected") {
        past = false;
      }
      if (currentStatus === "suspended" && s.key !== "suspended") {
        past = idx < steps.findIndex((st) => st.key === "suspended");
      }
      return {
        ...s,
        active,
        past
      };
    });
  };

  const renderTrackingDashboard = (sub) => {
    if (!sub) return null;
    return (
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-8 relative animate-fade-in-up text-start">
        <DecorativeCorners />
        
        {/* General Info */}
        <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-start">
          <div>
            <h4 className="text-base font-extrabold text-slate-800">{sub.workTitle}</h4>
            <p className="text-xs text-slate-450 mt-0.5 font-bold">
              {isRtl ? `نوع المصنف: ${getCategoryLabel(sub.workCategory)} | مقدم الطلب: ${sub.applicantName}` : `Category: ${getCategoryLabel(sub.workCategory)} | Owner: ${sub.applicantName}`}
            </p>
          </div>
          
          <div className="flex flex-col items-start sm:items-end gap-1.5">
            <span className={`px-3 py-1 rounded-full text-xs font-black border ${
              sub.applicationStatus === "completed" || sub.applicationStatus === "certificate_issued"
                ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                : sub.applicationStatus === "rejected"
                ? "bg-rose-100 text-rose-800 border-rose-200"
                : "bg-amber-100 text-amber-800 border-amber-200"
            }`}>
              {isRtl ? getStatusTranslationAr(sub.applicationStatus) : sub.applicationStatus}
            </span>
            <span className="text-[10px] text-slate-400 font-mono">{sub.id}</span>
          </div>
        </div>

        {/* Timeline */}
        <div className="space-y-4">
          <h5 className="text-xs font-black text-[#054239] uppercase tracking-wider text-start">
            {isRtl ? "مسار معالجة المعاملة الفكرية:" : "Transaction Progress Timeline:"}
          </h5>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-start">
            {get12StepsTimeline(sub.applicationStatus).map((stepItem, idx) => (
              <div key={idx} className={`p-3 rounded-2xl border transition-all ${
                stepItem.active
                  ? "bg-[#054239] text-[#b9a779] border-[#b9a779] shadow-md font-extrabold transform scale-[1.03]"
                  : stepItem.past
                  ? "bg-slate-50 text-emerald-700 border-slate-200/80 font-bold"
                  : "bg-white text-slate-400 border-slate-100"
              }`}>
                <div className="flex justify-between items-center mb-1">
                  <span className={`text-[10px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center ${
                    stepItem.active ? "bg-[#b9a779] text-[#054239]" : stepItem.past ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"
                  }`}>
                    {idx + 1}
                  </span>
                  {stepItem.past && !stepItem.active && <i className="fa-solid fa-circle-check text-xs"></i>}
                </div>
                <p className="text-[10px] sm:text-xs leading-normal">{isRtl ? stepItem.titleAr : stepItem.titleEn}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Conditional Actions */}
        
        {/* 1. Initial Payment */}
        {sub.applicationStatus === "submitted" && sub.paymentStatus === "pending" && (
          <div className="bg-[#054239]/5 border-2 border-[#b9a779]/30 rounded-2xl p-5 space-y-4 text-start">
            <h5 className="text-sm font-extrabold text-[#054239]">{isRtl ? "بانتظار تسديد الرسم المالي الأولي" : "Awaiting Initial Fee Payment"}</h5>
            <p className="text-xs text-slate-655 font-bold leading-normal">
              {isRtl
                ? "يرجى تسديد الرسم الأولي البالغ 550 ل.س لإكمال معاملتك وتحويلها للدارس المختص للمراجعة والتدقيق الفني والقانوني."
                : "Please pay the initial 550 L.S. fee to send your application to the researcher for review."}
            </p>

            <div className="bg-white p-4 rounded-xl border border-slate-200 flex justify-between items-center text-xs">
               <span className="font-extrabold">{isRtl ? "الرسم الأولي المطلوب:" : "Required Initial Fee:"}</span>
              <span className="text-emerald-700 font-black text-sm">500 ل.س (+ 50 ل.س خدمات)</span>
            </div>

            {/* Cham Cash Details */}
            <ChamPaymentCard isRtl={isRtl} showToast={showToast} copyText="f6be4f104cf141af079e7c2af693dd41" />

            {/* Inputs */}
            <div className="space-y-4 border-t border-slate-100 pt-4 bg-white p-4 rounded-xl border border-slate-150">
              <div>
                <label htmlFor="trackPaymentRef" className="block text-sm font-semibold text-slate-700 mb-2">{t.payRefLabel}</label>
                <input id="trackPaymentRef" type="text" value={trackPaymentRef}
                  onChange={(e) => setTrackPaymentRef(e.target.value)}
                  placeholder={t.payRefPlaceholder} dir={trackPaymentRef ? "ltr" : (isRtl ? "rtl" : "ltr")}
                  className={`w-full border rounded-xl px-4 py-3 text-sm outline-none transition bg-white placeholder:text-slate-400 font-mono focus:ring-2 ${
                    trackPaymentRefTouched && (!trackPaymentRef.trim() || trackPaymentRef.trim().length < 4)
                      ? "border-rose-400 focus:border-rose-500 focus:ring-rose-100"
                      : "border-slate-200 focus:border-[#b9a779] focus:ring-[#b9a779]/15"
                  }`} />
                <p className="mt-1.5 text-xs text-slate-400">{t.payRefHint}</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">{t.payReceiptLabel}</label>
                <FileUploadCard icon="fa-file-invoice" label={isRtl ? "رفع إيصال الدفع" : "Upload Receipt"}
                  desc={t.payReceiptDesc} fileLabel={trackReceiptFileLabel}
                  onChange={handleTrackReceiptFileChange} />
                {trackPaymentReceipt && (
                  <div className="mt-3 flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                    {trackPaymentReceipt.startsWith("data:application/pdf") ? (
                      <div className="w-16 h-16 rounded-lg border border-slate-200 bg-white flex flex-col items-center justify-center shrink-0 text-rose-600 gap-1 shadow-sm">
                        <FileText className="w-8 h-8" />
                        <span className="text-[9px] font-black uppercase">PDF</span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setImagePreview({ src: trackPaymentReceipt, title: isRtl ? "إيصال الدفع" : "Payment receipt", downloadName: `receipt_${trackCode || "copyright"}.jpg` })}
                        className="w-16 h-16 rounded-lg border border-slate-200 bg-white overflow-hidden shrink-0 cursor-zoom-in"
                        title={isRtl ? "عرض الإيصال بالحجم الكامل" : "Preview receipt full size"}
                      >
                        <img src={trackPaymentReceipt} alt="Receipt" className="w-full h-full object-contain" />
                      </button>
                    )}
                    <div className="flex-1">
                      <p className="text-xs text-emerald-700 font-bold">{isRtl ? "✓ تم رفع الإيصال" : "✓ Receipt uploaded"}</p>
                      <button type="button" onClick={() => { setTrackPaymentReceipt(null); setTrackReceiptFileLabel(t.fileSelect); }}
                        className="text-xs text-rose-500 hover:text-rose-700 mt-1 cursor-pointer font-medium">{isRtl ? "حذف" : "Remove"}</button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <button onClick={() => handleTrackPay("initial")}
              className="w-full bg-[#054239] hover:bg-[#04332b] text-white font-bold py-3 rounded-xl transition shadow active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span>{t.btnPay}</span>
            </button>
          </div>
        )}

        {/* 2. Suspended for Gaps */}
        {sub.applicationStatus === "suspended" && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5 space-y-4 text-start">
            <h5 className="text-sm font-extrabold text-rose-800">{isRtl ? "المعاملة موقوفة مؤقتاً لاستكمال النواقص" : "Transaction Suspended for Gaps"}</h5>
            <p className="text-xs text-rose-900 font-bold leading-normal">
              {isRtl
                ? "أشار المراجع القانوني بوجود نقص في الطلب أو الوثائق المرفقة. يرجى إعادة رفع المرفقات بشكل سليم والضغط على تأكيد المراجعة بالأسفل."
                : "The reviewer found deficiencies. Please re-upload documents and click Submit Update below."}
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="border border-slate-200 hover:border-[#b9a779]/40 rounded-xl p-3 bg-white text-center space-y-2 transition-all">
                <h5 className="text-[11px] font-bold text-slate-800">{t.fileWorkLabel}</h5>
                <div className="relative mt-1">
                  <input
                    type="file"
                    onChange={(e) => handleBase64FileChange(e, setWorkFileLabel, setWorkFile)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <span className="block bg-slate-50 border border-slate-250 text-slate-750 text-[10px] font-bold px-2 py-1 rounded-lg hover:bg-slate-100 transition truncate">
                    {workFileLabel}
                  </span>
                </div>
              </div>
              <div className="border border-slate-200 hover:border-[#b9a779]/40 rounded-xl p-3 bg-white text-center space-y-2 transition-all">
                <h5 className="text-[11px] font-bold text-slate-800">{sub.idDocType === "passport" ? (isRtl ? "صورة جواز السفر *" : "Passport *") : (isRtl ? "وجه الهوية الأمامي *" : "ID Front Face *")}</h5>
                <div className="relative mt-1">
                  <input
                    type="file"
                    onChange={(e) => handleBase64FileChange(e, setIdFileFrontLabel, setIdFileFront)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <span className="block bg-slate-50 border border-slate-250 text-slate-750 text-[10px] font-bold px-2 py-1 rounded-lg hover:bg-slate-100 transition truncate">
                    {idFileFrontLabel}
                  </span>
                </div>
              </div>
              {sub.idDocType !== "passport" && (
              <div className="border border-slate-200 hover:border-[#b9a779]/40 rounded-xl p-3 bg-white text-center space-y-2 transition-all">
                <h5 className="text-[11px] font-bold text-slate-800">{isRtl ? "وجه الهوية الخلفي *" : "ID Back Face *"}</h5>
                <div className="relative mt-1">
                  <input
                    type="file"
                    onChange={(e) => handleBase64FileChange(e, setIdFileBackLabel, setIdFileBack)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <span className="block bg-slate-50 border border-slate-250 text-slate-750 text-[10px] font-bold px-2 py-1 rounded-lg hover:bg-slate-100 transition truncate">
                    {idFileBackLabel}
                  </span>
                </div>
              </div>
              )}
            </div>

            <button
              onClick={handleTrackResubmit}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-6 py-3 rounded-xl transition shadow active:scale-95 cursor-pointer"
            >
              {isRtl ? "إعادة إرسال الملف المستكمل" : "Re-submit Completed Files"}
            </button>
          </div>
        )}

        {/* 3. Final Payment */}
        {sub.applicationStatus === "pending_fees" && (
          <div className="bg-[#054239]/5 border-2 border-[#b9a779]/30 rounded-2xl p-5 space-y-4 text-start">
            <h5 className="text-sm font-extrabold text-[#054239]">{isRtl ? "الموافقة الإدارية صادرة: بانتظار استكمال الرسوم" : "Administrative Approval Granted: Awaiting Fees"}</h5>
            <p className="text-xs text-slate-655 font-bold leading-normal">
              {isRtl
                ? "تهانينا! صدرت الموافقة الرسمية على منح الحماية لمصنفك. يرجى تسديد الشطر الثاني النهائي من الرسوم البالغ 500 ل.س لتوليد وإصدار شهادة حماية حقوق المؤلف رسمياً."
                : "Congratulations! Approval granted. Please pay the remaining 500 L.S. fee to issue your certificate."}
            </p>
            
            <div className="bg-white p-4 rounded-xl border border-slate-200 flex justify-between items-center text-xs">
              <span className="font-extrabold">{isRtl ? "الرسم النهائي المطلوب لاستكمال الـ 1,000 ل.س:" : "Required Final Fee (completing 1k):"}</span>
              <span className="text-emerald-700 font-black text-sm">500 ل.س (+ 50 ل.س طوابع إلكترونية)</span>
            </div>

            {/* Cham Cash Details */}
            <ChamPaymentCard isRtl={isRtl} showToast={showToast} copyText="f6be4f104cf141af079e7c2af693dd41" />

            {/* Inputs */}
            <div className="space-y-4 border-t border-slate-100 pt-4 bg-white p-4 rounded-xl border border-slate-150">
              <div>
                <label htmlFor="trackPaymentRef" className="block text-sm font-semibold text-slate-700 mb-2">{t.payRefLabel}</label>
                <input id="trackPaymentRef" type="text" value={trackPaymentRef}
                  onChange={(e) => setTrackPaymentRef(e.target.value)}
                  placeholder={t.payRefPlaceholder} dir={trackPaymentRef ? "ltr" : (isRtl ? "rtl" : "ltr")}
                  className={`w-full border rounded-xl px-4 py-3 text-sm outline-none transition bg-white placeholder:text-slate-400 font-mono focus:ring-2 ${
                    trackPaymentRefTouched && (!trackPaymentRef.trim() || trackPaymentRef.trim().length < 4)
                      ? "border-rose-400 focus:border-rose-500 focus:ring-rose-100"
                      : "border-slate-200 focus:border-[#b9a779] focus:ring-[#b9a779]/15"
                  }`} />
                <p className="mt-1.5 text-xs text-slate-400">{t.payRefHint}</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">{t.payReceiptLabel}</label>
                <FileUploadCard icon="fa-file-invoice" label={isRtl ? "رفع إيصال الدفع" : "Upload Receipt"}
                  desc={t.payReceiptDesc} fileLabel={trackReceiptFileLabel}
                  onChange={handleTrackReceiptFileChange} />
                {trackPaymentReceipt && (
                  <div className="mt-3 flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                    {trackPaymentReceipt.startsWith("data:application/pdf") ? (
                      <div className="w-16 h-16 rounded-lg border border-slate-200 bg-white flex flex-col items-center justify-center shrink-0 text-rose-600 gap-1 shadow-sm">
                        <FileText className="w-8 h-8" />
                        <span className="text-[9px] font-black uppercase">PDF</span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setImagePreview({ src: trackPaymentReceipt, title: isRtl ? "إيصال الدفع النهائي" : "Final payment receipt", downloadName: `final_receipt_${trackCode || "copyright"}.jpg` })}
                        className="w-16 h-16 rounded-lg border border-slate-200 bg-white overflow-hidden shrink-0 cursor-zoom-in"
                        title={isRtl ? "عرض الإيصال بالحجم الكامل" : "Preview receipt full size"}
                      >
                        <img src={trackPaymentReceipt} alt="Receipt" className="w-full h-full object-contain" />
                      </button>
                    )}
                    <div className="flex-1">
                      <p className="text-xs text-emerald-700 font-bold">{isRtl ? "✓ تم رفع الإيصال" : "✓ Receipt uploaded"}</p>
                      <button type="button" onClick={() => { setTrackPaymentReceipt(null); setTrackReceiptFileLabel(t.fileSelect); }}
                        className="text-xs text-rose-500 hover:text-rose-700 mt-1 cursor-pointer font-medium">{isRtl ? "حذف" : "Remove"}</button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <button onClick={() => handleTrackPay("final")}
              className="w-full bg-[#054239] hover:bg-[#04332b] text-white font-bold py-3 rounded-xl transition shadow active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span>{isRtl ? "تسديد الرسم النهائي (550 ل.س)" : "Pay Final Fee (550 L.S.)"}</span>
            </button>
          </div>
        )}

        {/* 5. Completed */}
        {(sub.applicationStatus === "completed" || sub.applicationStatus === "certificate_issued") && (
          <div className="pt-2">
            <div className="bg-emerald-100/50 border border-emerald-200 p-4 rounded-xl flex items-center justify-between gap-4 mb-5 text-start">
              <span className="text-emerald-700 text-xs font-bold">{isRtl ? "شهادة الحماية جاهزة للطباعة والعرض أصولاً" : "Copyright Certificate Ready for Print"}</span>
              <button
                onClick={() => {
                  setForm({
                    applicantName: sub.applicantName,
                    applicantPhone: sub.applicantPhone,
                    applicantEmail: sub.applicantEmail,
                    applicantRole: sub.applicantRole,
                    workTitle: sub.workTitle,
                    workCategory: sub.workCategory,
                    workDesc: sub.workDesc,
                    province: sub.province,
                    center: sub.center,
                    completionDate: sub.completionDate,
                    hasTelecomDoc: sub.hasTelecomDoc,
                    authors: sub.authors
                  });
                  setActiveAppId(sub.id);
                  setStep(4);
                  setPortal("applicant");
                }}
                className="bg-[#054239] hover:bg-[#04332b] text-white text-xs font-bold px-4 py-2 rounded-xl transition shadow active:scale-95 cursor-pointer"
              >
                {isRtl ? "فتح وعرض الشهادة الرسمية" : "Open Certificate"}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  // File upload card helper
  const FileUploadCard = ({ icon, label, desc, fileLabel, onChange, required: isRequired, highlight }) => (
    <div className={`group relative rounded-2xl p-5 border transition-all cursor-pointer focus-within:ring-2 focus-within:ring-[#b9a779]/40 focus-within:border-[#b9a779] ${highlight ? "border-amber-300 bg-amber-50/60" : "border-slate-200 bg-white hover:border-[#b9a779]/50"}`}>
      <div className="flex items-start gap-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${highlight ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}`}>
          <i className={`fa-solid ${icon} text-sm`}></i>
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-bold ${highlight ? "text-amber-900" : "text-slate-800"}`}>{label}</p>
          {desc && <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{desc}</p>}
          <span className={`mt-2 inline-block text-[11px] font-semibold px-3 py-1.5 rounded-lg truncate max-w-full ${fileLabel && fileLabel !== (locale === "ar" ? "اختر الملف" : "Choose file from your device") ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-50 text-slate-500 border border-slate-200"}`}>
            {fileLabel && fileLabel !== (locale === "ar" ? "اختر الملف" : "Choose file from your device") ? `✓ ${fileLabel}` : (isRtl ? "انقر لاختيار ملف" : "Click to select file")}
          </span>
        </div>
      </div>
      <input type="file" required={false} onChange={onChange} aria-label={label} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
    </div>
  );

  return (
    <div className="relative flex flex-col w-full min-h-screen bg-[#F8F3EC] pt-[84px] md:pt-[88px] lg:pt-[104px]" dir={isRtl ? "rtl" : "ltr"}>
      {imagePreview && createPortal(
        <div
          className="fixed inset-0 z-[9999] bg-slate-950/90 backdrop-blur-sm flex flex-col p-3 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label={imagePreview.title || (isRtl ? "عرض الصورة بالحجم الكامل" : "Full-size image preview")}
          onClick={() => setImagePreview(null)}
        >
          <div className="flex items-center justify-between gap-3 text-white pb-3">
            <div className="min-w-0">
              <p className="text-sm sm:text-base font-bold truncate">{imagePreview.title}</p>
              <p className="text-[11px] text-white/60">
                {isRtl ? "انقر خارج الصورة أو اضغط Esc للإغلاق" : "Click outside the image or press Esc to close"}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <a
                href={imagePreview.src}
                download={imagePreview.downloadName}
                className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 flex items-center justify-center transition"
                title={isRtl ? "تحميل الصورة" : "Download image"}
                onClick={(event) => event.stopPropagation()}
              >
                <Download className="w-4 h-4" />
              </a>
              <button
                type="button"
                onClick={() => setImagePreview(null)}
                className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 flex items-center justify-center transition cursor-pointer"
                title={isRtl ? "إغلاق" : "Close"}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className="flex-1 min-h-0 flex items-center justify-center" onClick={(event) => event.stopPropagation()}>
            <img
              src={imagePreview.src}
              alt={imagePreview.title || "receipt preview"}
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl bg-white"
            />
          </div>
        </div>,
        document.body
      )}

      {/* ── Hero ── */}
      <section className="relative py-20 px-4 overflow-hidden border-b border-[#b9a779]/15">
        <div className="absolute inset-0 z-0">
          <Image
            src="/images/drive-photos/Khan-Asad-Basha.jpg"
            alt="copyright background"
            fill
            priority
            className="object-cover brightness-[0.2] saturate-[0.7]"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#002723]/90 via-[#002723]/75 to-[#002723]" />
        </div>
        <div className="max-w-4xl mx-auto text-center relative z-10 flex flex-col items-center gap-3">
          <span className="text-[10px] uppercase text-[#b9a779] font-bold tracking-widest border border-[#b9a779]/30 rounded-full px-4 py-1 bg-[#b9a779]/5">
            {t.decree}
          </span>
          <h1 className="text-white font-extrabold text-3xl sm:text-4xl lg:text-5xl font-qomra">
            {t.title}
          </h1>
          <div className="w-16 h-[2.5px] bg-[#b9a779] mt-1" />
          <p className="text-slate-300 text-sm max-w-xl leading-relaxed">
            {t.subtitle}
          </p>

          {/* Step indicator */}
          {portal === "applicant" && step < 4 && (
            <div className="flex flex-col md:flex-row items-center justify-center gap-3 mt-4">
              {[1, 2, 3].map((s) => (
                <div key={s} className="flex items-center gap-3">
                  <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs font-bold transition-all ${
                    step === s
                      ? "bg-[#b9a779] text-[#054239] border-[#b9a779]"
                      : step > s
                        ? "bg-[#1C665A]/30 text-[#b9a779] border-[#1C665A]/40"
                        : "bg-white/10 text-slate-400 border-white/15"
                  }`}>
                    <span className={`w-4 h-4 rounded-full text-[10px] flex items-center justify-center ${
                      step === s ? "bg-[#054239] text-white" : step > s ? "bg-[#b9a779] text-white" : "bg-white/20 text-white/50"
                    }`}>{s}</span>
                    {s === 1 ? t.step1 : s === 2 ? t.step2 : t.step3}
                  </div>
                  {s < 3 && <div className="hidden md:block w-8 h-px bg-white/20" />}
                </div>
              ))}
            </div>
          )}

          {portal === "applicant" && step === 4 && (
            <div className="mt-4 inline-flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/30 px-5 py-2.5 rounded-full text-emerald-400 text-sm font-bold shadow-md animate-fade-in-up font-qomra">
              <span className="w-5 h-5 rounded-full bg-emerald-500 text-[#054239] flex items-center justify-center text-xs font-black">✓</span>
              <span>{t.step4}</span>
            </div>
          )}

          {/* Contextual nav link */}
          <div className="mt-8 font-qomra">
            {portal === "applicant" && step < 4 && (
              <button onClick={() => { setPortal("tracker"); setTrackedSub(null); setErrorTracker(""); }}
                className="text-white/40 hover:text-[#b9a779] text-xs font-semibold transition-colors duration-200 pointer-events-auto cursor-pointer flex items-center gap-1.5 mx-auto border border-white/10 hover:border-[#b9a779]/30 px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 font-qomra font-bold">
                <Clock className="w-3.5 h-3.5" />
                <span>{isRtl ? "تبحث عن معاملة سابقة؟ تتبع طلبك من هنا" : "Looking for a previous request? Track here"}</span>
              </button>
            )}
            {portal === "tracker" && (
              <button onClick={() => { setPortal("applicant"); setStep(1); }}
                className="text-white/40 hover:text-[#b9a779] text-xs font-semibold transition-colors duration-200 pointer-events-auto cursor-pointer flex items-center gap-1.5 mx-auto border border-white/10 hover:border-[#b9a779]/30 px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 font-qomra font-bold">
                <FileText className="w-3.5 h-3.5" />
                <span>{isRtl ? "تقديم معاملة جديدة؟ اضغط هنا" : "Submit a new request? Click here"}</span>
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ── Toast ── */}
      {toast.show && (
        <div
          role="status"
          aria-live={toast.type === "error" ? "assertive" : "polite"}
          className={`fixed bottom-6 ${isRtl ? "right-4" : "left-4"} z-50 max-w-sm w-full px-5 py-4 rounded-2xl shadow-2xl text-sm font-semibold flex items-center gap-3 transition-all animate-fade-in print:hidden ${
            toast.type === "success" ? "bg-emerald-600 text-white" : toast.type === "error" ? "bg-rose-600 text-white" : "bg-slate-800 text-white"
          }`}>
          <span>{toast.type === "success" ? "✓" : toast.type === "error" ? "✕" : "ℹ"}</span>
          <span>{toast.text}</span>
        </div>
      )}

      {/* ── Main Content ── */}
      <main className="max-w-4xl mx-auto w-full px-4 sm:px-6 py-12 flex-grow relative z-10">

        {/* ─────────────────────────────── APPLICANT PORTAL ─────────────────────────────── */}
        {portal === "applicant" && (

          <div className="space-y-6">

            {/* ── STEP 1: Form ── */}
            {step === 1 && (
              <form onSubmit={handleFormSubmit} noValidate className="space-y-8 text-start print:hidden animate-fade-in-up">

                {/* Legal note accordion (compact, non-intrusive) */}
                <div className={`bg-white rounded-3xl border transition-all duration-300 overflow-hidden relative ${
                  activeLawTab === "open" ? "shadow-md border-[#b9a779]/40" : "shadow-sm border-[#b9a779]/20"
                }`}>
                  <button
                    type="button"
                    onClick={() => setActiveLawTab(activeLawTab === "open" ? "" : "open")}
                    className={`w-full px-8 py-5 flex items-center justify-between text-sm font-bold transition-all duration-200 cursor-pointer ${
                      activeLawTab === "open" ? "bg-[#054239]/5 text-[#054239]" : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-xl bg-[#054239]/10 flex items-center justify-center text-[#054239] shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" /></svg>
                      </span>
                      <span className="font-extrabold">{t.termsTitle}</span>
                    </span>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${activeLawTab === "open" ? "rotate-180 text-[#054239]" : ""}`}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
                  </button>
                  {activeLawTab === "open" && (
                    <div className="px-8 pb-8 pt-4 space-y-4 border-t border-[#b9a779]/15 bg-slate-50/30">
                      {DECREE_LAW_TEXT[locale].map((sec) => (
                        <div key={sec.id} className="p-5 rounded-2xl bg-white border border-[#b9a779]/10 space-y-2 shadow-2xs hover:border-[#b9a779]/20 transition duration-200">
                          <p className="text-xs font-black text-[#054239] flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#b9a779] shrink-0" />
                            {sec.title}
                          </p>
                          <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line pr-3.5 rtl:pl-3.5 ltr:pl-3.5">{sec.content}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Section 1: Contact */}
                <div className="bg-white rounded-3xl border border-[#b9a779]/20 shadow-sm relative z-10">
                  <DecorativeCorners />
                  <div className="bg-[#054239]/5 border-b border-[#b9a779]/15 px-8 sm:px-12 py-5 flex items-center gap-3 rounded-t-3xl">
                    <span className="w-7 h-7 rounded-full bg-[#b9a779] text-white text-xs font-black flex items-center justify-center shrink-0">1</span>
                    <h2 className="font-extrabold text-[#054239] text-sm">{t.section1}</h2>
                  </div>
                  <div className="px-8 sm:px-12 pb-8 sm:pb-12 pt-6 space-y-5">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label htmlFor="applicantName" className="text-sm font-semibold text-slate-700">{t.nameLabel}</label>
                        <Tooltip text={isRtl ? "يرجى كتابة الاسم الرباعي كما هو وارد في هويتك الشخصية." : "Full name exactly as on your national ID."} />
                      </div>
                      <input id="applicantName" type="text" required value={form.applicantName}
                        onChange={(e) => setForm((f) => ({ ...f, applicantName: e.target.value }))}
                        onBlur={() => handleBlur("applicantName")}
                        aria-invalid={!!fieldError("applicantName")}
                        aria-describedby={fieldError("applicantName") ? "applicantName-error" : undefined}
                        placeholder={t.namePlaceholder}
                        className={fieldClass("applicantName", "w-full border rounded-xl px-4 py-3 text-sm outline-none transition bg-white placeholder:text-slate-400 focus:ring-2")} />
                      <FieldErrorText id="applicantName-error" message={fieldError("applicantName")} />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label htmlFor="applicantPhone" className="text-sm font-semibold text-slate-700">{t.phoneLabel}</label>
                          <Tooltip text={isRtl ? "رقم هاتفك مع رمز البلد، مثال: +963 أو +90." : "Your phone number with country code, e.g. +963 or +90."} />
                        </div>
                        <input id="applicantPhone" type="tel" required value={form.applicantPhone}
                          onChange={(e) => setForm((f) => ({ ...f, applicantPhone: e.target.value }))}
                          onBlur={() => handleBlur("applicantPhone")}
                          aria-invalid={!!fieldError("applicantPhone")}
                          aria-describedby={fieldError("applicantPhone") ? "applicantPhone-error" : undefined}
                          placeholder={t.phonePlaceholder} dir={form.applicantPhone ? "ltr" : "rtl"}
                          className={fieldClass("applicantPhone", `w-full border rounded-xl px-4 py-3 text-sm outline-none transition bg-white placeholder:text-slate-400 focus:ring-2 ${form.applicantPhone ? "font-mono" : ""}`)} />
                        <FieldErrorText id="applicantPhone-error" message={fieldError("applicantPhone")} />
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label htmlFor="applicantEmail" className="text-sm font-semibold text-slate-700">{t.emailLabel}</label>
                          <Tooltip text={isRtl ? "سنرسل لك الشهادة الرقمية على هذا البريد." : "We will send your certificate to this email."} />
                        </div>
                        <input id="applicantEmail" type="email" required value={form.applicantEmail}
                          onChange={(e) => setForm((f) => ({ ...f, applicantEmail: e.target.value }))}
                          onBlur={() => handleBlur("applicantEmail")}
                          aria-invalid={!!fieldError("applicantEmail")}
                          aria-describedby={fieldError("applicantEmail") ? "applicantEmail-error" : undefined}
                          placeholder={t.emailPlaceholder} dir="ltr"
                          className={fieldClass("applicantEmail", "w-full border rounded-xl px-4 py-3 text-sm outline-none transition bg-white placeholder:text-slate-400 focus:ring-2")} />
                        <FieldErrorText id="applicantEmail-error" message={fieldError("applicantEmail")} />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-semibold text-slate-700">{t.roleLabel}</label>
                        <Tooltip text={isRtl ? "حدد صفتك لمعرفة الوثائق المطلوبة." : "Select your capacity to determine required documents."} />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {[
                          { val: "author", label: t.roleAuthor },
                          { val: "agent", label: t.roleAgent },
                          { val: "heir", label: t.roleHeir },
                          { val: "representative", label: t.roleRep },
                        ].map((item) => (
                          <label key={item.val} className={`flex items-center gap-3 border rounded-xl px-4 py-3 cursor-pointer transition-all focus-within:ring-2 focus-within:ring-[#b9a779]/40 ${
                            form.applicantRole === item.val
                              ? "border-[#b9a779] bg-[#b9a779]/8 text-[#054239]"
                              : "border-slate-200 hover:border-slate-300 text-slate-600"
                          }`}>
                            <input type="radio" name="applicantRole" value={item.val}
                              checked={form.applicantRole === item.val}
                              onChange={() => setForm((f) => ({ ...f, applicantRole: item.val }))}
                              className="accent-[#b9a779]" />
                            <span className="text-sm font-bold">{item.label}</span>
                          </label>
                        ))}
                      </div>
                      {form.applicantRole !== "author" && (
                        <p className="mt-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 font-bold">
                          {t.roleExtraDetails}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Joint Authors (if author) */}
                {form.applicantRole === "author" && (
                  <div className="bg-white rounded-3xl border border-[#b9a779]/20 shadow-sm overflow-hidden relative p-8">
                    <DecorativeCorners />
                    <label className="flex items-center gap-3 cursor-pointer select-none">
                      <input type="checkbox" checked={hasJointAuthors}
                        onChange={(e) => { setHasJointAuthors(e.target.checked); if (e.target.checked && jointAuthors.length === 0) setJointAuthors([makeJointAuthor()]); }}
                        className="w-5 h-5 accent-[#b9a779] rounded" />
                      <span className="text-sm font-extrabold text-[#054239]">
                        {isRtl ? "هل هناك مؤلفون مشتركون للمصنف؟" : "Are there joint authors for this work?"}
                      </span>
                    </label>
                    {hasJointAuthors && (
                      <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
                        {jointAuthors.map((author, index) => (
                          <div key={author.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3 relative">
                            <button type="button" onClick={() => {
                              const updated = jointAuthors.filter((a) => a.id !== author.id);
                              setJointAuthors(updated);
                              if (updated.length === 0) {
                                setHasJointAuthors(false);
                              }
                            }}
                              className="absolute top-4 rtl:left-4 ltr:right-4 text-rose-500 hover:text-rose-700 hover:bg-rose-50 p-1.5 rounded-lg transition cursor-pointer flex items-center justify-center border border-transparent hover:border-rose-100"
                              title={isRtl ? "إزالة المؤلف" : "Remove Author"}>
                              <Trash2 className="w-4.5 h-4.5" />
                            </button>
                            <p className="text-xs font-bold text-slate-605">{isRtl ? `المؤلف المشترك ${index + 1}` : `Joint Author ${index + 1}`}</p>
                            <input type="text" required value={author.name}
                              onChange={(e) => { const u = [...jointAuthors]; u[index].name = e.target.value; setJointAuthors(u); }}
                              placeholder={isRtl ? "الاسم الرباعي الكامل" : "Full Name"}
                              className="w-full border border-slate-200 focus:border-[#b9a779] focus:ring-2 focus:ring-[#b9a779]/15 rounded-xl px-4 py-2.5 text-sm outline-none transition bg-white" />

                            {/* Identity document type: national ID (two faces) or passport (single data page) */}
                            <div className="rounded-xl border border-slate-200 bg-white p-3">
                              <div className="flex items-center gap-2 mb-2.5">
                                <i className="fa-solid fa-id-card text-[#b9a779] text-sm" />
                                <span className="text-xs font-extrabold text-[#054239]">{isRtl ? "هوية المؤلف المشترك *" : "Joint Author ID *"}</span>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                {[
                                  { val: "national_id", label: isRtl ? "بطاقة الهوية الشخصية" : "National ID Card" },
                                  { val: "passport", label: isRtl ? "جواز السفر" : "Passport" },
                                ].map((item) => (
                                  <label key={item.val} className={`flex items-center gap-3 border rounded-xl px-4 py-2.5 cursor-pointer transition-all ${
                                    author.idDocType === item.val
                                      ? "border-[#b9a779] bg-[#b9a779]/8 text-[#054239]"
                                      : "border-slate-200 bg-white hover:border-slate-300 text-slate-600"
                                  }`}>
                                    <input type="radio" name={`jointIdDocType-${author.id}`} value={item.val}
                                      checked={author.idDocType === item.val}
                                      onChange={() => {
                                        // A passport is a single page — clear any previously chosen ID back
                                        // face so a stale file isn't submitted alongside it.
                                        setJointAuthors((prev) => prev.map((a, i) => (i === index
                                          ? { ...a, idDocType: item.val, ...(item.val === "passport" ? { fileBack: null, fileBackLabel: t.fileSelect } : {}) }
                                          : a)));
                                      }}
                                      className="accent-[#b9a779]" />
                                    <span className="text-sm font-bold">{item.label}</span>
                                  </label>
                                ))}
                              </div>
                            </div>

                            {author.idDocType === "passport" ? (
                              <FileUploadCard icon="fa-passport"
                                label={isRtl ? "صورة جواز السفر *" : "Passport *"}
                                desc={isRtl ? "صورة واضحة لصفحة البيانات في جواز السفر." : "Clear photo of the passport data page."}
                                fileLabel={author.fileFrontLabel} required
                                onChange={(e) => handleJointAuthorFileChange(e, index, "fileFront", "fileFrontLabel")} />
                            ) : (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <FileUploadCard icon="fa-address-card"
                                  label={isRtl ? "وجه الهوية الأمامي *" : "ID Front Face *"}
                                  desc={isRtl ? "صورة واضحة للوجه الأمامي لبطاقة الهوية." : "Clear photo of the ID front face."}
                                  fileLabel={author.fileFrontLabel} required
                                  onChange={(e) => handleJointAuthorFileChange(e, index, "fileFront", "fileFrontLabel")} />
                                <FileUploadCard icon="fa-address-card"
                                  label={isRtl ? "وجه الهوية الخلفي *" : "ID Back Face *"}
                                  desc={isRtl ? "صورة واضحة للوجه الخلفي لبطاقة الهوية." : "Clear photo of the ID back face."}
                                  fileLabel={author.fileBackLabel} required
                                  onChange={(e) => handleJointAuthorFileChange(e, index, "fileBack", "fileBackLabel")} />
                              </div>
                            )}
                          </div>
                        ))}
                        <button type="button"
                          onClick={() => setJointAuthors([...jointAuthors, makeJointAuthor()])}
                          className="text-[#054239] text-xs font-bold hover:text-[#b9a779] transition flex items-center gap-1.5 cursor-pointer mt-1">
                          <Plus className="w-3.5 h-3.5" />
                          <span>{isRtl ? "إضافة مؤلف آخر" : "Add Another Author"}</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Section 2: Work Details */}
                <div className="bg-white rounded-3xl border border-[#b9a779]/20 shadow-sm relative z-10">
                  <DecorativeCorners />
                  <div className="bg-[#054239]/5 border-b border-[#b9a779]/15 px-8 sm:px-12 py-5 flex items-center gap-3 rounded-t-3xl">
                    <span className="w-7 h-7 rounded-full bg-[#b9a779] text-white text-xs font-black flex items-center justify-center shrink-0">2</span>
                    <h2 className="font-extrabold text-[#054239] text-sm">{t.section2}</h2>
                  </div>
                  <div className="px-8 sm:px-12 pb-8 sm:pb-12 pt-6 space-y-5">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label htmlFor="workTitle" className="text-sm font-semibold text-slate-700">{t.workTitleLabel}</label>
                        <Tooltip text={isRtl ? "اسم كتابك أو الأغنية أو التطبيق." : "Title of your book, song, or app."} />
                      </div>
                      <input id="workTitle" type="text" required value={form.workTitle}
                        onChange={(e) => setForm((f) => ({ ...f, workTitle: e.target.value }))}
                        onBlur={() => handleBlur("workTitle")}
                        aria-invalid={!!fieldError("workTitle")}
                        aria-describedby={fieldError("workTitle") ? "workTitle-error" : undefined}
                        placeholder={t.workTitlePlaceholder}
                        className={fieldClass("workTitle", "w-full border rounded-xl px-4 py-3 text-sm outline-none transition bg-white placeholder:text-slate-400 focus:ring-2")} />
                      <FieldErrorText id="workTitle-error" message={fieldError("workTitle")} />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label htmlFor="workCategory" className="text-sm font-semibold text-slate-700">{t.categoryLabel}</label>
                          <Tooltip text={isRtl ? "اختر التصنيف الأدق." : "Choose the most accurate category."} />
                        </div>
                        <select id="workCategory" value={form.workCategory}
                          onChange={(e) => setForm((f) => ({ ...f, workCategory: e.target.value }))}
                          className={`w-full border border-slate-200 focus:border-[#b9a779] focus:ring-2 focus:ring-[#b9a779]/15 rounded-xl px-4 py-3 text-sm outline-none transition bg-white text-slate-800 font-bold ${isRtl ? "font-qomra" : "font-inter"}`}>
                          <option value="written">{t.catWritten}</option>
                          <option value="informational">{t.catInfo}</option>
                          <option value="audio_visual">{t.catAudio}</option>
                          <option value="fine_arts">{t.catArts}</option>
                          <option value="folklore">{t.catFolklore}</option>
                        </select>
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label htmlFor="workOrigin" className="text-sm font-semibold text-slate-700">{t.originLabel}</label>
                          <Tooltip text={isRtl ? "هل العمل مبتكر بالكامل؟" : "Is this work entirely original?"} />
                        </div>
                        <select id="workOrigin" value={form.workOrigin}
                          onChange={(e) => setForm((f) => ({ ...f, workOrigin: e.target.value }))}
                          className={`w-full border border-slate-200 focus:border-[#b9a779] focus:ring-2 focus:ring-[#b9a779]/15 rounded-xl px-4 py-3 text-sm outline-none transition bg-white text-slate-800 font-bold ${isRtl ? "font-qomra" : "font-inter"}`}>
                          <option value="original">{t.origOriginal}</option>
                          <option value="derived">{t.origDerived}</option>
                        </select>
                      </div>
                    </div>
                    {form.workOrigin === "derived" && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                        <div>
                          <label htmlFor="originalWorkName" className="block text-sm font-semibold text-slate-700 mb-2">{t.origNameLabel}</label>
                          <input id="originalWorkName" type="text" required value={form.originalWorkName}
                            onChange={(e) => setForm((f) => ({ ...f, originalWorkName: e.target.value }))}
                            onBlur={() => handleBlur("originalWorkName")}
                            aria-invalid={!!fieldError("originalWorkName")}
                            aria-describedby={fieldError("originalWorkName") ? "originalWorkName-error" : undefined}
                            className={fieldClass("originalWorkName", "w-full border rounded-xl px-4 py-2.5 text-sm outline-none transition bg-white focus:ring-2")} />
                          <FieldErrorText id="originalWorkName-error" message={fieldError("originalWorkName")} />
                        </div>
                        <div>
                          <label htmlFor="originalPermission" className="block text-sm font-semibold text-slate-700 mb-2">{t.origPermLabel}</label>
                          <input id="originalPermission" type="text" required value={form.originalPermission}
                            onChange={(e) => setForm((f) => ({ ...f, originalPermission: e.target.value }))}
                            onBlur={() => handleBlur("originalPermission")}
                            aria-invalid={!!fieldError("originalPermission")}
                            aria-describedby={fieldError("originalPermission") ? "originalPermission-error" : undefined}
                            className={fieldClass("originalPermission", "w-full border rounded-xl px-4 py-2.5 text-sm outline-none transition bg-white focus:ring-2")} />
                          <FieldErrorText id="originalPermission-error" message={fieldError("originalPermission")} />
                        </div>
                      </div>
                    )}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label htmlFor="workDesc" className="text-sm font-semibold text-slate-700">{t.descLabel}</label>
                        <Tooltip text={isRtl ? "اكتب عن فكرة العمل وميزاته." : "Write about your work and its features."} />
                      </div>
                      <textarea id="workDesc" required rows={4} value={form.workDesc}
                        onChange={(e) => setForm((f) => ({ ...f, workDesc: e.target.value }))}
                        onBlur={() => handleBlur("workDesc")}
                        aria-invalid={!!fieldError("workDesc")}
                        aria-describedby={fieldError("workDesc") ? "workDesc-error" : undefined}
                        placeholder={t.descPlaceholder}
                        className={fieldClass("workDesc", "w-full border rounded-xl px-4 py-3 text-sm outline-none transition bg-white resize-none placeholder:text-slate-400 focus:ring-2")} />
                      <FieldErrorText id="workDesc-error" message={fieldError("workDesc")} />
                    </div>
                  </div>
                </div>

                {/* Section 3: Time & Place */}
                <div className="bg-white rounded-3xl border border-[#b9a779]/20 shadow-sm relative z-20">
                  <DecorativeCorners />
                  <div className="bg-[#054239]/5 border-b border-[#b9a779]/15 px-8 sm:px-12 py-5 flex items-center gap-3 rounded-t-3xl">
                    <span className="w-7 h-7 rounded-full bg-[#b9a779] text-white text-xs font-black flex items-center justify-center shrink-0">3</span>
                    <h2 className="font-extrabold text-[#054239] text-sm">{t.section3}</h2>
                  </div>
                  <div className="px-8 sm:px-12 pb-8 sm:pb-12 pt-6">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                      <div>
                        <label htmlFor="province" className="block text-sm font-semibold text-slate-700 mb-2">{t.provinceLabel}</label>
                        <select id="province" value={form.province}
                          onChange={(e) => handleProvinceChange(e.target.value)}
                          className={`w-full border border-slate-200 focus:border-[#b9a779] focus:ring-2 focus:ring-[#b9a779]/15 rounded-xl px-4 py-3 text-sm outline-none transition bg-white text-slate-800 font-bold ${isRtl ? "font-qomra" : "font-inter"}`}>
                          {GOVERNORATES.map((g) => (
                            <option key={g.ar} value={g.ar}>
                              {locale === "ar" ? g.ar : g.en}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label htmlFor="center" className="block text-sm font-semibold text-slate-700 mb-2">{t.centerLabel}</label>
                        <input id="center" type="text" readOnly value={form.center}
                          className={`w-full border border-slate-100 bg-slate-50 text-slate-500 rounded-xl px-4 py-3 text-sm outline-none font-bold ${isRtl ? "font-qomra" : "font-inter"}`} />
                      </div>
                      <div>
                        <label htmlFor="completionDate" className="block text-sm font-semibold text-slate-700 mb-2">{t.completionDateLabel}</label>
                        <ApexDateTimePicker type="date" id="completionDate" value={form.completionDate}
                          onChange={(val) => { setForm((f) => ({ ...f, completionDate: val })); handleBlur("completionDate"); }}
                          aria-invalid={!!fieldError("completionDate")}
                          aria-describedby={fieldError("completionDate") ? "completionDate-error" : undefined}
                          locale={locale} />
                        <FieldErrorText id="completionDate-error" message={fieldError("completionDate")} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 4: File Uploads */}
                <div className="bg-white rounded-3xl border border-[#b9a779]/20 shadow-sm relative z-10">
                  <DecorativeCorners />
                  <div className="bg-[#054239]/5 border-b border-[#b9a779]/15 px-8 sm:px-12 py-5 flex items-center gap-3 rounded-t-3xl">
                    <span className="w-7 h-7 rounded-full bg-[#b9a779] text-white text-xs font-black flex items-center justify-center shrink-0">4</span>
                    <h2 className="font-extrabold text-[#054239] text-sm">{t.section4}</h2>
                  </div>
                  <div className="px-8 sm:px-12 pb-8 sm:pb-12 pt-6 space-y-5">
                    {/* Category-specific requirement note */}
                    <div className="bg-slate-100 rounded-xl px-5 py-4 text-xs text-slate-600 leading-relaxed border border-slate-200/60 font-bold">
                      <span className="font-bold text-[#054239]">{isRtl ? "متطلبات المحتوى: " : "Content Requirements: "}</span>
                      {form.workCategory === "written" && (isRtl ? "PDF كامل للمخطوطة مع الفهرس والمقدمة واسم المؤلف." : "Full PDF of the manuscript including index, introduction, and author name.")}
                      {form.workCategory === "informational" && (isRtl ? "ملف ZIP يحتوي الكود المصدري الكامل مع توثيق فني." : "ZIP file with full source code and technical documentation.")}
                      {form.workCategory === "audio_visual" && (isRtl ? "تسجيل صوتي أو مرئي كامل بصيغة MP3/MP4." : "Full audio or video recording (MP3/MP4).")}
                      {form.workCategory === "fine_arts" && (isRtl ? "صور عالية الدقة للمصنف من 3 زوايا مع وصف أبعاده." : "High-res photos from 3+ angles with dimension layout.")}
                      {form.workCategory === "folklore" && (isRtl ? "توثيق مفصل مع تحديد المصدر الجغرافي السوري." : "Detailed documentation with Syrian geographical source.")}
                    </div>

                    <div className="space-y-3">
                      <FileUploadCard icon="fa-file-arrow-up" label={t.fileWorkLabel} desc={t.fileWorkDesc}
                        fileLabel={workFileLabel} required onChange={(e) => handleBase64FileChange(e, setWorkFileLabel, setWorkFile)} />
                      {/* Identity document type: national ID (two faces) or passport (single data page) */}
                      <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <i className="fa-solid fa-id-card text-[#b9a779] text-sm" />
                          <span className="text-xs font-extrabold text-[#054239]">{isRtl ? "نوع وثيقة الهوية" : "Identity Document Type"}</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {[
                            { val: "national_id", label: isRtl ? "بطاقة الهوية الشخصية" : "National ID Card" },
                            { val: "passport", label: isRtl ? "جواز السفر" : "Passport" },
                          ].map((item) => (
                            <label key={item.val} className={`flex items-center gap-3 border rounded-xl px-4 py-3 cursor-pointer transition-all ${
                              form.idDocType === item.val
                                ? "border-[#b9a779] bg-[#b9a779]/8 text-[#054239]"
                                : "border-slate-200 bg-white hover:border-slate-300 text-slate-600"
                            }`}>
                              <input type="radio" name="idDocType" value={item.val}
                                checked={form.idDocType === item.val}
                                onChange={() => {
                                  setForm((f) => ({ ...f, idDocType: item.val }));
                                  // A passport is a single page — clear any previously chosen ID back face
                                  // so a stale file isn't submitted alongside it.
                                  if (item.val === "passport") { setIdFileBack(null); setIdFileBackLabel(t.fileSelect); }
                                }}
                                className="accent-[#b9a779]" />
                              <span className="text-sm font-bold">{item.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      {form.idDocType === "passport" ? (
                        <FileUploadCard icon="fa-passport"
                          label={form.applicantRole === "author" ? (isRtl ? "صورة جواز السفر *" : "Passport *") : (isRtl ? "صورة جواز سفر مقدم الطلب *" : "Applicant Passport *")}
                          desc={isRtl ? "صورة واضحة لصفحة البيانات في جواز السفر." : "Clear photo of the passport data page."}
                          fileLabel={idFileFrontLabel} required onChange={(e) => handleBase64FileChange(e, setIdFileFrontLabel, setIdFileFront)} />
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <FileUploadCard icon="fa-address-card"
                            label={form.applicantRole === "author" ? (isRtl ? "وجه الهوية الأمامي *" : "ID Front Face *") : (isRtl ? "وجه هوية مقدم الطلب الأمامي *" : "Applicant ID Front *")}
                            desc={isRtl ? "صورة واضحة للوجه الأمامي لبطاقة الهوية الشخصية." : "Clear photo of the front face of your national ID."}
                            fileLabel={idFileFrontLabel} required onChange={(e) => handleBase64FileChange(e, setIdFileFrontLabel, setIdFileFront)} />
                          <FileUploadCard icon="fa-address-card"
                            label={form.applicantRole === "author" ? (isRtl ? "وجه الهوية الخلفي *" : "ID Back Face *") : (isRtl ? "وجه هوية مقدم الطلب الخلفي *" : "Applicant ID Back *")}
                            desc={isRtl ? "صورة واضحة للوجه الخلفي لبطاقة الهوية الشخصية." : "Clear photo of the back face of your national ID."}
                            fileLabel={idFileBackLabel} required onChange={(e) => handleBase64FileChange(e, setIdFileBackLabel, setIdFileBack)} />
                        </div>
                      )}

                      {form.workCategory === "informational" && (
                        <FileUploadCard icon="fa-stamp" highlight
                          label={t.fileTelecomLabel} desc={t.fileTelecomDesc}
                          fileLabel={telecomFileLabel} required onChange={(e) => handleBase64FileChange(e, setTelecomFileLabel, setTelecomFile)} />
                      )}
                      {form.applicantRole === "representative" && (<>
                        <FileUploadCard icon="fa-building-user" label={isRtl ? "السجل التجاري للشركة *" : "Company Registry *"}
                          desc={isRtl ? "سجل تجاري حديث مصدق." : "Certified company registry."} fileLabel={commercialRegisterLabel} required onChange={(e) => handleBase64FileChange(e, setCommercialRegisterLabel, setCommercialRegisterFile)} />
                        <FileUploadCard icon="fa-file-contract" label={isRtl ? "قرار التفويض *" : "Delegation Letter *"}
                          desc={isRtl ? "كتاب تفويض رسمي موقع." : "Official signed authorization letter."} fileLabel={delegationLabel} required onChange={(e) => handleBase64FileChange(e, setDelegationLabel, setDelegationFile)} />
                        <FileUploadCard icon="fa-address-card" label={isRtl ? "صورة هوية المفوض *" : "Representative ID *"}
                          desc={isRtl ? "صورة هوية الشخص المفوض بالمعاملة." : "National ID scan of the representative."} fileLabel={representativeIdLabel} required onChange={(e) => handleBase64FileChange(e, setRepresentativeIdLabel, setRepresentativeIdFile)} />
                      </>)}
                      {form.applicantRole === "agent" && (<>
                        <FileUploadCard icon="fa-scale-balanced" label={isRtl ? "الوكالة القانونية *" : "Power of Attorney *"}
                          desc={isRtl ? "صورة واضحة عن الوكالة الرسمية." : "Clear scan of power of attorney."} fileLabel={roleFileLabel} required onChange={(e) => handleBase64FileChange(e, setRoleFileLabel, setRoleFile)} />
                        <FileUploadCard icon="fa-user-shield" label={isRtl ? "هوية المالك الأصلي *" : "Original Owner ID *"}
                          desc={isRtl ? "هوية مالك الحقوق الأصلي." : "ID of the original rights owner."} fileLabel={originalOwnerIdLabel} required onChange={(e) => handleBase64FileChange(e, setOriginalOwnerIdLabel, setOriginalOwnerIdFile)} />
                      </>)}
                      {form.applicantRole === "heir" && (<>
                        <FileUploadCard icon="fa-rectangle-list" label={isRtl ? "وثيقة حصر الإرث *" : "Inheritance Certificate *"}
                          desc={isRtl ? "حصر إرث شرعي للمؤلف المتوفى." : "Probate certificate of deceased author."} fileLabel={roleFileLabel} required onChange={(e) => handleBase64FileChange(e, setRoleFileLabel, setRoleFile)} />
                        <FileUploadCard icon="fa-user-slash" label={isRtl ? "هوية المؤلف المتوفى *" : "Deceased Author ID *"}
                          desc={isRtl ? "بطاقة الهوية للمؤلف المتوفى." : "National ID of the deceased author."} fileLabel={originalOwnerIdLabel} required onChange={(e) => handleBase64FileChange(e, setOriginalOwnerIdLabel, setOriginalOwnerIdFile)} />
                      </>)}
                    </div>
                  </div>
                </div>

                {/* Pledge */}
                <div className="bg-[#054239]/5 border border-[#b9a779]/20 rounded-3xl p-8 sm:p-10 relative">
                  <DecorativeCorners />
                  <label className="flex items-start gap-4 cursor-pointer select-none">
                    <input type="checkbox" checked={agreeTerms}
                      onChange={(e) => setAgreeTerms(e.target.checked)}
                      className="accent-[#b9a779] w-5 h-5 mt-0.5 shrink-0" />
                    <span className="text-sm text-slate-700 leading-relaxed font-bold">
                      {isRtl ? (
                        <>
                          أقرّ بصفتي مقدم الطلب، <strong className="text-slate-900 underline">{form.applicantName || "..................."}</strong>، بأنني قرأت واطلعت على قانون حماية حق المؤلف رقم 62 لعام 2013 وألتزم بكامل أحكامه، وأتعهد بصحة كافة البيانات والمرفقات المقدمة تحت مسؤوليتي القانونية الشخصية.
                        </>
                      ) : (
                        <>
                          I, in my capacity as the applicant, <strong className="text-slate-900 underline">{form.applicantName || "..................."}</strong>, declare that I have read and reviewed the Copyright Protection Law No. 62 of 2013, comply with all its provisions, and pledge the accuracy of all submitted data and attachments under my personal legal responsibility.
                        </>
                      )}
                    </span>
                  </label>
                </div>

                {/* Submit */}
                <div className="pt-2">
                  <button type="submit" disabled={!agreeTerms}
                    className="w-full bg-[#054239] hover:bg-[#04332b] disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm px-8 py-4 rounded-2xl shadow-md transition-all active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2">
                    <span>{t.btnSubmitForm}</span>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1 rtl:rotate-0 ltr:rotate-180">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15m0 0l6.75 6.75M4.5 12l6.75-6.75" />
                    </svg>
                  </button>
                </div>

              </form>
            )}

            {/* ── STEP 2: Payment ── */}
            {step === 2 && (
              <div className="space-y-6 print:hidden animate-fade-in-up">
                {/* Success Banner */}
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 mt-0.5">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5 text-emerald-600"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <div>
                      <p className="font-bold text-emerald-900 text-sm">{t.paySuccessTitle}</p>
                      <p className="text-xs text-emerald-700 mt-0.5">{t.paySuccessDesc}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <code className="font-mono bg-emerald-100 px-3 py-1.5 rounded text-emerald-800 text-sm font-black border border-emerald-250 select-all">
                          {activeAppId}
                        </code>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(activeAppId);
                            showToast(isRtl ? "تم نسخ رقم المعاملة!" : "Transaction ID copied!", "success");
                          }}
                          className="bg-emerald-100 hover:bg-emerald-200 text-emerald-800 p-2 rounded-lg text-xs font-bold transition flex items-center justify-center cursor-pointer border border-emerald-250 shrink-0"
                          title={isRtl ? "نسخ رمز الطلب" : "Copy Request ID"}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0A2.25 2.25 0 0113.5 5.25h-3a2.25 2.25 0 01-2.166-1.638m7.332 0a2.25 2.25 0 00-2.25-1.5H9a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 009 20.25h6a2.25 2.25 0 002.25-2.25V5.25a2.25 2.25 0 00-2.25-2.25z" /></svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Copy Reminder Info Box */}
                <div className="bg-amber-50 border-r-4 border-amber-500 p-4 rounded-xl flex gap-3 text-slate-800 text-xs leading-relaxed text-start">
                  <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-extrabold text-amber-900 mb-0.5">
                      {isRtl ? "تنبيه هام للمتابعة:" : "Important tracking note:"}
                    </p>
                    <p>
                      {isRtl 
                        ? "يرجى نسخ رمز المعاملة الأخضر أعلاه والاحتفاظ به في مكان آمن. ستحتاج لاستخدامه لاحقاً لتتبع حالة طلبك."
                        : "Please copy the green transaction code above and save it. You will need it to track your application."}
                    </p>
                  </div>
                </div>

                {/* Full Fee Structure Overview */}
                <div className="bg-[#054239]/5 border border-[#b9a779]/30 rounded-2xl p-5">
                  <h3 className="text-sm font-extrabold text-[#054239] mb-3 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-[#b9a779]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    {isRtl ? "هيكل الرسوم الكاملة للخدمة" : "Complete Service Fee Structure"}
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between bg-white rounded-xl px-4 py-3 border border-[#b9a779]/20">
                      <div>
                        <p className="font-bold text-[#054239]">{isRtl ? "🔹 الرسم الأولي (المرحلة الأولى)" : "🔹 Initial Fee (Phase 1)"}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{isRtl ? "يُسدَّد الآن — إيداع وحماية المصنف + طوابع خدمات" : "Paid now — Work deposit + e-service stamps"}</p>
                      </div>
                      <span className="text-base font-black text-[#054239]">550 ل.س</span>
                    </div>
                    <div className="flex items-center justify-between bg-white rounded-xl px-4 py-3 border border-slate-200 opacity-70">
                      <div>
                        <p className="font-bold text-slate-600">{isRtl ? "🔸 الرسم النهائي (المرحلة الثانية)" : "🔸 Final Fee (Phase 2)"}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{isRtl ? "يُطلب لاحقاً فقط بعد الموافقة القانونية النهائية — إصدار الشهادة الرسمية" : "Requested later only after final legal approval — Official certificate issuance"}</p>
                      </div>
                      <span className="text-base font-black text-slate-500">500 ل.س</span>
                    </div>
                  </div>
                </div>

                {/* Fee Summary */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5">
                  <h3 className="text-sm font-bold text-slate-900 mb-4">{t.payDetailsTitle}</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-600">{t.payDetail1}</span>
                      <span className="font-bold text-slate-900">500 ل.س</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-600">{t.payDetail2}</span>
                      <span className="font-bold text-slate-900">50 ل.س</span>
                    </div>
                    <div className="border-t border-slate-100 pt-3 flex justify-between items-center">
                      <span className="font-bold text-slate-900">{t.payTotal}</span>
                      <span className="text-lg font-bold text-emerald-700">550 ل.س</span>
                    </div>
                  </div>
                </div>


                {/* Payment Method */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
                  <h3 className="text-sm font-bold text-slate-900">{t.payMethodTitle}</h3>
                  
                  {/* Single Payment Method: Cham Cash */}
                  <ChamPaymentCard isRtl={isRtl} showToast={showToast} copyText="f6be4f104cf141af079e7c2af693dd41" />

                  {selectedGateway && (
                    <div className="space-y-4 border-t border-slate-100 pt-4">
                      <div>
                        <label htmlFor="paymentRef" className="block text-sm font-semibold text-slate-700 mb-2">{t.payRefLabel}</label>
                        <input id="paymentRef" type="text" value={paymentRef}
                          onChange={(e) => setPaymentRef(e.target.value)}
                          onBlur={() => handleBlur("paymentRef")}
                          aria-invalid={!!paymentRefError}
                          aria-describedby={paymentRefError ? "paymentRef-error" : undefined}
                          placeholder={t.payRefPlaceholder} dir={paymentRef ? "ltr" : (isRtl ? "rtl" : "ltr")}
                          className={`w-full border rounded-xl px-4 py-3 text-sm outline-none transition bg-white placeholder:text-slate-400 font-mono focus:ring-2 ${
                            paymentRefError
                              ? "border-rose-400 focus:border-rose-500 focus:ring-rose-100"
                              : "border-slate-200 focus:border-[#b9a779] focus:ring-[#b9a779]/15"
                          }`} />
                        <p className="mt-1.5 text-xs text-slate-400">{t.payRefHint}</p>
                        <FieldErrorText id="paymentRef-error" message={paymentRefError} />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">{t.payReceiptLabel}</label>
                        <FileUploadCard icon="fa-file-invoice" label={isRtl ? "رفع إيصال الدفع" : "Upload Receipt"}
                          desc={t.payReceiptDesc} fileLabel={receiptFileLabel}
                          onChange={handleReceiptFileChange} />
                        {paymentReceipt && (
                          <div className="mt-3 flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                            {paymentReceipt.startsWith("data:application/pdf") ? (
                              <div className="w-16 h-16 rounded-lg border border-slate-200 bg-white flex flex-col items-center justify-center shrink-0 text-rose-600 gap-1 shadow-sm">
                                <FileText className="w-8 h-8" />
                                <span className="text-[9px] font-black uppercase">PDF</span>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setImagePreview({ src: paymentReceipt, title: isRtl ? "إيصال الدفع" : "Payment receipt", downloadName: `receipt_${activeAppId || "copyright"}.jpg` })}
                                className="w-16 h-16 rounded-lg border border-slate-200 bg-white overflow-hidden shrink-0 cursor-zoom-in"
                                title={isRtl ? "عرض الإيصال بالحجم الكامل" : "Preview receipt full size"}
                              >
                                <img src={paymentReceipt} alt="Receipt" className="w-full h-full object-contain" />
                              </button>
                            )}
                            <div className="flex-1">
                              <p className="text-xs text-emerald-700 font-bold">{isRtl ? "✓ تم رفع الإيصال" : "✓ Receipt uploaded"}</p>
                              <button type="button" onClick={() => { setPaymentReceipt(null); setReceiptFileLabel(t.fileSelect); }}
                                className="text-xs text-rose-500 hover:text-rose-700 mt-1 cursor-pointer font-medium">{isRtl ? "حذف" : "Remove"}</button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <button onClick={handlePaymentSubmit}
                  className="w-full bg-[#054239] hover:bg-[#04332b] text-white font-bold py-4 rounded-2xl transition shadow-md flex items-center justify-center gap-2 cursor-pointer">
                  <span>{t.btnPay}</span>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg>
                </button>
              </div>
            )}

            {/* ── STEP 3: Processing / Tracking ── */}
            {step === 3 && (
              <div className="space-y-6 print:hidden animate-fade-in-up">
                {isProcessingPayment ? (
                  <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center space-y-6">
                    <div className="w-12 h-12 border-4 border-[#054239] border-t-transparent rounded-full animate-spin mx-auto" />
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">{t.n8nTitle}</h3>
                      <p className="text-sm text-slate-500 mt-2 max-w-sm mx-auto leading-relaxed">{t.n8nDesc}</p>
                    </div>
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 max-w-sm mx-auto text-start">
                      <Lightbulb className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-800 leading-relaxed">{t.n8nTip}</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3 text-emerald-700 text-sm font-semibold">
                      <CheckCircle className="w-5 h-5 shrink-0" />
                      <span>{isRtl ? "تم إرسال طلبك وقيد المراجعة. تابع التحديثات بالأسفل." : "Your request is submitted and under review. Track updates below."}</span>
                    </div>
                    {renderTrackingDashboard(trackedSub)}
                  </div>
                )}
              </div>
            )}

            {/* ── STEP 4: Certificate ── */}
            {step === 4 && (
              <div className="space-y-6 max-w-2xl mx-auto animate-fade-in-up">
                <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl flex items-center justify-between gap-4 print:hidden">
                  <div className="flex items-center gap-3 text-emerald-800">
                    <CheckCircle className="w-5 h-5 shrink-0" />
                    <p className="text-sm font-semibold">{t.certSuccessMsg}</p>
                  </div>
                  <button onClick={() => window.print()}
                    className="bg-white border border-slate-200 text-slate-700 hover:text-slate-900 px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95 whitespace-nowrap">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-14.326 0C3.768 7.44 3 8.378 3 9.456v6.294a2.25 2.25 0 001.794 2.203h1.093M4.5 18h15M9 3h6v4.5H9V3z" /></svg>
                    {t.btnPrint}
                  </button>
                </div>

                {/* Certificate */}
                <div id="printable-certificate"
                  className="bg-white border-[8px] border-double border-[#b9a779]/50 rounded-3xl p-8 sm:p-12 shadow-lg text-start relative overflow-hidden">
                  <div className="absolute inset-0 opacity-[0.025] pointer-events-none flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-80 h-80 text-slate-900"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                  </div>
                  {/* Header */}
                  <div className="flex justify-between items-start pb-6 mb-6 border-b-2 border-[#054239]">
                    <div>
                      <p className="text-sm font-bold text-slate-900">{isRtl ? "الجمهورية العربية السورية" : "Syrian Arab Republic"}</p>
                      <p className="text-sm font-bold text-[#054239] mt-0.5">{t.republic}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{t.certSub}</p>
                    </div>
                    <img src="/logo.png" alt="logo" className="w-14 h-14 object-contain" />
                  </div>
                  {/* Title */}
                  <div className="text-center mb-8">
                    <span className="text-xs bg-[#b9a779]/10 text-[#b9a779] border border-[#b9a779]/30 rounded px-3 py-1 font-semibold uppercase tracking-wider">{t.decree}</span>
                    <h3 className="text-2xl font-bold text-[#054239] mt-3 font-qomra">{t.certHeaderTitle}</h3>
                    <div className="w-16 h-0.5 bg-[#b9a779] mx-auto mt-3" />
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed mb-6">{t.certIssuedTo}</p>
                  <div className="bg-slate-50 rounded-2xl p-5 space-y-3 text-sm mb-6 border border-slate-100">
                    <div className="grid grid-cols-2 gap-3">
                      <div><p className="text-xs text-slate-500 font-medium">{t.certWorkTitle}</p><p className="font-bold text-slate-900 mt-0.5">{form.workTitle}</p></div>
                      <div><p className="text-xs text-slate-500 font-medium">{t.certWorkCategory}</p><p className="font-bold text-[#054239] mt-0.5">{getCategoryLabel(form.workCategory)}</p></div>
                    </div>
                    <div><p className="text-xs text-slate-500 font-medium">{t.certOwnerName}</p><p className="font-bold text-slate-900 mt-0.5">{form.applicantName} ({form.applicantRole === "author" ? (isRtl ? "مؤلف رئيسي" : "Primary Author") : form.applicantRole})</p></div>
                    {form.authors && Array.isArray(form.authors) && form.authors.length > 0 && (
                      <div><p className="text-xs text-slate-500 font-medium">{isRtl ? "المؤلفون المشتركون:" : "Joint Authors:"}</p>
                        {form.authors.map((auth, idx) => <p key={idx} className="font-bold text-slate-900 mt-0.5">• {auth.name}</p>)}
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-3">
                      <div><p className="text-xs text-slate-500 font-medium">{t.certProvinceCenter}</p><p className="font-bold text-slate-900 mt-0.5">{form.province} - {form.center}</p></div>
                      <div><p className="text-xs text-slate-500 font-medium">{t.certDate}</p><p className="font-bold text-slate-900 mt-0.5 font-mono">{new Date().toLocaleDateString(locale)}</p></div>
                    </div>
                    <div><p className="text-xs text-slate-500 font-medium">{t.certSerialLabel}</p><p className="font-mono font-bold text-emerald-800 mt-0.5">SY-62-2026-{activeAppId.replace("SY-APP-", "X")}</p></div>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed mb-8 border-r-2 border-slate-200 pr-3">{t.certPledge}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8 pt-6 border-t border-slate-100 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-xs font-semibold text-slate-500">{isRtl ? "توثيق مقدم الطلب" : "Applicant Verification"}</span>
                      <div className="px-4 py-2.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-1.5">
                        <i className="fa-solid fa-circle-check text-xs" /><span>{isRtl ? "مصدق رقمياً" : "Digitally Verified"}</span>
                      </div>
                      <span className="text-xs font-semibold text-slate-700 mt-1">{form.applicantName}</span>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-xs font-semibold text-slate-500">{t.certSignatureReviewer}</span>
                      <div className="px-4 py-2.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-1.5">
                        <i className="fa-solid fa-stamp text-xs" /><span>{isRtl ? "معتمد بختم الوزارة" : "Ministry Stamped"}</span>
                      </div>
                      <span className="text-xs font-semibold text-[#054239] mt-1">{isRtl ? "مديرية الملكية الفكرية" : "Director of Intellectual Property"}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 justify-center print:hidden">
                  <button onClick={() => { setForm(INITIAL_FORM); setAgreeTerms(false); setHasJointAuthors(false); setJointAuthors([]); setSelectedGateway("cham_cash"); setPaymentRef(""); setPaymentReceipt(null); setReceiptFileLabel(t.fileSelect); setStep(1); }}
                    className="inline-flex items-center justify-center gap-2 bg-[#054239] hover:bg-[#04332b] text-white font-semibold text-sm px-6 py-3 rounded-full shadow transition cursor-pointer">
                    {t.btnSubmitAnother}
                  </button>
                  <Link href={`/${locale}/calendar`}
                    className="inline-flex items-center justify-center gap-2 border border-slate-200 text-slate-600 font-semibold text-sm px-6 py-3 rounded-full transition hover:border-[#b9a779]/45 hover:text-[#054239] cursor-pointer">
                    {t.btnBackToCalendar}
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─────────────────────────────── TRACKER PORTAL ─────────────────────────────── */}
        {portal === "tracker" && (
          <div className="space-y-6 text-start print:hidden">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
              <h2 className="text-base font-bold text-slate-900">
                {isRtl ? "متابعة حالة معاملة حماية الملكية الفكرية" : "Track Intellectual Property Request"}
              </h2>
              <div className="flex flex-col sm:flex-row gap-3">
                <input type="text"
                  placeholder={isRtl ? "أدخل رمز المعاملة..." : "Enter Transaction Code..."}
                  value={trackCode} onChange={(e) => setTrackCode(e.target.value)}
                  dir={trackCode ? "ltr" : "rtl"}
                  className={`flex-grow border border-slate-200 focus:border-[#b9a779] focus:ring-2 focus:ring-[#b9a779]/15 rounded-xl px-4 py-3 text-sm outline-none bg-white placeholder:text-slate-400 ${
                    trackCode ? "font-mono" : ""
                  }`} />
                <button onClick={handleTrackSearch}
                  className="bg-[#054239] hover:bg-[#04332b] text-white font-semibold px-6 py-3 rounded-xl transition shadow active:scale-95 flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap">
                  {loadingTrack ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <i className="fa-solid fa-magnifying-glass text-sm" />}
                  <span>{isRtl ? "بحث" : "Search"}</span>
                </button>
              </div>
              {errorTracker && <p className="text-rose-600 text-sm font-medium">{errorTracker}</p>}
            </div>
            {trackedSub && renderTrackingDashboard(trackedSub)}
          </div>
        )}

      </main>
    </div>
  );
}

