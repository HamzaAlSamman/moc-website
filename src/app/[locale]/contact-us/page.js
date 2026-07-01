"use client";

import React, { useState, use } from "react";
import Image from "next/image";
import { translations } from "../../../data/translations";
import DecorativeCorners from "../../../components/DecorativeCorners";
import { useSettings } from "../../../components/SettingsContext";

export default function ContactPage(props) {
  const params = use(props.params);
  const locale = params.locale || "ar";
  const t = translations[locale]?.contact || translations.ar.contact;
  const common = translations[locale]?.common || translations.ar.common;
  const isRtl = locale === "ar";
  const settings = useSettings();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: ""
  });
  const [status, setStatus] = useState("idle"); // idle, sending, success, error
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus("sending");
    setErrorMessage("");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (res.ok) {
        setStatus("success");
        setFormData({ name: "", email: "", subject: "", message: "" });
      } else {
        setStatus("error");
        setErrorMessage(data.error || (locale === "ar" ? "فشل إرسال الرسالة." : "Failed to send message."));
      }
    } catch (err) {
      console.error(err);
      setStatus("error");
      setErrorMessage(locale === "ar" ? "حدث خطأ أثناء إرسال الرسالة، يرجى المحاولة لاحقاً." : "An error occurred, please try again later.");
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="flex flex-col w-full min-h-screen bg-[#FBF9F6] pt-[84px] md:pt-[88px] lg:pt-[104px]" dir={isRtl ? "rtl" : "ltr"}>
      {/* Hero Header */}
      <section className="relative py-24 px-4 overflow-hidden border-b border-[#A48E68]/15">
        <div className="absolute inset-0 z-0">
          <Image
            src="/images/contact-us-background.jpg"
            alt="Historical Damascus architecture background"
            fill
            priority
            className="object-cover brightness-[0.25] saturate-[0.8]"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#002723]/90 via-[#002723]/75 to-[#002723] z-0"></div>
        </div>

        <div className="max-w-7xl mx-auto text-center relative z-10 flex flex-col items-center gap-4">
          <span className="text-xs uppercase text-[#A48E68] font-bold tracking-widest leading-none">
            {common.contactInfo}
          </span>
          <h1 className="text-white font-extrabold text-3xl sm:text-5xl font-sans">
            {t.title}
          </h1>
          <div className="w-16 h-[2.5px] bg-[#A48E68] mt-2"></div>
        </div>
      </section>

      {/* Main Content Section */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">
          
          {/* Column 1: Contact Form (7 cols) */}
          <div className="lg:col-span-7 group relative bg-white rounded-3xl p-8 sm:p-10 border border-slate-100 hover:border-[#988561]/40 hover:shadow-2xl transition-all duration-500 shadow-sm">
            <DecorativeCorners />
            
            <h2 className="text-[#002723] font-bold text-2xl font-sans tracking-wide mb-2">
              {locale === "ar" ? "أرسل لنا رسالة" : "Send Us a Message"}
            </h2>
            <p className="text-slate-600 text-sm mb-8 font-medium">
              {t.subtitle}
            </p>

            {status === "success" && (
              <div className="mb-6 bg-[#002723]/5 border border-[#988561]/30 rounded-2xl p-4 text-[#988561] text-sm font-semibold flex items-center gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 shrink-0">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{t.success}</span>
              </div>
            )}

            {status === "error" && (
              <div className="mb-6 bg-red-50 border border-red-200 rounded-2xl p-4 text-red-700 text-sm font-semibold flex items-center gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 shrink-0">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Name Input */}
                <div className="flex flex-col gap-2">
                  <label htmlFor="name" className="text-xs text-[#A48E68] font-bold uppercase tracking-wider">
                    {t.name}
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full bg-slate-50 border border-slate-200 hover:border-[#988561]/40 focus:border-[#988561] focus:bg-white text-slate-800 rounded-xl py-3 px-4 outline-none text-sm font-medium transition-all duration-300"
                  />
                </div>

                {/* Email Input */}
                <div className="flex flex-col gap-2">
                  <label htmlFor="email" className="text-xs text-[#A48E68] font-bold uppercase tracking-wider">
                    {t.email}
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full bg-slate-50 border border-slate-200 hover:border-[#988561]/40 focus:border-[#988561] focus:bg-white text-slate-800 rounded-xl py-3 px-4 outline-none text-sm font-medium transition-all duration-300"
                  />
                </div>
              </div>

              {/* Subject Input */}
              <div className="flex flex-col gap-2">
                <label htmlFor="subject" className="text-xs text-[#A48E68] font-bold uppercase tracking-wider">
                  {t.subject}
                </label>
                <input
                  type="text"
                  id="subject"
                  name="subject"
                  required
                  value={formData.subject}
                  onChange={handleInputChange}
                  className="w-full bg-slate-50 border border-slate-200 hover:border-[#988561]/40 focus:border-[#988561] focus:bg-white text-slate-800 rounded-xl py-3 px-4 outline-none text-sm font-medium transition-all duration-300"
                />
              </div>

              {/* Message Content */}
              <div className="flex flex-col gap-2">
                <label htmlFor="message" className="text-xs text-[#A48E68] font-bold uppercase tracking-wider">
                  {t.message}
                </label>
                <textarea
                  id="message"
                  name="message"
                  required
                  rows={5}
                  value={formData.message}
                  onChange={handleInputChange}
                  className="w-full bg-slate-50 border border-slate-200 hover:border-[#988561]/40 focus:border-[#988561] focus:bg-white text-slate-800 rounded-xl py-3 px-4 outline-none text-sm font-medium transition-all duration-300 resize-none"
                ></textarea>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={status === "sending"}
                className="mt-2 bg-[#002723] hover:bg-[#428177] text-[#A48E68] hover:text-white border border-[#A48E68]/30 rounded-full py-3.5 px-8 text-sm font-bold text-center transition-all duration-300 shadow-md hover:shadow-[#988561]/20 disabled:opacity-50 cursor-pointer"
              >
                {status === "sending" ? t.sending : t.send}
              </button>
            </form>
          </div>

          {/* Column 2: Info details & Eagle SVG (5 cols) */}
          <div className="lg:col-span-5 flex flex-col gap-10">
            {/* Info details */}
            <div className="group relative bg-white rounded-3xl p-8 border border-slate-100 hover:border-[#988561]/40 hover:shadow-2xl transition-all duration-500 shadow-sm flex flex-col gap-6">
              <DecorativeCorners />
              
              <h3 className="text-[#002723] font-bold text-xl font-sans tracking-wide">
                {common.contactInfo}
              </h3>

              <ul className="flex flex-col gap-6 text-sm text-slate-700 font-medium">
                <li className="flex items-start gap-4">
                  <div className="p-2 bg-[#988561]/10 rounded-xl border border-[#988561]/20 text-[#988561] shrink-0 mt-0.5">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                    </svg>
                  </div>
                  <div className="flex flex-col text-start">
                    <span className="text-[10px] text-[#A48E68] font-bold uppercase tracking-wider">{locale === "ar" ? "العنوان" : "Address"}</span>
                    <span className="font-sans leading-relaxed mt-0.5">{settings.address}</span>
                  </div>
                </li>

                <li className="flex items-start gap-4">
                  <div className="p-2 bg-[#988561]/10 rounded-xl border border-[#988561]/20 text-[#988561] shrink-0 mt-0.5">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0l-7.5-4.615a2.25 2.25 0 01-1.07-1.916V6.75" />
                    </svg>
                  </div>
                  <div className="flex flex-col text-start">
                    <span className="text-[10px] text-[#A48E68] font-bold uppercase tracking-wider">{locale === "ar" ? "البريد الإلكتروني" : "Email"}</span>
                    <a href={`mailto:${settings.email}`} className="font-sans leading-relaxed mt-0.5 hover:text-[#988561] transition-colors">{settings.email}</a>
                  </div>
                </li>

                <li className="flex items-start gap-4">
                  <div className="p-2 bg-[#988561]/10 rounded-xl border border-[#988561]/20 text-[#988561] shrink-0 mt-0.5">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-1.514 2.018a14.545 14.545 0 01-8.697-8.697l2.018-1.514c.361-.272.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                    </svg>
                  </div>
                  <div className="flex flex-col text-start">
                    <span className="text-[10px] text-[#A48E68] font-bold uppercase tracking-wider">{locale === "ar" ? "الهاتف" : "Phone"}</span>
                    <a href={`tel:${settings.phone}`} className="font-sans leading-relaxed mt-0.5 hover:text-[#988561] transition-colors text-start" dir="ltr">{settings.phone}</a>
                  </div>
                </li>

                <li className="flex items-start gap-4">
                  <div className="p-2 bg-[#988561]/10 rounded-xl border border-[#988561]/20 text-[#988561] shrink-0 mt-0.5">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex flex-col text-start">
                    <span className="text-[10px] text-[#A48E68] font-bold uppercase tracking-wider">{t.officeHours}</span>
                    <span className="font-sans leading-relaxed mt-0.5">{t.hours}</span>
                  </div>
                </li>
              </ul>
            </div>
          </div>

        </div>
      </section>
    </div>
  );
}
