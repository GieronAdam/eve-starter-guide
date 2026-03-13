async function loadRssIntoList(feedUrl, listId, limit = 5) {
    const list = document.getElementById(listId);
    if (!list) return;

    try {
        const proxyUrl =
            "https://api.allorigins.win/get?url=" + encodeURIComponent(feedUrl);

        const response = await fetch(proxyUrl);
        const data = await response.json();

        const parser = new DOMParser();
        const xml = parser.parseFromString(data.contents, "text/xml");
        const items = xml.querySelectorAll("item");

        list.innerHTML = "";

        if (!items.length) {
            list.innerHTML = "<li>No entries available right now.</li>";
            return;
        }

        Array.from(items)
             .slice(0, limit)
             .forEach((item) => {
                 const title = item.querySelector("title")?.textContent || "Untitled";
                 const link = item.querySelector("link")?.textContent || "#";

                 const li = document.createElement("li");
                 li.innerHTML = `<a href="${link}" target="_blank" rel="noopener noreferrer">${title}</a>`;
                 list.appendChild(li);
             });
    } catch (error) {
        list.innerHTML = "<li>Could not load feed right now.</li>";
        console.error("RSS load error:", error);
    }
}

function copyFit(button) {

    const fit = button.previousElementSibling.innerText;

    navigator.clipboard.writeText(fit);

    button.innerText = "Copied!";

    setTimeout(() => {
        button.innerText = "Copy Fit";
    }, 1500);
}

loadRssIntoList("https://www.eveonline.com/rss/news", "eve-news", 5);
loadRssIntoList("https://www.eveonline.com/rss/patch-notes", "eve-patchnotes", 5);