"use client";

import React from "react";

export default function BottomQuoteSection({ locale }) {
  const isRtl = locale !== "en";

  return (
    <section className="mb-8 md:mb-12 w-full" dir={isRtl ? "rtl" : "ltr"}>
      <div className="flex relative justify-center items-center text-center min-h-[100px]">

        {/* Centered Quote */}
        <h3 className="pt-6 px-4 sm:px-6 md:pt-0 text-lg sm:text-xl md:text-2xl leading-8 sm:leading-10 md:leading-12 font-medium text-foreground max-w-5xl text-pretty relative z-10 text-center">
          {isRtl ? (
            <>
              ”ليست الرؤية شعارًا ولا قرارًا. إنها اليوم عنوان التعافي واستعادة السردية الحضارية، وبناء المستقبل. ”
            </>
          ) : (
            <>
              “Vision is neither a slogan nor a decision. Today, it is the title of recovery, reclaiming the civilizational narrative, and building the future.”
            </>
          )}
        </h3>
      </div>
    </section>
  );
}
