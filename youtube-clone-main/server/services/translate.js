const getTranslateEndpoint = () => process.env.TRANSLATE_API_URL || "https://libretranslate.com/translate";
const getGoogleTranslateApiKey = () => process.env.GOOGLE_TRANSLATE_API_KEY;

const unavailable = (message) => ({
  delivered: false,
  message,
  translatedText: "",
});

const translateWithGoogle = async ({ apiKey, targetLanguage, text }) => {
  const response = await fetch(
    `https://translation.googleapis.com/language/translate/v2?key=${encodeURIComponent(apiKey)}`,
    {
      body: JSON.stringify({
        format: "text",
        q: text,
        target: targetLanguage,
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    }
  );

  if (!response.ok) {
    throw new Error("Google Cloud Translation could not translate this comment.");
  }

  const data = await response.json();
  const translatedText = data?.data?.translations?.[0]?.translatedText;

  if (!translatedText) {
    throw new Error("Google Cloud Translation returned no translated text.");
  }

  return translatedText;
};

const translateWithCustomEndpoint = async ({ endpoint, targetLanguage, text }) => {
  const response = await fetch(endpoint, {
    body: JSON.stringify({
      format: "text",
      q: text,
      source: "auto",
      target: targetLanguage,
    }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });

  if (!response.ok) {
    throw new Error("The configured translation service could not translate this comment.");
  }

  const data = await response.json();
  const translatedText = data?.translatedText;

  if (!translatedText) {
    throw new Error("The configured translation service returned no translated text.");
  }

  return translatedText;
};

export const translateText = async ({ targetLanguage, text }) => {
  const apiKey = getGoogleTranslateApiKey();
  const endpoint = getTranslateEndpoint();

  try {
    const translatedText = apiKey
      ? await translateWithGoogle({ apiKey, targetLanguage, text })
      : await translateWithCustomEndpoint({ endpoint, targetLanguage, text });

    return { delivered: true, translatedText };
  } catch (error) {
    console.error("Translation error:", error);
    return unavailable(
      "Translation is temporarily unavailable. Please try again shortly."
    );
  }
};
