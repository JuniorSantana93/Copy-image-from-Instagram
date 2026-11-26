(() => {
  const SCRIPT_VERSION = "1.0.1";
  if (window.__copyInstagramImageScriptVersion === SCRIPT_VERSION) return;
  window.__copyInstagramImageScriptVersion = SCRIPT_VERSION;

  let lastPostRoot = null;
  let lastPostMenuButton = null;

  const imageOverlayObserver = new MutationObserver(removeImageOverlays);
  imageOverlayObserver.observe(document.documentElement, { childList: true, subtree: true });
  removeImageOverlays();

  const cameraButtonObserver = new MutationObserver(addCameraButtons);
  cameraButtonObserver.observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener("load", (event) => {
    if (event.target?.tagName === "IMG") addCameraButtons();
  }, true);
  addCameraButtons();

  document.addEventListener("click", (event) => {
    const button = event.target.closest?.('button, [role="button"]');
    if (!button) return;
    if (matchesLocalizedLabel(button, "moreOptionsLabels")) {
      lastPostRoot = findPostRoot(button);
      lastPostMenuButton = button;
      return;
    }
    if (matchesLocalizedLabel(button, "shareButtonLabels")) {
      lastPostRoot = null;
      lastPostMenuButton = null;
    }
  }, true);

  const postMenuObserver = new MutationObserver(addCopyImageMenuItem);
  postMenuObserver.observe(document.documentElement, { childList: true, subtree: true });
  addCopyImageMenuItem();

  function removeImageOverlays() {
    document.querySelectorAll("div:has(> img)").forEach((container) => {
      const image = container.querySelector(":scope > img");
      if (!image?.currentSrc) return;
      for (const sibling of [container.previousElementSibling, container.nextElementSibling]) {
        if (!isEmptyDiv(sibling) || !overlaps(sibling, container)) continue;
        sibling.remove();
      }
    });
  }

  function isEmptyDiv(element) {
    return element?.tagName === "DIV" && element.childElementCount === 0 && element.textContent.trim() === "";
  }

  function overlaps(aElement, bElement) {
    const style = getComputedStyle(aElement);
    if (style.position !== "absolute" && style.position !== "fixed") return false;
    const a = aElement.getBoundingClientRect();
    const b = bElement.getBoundingClientRect();
    return Math.min(a.right, b.right) > Math.max(a.left, b.left) &&
      Math.min(a.bottom, b.bottom) > Math.max(a.top, b.top);
  }

  function addCameraButtons() {
    const buttons = [...document.querySelectorAll('button, [role="button"]')];
    const openPostMenu = findOpenPostMenu();
    for (const shareButton of buttons) {
      if (openPostMenu?.contains(shareButton)) continue;
      if (!matchesLocalizedLabel(shareButton, "shareButtonLabels")) continue;
      if (!shareButton.parentElement || shareButton.parentElement.querySelector('[data-copy-instagram-camera="true"]')) continue;

      const post = findPostRoot(shareButton) || shareButton.closest("article") || shareButton.parentElement.parentElement;
      if (!post || ![...post.querySelectorAll("img")].some((img) => img.currentSrc && img.naturalWidth > 150 && img.naturalHeight > 150)) continue;

      const cameraButton = shareButton.cloneNode(true);
      cameraButton.removeAttribute("data-testid");
      cameraButton.dataset.copyInstagramCamera = "true";
      const copyImageLabel = localizedMessage("copyImage", "Copy image");
      cameraButton.setAttribute("aria-label", copyImageLabel);
      cameraButton.setAttribute("title", copyImageLabel);
      cameraButton.setAttribute("type", "button");
      cameraButton.replaceChildren(createCameraIcon());
      cameraButton.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        copyPostImage(post, shareButton);
      });

      const saveButton = buttons.find((button) => matchesLocalizedLabel(button, "saveButtonLabels") && post?.contains(button));
      insertAfterShareCount(shareButton, saveButton, cameraButton, post);
    }
  }

  function addCopyImageMenuItem() {
    if (!lastPostMenuButton?.isConnected || !lastPostRoot?.isConnected) return;
    const menu = findOpenPostMenu();
    if (!menu || menu.querySelector('[data-copy-instagram-menu-copy="true"]')) return;
    const copyLinkItem = [...menu.querySelectorAll('[role="menuitem"], button, [role="button"]')]
      .find((item) => matchesLocalizedText(item.innerText || "", "copyLinkLabels"));
    if (!copyLinkItem) return;

    const copyImageItem = copyLinkItem.cloneNode(true);
    copyImageItem.removeAttribute("href");
    copyImageItem.removeAttribute("data-testid");
    copyImageItem.dataset.copyInstagramMenuCopy = "true";
    copyImageItem.setAttribute("role", copyLinkItem.getAttribute("role") || "button");
    const copyImageLabel = localizedMessage("copyImage", "Copy image");
    copyImageItem.setAttribute("aria-label", copyImageLabel);
    copyImageItem.tabIndex = 0;
    copyImageItem.style.cursor = "pointer";
    copyImageItem.style.borderRadius = "8px";
    copyImageItem.addEventListener("mouseenter", () => {
      copyImageItem.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
    });
    copyImageItem.addEventListener("mouseleave", () => {
      copyImageItem.style.backgroundColor = "";
    });
    copyImageItem.addEventListener("focus", () => {
      copyImageItem.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
    });
    copyImageItem.addEventListener("blur", () => {
      copyImageItem.style.backgroundColor = "";
    });
    copyImageItem.querySelectorAll("svg, img, [role='img']").forEach((icon) => icon.remove());

    const label = copyImageItem.querySelector("span");
    if (label) label.textContent = copyImageLabel;
    else copyImageItem.textContent = copyImageLabel;

    const post = lastPostRoot;
    const menuButton = lastPostMenuButton;
    copyImageItem.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      copyPostImage(post, menuButton);
    });
    copyLinkItem.parentElement.insertBefore(copyImageItem, copyLinkItem);
  }

  function findOpenPostMenu() {
    const candidates = [...document.querySelectorAll('[role="dialog"], [role="menu"], [data-visualcompletion="ignore-dynamic"]')];
    return candidates.reverse().find((node) => matchesLocalizedText(node.innerText || "", "copyLinkLabels"));
  }

  function insertAfterShareCount(shareButton, saveButton, cameraButton, post) {
    let branch = shareButton;
    for (let parent = shareButton.parentElement; parent && post.contains(parent); branch = parent, parent = parent.parentElement) {
      const siblings = [...parent.children];
      const branchIndex = siblings.indexOf(branch);
      const count = siblings.slice(branchIndex + 1).find(isEngagementCount);
      if (count) {
        count.after(cameraButton);
        return;
      }
      if (saveButton?.parentElement === parent) {
        saveButton.before(cameraButton);
        return;
      }
    }
    shareButton.after(cameraButton);
  }

  function isEngagementCount(element) {
    const label = getAccessibleLabel(element).trim();
    return /^\d[\d.,\s\u00a0]*(?:mil(?:h(?:ão|ões))?|k|m)?(?:\s+(?:compartilhamentos?|shares?))?$/i.test(label);
  }

  function getAccessibleLabel(button) {
    const nestedLabels = [...button.querySelectorAll("[aria-label], [title], [alt]")]
      .map((node) => `${node.getAttribute("aria-label") || ""} ${node.getAttribute("title") || ""} ${node.getAttribute("alt") || ""}`)
      .join(" ");
    return `${button.getAttribute("aria-label") || ""} ${button.getAttribute("title") || ""} ${button.innerText || ""} ${nestedLabels}`.toLowerCase();
  }

  function localizedMessage(key, fallback = "") {
    try {
      return typeof chrome !== "undefined" ? (chrome.i18n?.getMessage(key) || fallback) : fallback;
    } catch {
      return fallback;
    }
  }

  function localizedLabels(key) {
    return localizedMessage(key).split("|").map((label) => label.trim().toLowerCase()).filter(Boolean);
  }

  function matchesLocalizedLabel(element, key) {
    const label = getAccessibleLabel(element);
    return localizedLabels(key).some((candidate) => label.includes(candidate));
  }

  function matchesLocalizedText(text, key) {
    const normalized = text.toLowerCase();
    return localizedLabels(key).some((candidate) => normalized.includes(candidate));
  }

  function createCameraIcon() {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", "24");
    svg.setAttribute("height", "24");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "#ffffff");
    svg.setAttribute("stroke-width", "1.8");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");

    const body = document.createElementNS(svg.namespaceURI, "rect");
    body.setAttribute("x", "3");
    body.setAttribute("y", "3");
    body.setAttribute("width", "18");
    body.setAttribute("height", "18");
    body.setAttribute("rx", "5");
    const lens = document.createElementNS(svg.namespaceURI, "circle");
    lens.setAttribute("cx", "12");
    lens.setAttribute("cy", "12");
    lens.setAttribute("r", "4");
    const flash = document.createElementNS(svg.namespaceURI, "circle");
    flash.setAttribute("cx", "17.4");
    flash.setAttribute("cy", "6.7");
    flash.setAttribute("r", "0.8");
    svg.append(body, lens, flash);
    return svg;
  }

  async function copyPostImage(post, anchor = null) {
    const url = getPostImageUrl(post) || findNearestImageUrl(anchor);
    await copyImageUrl(url);
  }

  async function copyImageUrl(url) {
    if (!url) {
      showToast(localizedMessage("imageNotFound", "Could not find a photo in this post."));
      return;
    }
    try {
      const result = await chrome.runtime.sendMessage({ type: "COPY_INSTAGRAM_IMAGE_URL", url });
      if (!result?.ok) throw new Error(result?.error || localizedMessage("copyFailed", "Could not copy the photo."));
      await writeImageToClipboard(result.base64, result.mimeType);
      showToast(localizedMessage("imageCopied", "Image copied"));
    } catch (error) {
      showToast(error.message || localizedMessage("copyFailed", "Could not copy the photo."));
    }
  }

  async function writeImageToClipboard(base64, mimeType) {
    if (!base64 || !mimeType?.startsWith("image/")) {
      throw new Error(localizedMessage("serviceWorkerNoImageData", "The image data was not returned."));
    }
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    const bitmap = await createImageBitmap(new Blob([bytes], { type: mimeType }));
    try {
      const canvas = document.createElement("canvas");
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const context = canvas.getContext("2d");
      if (!context) throw new Error(localizedMessage("imageProcessingError", "Could not process the photo."));
      context.drawImage(bitmap, 0, 0);
      const png = await new Promise((resolve, reject) => {
        canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error(localizedMessage("imageConversionError", "Could not convert the photo to PNG."))), "image/png");
      });
      await navigator.clipboard.write([new ClipboardItem({ "image/png": png })]);
    } finally {
      bitmap.close();
    }
  }

  function findPostRoot(node) {
    const article = node?.closest("article");
    if (article) return article;
    for (let ancestor = node?.parentElement, depth = 0; ancestor && depth < 12; ancestor = ancestor.parentElement, depth += 1) {
      if (getPostImageUrl(ancestor)) return ancestor;
    }
    return null;
  }

  function getPostImageUrl(root) {
    if (!root) return null;
    const images = [...root.querySelectorAll("img")]
      .filter((image) => {
        if (!image.currentSrc || image.naturalWidth <= 150 || image.naturalHeight <= 150) return false;
        return getVisibleImageArea(image, root) > 0 && getComputedStyle(image).visibility !== "hidden";
      });
    images.sort((a, b) => getVisibleImageArea(b, root) - getVisibleImageArea(a, root));
    return images[0]?.currentSrc || images[0]?.src || null;
  }

  function getVisibleImageArea(image, root) {
    const rect = image.getBoundingClientRect();
    let left = rect.left;
    let top = rect.top;
    let right = rect.right;
    let bottom = rect.bottom;

    for (let ancestor = image.parentElement; ancestor && ancestor !== root.parentElement; ancestor = ancestor.parentElement) {
      const style = getComputedStyle(ancestor);
      if (/hidden|clip|scroll|auto/.test(style.overflowX)) {
        const bounds = ancestor.getBoundingClientRect();
        left = Math.max(left, bounds.left);
        right = Math.min(right, bounds.right);
      }
      if (/hidden|clip|scroll|auto/.test(style.overflowY)) {
        const bounds = ancestor.getBoundingClientRect();
        top = Math.max(top, bounds.top);
        bottom = Math.min(bottom, bounds.bottom);
      }
      if (ancestor === root) break;
    }

    return Math.max(0, right - left) * Math.max(0, bottom - top);
  }

  function findNearestImageUrl(anchor) {
    if (!anchor) return null;
    const anchorRect = anchor.getBoundingClientRect();
    const candidates = [...document.querySelectorAll("img")]
      .filter((image) => image.currentSrc && image.naturalWidth > 150 && image.naturalHeight > 150)
      .map((image) => {
        const rect = image.getBoundingClientRect();
        const dx = Math.max(rect.left - anchorRect.right, anchorRect.left - rect.right, 0);
        const dy = Math.max(rect.top - anchorRect.bottom, anchorRect.top - rect.bottom, 0);
        return { image, distance: Math.hypot(dx, dy), area: rect.width * rect.height };
      })
      .filter((candidate) => candidate.area > 0)
      .sort((a, b) => a.distance - b.distance || b.area - a.area);
    return candidates[0]?.image.currentSrc || null;
  }

  function showToast(text) {
    document.querySelectorAll("[data-copy-instagram-toast]").forEach((toast) => toast.remove());
    const toast = document.createElement("div");
    toast.dataset.copyInstagramToast = "true";
    toast.textContent = text;
    Object.assign(toast.style, {
      position: "fixed", left: "50%", bottom: "32px", transform: "translateX(-50%)",
      zIndex: "2147483647", padding: "12px 18px", background: "#262626", color: "white",
      borderRadius: "8px", font: "14px Arial, sans-serif", boxShadow: "0 2px 12px #0008"
    });
    document.body.append(toast);
    setTimeout(() => toast.remove(), 2600);
  }
})();
