chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "COPY_INSTAGRAM_IMAGE_URL" || !message.url) return;

  fetchImageAsBase64(message.url)
    .then((image) => sendResponse({ ok: true, ...image }))
    .catch((error) => sendResponse({ ok: false, error: error.message || chrome.i18n.getMessage("imageLoadFailed") || "Could not load the photo." }));
  return true;
});

async function fetchImageAsBase64(url) {
  const response = await fetch(url, { credentials: "include" });
  if (!response.ok) {
    const loadError = chrome.i18n.getMessage("imageLoadFailed") || "Could not load the photo.";
    throw new Error(`${loadError} (${response.status})`);
  }
  const blob = await response.blob();
  if (!blob.type.startsWith("image/")) throw new Error(chrome.i18n.getMessage("invalidImage") || "The selected address did not return an image.");

  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return { mimeType: blob.type, base64: btoa(binary) };
}
