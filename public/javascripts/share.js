const textBtn = document.getElementById("textBtn");
const fileBtn = document.getElementById("fileBtn");
const receiveBtn = document.getElementById("receive-btn");
const submitCodeBtn = document.getElementById("submit-code-btn");

const contentArea = document.getElementById("contentArea");
const container = document.querySelector(".container");
const uploadList = document.getElementById("uploadList");
const code = document.getElementById("code");
const shareBtn = document.getElementById("share-btn");
let allFiles = [];
let uniqueCode = '';
let filesUploading = 0;

const qrBtn = document.getElementById("qr-btn");
const qrContainer = document.getElementById("qr-container");
const qrcodeDiv = document.getElementById("qrcode");

// Initial container fade-in handled globally by navbar.js

function hideCode() {
  code.style.display = "none";
  if (qrBtn) qrBtn.style.display = "none";
  if (qrContainer) qrContainer.style.display = "none";
  if (qrBtn) {
    qrBtn.innerHTML = `
      <svg viewBox="0 0 24 24">
        <path d="M3 3h8v8H3zm2 2v4h4V5zm8-2h8v8h-8zm2 2v4h4V5zM3 13h8v8H3zm2 2v4h4v-4zm13-2h3v2h-3zm-3 3h3v3h-3zm3 3h3v-3h-3zm-3-3h-3v-3h3zm3-3h-3v3h3zm-6 6h3v-3h-3zm6 0h-3v3h3z"/>
      </svg> Show QR Code`;
  }
}
hideCode();

function displayShareButton() {
  shareBtn.style.display = 'block';
}

function hideShareButton() {
  shareBtn.style.display = 'none';
}

function displayCode(cd) {
  code.style.display = "block";
  code.textContent = cd;

  // Generate QR code for the share url
  if (qrcodeDiv && typeof QRCode !== "undefined") {
    qrcodeDiv.innerHTML = "";
    const shareUrl = `${window.location.origin}/?code=${cd}`;
    new QRCode(qrcodeDiv, {
      text: shareUrl,
      width: 140,
      height: 140,
      colorDark: "#050507",
      colorLight: "#ffffff",
      correctLevel: QRCode.CorrectLevel.H
    });
  }

  if (qrBtn) {
    qrBtn.style.display = "flex";
  }

  // Animate code container entrance dynamically
  const codeContainer = document.querySelector(".code-container");
  if (typeof gsap !== "undefined" && codeContainer) {
    gsap.fromTo(codeContainer,
      { opacity: 0, scale: 0.8, y: 30 },
      { opacity: 1, scale: 1, y: 0, duration: 0.5, ease: "back.out(1.7)" }
    );
  }
}

function handleButtunState(state) {
  if (state > 0) {
    filesUploading = filesUploading + 1;
  } else {
    filesUploading = filesUploading - 1;
  }

  if (filesUploading > 0) {
    shareBtn.setAttribute("disabled", "true");
    shareBtn.textContent = "Uploading Files...";
    shareBtn.style.cursor = "none";
  } else {
    shareBtn.removeAttribute("disabled");
    shareBtn.textContent = "Share";
    shareBtn.style.cursor = "pointer";
  }
}

// Mode switching
textBtn.addEventListener("click", () => {
  setActiveMode("text");
  shareBtn.textContent = "Share";
  uniqueCode = '';
  hideCode();
});
fileBtn.addEventListener("click", () => {
  setActiveMode("file");
  shareBtn.textContent = "Share";
  uniqueCode = '';
  hideCode();
});
receiveBtn.addEventListener("click", () => {
  setActiveMode("receive");
});

function setActiveMode(mode) {
  if (mode === "receive") {
    receiveBtn.classList.add("active");
    textBtn.classList.remove("active");
    fileBtn.classList.remove("active");
    uploadList.innerHTML = ''; // Clear the upload list
    hideShareButton();
    hideCode();
    animateContent(`
      <div class="received-container" id="received-container">
        <input class="code-input" type="text" id="code-input" placeholder="Enter Code" />
        <button id="submit-code-btn" onclick="submitCode()">Get Files</button>
        <div id="received-result" style="width: 100%; margin-top: 15px; display: flex; flex-direction: column; gap: 10px; align-items: center;"></div>
      </div>
    `)
  } else if (mode === "text") {
    textBtn.classList.add("active");
    fileBtn.classList.remove("active");
    receiveBtn.classList.remove("active");
    allFiles = []; // Clear the file list
    uploadList.innerHTML = ''; // Clear the upload list
    displayShareButton();
    shareBtn.textContent = 'Share';
    animateContent(`<textarea placeholder="Type or paste your text here..." id="textArea"></textarea>`);
  } else {
    fileBtn.classList.add("active");
    textBtn.classList.remove("active");
    receiveBtn.classList.remove("active");
    displayShareButton();
    shareBtn.textContent = 'Share';
    animateContent(`
      <label class="file-drop" id="dropZone">
        Drop your file here or click to browse
        <input type="file" id="fileInput" onchange='handleFile()' multiple style="display:none;" />
      </label>
    `);
  }
}




// Smooth animation when switching modes
function animateContent(newContent) {
  gsap.to(contentArea, {
    opacity: 0,
    y: 20,
    duration: 0.3,
    onComplete: () => {
      contentArea.innerHTML = newContent;
      gsap.fromTo(contentArea, { opacity: 0, y: -20 }, { opacity: 1, y: 0, duration: 0.3 });

      // If newContent is the file upload mode, init dropzone
      const dropZone = document.getElementById("dropZone");
      const fileInput = document.getElementById("fileInput");

      if (dropZone && fileInput) {
        dropZone.addEventListener("dragover", (e) => {
          e.preventDefault();
          dropZone.classList.add("dragover");
        });

        dropZone.addEventListener("dragleave", () => {
          dropZone.classList.remove("dragover");
        });

        dropZone.addEventListener("drop", (e) => {
          e.preventDefault();
          dropZone.classList.remove("dragover");
          handleFiles(e.dataTransfer.files);
        });
      }


    }
  });
}

async function handleFile() {
  const fileInput = document.getElementById("fileInput");
  if (fileInput.files.length > 0) {
    handleFiles(fileInput.files);
  } else {
    alert("Please select a file to upload.");
  }
}

// Handle and display files CONCURRENTLY
async function handleFiles(files) {
  for (let i = 0; i < files.length; i++) {
    const originalFile = files[i];
    const renamedFile = new File([originalFile], originalFile.name, {
      type: originalFile.type,
      lastModified: originalFile.lastModified
    });

    // Wait for each upload to complete before starting the next one
    // to ensure they all share the same uniqueCode
    await uploadFile(renamedFile);
  }
}

// Function to generate 20 random alphanumeric characters
function randomFilename(length = 20) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Upload File using sequential 5MB chunks and tracking progress
function uploadFile(file) {
  return new Promise((resolve) => {
    const maxSize = 400 * 1024 * 1024; // 400MB in bytes
    if (file.size > maxSize) {
      alert(`⚠️ "${file.name}" is larger than 400 MB. Please upload files under 400 MB.`);
      resolve(false);
      return;
    }

    handleButtunState(1);

    const ext = file.name.substring(file.name.lastIndexOf('.')) || '';
    const storedFileName = randomFilename(20) + ext;
    const chunkSize = 5 * 1024 * 1024; // 5MB chunks
    const totalChunks = Math.ceil(file.size / chunkSize);

    let fileDiv = displayFile(file.name); // Display the file in the list
    let progressBar = fileDiv.querySelector(".progress-inner");
    let filenameDisplay = fileDiv.querySelector(".filename");

    // Sequential chunk uploader
    function uploadNextChunk(chunkIndex) {
      const start = chunkIndex * chunkSize;
      const end = Math.min(start + chunkSize, file.size);
      const chunk = file.slice(start, end);

      const formData = new FormData();
      formData.append('chunk', chunk);
      formData.append('storedFileName', storedFileName);
      formData.append('chunkIndex', chunkIndex);
      formData.append('totalChunks', totalChunks);
      formData.append('code', uniqueCode);
      formData.append('originalName', file.name);

      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/share/upload-chunk', true);

      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) {
          const uploadedBytes = start + event.loaded;
          const percentComplete = Math.min(Math.round((uploadedBytes / file.size) * 100), 100);
          progressBar.style.width = percentComplete + '%';

          if (percentComplete === 100) {
            progressBar.style.background = 'var(--accent-cyan)';
          }
        }
      });

      xhr.onload = function () {
        if (xhr.status === 200) {
          try {
            const data = JSON.parse(xhr.responseText);
            if (data.success) {
              if (data.completed) {
                uniqueCode = data.code;
                fileDiv.setAttribute("id", data.fileId);
                progressBar.classList.add('uploaded');
                progressBar.style.width = '100%';

                allFiles.push(data.filename);
                handleButtunState(-1);
                resolve(true);
              } else {
                // Upload next chunk
                uploadNextChunk(chunkIndex + 1);
              }
            } else {
              filenameDisplay.textContent = "Upload failed";
              progressBar.style.background = 'red';
              console.error('Chunk upload failed:', data.message);
              handleButtunState(-1);
              resolve(false);
            }
          } catch (e) {
            filenameDisplay.textContent = "Server Error";
            progressBar.style.background = 'red';
            handleButtunState(-1);
            resolve(false);
          }
        } else {
          filenameDisplay.textContent = "Network Error";
          progressBar.style.background = 'red';
          handleButtunState(-1);
          resolve(false);
        }
      };

      xhr.onerror = function () {
        filenameDisplay.textContent = "Client Error";
        progressBar.style.background = 'red';
        console.error('Error uploading chunk');
        handleButtunState(-1);
        resolve(false);
      };

      xhr.send(formData);
    }

    // Start with chunk 0
    uploadNextChunk(0);
  });
}


function displayFile(filename) {
  const fileDiv = document.createElement("div");
  fileDiv.className = "file";
  fileDiv.innerHTML = `
        <div class="file-info">
          <p class="filename">${filename}</p>
          <i class="fa-solid fa-circle-xmark remove-icon" onclick="removeFile(this)"></i>
        </div>
        <div class="progress-outer">
          <div class="progress-inner"></div>
        </div>
  `;
  uploadList.appendChild(fileDiv);
  return fileDiv; // Return the fileDiv for further manipulation if needed
}


// Remove file
function removeFile(element) {
  const fileDiv = element.closest(".file");
  const filename = fileDiv.querySelector(".filename").textContent;
  const fileId = fileDiv.getAttribute("id");
  fetch('/share/remove', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ fileId: fileId }) // Send the unique ID with the filename
  })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        allFiles = allFiles.filter(file => file !== filename);
        uploadList.removeChild(fileDiv);
      } else {
        alert('Error removing file: ' + data.message);
        console.error('Error removing file:', data.message);
      }
    }
    ).catch(error => {
      alert('Error removing file: ' + error.message);
      console.error('Error removing file:', error);
    });
}


shareBtn.addEventListener("click", () => {
  if (textBtn.classList.contains("active")) {
    const textArea = document.getElementById("textArea");
    if (!textArea || textArea.value.trim() === "") {
      shareBtn.textContent = "Please enter some text";
      setTimeout(() => {
        shareBtn.textContent = "Share";
      }, 2000);
      return;
    }
    // Handle sending text content
    shareBtn.style.background = "#0a2966"; // Change button color to indicate sending
    shareBtn.textContent = "Getting Things Up...";
    fetch('/share/text', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: textArea.value
      })
    }).then(response => response.json())
      .then(data => {
        if (data.success) {
          if (typeof gsap !== "undefined") {
            // Animate textarea flying up and fading
            gsap.to("#textArea", {
              opacity: 0,
              y: -80,
              scale: 0.9,
              duration: 0.5,
              ease: "back.in(1.6)",
              onComplete: () => {
                displayCode(data.code);
                shareBtn.textContent = "Code is valid for 10 mins";
                textArea.value = '';
                // Reset textarea style for next use
                gsap.set("#textArea", { opacity: 1, y: 0, scale: 1 });
              }
            });
          } else {
            displayCode(data.code);
            shareBtn.textContent = "Code is valid for 10 mins";
            textArea.value = '';
          }
        } else {
          shareBtn.textContent = "Error creating share";
          setTimeout(() => {
            shareBtn.textContent = "Share";
            shareBtn.style.background = "#1c55d0"; // Reset button color
          }, 2000);
        }
      }).catch(error => {
        console.error('Error:', error);
        shareBtn.textContent = "Error creating share";
        setTimeout(() => {
          shareBtn.textContent = "Share";
          shareBtn.style.background = "#1c55d0"; // Reset button color
        }, 2000);
      });


  } else if (fileBtn.classList.contains("active")) {
    if (allFiles.length === 0) {
      shareBtn.textContent = "No files to send";
      setTimeout(() => {
        shareBtn.textContent = "Share";
      }, 2000);
      return;
    }

    // Handle sending files
    shareBtn.style.background = "#0a2966"; // Change button color to indicate sending
    shareBtn.textContent = "Getting things ready to share";

    if (typeof gsap !== "undefined") {
      const files = document.querySelectorAll("#uploadList .file");
      if (files.length > 0) {
        gsap.to(files, {
          opacity: 0,
          y: -100,
          scale: 0.9,
          stagger: 0.1,
          duration: 0.5,
          ease: "back.in(1.6)",
          onComplete: () => {
            uploadList.innerHTML = '';
            displayCode(uniqueCode);
            shareBtn.textContent = "Use code within 10 mins";
          }
        });
      } else {
        displayCode(uniqueCode);
        shareBtn.textContent = "Use code within 10 mins";
      }
    } else {
      displayCode(uniqueCode);
      shareBtn.textContent = "Use code within 10 mins";
    }
  }
})

// Helper to mark received file cards visually as downloaded
function markFileDownloaded(el) {
  if (!el || el.classList.contains("downloaded")) return;
  el.classList.add("downloaded");
  const icon = el.querySelector("i");
  if (icon) {
    icon.className = "fa-solid fa-circle-check";
  }
}

const submitCode = () => {
  const codeVal = document.getElementById("code-input").value;
  if (!codeVal.trim()) return;

  fetch('/receive', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      code: codeVal
    })
  }).then(response => response.json())
    .then(data => {
      const resultContainer = document.getElementById("received-result");
      if (resultContainer) {
        resultContainer.innerHTML = "";
      }

      if (data.success) {
        // Trigger neon glow pulse on container
        const cardContainer = document.querySelector(".container");
        if (cardContainer) {
          cardContainer.classList.remove("glow-pulse-active");
          void cardContainer.offsetWidth; // Trigger reflow to restart animation
          cardContainer.classList.add("glow-pulse-active");
          setTimeout(() => {
            cardContainer.classList.remove("glow-pulse-active");
          }, 1200);
        }

        if (data.type == "text") {
          if (resultContainer) {
            resultContainer.innerHTML = `
              <div class="collapsible-text-wrapper" style="width: 100%; display: flex; flex-direction: column; align-items: center; opacity: 0;">
                <textarea class="received-textContent" id="received-data" style="width: 100%; height: 100px; min-height: 100px;" readonly>${data.content}</textarea>
                <button id="toggle-text-height-btn" class="toggle-height-btn">
                  <svg viewBox="0 0 24 24">
                    <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/>
                  </svg>
                  <span>Expand text</span>
                </button>
              </div>
              <button id="copy-text-btn" class="copy-btn" style="margin-top:15px; width: 100%; opacity: 0;">
                <svg viewBox="0 0 24 24" style="width:16px; height:16px; fill:currentColor; margin-right:6px; vertical-align:middle;">
                  <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
                </svg>Copy Text
              </button>
            `;

            // GSAP Entrance for Text Board Wrapper
            if (typeof gsap !== "undefined") {
              gsap.fromTo(".collapsible-text-wrapper",
                { opacity: 0, y: 50, scaleY: 0.8, transformOrigin: "top" },
                { opacity: 1, y: 0, scaleY: 1, duration: 0.6, ease: "back.out(1.5)" }
              );
              gsap.fromTo("#copy-text-btn",
                { opacity: 0, y: 20 },
                { opacity: 1, y: 0, duration: 0.4, delay: 0.3, ease: "power2.out" }
              );
            } else {
              document.querySelector(".collapsible-text-wrapper").style.opacity = "1";
              document.getElementById("copy-text-btn").style.opacity = "1";
            }

            const heightBtn = document.getElementById("toggle-text-height-btn");
            const textBlock = document.getElementById("received-data");
            if (heightBtn && textBlock) {
              let isExpanded = false;
              heightBtn.addEventListener("click", () => {
                isExpanded = !isExpanded;
                if (isExpanded) {
                  heightBtn.classList.add("expanded");
                  heightBtn.querySelector("span").textContent = "Collapse text";
                  if (typeof gsap !== "undefined") {
                    gsap.to(textBlock, { height: "300px", duration: 0.4, ease: "power2.out" });
                  } else {
                    textBlock.style.height = "300px";
                  }
                } else {
                  heightBtn.classList.remove("expanded");
                  heightBtn.querySelector("span").textContent = "Expand text";
                  if (typeof gsap !== "undefined") {
                    gsap.to(textBlock, { height: "100px", duration: 0.4, ease: "power2.out" });
                  } else {
                    textBlock.style.height = "100px";
                  }
                }
              });
            }

            const copyBtn = document.getElementById("copy-text-btn");
            if (copyBtn) {
              copyBtn.addEventListener("click", () => {
                navigator.clipboard.writeText(data.content).then(() => {
                  copyBtn.innerHTML = `
                    <svg viewBox="0 0 24 24" style="width:16px; height:16px; fill:currentColor; margin-right:6px; vertical-align:middle;">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                    </svg>Copied!`;
                  setTimeout(() => {
                    copyBtn.innerHTML = `
                      <svg viewBox="0 0 24 24" style="width:16px; height:16px; fill:currentColor; margin-right:6px; vertical-align:middle;">
                        <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
                      </svg>Copy Text`;
                  }, 2000);
                });
              });
            }
          }
        } else {
          if (resultContainer) {
            // Add Download Actions container if there are multiple files
            if (data.content.length > 1) {
              resultContainer.insertAdjacentHTML("beforeend", `
                <div class="download-all-container" id="download-all-actions" style="display: flex; gap: 10px; width: 100%; margin-bottom: 15px; opacity: 0;">
                  <button id="download-all-btn" class="download-all-btn" style="flex: 1; margin-bottom: 0;">
                    <svg viewBox="0 0 24 24" style="width:18px; height:18px; fill:currentColor; margin-right:8px; vertical-align:middle;">
                      <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM17 13l-5 5-5-5h3V9h4v4h3z"/>
                    </svg>Download All
                  </button>
                  <button id="download-zip-btn" class="download-all-btn" style="flex: 1; margin-bottom: 0; background: rgba(0, 240, 255, 0.15); border-color: rgba(0, 240, 255, 0.4); color: var(--accent-cyan);">
                    <svg viewBox="0 0 24 24" style="width:18px; height:18px; fill:currentColor; margin-right:8px; vertical-align:middle;">
                      <path d="M20 6h-8l-2-2H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-6 10v-3h-4v3H8l4 4 4-4h-2z"/>
                    </svg>Download ZIP
                  </button>
                </div>
              `);

              if (typeof gsap !== "undefined") {
                gsap.fromTo("#download-all-actions",
                  { opacity: 0, y: -20 },
                  { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" }
                );
              } else {
                document.getElementById("download-all-actions").style.opacity = "1";
              }

              // Download All individual triggers
              document.getElementById("download-all-btn").addEventListener("click", () => {
                data.content.forEach((file, index) => {
                  setTimeout(() => {
                    const link = document.createElement("a");
                    link.href = `${window.location.origin}/share_uploads/${file.url}`;
                    link.download = file.name;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);

                    // Mark file card as downloaded
                    const fileRow = document.getElementById(`file-${index + 1}`);
                    if (fileRow) {
                      markFileDownloaded(fileRow);
                    }
                  }, index * 250);
                });
              });

              // Download ZIP client-side compression trigger
              const zipBtn = document.getElementById("download-zip-btn");
              if (zipBtn) {
                zipBtn.addEventListener("click", () => {
                  if (typeof JSZip === "undefined") {
                    alert("ZIP library is not loaded. Please try again in a moment.");
                    return;
                  }

                  const originalContent = zipBtn.innerHTML;
                  zipBtn.innerHTML = `
                    <svg class="spinner" viewBox="0 0 24 24" style="width:18px; height:18px; fill:currentColor; margin-right:8px; vertical-align:middle;">
                      <path d="M12 4V2C6.48 2 2 6.48 2 12h2c0-4.42 3.58-8 8-8zm0 16v2c5.52 0 10-4.48 10-10h-2c0 4.42-3.58 8-8 8z"/>
                    </svg>Zipping...`;
                  zipBtn.setAttribute("disabled", "true");

                  const zip = new JSZip();
                  const downloadPromises = data.content.map(file => {
                    return fetch(`${window.location.origin}/share_uploads/${file.url}`)
                      .then(response => {
                        if (!response.ok) throw new Error("File fetch failed");
                        return response.blob();
                      })
                      .then(blob => {
                        zip.file(file.name, blob);
                      });
                  });

                  Promise.all(downloadPromises).then(() => {
                    return zip.generateAsync({ type: "blob" });
                  }).then(content => {
                    const link = document.createElement("a");
                    link.href = URL.createObjectURL(content);
                    link.download = `share_${codeVal}.zip`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);

                    // Mark all file cards as downloaded
                    data.content.forEach((file, index) => {
                      const fileRow = document.getElementById(`file-${index + 1}`);
                      if (fileRow) {
                        markFileDownloaded(fileRow);
                      }
                    });
                  }).catch(err => {
                    console.error("Zipping error:", err);
                    alert("An error occurred while creating the ZIP archive.");
                  }).finally(() => {
                    zipBtn.innerHTML = originalContent;
                    zipBtn.removeAttribute("disabled");
                  });
                });
              }
            }

            let fileSeq = 1;
            for (let file of data.content) {
              resultContainer.insertAdjacentHTML("beforeend", `
                <div class="received-file" id="file-${fileSeq}" data-url="${file.url}" data-filename="${file.name}" style="width: 100%; opacity: 0;">
                  <p class="received-filename">${file.name}</p>
                  <i class="fa-solid fa-cloud-arrow-down"></i>
                </div>
              `);

              const currentFileSeq = fileSeq;
              const fileEl = document.getElementById(`file-${currentFileSeq}`);
              fileEl.addEventListener("click", function (event) {
                const link = document.createElement("a");
                link.href = `${window.location.origin}/share_uploads/${file.url}`;
                link.download = file.name;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);

                // Mark card downloaded
                markFileDownloaded(fileEl);
              });
              fileSeq = fileSeq + 1;
            }

            // GSAP 3D Drop-Down Sequential Bounce
            if (typeof gsap !== "undefined") {
              gsap.fromTo(".received-file",
                { opacity: 0, y: -150, scale: 0.9, rotationX: -25 },
                {
                  opacity: 1,
                  y: 0,
                  scale: 1,
                  rotationX: 0,
                  duration: 0.9,
                  stagger: 0.15,
                  ease: "bounce.out"
                }
              );
            } else {
              document.querySelectorAll(".received-file").forEach(el => el.style.opacity = "1");
            }
          }
        }
      } else {
        document.getElementById("submit-code-btn").textContent = data.message;
        setTimeout(() => {
          document.getElementById("submit-code-btn").textContent = "Get Files";
        }, 2000);
      }
    }).catch(error => {
      console.error(error);
    });
};

// Toggle QR Code Display
if (qrBtn && qrContainer) {
  qrBtn.addEventListener("click", () => {
    if (qrContainer.style.display === "none" || qrContainer.style.display === "") {
      qrContainer.style.display = "flex";
      qrBtn.innerHTML = `
        <svg viewBox="0 0 24 24">
          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
        </svg> Hide QR Code`;
      if (typeof gsap !== "undefined") {
        gsap.fromTo(qrContainer, { opacity: 0, y: -10 }, { opacity: 1, y: 0, duration: 0.3 });
      }
    } else {
      qrContainer.style.display = "none";
      qrBtn.innerHTML = `
        <svg viewBox="0 0 24 24">
          <path d="M3 3h8v8H3zm2 2v4h4V5zm8-2h8v8h-8zm2 2v4h4V5zM3 13h8v8H3zm2 2v4h4v-4zm13-2h3v2h-3zm-3 3h3v3h-3zm3 3h3v-3h-3zm-3-3h-3v-3h3zm3-3h-3v3h3zm-6 6h3v-3h-3zm6 0h-3v3h3z"/>
        </svg> Show QR Code`;
    }
  });
}

// Auto-receive shared data if code is present in URL
document.addEventListener("DOMContentLoaded", () => {
  const urlParams = new URLSearchParams(window.location.search);
  const codeParam = urlParams.get('code');
  if (codeParam) {
    // Switch to receive mode
    setActiveMode("receive");
    // Pre-fill the input and submit after dynamic content animateContent completes
    setTimeout(() => {
      const codeInput = document.getElementById("code-input");
      if (codeInput) {
        codeInput.value = codeParam;
        submitCode();
        // Clean URL to prevent recurring loads on page refresh
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }, 450);
  }
});
