---
name: Syrian Ministry of Culture
category: Government/Public Service
colors:
  primary: "#054239"       # Deep Emerald Green (الأخضر الداكن المميز للوزارة)
  secondary: "#b9a779"     # Gold / Sand (الذهبي الفاخر المستوحى من الهوية البصرية للوزارة)
  accent: "#988561"        # Vivid gold / bronze accent for highlights
  background-dark: "#030705" # Very dark green-black used for site background
  background-light: "#F8F3EC" # Cream / warm white for light sections
  text-light: "#EDE5D6"    # Sand color for text on dark background
  text-dark: "#054239"     # Deep green for text on light background
  lightBlack: "#2C2C2C"    # Dark grey for secondary dark text
typography:
  display-font:
    fontFamily: "ITF Qomra Arabic"
    weights: ["300", "400", "700"]
    usage: "العناوين الرئيسية والشعارات والعبارات الثقافية الرسمية (تمثيل تقليدي فاخر)"
  arabic-body-font:
    fontFamily: "Cairo"
    googleFonts: "https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800&display=swap"
    usage: "نصوص المقالات، التوصيفات، القوائم، والفقرات باللغة العربية"
  latin-font:
    fontFamily: "Inter"
    googleFonts: "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap"
    usage: "النصوص والترجمات باللغة الإنجليزية وعناصر الواجهة اللاتينية"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  xxl: "48px"
  xxxl: "64px"
shadows:
  sm: "0 1px 2px rgba(0,0,0,0.05)"
  md: "0 4px 6px rgba(0,0,0,0.1)"
  lg: "0 10px 15px rgba(0,0,0,0.1)"
  xl: "0 20px 25px rgba(0,0,0,0.15)"
components:
  btn-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.secondary}"
    borderColor: "{colors.secondary}"
    borderWidth: "1px"
    rounded: "9999px"
    padding: "12px 24px"
    fontWeight: "600"
  btn-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.text-light}"
    borderColor: "{colors.text-light}"
    borderWidth: "1px"
    rounded: "9999px"
    padding: "12px 24px"
    fontWeight: "600"
  card:
    backgroundColor: "rgba(5, 66, 57, 0.2)"
    borderColor: "rgba(185, 167, 121, 0.15)"
    borderWidth: "1px"
    rounded: "12px"
    padding: "24px"
    shadow: "{shadows.md}"
  input:
    backgroundColor: "rgba(5, 66, 57, 0.1)"
    borderColor: "{colors.secondary}"
    borderWidth: "1px"
    rounded: "8px"
    padding: "12px 16px"
    fontSize: "16px"
    textColor: "{colors.text-light}"
---

# نظام التصميم لموقع وزارة الثقافة السورية (DESIGN.md)

تم تعديل وتحديث نظام التصميم هذا بناءً على الهوية البصرية الرسمية والمباشرة من موقع **وزارة الثقافة السورية (https://moc.gov.sy/ar)**. هذا الملف تم إنشاؤه ليتوافق مع أدوات التصميم والتطوير بالذكاء الاصطناعي مثل **Google Stitch** لضمان اتساق الألوان، الخطوط، والأنماط البصرية.

---

## 🎨 الهوية البصرية والألوان (Color Palette)

- **اللون الأساسي (Primary Color):** `#054239` (الأخضر الداكن العميق / الزمردي العسكري الذي يمثل الخلفيات الرسمية للوزارة).
- **اللون الثانوي (Secondary Color):** `#b9a779` (الذهبي الفاخر المستوحى من خطوط شعار الجمهورية وتاريخ سوريا العريق).
- **اللون التمييزي الحاد (Accent):** `#988561` (ذهبي برونزي يستعمل لإبراز العناوين الهامة والروابط والتأثيرات Shimmer).
- **الخلفية الداكنة الأساسية:** `#030705` (أسود مخضر شديد الدكّنة).
- **خلفية الأقسام الفاتحة:** `#F8F3EC` (لون كريمي مريح ومطابق للطابع العتيق للآثار والخطوط العربية).
- **النصوص الفاتحة (على خلفية داكنة):** `#EDE5D6` (لون الرمل الناعم لتباين مريح جداً للعين دون إجهاد).
- **النصوص الداكنة (على خلفية فاتحة):** `#054239` (الأخضر الداكن لضمان تباين عالٍ ومقروئية ممتازة وفق معايير WCAG).

---

## ✍️ الخطوط والطباعة الرسمية (Typography)

يتألف النظام من ثلاثة خطوط رئيسية تعبر عن روح الهوية البصرية:
1. **خط العناوين والرموز البصرية العتيقة:** `ITF Qomra Arabic` (خط محلي أنيق جداً يعكس الطابع التراثي والفني، ويستخدم للعناوين الرئيسية والشعارات).
2. **خط النصوص العربي:** `Cairo` (خط هندسي متناسق وحديث مخصص لقراءة النصوص الطويلة والمقالات والخدمات الإلكترونية بوضوح ممتاز).
3. **الخط اللاتيني:** `Inter` (خط هندسي نظيف مخصص للنصوص باللغة الإنكليزية والترجمات).

---

## 📐 المسافات والظلال (Spacing & Shadows)

تتبع المسافات والظلال المقاييس الرسمية المعتمدة لضمان مرونة التصميم وتوافقه مع مختلف الأجهزة:
* **الهوامش الصغيرة:** `4px` و `8px` لفراغات العناصر الداخلية وأيقونات الملاحة.
* **الهوامش المتوسطة:** `16px` و `24px` للبطاقات والقوائم وهوامش الأزرار.
* **الهوامش الكبيرة:** `32px` و `48px` للفراغات بين الأقسام الرئيسية والـ Hero Section.
* **الظلال:** خفيفة وناعمة جداً مع تقليل الانتشار لمنع تشتيت الهوية البصرية التاريخية.

---

## 🚫 أنماط تصميمية ممنوعة (Anti-Patterns)
- ❌ **ممنوع استخدام ألوان زرقاء أو كحلية داكنة** (تم استبعاد نظام الألوان الأزرق والنيلي بالكامل واستبداله بالأخضر الزمردي والذهبي).
- ❌ **ممنوع التدرجات اللونية الفاقعة** (مثل تدرجات البنفسجي والأرجواني الشائعة في تصاميم الذكاء الاصطناعي الافتراضية).
- ❌ **ممنوع التباين الضعيف** للنصوص، يجب الحفاظ على تباين 4.5:1 على الأقل لسهولة الوصول لذوي الاحتياجات الخاصة.
- ❌ **ممنوع الرموز التعبيرية (Emojis)** كأيقونات مساعدة، استخدم أيقونات متناسقة من حزمة SVG موحدة مثل Lucide أو Heroicons.
