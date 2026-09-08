// ============================================================
// vPast — Home page
// The editor + New Past button + Dynamic Island integration.
// ============================================================

import { createPaste } from "../store.js";
import { DynamicIsland } from "./dynamicIsland.js";

export function HomePage() {
  const form = document.createElement("form");
  form.className = "app__stage home page-enter";
  form.action = "#";

  // ---- intro ----
  const intro = document.createElement("div");
  intro.className = "home__intro";

  const title = document.createElement("h1");
  title.className = "home__title";
  title.textContent = "\u0421\u043e\u0437\u0434\u0430\u0442\u044c \u043d\u043e\u0432\u044b\u0439 Past";

  const subtitle = document.createElement("p");
  subtitle.className = "home__subtitle";
  subtitle.textContent = "\u0412\u0441\u0442\u0430\u0432\u044c\u0442\u0435 \u0442\u0435\u043a\u0441\u0442 \u0438 \u043f\u043e\u043b\u0443\u0447\u0438\u0442\u0435 \u0441\u0441\u044b\u043b\u043a\u0443 \u0437\u0430 \u043d\u0435\u0441\u043a\u043e\u043b\u044c\u043a\u043e \u0441\u0435\u043a\u0443\u043d\u0434.";

  intro.append(title, subtitle);

  // ---- editor ----
  const editor = document.createElement("section");
  editor.className = "editor";

  const box = document.createElement("div");
  box.className = "editor__box";

  const field = document.createElement("textarea");
  field.className = "editor__field";
  field.placeholder = "\u0412\u0441\u0442\u0430\u0432\u044c\u0442\u0435 \u0442\u0435\u043a\u0441\u0442 \u0441\u044e\u0434\u0430...";
  field.setAttribute("aria-label", "\u0422\u0435\u043a\u0441\u0442 \u0434\u043b\u044f \u0441\u043f\u0440\u0430\u0432\u043a\u0438");
  field.setAttribute("aria-describedby", "editor-hint");

  field.addEventListener("focus", () => box.classList.add("is-focused"));
  field.addEventListener("blur", () => box.classList.remove("is-focused"));

  box.append(field);

  const error = document.createElement("p");
  error.className = "editor__error";
  error.id = "editor-error";
  error.setAttribute("role", "alert");

  const hint = document.createElement("p");
  hint.className = "editor__hint";
  hint.id = "editor-hint";
  hint.textContent = "\u0422\u0435\u043a\u0441\u0442 \u0445\u0440\u0430\u043d\u0438\u0442\u0441\u044f \u043f\u0440\u0438\u0432\u0430\u0442\u043d\u043e \u0438 \u0434\u043e\u0441\u0442\u0443\u043f\u0435\u043d \u0442\u043e\u043b\u044c\u043a\u043e \u043f\u043e \u0432\u0430\u0448\u0435\u0439 \u0441\u0441\u044b\u043b\u043a\u0435.";

  const footer = document.createElement("div");
  footer.className = "home__footer";

  const button = document.createElement("button");
  button.className = "btn";
  button.type = "submit";
  button.textContent = "\u041d\u043e\u0432\u044b\u0439 Past";

  footer.append(button);

  editor.append(box, error, hint, footer);

  // ---- submit handler ----
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (button.disabled) return;

    const text = field.value.trim();
    if (!text) {
      error.textContent = "\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u0442\u0435\u043a\u0441\u0442 \u043f\u0435\u0440\u0435\u0434 \u0441\u043e\u0437\u0434\u0430\u043d\u0438\u0435\u043c Past.";
      field.focus();
      return;
    }
    error.textContent = "";

    setLoading(true);

    createPaste(text)
      .then((result) => {
        field.value = "";
        setLoading(false);

        const island = DynamicIsland({ url: result.url, onClose: null });
        form.insertBefore(island, form.firstChild);
        island.scrollIntoView({ behavior: "smooth", block: "nearest" });
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
        error.textContent = "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0441\u043e\u0437\u0434\u0430\u0442\u044c Past. \u041f\u043e\u043f\u0440\u043e\u0431\u0443\u0439\u0442\u0435 \u0435\u0449\u0451 \u0440\u0430\u0437.";
        field.focus();
      });
  });

  function setLoading(loading) {
    if (loading) {
      button.disabled = true;
      button.replaceChildren();
      const spinner = document.createElement("span");
      spinner.className = "btn__spinner";
      spinner.setAttribute("aria-hidden", "true");
      const label = document.createElement("span");
      label.textContent = "\u0421\u043e\u0437\u0434\u0430\u043d\u0438\u0435";
      button.append(spinner, label);
    } else {
      button.disabled = false;
      button.replaceChildren();
      button.textContent = "\u041d\u043e\u0432\u044b\u0439 Past";
    }
  }

  form.append(intro, editor);
  return form;
}
