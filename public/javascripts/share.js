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

// Initial container fade-in handled globally by navbar.js

function hideCode() {
  code.style.display = "none";
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
  const uploadPromises = [];

  for (let i = 0; i < files.length; i++) {
    const originalFile = files[i];
    const renamedFile = new File([originalFile], originalFile.name, {
      type: originalFile.type,
      lastModified: originalFile.lastModified
    });

    // Start upload immediately and push the promise to array
    uploadPromises.push(uploadFile(renamedFile));
  }

  // Wait for ALL concurrent uploads to settle
  await Promise.allSettled(uploadPromises);

  if (files.length > 0 && uniqueCode) {
    window.saveToHistory('share-file', `Shared ${files.length} file(s)`, uniqueCode);
  }
}

// Upload File using XMLHttpRequest to track EXACT progress
function uploadFile(file) {
  return new Promise((resolve) => {
    const maxSize = 10 * 1024 * 1024; // 10MB in bytes
    if (file.size > maxSize) {
      alert(`⚠️ "${file.name.substring(10)}" is larger than 10 MB. We are not supporting files above 10 MB for now due to some limitations. We are working on it. Stay happy 😊`);
      resolve(false);
      return;
    }

    handleButtunState(1);

    const formData = new FormData();
    formData.append('files', file);
    formData.append('code', uniqueCode);

    let fileDiv = displayFile(file.name); // Display the file in the list
    let progressBar = fileDiv.querySelector(".progress-inner");
    let filenameDisplay = fileDiv.querySelector(".filename");

    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/share/upload', true);

    // Listen for real-time progress events
    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) {
        const percentComplete = Math.round((event.loaded / event.total) * 100);
        progressBar.style.width = percentComplete + '%';

        // Change color dynamically based on progress
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
            uniqueCode = data.code;
            fileDiv.setAttribute("id", data.fileId);
            progressBar.classList.add('uploaded');
            progressBar.style.width = '100%';

            allFiles.push(data.filename);
            handleButtunState(-1);

            resolve(true);
          } else {
            filenameDisplay.textContent = "Upload failed";
            progressBar.style.background = 'red';
            console.error('File upload failed:', data.message);
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
      console.error('Error uploading file');
      handleButtunState(-1);
      resolve(false);
    };

    xhr.send(formData);
  });
}


function displayFile(filename) {
  const fileDiv = document.createElement("div");
  fileDiv.className = "file";
  fileDiv.innerHTML = `
        <div class="file-info">
          <p class="filename">${filename.slice(10)}</p>
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
          displayCode(data.code);
          shareBtn.textContent = "Code is valid for 10 mins";
          textArea.value = '';
          window.saveToHistory('share-text', 'Shared text snippet', data.code);
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
    displayCode(uniqueCode);
    shareBtn.textContent = "Use code within 10 mins";
  }
})

const submitCode = () => {
  fetch('/receive', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      code: document.getElementById("code-input").value
    })
  }).then(response => response.json())
    .then(data => {
      if (data.success) {
        if (document.getElementById("received-data")) {
          document.getElementById("received-container").removeChild(document.getElementById("received-data"));
        }
        if (data.type == "text") {
          document.getElementById("received-container").innerHTML += `<textarea class="received-textContent" id="received-data">${data.content}</textarea>`;
        } else {
          const parent = document.getElementById("received-container");
          let fileSeq = 1;
          for (let file of data.content) {
            parent.insertAdjacentHTML("beforeend", `
  <div class="received-file" id="file-${fileSeq}" data-url="${file.url}" data-filename="${file.name}">
    <p class="received-filename">${file.name}</p>
    <i class="fa-solid fa-cloud-arrow-down"></i>
  </div>
`);
            document.getElementById(`file-${fileSeq}`).addEventListener("click", function (event) {
              const link = document.createElement("a");
              link.href = `${window.location.origin}/share_uploads/${file.url}`;
              link.download = file.name; // force download instead of opening
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            });
            fileSeq = fileSeq + 1;
          }
          fileSeq = 0;
        }
      } else {
        document.getElementById("submit-code-btn").textContent = data.message;
        setTimeout(() => {
          document.getElementById("submit-code-btn").textContent = "Share";
        }, 2000);
      }
    }).catch(error => {

    });
};
