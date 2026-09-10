// ============================================================
// vPast — i18n
// Tiny translation layer: en (default) / ru / uk.
// The choice persists in localStorage and is applied instantly.
// ============================================================

const STORAGE_KEY = "vpast.lang";

const dictionaries = {
  en: {
    "header.home": "vPast home",
    "home.title": "Create a new Past",
    "home.subtitle": "Paste your text and get a link in seconds.",
    "editor.placeholder": "Paste your text here...",
    "editor.aria": "Text to create a Past",
    "editor.hint": "Your text is stored privately and is only accessible via your link.",
    "btn.new": "New Past",
    "btn.creating": "Creating",
    "btn.create": "Create Past",
    "err.empty": "Enter some text to create a Past.",
    "err.tooLarge": "This text is too large. The limit is 4 MB.",
    "err.create": "Could not create Past. Try again.",
    "file.attach": "Attach file",
    "file.remove": "Remove file",
    "file.tooLarge": "File is too large. The maximum size is 2 GB.",
    "file.uploading": "Uploading… {pct}%",
    "file.uploadingMany": "Uploading {i} of {n}… {pct}%",
    "file.totalTooLarge": "Total file size is over the 2 GB limit.",
    "file.uploadError": "Could not upload the file. Try again.",
    "file.none": "No file chosen",
    "json.format": "Format JSON",
    "json.formatTip": "Automatic JSON formatting",
    "json.notJson": "This is not valid JSON.",
    "viewer.download": "Download",
    "viewer.preview": "Preview",
    "viewer.close": "Close",
    "viewer.noPreview": "No preview for this file type.",
    "viewer.filename": "File",
    "viewer.loading": "Loading...",
    "viewer.notFound": "This Past was not found or has been removed.",
    "viewer.created": "Created",
    "viewer.copy": "Copy text",
    "viewer.copied": "Copied",
    "viewer.loadError": "Could not load Past.",
    "island.copyLink": "Copy link",
    "island.copied": "Copied!",
    "island.close": "Close",
    "admin.title": "Admin",
    "admin.stats": "Storage",
    "admin.pastes": "Pastes",
    "admin.files": "Files",
    "admin.bytes": "Total size",
    "admin.deleteLabel": "Delete by ID",
    "admin.deletePlaceholder": "paste id",
    "admin.deleteBtn": "Delete",
    "admin.deleted": "Deleted {n} paste(s)",
    "admin.clearLabel": "Danger zone",
    "admin.clearBtn": "Clear all",
    "admin.confirmClear": "Delete ALL pastes? This cannot be undone.",
    "admin.denied": "Admin access denied — the 'vpastadmin=admin' cookie is missing.",
    "admin.error": "Admin error: {msg}",
  },
  ru: {
    "header.home": "\u041d\u0430 \u0433\u043b\u0430\u0432\u043d\u0443\u044e vPast",
    "home.title": "\u0421\u043e\u0437\u0434\u0430\u0442\u044c \u043d\u043e\u0432\u044b\u0439 Past",
    "home.subtitle": "\u0412\u0441\u0442\u0430\u0432\u044c\u0442\u0435 \u0442\u0435\u043a\u0441\u0442 \u0438 \u043f\u043e\u043b\u0443\u0447\u0438\u0442\u0435 \u0441\u0441\u044b\u043b\u043a\u0443 \u0437\u0430 \u043d\u0435\u0441\u043a\u043e\u043b\u044c\u043a\u043e \u0441\u0435\u043a\u0443\u043d\u0434.",
    "editor.placeholder": "\u0412\u0441\u0442\u0430\u0432\u044c\u0442\u0435 \u0442\u0435\u043a\u0441\u0442 \u0441\u044e\u0434\u0430...",
    "editor.aria": "\u0422\u0435\u043a\u0441\u0442 \u0434\u043b\u044f \u0441\u043e\u0437\u0434\u0430\u043d\u0438\u044f Past",
    "editor.hint": "\u0422\u0435\u043a\u0441\u0442 \u0445\u0440\u0430\u043d\u0438\u0442\u0441\u044f \u043f\u0440\u0438\u0432\u0430\u0442\u043d\u043e \u0438 \u0434\u043e\u0441\u0442\u0443\u043f\u0435\u043d \u0442\u043e\u043b\u044c\u043a\u043e \u043f\u043e \u0432\u0430\u0448\u0435\u0439 \u0441\u0441\u044b\u043b\u043a\u0435.",
    "btn.new": "\u041d\u043e\u0432\u044b\u0439 Past",
    "btn.creating": "\u0421\u043e\u0437\u0434\u0430\u043d\u0438\u0435",
    "btn.create": "\u0421\u043e\u0437\u0434\u0430\u0442\u044c Past",
    "err.empty": "\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u0442\u0435\u043a\u0441\u0442 \u043f\u0435\u0440\u0435\u0434 \u0441\u043e\u0437\u0434\u0430\u043d\u0438\u0435\u043c Past.",
    "err.tooLarge": "\u0422\u0435\u043a\u0441\u0442 \u0441\u043b\u0438\u0448\u043a\u043e\u043c \u0431\u043e\u043b\u044c\u0448\u043e\u0439. \u041b\u0438\u043c\u0438\u0442 \u2014 4 \u041c\u0411.",
    "err.create": "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0441\u043e\u0437\u0434\u0430\u0442\u044c Past. \u041f\u043e\u043f\u0440\u043e\u0431\u0443\u0439\u0442\u0435 \u0435\u0449\u0451 \u0440\u0430\u0437.",
    "file.attach": "\u041f\u0440\u0438\u043a\u0440\u0435\u043f\u0438\u0442\u044c \u0444\u0430\u0439\u043b",
    "file.remove": "\u0423\u0431\u0440\u0430\u0442\u044c \u0444\u0430\u0439\u043b",
    "file.tooLarge": "\u0424\u0430\u0439\u043b \u0441\u043b\u0438\u0448\u043a\u043e\u043c \u0431\u043e\u043b\u044c\u0448\u043e\u0439. \u041c\u0430\u043a\u0441\u0438\u043c\u0443\u043c \u2014 2 \u0413\u0411.",
    "file.uploading": "\u0417\u0430\u0433\u0440\u0443\u0437\u043a\u0430\u2026 {pct}%",
    "file.uploadingMany": "\u0417\u0430\u0433\u0440\u0443\u0437\u043a\u0430 {i} \u0438\u0437 {n}\u2026 {pct}%",
    "file.totalTooLarge": "\u041e\u0431\u0449\u0438\u0439 \u0440\u0430\u0437\u043c\u0435\u0440 \u0444\u0430\u0439\u043b\u043e\u0432 \u0431\u043e\u043b\u044c\u0448\u0435 2 \u0413\u0411.",
    "file.uploadError": "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044c \u0444\u0430\u0439\u043b. \u041f\u043e\u043f\u0440\u043e\u0431\u0443\u0439\u0442\u0435 \u0435\u0449\u0451 \u0440\u0430\u0437.",
    "file.none": "\u0424\u0430\u0439\u043b \u043d\u0435 \u0432\u044b\u0431\u0440\u0430\u043d",
    "json.format": "\u0424\u043e\u0440\u043c\u0430\u0442\u0438\u0440\u043e\u0432\u0430\u0442\u044c JSON",
    "json.formatTip": "\u0410\u0432\u0442\u043e\u0444\u043e\u0440\u043c\u0430\u0442 JSON \u2014 \u043a\u0440\u0430\u0441\u0438\u0432\u044b\u0435 \u043e\u0442\u0441\u0442\u0443\u043f\u044b",
    "json.notJson": "\u042d\u0442\u043e \u043d\u0435 \u0432\u0430\u043b\u0438\u0434\u043d\u044b\u0439 JSON.",
    "viewer.download": "\u0421\u043a\u0430\u0447\u0430\u0442\u044c",
    "viewer.preview": "\u041f\u0440\u043e\u0441\u043c\u043e\u0442\u0440",
    "viewer.close": "\u0417\u0430\u043a\u0440\u044b\u0442\u044c",
    "viewer.noPreview": "\u0414\u043b\u044f \u044d\u0442\u043e\u0433\u043e \u0442\u0438\u043f\u0430 \u0444\u0430\u0439\u043b\u0430 \u043f\u0440\u0435\u0434\u043f\u0440\u043e\u0441\u043c\u043e\u0442\u0440 \u043d\u0435\u0434\u043e\u0441\u0442\u0443\u043f\u0435\u043d.",
    "viewer.filename": "\u0424\u0430\u0439\u043b",
    "viewer.loading": "\u0417\u0430\u0433\u0440\u0443\u0437\u043a\u0430...",
    "viewer.notFound": "\u042d\u0442\u043e\u0442 Past \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d \u0438\u043b\u0438 \u0431\u044b\u043b \u0443\u0434\u0430\u043b\u0435\u043d.",
    "viewer.created": "\u0421\u043e\u0437\u0434\u0430\u043d\u043e",
    "viewer.copy": "\u041a\u043e\u043f\u0438\u0440\u043e\u0432\u0430\u0442\u044c \u0442\u0435\u043a\u0441\u0442",
    "viewer.copied": "\u0421\u043a\u043e\u043f\u0438\u0440\u043e\u0432\u0430\u043d\u043e",
    "viewer.loadError": "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044c Past.",
    "island.copyLink": "\u0421\u043a\u043e\u043f\u0438\u0440\u043e\u0432\u0430\u0442\u044c \u0441\u0441\u044b\u043b\u043a\u0443",
    "island.copied": "\u0421\u043a\u043e\u043f\u0438\u0440\u043e\u0432\u0430\u043d\u043e!",
    "island.close": "\u0417\u0430\u043a\u0440\u044b\u0442\u044c",
    "admin.title": "\u0410\u0434\u043c\u0438\u043d",
    "admin.stats": "\u0425\u0440\u0430\u043d\u0438\u043b\u0438\u0449\u0435",
    "admin.pastes": "\u041f\u0430\u0441\u0442\u044b",
    "admin.files": "\u0424\u0430\u0439\u043b\u044b",
    "admin.bytes": "\u0412\u0441\u0435\u0433\u043e \u0440\u0430\u0437\u043c\u0435\u0440",
    "admin.deleteLabel": "\u0423\u0434\u0430\u043b\u0438\u0442\u044c \u043f\u043e ID",
    "admin.deletePlaceholder": "id \u043f\u0430\u0441\u0442\u044b",
    "admin.deleteBtn": "\u0423\u0434\u0430\u043b\u0438\u0442\u044c",
    "admin.deleted": "\u0423\u0434\u0430\u043b\u0435\u043d\u043e \u043f\u0430\u0441\u0442: {n}",
    "admin.clearLabel": "\u041e\u043f\u0430\u0441\u043d\u0430\u044f \u0437\u043e\u043d\u0430",
    "admin.clearBtn": "\u041e\u0447\u0438\u0441\u0442\u0438\u0442\u044c \u0432\u0441\u0451",
    "admin.confirmClear": "\u0423\u0434\u0430\u043b\u0438\u0442\u044c \u0412\u0421\u0415 \u043f\u0430\u0441\u0442\u044b? \u042d\u0442\u043e \u043d\u0435\u043e\u0431\u0440\u0430\u0442\u0438\u043c\u043e.",
    "admin.denied": "\u0414\u043e\u0441\u0442\u0443\u043f \u0437\u0430\u043f\u0440\u0435\u0449\u0451\u043d \u2014 \u043d\u0435\u0442 \u043a\u0443\u043a\u0438 'vpastadmin=admin'.",
    "admin.error": "\u041e\u0448\u0438\u0431\u043a\u0430 \u0430\u0434\u043c\u0438\u043d\u0438\u0441\u0442\u0440\u0430\u0442\u043e\u0440\u0430: {msg}",
  },
  uk: {
    "header.home": "\u041d\u0430 \u0433\u043e\u043b\u043e\u0432\u043d\u0443 vPast",
    "home.title": "\u0421\u0442\u0432\u043e\u0440\u0438\u0442\u0438 \u043d\u043e\u0432\u0438\u0439 Past",
    "home.subtitle": "\u0412\u0441\u0442\u0430\u0432\u0442\u0435 \u0442\u0435\u043a\u0441\u0442 \u0456 \u043e\u0442\u0440\u0438\u043c\u0430\u0439\u0442\u0435 \u043f\u043e\u0441\u0438\u043b\u0430\u043d\u043d\u044f \u0437\u0430 \u043a\u0456\u043b\u044c\u043a\u0430 \u0441\u0435\u043a\u0443\u043d\u0434.",
    "editor.placeholder": "\u0412\u0441\u0442\u0430\u0432\u0442\u0435 \u0442\u0435\u043a\u0441\u0442 \u0441\u044e\u0434\u0438...",
    "editor.aria": "\u0422\u0435\u043a\u0441\u0442 \u0434\u043b\u044f \u0441\u0442\u0432\u043e\u0440\u0435\u043d\u043d\u044f Past",
    "editor.hint": "\u0412\u0430\u0448 \u0442\u0435\u043a\u0441\u0442 \u0437\u0431\u0435\u0440\u0456\u0433\u0430\u0454\u0442\u044c\u0441\u044f \u043f\u0440\u0438\u0432\u0430\u0442\u043d\u043e \u0442\u0430 \u0434\u043e\u0441\u0442\u0443\u043f\u043d\u0438\u0439 \u043b\u0438\u0448\u0435 \u0437\u0430 \u0432\u0430\u0448\u0438\u043c \u043f\u043e\u0441\u0438\u043b\u0430\u043d\u043d\u044f\u043c.",
    "btn.new": "\u041d\u043e\u0432\u0438\u0439 Past",
    "btn.creating": "\u0421\u0442\u0432\u043e\u0440\u0435\u043d\u043d\u044f",
    "btn.create": "\u0421\u0442\u0432\u043e\u0440\u0438\u0442\u0438 Past",
    "err.empty": "\u0412\u0432\u0435\u0434\u0456\u0442\u044c \u0442\u0435\u043a\u0441\u0442 \u043f\u0435\u0440\u0435\u0434 \u0441\u0442\u0432\u043e\u0440\u0435\u043d\u043d\u044f\u043c Past.",
    "err.tooLarge": "\u0422\u0435\u043a\u0441\u0442 \u0437\u0430\u043d\u0430\u0434\u0442\u043e \u0432\u0435\u043b\u0438\u043a\u0438\u0439. \u041b\u0456\u043c\u0456\u0442 \u2014 4 \u041c\u0411.",
    "err.create": "\u041d\u0435 \u0432\u0434\u0430\u043b\u043e\u0441\u044f \u0441\u0442\u0432\u043e\u0440\u0438\u0442\u0438 Past. \u0421\u043f\u0440\u043e\u0431\u0443\u0439\u0442\u0435 \u0449\u0435 \u0440\u0430\u0437.",
    "file.attach": "\u041f\u0440\u0438\u043a\u0440\u0456\u043f\u0438\u0442\u0438 \u0444\u0430\u0439\u043b",
    "file.remove": "\u041f\u0440\u0438\u0431\u0440\u0430\u0442\u0438 \u0444\u0430\u0439\u043b",
    "file.tooLarge": "\u0424\u0430\u0439\u043b \u0437\u0430\u043d\u0430\u0434\u0442\u043e \u0432\u0435\u043b\u0438\u043a\u0438\u0439. \u041c\u0430\u043a\u0441\u0438\u043c\u0443\u043c \u2014 2 \u0413\u0411.",
    "file.uploading": "\u0417\u0430\u0432\u0430\u043d\u0442\u0430\u0436\u0435\u043d\u043d\u044f\u2026 {pct}%",
    "file.uploadingMany": "\u0417\u0430\u0432\u0430\u043d\u0442\u0430\u0436\u0435\u043d\u043d\u044f {i} \u0437 {n}\u2026 {pct}%",
    "file.totalTooLarge": "\u0417\u0430\u0433\u0430\u043b\u044c\u043d\u0438\u0439 \u0440\u043e\u0437\u043c\u0456\u0440 \u0444\u0430\u0439\u043b\u0456\u0432 \u0431\u0456\u043b\u044c\u0448\u0435 2 \u0413\u0411.",
    "file.uploadError": "\u041d\u0435 \u0432\u0434\u0430\u043b\u043e\u0441\u044f \u0437\u0430\u0432\u0430\u043d\u0442\u0430\u0436\u0438\u0442\u0438 \u0444\u0430\u0439\u043b. \u0421\u043f\u0440\u043e\u0431\u0443\u0439\u0442\u0435 \u0449\u0435 \u0440\u0430\u0437.",
    "file.none": "\u0424\u0430\u0439\u043b \u043d\u0435 \u043e\u0431\u0440\u0430\u043d\u043e",
    "json.format": "\u0424\u043e\u0440\u043c\u0430\u0442\u0443\u0432\u0430\u0442\u0438 JSON",
    "json.formatTip": "\u0410\u0432\u0442\u043e\u0444\u043e\u0440\u043c\u0430\u0442 JSON \u2014 \u0433\u0430\u0440\u043d\u0456 \u0432\u0456\u0434\u0441\u0442\u0443\u043f\u0438",
    "json.notJson": "\u0426\u0435 \u043d\u0435 \u0432\u0430\u043b\u0456\u0434\u043d\u0438\u0439 JSON.",
    "viewer.download": "\u0417\u0430\u0432\u0430\u043d\u0442\u0430\u0436\u0438\u0442\u0438",
    "viewer.preview": "\u041f\u0435\u0440\u0435\u0433\u043b\u044f\u0434",
    "viewer.close": "\u0417\u0430\u043a\u0440\u0438\u0442\u0438",
    "viewer.noPreview": "\u0414\u043b\u044f \u0446\u044c\u043e\u0433\u043e \u0442\u0438\u043f\u0443 \u0444\u0430\u0439\u043b\u0443 \u043f\u0435\u0440\u0435\u0433\u043b\u044f\u0434 \u043d\u0435\u0434\u043e\u0441\u0442\u0443\u043f\u043d\u0438\u0439.",
    "viewer.filename": "\u0424\u0430\u0439\u043b",
    "viewer.loading": "\u0417\u0430\u0432\u0430\u043d\u0442\u0430\u0436\u0435\u043d\u043d\u044f...",
    "viewer.notFound": "\u0426\u0435\u0439 Past \u043d\u0435 \u0437\u043d\u0430\u0439\u0434\u0435\u043d\u043e \u0430\u0431\u043e \u0439\u043e\u0433\u043e \u0432\u0438\u0434\u0430\u043b\u0435\u043d\u043e.",
    "viewer.created": "\u0421\u0442\u0432\u043e\u0440\u0435\u043d\u043e",
    "viewer.copy": "\u041a\u043e\u043f\u0456\u044e\u0432\u0430\u0442\u0438 \u0442\u0435\u043a\u0441\u0442",
    "viewer.copied": "\u0421\u043a\u043e\u043f\u0456\u0439\u043e\u0432\u0430\u043d\u043e",
    "viewer.loadError": "\u041d\u0435 \u0432\u0434\u0430\u043b\u043e\u0441\u044f \u0437\u0430\u0432\u0430\u043d\u0442\u0430\u0436\u0438\u0442\u0438 Past.",
    "island.copyLink": "\u041a\u043e\u043f\u0456\u044e\u0432\u0430\u0442\u0438 \u043f\u043e\u0441\u0438\u043b\u0430\u043d\u043d\u044f",
    "island.copied": "\u0421\u043a\u043e\u043f\u0456\u0439\u043e\u0432\u0430\u043d\u043e!",
    "island.close": "\u0417\u0430\u043a\u0440\u0438\u0442\u0438",
    "admin.title": "\u0410\u0434\u043c\u0456\u043d",
    "admin.stats": "\u0421\u0445\u043e\u0432\u0438\u0449\u0435",
    "admin.pastes": "\u041f\u0430\u0441\u0442\u0438",
    "admin.files": "\u0424\u0430\u0439\u043b\u0438",
    "admin.bytes": "\u0417\u0430\u0433\u0430\u043b\u044c\u043d\u0438\u0439 \u0440\u043e\u0437\u043c\u0456\u0440",
    "admin.deleteLabel": "\u0412\u0438\u0434\u0430\u043b\u0438\u0442\u0438 \u0437\u0430 ID",
    "admin.deletePlaceholder": "id \u043f\u0430\u0441\u0442\u0438",
    "admin.deleteBtn": "\u0412\u0438\u0434\u0430\u043b\u0438\u0442\u0438",
    "admin.deleted": "\u0412\u0438\u0434\u0430\u043b\u0435\u043d\u043e \u043f\u0430\u0441\u0442: {n}",
    "admin.clearLabel": "\u041d\u0435\u0431\u0435\u0437\u043f\u0435\u0447\u043d\u0430 \u0437\u043e\u043d\u0430",
    "admin.clearBtn": "\u041e\u0447\u0438\u0441\u0442\u0438\u0442\u0438 \u0432\u0441\u0435",
    "admin.confirmClear": "\u0412\u0438\u0434\u0430\u043b\u0438\u0442\u0438 \u0412\u0421\u0406 \u043f\u0430\u0441\u0442\u0438? \u0426\u0435 \u043d\u0435\u0437\u0432\u043e\u0440\u043e\u0442\u043d\u043e.",
    "admin.denied": "\u0414\u043e\u0441\u0442\u0443\u043f \u0437\u0430\u0431\u043e\u0440\u043e\u043d\u0435\u043d\u043e \u2014 \u043d\u0435\u043c\u0430\u0454 \u043a\u0443\u043a\u0438 'vpastadmin=admin'.",
    "admin.error": "\u041f\u043e\u043c\u0438\u043b\u043a\u0430 \u0430\u0434\u043c\u0456\u043d\u0456\u0441\u0442\u0440\u0430\u0442\u043e\u0440\u0430: {msg}",
  },
};

export const LANGS = ["en", "ru", "uk"];

export function langCodeName(code) {
  if (code === "ru") return "RU";
  if (code === "uk") return "UA";
  return "EN";
}

function readStored() {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    if (value && dictionaries[value]) return value;
  } catch {
    /* ignore */
  }
  return "en";
}

let current = readStored();
document.documentElement.lang = current;

export function getLang() {
  return current;
}

export function setLang(code) {
  if (!dictionaries[code] || code === current) return;
  current = code;
  try {
    window.localStorage.setItem(STORAGE_KEY, code);
  } catch {
    /* ignore */
  }
  document.documentElement.lang = code;
  window.dispatchEvent(new CustomEvent("langchange"));
}

export function t(key) {
  const dict = dictionaries[current];
  return (dict && dict[key]) || key;
}

export function tpl(key, vars = {}) {
  let str = t(key);
  for (const [k, v] of Object.entries(vars)) {
    str = str.split(`{${k}}`).join(String(v));
  }
  return str;
}

export function localeTag() {
  if (current === "ru") return "ru-RU";
  if (current === "uk") return "uk-UA";
  return "en-US";
}