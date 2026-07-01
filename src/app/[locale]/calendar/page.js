"use client";

import React, { use } from "react";
import CulturalCalendarSection from "../../../components/CulturalCalendarSection";

export default function DedicatedCalendarPage(props) {
  const params = use(props.params);
  const locale = params.locale || "ar";

  return <CulturalCalendarSection locale={locale} isDedicated={true} />;
}
