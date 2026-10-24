"use client";

import { useState } from "react";
import { useLang } from "@/lib/i18n";

const faqs = {
    en: [
        {
            question: "What is YojnaMitra?",
            answer:
                "YojnaMitra is an AI-powered government scheme assistant designed to help citizens discover government welfare schemes that may match their needs and circumstances.",
        },
        {
            question: "How does YojnaMitra work?",
            answer:
                "You provide basic details such as your age group, state, education, occupation, and family income. YojnaMitra uses this information to help identify potentially relevant government schemes.",
        },
        {
            question: "Is YojnaMitra free to use?",
            answer:
                "YojnaMitra is designed to make government scheme information accessible to everyone. Check the website for any updates regarding available features and usage.",
        },
        {
            question: "How do I know if I am eligible for a scheme?",
            answer:
                "YojnaMitra can help you understand potential eligibility based on your profile. Final eligibility is determined by the official scheme guidelines and the relevant government authority.",
        },
        {
            question: "What information do I need to provide?",
            answer:
                "You may need to provide details such as your age group, state, district, education level, occupation, and annual family income to help identify relevant schemes.",
        },
        {
            question: "Can I apply for a scheme directly through YojnaMitra?",
            answer:
                "YojnaMitra helps you discover and understand schemes. When application information is available, you can follow the official government link and application instructions provided for the scheme.",
        },
    ],
    hi: [
        {
            question: "YojnaMitra क्या है?",
            answer:
                "YojnaMitra एक AI-आधारित सरकारी योजना सहायक है, जो नागरिकों को उनकी आवश्यकताओं और परिस्थितियों के अनुसार उपयोगी सरकारी कल्याणकारी योजनाएँ खोजने में मदद करता है।",
        },
        {
            question: "YojnaMitra कैसे काम करता है?",
            answer:
                "आप अपनी आयु, राज्य, शिक्षा, व्यवसाय और परिवार की आय जैसी बुनियादी जानकारी देते हैं। YojnaMitra इस जानकारी के आधार पर आपके लिए उपयोगी हो सकने वाली योजनाओं की पहचान करने में मदद करता है।",
        },
        {
            question: "क्या YojnaMitra का उपयोग मुफ़्त है?",
            answer:
                "YojnaMitra का उद्देश्य सरकारी योजनाओं की जानकारी सभी लोगों तक पहुँचाना है। उपलब्ध सुविधाओं और उपयोग से संबंधित नवीनतम जानकारी वेबसाइट पर देखें।",
        },
        {
            question: "मुझे कैसे पता चलेगा कि मैं किसी योजना के लिए पात्र हूँ?",
            answer:
                "YojnaMitra आपकी प्रोफ़ाइल के आधार पर संभावित पात्रता समझने में मदद कर सकता है। अंतिम पात्रता संबंधित सरकारी विभाग और योजना के आधिकारिक नियमों पर निर्भर करती है।",
        },
        {
            question: "मुझे कौन-सी जानकारी देनी होगी?",
            answer:
                "आपको अपनी आयु, राज्य, जिला, शिक्षा का स्तर, व्यवसाय और परिवार की वार्षिक आय जैसी जानकारी देनी पड़ सकती है, ताकि उपयोगी योजनाओं की पहचान की जा सके।",
        },
        {
            question: "क्या मैं YojnaMitra से सीधे योजना के लिए आवेदन कर सकता हूँ?",
            answer:
                "YojnaMitra आपको योजनाएँ खोजने और समझने में मदद करता है। आवेदन से संबंधित जानकारी उपलब्ध होने पर आप दिए गए आधिकारिक सरकारी लिंक और निर्देशों के माध्यम से आवेदन कर सकते हैं।",
        },
    ],
};

export default function FAQ() {
    const { lang } = useLang();
    const language = lang === "hi" ? "hi" : "en";
    const items = faqs[language];

    const [openIndex, setOpenIndex] = useState<number | null>(0);

    return (
        <section
            id="faq"
            className="bg-[#F8FAFC] px-4 py-8 sm:px-6 sm:py-10"
        >
            <div className="mx-auto max-w-4xl">
                {/* Section Heading */}
                <div className="mb-10 text-center">
                    <span className="inline-flex rounded-full bg-amber-100 px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#173B6C]">
                        {language === "hi"
                            ? "अक्सर पूछे जाने वाले प्रश्न"
                            : "Frequently Asked Questions"}
                    </span>

                    <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-[#173B6C] sm:text-4xl">
                        {language === "hi"
                            ? "आपके सवाल, हमारे जवाब"
                            : "Got Questions? We Have Answers."}
                    </h2>

                    <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
                        {language === "hi"
                            ? "YojnaMitra और सरकारी योजनाओं से जुड़ी सामान्य जानकारी यहाँ पाएँ।"
                            : "Find answers to common questions about YojnaMitra and government schemes."}
                    </p>
                </div>

                {/* FAQ Accordion */}
                <div className="space-y-4">
                    {items.map((item, index) => {
                        const isOpen = openIndex === index;
                        const answerId = `faq-answer-${index}`;

                        return (
                            <div
                                key={item.question}
                                className={`overflow-hidden rounded-xl border bg-white transition-all duration-200 ${isOpen
                                    ? "border-[#173B6C]/30 shadow-md"
                                    : "border-slate-200 shadow-sm hover:border-slate-300"
                                    }`}
                            >
                                <button
                                    type="button"
                                    aria-expanded={isOpen}
                                    aria-controls={answerId}
                                    onClick={() =>
                                        setOpenIndex(isOpen ? null : index)
                                    }
                                    className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left sm:px-6"
                                >
                                    <span className="text-sm font-bold leading-6 text-slate-800 sm:text-base">
                                        {item.question}
                                    </span>

                                    <span
                                        aria-hidden="true"
                                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xl font-medium transition-all ${isOpen
                                            ? "rotate-180 bg-[#173B6C] text-white"
                                            : "bg-slate-100 text-[#173B6C]"
                                            }`}
                                    >
                                        {isOpen ? "−" : "+"}
                                    </span>
                                </button>

                                {isOpen && (
                                    <div
                                        id={answerId}
                                        className="border-t border-slate-100 px-5 pb-5 pt-4 sm:px-6"
                                    >
                                        <p className="text-sm leading-7 text-slate-600">
                                            {item.answer}
                                        </p>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Bottom Note */}
                <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-center">                    <p className="text-sm leading-6 text-slate-700">
                    {language === "hi"
                        ? "ध्यान दें: किसी भी योजना की पात्रता और आवेदन संबंधी अंतिम जानकारी के लिए आधिकारिक सरकारी दिशानिर्देश देखें।"
                        : "Note: Always check official government guidelines for final eligibility and application requirements."}
                </p>
                </div>
            </div>
        </section>
    );
}