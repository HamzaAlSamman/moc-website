"use client";

import { useEffect, useRef } from "react";

/**
 * يعيد الصفحة إلى أعلاها كلما انتقل المعالج من خطوة إلى أخرى.
 *
 * خطوات الخدمات طويلة وأزرار "التالي" تقع في أسفلها، فبدون هذا يُستبدل
 * محتوى الخطوة بينما يبقى المستخدم عند أسفل الصفحة: يرى نهاية الخطوة
 * التالية ويظن أن الضغط لم يفعل شيئاً. هذه كانت شكوى متكررة على بوابتَي
 * التراخيص وحقوق المؤلف.
 *
 * التمرير يتخطى أول تصيير عمداً — القفز إلى الأعلى قبل أن يفعل المستخدم
 * شيئاً حركةٌ بلا سبب، كما أنه يُفسد استعادة موضع التمرير عند تحديث الصفحة.
 *
 * @param {unknown} step رقم الخطوة الحالية أو معرّفها؛ أي تغيّر فيه يُطلق التمرير.
 * @param {object} [options]
 * @param {import("react").RefObject<HTMLElement>} [options.focusRef]
 *   عنصر يستقبل التركيز بعد الانتقال (عنوان الخطوة عادةً) حتى يعلن قارئ
 *   الشاشة عن الخطوة الجديدة بدل أن يبقى التركيز على زر اختفى.
 */
export function useStepScrollReset(step, { focusRef = null } = {}) {
  const mountedRef = useRef(false);

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }

    // `smooth` يحترم تلقائياً تفضيل prefers-reduced-motion في المتصفحات
    // الحديثة، فلا حاجة لفحصه يدوياً هنا.
    window.scrollTo({ top: 0, behavior: "smooth" });

    // preventScroll ضروري: بدونه يُلغي focus() التمرير الذي نفّذناه للتو
    // بإعادة العنصر إلى الشاشة.
    focusRef?.current?.focus?.({ preventScroll: true });
  }, [step, focusRef]);
}
