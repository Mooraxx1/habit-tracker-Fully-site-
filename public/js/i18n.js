// ==========================================================================
// INTERNATIONALIZATION (I18N) LOCALIZATION ENGINE CONTROLLER
// ==========================================================================
(function () {
  let localizationCacheNodeMap = null;

  async function fetchDictionaryPayload(langCode) {
    try {
      const response = await fetch(`/locales/${langCode}.json`);
      if (!response.ok)
        throw new Error(
          `HTTP Error status loading language registry: ${response.status}`,
        );
      return await response.json();
    } catch (err) {
      console.error(
        "[i18n Core Engine Alert]: Could not parse translation token mapping payload files.",
        err,
      );
      return null;
    }
  }

  window.applyClientTranslationsScope = function () {
    if (!localizationCacheNodeMap) return;

    document.querySelectorAll("[data-i18n]").forEach((element) => {
      const dictionaryKey = element.getAttribute("data-i18n");
      if (localizationCacheNodeMap[dictionaryKey]) {
        if (element.tagName === "INPUT" || element.tagName === "TEXTAREA") {
          if (element.hasAttribute("placeholder")) {
            element.setAttribute(
              "placeholder",
              localizationCacheNodeMap[dictionaryKey],
            );
          } else {
            element.value = localizationCacheNodeMap[dictionaryKey];
          }
        } else {
          element.innerText = localizationCacheNodeMap[dictionaryKey];
        }
      }
    });
  };

  window.retranslatePageScope = async function (targetLangCode) {
    localizationCacheNodeMap = await fetchDictionaryPayload(targetLangCode);
    if (localizationCacheNodeMap) {
      window.applyClientTranslationsScope();
      // Dispatch notification event loops safely to hook script submodules
      window.dispatchEvent(
        new CustomEvent("languageChangedOverrideLoop", {
          detail: { lang: targetLangCode },
        }),
      );
    }
  };

  // Auto initialization execution sequence hook
  document.addEventListener("DOMContentLoaded", async () => {
    const primaryActiveLang =
      document.documentElement.getAttribute("lang") || "en";
    localizationCacheNodeMap = await fetchDictionaryPayload(primaryActiveLang);
    window.applyClientTranslationsScope();
  });
})();
