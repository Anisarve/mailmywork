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

// Initial container fade-in
gsap.to(container, { opacity: 1, duration: 1, y: 0 });

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
    animateContent(`<textarea placeholder="Type or paste your text here..." id="textArea"></textarea>`);
  } else {
    fileBtn.classList.add("active");
    textBtn.classList.remove("active");
    receiveBtn.classList.remove("active");
    displayShareButton();
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
    for (let i = 0; i < fileInput.files.length; i++) {
      const originalFile = fileInput.files[i];
      const renamedFile = new File([originalFile], originalFile.name, {
        type: originalFile.type,
        lastModified: originalFile.lastModified
      });
      if (await uploadFile(renamedFile)) {
        allFiles.push(renamedFile.name);
      }
    }
  } else {
    alert("Please select a file to upload.");
  }
}


// Handle and display files
async function handleFiles(files) {
  for (let i = 0; i < files.length; i++) {
    const originalFile = files[i];
    const renamedFile = new File([originalFile], originalFile.name, {
      type: originalFile.type,
      lastModified: originalFile.lastModified
    });
    if (await uploadFile(renamedFile)) {
      allFiles.push(renamedFile.name);
    }
  }
}

async function uploadFile(file) {
  const maxSize = 10 * 1024 * 1024; // 10MB in bytes
  if (file.size > maxSize) {
    alert(`⚠️ "${file.name.substring(10)}" is larger than 10 MB. We are not supporting files above 10 MB for now due to some limitations. We are working on it. Stay happy 😊`);
    return false;
  }

  handleButtunState(1);

  const formData = new FormData();
  formData.append('files', file);
  formData.append('code', uniqueCode);

  let fileDiv = displayFile(file.name); // Display the file in the list

  try {
    const response = await fetch('/share/upload', {
      method: 'POST',
      body: formData
    });

    const data = await response.json();

    if (data.success) {
      uniqueCode = data.code;

      fileDiv.setAttribute("id", data.fileId);
      fileDiv.querySelector(".progress-inner").classList.add('uploaded');

      allFiles.push(data.filename);
      handleButtunState(-1);

      return true; //  success
    } else {
      fileDiv.querySelector(".filename").textContent = "File upload failed";
      fileDiv.querySelector(".progress-inner").style.background = 'red';

      console.error('File upload failed:', data.message);
      return false; // failed
    }
  } catch (error) {
    fileDiv.querySelector(".filename").textContent = "Client Error";
    fileDiv.querySelector(".progress-inner").style.background = 'red';

    console.error('Error uploading file:', error);
    return false; //  failed
  }
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
