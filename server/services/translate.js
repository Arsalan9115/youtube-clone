const getTranslateEndpoint = () => process.env.TRANSLATE_API_URL;

const canUseDevelopmentFallback = () =>
  process.env.NODE_ENV !== "production" &&
  process.env.DISABLE_DEV_TRANSLATION_FALLBACK !== "true";

const developmentTranslations = {
  en: {
    "vanakkam": "hello",
    "nandri": "thank you",
  },
  hi: {
    "vanakkam": "namaste",
    "nandri": "dhanyavaad",
  },
  ta: {
    "hello": "vanakkam",
    "thank you": "nandri",
  },
};

const fallbackTranslate = ({ targetLanguage, text }) => {
  const normalizedText = String(text || "").trim().toLowerCase();
  const mappedText = developmentTranslations[targetLanguage]?.[normalizedText];

  return {
    delivered: true,
    message: mappedText
      ? "Translated with built-in fallback dictionary."
      : `Translation service is not configured, so a preview fallback was used for ${targetLanguage}.`,
    translatedText: mappedText || `[${targetLanguage}] ${text}`,
  };
};

export const translateText = async ({ targetLanguage, text }) => {
  const endpoint = getTranslateEndpoint();

  if (!endpoint) {
    if (canUseDevelopmentFallback()) {
      return fallbackTranslate({ targetLanguage, text });
    }

    return {
      delivered: false,
      message:
        "Translation service is not configured yet. Add TRANSLATE_API_URL to enable translations.",
      translatedText: text,
    };
  }

  const response = await fetch(endpoint, {
    body: JSON.stringify({
      format: "text",
      q: text,
      source: "auto",
      target: targetLanguage,
    }),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Translation failed: ${errorText}`);
  }

  const data = await response.json();

  return {
    delivered: true,
    translatedText: data.translatedText || text,
  };
};
