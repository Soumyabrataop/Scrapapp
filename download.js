const alertBox = document.getElementById("alert");
const alertMessage = document.getElementById("alert-message");
const acceptButton = document.getElementById("accept-btn");

function getFormattedDate() {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, "0"); // Month is 0-based
  const date = String(today.getDate()).padStart(2, "0");
  const year = today.getFullYear();
  return `blog-${month}-${date}-${year}.xml`;
}

function showAlert(message) {
  alertMessage.innerText = message;
  alertBox.style.display = "flex";
}

acceptButton.onclick = () => {
  alertBox.style.display = "none";
};

async function fetchAndDownloadXML() {
  try {
    let url = document.getElementById("url").value;

    if (!url.endsWith(".blogspot.com")) {
      showAlert("The URL must end with .blogspot.com.");
      return;
    }

    if (!url.startsWith("https://")) {
      showAlert("The URL must use HTTPS.");
      return;
    }

    const rssResponse = await fetch("/api/getrss", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });

    if (!rssResponse.ok) throw new Error("Failed to fetch RSS");

    const rssData = await rssResponse.text();

    const xmlResponse = await fetch("/api/rsstoxml", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rssData }),
    });

    if (!xmlResponse.ok) throw new Error("Failed to generate XML");

    const xmlBlob = await xmlResponse.blob();
    const blobUrl = URL.createObjectURL(xmlBlob);

    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = getFormattedDate();
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
  } catch (error) {
    showAlert(error.message);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const downloadButton = document.getElementById("download-lnk");
  downloadButton.addEventListener("click", fetchAndDownloadXML);
});
